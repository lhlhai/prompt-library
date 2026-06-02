// app.js - Premium Prompt Library Logic
// Đồng bộ với index_2.html và style_2.css

// ==================== 1. CONFIG & FALLBACKS ====================
const CONFIG = {
  ENABLE_COMPARISON_MODE: true,
};

// Fallback nếu searchEngine chưa có (từ file cũ)
const searchEngine = window.searchEngine || {
  search: (query, list) => {
    const q = query.toLowerCase();
    return list.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.prompt && p.prompt.toLowerCase().includes(q)) ||
      (p.label && p.label.toLowerCase().includes(q))
    ).map(p => ({ ...p, searchScore: 100 }));
  }
};

// Fallback PROMPTS
if (typeof PROMPTS === 'undefined') {
  console.warn('PROMPTS not found. Init empty.');
  window.PROMPTS = [];
}

// ==================== 2. STATE MANAGEMENT ====================
let filteredPrompts = [...PROMPTS];
let selectedCategories = [];
let currentModalPrompt = null;
let searchTimeout;
let variableValues = {};
let showFavoritesOnly = false;
let comparisonList = [];
let viewMode = localStorage.getItem('prompt-library-view-mode') || 'grid'; // 'grid' or 'list'
let recentPrompts = JSON.parse(localStorage.getItem('prompt-library-recent')) || [];
let favorites = JSON.parse(localStorage.getItem('prompt-library-favorites')) || [];
let editedPrompts = JSON.parse(localStorage.getItem('prompt-library-edited')) || {};
let isEditMode = false;
let selectedFormat = 'plain';

// ==================== 3. DOM ELEMENTS ====================
const dom = {
  grid: document.getElementById('promptsGrid'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  totalCount: document.getElementById('totalCount'),
  activeCount: document.getElementById('activeCount'),
  resultsCount: document.getElementById('resultsCount'),
  favoritesCount: document.getElementById('favoritesCount'),
  modal: document.getElementById('promptModal'),
  modalClose: document.getElementById('modalClose'),
  toast: document.getElementById('toast'),
  categoryList: document.getElementById('categoryList'),
  clearAllFilters: document.getElementById('clearAllFilters'),
  themeToggle: document.getElementById('themeToggle'),
  comparisonBar: document.getElementById('comparisonBar'),
  compareCount: document.getElementById('compareCount'),
  activeFiltersList: document.getElementById('activeFiltersList'),
  viewGridBtn: document.getElementById('viewGrid'),
  viewListBtn: document.getElementById('viewList'),
  backToTop: document.getElementById('backToTop'),
};

// ==================== 4. HELPER FUNCTIONS ====================
const formatDate = (iso) => {
  if (!iso) return 'N/A';
  try { return new Date(iso).toLocaleDateString('vi-VN'); } catch (e) { return iso; }
};

const escapeHtml = (str) => {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const highlightText = (text, query) => {
  if (!query || !text) return escapeHtml(text || '');
  const escapedText = escapeHtml(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
};

const showToast = (msg, type = 'success') => {
  if (!dom.toast) return;
  dom.toast.textContent = msg;
  dom.toast.className = `toast show ${type}`;
  setTimeout(() => dom.toast.classList.remove('show'), 3000);
};

const copyToClipboard = async (text, btn, promptNumber) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast('✓ Copied to clipboard!');
    if (promptNumber !== undefined) addToRecent(promptNumber);

    if (btn) {
      const originalHtml = btn.innerHTML;
      btn.classList.add('copied');
      btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = originalHtml;
      }, 2000);
    }
  } catch (err) {
    showToast('✗ Copy failed', 'error');
  }
};

const addToRecent = (num) => {
  recentPrompts = [num, ...recentPrompts.filter(n => n !== num)].slice(0, 10);
  localStorage.setItem('prompt-library-recent', JSON.stringify(recentPrompts));
};

// ==================== 5. FAVORITES & EDITING ====================
const isFavorite = (num) => favorites.includes(num);

