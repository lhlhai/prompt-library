
/**
 * Kibana URL ↔ DSL Converter Logic
 * 
 * Logic includes RISON parsing for Kibana URL states (_a, _g).
 * Features: URL↔DSL conversion, Summary cards, GUI Builder, History, Bookmarklet, Diff mode
 * Version: 0.0.1
 */

// Robust RISON parser for Kibana states
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

// Parse Kibana URL and extract query parameters
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

// Convert Kibana RISON states to Elasticsearch DSL query
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

// Convert Elasticsearch DSL query to Kibana RISON states
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

// Extract meaningful information from DSL for summary
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

    const formatJson = (val) => {
        try {
            const obj = typeof val === 'string' ? JSON.parse(val) : val;
            return JSON.stringify(obj, null, 2);
        } catch (e) { return val; }
    };

    const parseUrlToDsl = () => {
        const url = kibanaUrlInput.value.trim();
        if (!url) return;
        const states = parseKibanaState(url);
        if (!states) return alert('URL không hợp lệ');
        const dsl = convertToDsl(states.appState, states.globalState);
        dslJsonInput.value = formatJson(dsl);
        window.updateSummary(states.appState, states.globalState);
    };

    const generateUrlFromDsl = () => {
        try {
            const states = convertToKibanaStates(dslJsonInput.value);
            const baseUrl = baseUrlInput.value || 'http://localhost:5601';
            kibanaUrlInput.value = `${baseUrl}/app/kibana#/discover?_g=${encodeURIComponent(states.globalStateRison)}&_a=${encodeURIComponent(states.appStateRison)}`;
            window.updateSummary(states.appStateRison, states.globalStateRison);
        } catch (e) { alert('DSL không hợp lệ'); }
    };

    btnParseToDsl.addEventListener('click', parseUrlToDsl);
    btnGenerateUrl.addEventListener('click', generateUrlFromDsl);
    btnExchange.addEventListener('click', () => {
        if (kibanaUrlInput.value) parseUrlToDsl();
        else if (dslJsonInput.value) generateUrlFromDsl();
    });
    btnFormatJson.addEventListener('click', () => dslJsonInput.value = formatJson(dslJsonInput.value));
    btnMinifyJson.addEventListener('click', () => {
        try { dslJsonInput.value = JSON.stringify(JSON.parse(dslJsonInput.value)); } catch(e) {}
    });
    if (btnClearAll) {
        btnClearAll.addEventListener('click', () => {
            kibanaUrlInput.value = '';
            dslJsonInput.value = '';
            window.updateSummary(null, null);
        });
    }

    window.updateSummary = (appState, globalState) => {
        const container = document.getElementById('summaryContainer');
        if (!container) return;
        if (!appState && !globalState) { container.innerHTML = ''; return; }
        const s = extractSummaryFromDsl(appState, globalState);
        container.innerHTML = `
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3 mt-4">
                <h3 class="text-sm font-bold text-gray-700 uppercase flex items-center"><i class="fas fa-chart-pie mr-2 text-blue-500"></i> Visual Summary</h3>
                <div class="flex flex-wrap gap-2">
                    <span class="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">Time: ${s.timeRange}</span>
                    ${s.filters.map(f => `<span class="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">Filter: ${f}</span>`).join('')}
                    ${s.columns.length ? `<span class="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">Cols: ${s.columns.join(', ')}</span>` : ''}
                    <span class="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold">Sort: ${s.sort}</span>
                </div>
            </div>`;
    };
});
