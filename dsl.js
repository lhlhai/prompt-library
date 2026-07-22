/**
 * Kibana URL ↔ DSL Converter Logic
 * 
 * Logic includes RISON parsing for Kibana URL states (_a, _g).
 * Features: URL↔DSL conversion, Summary cards, GUI Builder, History, Bookmarklet, Diff mode
 * Version: 0.1.4
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
        let workingUrl = url;
        if (!url.startsWith('http')) {
            workingUrl = 'http://' + url;
        }

        const urlObj = new URL(workingUrl);
        const hashPart = urlObj.hash;
        if (!hashPart) return null;
        
        const queryIndex = hashPart.indexOf('?');
        if (queryIndex === -1) return null;
        
        const params = new URLSearchParams(hashPart.substring(queryIndex + 1));
        
        const _a = params.get('_a');
        const _g = params.get('_g');
        
        return {
            appState: _a,
            globalState: _g,
            rawUrl: url
        };
    } catch (e) {
        console.error('Parse Kibana State failed:', e);
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
// Internal Query Model - Single Source of Truth
// ============================================================
/**
 * Internal Model Structure:
 * {
 *   "time": { "from": "now-7d", "to": "now" },
 *   "query": { "language": "kuery", "text": "" },
 *   "filters": [ { "type": "term", "field": "Carrier.keyword", "value": "JetBeats" } ],
 *   "sort": [ { "field": "@timestamp", "order": "desc" } ],
 *   "columns": ["_source"],
 *   "size": 500,
 *   "dataView": "d3d7af60-4c81-11e8-b3d7-01146121b73d"
 * }
 */

// ============================================================
// Step 1: Parse Kibana URL to Internal Model
// ============================================================
function parseKibanaUrlToModel(appStateRison, globalStateRison) {
    const model = {
        time: { from: 'now-15m', to: 'now' },
        query: { language: 'kuery', text: '' },
        filters: [],
        sort: [],
        columns: ['_source'],
        size: 500,
        dataView: null
    };

    try {
        const appState = appStateRison ? rison.decode(appStateRison) : {};
        const globalState = globalStateRison ? rison.decode(globalStateRison) : {};

        // Parse global state (_g) - time range
        if (globalState && globalState.time) {
            if (globalState.time.from) model.time.from = globalState.time.from;
            if (globalState.time.to) model.time.to = globalState.time.to;
        }

        // Parse app state (_a)
        if (appState) {
            // Query (KQL/Lucene)
            if (appState.query) {
                model.query.language = appState.query.language || 'kuery';
                model.query.text = appState.query.query || '';
            }

            // Filters
            if (appState.filters && Array.isArray(appState.filters)) {
                appState.filters.forEach(filter => {
                    if (filter.meta && filter.meta.disabled) return;

                    let internalFilter = null;

                    // Match phrase filter
                    if (filter.query && filter.query.match) {
                        const field = Object.keys(filter.query.match)[0];
                        const matchVal = filter.query.match[field];
                        const value = (typeof matchVal === 'object' && matchVal !== null) 
                            ? (matchVal.query || matchVal) 
                            : matchVal;
                        internalFilter = {
                            type: 'match_phrase',
                            field: field,
                            value: value
                        };
                    }
                    // Term filter
                    else if (filter.query && filter.query.term) {
                        const field = Object.keys(filter.query.term)[0];
                        internalFilter = {
                            type: 'term',
                            field: field,
                            value: filter.query.term[field]
                        };
                    }
                    // Range filter
                    else if (filter.range) {
                        const field = Object.keys(filter.range)[0];
                        const rangeObj = filter.range[field];
                        internalFilter = {
                            type: 'range',
                            field: field,
                            gte: rangeObj.gte || null,
                            lte: rangeObj.lte || null,
                            gt: rangeObj.gt || null,
                            lt: rangeObj.lt || null
                        };
                    }
                    // Exists filter
                    else if (filter.exists) {
                        internalFilter = {
                            type: 'exists',
                            field: filter.exists.field
                        };
                    }
                    // Query string filter
                    else if (filter.query && filter.query.query_string) {
                        internalFilter = {
                            type: 'query_string',
                            query: filter.query.query_string.query || '',
                            default_field: filter.query.query_string.default_field || '_all'
                        };
                    }

                    if (internalFilter) {
                        if (filter.meta && filter.meta.negate) {
                            internalFilter.negate = true;
                        }
                        model.filters.push(internalFilter);
                    }
                });
            }

            // Columns
            if (appState.columns && Array.isArray(appState.columns)) {
                model.columns = appState.columns;
            }

            // Sort
            if (appState.sort && Array.isArray(appState.sort) && appState.sort.length > 0) {
                const sortField = appState.sort[0];
                const sortOrder = appState.sort[1] || 'asc';
                model.sort = [{ field: sortField, order: sortOrder }];
            }

            // Data View
            if (appState.dataViewId) {
                model.dataView = appState.dataViewId;
            }

            // Size (from interval or default)
            if (appState.interval) {
                model.size = 500; // Default size for Discover
            }
        }
    } catch (e) {
        console.error('Error parsing Kibana URL to model:', e);
    }

    return model;
}

