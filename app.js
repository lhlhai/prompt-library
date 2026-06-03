// app.js - Premium Prompt Library Logic
// Tương thích hoàn toàn với cấu trúc HTML/CSS Premium đã cung cấp

// ==================== 1. CONFIG & SAFE FALLBACKS ====================
const CONFIG = {
  ENABLE_MARKDOWN_PREVIEW: true,
  ENABLE_QUICK_COPY_TOOLBAR: true,
  ENABLE_COMPARISON_MODE: true,
  ENABLE_COLLECTIONS: true,
  ENABLE_TAGGING: true,
};

// Fallback an toàn nếu searchEngine chưa được định nghĩa
const searchEngine = window.searchEngine || {
  search: (query, list) => {
    const q = query.toLowerCase();
    return list.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.prompt && p.prompt.toLowerCase().includes(q)) ||
      (p.label && p.label.toLowerCase().includes(q))
    ).map(p => ({ ...p, searchScore: 100 })); // Mock score
  },
  fuzzyMatch: (query, text) => text.includes(query)
};

// Kiểm tra sự tồn tại của PROMPTS
if (typeof PROMPTS === 'undefined') {
  console.warn('PROMPTS is not defined. Initializing empty array.');
  window.PROMPTS = [];
}

// ==================== 2. STATE MANAGEMENT ====================
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
let variableValues = {};
let showFavoritesOnly = false;
let comparisonList = [];
let currentCollectionId = 'all';
let viewMode = localStorage.getItem('prompt-library-view-mode') || 'grid';
let recentPrompts = JSON.parse(localStorage.getItem('prompt-library-recent')) || [];
let favorites = JSON.parse(localStorage.getItem('prompt-library-favorites')) || [];
let editedPrompts = JSON.parse(localStorage.getItem('prompt-library-edited')) || {};
let isEditMode = false;
let selectedFormat = 'plain';

// ==================== 3. DOM ELEMENTS (Mapped to Premium HTML) ====================
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
  viewToggle: document.getElementById('viewToggle'),
  comparisonBar: document.getElementById('comparisonBar'),
  compareCount: document.getElementById('compareCount'),
  compareBtn: document.getElementById('compareBtn'),
  clearCompare: document.getElementById('clearCompare'),
  comparisonModal: document.getElementById('comparisonModal'),
  comparisonModalClose: document.getElementById('comparisonModalClose'),
  comparisonGrid: document.getElementById('comparisonGrid'),
  activeFiltersList: document.getElementById('activeFiltersList'),
  tagsCloud: document.getElementById('tagsCloud'),
};

// ==================== 4. HELPER FUNCTIONS ====================
const formatDate = (iso) => {
  if (!iso) return 'N/A';
  try {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    console.error(err);
  }
};

const addToRecent = (promptNumber) => {
  recentPrompts = [promptNumber, ...recentPrompts.filter(n => n !== promptNumber)].slice(0, 10);
  localStorage.setItem('prompt-library-recent', JSON.stringify(recentPrompts));
  renderSidebar();
};

// ==================== 5. FAVORITES & EDITING ====================
const isFavorite = (num) => favorites.includes(num);

const toggleFavorite = (num) => {
  if (isFavorite(num)) {
    favorites = favorites.filter(n => n !== num);
  } else {
    favorites.push(num);
  }
  localStorage.setItem('prompt-library-favorites', JSON.stringify(favorites));
  updateStats();
  renderGrid(dom.searchInput?.value || '');
};

const getEditedPrompt = (num) => editedPrompts[num];
const hasEditedPrompt = (num) => num in editedPrompts;

const saveEditedPrompt = (num, newContent) => {
  editedPrompts[num] = newContent;
  localStorage.setItem('prompt-library-edited', JSON.stringify(editedPrompts));
};

const deleteEditedPrompt = (num) => {
  delete editedPrompts[num];
  localStorage.setItem('prompt-library-edited', JSON.stringify(editedPrompts));
};

