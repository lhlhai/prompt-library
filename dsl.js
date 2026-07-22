/**
 * Kibana URL ↔ DSL Converter Logic
 * 
 * Logic includes RISON parsing for Kibana URL states (_a, _g).
 * Features: URL↔DSL conversion, Summary cards, GUI Builder, History, Bookmarklet, Diff mode
 * Version: 0.1.1
 */

// ============================================================
// Robust RISON parser for Kibana states (hand-written, non-regex)
// ============================================================
const rison = {
    decode: (str) => {
        if (!str) return null;
        let i = 0;

        const parseValue = () => {
            const char = str[i];
            if (char === '(') return parseObject();
            if (char === '!') {
                i++;
                const nextChar = str[i];
                if (nextChar === 't') { i++; return true; }
                if (nextChar === 'f') { i++; return false; }
                if (nextChar === 'n') { i++; return null; }
                if (nextChar === '(') return parseArray();
                if (nextChar === "'") return parseString();
                return null;
            }
            if (char === "'") return parseString();
            if (/[0-9-]/.test(char)) return parseNumber();
            return parseId();
        };

        const parseObject = () => {
            i++; // skip '('
            const obj = {};
            while (i < str.length && str[i] !== ')') {
                const key = parseId();
                if (str[i] !== ':') break;
                i++; // skip ':'
                const value = parseValue();
                obj[key] = value;
                if (str[i] === ',') i++;
            }
            i++; // skip ')'
            return obj;
        };

        const parseArray = () => {
            i++; // skip '('
            const arr = [];
            while (i < str.length && str[i] !== ')') {
                arr.push(parseValue());
                if (str[i] === ',') i++;
            }
            i++; // skip ')'
            return arr;
        };

        const parseString = () => {
            i++; // skip opening "'"
            let s = '';
            while (i < str.length && str[i] !== "'") {
                if (str[i] === '!') {
                    i++;
                }
                s += str[i];
                i++;
            }
            i++; // skip closing "'"
            return s;
        };

        const parseNumber = () => {
            let s = '';
            while (i < str.length && /[0-9.eE-]/.test(str[i])) {
                s += str[i];
                i++;
            }
            return parseFloat(s);
        };

        const parseId = () => {
            let s = '';
            while (i < str.length && /[^():,!@]/.test(str[i])) {
                s += str[i];
                i++;
            }
            return s;
        };

        try {
            return parseValue();
        } catch (e) {
            console.error('RISON decode failed:', e, 'Input:', str);
            return null;
        }
    },
    
    encode: (obj) => {
        if (obj === null) return '!n';
        if (obj === true) return '!t';
        if (obj === false) return '!f';
        if (typeof obj === 'number') return obj.toString();
        if (typeof obj === 'string') {
            if (/[^a-zA-Z0-9_]/.test(obj)) {
                return "'" + obj.replace(/!/g, '!!').replace(/'/g, "!'") + "'";
            }
            return obj;
        }
        if (Array.isArray(obj)) {
            return '!(' + obj.map(rison.encode).join(',') + ')';
        }
        if (typeof obj === 'object') {
            const pairs = [];
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    pairs.push(rison.encode(key) + ':' + rison.encode(obj[key]));
                }
            }
            return '(' + pairs.join(',') + ')';
        }
        return '';
    }
};

// ============================================================
// Parse Kibana URL and extract query parameters
// ============================================================
function parseKibanaState(url) {
    try {
        // Handle URLs without protocol
        let workingUrl = url;
        if (!url.startsWith('http')) {
            workingUrl = 'http://' + url;
        }

        const urlObj = new URL(workingUrl);
        const hashPart = urlObj.hash;
        if (!hashPart) return null;
        
        // Parse URL parameters in hash
        const queryIndex = hashPart.indexOf('?');
        if (queryIndex === -1) return null;
        
        const params = new URLSearchParams(hashPart.substring(queryIndex + 1));
        
        const _a = params.get('_a');  // App state
        const _g = params.get('_g');  // Global state
        
        return {
            appState: _a,
            globalState: _g,
            rawUrl: url
        };
    } catch (e) {
        console.error('Parse Kibana State failed:', e);
        // Fallback for malformed URLs but containing _a and _g
        const aMatch = url.match(/_a=([^&]+)/);
        const gMatch = url.match(/_g=([^&]+)/);
        if (aMatch || gMatch) {
            return {
                appState: aMatch ? decodeURIComponent(aMatch[1]) : null,
                globalState: gMatch ? decodeURIComponent(gMatch[1]) : null,
                rawUrl: url
            };
        }
        return null;
    }
}