const toggleFavorite = (num) => {
  if (isFavorite(num)) favorites = favorites.filter(n => n !== num);
  else favorites.push(num);
  localStorage.setItem('prompt-library-favorites', JSON.stringify(favorites));
  updateStats();
  renderGrid(dom.searchInput?.value || '');
};

const getEditedPrompt = (num) => editedPrompts[num];
const hasEditedPrompt = (num) => num in editedPrompts;

const saveEditedPrompt = (num, newContent) => {
  editedPrompts[num] = newContent;
  localStorage.setItem('prompt-library-edited', JSON.stringify(editedPrompts));
  showToast('Changes saved locally');
  if (currentModalPrompt) {
    const contentEl = document.getElementById('modalPromptContent');
    if (contentEl) contentEl.textContent = newContent;
    updateModalPromptPreview();
  }
};

const resetEdit = () => {
  if (!currentModalPrompt) return;
  delete editedPrompts[currentModalPrompt.number];
  localStorage.setItem('prompt-library-edited', JSON.stringify(editedPrompts));
  showToast('Reset to original');
  if (currentModalPrompt) {
    const contentEl = document.getElementById('modalPromptContent');
    if (contentEl) contentEl.textContent = currentModalPrompt.prompt;
    updateModalPromptPreview();
  }
};

// ==================== 6. VARIABLE HANDLING ====================
const extractVariables = (text) => {
  const regex = /\{\{([A-Z_]+)\}\}/g;
  const altRegex = /\{([A-Z_]+)\}/g;
  const variables = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) variables.add(match[1]);
  while ((match = altRegex.exec(text)) !== null) variables.add(match[1]);
  return Array.from(variables);
};

const replaceVariables = (text, values) => {
  let result = text;
  Object.keys(values).forEach(key => {
    if (values[key]) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), values[key]);
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), values[key]);
    }
  });
  return result;
};

// ==================== 7. FILTER LOGIC ====================
const getCategories = () => [...new Set(PROMPTS.map(p => p.label).filter(Boolean))].sort();
const countByCategory = (cat) => PROMPTS.filter(p => !p.disabled && p.label === cat).length;

const filterPrompts = (query) => {
  const q = (query || '').toLowerCase().trim();
  
  let candidates = PROMPTS.filter(p => {
    if (p.disabled) return false;
    if (showFavoritesOnly && !isFavorite(p.number)) return false;
    if (selectedCategories.length > 0 && !selectedCategories.includes(p.label)) return false;
    return true;
  });

  if (q) {
    filteredPrompts = searchEngine.search(q, candidates);
  } else {
    filteredPrompts = candidates;
  }

  updateStats();
  renderGrid(q);
  renderActiveFilters();
};

// ==================== 8. UI RENDERING ====================
const updateStats = () => {
  if (dom.totalCount) dom.totalCount.textContent = PROMPTS.length;
  if (dom.activeCount) dom.activeCount.textContent = PROMPTS.filter(p => !p.disabled).length;
  if (dom.resultsCount) dom.resultsCount.textContent = filteredPrompts.length;
  if (dom.favoritesCount) dom.favoritesCount.textContent = favorites.length;
};

const renderSidebar = () => {
  if (!dom.categoryList) return;
  const categories = getCategories();

  dom.categoryList.innerHTML = `
    <div class="category-item ${selectedCategories.length === 0 ? 'active' : ''}" data-category="all">
      <span><i class="fas fa-th-large"></i> All Categories</span>
      <span class="category-count">${PROMPTS.filter(p => !p.disabled).length}</span>
    </div>
  ` + categories.map(cat => `
    <div class="category-item ${selectedCategories.includes(cat) ? 'active' : ''}" data-category="${cat}">
      <span><i class="fas fa-folder"></i> ${escapeHtml(cat)}</span>
      <span class="category-count">${countByCategory(cat)}</span>
    </div>
  `).join('');

  dom.categoryList.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', () => {
      const cat = item.dataset.category;
      if (cat === 'all') selectedCategories = [];
      else {
        if (selectedCategories.includes(cat)) selectedCategories = selectedCategories.filter(c => c !== cat);
        else selectedCategories.push(cat);
      }
      renderSidebar();
      filterPrompts(dom.searchInput?.value || '');
    });
  });
};

