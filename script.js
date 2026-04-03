// script.js - Logic xử lý cho Prompt Library

// Kiểm tra sự tồn tại của PROMPTS từ prompts.js
if (typeof PROMPTS === 'undefined') {
  console.error('PROMPTS is not defined. Please ensure prompts.js is loaded correctly.');
  window.PROMPTS = [];
}

// ==================== CONFIG ====================
const CONFIG = {
  ENABLE_MARKDOWN_PREVIEW: true, // Issue #21
  ENABLE_QUICK_COPY_TOOLBAR: true, // Issue #20
  ENABLE_COMPARISON_MODE: true, // Issue #19
  ENABLE_COLLECTIONS: true, // Issue #18
  ENABLE_TAGGING: true, // Issue #15
};

// ==================== STATE ====================
const QUICK_SNIPPETS = [
  { label: "Critical Flow", content: "Identify critical path and potential failure points." },
  { label: "Negative Test", content: "Analyze negative test scenarios and edge cases." },
  { label: "Security Review", content: "Evaluate security risks and permission vulnerabilities." },
  { label: "API Specs", content: "Review API request/response and error handling." },
  { label: "UI Checklist", content: "Check UI consistency, accessibility, and responsiveness." }
];

let filteredPrompts = [...PROMPTS];
let selectedCategories = [];
let currentModalPrompt = null;
let searchTimeout;
let variableValues = {}; // Store variable values for current prompt
let showFavoritesOnly = false; // New state for favorites filter
let comparisonList = []; // State for comparison mode
let currentCollectionId = 'all'; // Default collection
let viewMode = localStorage.getItem('prompt-library-view-mode') || 'grid'; // 'grid' or 'list'
let recentPrompts = JSON.parse(localStorage.getItem('prompt-library-recent')) || [];

// DOM Elements
const grid = document.getElementById('promptGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const totalBadge = document.getElementById('totalBadge');
const activeBadge = document.getElementById('activeBadge');
const resultsBadge = document.getElementById('resultsBadge');
const favoriteFilterBtn = document.getElementById('favoriteFilterBtn');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const toast = document.getElementById('toast');
const categoryChipsContainer = document.getElementById('categoryChipsContainer');
const clearAllFiltersBtn = document.getElementById('clearAllFilters');
const categoryList = document.getElementById('categoryList');
const gridViewBtn = document.getElementById('gridViewBtn');
const listViewBtn = document.getElementById('listViewBtn');
const sidebarFavorites = document.getElementById('sidebarFavorites');
const sidebarRecent = document.getElementById('sidebarRecent');

// ==================== HELPERS ====================
const formatDate = (iso) => {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return iso;
  }
};

const escapeHtml = (str) => {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// Deprecated: Use searchEngine.fuzzyMatch() instead
const fuzzyMatch = (query, text) => {
  return searchEngine.fuzzyMatch(query.toLowerCase(), text.toLowerCase());
};

const highlightText = (text, query) => {
  if (!query || !text) return escapeHtml(text || '');
  const escapedText = escapeHtml(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escapedText.replace(regex, '<span class="search-highlight">$1</span>');
};

const showToast = (msg) => {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
};

const copyToClipboard = async (text, btn, promptNumber) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast('✓ Copied to clipboard!');
    
    // Add to recent
    if (promptNumber !== undefined) {
      addToRecent(promptNumber);
    }

    if (btn) {
      const originalHtml = btn.innerHTML;
      btn.classList.add('copied');
      btn.innerHTML = '✓ Copied!';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = originalHtml;
      }, 2000);
    }
  } catch (err) {
    showToast('✗ Copy failed');
    console.error(err);
  }
};

const addToRecent = (promptNumber) => {
  recentPrompts = [promptNumber, ...recentPrompts.filter(n => n !== promptNumber)].slice(0, 10);
  localStorage.setItem('prompt-library-recent', JSON.stringify(recentPrompts));
  renderSidebar();
};

// ==================== PROMPT EDITOR HANDLING ====================
let editedPrompts = JSON.parse(localStorage.getItem('prompt-library-edited')) || {};
let isEditMode = false;

const getEditedPrompt = (promptNumber) => editedPrompts[promptNumber];