// ============================================================
// Step 2: Convert Internal Model to Elasticsearch DSL
// ============================================================
function modelToDsl(model) {
    const dsl = {
        size: model.size || 500,
        sort: [],
        _source: model.columns || []
    };

    const boolQuery = { must: [], filter: [], should: [], must_not: [] };

    // Time range -> range query on @timestamp
    if (model.time) {
        const timeRange = {};
        if (model.time.from) timeRange.gte = model.time.from;
        if (model.time.to) timeRange.lte = model.time.to;
        if (Object.keys(timeRange).length > 0) {
            boolQuery.filter.push({ range: { '@timestamp': timeRange } });
        }
    }

    // KQL/Lucene query text
    if (model.query && model.query.text) {
        if (model.query.language === 'lucene') {
            boolQuery.must.push({ query_string: { query: model.query.text } });
        } else {
            // KUERY - simplified handling
            boolQuery.must.push({ query_string: { query: model.query.text } });
        }
    }

    // Filters
    if (model.filters && Array.isArray(model.filters)) {
        model.filters.forEach(filter => {
            let dslFilter = null;

            switch (filter.type) {
                case 'term':
                    dslFilter = { term: { [filter.field]: filter.value } };
                    break;
                case 'match_phrase':
                    dslFilter = { match_phrase: { [filter.field]: filter.value } };
                    break;
                case 'range':
                    const rangeObj = {};
                    if (filter.gte !== null && filter.gte !== undefined) rangeObj.gte = filter.gte;
                    if (filter.lte !== null && filter.lte !== undefined) rangeObj.lte = filter.lte;
                    if (filter.gt !== null && filter.gt !== undefined) rangeObj.gt = filter.gt;
                    if (filter.lt !== null && filter.lt !== undefined) rangeObj.lt = filter.lt;
                    dslFilter = { range: { [filter.field]: rangeObj } };
                    break;
                case 'exists':
                    dslFilter = { exists: { field: filter.field } };
                    break;
                case 'query_string':
                    dslFilter = { query_string: { query: filter.query, default_field: filter.default_field || '_all' } };
                    break;
            }

            if (dslFilter) {
                if (filter.negate) {
                    boolQuery.must_not.push(dslFilter);
                } else {
                    boolQuery.filter.push(dslFilter);
                }
            }
        });
    }

    // Sort
    if (model.sort && model.sort.length > 0) {
        model.sort.forEach(s => {
            dsl.sort.push({ [s.field]: s.order });
        });
    }

    // Build final query
    if (boolQuery.must.length > 0 || boolQuery.filter.length > 0 || boolQuery.should.length > 0 || boolQuery.must_not.length > 0) {
        dsl.query = { bool: {} };
        if (boolQuery.must.length > 0) dsl.query.bool.must = boolQuery.must;
        if (boolQuery.filter.length > 0) dsl.query.bool.filter = boolQuery.filter;
        if (boolQuery.should.length > 0) dsl.query.bool.should = boolQuery.should;
        if (boolQuery.must_not.length > 0) dsl.query.bool.must_not = boolQuery.must_not;
    }

    // Clean up empty bool
    if (dsl.query && dsl.query.bool && Object.keys(dsl.query.bool).length === 0) {
        delete dsl.query.bool;
        if (Object.keys(dsl.query).length === 0) delete dsl.query;
    }

    // Clean up empty arrays
    if (dsl.sort && dsl.sort.length === 0) delete dsl.sort;
    if (dsl._source && dsl._source.length === 0) delete dsl._source;

    return dsl;
}

