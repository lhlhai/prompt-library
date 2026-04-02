    // PROMPTS moved to prompts.js


// ==================== HELPER FUNCTIONS ====================
let filteredPrompts = [...PROMPTS];
let selectedCategories = [];
let currentModalPrompt = null;
let searchTimeout;

const grid = document.getElementById('promptGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const totalBadge = document.getElementById('totalBadge');
const activeBadge = document.getElementById('activeBadge');
const resultsBadge = document.getElementById('resultsBadge');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const toast = document.getElementById('toast');
const categoryOptions = document.getElementById('categoryOptions');
const selectAllCats = document.getElementById('selectAllCats');
const clearAllCats = document.getElementById('clearAllCats');
const dropdownToggle = document.getElementById('dropdownToggle');
const dropdownMenu = document.getElementById('dropdownMenu');
const selectedCatsDisplay = document.getElementById('selectedCatsDisplay');

// Format date
const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Escape HTML
const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// Simple fuzzy search function
const fuzzyMatch = (query, text) => {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qIdx = 0;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) qIdx++;
  }
  return qIdx === q.length;
};

// Highlight search term in text
const highlightText = (text, query) => {
  if (!query) return escapeHtml(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const highlighted = escapeHtml(text).replace(regex, '<span class="search-highlight">$1</span>');
  return highlighted;
};

// Copy to clipboard
const copyToClipboard = async (text, btn) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast('✓ Copied to clipboard!');
    if (btn) {
      btn.classList.add('copied');
      btn.textContent = '✓ Copied!';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = '📋 Copy Prompt';
      }, 2000);
    }
  } catch (err) {
    showToast('✗ Copy failed');
    console.error(err);
  }
};

// Show toast
const showToast = (msg) => {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
};

// Get unique categories
const getCategories = () => {
  const cats = [...new Set(PROMPTS.map(p => p.label))];
  return cats.sort();
};

// Count prompts by category
const countByCategory = (category) => {
  return PROMPTS.filter(p => !p.disabled && p.label === category).length;
};

// Update selected categories display
const updateSelectedDisplay = () => {
  if (selectedCategories.length === 0) {
    selectedCatsDisplay.textContent = 'Select Categories';
  } else if (selectedCategories.length === getCategories().length) {
    selectedCatsDisplay.textContent = 'All Categories Selected';
  } else {
    selectedCatsDisplay.textContent = `${selectedCategories.length} Categories Selected`;
  }
};

// Initialize category filter
const initCategoryFilter = () => {
  const categories = getCategories();
  categoryOptions.innerHTML = '';
  categories.forEach(cat => {
    const label = document.createElement('label');
    label.className = 'category-checkbox-label';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = cat;
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        selectedCategories.push(cat);
      } else {
        selectedCategories = selectedCategories.filter(c => c !== cat);
      }
      updateSelectedDisplay();
      filterPrompts(searchInput.value);
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(`${cat} `));
    
    const countSpan = document.createElement('span');
    countSpan.className = 'category-count';
    countSpan.textContent = `(${countByCategory(cat)})`;
    label.appendChild(countSpan);

    categoryOptions.appendChild(label);
  });
  updateSelectedDisplay();
};

// Select all categories
selectAllCats.addEventListener('click', (e) => {
  e.preventDefault();
  const checkboxes = categoryOptions.querySelectorAll('input[type="checkbox"]');
  selectedCategories = [];
  checkboxes.forEach(cb => {
    cb.checked = true;
    selectedCategories.push(cb.value);
  });
  updateSelectedDisplay();
  filterPrompts(searchInput.value);
});

// Clear all categories
clearAllCats.addEventListener('click', (e) => {
  e.preventDefault();
  const checkboxes = categoryOptions.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  selectedCategories = [];
  updateSelectedDisplay();
  filterPrompts(searchInput.value);
});