const saveEditedPrompt = (promptNumber, newContent) => {
  editedPrompts[promptNumber] = newContent;
  localStorage.setItem('prompt-library-edited', JSON.stringify(editedPrompts));
};

const deleteEditedPrompt = (promptNumber) => {
  delete editedPrompts[promptNumber];
  localStorage.setItem('prompt-library-edited', JSON.stringify(editedPrompts));
};

const hasEditedPrompt = (promptNumber) => promptNumber in editedPrompts;

// ==================== FAVORITES HANDLING ====================
let favorites = JSON.parse(localStorage.getItem('prompt-library-favorites')) || [];

const isFavorite = (promptNumber) => favorites.includes(promptNumber);

const toggleFavorite = (promptNumber) => {
  if (isFavorite(promptNumber)) {
    favorites = favorites.filter(n => n !== promptNumber);
  } else {
    favorites.push(promptNumber);
  }
  localStorage.setItem('prompt-library-favorites', JSON.stringify(favorites));
  updateFavoriteButtons();
  
  // If we are in "Favorites Only" mode or "My Collection", we need to re-filter
  const isMyCollection = window.APP_CONFIG && APP_CONFIG.enableMultiPage && currentCollectionId === 'my-collection';
  if (showFavoritesOnly || isMyCollection) {
    filterPrompts(searchInput.value);
  }
};

const updateFavoriteButtons = () => {
  document.querySelectorAll('[data-favorite]').forEach(btn => {
    const num = parseInt(btn.dataset.favorite);
    if (isFavorite(num)) {
      btn.classList.add('active');
      btn.innerHTML = '⭐';
      btn.title = 'Remove from Favorites';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '☆';
      btn.title = 'Add to Favorites';
    }
  });
};

const toggleEditMode = (enable) => {
  isEditMode = enable;
  const modalPrompt = document.getElementById('modalPrompt');
  const modalPromptEdit = document.getElementById('modalPromptEdit');
  const editBtn = document.getElementById('modalEditBtn');
  const saveBtn = document.getElementById('modalEditSaveBtn');
  const cancelBtn = document.getElementById('modalEditCancelBtn');
  const resetBtn = document.getElementById('modalResetBtn');
  
  if (enable) {
    modalPrompt.style.display = 'none';
    modalPromptEdit.style.display = 'block';
    editBtn.style.display = 'none';
    saveBtn.style.display = 'block';
    cancelBtn.style.display = 'block';
    if (hasEditedPrompt(currentModalPrompt.number)) {
      resetBtn.style.display = 'block';
    }
  } else {
    modalPrompt.style.display = 'block';
    modalPromptEdit.style.display = 'none';
    editBtn.style.display = 'block';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
    resetBtn.style.display = 'none';
  }
};

// ==================== FORMAT HANDLING ====================
let selectedFormat = 'plain'; // Default format

// Convert prompt to Markdown format (preserve structure)
const convertToMarkdown = (text) => {
  if (!text) return text;
  // Add markdown code block for better formatting
  return `\`\`\`\n${text}\n\`\`\``;
};

// Get prompt content based on selected format
const getFormattedPrompt = (text, format = 'plain') => {
  return format === 'markdown' ? convertToMarkdown(text) : text;
};

// ==================== VARIABLE HANDLING ====================
// Extract variables from prompt text
const extractVariables = (text) => {
  const regex = /{([A-Z_]+)}/g;
  const variables = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  return variables;
};

// Replace variables in prompt with user input values
const replaceVariables = (text, values) => {
  let result = text;
  Object.keys(values).forEach(key => {
    if (values[key]) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), values[key]);
    }
  });
  return result;
};

// Render variable input fields in modal
const renderVariableInputs = (variables) => {
  const container = document.getElementById('variablesContainer');
  const section = document.getElementById('variablesSection');
  
  if (!variables || variables.length === 0) {
    section.style.display = 'none';
    return;
  }
  
  section.style.display = 'block';
  container.innerHTML = '';
  variableValues = {};
  
  variables.forEach(varName => {
    const group = document.createElement('div');
    group.className = 'variable-input-group';
    
    const label = document.createElement('label');
    label.className = 'variable-label';
    label.textContent = `{${varName}}`;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'variable-input';
    input.placeholder = `Enter value for ${varName}...`;
    input.dataset.variable = varName;
    
    input.addEventListener('input', (e) => {
      variableValues[varName] = e.target.value;
      // Update preview in real-time
      updateModalPromptPreview();
    });
    
    group.appendChild(label);
    group.appendChild(input);
    container.appendChild(group);
  });
};