// ============================================================
// Main function: Convert Kibana RISON states to Elasticsearch DSL query
// Uses Internal Model as intermediate representation
// ============================================================
function convertToDsl(appStateRison, globalStateRison) {
    try {
        // Step 1: Parse Kibana URL to Internal Model
        const model = parseKibanaUrlToModel(appStateRison, globalStateRison);
        
        // Step 2: Convert Internal Model to DSL
        const dsl = modelToDsl(model);
        
        return dsl;
    } catch (e) {
        console.error('Error converting to DSL:', e);
        return { error: e.message };
    }
}

// ============================================================
// Step 3: Parse Elasticsearch DSL to Internal Model
// ============================================================
function parseDslToModel(dsl) {
    const model = {
        time: { from: 'now-15m', to: 'now' },
        query: { language: 'kuery', text: '' },
        filters: [],
        sort: [],
        columns: ['_source'],
        size: 500,
        dataView: null
    };

    // Extract size
    if (dsl.size) {
        model.size = dsl.size;
    }

    // Extract columns (_source)
    if (dsl._source) {
        model.columns = Array.isArray(dsl._source) ? dsl._source : [dsl._source];
    }

    // Extract sort
    if (dsl.sort && Array.isArray(dsl.sort)) {
        model.sort = dsl.sort.map(s => {
            const field = Object.keys(s)[0];
            return { field: field, order: s[field] };
        });
    }

    // Extract query and filters
    if (dsl.query && dsl.query.bool) {
        const bool = dsl.query.bool;

        // Process must clauses (queries)
        if (bool.must && Array.isArray(bool.must)) {
            bool.must.forEach(clause => {
                if (clause.query_string) {
                    model.query.text = clause.query_string.query || '';
                    model.query.language = 'lucene';
                } else if (clause.match || clause.match_phrase || clause.term) {
                    // Extract simple queries as KQL text
                    const fieldType = Object.keys(clause)[0];
                    const field = Object.keys(clause[fieldType])[0];
                    const value = clause[fieldType][field];
                    if (!model.query.text) {
                        model.query.text = `${field}: ${typeof value === 'object' ? value.query : value}`;
                    }
                }
            });
        }

        // Process filter and must_not clauses
        const processClauses = (clauses, negate) => {
            if (!clauses || !Array.isArray(clauses)) return;
            
            clauses.forEach(clause => {
                let internalFilter = null;

                // Time range on @timestamp
                if (clause.range && clause.range['@timestamp']) {
                    const timeRange = clause.range['@timestamp'];
                    model.time.from = timeRange.gte || 'now-15m';
                    model.time.to = timeRange.lte || 'now';
                    return;
                }

                // Range filter
                if (clause.range) {
                    const field = Object.keys(clause.range)[0];
                    const rangeObj = clause.range[field];
                    internalFilter = {
                        type: 'range',
                        field: field,
                        gte: rangeObj.gte || null,
                        lte: rangeObj.lte || null,
                        gt: rangeObj.gt || null,
                        lt: rangeObj.lt || null,
                        negate: negate
                    };
                }
                // Match phrase filter
                else if (clause.match_phrase) {
                    const field = Object.keys(clause.match_phrase)[0];
                    const value = clause.match_phrase[field];
                    internalFilter = {
                        type: 'match_phrase',
                        field: field,
                        value: typeof value === 'object' ? value.query : value,
                        negate: negate
                    };
                }
                // Term filter
                else if (clause.term) {
                    const field = Object.keys(clause.term)[0];
                    const value = clause.term[field];
                    internalFilter = {
                        type: 'term',
                        field: field,
                        value: value,
                        negate: negate
                    };
                }
                // Exists filter
                else if (clause.exists) {
                    internalFilter = {
                        type: 'exists',
                        field: clause.exists.field,
                        negate: negate
                    };
                }
                // Query string filter
                else if (clause.query_string) {
                    internalFilter = {
                        type: 'query_string',
                        query: clause.query_string.query || '',
                        default_field: clause.query_string.default_field || '_all',
                        negate: negate
                    };
                }

                if (internalFilter) {
                    model.filters.push(internalFilter);
                }
            });
        };

        processClauses(bool.filter, false);
        processClauses(bool.must_not, true);
    }

    return model;
}

