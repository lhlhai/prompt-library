/**
 * Kibana URL ↔ DSL Converter Logic
 * 
 * Logic includes RISON parsing for Kibana URL states (_a, _g).
 * Features: URL↔DSL conversion, Summary cards, GUI Builder, History, Bookmarklet, Diff mode
 */

// Robust RISON parser for Kibana states
const rison = {
    decode: (str) => {
        if (!str) return null;
        try {
            // Unescape RISON special characters
            let result = str
                .replace(/!t/g, 'true')
                .replace(/!f/g, 'false')
                .replace(/!n/g, 'null')
                .replace(/!'/g, "'");
            
            // Convert RISON to JSON
            // Handle arrays: @(a,b,c) -> [a,b,c]
            result = result.replace(/@\(([^)]*)\)/g, (match, content) => {
                const items = content.split(',').map(s => s.trim());
                return '[' + items.map(item => {
                    if (item === 'true' || item === 'false' || item === 'null' || !isNaN(item)) {
                        return item;
                    }
                    return "'" + item + "'";
                }).join(',') + ']';
            });
            
            // Handle objects: (key:value,key2:value2) -> {key:value,key2:value2}
            result = result.replace(/\(([^)]*)\)/g, (match, content) => {
                if (content.includes(':')) {
                    return '{' + content + '}';
                }
                return match;
            });
            
            // Quote unquoted keys and string values
            result = result.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
            result = result.replace(/:\s*'([^']*)'([,}])/g, ':"$1"$2');
            result = result.replace(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)([,}])/g, (match, val, end) => {
                if (val === 'true' || val === 'false' || val === 'null') {
                    return ':' + val + end;
                }
                return ':"' + val + '"' + end;
            });
            
            return JSON.parse(result);
        } catch (e) {
            console.error('RISON decode failed:', e, 'Input:', str);
            return null;
        }
    },
    
    encode: (obj) => {
        if (!obj) return '';
        try {
            let json = JSON.stringify(obj);
            
            // Convert JSON to RISON
            json = json
                .replace(/"([^"]+)":/g, '$1:')  // Remove quotes from keys
                .replace(/true/g, '!t')
                .replace(/false/g, '!f')
                .replace(/null/g, '!n')
                .replace(/\{/g, '(')
                .replace(/\}/g, ')')
                .replace(/\[/g, '@(')
                .replace(/\]/g, ')');
            
            return json;
        } catch (e) {
            console.error('RISON encode failed:', e);
            return '';
        }
    }
};

// Parse Kibana URL and extract query parameters
function parseKibanaState(url) {
    try {
        // Extract hash part
        const hashIndex = url.indexOf('#');
        if (hashIndex === -1) return null;
        
        const hashPart = url.substring(hashIndex + 1);
        
        // Parse URL parameters in hash
        const params = new URLSearchParams(hashPart.split('?')[1] || '');
        
        const _a = params.get('_a');  // App state
        const _g = params.get('_g');  // Global state
        
        return {
            appState: _a,
            globalState: _g,
            rawUrl: url
        };
    } catch (e) {
        console.error('Parse Kibana State failed:', e);
        return null;
    }
}