// Update modal prompt preview with variable replacements
const updateModalPromptPreview = () => {
  if (!currentModalPrompt) return;
  const previewElement = document.getElementById('modalPrompt');
  const markdownPreviewElement = document.getElementById('modalPromptPreview');
  const baseText = hasEditedPrompt(currentModalPrompt.number) ? getEditedPrompt(currentModalPrompt.number) : currentModalPrompt.prompt;
  const replacedText = replaceVariables(baseText, variableValues);
  
  previewElement.textContent = replacedText;
  
  if (CONFIG.ENABLE_MARKDOWN_PREVIEW && typeof marked !== 'undefined') {
    markdownPreviewElement.innerHTML = marked.parse(replacedText);
  }
};

// ==================== DATA LOGIC ====================
const getCategories = () => {
  const cats = [...new Set(PROMPTS.map(p => p.label).filter(Boolean))];
  return cats.sort();
};

const countByCategory = (category) => {
  return PROMPTS.filter(p => !p.disabled && p.label === category).length;
};

const filterPrompts = (query) => {
  const q = (query || '').toLowerCase().trim();

  // Step 0: Apply Collection Filter
  let collectionCandidates = PROMPTS;
  if (window.APP_CONFIG && APP_CONFIG.enableMultiPage) {
    const currentCollection = APP_CONFIG.collections.find(c => c.id === currentCollectionId);
    if (currentCollection) {
      if (currentCollection.isPersonal) {
        collectionCandidates = PROMPTS.filter(p => isFavorite(p.number));
      } else if (currentCollection.filter) {
        collectionCandidates = PROMPTS.filter(currentCollection.filter);
      }
    }
  }
  
  // Step 1: Apply category and favorites filters
  let candidates = collectionCandidates.filter(p => {
    if (p.disabled) return false;
    if (showFavoritesOnly && !isFavorite(p.number)) return false;
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(p.label);
    return categoryMatch;
  });
  
  // Step 2: Apply search with advanced scoring
  if (q) {
    filteredPrompts = searchEngine.search(q, candidates);
  } else {
    filteredPrompts = candidates;
  }

  updateStats();
  renderGrid(q);
};

// ==================== UI RENDERING ====================
const initQuickToolbar = () => {
  const toolbar = document.getElementById('quickToolbar');
  const snippetsContainer = document.getElementById('quickSnippets');
  
  if (!toolbar || !snippetsContainer || !CONFIG.ENABLE_QUICK_COPY_TOOLBAR) {
    if (toolbar) toolbar.style.display = 'none';
    return;
  }
  
  toolbar.style.display = 'flex';
  snippetsContainer.innerHTML = '';
  
  QUICK_SNIPPETS.forEach(snippet => {
    const btn = document.createElement('button');
    btn.className = 'snippet-btn';
    btn.textContent = snippet.label;
    btn.title = `Copy: ${snippet.content}`;
    btn.addEventListener('click', () => {
      copyToClipboard(snippet.content, btn);
    });
    snippetsContainer.appendChild(btn);
  });
};

const initCategoryChips = () => {
  if (!categoryChipsContainer) return;
  categoryChipsContainer.innerHTML = '';
  
  selectedCategories.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = 'category-chip active';
    const count = countByCategory(cat);
    chip.innerHTML = `${escapeHtml(cat)} <span class="category-chip-count">${count}</span>`;
    
    chip.addEventListener('click', () => {
      selectedCategories = selectedCategories.filter(c => c !== cat);
      initCategoryChips();
      renderSidebar();
      filterPrompts(searchInput.value);
    });
    
    categoryChipsContainer.appendChild(chip);
  });
};