// ============================================================
// Convert Kibana RISON states to Elasticsearch DSL query
// ============================================================
function convertToDsl(appStateRison, globalStateRison) {
    const dsl = {
        query: { bool: {} },
        size: 500,
        sort: [],
        _source: []
    };

    const boolQuery = { must: [], filter: [], should: [], must_not: [] };

    try {
        const appState = appStateRison ? rison.decode(appStateRison) : {};
        const globalState = globalStateRison ? rison.decode(globalStateRison) : {};

        // Process globalState for time range
        if (globalState && globalState.time) {
            const timeRange = {};
            if (globalState.time.from) timeRange.gte = globalState.time.from;
            if (globalState.time.to) timeRange.lte = globalState.time.to;
            if (Object.keys(timeRange).length > 0) {
                boolQuery.filter.push({ range: { '@timestamp': timeRange } });
            }
        }

        // Process appState
        if (appState) {
            // Handle query string
            if (appState.query && appState.query.query) {
                boolQuery.must.push({ query_string: { query: appState.query.query } });
            }

            // Handle filters
            if (appState.filters && Array.isArray(appState.filters)) {
                appState.filters.forEach(filter => {
                    if (filter.meta && filter.meta.disabled) return; 

                    let dslFilter = {};
                    if (filter.query) {
                        if (filter.query.query_string) {
                            dslFilter = { query_string: filter.query.query_string };
                        } else if (filter.query.match) {
                            const field = Object.keys(filter.query.match)[0];
                            const matchVal = filter.query.match[field];
                            const value = (typeof matchVal === 'object' && matchVal !== null) ? (matchVal.query || matchVal) : matchVal;
                            dslFilter = { match: { [field]: value } };
                        }
                    } else if (filter.range) {
                        const field = Object.keys(filter.range)[0];
                        dslFilter = { range: { [field]: filter.range[field] } };
                    } else if (filter.exists) {
                        dslFilter = { exists: { field: filter.exists.field } };
                    }

                    if (Object.keys(dslFilter).length > 0) {
                        if (filter.meta && filter.meta.negate) {
                            boolQuery.must_not.push(dslFilter);
                        } else {
                            boolQuery.filter.push(dslFilter);
                        }
                    }
                });
            }

            // Handle columns (_source)
            if (appState.columns && Array.isArray(appState.columns)) {
                dsl._source = appState.columns;
            }

            // Handle sort
            if (appState.sort && Array.isArray(appState.sort) && appState.sort.length > 0) {
                const sortField = appState.sort[0];
                const sortOrder = appState.sort[1] || 'asc';
                dsl.sort.push({ [sortField]: sortOrder });
            }
        }

        // Clean up empty bool clauses
        if (boolQuery.must.length > 0) dsl.query.bool.must = boolQuery.must;
        if (boolQuery.filter.length > 0) dsl.query.bool.filter = boolQuery.filter;
        if (boolQuery.should.length > 0) dsl.query.bool.should = boolQuery.should;
        if (boolQuery.must_not.length > 0) dsl.query.bool.must_not = boolQuery.must_not;

        if (Object.keys(dsl.query.bool).length === 0) {
            delete dsl.query.bool;
            if (Object.keys(dsl.query).length === 0) delete dsl.query;
        }

        if (dsl.sort.length === 0) delete dsl.sort;
        if (dsl._source.length === 0) delete dsl._source;

    } catch (e) {
        console.error('Error converting to DSL:', e);
        return { error: e.message };
    }

    return dsl;
}