// ==================== 6. VARIABLE & FORMAT HANDLING ====================
const extractVariables = (text) => {
  const regex = /\{\{([A-Z_]+)\}\}/g; // Hỗ trợ cả {{VAR}} và {VAR}
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

const convertToMarkdown = (text) => text ? `\`\`\`\n${text}\n\`\`\`` : text;
const getFormattedPrompt = (text, format) => format === 'markdown' ? convertToMarkdown(text) : text;

// ==================== 7. DATA LOGIC & FILTERING ====================
const getCategories = () => {
  const cats = [...new Set(PROMPTS.map(p => p.label).filter(Boolean))];
  return cats.sort();
};

const getAllTags = () => {
  const tags = new Set();
  PROMPTS.forEach(p => {
    if (p.tags && Array.isArray(p.tags)) {
      p.tags.forEach(tag => tags.add(tag));
    }
    // Also extract from description and name for keywords
    if (p.description) {
      const words = p.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      words.forEach(w => tags.add(w));
    }
  });
  return Array.from(tags).sort();
};

const renderTagsCloud = () => {
  if (!dom.tagsCloud) return;
  const tags = getAllTags();
  dom.tagsCloud.innerHTML = tags.slice(0, 20).map(tag => `
    <span class="tag" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</span>
  `).join('');
  
  dom.tagsCloud.querySelectorAll('.tag').forEach(tagEl => {
    tagEl.addEventListener('click', () => {
      const tagName = tagEl.dataset.tag;
      dom.searchInput.value = tagName;
      filterPrompts(tagName);
      showToast(`Filtering by: ${tagName}`);
    });
  });
};

const countByCategory = (category) => PROMPTS.filter(p => !p.disabled && p.label === category).length;

const filterPrompts = (query) => {
  const q = (query || '').toLowerCase().trim();

  let candidates = PROMPTS.filter(p => {
    if (p.disabled) return false;
    if (showFavoritesOnly && !isFavorite(p.number)) return false;
    return selectedCategories.length === 0 || selectedCategories.includes(p.label);
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
      if (cat === 'all') {
        selectedCategories = [];
      } else {
        if (selectedCategories.includes(cat)) {
          selectedCategories = selectedCategories.filter(c => c !== cat);
        } else {
          selectedCategories.push(cat);
        }
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
      <i class="fas fa-${f.type === 'favorite' ? 'star' : 'folder'}"></i>
      ${f.label}
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
          <button class="card-action-btn favorite ${isFavorite(p.number) ? 'active' : ''}" 
                  onclick="app.toggleFavorite(${p.number})" title="Favorite">
            <i class="fas fa-star"></i>
          </button>
          ${CONFIG.ENABLE_COMPARISON_MODE ? `
          <button class="card-action-btn compare ${isCompared ? 'active' : ''}" 
                  onclick="app.toggleComparison(${p.number})" title="Compare">
            <i class="fas fa-columns"></i>
          </button>` : ''}
        </div>
      </div>
      
      <div class="card-body-premium">
        <p class="card-description">${highlightText(p.description, query)}</p>
        <div class="card-preview">${highlightText(previewText, query)}</div>
      </div>
      
      <div class="card-footer-premium">
        <button class="btn-premium btn-primary-premium" onclick="app.copyPrompt(${p.number}, this)">
          <i class="fas fa-copy"></i> Copy
        </button>
        <button class="btn-premium btn-secondary-premium" onclick="app.openModal(${p.number})">
          <i class="fas fa-eye"></i> View Full
        </button>
      </div>
    </article>
  `;
};

const renderGrid = (query = '') => {
  if (!dom.grid) return;
  
  if (filteredPrompts.length === 0) {
    dom.grid.style.display = 'none';
    if (dom.emptyState) dom.emptyState.style.display = 'block';
    return;
  }
  
  dom.grid.style.display = 'grid';
  if (dom.emptyState) dom.emptyState.style.display = 'none';

  dom.grid.innerHTML = filteredPrompts.map((p, index) => 
    renderCard(p, query).replace('<article class="prompt-card-premium">', `<article class="prompt-card-premium" style="animation-delay: ${index * 0.05}s">`)
  ).join('');
};

// ==================== 9. MODAL LOGIC ====================
const renderVariableInputs = (variables) => {
  // Dynamically inject variable inputs into modal if they exist
  const varSection = document.getElementById('variablesSection');
  if (!varSection) return;

  if (variables.length > 0) {
    varSection.style.display = 'block';
    varSection.innerHTML = `
      <h4 style="font-size: 0.875rem; font-weight: 700; margin-bottom: 12px; color: var(--primary);">
        <i class="fas fa-sliders-h"></i> Variables to Fill
      </h4>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${variables.map(v => `
          <div style="display: flex; align-items: center; gap: 12px;">
            <label style="font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; font-weight: 600; color: var(--primary); min-width: 100px;">{${v}}</label>
            <input type="text" class="variable-input-premium" data-var="${v}" placeholder="Enter value for ${v}..." 
                   style="flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; outline: none; background: var(--bg); color: var(--text);">
          </div>
        `).join('')}
      </div>
    `;
    
    varSection.querySelectorAll('.variable-input-premium').forEach(input => {
      input.addEventListener('input', (e) => {
        variableValues[e.target.dataset.var] = e.target.value;
        updateModalPromptPreview();
      });
    });
  } else {
    varSection.style.display = 'none';
  }
};

const updateModalPromptPreview = () => {
  if (!currentModalPrompt) return;
  const baseText = hasEditedPrompt(currentModalPrompt.number) ? getEditedPrompt(currentModalPrompt.number) : currentModalPrompt.prompt;
  const replacedText = replaceVariables(baseText, variableValues);

  const contentEl = document.getElementById('modalPromptContent');
  if (contentEl) contentEl.textContent = replacedText;

  // Update preview content as well
  const previewEl = document.getElementById('modalPromptPreview');
  if (previewEl && typeof marked !== 'undefined') {
    previewEl.innerHTML = marked.parse(replacedText);
  }
};

const openModal = (num) => {
  const p = PROMPTS.find(x => x.number === num);
  if (!p || !dom.modal) return;

  currentModalPrompt = p;
  variableValues = {};
  isEditMode = false;

  document.getElementById('modalTitle').textContent = p.name;
  document.getElementById('modalMeta').innerHTML = `
    <span><i class="fas fa-tag"></i> ${escapeHtml(p.label)}</span>
    <span><i class="fas fa-hashtag"></i> #${p.number}</span>
    <span><i class="fas fa-clock"></i> ${formatDate(p.updated_at)}</span>
  `;

  const displayPrompt = hasEditedPrompt(p.number) ? getEditedPrompt(p.number) : p.prompt;
  const contentEl = document.getElementById('modalPromptContent');
  const previewEl = document.getElementById('modalPromptPreview');
  const editEl = document.getElementById('modalPromptEdit');
  
  if (contentEl) contentEl.textContent = displayPrompt;
  if (editEl) editEl.value = displayPrompt;
  
  // Setup Markdown Preview
  if (CONFIG.ENABLE_MARKDOWN_PREVIEW && typeof marked !== 'undefined') {
    const tabsEl = document.getElementById('modalTabs');
    if (tabsEl) {
      tabsEl.style.display = 'flex';
      tabsEl.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      tabsEl.querySelector('[data-tab="raw"]').classList.add('active');
      contentEl.style.display = 'block';
      previewEl.style.display = 'none';
      previewEl.innerHTML = marked.parse(displayPrompt);
    }
  } else {
    const tabsEl = document.getElementById('modalTabs');
    if (tabsEl) tabsEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
    if (previewEl) previewEl.style.display = 'none';
  }

  renderVariableInputs(extractVariables(displayPrompt));
  
  // Setup edit mode buttons
  const editBtn = document.getElementById('modalEditBtn');
  const saveBtn = document.getElementById('modalEditSaveBtn');
  const cancelBtn = document.getElementById('modalEditCancelBtn');
  const resetBtn = document.getElementById('modalResetBtn');
  
  if (editBtn) {
    editBtn.style.display = 'inline-flex';
    editBtn.onclick = () => {
      isEditMode = true;
      contentEl.style.display = 'none';
      previewEl.style.display = 'none';
      editEl.style.display = 'block';
      editBtn.style.display = 'none';
      saveBtn.style.display = 'inline-flex';
      cancelBtn.style.display = 'inline-flex';
      if (hasEditedPrompt(p.number) && resetBtn) resetBtn.style.display = 'inline-flex';
    };
  }
  
  if (saveBtn) {
    saveBtn.style.display = 'none';
    saveBtn.onclick = () => {
      saveEditedPrompt(p.number, editEl.value);
      isEditMode = false;
      contentEl.textContent = editEl.value;
      previewEl.innerHTML = marked.parse(editEl.value);
      contentEl.style.display = 'block';
      editEl.style.display = 'none';
      editBtn.style.display = 'inline-flex';
      saveBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
      if (resetBtn) resetBtn.style.display = 'none';
      showToast('✓ Changes saved!');
    };
  }
  
  if (cancelBtn) {
    cancelBtn.style.display = 'none';
    cancelBtn.onclick = () => {
      isEditMode = false;
      const originalPrompt = hasEditedPrompt(p.number) ? getEditedPrompt(p.number) : p.prompt;
      contentEl.textContent = originalPrompt;
      previewEl.innerHTML = marked.parse(originalPrompt);
      editEl.value = originalPrompt;
      contentEl.style.display = 'block';
      editEl.style.display = 'none';
      editBtn.style.display = 'inline-flex';
      saveBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
      if (resetBtn) resetBtn.style.display = 'none';
    };
  }
  
  if (resetBtn) {
    resetBtn.style.display = 'none';
    resetBtn.onclick = () => {
      deleteEditedPrompt(p.number);
      contentEl.textContent = p.prompt;
      previewEl.innerHTML = marked.parse(p.prompt);
      editEl.value = p.prompt;
      if (isEditMode) {
        contentEl.style.display = 'block';
        editEl.style.display = 'none';
        editBtn.style.display = 'inline-flex';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        resetBtn.style.display = 'none';
        isEditMode = false;
      }
      showToast('✓ Reset to original!');
    };
  }
  
  // Setup copy button in modal
  const copyBtn = document.getElementById('copyFullPrompt');
  if (copyBtn) {
    copyBtn.onclick = () => {
      const baseText = hasEditedPrompt(p.number) ? getEditedPrompt(p.number) : p.prompt;
      const finalPrompt = replaceVariables(baseText, variableValues);
      copyToClipboard(finalPrompt, copyBtn, p.number);
    };
  }
  
  // Setup download button
  const downloadBtn = document.getElementById('modalDownload');
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const baseText = hasEditedPrompt(p.number) ? getEditedPrompt(p.number) : p.prompt;
      const finalPrompt = replaceVariables(baseText, variableValues);
      const blob = new Blob([finalPrompt], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prompt_${p.number}_${p.name.replace(/[^a-z0-9]/gi, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('✓ Downloaded!');
    };
  }
  
  // Setup export CSV button
  const exportBtn = document.getElementById('modalExportCSV');
  if (exportBtn) {
    exportBtn.onclick = () => {
      const baseText = hasEditedPrompt(p.number) ? getEditedPrompt(p.number) : p.prompt;
      const finalPrompt = replaceVariables(baseText, variableValues);
      const headers = ["Summary", "Description", "Label", "Priority"];
      const row = [
        `Prompt: ${p.name}`,
        finalPrompt.replace(/"/g, '""'),
        p.label || 'General',
        "Medium"
      ];
      const csvContent = [headers.join(","), row.map(cell => `"${cell}"`).join(",")].join("\n");
      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prompt_${p.number}_export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('✓ Exported to CSV!');
    };
  }
  
  // Setup share button
  const shareBtn = document.getElementById('modalShare');
  if (shareBtn) {
    shareBtn.onclick = async () => {
      const shareUrl = `${window.location.origin}${window.location.pathname}?prompt=${p.number}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('✓ Link copied to clipboard!');
      } catch (err) {
        showToast('✗ Share failed');
      }
    };
  }
  
  // Setup tabs for Raw/Preview
  const tabsEl = document.getElementById('modalTabs');
  if (tabsEl) {
    tabsEl.querySelectorAll('.modal-tab').forEach(tab => {
      tab.onclick = () => {
        const target = tab.dataset.tab;
        tabsEl.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        if (target === 'preview') {
          contentEl.style.display = 'none';
          previewEl.style.display = 'block';
        } else {
          contentEl.style.display = 'block';
          previewEl.style.display = 'none';
        }
      };
    });
  }

  dom.modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

const closeModal = () => {
  if (!dom.modal) return;
  dom.modal.classList.remove('active');
  document.body.style.overflow = '';
  currentModalPrompt = null;
  variableValues = {};
};

// ==================== 10. COMPARISON LOGIC ====================
const toggleComparison = (num) => {
  if (comparisonList.includes(num)) {
    comparisonList = comparisonList.filter(n => n !== num);
  } else {
    if (comparisonList.length >= 3) {
      showToast('⚠️ Max 3 prompts for comparison', 'error');
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
  if (!dom.comparisonModal || !dom.comparisonGrid) return;
  
  const promptsToCompare = PROMPTS.filter(p => comparisonList.includes(p.number));
  
  if (promptsToCompare.length === 0) {
    closeModal();
    return;
  }
  
  dom.comparisonGrid.innerHTML = promptsToCompare.map(p => `
    <div class="comparison-column">
      <div class="comparison-header">
        <h4>${escapeHtml(p.name)}</h4>
        <span class="comparison-badge">${escapeHtml(p.label || 'General')}</span>
      </div>
      <div class="comparison-content">
        <div class="comparison-section">
          <strong>Description:</strong>
          <p>${escapeHtml(p.description)}</p>
        </div>
        <div class="comparison-section">
          <strong>Prompt:</strong>
          <pre>${escapeHtml(p.prompt)}</pre>
        </div>
      </div>
    </div>
  `).join('');
  
  dom.comparisonModal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

const closeComparisonModal = () => {
  if (!dom.comparisonModal) return;
  dom.comparisonModal.classList.remove('active');
  document.body.style.overflow = '';
  comparisonList = [];
  updateComparisonBar();
  renderGrid(dom.searchInput?.value || '');
};

const clearComparison = () => {
  comparisonList = [];
  updateComparisonBar();
  renderGrid(dom.searchInput?.value || '');
};

// ==================== 11. EVENT BINDINGS & INIT ====================
const app = {
  toggleFavorite,
  toggleComparison,
  openModal,
  closeModal,
  openComparisonModal,
  closeComparisonModal,
  clearComparison,
  removeFilter: (type, label) => {
    if (type === 'favorite') showFavoritesOnly = false;
    if (type === 'category') selectedCategories = selectedCategories.filter(c => c !== label);
    filterPrompts(dom.searchInput?.value || '');
  },
  copyPrompt: (num, btn) => {
    const p = PROMPTS.find(x => x.number === num);
    if (p) {
      const baseText = hasEditedPrompt(num) ? getEditedPrompt(num) : p.prompt;
      copyToClipboard(baseText, btn, num);
    }
  },
  clearAllFilters: () => {
    selectedCategories = [];
    showFavoritesOnly = false;
    if (dom.searchInput) dom.searchInput.value = '';
    filterPrompts('');
    showToast('All filters cleared');
  },
  toggleTheme: () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    const icon = dom.themeToggle?.querySelector('i');
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  },
  toggleViewMode: () => {
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
    localStorage.setItem('prompt-library-view-mode', viewMode);
    const icon = dom.viewToggle?.querySelector('i');
    if (icon) {
      icon.className = viewMode === 'grid' ? 'fas fa-th-large' : 'fas fa-list';
    }
    if (dom.grid) {
      // Use list-view class instead of changing to prompts-list
      if (viewMode === 'list') {
        dom.grid.classList.add('list-view');
      } else {
        dom.grid.classList.remove('list-view');
      }
    }
    showToast(`Switched to ${viewMode} view`);
  }
};

// Expose app to window for inline onclick handlers
window.app = app;

document.addEventListener('DOMContentLoaded', () => {
  // Search with debounce
  if (dom.searchInput) {
    dom.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => filterPrompts(e.target.value), 300);
    });
  }

  // Filter chips
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
        renderGrid();
        updateStats();
        return;
      } else {
        showFavoritesOnly = false;
        selectedCategories = [];
      }
      filterPrompts(dom.searchInput?.value || '');
    });
  });

  // Clear all
  if (dom.clearAllFilters) dom.clearAllFilters.addEventListener('click', app.clearAllFilters);
  
  // Theme toggle
  if (dom.themeToggle) dom.themeToggle.addEventListener('click', app.toggleTheme);
  
  // View toggle
  if (dom.viewToggle) dom.viewToggle.addEventListener('click', app.toggleViewMode);
  
  // Comparison bar buttons
  if (dom.compareBtn) dom.compareBtn.addEventListener('click', app.openComparisonModal);
  if (dom.clearCompare) dom.clearCompare.addEventListener('click', app.clearComparison);
  
  // Comparison modal close
  if (dom.comparisonModalClose) dom.comparisonModalClose.addEventListener('click', closeComparisonModal);
  if (dom.comparisonModal) {
    dom.comparisonModal.addEventListener('click', (e) => {
      if (e.target === dom.comparisonModal) closeComparisonModal();
    });
  }

  // Modal close events
  if (dom.modalClose) dom.modalClose.addEventListener('click', closeModal);
  if (dom.modal) {
    dom.modal.addEventListener('click', (e) => {
      if (e.target === dom.modal) closeModal();
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      dom.searchInput?.focus();
    }
    if (e.key === 'Escape') {
      closeModal();
      closeComparisonModal();
    }
  });

  // Check system theme
  const savedTheme = localStorage.getItem('darkMode');
  if (savedTheme === 'true' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-mode');
    const icon = dom.themeToggle?.querySelector('i');
    if (icon) icon.className = 'fas fa-sun';
  }

  // Initial render
  renderSidebar();
  renderTagsCloud();
  updateStats();
  filterPrompts('');
});