const renderSidebar = () => {
  if (!categoryList) return;
  const categories = getCategories();
  categoryList.innerHTML = '';
  
  categories.forEach(cat => {
    const item = document.createElement('div');
    item.className = `sidebar-item ${selectedCategories.includes(cat) ? 'active' : ''}`;
    item.innerHTML = `
      <span class="sidebar-icon">📂</span>
      ${escapeHtml(cat)}
      <span class="count">${countByCategory(cat)}</span>
    `;
    item.onclick = () => {
      if (selectedCategories.includes(cat)) {
        selectedCategories = selectedCategories.filter(c => c !== cat);
      } else {
        selectedCategories.push(cat);
      }
      initCategoryChips();
      renderSidebar();
      filterPrompts(searchInput.value);
    };
    categoryList.appendChild(item);
  });

  // Update favorites item
  if (sidebarFavorites) {
    sidebarFavorites.className = `sidebar-item ${showFavoritesOnly ? 'active' : ''}`;
    sidebarFavorites.innerHTML = `
      <span class="sidebar-icon">⭐</span> Favorites
      <span class="count">${favorites.length}</span>
    `;
    sidebarFavorites.onclick = () => {
      showFavoritesOnly = !showFavoritesOnly;
      renderSidebar();
      filterPrompts(searchInput.value);
    };
  }

  // Update recent item
  if (sidebarRecent) {
    sidebarRecent.innerHTML = `
      <span class="sidebar-icon">🕒</span> Recently Used
      <span class="count">${recentPrompts.length}</span>
    `;
    sidebarRecent.onclick = () => {
      // Logic for showing recent prompts
      filterPromptsByRecent();
    };
  }
};

const filterPromptsByRecent = () => {
  filteredPrompts = PROMPTS.filter(p => recentPrompts.includes(p.number));
  // Sort by order in recentPrompts
  filteredPrompts.sort((a, b) => recentPrompts.indexOf(a.number) - recentPrompts.indexOf(b.number));
  renderGrid();
  updateStats();
};

const updateStats = () => {
  if (totalBadge) totalBadge.querySelector('strong').textContent = PROMPTS.length;
  if (activeBadge) activeBadge.querySelector('strong').textContent = PROMPTS.filter(p => !p.disabled).length;
  if (resultsBadge) resultsBadge.querySelector('strong').textContent = filteredPrompts.length;
  
  // Update favorite filter button UI
  if (favoriteFilterBtn) {
    if (showFavoritesOnly) {
      favoriteFilterBtn.classList.add('active');
      favoriteFilterBtn.querySelector('.star-icon').textContent = '⭐';
    } else {
      favoriteFilterBtn.classList.remove('active');
      favoriteFilterBtn.querySelector('.star-icon').textContent = '☆';
    }
  }
};