// Extract meaningful information from DSL for summary
function extractSummaryFromDsl(appState, globalState) {
    const summary = {
        timeRange: 'N/A',
        filters: [],
        columns: [],
        sort: 'N/A',
        savedSearch: null
    };
    
    try {
        // Parse global state for time range
        if (globalState) {
            const gState = rison.decode(globalState);
            if (gState && gState.time) {
                const from = gState.time.from || 'now';
                const to = gState.time.to || 'now';
                summary.timeRange = `${from} → ${to}`;
            }
        }
        
        // Parse app state for filters, columns, sort
        if (appState) {
            const aState = rison.decode(appState);
            if (aState) {
                // Extract columns
                if (aState.columns && Array.isArray(aState.columns)) {
                    summary.columns = aState.columns.slice(0, 5);
                }
                
                // Extract filters
                if (aState.filters && Array.isArray(aState.filters)) {
                    summary.filters = aState.filters.slice(0, 3).map(f => {
                        if (f.query && f.query.match) {
                            const key = Object.keys(f.query.match)[0];
                            const val = f.query.match[key].query || f.query.match[key];
                            return `${key} = ${val}`;
                        }
                        return 'Filter';
                    });
                }
                
                // Extract sort
                if (aState.sort && Array.isArray(aState.sort) && aState.sort.length > 0) {
                    const sortField = aState.sort[0];
                    const sortDir = aState.sort[1] || 'asc';
                    summary.sort = `${sortField} (${sortDir})`;
                }
                
                // Check for saved search
                if (aState.searchSource && aState.searchSource.index) {
                    summary.savedSearch = aState.searchSource.index;
                }
            }
        }
    } catch (e) {
        console.error('Extract summary failed:', e);
    }
    
    return summary;
}

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const kibanaUrlInput = document.getElementById('kibanaUrl');
    const dslJsonInput = document.getElementById('dslJson');
    const btnParseToDsl = document.getElementById('btnParseToDsl');
    const btnGenerateUrl = document.getElementById('btnGenerateUrl');
    const btnExchange = document.getElementById('btnExchange');
    const btnFormatJson = document.getElementById('btnFormatJson');
    const btnMinifyJson = document.getElementById('btnMinifyJson');
    const chkAutoDecode = document.getElementById('chkAutoDecode');
    const baseUrlInput = document.getElementById('baseUrl');
    const kibanaVersionSelect = document.getElementById('kibanaVersion');

    // State
    let currentDsl = {};
    let diffMode = false;

    // Helper: Format JSON
    const formatJson = (val) => {
        try {
            const obj = typeof val === 'string' ? JSON.parse(val) : val;
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            return val;
        }
    };

    // Helper: Minify JSON
    const minifyJson = (val) => {
        try {
            const obj = typeof val === 'string' ? JSON.parse(val) : val;
            return JSON.stringify(obj);
        } catch (e) {
            return val;
        }
    };

    // Feature 3: Summary Cards Logic
    window.updateSummary = (appState, globalState) => {
        const container = document.getElementById('summaryContainer');
        
        if (!appState && !globalState) {
            container.innerHTML = '';
            return;
        }

        const summary = extractSummaryFromDsl(appState, globalState);

        container.innerHTML = `
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center">
                    <i class="fas fa-chart-pie mr-2 text-blue-500"></i> Visual Summary
                </h3>
                <div class="flex flex-wrap gap-3">
                    <div class="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-100">
                        <span class="mr-2">🕐 Time:</span> ${summary.timeRange}
                    </div>
                    ${summary.filters.length > 0 ? summary.filters.map(f => `
                        <div class="flex items-center bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-green-100">
                            <span class="mr-2">🔍 Filter:</span> ${f}
                        </div>
                    `).join('') : ''}
                    ${summary.columns.length > 0 ? `
                    <div class="flex items-center bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-purple-100">
                        <span class="mr-2">📋 Columns:</span> ${summary.columns.join(', ')}
                    </div>` : ''}
                    ${summary.sort !== 'N/A' ? `
                    <div class="flex items-center bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-orange-100">
                        <span class="mr-2">🔢 Sort:</span> ${summary.sort}
                    </div>` : ''}
                    ${summary.savedSearch ? `
                    <div class="flex items-center bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200">
                        <span class="mr-2">🏷️ Index:</span> ${summary.savedSearch}
                    </div>` : ''}
                </div>
            </div>
        `;
    };

    // Feature 4: GUI Builder Logic
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

    // Feature 5: History Logic
    const initHistory = () => {
        const container = document.getElementById('historyContainer');
        container.innerHTML = `
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center">
                        <i class="fas fa-history mr-2 text-green-500"></i> History
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

    // Feature 6: Bookmarklet Logic
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

    // Feature 7: Footer Logic & Diff Mode
    const initFooter = () => {
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
    };
    initFooter();

    // Action: Parse URL to DSL
    const parseUrlToDsl = () => {
        const url = kibanaUrlInput.value.trim();
        if (!url) return alert('Vui lòng nhập URL Kibana');

        const states = parseKibanaState(url);
        if (!states) {
            alert('Không thể nhận diện định dạng URL Kibana!');
            return;
        }

        const result = {
            _g: states.globalState,
            _a: states.appState
        };

        dslJsonInput.value = formatJson(result);
        currentDsl = result;
        
        // Trigger summary update
        window.updateSummary(states.appState, states.globalState);
        
        // Add to history
        if (window.addToHistory) window.addToHistory(states.appState, states.globalState, url);
    };

    // Action: Generate URL from DSL
    const generateUrlFromDsl = () => {
        try {
            const dsl = JSON.parse(dslJsonInput.value);
            const baseUrl = baseUrlInput.value || 'http://localhost:5601';
            
            // Build URL with RISON encoding
            let newUrl = `${baseUrl}/app/kibana#/discover?`;
            
            if (dsl._g) {
                const gEncoded = rison.encode(dsl._g);
                newUrl += `_g=${encodeURIComponent(gEncoded)}&`;
            }
            
            if (dsl._a) {
                const aEncoded = rison.encode(dsl._a);
                newUrl += `_a=${encodeURIComponent(aEncoded)}`;
            }
            
            kibanaUrlInput.value = newUrl;
            
            // Update summary
            window.updateSummary(dsl._a, dsl._g);
        } catch (e) {
            alert('JSON không hợp lệ! ' + e.message);
        }
    };

    // Events
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

    // Feature 1: Share State
    const btnShareState = document.getElementById('btnShareState');
    btnShareState.addEventListener('click', () => {
        if (!kibanaUrlInput.value) return alert('Vui lòng nhập URL Kibana trước');
        const url = new URL(window.location.href);
        url.searchParams.set('url', btoa(kibanaUrlInput.value));
        navigator.clipboard.writeText(url.toString()).then(() => {
            alert('Link trạng thái đã được copy!');
        });
    });

    // Load from URL if present (with auto-decode support)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('url')) {
        try {
            kibanaUrlInput.value = atob(urlParams.get('url'));
            if (chkAutoDecode.checked) {
                // Delay to ensure DOM is ready
                setTimeout(parseUrlToDsl, 100);
            }
        } catch (e) {
            console.error('Failed to decode URL param:', e);
        }
    }
});