const renderActiveFilters = () => {
  if (!dom.activeFiltersList) return;
  const filters = [];
  if (showFavoritesOnly) filters.push({ type: 'favorite', label: 'Favorites' });
  selectedCategories.forEach(cat => filters.push({ type: 'category', label: cat }));

  if (filters.length === 0) {
    dom.activeFiltersList.innerHTML = '<span style="color: var(--text-muted); font-size: 0.875rem;">None</span>';
    return;
  }

  dom.activeFiltersList.innerHTML = filters.map(f => `
    <span class="filter-tag">
      <i class="fas fa-${f.type === 'favorite' ? 'star' : 'folder'}"></i> ${f.label}
      <button onclick="app.removeFilter('${f.type}', '${f.label}')"><i class="fas fa-times"></i></button>
    </span>
  `).join('');
};

const renderCard = (p, query = '') => {
  const basePrompt = hasEditedPrompt(p.number) ? getEditedPrompt(p.number) : p.prompt;
  const previewText = (basePrompt || '').length > 120 ? basePrompt.substring(0, 120) + '...' : basePrompt;
  const isCompared = comparisonList.includes(p.number);

  return `
    <article class="prompt-card-premium">
      <div class="card-header-premium">
        <div class="card-title-wrapper">
          <h3 class="card-title-premium">${highlightText(p.name, query)}</h3>
          <div class="card-meta-premium">
            <span class="card-meta-item"><i class="fas fa-tag"></i> <span class="card-badge">${escapeHtml(p.label || 'General')}</span></span>
            <span class="card-meta-item"><i class="fas fa-calendar"></i> ${formatDate(p.updated_at)}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="card-action-btn favorite ${isFavorite(p.number) ? 'active' : ''}" onclick="app.toggleFavorite(${p.number})" title="Favorite"><i class="fas fa-star"></i></button>
          ${CONFIG.ENABLE_COMPARISON_MODE ? `<button class="card-action-btn compare ${isCompared ? 'active' : ''}" onclick="app.toggleComparison(${p.number})" title="Compare"><i class="fas fa-columns"></i></button>` : ''}
        </div>
      </div>
      <div class="card-body-premium">
        <p class="card-description">${highlightText(p.description, query)}</p>
        <div class="card-preview">${highlightText(previewText, query)}</div>
      </div>
      <div class="card-footer-premium">
        <button class="btn-premium btn-primary-premium" onclick="app.copyPrompt(${p.number}, this)"><i class="fas fa-copy"></i> Copy</button>
        <button class="btn-premium btn-secondary-premium" onclick="app.openModal(${p.number})"><i class="fas fa-eye"></i> View</button>
      </div>
    </article>
  `;
};

const renderGrid = (query = '') => {
  if (!dom.grid) return;

  // Apply View Mode Class
  if (viewMode === 'list') {
    dom.grid.classList.add('list-view');
  } else {
    dom.grid.classList.remove('list-view');
  }

  if (filteredPrompts.length === 0) {
    dom.grid.style.display = 'none';
    if (dom.emptyState) dom.emptyState.style.display = 'block';
    return;
  }

  dom.grid.style.display = 'grid';
  if (dom.emptyState) dom.emptyState.style.display = 'none';

  dom.grid.innerHTML = filteredPrompts.map((p, i) => 
    renderCard(p, query).replace('<article', `<article style="animation-delay: ${i * 0.05}s"`)
  ).join('');
};

