// script.js - Logic xử lý cho Prompt Library

// Kiểm tra sự tồn tại của PROMPTS từ prompts.js
if (typeof PROMPTS === 'undefined') {
  console.error('PROMPTS is not defined. Please ensure prompts.js is loaded correctly.');
  window.PROMPTS = [];
}

// ==================== STATE ====================
let filteredPrompts = [...PROMPTS];
let selectedCategories = [];
let currentModalPrompt = null;
let searchTimeout;

// DOM Elements
const grid = document.getElementById('promptGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const totalBadge = document.getElementById('totalBadge');
const activeBadge = document.getElementById('activeBadge');
const resultsBadge = document.getElementById('resultsBadge');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const toast = document.getElementById('toast');
const categoryChipsContainer = document.getElementById('categoryChipsContainer');
const clearAllFiltersBtn = document.getElementById('clearAllFilters');

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

const fuzzyMatch = (query, text) => {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qIdx = 0;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) qIdx++;
  }
  return qIdx === q.length;
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

const copyToClipboard = async (text, btn) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast('✓ Copied to clipboard!');
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
  
  filteredPrompts = PROMPTS.filter(p => {
    // Luôn ẩn prompt bị disabled trừ khi cần thiết (tùy logic project)
    if (p.disabled) return false;
    
    // Lọc theo Category
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(p.label);
    if (!categoryMatch) return false;
    
    // Lọc theo Search Query
    if (q) {
      const searchHaystack = [
        p.name, p.label, p.description, 
        p.prompt, p.when_to_use, p.how_to_use
      ].join(' ').toLowerCase();
      return searchHaystack.includes(q) || fuzzyMatch(q, searchHaystack);
    }
    
    return true;
  });

  updateStats();
  renderGrid(q);
};

// ==================== UI RENDERING ====================
const initCategoryChips = () => {
  if (!categoryChipsContainer) return;
  const categories = getCategories();
  categoryChipsContainer.innerHTML = '';
  
  categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = 'category-chip';
    if (selectedCategories.includes(cat)) chip.classList.add('active');
    
    const count = countByCategory(cat);
    chip.innerHTML = `${escapeHtml(cat)} <span class="category-chip-count">${count}</span>`;
    
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      if (chip.classList.contains('active')) {
        if (!selectedCategories.includes(cat)) selectedCategories.push(cat);
      } else {
        selectedCategories = selectedCategories.filter(c => c !== cat);
      }
      filterPrompts(searchInput.value);
    });
    
    categoryChipsContainer.appendChild(chip);
  });
};

const updateStats = () => {
  if (totalBadge) totalBadge.querySelector('strong').textContent = PROMPTS.length;
  if (activeBadge) activeBadge.querySelector('strong').textContent = PROMPTS.filter(p => !p.disabled).length;
  if (resultsBadge) resultsBadge.querySelector('strong').textContent = filteredPrompts.length;
};

const renderCard = (p, query = '') => {
  const card = document.createElement('div');
  card.className = `prompt-card ${p.disabled ? 'disabled' : ''}`;
  
  const previewText = (p.prompt || '').length > 150 
    ? p.prompt.substring(0, 150) + '...' 
    : p.prompt;

  card.innerHTML = `
    <div class="card-header">
      <div class="card-title">${escapeHtml(p.name)}</div>
      <div class="card-number">#${p.number}</div>
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
    </div>
  `;
  return card;
};

const renderGrid = (query = '') => {
  if (!grid) return;
  grid.innerHTML = '';
  
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
      if (prompt) copyToClipboard(prompt.prompt, e.currentTarget);
    });
  });

  grid.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const num = parseInt(e.currentTarget.dataset.view);
      const prompt = PROMPTS.find(x => x.number === num);
      if (prompt) openModal(prompt);
    });
  });
};

// ==================== MODAL ====================
const openModal = (p) => {
  currentModalPrompt = p;
  document.getElementById('modalTitle').textContent = p.name;
  document.getElementById('modalMeta').innerHTML = `
    <span class="card-label">${escapeHtml(p.label)}</span>
    <span>#${p.number}</span>
    <span>🕐 Updated: ${formatDate(p.updated_at)}</span>
  `;
  document.getElementById('modalPrompt').textContent = p.prompt;
  document.getElementById('modalWhen').textContent = p.when_to_use || 'N/A';
  document.getElementById('modalHow').textContent = p.how_to_use || 'N/A';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

const closeModal = () => {
  modal.classList.remove('active');
  document.body.style.overflow = '';
  currentModalPrompt = null;
};

// ==================== EVENTS ====================
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
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    filterPrompts('');
    if (searchInput) searchInput.focus();
  });
}

if (modalClose) modalClose.addEventListener('click', closeModal);
if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
    closeModal();
  }
});

const modalCopyBtn = document.getElementById('modalCopy');
if (modalCopyBtn) {
  modalCopyBtn.addEventListener('click', () => {
    if (currentModalPrompt) {
      copyToClipboard(currentModalPrompt.prompt, modalCopyBtn);
    }
  });
}

const modalDownloadBtn = document.getElementById('modalDownload');
if (modalDownloadBtn) {
  modalDownloadBtn.addEventListener('click', () => {
    if (currentModalPrompt) {
      const p = currentModalPrompt;
      const content = `# ${p.name}\nLabel: ${p.label}\n\n## When to use\n${p.when_to_use}\n\n## How to use\n${p.how_to_use}\n\n## Prompt\n${p.prompt}`;
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

// ==================== INITIALIZATION ====================
window.addEventListener('DOMContentLoaded', () => {
  initCategoryChips();
  filterPrompts(''); // Khởi tạo hiển thị ban đầu
  if (searchInput) searchInput.focus();
});
