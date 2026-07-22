/**
 * Kibana URL ↔ DSL Converter Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Kibana DSL Converter initialized.');
    
    // Feature 1: Share State
    const btnShareState = document.getElementById('btnShareState');
    btnShareState.addEventListener('click', () => {
        const url = new URL(window.location.href);
        // We will add state persistence later
        navigator.clipboard.writeText(url.toString()).then(() => {
            alert('Link trạng thái đã được copy vào clipboard!');
        });
    });
});