// ============================================================
// Step 4: Convert Internal Model to Kibana RISON states
// ============================================================
function modelToKibanaRison(model) {
    const appState = {
        query: { language: model.query.language || 'kuery', query: model.query.text || '' },
        filters: [],
        columns: model.columns || ['_source'],
        sort: [],
        dataViewId: model.dataView
    };
    
    const globalState = { 
        time: { 
            from: model.time.from || 'now-15m', 
            to: model.time.to || 'now' 
        } 
    };

    // Convert filters to Kibana format
    if (model.filters && Array.isArray(model.filters)) {
        model.filters.forEach(filter => {
            let kibanaFilter = { 
                meta: { 
                    negate: filter.negate || false, 
                    disabled: false, 
                    index: model.dataView || '*',
                    key: filter.field,
                    value: null,
                    type: filter.type
                } 
            };

            switch (filter.type) {
                case 'term':
                    kibanaFilter.query = { term: { [filter.field]: filter.value } };
                    kibanaFilter.meta.value = filter.value;
                    break;
                case 'match_phrase':
                    kibanaFilter.query = { match_phrase: { [filter.field]: { query: filter.value, type: 'phrase' } } };
                    kibanaFilter.meta.value = filter.value;
                    kibanaFilter.meta.type = 'phrase';
                    break;
                case 'range':
                    const rangeObj = {};
                    if (filter.gte !== null && filter.gte !== undefined) rangeObj.gte = filter.gte;
                    if (filter.lte !== null && filter.lte !== undefined) rangeObj.lte = filter.lte;
                    if (filter.gt !== null && filter.gt !== undefined) rangeObj.gt = filter.gt;
                    if (filter.lt !== null && filter.lt !== undefined) rangeObj.lt = filter.lt;
                    kibanaFilter.range = { [filter.field]: rangeObj };
                    kibanaFilter.meta.value = Object.values(rangeObj).join(' - ');
                    break;
                case 'exists':
                    kibanaFilter.exists = { field: filter.field };
                    kibanaFilter.meta.value = 'exists';
                    break;
                case 'query_string':
                    kibanaFilter.query = { query_string: { query: filter.query, default_field: filter.default_field || '_all' } };
                    break;
            }

            appState.filters.push(kibanaFilter);
        });
    }

    // Convert sort to Kibana format
    if (model.sort && model.sort.length > 0) {
        const firstSort = model.sort[0];
        appState.sort = [firstSort.field, firstSort.order];
    }

    return {
        appStateRison: rison.encode(appState),
        globalStateRison: rison.encode(globalState)
    };
}