// ==================== 9. MODAL LOGIC ====================
const renderVariableInputs = (variables) => {
  const modalBody = dom.modal?.querySelector('.modal-body');
  if (!modalBody) return;

  let varSection = modalBody.querySelector('.variables-section-premium');
  
  if (variables.length > 0) {
    if (!varSection) {
      varSection = document.createElement('div');
      varSection.className = 'variables-section-premium';
      modalBody.insertBefore(varSection, modalBody.firstChild);
    }
    
    varSection.innerHTML = `
      <h4 style="font-size: 0.875rem; font-weight: 700; margin-bottom: 12px; color: var(--primary);"><i class="fas fa-sliders-h"></i> Variables</h4>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${variables.map(v => `
          <div>
            <label style="font-family: 'JetBrains Mono'; font-size: 0.85rem; font-weight: 600; color: var(--primary);">{${v}}</label>
            <input type="text" class="variable-input-premium" data-var="${v}" placeholder="Enter value for ${v}..." value="${variableValues[v] || ''}">
          </div>
        `).join('')}
      </div>
    `;

    // Re-attach events for new inputs
    varSection.querySelectorAll('.variable-input-premium').forEach(input => {
      input.addEventListener('input', (e) => {
        variableValues[e.target.dataset.var] = e.target.value;
        updateModalPromptPreview();
      });
    });
  } else if (varSection) {
    varSection.remove();
  }
};

const updateModalPromptPreview = () => {
  if (!currentModalPrompt) return;
  const baseText = hasEditedPrompt(currentModalPrompt.number) ? getEditedPrompt(currentModalPrompt.number) : currentModalPrompt.prompt;
  const replacedText = replaceVariables(baseText, variableValues);

  const rawEl = document.getElementById('modalPromptContent');
  if (rawEl) rawEl.textContent = replacedText;

  const previewEl = document.getElementById('markdownPreview');
  if (previewEl && window.marked) {
    previewEl.innerHTML = marked.parse(replacedText);
  } else if (previewEl) {
    previewEl.textContent = replacedText;
  }
};

const openModal = (num) => {
  const p = PROMPTS.find(x => x.number === num);
  if (!p || !dom.modal) return;

  currentModalPrompt = p;
  variableValues = {};
  isEditMode = false;
  document.getElementById('editSection').style.display = 'none';
  document.getElementById('btnEditToggle').innerHTML = '<i class="fas fa-edit"></i> Edit';

  document.getElementById('modalTitle').textContent = p.name;
  document.getElementById('modalMeta').innerHTML = `
    <span><i class="fas fa-tag"></i> ${escapeHtml(p.label)}</span>
    <span><i class="fas fa-hashtag"></i> #${p.number}</span>
    <span><i class="fas fa-clock"></i> ${formatDate(p.updated_at)}</span>
  `;

  const displayPrompt = hasEditedPrompt(p.number) ? getEditedPrompt(p.number) : p.prompt;
  
  // Setup Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  const switchTab = (tabName) => {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${tabName}`));
    if (tabName === 'preview') updateModalPromptPreview();
  };

  tabBtns.forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });

  // Initial Render
  const rawEl = document.getElementById('modalPromptContent');
  if (rawEl) rawEl.textContent = displayPrompt;
  
  renderVariableInputs(extractVariables(displayPrompt));
  updateModalPromptPreview(); // Init preview

  // Copy Button
  const copyBtn = document.getElementById('copyFullPrompt');
  if (copyBtn) {
    copyBtn.onclick = () => {
      const baseText = hasEditedPrompt(p.number) ? getEditedPrompt(p.number) : p.prompt;
      const finalText = replaceVariables(baseText, variableValues);
      const formatted = selectedFormat === 'markdown' ? `\`\`\`\n${finalText}\n\`\`\`` : finalText;
      copyToClipboard(formatted, copyBtn, num);
    };
  }

  dom.modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

const closeModal = () => {
  if (!dom.modal) return;
  dom.modal.classList.remove('active');
  document.body.style.overflow = '';
  currentModalPrompt = null;
};

// ==================== 10. COMPARISON LOGIC ====================
const toggleComparison = (num) => {
  if (comparisonList.includes(num)) {
    comparisonList = comparisonList.filter(n => n !== num);
  } else {
    if (comparisonList.length >= 3) {
      showToast('⚠️ Max 3 prompts', 'error');
      return;
    }
    comparisonList.push(num);
  }
  updateComparisonBar();
  renderGrid(dom.searchInput?.value || '');
};