const renderCard = (p, query = '') => {
  const card = document.createElement('div');
  card.className = `prompt-card ${p.disabled ? 'disabled' : ''}`;
  
  const basePrompt = hasEditedPrompt(p.number) ? getEditedPrompt(p.number) : p.prompt;
  const previewText = (basePrompt || '').length > 150 
    ? basePrompt.substring(0, 150) + '...' 
    : basePrompt;

  // Show relevance score if search is active
  const relevanceHTML = query && p.searchScore !== undefined 
    ? `<div class="card-relevance" title="Relevance Score">🎯 ${Math.round(p.searchScore)}%</div>`
    : '';

  // Comparison Toggle
  const isCompared = comparisonList.includes(p.number);
  const compareBtnHTML = CONFIG.ENABLE_COMPARISON_MODE 
    ? `<button class="btn-compare-toggle ${isCompared ? 'active' : ''}" 
               data-compare-toggle="${p.number}" 
               title="${isCompared ? 'Remove from Comparison' : 'Add to Comparison'}">
         ${isCompared ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
       </button>`
    : '';

  card.innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-title">${escapeHtml(p.name)}</div>
      </div>
      <div class="card-header-actions">
        ${relevanceHTML}
        <div class="card-number">#${p.number}</div>
        ${compareBtnHTML}
      </div>
    </div>
    
    <div class="card-meta">
      <span class="card-label">${escapeHtml(p.label || 'General')}</span>
      <span>🕐 ${formatDate(p.updated_at)}</span>
    </div>

    <div class="card-section">
      <div class="card-section-title">📄 Description</div>
      <p class="card-desc">${highlightText(p.description, query)}</p>
    </div>

    <div class="card-section">
      <div class="card-section-title">💬 Prompt Preview</div>
      <pre class="prompt-content">${highlightText(previewText, query)}</pre>
    </div>

    <div class="card-footer">
      <button class="btn btn-copy" data-copy="${p.number}">📋 Copy</button>
      <button class="btn btn-view" data-view="${p.number}">👁️ View Full</button>
      <button class="btn-favorite ${isFavorite(p.number) ? 'active' : ''}" data-favorite="${p.number}" title="${isFavorite(p.number) ? 'Remove from Favorites' : 'Add to Favorites'}">${isFavorite(p.number) ? '⭐' : '☆'}</button>
    </div>
  `;
  return card;
};

const renderGrid = (query = '') => {
  if (!grid) return;
  grid.innerHTML = '';
  
  if (viewMode === 'list') {
    grid.classList.add('list-view');
  } else {
    grid.classList.remove('list-view');
  }
  
  if (filteredPrompts.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  filteredPrompts.forEach(p => {
    grid.appendChild(renderCard(p, query));
  });

  // Re-attach event listeners for buttons in grid
  grid.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const num = parseInt(e.currentTarget.dataset.copy);
      const prompt = PROMPTS.find(x => x.number === num);
      if (prompt) {
        const basePrompt = hasEditedPrompt(num) ? getEditedPrompt(num) : prompt.prompt;
        copyToClipboard(basePrompt, e.currentTarget, num);
      }
    });
  });

  grid.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const num = parseInt(e.currentTarget.dataset.view);
      const prompt = PROMPTS.find(x => x.number === num);
      if (prompt) openModal(prompt);
    });
  });

  grid.querySelectorAll('[data-favorite]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const num = parseInt(e.currentTarget.dataset.favorite);
      toggleFavorite(num);
      renderSidebar();
    });
  });

  grid.querySelectorAll('[data-compare-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const num = parseInt(e.currentTarget.dataset.compareToggle);
      toggleComparison(num);
    });
  });
};

const setViewMode = (mode) => {
  viewMode = mode;
  localStorage.setItem('prompt-library-view-mode', mode);
  
  if (mode === 'grid') {
    gridViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
  } else {
    gridViewBtn.classList.remove('active');
    listViewBtn.classList.add('active');
  }
  
  renderGrid(searchInput.value);
};

// ==================== COMPARISON LOGIC ====================
const toggleComparison = (num) => {
  if (comparisonList.includes(num)) {
    comparisonList = comparisonList.filter(n => n !== num);
  } else {
    if (comparisonList.length >= 3) {
      showToast('⚠️ Max 3 prompts for comparison');
      return;
    }
    comparisonList.push(num);
  }
  updateComparisonBar();
  renderGrid(searchInput.value);
};

const updateComparisonBar = () => {
  const bar = document.getElementById('comparisonBar');
  const count = document.getElementById('comparisonCount');
  
  if (comparisonList.length > 0 && CONFIG.ENABLE_COMPARISON_MODE) {
    bar.style.display = 'flex';
    count.textContent = comparisonList.length;
  } else {
    bar.style.display = 'none';
  }
};

const openComparisonModal = () => {
  const modal = document.getElementById('comparisonModal');
  const grid = document.getElementById('comparisonGrid');
  
  grid.innerHTML = '';
  comparisonList.forEach(num => {
    const p = PROMPTS.find(x => x.number === num);
    if (!p) return;
    
    const col = document.createElement('div');
    col.className = 'comparison-col';
    col.innerHTML = `
      <div class="comparison-col-header">
        <div class="comparison-col-title">${escapeHtml(p.name)}</div>
        <div class="card-label">${escapeHtml(p.label)}</div>
      </div>
      <div>
        <div class="comparison-section-title">📝 Prompt Content</div>
        <div class="comparison-content">${escapeHtml(p.prompt.substring(0, 300))}...</div>
      </div>
      <div>
        <div class="comparison-section-title">💡 When to use</div>
        <div class="comparison-content">${escapeHtml(p.when_to_use || 'N/A')}</div>
      </div>
      <div>
        <div class="comparison-section-title">⚙️ How to use</div>
        <div class="comparison-content">${escapeHtml(p.how_to_use || 'N/A')}</div>
      </div>
    `;
    grid.appendChild(col);
  });
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

const closeComparisonModal = () => {
  const modal = document.getElementById('comparisonModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
};

// ==================== MODAL ====================
const openModal = (p) => {
  currentModalPrompt = p;
  variableValues = {};
  selectedFormat = 'plain'; // Reset format to plain
  document.getElementById('modalTitle').textContent = p.name;
  document.getElementById('modalMeta').innerHTML = `
    <span class="card-label">${escapeHtml(p.label)}</span>
    <span>#${p.number}</span>
    <span>🕐 Updated: ${formatDate(p.updated_at)}</span>
  `;
  // Display edited or original prompt
  const displayPrompt = hasEditedPrompt(p.number) ? getEditedPrompt(p.number) : p.prompt;
  document.getElementById('modalPrompt').textContent = displayPrompt;
  document.getElementById('modalPromptEdit').value = displayPrompt;
  document.getElementById('modalWhen').textContent = p.when_to_use || 'N/A';
  document.getElementById('modalHow').textContent = p.how_to_use || 'N/A';
  
  // Markdown Preview Logic
  const modalTabs = document.getElementById('modalTabs');
  const modalPromptPreview = document.getElementById('modalPromptPreview');
  const modalPrompt = document.getElementById('modalPrompt');
  
  if (CONFIG.ENABLE_MARKDOWN_PREVIEW && typeof marked !== 'undefined') {
    modalTabs.style.display = 'flex';
    // Reset to Raw tab
    modalTabs.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    modalTabs.querySelector('[data-tab="raw"]').classList.add('active');
    modalPrompt.style.display = 'block';
    modalPromptPreview.style.display = 'none';
    modalPromptPreview.innerHTML = marked.parse(displayPrompt);
  } else {
    modalTabs.style.display = 'none';
    modalPrompt.style.display = 'block';
    modalPromptPreview.style.display = 'none';
  }
  
  // Extract and render variable inputs
  const variables = extractVariables(displayPrompt);
  renderVariableInputs(variables);
  
  // Hide format selector as requested
  const formatSelector = document.getElementById('formatSelector');
  if (formatSelector) {
    formatSelector.style.display = 'none';
  }
  
  // Reset edit mode
  toggleEditMode(false);
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

const closeModal = () => {
  modal.classList.remove('active');
  document.body.style.overflow = '';
  currentModalPrompt = null;
  variableValues = {};
};

// ==================== EVENTS ====================
// Tab Switching Logic
document.querySelectorAll('.modal-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    const modalPrompt = document.getElementById('modalPrompt');
    const modalPromptPreview = document.getElementById('modalPromptPreview');
    
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    if (target === 'preview') {
      modalPrompt.style.display = 'none';
      modalPromptPreview.style.display = 'block';
    } else {
      modalPrompt.style.display = 'block';
      modalPromptPreview.style.display = 'none';
    }
  });
});
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filterPrompts(e.target.value);
    }, 300);
  });
}

if (clearAllFiltersBtn) {
  clearAllFiltersBtn.addEventListener('click', () => {
    selectedCategories = [];
    showFavoritesOnly = false;
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    filterPrompts('');
    if (searchInput) searchInput.focus();
  });
}

if (favoriteFilterBtn) {
  favoriteFilterBtn.addEventListener('click', () => {
    showFavoritesOnly = !showFavoritesOnly;
    filterPrompts(searchInput.value);
  });
}

if (modalClose) modalClose.addEventListener('click', closeModal);
const compModalClose = document.getElementById('comparisonModalClose');
if (compModalClose) compModalClose.addEventListener('click', closeComparisonModal);

const compareNowBtn = document.getElementById('compareNowBtn');
if (compareNowBtn) compareNowBtn.addEventListener('click', openComparisonModal);

const clearCompareBtn = document.getElementById('clearCompareBtn');
if (clearCompareBtn) clearCompareBtn.addEventListener('click', () => {
  comparisonList = [];
  updateComparisonBar();
  renderGrid(searchInput.value);
});
if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (e) => {
  // Esc to close modal
  if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
    closeModal();
  }
  
  // '/' to focus search (unless already in an input)
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    if (searchInput) searchInput.focus();
  }
  
  // Ctrl+C or Cmd+C in modal to copy prompt
  if ((e.ctrlKey || e.metaKey) && e.key === 'c' && modal && modal.classList.contains('active')) {
    const copyBtn = document.getElementById('modalCopy');
    if (copyBtn && currentModalPrompt) {
      e.preventDefault();
      const basePrompt = hasEditedPrompt(currentModalPrompt.number) ? getEditedPrompt(currentModalPrompt.number) : currentModalPrompt.prompt;
      const finalPrompt = replaceVariables(basePrompt, variableValues);
      copyToClipboard(finalPrompt, copyBtn);
    }
  }
});

// Format selector buttons (kept for logic but hidden in UI)
const formatBtns = document.querySelectorAll('.format-btn');
formatBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    formatBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedFormat = btn.dataset.format;
  });
});

// Copy button - with variable replacement and format
const modalCopyBtn = document.getElementById('modalCopy');
if (modalCopyBtn) {
  modalCopyBtn.addEventListener('click', () => {
    if (currentModalPrompt) {
      // Copy with variable replacements and format
      const basePrompt = hasEditedPrompt(currentModalPrompt.number) ? getEditedPrompt(currentModalPrompt.number) : currentModalPrompt.prompt;
      let finalPrompt = replaceVariables(basePrompt, variableValues);
      finalPrompt = getFormattedPrompt(finalPrompt, selectedFormat);
      copyToClipboard(finalPrompt, modalCopyBtn);
    }
  });
}

// Download button
const modalDownloadBtn = document.getElementById('modalDownload');
if (modalDownloadBtn) {
  modalDownloadBtn.addEventListener('click', () => {
    if (currentModalPrompt) {
      const p = currentModalPrompt;
      const basePrompt = hasEditedPrompt(p.number) ? getEditedPrompt(p.number) : p.prompt;
      const finalPrompt = replaceVariables(basePrompt, variableValues);
      const content = `# ${p.name}\nLabel: ${p.label}\n\n## When to use\n${p.when_to_use}\n\n## How to use\n${p.how_to_use}\n\n## Prompt\n${finalPrompt}`;
      const blob = new Blob([content], {type: 'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-${p.number}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
}

// Share button - Copy shareable link
const modalShareBtn = document.getElementById('modalShare');
if (modalShareBtn) {
  modalShareBtn.addEventListener('click', () => {
    if (currentModalPrompt) {
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${baseUrl}?id=${currentModalPrompt.number}`;
      copyToClipboard(shareUrl, modalShareBtn);
      showToast('✓ Share link copied!');
    }
  });
}

// Edit button handlers
const modalEditBtn = document.getElementById('modalEditBtn');
if (modalEditBtn) {
  modalEditBtn.addEventListener('click', () => {
    toggleEditMode(true);
  });
}

const modalEditSaveBtn = document.getElementById('modalEditSaveBtn');
if (modalEditSaveBtn) {
  modalEditSaveBtn.addEventListener('click', () => {
    if (currentModalPrompt) {
      const newContent = document.getElementById('modalPromptEdit').value;
      saveEditedPrompt(currentModalPrompt.number, newContent);
      
      // Update modal display
      document.getElementById('modalPrompt').textContent = newContent;
      
      // Re-extract variables for the new content
      const variables = extractVariables(newContent);
      renderVariableInputs(variables);
      
      // Update grid to show edited preview
      filterPrompts(searchInput.value);
      
      toggleEditMode(false);
      showToast('✓ Prompt updated!');
    }
  });
}

const modalEditCancelBtn = document.getElementById('modalEditCancelBtn');
if (modalEditCancelBtn) {
  modalEditCancelBtn.addEventListener('click', () => {
    toggleEditMode(false);
  });
}

const modalResetBtn = document.getElementById('modalResetBtn');
if (modalResetBtn) {
  modalResetBtn.addEventListener('click', () => {
    if (currentModalPrompt) {
      deleteEditedPrompt(currentModalPrompt.number);
      document.getElementById('modalPrompt').textContent = currentModalPrompt.prompt;
      document.getElementById('modalPromptEdit').value = currentModalPrompt.prompt;
      
      // Re-extract variables for the original content
      const variables = extractVariables(currentModalPrompt.prompt);
      renderVariableInputs(variables);
      
      // Update grid
      filterPrompts(searchInput.value);
      
      toggleEditMode(false);
      showToast('✓ Prompt reset to original!');
    }
  });
}

// ==================== URL PARAMS HANDLING ====================
const handleUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  const promptId = params.get('id');
  
  if (promptId !== null) {
    const prompt = PROMPTS.find(p => p.number === parseInt(promptId));
    if (prompt) {
      // Delay to ensure DOM is ready
      setTimeout(() => {
        openModal(prompt);
      }, 100);
    }
  }
};

// ==================== KEYBOARD SHORTCUTS HINT ====================
const showKeyboardHint = () => {
  const hint = document.createElement('div');
  hint.id = 'keyboard-hint';
  hint.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: rgba(30, 41, 59, 0.9);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 0.85rem;
    z-index: 999;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s;
  `;
  hint.innerHTML = `⌨️ <strong>Keyboard Shortcuts:</strong> <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px; margin: 0 4px;">/</code> Search | <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px; margin: 0 4px;">Esc</code> Close | <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px; margin: 0 4px;">Ctrl+C</code> Copy`;
  hint.addEventListener('click', () => hint.remove());
  document.body.appendChild(hint);
  setTimeout(() => hint.remove(), 8000);
};

// ==================== NAVIGATION & COLLECTIONS ====================
const initNavbar = () => {
  if (!window.APP_CONFIG || !APP_CONFIG.enableMultiPage) return;
  
  const navbar = document.getElementById('navbar');
  const menu = document.getElementById('navbarMenu');
  if (!navbar || !menu) return;
  
  navbar.style.display = 'block';
  menu.innerHTML = '';
  
  APP_CONFIG.collections.forEach(col => {
    const item = document.createElement('div');
    item.className = `navbar-item ${col.id === currentCollectionId ? 'active' : ''}`;
    item.innerHTML = `<span class="navbar-icon">${col.icon}</span> ${col.name}`;
    item.title = col.description;
    
    item.addEventListener('click', () => {
      document.querySelectorAll('.navbar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      currentCollectionId = col.id;
      
      // Reset other filters when switching collections for clarity
      selectedCategories = [];
      if (searchInput) searchInput.value = '';
      
      initCategoryChips();
      filterPrompts('');
      
      // Update header title/desc based on collection
      const headerTitle = document.querySelector('header h1');
      const headerDesc = document.querySelector('header p');
      if (headerTitle) headerTitle.textContent = `${col.icon} ${col.name}`;
      if (headerDesc) headerDesc.textContent = col.description;
    });
    
    menu.appendChild(item);
  });
};

// ==================== INITIALIZATION ====================
window.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initQuickToolbar();
  initCategoryChips();
  renderSidebar();
  
  // Set initial view mode
  setViewMode(viewMode);
  
  filterPrompts(''); // Khởi tạo hiển thị ban đầu
  handleUrlParams(); // Handle share links
  if (searchInput) searchInput.focus();
  
  // View Toggle Listeners
  if (gridViewBtn) gridViewBtn.onclick = () => setViewMode('grid');
  if (listViewBtn) listViewBtn.onclick = () => setViewMode('list');

  // Show keyboard shortcuts hint on first visit
  if (!localStorage.getItem('prompt-library-hint-shown')) {
    setTimeout(() => showKeyboardHint(), 1500);
    localStorage.setItem('prompt-library-hint-shown', 'true');
  }
});

// ==================== DRAG TO SCROLL ====================
const initDragToScroll = () => {
  const container = document.getElementById('categoryChipsContainer');
  if (!container) return;

  let isDown = false;
  let startX;
  let scrollLeft;

  container.addEventListener('mousedown', (e) => {
    isDown = true;
    container.classList.add('active');
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  container.addEventListener('mouseleave', () => {
    isDown = false;
    container.classList.remove('active');
  });

  container.addEventListener('mouseup', () => {
    isDown = false;
    container.classList.remove('active');
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed
    container.scrollLeft = scrollLeft - walk;
  });
};

// Add to DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  initDragToScroll();
});

// Back to Top Logic
const backToTopBtn = document.getElementById('backToTop');
if (backToTopBtn) {
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      backToTopBtn.classList.add('show');
    } else {
      backToTopBtn.classList.remove('show');
    }
  });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