// ============================================================
// Main function: Convert Elasticsearch DSL query to Kibana RISON states
// Uses Internal Model as intermediate representation
// ============================================================
function convertToKibanaStates(dslJson) {
    try {
        const dsl = typeof dslJson === 'string' ? JSON.parse(dslJson) : dslJson;
        
        // Step 3: Parse DSL to Internal Model
        const model = parseDslToModel(dsl);
        
        // Step 4: Convert Internal Model to Kibana RISON states
        const states = modelToKibanaRison(model);
        
        return states;
    } catch (e) {
        console.error('Error converting to Kibana states:', e);
        return { error: e.message };
    }
}

// ============================================================
// Extract meaningful information from DSL for summary
// Uses Internal Model for consistent extraction
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
        // Use the internal model for consistent extraction
        const model = parseKibanaUrlToModel(appStateRison, globalStateRison);
        
        // Time range
        if (model.time) {
            summary.timeRange = `${model.time.from || 'now'} → ${model.time.to || 'now'}`;
        }
        
        // Columns
        if (model.columns) {
            summary.columns = model.columns.slice(0, 5);
        }
        
        // Filters
        if (model.filters && model.filters.length > 0) {
            summary.filters = model.filters.slice(0, 3).map(f => {
                if (f.type === 'term' || f.type === 'match_phrase') {
                    return `${f.field} = ${f.value}`;
                } else if (f.type === 'range') {
                    const parts = [];
                    if (f.gte) parts.push(`≥ ${f.gte}`);
                    if (f.lte) parts.push(`≤ ${f.lte}`);
                    if (f.gt) parts.push(`> ${f.gt}`);
                    if (f.lt) parts.push(`< ${f.lt}`);
                    return `${f.field}: ${parts.join(', ')}`;
                } else if (f.type === 'exists') {
                    return `${f.field} exists`;
                } else if (f.type === 'query_string') {
                    return f.query || 'Query';
                }
                return `${f.field || 'Filter'}`;
            });
        }
        
        // Sort
        if (model.sort && model.sort.length > 0) {
            const firstSort = model.sort[0];
            summary.sort = `${firstSort.field} (${firstSort.order || 'asc'})`;
        }
    } catch (e) { 
        console.error('Summary error:', e); 
    }
    return summary;
}