const updateComparisonBar = () => {
  if (!dom.comparisonBar) return;
  if (comparisonList.length > 0) {
    dom.comparisonBar.style.display = 'flex';
    setTimeout(() => dom.comparisonBar.classList.add('show'), 10);
    if (dom.compareCount) dom.compareCount.textContent = comparisonList.length;
  } else {
    dom.comparisonBar.classList.remove('show');
    setTimeout(() => { dom.comparisonBar.style.display = 'none'; }, 300);
  }
};

const openComparisonModal = () => {
  const modal = document.getElementById('comparisonModal');
  const content = document.getElementById('comparisonContent');
  if (!modal || !content) return;

  const items = comparisonList.map(num => {
    const p = PROMPTS.find(x => x.number === num);
    if (!p) return '';
    const text = hasEditedPrompt(num) ? getEditedPrompt(num) : p.prompt;
    return `
      <div style="background: var(--bg); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
        <h4 style="color: var(--primary); margin-bottom: 8px;">${escapeHtml(p.name)}</h4>
        <pre style="white-space: pre-wrap; font-size: 0.85rem; color: var(--text);">${escapeHtml(text)}</pre>
      </div>
    `;
  }).join('');

  content.innerHTML = items;
  modal.classList.add('active');
};

const closeComparisonModal = () => {
  document.getElementById('comparisonModal').classList.remove('active');
};

const clearComparison = () => {
  comparisonList = [];
  updateComparisonBar();
  renderGrid();
};

// ==================== 11. EXPORT & SHARE ====================
const exportTxt = () => {
  if (!currentModalPrompt) return;
  const text = replaceVariables(hasEditedPrompt(currentModalPrompt.number) ? getEditedPrompt(currentModalPrompt.number) : currentModalPrompt.prompt, variableValues);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompt-${currentModalPrompt.number}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded .txt');
};