// ============================================================
// Convert Elasticsearch DSL query to Kibana RISON states
// ============================================================
function convertToKibanaStates(dslJson) {
    const appState = {
        query: { language: 'kuery', query: '' },
        filters: [],
        columns: ['_source'],
        sort: []
    };
    const globalState = { time: { from: 'now-15m', to: 'now' } };

    try {
        const dsl = typeof dslJson === 'string' ? JSON.parse(dslJson) : dslJson;

        if (dsl.query && dsl.query.bool) {
            const bool = dsl.query.bool;

            if (bool.must && Array.isArray(bool.must)) {
                bool.must.forEach(clause => {
                    if (clause.query_string) {
                        appState.query.query = clause.query_string.query;
                    }
                });
            }

            const processClauses = (clauses, negate) => {
                if (!clauses || !Array.isArray(clauses)) return;
                clauses.forEach(clause => {
                    let filter = { meta: { negate, disabled: false, index: '*' } };
                    if (clause.range && clause.range['@timestamp']) {
                        globalState.time.from = clause.range['@timestamp'].gte || 'now-15m';
                        globalState.time.to = clause.range['@timestamp'].lte || 'now';
                        return;
                    }
                    if (clause.match) {
                        const field = Object.keys(clause.match)[0];
                        filter.query = { match: { [field]: { query: clause.match[field], type: 'phrase' } } };
                        filter.meta.key = field;
                        filter.meta.value = clause.match[field];
                        filter.meta.type = 'phrase';
                    } else if (clause.term) {
                        const field = Object.keys(clause.term)[0];
                        filter.query = { match: { [field]: { query: clause.term[field], type: 'phrase' } } };
                        filter.meta.key = field;
                        filter.meta.value = clause.term[field];
                        filter.meta.type = 'phrase';
                    } else if (clause.exists) {
                        filter.exists = { field: clause.exists.field };
                        filter.meta.key = clause.exists.field;
                        filter.meta.type = 'exists';
                        filter.meta.value = 'exists';
                    }
                    if (filter.query || filter.exists) appState.filters.push(filter);
                });
            };

            processClauses(bool.filter, false);
            processClauses(bool.must_not, true);
        }

        if (dsl._source) appState.columns = Array.isArray(dsl._source) ? dsl._source : [dsl._source];
        if (dsl.sort && Array.isArray(dsl.sort)) {
            appState.sort = dsl.sort.map(s => {
                const field = Object.keys(s)[0];
                return [field, s[field]];
            })[0] || [];
        }

    } catch (e) {
        console.error('Error converting to Kibana states:', e);
        return { error: e.message };
    }

    return {
        appStateRison: rison.encode(appState),
        globalStateRison: rison.encode(globalState)
    };
}

// ============================================================
// Extract meaningful information from DSL for summary
// ============================================================
function extractSummaryFromDsl(appStateRison, globalStateRison) {
    const summary = {
        timeRange: 'N/A',
        filters: [],
        columns: [],
        sort: 'N/A',
        savedSearch: null
    };
    
    try {
        const gState = globalStateRison ? rison.decode(globalStateRison) : null;
        if (gState && gState.time) {
            summary.timeRange = `${gState.time.from || 'now'} → ${gState.time.to || 'now'}`;
        }
        
        const aState = appStateRison ? rison.decode(appStateRison) : null;
        if (aState) {
            if (aState.columns) summary.columns = aState.columns.slice(0, 5);
            if (aState.filters) {
                summary.filters = aState.filters.slice(0, 3).map(f => {
                    if (f.meta) return `${f.meta.key} = ${f.meta.value}`;
                    return 'Filter';
                });
            }
            if (aState.sort && aState.sort.length > 0) {
                summary.sort = `${aState.sort[0]} (${aState.sort[1] || 'asc'})`;
            }
        }
    } catch (e) { console.error('Summary error:', e); }
    return summary;
}