// Render card
const renderCard = (p, query = '') => {
  const card = document.createElement('div');
  card.className = `prompt-card ${p.disabled ? 'disabled' : ''}`;
  
  const preview = p.prompt.length > 200 
    ? p.prompt.substring(0, 200) + '...' 
    : p.prompt;

  const highlightedDesc = highlightText(p.description || 'No description', query);
  const highlightedPreview = highlightText(preview, query);

  card.innerHTML = `
    <div class="card-header">
      <div class="card-title">
        <span class="card-number">#${p.number}</span>
        ${escapeHtml(p.name)}
      </div>
      <span class="card-label">${escapeHtml(p.label || 'General')}</span>
    </div>
    
    <div class="card-meta">
      <span>🕐 ${formatDate(p.updated_at)}</span>
      ${p.disabled ? '<span style="color:var(--warning)">⚠️ Disabled</span>' : '<span>✅ Active</span>'}
    </div>

    <div class="card-section">
      <div class="card-section-title">📄 Description</div>
      <p class="card-desc">${highlightedDesc}</p>
    </div>

    <div class="card-section">
      <div class="card-section-title">💬 Prompt Preview</div>
      <pre class="prompt-content">${highlightedPreview}</pre>
    </div>

    <div class="card-footer">
      <button class="btn btn-copy" data-copy="${p.number}">📋 Copy</button>
      <button class="btn btn-view" data-view="${p.number}">👁️ View Full</button>
    </div>
  `;
  return card;
};

// Render grid
const renderGrid = (query = '') => {
  grid.innerHTML = '';
  
  if (filteredPrompts.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  filteredPrompts.forEach(p => {
    grid.appendChild(renderCard(p, query));
  });

  // Attach events
  grid.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const num = parseInt(e.currentTarget.dataset.copy);
      const prompt = PROMPTS.find(x => x.number === num);
      if (prompt && !prompt.disabled) {
        copyToClipboard(prompt.prompt, e.currentTarget);
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
};

// Search filter with debounce and fuzzy matching
const filterPrompts = (query) => {
  const q = query.toLowerCase().trim();
  
  if (!q && selectedCategories.length === 0) {
    filteredPrompts = [...PROMPTS];
  } else {
    filteredPrompts = PROMPTS.filter(p => {
      if (p.disabled) return false;
      
      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(p.label)) {
        return false;
      }
      
      // Search filter
      if (q) {
        const hay = [
          p.name, p.label, p.description, 
          p.prompt, p.when_to_use, p.how_to_use
        ].join(' ').toLowerCase();
        
        // Exact match or fuzzy match
        return hay.includes(q) || fuzzyMatch(q, hay);
      }
      
      return true;
    });
  }
  updateStats();
  renderGrid(q);
};

// Debounced search
const handleSearch = (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    filterPrompts(e.target.value);
  }, 300);
};

// Update stats
const updateStats = () => {
  const total = PROMPTS.length;
  const active = PROMPTS.filter(p => !p.disabled).length;
  totalBadge.querySelector('strong').textContent = total;
  activeBadge.querySelector('strong').textContent = active;
  resultsBadge.querySelector('strong').textContent = filteredPrompts.length;
};

// Modal functions
const openModal = (p) => {
  currentModalPrompt = p;
  document.getElementById('modalTitle').textContent = `#${p.number} - ${p.name}`;
  document.getElementById('modalMeta').innerHTML = `
    <span>🏷️ ${escapeHtml(p.label)}</span>
    <span>🕐 Updated: ${formatDate(p.updated_at)}</span>
    ${p.disabled ? '<span style="color:var(--warning)">⚠️ Disabled</span>' : ''}
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

// Download prompt as .txt
const downloadPrompt = (p) => {
  const content = `# ${p.name}
Label: ${p.label}
Description: ${p.description}

## When to use
${p.when_to_use}

## How to use
${p.how_to_use}

## Prompt
${p.prompt}

---
Created: ${p.created_at} | Updated: ${p.updated_at}`;
  
  const blob = new Blob([content], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompt-${p.number}-${p.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✓ Downloaded!');
};

// Event Listeners
searchInput.addEventListener('input', handleSearch);

// Dropdown toggle
dropdownToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  dropdownToggle.classList.toggle('active');
  dropdownMenu.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownToggle.classList.remove('active');
    dropdownMenu.classList.remove('show');
  }
});

// Close dropdown when selecting an option (optional - keeps it open for multi-select)
categoryOptions.addEventListener('click', (e) => {
  e.stopPropagation();
});

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('active')) {
    closeModal();
  }
});

document.getElementById('modalCopy').addEventListener('click', () => {
  if (currentModalPrompt && !currentModalPrompt.disabled) {
    copyToClipboard(currentModalPrompt.prompt, document.getElementById('modalCopy'));
  }
});

document.getElementById('modalDownload').addEventListener('click', () => {
  if (currentModalPrompt) {
    downloadPrompt(currentModalPrompt);
  }
});

// Init
initCategoryFilter();
updateStats();
renderGrid();

// Focus search on load
window.addEventListener('load', () => {
  searchInput.focus();
});