const exportCsv = () => {
  if (!currentModalPrompt) return;
  const p = currentModalPrompt;
  const text = replaceVariables(hasEditedPrompt(p.number) ? getEditedPrompt(p.number) : p.prompt, variableValues);
  const csvContent = `ID,Name,Label,Prompt\n"${p.number}","${p.name.replace(/"/g, '""')}","${p.label}","${text.replace(/"/g, '""')}"`;
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompt-${p.number}.csv`;
  a.click();
  showToast('Exported CSV');
};

const shareLink = () => {
  if (!currentModalPrompt) return;
  const url = `${window.location.origin}${window.location.pathname}?id=${currentModalPrompt.number}`;
  navigator.clipboard.writeText(url);
  showToast('Link copied to clipboard!');
};

// ==================== 12. EDIT MODE ====================
const toggleEditMode = () => {
  if (!currentModalPrompt) return;
  isEditMode = !isEditMode;
  const section = document.getElementById('editSection');
  const btn = document.getElementById('btnEditToggle');
  
  if (isEditMode) {
    section.style.display = 'block';
    btn.innerHTML = '<i class="fas fa-times"></i> Cancel';
    const textarea = document.getElementById('editTextarea');
    const baseText = hasEditedPrompt(currentModalPrompt.number) ? getEditedPrompt(currentModalPrompt.number) : currentModalPrompt.prompt;
    textarea.value = baseText;
  } else {
    section.style.display = 'none';
    btn.innerHTML = '<i class="fas fa-edit"></i> Edit';
  }
};

const saveEdit = () => {
  if (!currentModalPrompt) return;
  const val = document.getElementById('editTextarea').value;
  saveEditedPrompt(currentModalPrompt.number, val);
  toggleEditMode();
};

const cancelEdit = () => {
  toggleEditMode();
};

const resetEdit = () => {
  if(confirm('Reset to original version?')) {
    resetEdit(); // Call helper
  }
};

// ==================== 13. MAIN APP OBJECT ====================
const app = {
  toggleFavorite,
  toggleComparison,
  openModal,
  closeModal,
  removeFilter: (type, label) => {
    if (type === 'favorite') showFavoritesOnly = false;
    if (type === 'category') selectedCategories = selectedCategories.filter(c => c !== label);
    filterPrompts(dom.searchInput?.value || '');
  },
  copyPrompt: (num, btn) => {
    const p = PROMPTS.find(x => x.number === num);
    if (p) {
      const text = hasEditedPrompt(num) ? getEditedPrompt(num) : p.prompt;
      copyToClipboard(text, btn, num);
    }
  },
  clearAllFilters: () => {
    selectedCategories = [];
    showFavoritesOnly = false;
    if (dom.searchInput) dom.searchInput.value = '';
    filterPrompts('');
    showToast('Filters cleared');
  },
  toggleTheme: () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    const icon = dom.themeToggle?.querySelector('i');
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  },
  clearComparison,
  openComparisonModal,
  closeComparisonModal,
  exportTxt,
  exportCsv,
  shareLink,
  toggleEditMode,
  saveEdit,
  cancelEdit,
  resetEdit
};

window.app = app;

// ==================== 14. INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  // Search
  if (dom.searchInput) {
    dom.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => filterPrompts(e.target.value), 300);
    });
  }

  // Filter Chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const filter = e.currentTarget.dataset.filter;
      
      if (filter === 'favorites') {
        showFavoritesOnly = true;
        selectedCategories = [];
      } else if (filter === 'recent') {
        showFavoritesOnly = false;
        selectedCategories = [];
        filteredPrompts = PROMPTS.filter(p => recentPrompts.includes(p.number))
          .sort((a, b) => recentPrompts.indexOf(a.number) - recentPrompts.indexOf(b.number));
        updateStats();
        renderGrid();
        return;
      } else {
        showFavoritesOnly = false;
        selectedCategories = [];
      }
      filterPrompts('');
    });
  });

  // View Toggle
  if (dom.viewGridBtn && dom.viewListBtn) {
    const setView = (mode) => {
      viewMode = mode;
      localStorage.setItem('prompt-library-view-mode', mode);
      dom.viewGridBtn.classList.toggle('active', mode === 'grid');
      dom.viewListBtn.classList.toggle('active', mode === 'list');
      renderGrid(dom.searchInput?.value || '');
    };
    dom.viewGridBtn.addEventListener('click', () => setView('grid'));
    dom.viewListBtn.addEventListener('click', () => setView('list'));
    // Init
    setView(viewMode);
  }

  // Events
  if (dom.clearAllFilters) dom.clearAllFilters.addEventListener('click', app.clearAllFilters);
  if (dom.themeToggle) dom.themeToggle.addEventListener('click', app.toggleTheme);
  if (dom.modalClose) dom.modalClose.addEventListener('click', closeModal);
  if (dom.modal) dom.modal.addEventListener('click', (e) => { if (e.target === dom.modal) closeModal(); });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); dom.searchInput?.focus(); }
    if (e.key === 'Escape') { closeModal(); closeComparisonModal(); }
  });

  // Scroll Back to Top
  window.addEventListener('scroll', () => {
    if (dom.backToTop) {
      if (window.scrollY > 300) dom.backToTop.classList.add('visible');
      else dom.backToTop.classList.remove('visible');
    }
  });

  // Theme Init
  const savedTheme = localStorage.getItem('darkMode');
  if (savedTheme === 'true' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-mode');
    const icon = dom.themeToggle?.querySelector('i');
    if (icon) icon.className = 'fas fa-sun';
  }

  // URL Param Check (Share Link)
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id');
  if (idParam) {
    const num = parseInt(idParam);
    if (PROMPTS.find(p => p.number === num)) {
      setTimeout(() => app.openModal(num), 500);
    }
  }

  // Initial Render
  renderSidebar();
  updateStats();
  filterPrompts('');
});