// ============================================================
// Clean URL builder — raw RISON in URL (Kibana native format)
// RISON chars ( , : ' ! ( ) ) are all unreserved/safe in query strings.
// Only @ and / need encoding. This produces the same format Kibana itself uses.
// ============================================================
function buildKibanaUrl(appStateRison, globalStateRison, baseUrl) {
    const base = baseUrl || 'http://localhost:5601';
    
    // Encode only the characters that are NOT safe in URL query strings.
    // RISON special chars ( , : ' ! ( ) _ - ) are all safe.
    // We only need to encode: @ / = & ? # [ ] space and other unsafe chars.
    const encodeRison = (str) => {
        // Encode only truly unsafe characters, leave RISON syntax intact
        return str.replace(/@/g, '%40').replace(/\//g, '%2F');
    };
    
    const parts = [];
    if (globalStateRison) parts.push(`_g=${encodeRison(globalStateRison)}`);
    if (appStateRison) parts.push(`_a=${encodeRison(appStateRison)}`);
    
    return `${base}/app/kibana#/discover?${parts.join('&')}`;
}

// ============================================================
// Main DOM logic
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const kibanaUrlInput = document.getElementById('kibanaUrl');
    const dslJsonInput = document.getElementById('dslJson');
    const btnParseToDsl = document.getElementById('btnParseToDsl');
    const btnGenerateUrl = document.getElementById('btnGenerateUrl');
    const btnExchange = document.getElementById('btnExchange');
    const btnFormatJson = document.getElementById('btnFormatJson');
    const btnMinifyJson = document.getElementById('btnMinifyJson');
    const btnClearAll = document.getElementById('btnClearAll');
    const baseUrlInput = document.getElementById('baseUrl');
    const chkAutoDecode = document.getElementById('chkAutoDecode');

    // State
    let currentDsl = {};
    let diffMode = false;

    const formatJson = (val) => {
        try {
            const obj = typeof val === 'string' ? JSON.parse(val) : val;
            return JSON.stringify(obj, null, 2);
        } catch (e) { return val; }
    };

    const minifyJson = (val) => {
        try {
            const obj = typeof val === 'string' ? JSON.parse(val) : val;
            return JSON.stringify(obj);
        } catch (e) { return val; }
    };

    // Helper: copy with visual feedback
    const copyToClipboard = (text, btnEl) => {
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = btnEl.innerHTML;
            btnEl.innerHTML = '<i class="fas fa-check mr-1"></i> Copied!';
            btnEl.classList.add('text-green-600');
            setTimeout(() => {
                btnEl.innerHTML = originalHTML;
                btnEl.classList.remove('text-green-600');
            }, 1500);
        });
    };

    // ---------- Summary Cards ----------
    window.updateSummary = (appState, globalState) => {
        const container = document.getElementById('summaryContainer');
        if (!container) return;
        if (!appState && !globalState) { container.innerHTML = ''; return; }
        const s = extractSummaryFromDsl(appState, globalState);
        container.innerHTML = `
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center">
                    <i class="fas fa-chart-pie mr-2 text-blue-500"></i> Visual Summary
                </h3>
                <div class="flex flex-wrap gap-3">
                    <div class="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-100">
                        <span class="mr-2">🕐 Time:</span> ${s.timeRange}
                    </div>
                    ${s.filters.length > 0 ? s.filters.map(f => `
                        <div class="flex items-center bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-green-100">
                            <span class="mr-2">🔍 Filter:</span> ${f}
                        </div>
                    `).join('') : ''}
                    ${s.columns.length > 0 ? `
                    <div class="flex items-center bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-purple-100">
                        <span class="mr-2">📋 Columns:</span> ${s.columns.join(', ')}
                    </div>` : ''}
                    ${s.sort !== 'N/A' ? `
                    <div class="flex items-center bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-orange-100">
                        <span class="mr-2">🔢 Sort:</span> ${s.sort}
                    </div>` : ''}
                    ${s.savedSearch ? `
                    <div class="flex items-center bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200">
                        <span class="mr-2">🏷️ Index:</span> ${s.savedSearch}
                    </div>` : ''}
                </div>
            </div>
        `;
    };

    // ---------- GUI Builder ----------
    const initGuiBuilder = () => {
        const container = document.getElementById('guiBuilderContainer');
        container.innerHTML = `
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                <div class="flex items-center justify-between cursor-pointer group" id="toggleGuiBuilder">
                    <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center">
                        <i class="fas fa-tools mr-2 text-orange-500"></i> GUI Builder (Quick Filter)
                    </h3>
                    <i class="fas fa-chevron-down text-gray-400 group-hover:text-gray-600 transition-transform" id="guiChevron"></i>
                </div>
                
                <div id="guiBuilderContent" class="hidden border-t border-gray-100 pt-4">
                    <div class="flex flex-wrap gap-3 items-end">
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-gray-400 uppercase">Field</label>
                            <input type="text" id="guiField" placeholder="e.g. carrier" 
                                class="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-gray-400 uppercase">Operator</label>
                            <select id="guiOperator" class="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                <option value="is">equals</option>
                                <option value="contains">contains</option>
                                <option value="exists">exists</option>
                                <option value="range">range</option>
                            </select>
                        </div>
                        <div class="space-y-1 flex-1 min-w-[150px]">
                            <label class="text-[10px] font-bold text-gray-400 uppercase">Value</label>
                            <input type="text" id="guiValue" placeholder="e.g. JetBeats" 
                                class="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        </div>
                        <button id="btnAddFilter" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-bold shadow-sm transition-colors">
                            + Add Filter
                        </button>
                    </div>
                </div>
            </div>
        `;

        const toggleBtn = document.getElementById('toggleGuiBuilder');
        const content = document.getElementById('guiBuilderContent');
        const chevron = document.getElementById('guiChevron');
        
        toggleBtn.addEventListener('click', () => {
            content.classList.toggle('hidden');
            chevron.classList.toggle('rotate-180');
        });

        const btnAddFilter = document.getElementById('btnAddFilter');
        btnAddFilter.addEventListener('click', () => {
            const field = document.getElementById('guiField').value.trim();
            const op = document.getElementById('guiOperator').value;
            const val = document.getElementById('guiValue').value.trim();

            if (!field || !val) return alert('Vui lòng nhập Field và Value');

            // Parse current DSL
            let dsl = {};
            try {
                dsl = JSON.parse(dslJsonInput.value || '{}');
            } catch (e) { dsl = {}; }

            // Build filter based on operator
            let newFilter = {};
            if (op === 'is') {
                newFilter = { term: { [field]: val } };
            } else if (op === 'contains') {
                newFilter = { match: { [field]: val } };
            } else if (op === 'exists') {
                newFilter = { exists: { field: field } };
            } else if (op === 'range') {
                newFilter = { range: { [field]: { gte: val } } };
            }

            // Update DSL structure
            if (!dsl.query) dsl.query = { bool: { filter: [] } };
            if (!dsl.query.bool) dsl.query.bool = { filter: [] };
            if (!Array.isArray(dsl.query.bool.filter)) dsl.query.bool.filter = [];

            dsl.query.bool.filter.push(newFilter);

            dslJsonInput.value = formatJson(dsl);
            
            // Generate URL and update summary
            generateUrlFromDsl();
            
            // Clear inputs
            document.getElementById('guiField').value = '';
            document.getElementById('guiValue').value = '';
        });
    };
    initGuiBuilder();

    // ---------- History ----------
    const initHistory = () => {
        const container = document.getElementById('historyContainer');
        container.innerHTML = `
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center">
                        <i class="fas fa-history mr-2 text-indigo-500"></i> Lịch sử chuyển đổi
                    </h3>
                    <div class="flex space-x-3">
                        <button id="btnExportHistory" class="text-xs text-blue-600 hover:underline font-medium">📥 Xuất JSON</button>
                        <button id="btnClearHistory" class="text-xs text-red-500 hover:underline font-medium">🗑️ Xóa hết</button>
                    </div>
                </div>
                <div id="historyChips" class="flex flex-wrap gap-2">
                    <span class="text-xs text-gray-400 italic">Chưa có lịch sử chuyển đổi...</span>
                </div>
            </div>
        `;

        let history = JSON.parse(localStorage.getItem('kibana_dsl_history') || '[]');
        
        const renderChips = () => {
            const chipsContainer = document.getElementById('historyChips');
            if (history.length === 0) {
                chipsContainer.innerHTML = '<span class="text-xs text-gray-400 italic">Chưa có lịch sử chuyển đổi...</span>';
                return;
            }
            chipsContainer.innerHTML = history.map((item, idx) => `
                <button class="history-chip px-3 py-1 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-600 rounded-full text-xs border border-gray-200 transition-all flex items-center" data-idx="${idx}">
                    <span class="font-bold mr-1">${item.time}</span> ${item.label}
                </button>
            `).join('');

            document.querySelectorAll('.history-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.getAttribute('data-idx');
                    const item = history[idx];
                    kibanaUrlInput.value = item.url || '';
                    dslJsonInput.value = formatJson(item.dsl);
                    window.updateSummary(item.appState, item.globalState);
                });
            });
        };

        window.addToHistory = (appState, globalState, url) => {
            const now = new Date();
            const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            
            // Generate meaningful label from summary
            const summary = extractSummaryFromDsl(appState, globalState);
            const filterLabel = summary.filters.length > 0 ? summary.filters[0].split(' = ')[0] : 'Query';
            const timeRange = summary.timeRange.split(' → ')[0];
            const label = `${timeRange}, ${filterLabel}`;
            
            const newItem = {
                time: timeStr,
                label: label,
                url: url,
                dsl: { _a: appState, _g: globalState },
                appState: appState,
                globalState: globalState
            };
            history.unshift(newItem);
            if (history.length > 10) history.pop();
            localStorage.setItem('kibana_dsl_history', JSON.stringify(history));
            renderChips();
        };

        document.getElementById('btnClearHistory').addEventListener('click', () => {
            if (confirm('Xóa toàn bộ lịch sử?')) {
                history = [];
                localStorage.removeItem('kibana_dsl_history');
                renderChips();
            }
        });

        document.getElementById('btnExportHistory').addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'kibana-dsl-history.json';
            a.click();
            URL.revokeObjectURL(url);
        });

        renderChips();
    };
    initHistory();

    // ---------- Bookmarklet ----------
    const initBookmarklet = () => {
        const container = document.getElementById('bookmarkletContainer');
        const script = `javascript:(function(){const url=window.location.href;if(url.includes('kibana')){window.open('https://lhlhai.github.io/prompt-library/dsl-converter.html?url='+btoa(url),'_blank')}else{alert('Vui lòng sử dụng trên trang Kibana!')}})();`;
        
        container.innerHTML = `
            <div class="bg-yellow-50 p-6 rounded-lg border border-yellow-200 space-y-4">
                <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center">
                    <i class="fas fa-bookmark mr-2 text-yellow-500"></i> 📌 Bookmarklet - Preview DSL ngay trên Kibana
                </h3>
                <p class="text-xs text-gray-500 italic">Kéo thả nút dưới đây vào thanh bookmark hoặc copy mã code.</p>
                
                <div class="bg-white p-3 rounded border border-gray-300 font-mono text-[10px] break-all overflow-auto max-h-24">
                    <code>${script}</code>
                </div>

                <div class="flex items-center space-x-4">
                    <button id="btnCopyBookmarklet" class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md text-sm font-bold shadow-sm transition-colors flex items-center">
                        <i class="fas fa-copy mr-2"></i> Copy Bookmarklet
                    </button>
                    <a href="${script}" class="px-4 py-2 bg-white border border-yellow-500 text-yellow-600 hover:bg-yellow-50 rounded-md text-sm font-bold transition-colors">
                        Kéo tôi vào Bookmark Bar
                    </a>
                </div>
                
                <p class="text-[10px] text-gray-500">
                    * Hướng dẫn: Click vào bookmark này khi đang xem Discover trên Kibana để mở công cụ chuyển đổi với trạng thái hiện tại.
                </p>
            </div>
        `;

        document.getElementById('btnCopyBookmarklet').addEventListener('click', () => {
            navigator.clipboard.writeText(script).then(() => {
                alert('Bookmarklet code đã được copy!');
            });
        });
    };
    initBookmarklet();

    // ---------- Footer: Markdown / HTML copy + Diff mode ----------
    document.getElementById('btnCopyMarkdown').addEventListener('click', () => {
        const url = kibanaUrlInput.value;
        if (!url) return alert('Vui lòng nhập URL Kibana');
        const md = `[Kibana Search](${url})`;
        navigator.clipboard.writeText(md).then(() => alert('Markdown đã được copy!'));
    });

    document.getElementById('btnCopyHtml').addEventListener('click', () => {
        const url = kibanaUrlInput.value;
        if (!url) return alert('Vui lòng nhập URL Kibana');
        const html = `<a href="${url}">Kibana Search</a>`;
        navigator.clipboard.writeText(html).then(() => alert('HTML Link đã được copy!'));
    });

    document.getElementById('btnToggleDiff').addEventListener('click', () => {
        diffMode = !diffMode;
        const btn = document.getElementById('btnToggleDiff');
        if (diffMode) {
            btn.classList.add('bg-blue-100', 'text-blue-600', 'border-blue-300');
            alert('Chế độ Diff được bật. Tính năng này cho phép so sánh 2 URL/DSL. (Đang phát triển)');
        } else {
            btn.classList.remove('bg-blue-100', 'text-blue-600', 'border-blue-300');
        }
    });

    // ---------- Share State ----------
    const btnShareState = document.getElementById('btnShareState');
    btnShareState.addEventListener('click', () => {
        if (!kibanaUrlInput.value) return alert('Vui lòng nhập URL Kibana trước');
        const url = new URL(window.location.href);
        url.searchParams.set('url', btoa(kibanaUrlInput.value));
        navigator.clipboard.writeText(url.toString()).then(() => {
            alert('Link trạng thái đã được copy!');
        });
    });

    // ---------- Core Actions ----------
    const parseUrlToDsl = () => {
        const url = kibanaUrlInput.value.trim();
        if (!url) return alert('Vui lòng nhập URL Kibana');

        const states = parseKibanaState(url);
        if (!states) {
            alert('Không thể nhận diện định dạng URL Kibana!');
            return;
        }

        // Use the robust parser: convert RISON → DSL
        const dsl = convertToDsl(states.appState, states.globalState);
        dslJsonInput.value = formatJson(dsl);
        currentDsl = dsl;
        
        // Update summary
        window.updateSummary(states.appState, states.globalState);
        
        // Add to history
        if (window.addToHistory) window.addToHistory(states.appState, states.globalState, url);
    };

    const generateUrlFromDsl = () => {
        try {
            const dsl = JSON.parse(dslJsonInput.value);
            const baseUrl = baseUrlInput.value || 'http://localhost:5601';
            
            // Convert DSL → RISON states
            const states = convertToKibanaStates(dsl);
            
            // Build clean URL (raw RISON format, Kibana-native)
            const newUrl = buildKibanaUrl(states.appStateRison, states.globalStateRison, baseUrl);
            kibanaUrlInput.value = newUrl;
            
            // Update summary
            window.updateSummary(states.appStateRison, states.globalStateRison);
            
            // Add to history
            if (window.addToHistory) window.addToHistory(states.appStateRison, states.globalStateRison, newUrl);
        } catch (e) {
            alert('JSON không hợp lệ! ' + e.message);
        }
    };

    // ---------- Event Listeners ----------
    btnParseToDsl.addEventListener('click', parseUrlToDsl);
    btnGenerateUrl.addEventListener('click', generateUrlFromDsl);
    
    btnExchange.addEventListener('click', () => {
        if (kibanaUrlInput.value && !dslJsonInput.value) {
            parseUrlToDsl();
        } else if (dslJsonInput.value) {
            generateUrlFromDsl();
        } else {
            alert('Vui lòng nhập URL hoặc DSL JSON');
        }
    });

    btnFormatJson.addEventListener('click', () => {
        dslJsonInput.value = formatJson(dslJsonInput.value);
    });

    btnMinifyJson.addEventListener('click', () => {
        dslJsonInput.value = minifyJson(dslJsonInput.value);
    });

    if (btnClearAll) {
        btnClearAll.addEventListener('click', () => {
            kibanaUrlInput.value = '';
            dslJsonInput.value = '';
            window.updateSummary(null, null);
        });
    }

    // ---------- Copy buttons for input textareas ----------
    const btnCopyUrl = document.getElementById('btnCopyUrl');
    if (btnCopyUrl) {
        btnCopyUrl.addEventListener('click', () => {
            const text = kibanaUrlInput.value;
            if (!text) return alert('Chưa có URL để copy');
            copyToClipboard(text, btnCopyUrl);
        });
    }

    const btnCopyDsl = document.getElementById('btnCopyDsl');
    if (btnCopyDsl) {
        btnCopyDsl.addEventListener('click', () => {
            const text = dslJsonInput.value;
            if (!text) return alert('Chưa có DSL để copy');
            copyToClipboard(text, btnCopyDsl);
        });
    }

    // ---------- Load from URL param (auto-decode) ----------
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('url')) {
        try {
            kibanaUrlInput.value = atob(urlParams.get('url'));
            if (chkAutoDecode && chkAutoDecode.checked) {
                setTimeout(parseUrlToDsl, 100);
            }
        } catch (e) {
            console.error('Failed to decode URL param:', e);
        }
    }
});
