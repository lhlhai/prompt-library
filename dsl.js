/**
 * Kibana URL ↔ DSL Converter Logic
 * 
 * Logic includes RISON parsing for Kibana URL states (_a, _g).
 */

// Simple RISON-like parser for Kibana states
const rison = {
    decode: (str) => {
        if (!str) return null;
        // Basic rison to json conversion
        // Note: Real Kibana uses a more complex rison parser, 
        // this is a simplified version for common cases.
        try {
            let jsonStr = str
                .replace(/!t/g, 'true')
                .replace(/!f/g, 'false')
                .replace(/!n/g, 'null')
                .replace(/\(([^)]+)\)/g, '{$1}')
                .replace(/@\(([^)]+)\)/g, '[$1]')
                .replace(/([a-zA-Z0-9_]+):/g, '"$1":')
                .replace(/'([^']+)'/g, '"$1"');
            
            // Fix potential issues with unquoted strings in arrays or values
            // This is a very rough approximation
            return JSON.parse(jsonStr);
        } catch (e) {
            // If simple replacement fails, try a more robust approach or return error
            console.error('Rison decode failed, trying fallback', e);
            return null;
        }
    },
    encode: (obj) => {
        if (!obj) return '';
        return JSON.stringify(obj)
            .replace(/"([^"]+)":/g, '$1:')
            .replace(/"([^"]+)"/g, "'$1'")
            .replace(/true/g, '!t')
            .replace(/false/g, '!f')
            .replace(/null/g, '!n')
            .replace(/\{/g, '(')
            .replace(/\}/g, ')')
            .replace(/\[/g, '@(')
            .replace(/\]/g, ')');
    }
};

// More robust Kibana state parser (handles the actual format better)
function parseKibanaState(url) {
    try {
        const hash = url.split('#')[1] || '';
        const params = new URLSearchParams(hash.split('?')[1] || '');
        
        const _a = params.get('_a'); // App state
        const _g = params.get('_g'); // Global state (time range)
        
        // In modern Kibana, these are often RISON or compressed RISON
        // For simplicity, we'll focus on extracting the query parts
        return {
            appState: _a,
            globalState: _g
        };
    } catch (e) {
        console.error('Parse Kibana State failed', e);
        return null;
    }
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

    // Action: Parse URL to DSL
    const parseUrlToDsl = () => {
        const url = kibanaUrlInput.value.trim();
        if (!url) return;

        // Try to extract _a and _g
        const states = parseKibanaState(url);
        if (!states) {
            alert('Không thể nhận diện định dạng URL Kibana!');
            return;
        }

        // Mock conversion for demonstration
        // In a real app, we would use a RISON library
        // Here we'll just show we found the states
        const result = {
            _g: states.globalState,
            _a: states.appState,
            note: "Đây là dữ liệu thô từ URL. Tính năng giải mã RISON đầy đủ đang được cập nhật."
        };

        dslJsonInput.value = formatJson(result);
        currentDsl = result;
        
        // Trigger summary update (Feature 3)
        if (window.updateSummary) window.updateSummary(result);
    };

    // Action: Generate URL from DSL
    const generateUrlFromDsl = () => {
        try {
            const dsl = JSON.parse(dslJsonInput.value);
            const baseUrl = baseUrlInput.value || 'http://localhost:5601';
            const version = kibanaVersionSelect.value;
            
            // Simple reconstruction
            let newUrl = `${baseUrl}/app/kibana#/discover?`;
            if (dsl._g) newUrl += `_g=${dsl._g}&`;
            if (dsl._a) newUrl += `_a=${dsl._a}`;
            
            kibanaUrlInput.value = newUrl;
        } catch (e) {
            alert('JSON không hợp lệ!');
        }
    };

    // Events
    btnParseToDsl.addEventListener('click', parseUrlToDsl);
    btnGenerateUrl.addEventListener('click', generateUrlFromDsl);
    btnExchange.addEventListener('click', () => {
        // Simple toggle logic or just trigger the most logical flow
        if (kibanaUrlInput.value && !dslJsonInput.value) {
            parseUrlToDsl();
        } else if (dslJsonInput.value) {
            generateUrlFromDsl();
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
        const url = new URL(window.location.href);
        if (kibanaUrlInput.value) url.searchParams.set('url', btoa(kibanaUrlInput.value));
        navigator.clipboard.writeText(url.toString()).then(() => {
            alert('Link trạng thái đã được copy!');
        });
    });

    // Load from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('url')) {
        kibanaUrlInput.value = atob(urlParams.get('url'));
        if (chkAutoDecode.checked) parseUrlToDsl();
    }
});