// ============================================================
// Clean URL builder — raw RISON in URL (Kibana native format)
// ============================================================
function buildKibanaUrl(appStateRison, globalStateRison, baseUrl) {
    const base = baseUrl || 'http://localhost:5601';
    
    const safeEncode = (str) => {
        if (!str) return '';
        return str.replace(/%/g, '%25')
                  .replace(/#/g, '%23')
                  .replace(/&/g, '%26')
                  .replace(/\+/g, '%2B')
                  .replace(/\//g, '%2F')
                  .replace(/@/g, '%40');
    };

    const a = safeEncode(appStateRison);
    const g = safeEncode(globalStateRison);
    
    let url = base;
    if (!url.endsWith('/')) url += '/';
    return `${url}#/discover?_g=${g}&_a=${a}`;
}

// ============================================================
// Visual Diff Logic
// ============================================================
function computeDiff(text1, text2) {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    const result = [];
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
        const l1 = lines1[i] || '';
        const l2 = lines2[i] || '';
        if (l1 === l2) {
            result.push({ type: 'equal', l1, l2 });
        } else {
            if (l1 && !l2) {
                result.push({ type: 'removed', l1, l2: '' });
            } else if (!l1 && l2) {
                result.push({ type: 'added', l1: '', l2 });
            } else {
                result.push({ type: 'modified', l1, l2 });
            }
        }
    }
    return result;
}

// ============================================================
// UI Controllers & Event Handlers
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const kibanaUrlInput = document.getElementById('kibanaUrl');
    const dslJsonInput = document.getElementById('dslJson');
    const baseUrlInput = document.getElementById('baseUrl');
    const kibanaUrlInput2 = document.getElementById('kibanaUrl2');
    const dslJsonInput2 = document.getElementById('dslJson2');

    let diffMode = false;
    const formatJson = (obj) => JSON.stringify(obj, null, 4);

    // ---------- Summary Cards ----------
    window.updateSummary = (appState, globalState) => {
        const summary = extractSummaryFromDsl(appState, globalState);
        const container = document.getElementById('summaryContainer');
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Time Range</p>
                    <p class="text-sm font-semibold text-gray-700">${summary.timeRange}</p>
                </div>
                <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active Filters</p>
                    <div class="flex flex-wrap gap-1">
                        ${summary.filters.length > 0 
                            ? summary.filters.map(f => `<span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium border border-blue-100">${f}</span>`).join('')
                            : '<span class="text-xs text-gray-400 italic">None</span>'}
                    </div>
                </div>
                <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Columns</p>
                    <p class="text-xs text-gray-600">${summary.columns.join(', ') || 'Default'}</p>
                </div>
                <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sort</p>
                    <p class="text-sm font-semibold text-gray-700">${summary.sort}</p>
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
                            <input type="text" id="guiField" placeholder="e.g. carrier" class="px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none">
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-gray-400 uppercase">Operator</label>
                            <select id="guiOperator" class="px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none bg-white">
                                <option value="is">equals</option>
                                <option value="contains">contains</option>
                                <option value="exists">exists</option>
                                <option value="range">range</option>
                            </select>
                        </div>
                        <div class="space-y-1 flex-1 min-w-[150px]">
                            <label class="text-[10px] font-bold text-gray-400 uppercase">Value</label>
                            <input type="text" id="guiValue" placeholder="e.g. JetBeats" class="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none">
                        </div>
                        <button id="btnAddFilter" class="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-bold shadow-sm">
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
        document.getElementById('btnAddFilter').addEventListener('click', () => {
            const field = document.getElementById('guiField').value.trim();
            const op = document.getElementById('guiOperator').value;
            const val = document.getElementById('guiValue').value.trim();
            if (!field || !val) return alert('Vui lòng nhập Field và Value');
            let dsl = {};
            try { dsl = JSON.parse(dslJsonInput.value || '{}'); } catch (e) { dsl = {}; }
            let newFilter = {};
            if (op === 'is') newFilter = { term: { [field]: val } };
            else if (op === 'contains') newFilter = { match: { [field]: val } };
            else if (op === 'exists') newFilter = { exists: { field: field } };
            else if (op === 'range') newFilter = { range: { [field]: { gte: val } } };
            if (!dsl.query) dsl.query = { bool: { filter: [] } };
            if (!dsl.query.bool) dsl.query.bool = { filter: [] };
            if (!Array.isArray(dsl.query.bool.filter)) dsl.query.bool.filter = [];
            dsl.query.bool.filter.push(newFilter);
            dslJsonInput.value = formatJson(dsl);
            generateUrlFromDsl(dslJsonInput, kibanaUrlInput);
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
                    dslJsonInput.value = formatJson(item.dsl_raw || item.dsl);
                    window.updateSummary(item.appState, item.globalState);
                });
            });
        };
        window.addToHistory = (appState, globalState, url) => {
            if (history.length > 0) {
                const last = history[0];
                if (last.appState === appState && last.globalState === globalState) return;
            }
            const now = new Date();
            const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            const summary = extractSummaryFromDsl(appState, globalState);
            const filterLabel = summary.filters.length > 0 ? summary.filters[0].split(' = ')[0] : 'Query';
            const timeRange = summary.timeRange.split(' → ')[0];
            const label = `${timeRange}, ${filterLabel}`;
            const newItem = { time: timeStr, label, url, dsl_raw: { _a: appState, _g: globalState }, appState, globalState };
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
            a.href = url; a.download = 'kibana-dsl-history.json'; a.click(); URL.revokeObjectURL(url);
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
                    <i class="fas fa-bookmark mr-2 text-yellow-500"></i> 📌 Bookmarklet
                </h3>
                <div class="flex items-center space-x-4">
                    <button id="btnCopyBookmarklet" class="px-4 py-2 bg-yellow-500 text-white rounded-md text-sm font-bold shadow-sm">Copy Bookmarklet</button>
                    <a href="${script}" class="px-4 py-2 bg-white border border-yellow-500 text-yellow-600 rounded-md text-sm font-bold">Kéo tôi vào Bookmark Bar</a>
                </div>
            </div>
        `;
        document.getElementById('btnCopyBookmarklet').addEventListener('click', () => {
            navigator.clipboard.writeText(script).then(() => alert('Bookmarklet đã được copy!'));
        });
    };
    initBookmarklet();

    // ---------- Diff Mode Toggle ----------
    document.getElementById('btnToggleDiff').addEventListener('click', () => {
        diffMode = !diffMode;
        const btn = document.getElementById('btnToggleDiff');
        const pair2 = document.getElementById('pair2');
        const diffOnlyLabels = document.querySelectorAll('.diff-only');
        
        if (diffMode) {
            btn.classList.add('bg-blue-600', 'text-white', 'border-blue-700');
            btn.classList.remove('bg-gray-50', 'text-gray-600', 'border-gray-200');
            pair2.classList.remove('diff-hidden');
            diffOnlyLabels.forEach(el => el.classList.remove('hidden'));
        } else {
            btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-700');
            btn.classList.add('bg-gray-50', 'text-gray-600', 'border-gray-200');
            pair2.classList.add('diff-hidden');
            diffOnlyLabels.forEach(el => el.classList.add('hidden'));
            document.getElementById('visualDiffResult').classList.add('hidden');
        }
    });

    // ---------- Run Visual Diff ----------
    document.getElementById('btnRunVisualDiff').addEventListener('click', () => {
        const dsl1 = dslJsonInput.value.trim();
        const dsl2 = dslJsonInput2.value.trim();
        if (!dsl1 || !dsl2) return alert('Vui lòng nhập cả hai DSL JSON để so sánh');
        const diffs = computeDiff(dsl1, dsl2);
        const container = document.getElementById('diffContent');
        container.innerHTML = '';
        diffs.forEach(d => {
            const row = document.createElement('div');
            row.className = 'grid grid-cols-2 gap-4 border-b border-gray-100 py-1';
            const cell1 = document.createElement('pre');
            cell1.className = 'diff-view p-1 rounded ' + (d.type === 'removed' || d.type === 'modified' ? 'diff-removed' : '');
            cell1.textContent = d.l1 || ' ';
            const cell2 = document.createElement('pre');
            cell2.className = 'diff-view p-1 rounded ' + (d.type === 'added' || d.type === 'modified' ? 'diff-added' : '');
            cell2.textContent = d.l2 || ' ';
            row.appendChild(cell1); row.appendChild(cell2);
            container.appendChild(row);
        });
        document.getElementById('visualDiffResult').classList.remove('hidden');
        document.getElementById('visualDiffResult').scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('btnCloseDiff').addEventListener('click', () => document.getElementById('visualDiffResult').classList.add('hidden'));

    // ---------- Core Actions ----------
    const parseUrlToDsl = (inputEl, outputEl) => {
        const url = inputEl.value.trim();
        if (!url) return alert('Vui lòng nhập URL Kibana');
        const states = parseKibanaState(url);
        if (!states) return alert('Không thể nhận diện định dạng URL Kibana!');
        const dsl = convertToDsl(states.appState, states.globalState);
        outputEl.value = formatJson(dsl);
        if (inputEl === kibanaUrlInput) {
            window.updateSummary(states.appState, states.globalState);
            if (window.addToHistory) window.addToHistory(states.appState, states.globalState, url);
        }
    };
    const generateUrlFromDsl = (inputEl, outputEl) => {
        try {
            const dsl = JSON.parse(inputEl.value);
            const states = convertToKibanaStates(dsl);
            const newUrl = buildKibanaUrl(states.appStateRison, states.globalStateRison, baseUrlInput.value || 'http://localhost:5601');
            outputEl.value = newUrl;
            if (outputEl === kibanaUrlInput) {
                window.updateSummary(states.appStateRison, states.globalStateRison);
                if (window.addToHistory) window.addToHistory(states.appStateRison, states.globalStateRison, newUrl);
            }
        } catch (e) { alert('JSON không hợp lệ! ' + e.message); }
    };

    // ---------- Event Listeners ----------
    document.getElementById('btnParseToDsl').addEventListener('click', () => parseUrlToDsl(kibanaUrlInput, dslJsonInput));
    document.getElementById('btnGenerateUrl').addEventListener('click', () => generateUrlFromDsl(dslJsonInput, kibanaUrlInput));
    document.getElementById('btnExchange').addEventListener('click', () => {
        const temp = kibanaUrlInput.value; kibanaUrlInput.value = dslJsonInput.value; dslJsonInput.value = temp;
    });
    document.getElementById('btnParseToDsl2').addEventListener('click', () => parseUrlToDsl(kibanaUrlInput2, dslJsonInput2));
    document.getElementById('btnGenerateUrl2').addEventListener('click', () => generateUrlFromDsl(dslJsonInput2, kibanaUrlInput2));
    document.getElementById('btnExchange2').addEventListener('click', () => {
        const temp = kibanaUrlInput2.value; kibanaUrlInput2.value = dslJsonInput2.value; dslJsonInput2.value = temp;
    });
    document.getElementById('btnFormatJson').addEventListener('click', () => { try { dslJsonInput.value = formatJson(JSON.parse(dslJsonInput.value)); } catch (e) {} });
    document.getElementById('btnFormatJson2').addEventListener('click', () => { try { dslJsonInput2.value = formatJson(JSON.parse(dslJsonInput2.value)); } catch (e) {} });
    document.getElementById('btnClearAll').addEventListener('click', () => {
        if (confirm('Xóa toàn bộ nội dung?')) { kibanaUrlInput.value = ''; dslJsonInput.value = ''; kibanaUrlInput2.value = ''; dslJsonInput2.value = ''; }
    });
    document.getElementById('btnShareState').addEventListener('click', () => {
        if (!kibanaUrlInput.value) return alert('Vui lòng nhập URL Kibana');
        const url = new URL(window.location.href); url.searchParams.set('url', btoa(kibanaUrlInput.value));
        navigator.clipboard.writeText(url.toString()).then(() => alert('Link đã được copy!'));
    });
    document.getElementById('btnCopyUrl').addEventListener('click', () => { navigator.clipboard.writeText(kibanaUrlInput.value).then(() => alert('URL đã được copy!')); });
    document.getElementById('btnCopyDsl').addEventListener('click', () => { navigator.clipboard.writeText(dslJsonInput.value).then(() => alert('DSL đã được copy!')); });
    document.getElementById('btnCopyUrl2').addEventListener('click', () => { navigator.clipboard.writeText(kibanaUrlInput2.value).then(() => alert('URL 2 đã được copy!')); });
    document.getElementById('btnCopyDsl2').addEventListener('click', () => { navigator.clipboard.writeText(dslJsonInput2.value).then(() => alert('DSL 2 đã được copy!')); });

    // Auto-load
    const urlParams = new URLSearchParams(window.location.search);
    const encodedUrl = urlParams.get('url');
    if (encodedUrl) { try { kibanaUrlInput.value = atob(encodedUrl); parseUrlToDsl(kibanaUrlInput, dslJsonInput); } catch (e) {} }
});
