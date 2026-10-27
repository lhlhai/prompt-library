(() => {
  const CONFIG = window.QA_CONFIG || { features: {}, dataBasePath: 'data', storagePrefix: 'qa-library' };
  const page = document.body.dataset.page;
  const isEnabled = (name) => CONFIG.features?.[name] !== false;
  const state = { items: [], query: '', category: '', tag: '', activeItem: null };
  const els = {
    search: document.querySelector('#search-input'),
    filterToggle: document.querySelector('#filter-toggle'),
    clear: document.querySelector('#clear-btn'),
    filterPanel: document.querySelector('#filter-panel'),
    categoryList: document.querySelector('#category-list'),
    tagList: document.querySelector('#tag-list'),
    count: document.querySelector('#library-count'),
    grid: document.querySelector('#card-grid'),
    backdrop: document.querySelector('#detail-backdrop'),
    closeDetail: document.querySelector('#close-detail'),
    copy: document.querySelector('#copy-btn'),
    detailTitle: document.querySelector('#detail-title'),
    detailCategory: document.querySelector('#detail-category'),
    detailMeta: document.querySelector('#detail-meta'),
    detailDescription: document.querySelector('#detail-description'),
    installPath: document.querySelector('#install-path'),
    copilotMeta: document.querySelector('#copilot-meta'),
    detailContent: document.querySelector('#detail-content'),
    relatedSkills: document.querySelector('#related-skills'),
  };

  const storageKey = (name) => `${CONFIG.storagePrefix || 'qa-library'}:${name}`;
  const readStorage = (name) => {
    try { return JSON.parse(localStorage.getItem(storageKey(name)) || '[]'); } catch { return []; }
  };
  const writeStorage = (name, value) => {
    try { localStorage.setItem(storageKey(name), JSON.stringify(value)); } catch { /* private mode */ }
  };
  const normalized = (value) => String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const list = (value) => Array.isArray(value) ? value : (value ? [value] : []);
  const installPath = (item) => page === 'agents'
    ? `.github/agents/${item.slug}.agent.md`
    : `.github/skills/${item.slug}/SKILL.md`;
  function markdownForInstall(item) {
    const keys = page === 'agents'
      ? ['name', 'description', 'tools', 'model', 'target', 'user-invocable', 'disable-model-invocation', 'argument-hint']
      : ['name', 'description', 'argument-hint', 'user-invocable', 'disable-model-invocation', 'context'];
    const fields = keys.filter((key) => item[key] !== undefined && item[key] !== null && item[key] !== '')
      .map((key) => `${key}: ${JSON.stringify(item[key])}`);
    return `---\n${fields.join('\n')}\n---\n\n${String(item.content || '').trim()}\n`;
  }

  function copilotMetadataHtml(item) {
    if (page === 'agents') {
      const tools = Array.isArray(item.tools)
        ? item.tools
        : (typeof item.tools === 'string' ? item.tools.split(/[\s,]+/).filter(Boolean) : null);
      if (tools === null) return '<section class="copilot-meta"><h3>Tool access</h3><p>Không giới hạn trong frontmatter: Copilot có thể dùng các tool khả dụng trong phiên.</p></section>';
      if (!tools.length) return '<section class="copilot-meta"><h3>Tool access</h3><p>Agent không được cấp tool nào.</p></section>';
      const descriptions = {
        read: 'Đọc nội dung tệp trong workspace',
        search: 'Tìm tệp và nội dung theo từ khóa',
        edit: 'Tạo hoặc chỉnh sửa tệp',
        execute: 'Chạy lệnh trong terminal/shell',
        todo: 'Tạo và cập nhật danh sách công việc',
      };
      const rows = tools.map((tool) => {
        const label = String(tool);
        const description = descriptions[label.toLowerCase()] || 'Tool được cấu hình cho agent';
        return `<li><code>${escapeHtml(label)}</code><span>${description}</span></li>`;
      }).join('');
      return `<section class="copilot-meta"><h3>Tool access</h3><ul class="tool-permission-list">${rows}</ul></section>`;
    }

    const name = item.name || item.slug;
    const userInvocable = item['user-invocable'] !== false;
    const autoInvocation = item['disable-model-invocation'] !== true;
    let invocation = autoInvocation ? 'Copilot có thể tự nạp skill theo mức độ liên quan.' : 'Chỉ nạp khi người dùng gọi thủ công.';
    if (userInvocable) invocation += ` Lệnh gọi: /${escapeHtml(name)}.`;
    else if (autoInvocation) invocation += ' Skill không hiển thị trong menu slash command.';
    else invocation += ' Skill chỉ được gọi từ workflow/agent khác.';
    const hint = item['argument-hint'] ? `<p><strong>Gợi ý input:</strong> <code>${escapeHtml(item['argument-hint'])}</code></p>` : '';
    return `<section class="copilot-meta"><h3>Skill invocation</h3><p>${invocation}</p>${hint}</section>`;
  }

  function inlineMarkdown(value) {
    return escapeHtml(value)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  }

  function markdownToHtml(markdown) {
    if (!isEnabled('markdown')) return `<p>${escapeHtml(markdown).replace(/\n/g, '<br>')}</p>`;
    const lines = String(markdown || '').replaceAll('\r\n', '\n').split('\n');
    const html = [];
    let paragraph = [];
    let listType = null;
    let inCode = false;
    let codeLanguage = '';
    let codeLines = [];
    const flushParagraph = () => { if (paragraph.length) { html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`); paragraph = []; } };
    const closeList = () => { if (listType) { html.push(`</${listType}>`); listType = null; } };
    const closeCode = () => { if (inCode) { html.push(`<pre><code class="language-${escapeHtml(codeLanguage)}">${escapeHtml(codeLines.join('\n'))}</code></pre>`); inCode = false; codeLines = []; codeLanguage = ''; } };
    for (const line of lines) {
      if (line.trim().startsWith('```')) {
        if (inCode) closeCode(); else { flushParagraph(); closeList(); inCode = true; codeLanguage = line.trim().slice(3).trim(); }
        continue;
      }
      if (inCode) { codeLines.push(line); continue; }
      if (!line.trim()) { flushParagraph(); closeList(); continue; }
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) { flushParagraph(); closeList(); const level = heading[1].length; html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`); continue; }
      if (/^>\s?/.test(line)) { flushParagraph(); closeList(); html.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s?/, ''))}</blockquote>`); continue; }
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (bullet || ordered) {
        flushParagraph();
        const nextType = ordered ? 'ol' : 'ul';
        if (listType && listType !== nextType) closeList();
        if (!listType) { listType = nextType; html.push(`<${listType}>`); }
        html.push(`<li>${inlineMarkdown((bullet || ordered)[1])}</li>`);
        continue;
      }
      closeList();
      paragraph.push(line.trim());
    }
    flushParagraph(); closeList(); closeCode();
    return html.join('');
  }

  function itemSearchText(item) {
    return normalized([item.title, item.description, item.category, item.level, ...list(item.tags), ...list(item.skills), item.content].join(' ')).slice(0, CONFIG.maxSearchContentLength || 12000);
  }

  function relevance(item, query) {
    const terms = normalized(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return 0;
    const title = normalized(item.title);
    const category = normalized(item.category);
    const tags = normalized(list(item.tags).join(' '));
    const description = normalized(item.description);
    const body = itemSearchText(item);
    return terms.reduce((score, term) => score + (title.includes(term) ? 14 : 0) + (category.includes(term) ? 8 : 0) + (tags.includes(term) ? 9 : 0) + (description.includes(term) ? 5 : 0) + (body.includes(term) ? 1 : 0), 0);
  }

  function filteredItems() {
    const query = state.query.trim();
    return state.items.filter((item) => {
      const matchesCategory = !state.category || normalized(item.category) === normalized(state.category);
      const matchesTag = !state.tag || list(item.tags).some((tag) => normalized(tag) === normalized(state.tag));
      const matchesQuery = !query || relevance(item, query) > 0;
      return matchesCategory && matchesTag && matchesQuery;
    }).sort((a, b) => query ? relevance(b, query) - relevance(a, query) : String(a.title).localeCompare(String(b.title), 'en'));
  }

  function renderFilterChips() {
    if (!isEnabled('filters')) return;
    const categories = [...new Set(state.items.map((item) => item.category).filter(Boolean))].sort();
    const tags = [...new Set(state.items.flatMap((item) => list(item.tags)))].sort();
    const chip = (label, type, selected) => `<button type="button" class="chip${selected ? ' selected' : ''}" data-filter-type="${type}" data-filter-value="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
    els.categoryList.innerHTML = categories.map((category) => chip(category, 'category', state.category === category)).join('');
    els.tagList.innerHTML = tags.map((tag) => chip(tag, 'tag', state.tag === tag)).join('');
    document.querySelectorAll('[data-filter-type]').forEach((button) => button.addEventListener('click', () => {
      const type = button.dataset.filterType;
      state[type] = state[type] === button.dataset.filterValue ? '' : button.dataset.filterValue;
      renderFilterChips(); renderCards();
    }));
  }

  function isFavorite(slug) { return readStorage('favorites').includes(slug); }
  function toggleFavorite(slug) {
    const favorites = new Set(readStorage('favorites'));
    if (favorites.has(slug)) favorites.delete(slug); else favorites.add(slug);
    writeStorage('favorites', [...favorites]);
  }
  function remember(slug) {
    if (!isEnabled('recentlyUsed')) return;
    const recent = [slug, ...readStorage('recentlyUsed').filter((value) => value !== slug)].slice(0, 12);
    writeStorage('recentlyUsed', recent);
  }

  function renderCards() {
    const items = filteredItems();
    if (isEnabled('stats')) els.count.textContent = `${items.length} / ${state.items.length} ${page === 'agents' ? 'agents' : 'skills'}`;
    if (!items.length) {
      els.grid.innerHTML = '<div class="empty-state"><strong>Không tìm thấy nội dung phù hợp.</strong>Thử một keyword ngắn hơn hoặc xóa bộ lọc để xem lại toàn bộ library.</div>';
      return;
    }
    els.grid.innerHTML = items.map((item) => {
      const tags = list(item.tags).slice(0, 4).map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join('');
      const connectedSkills = page === 'agents' && list(item.skills).length ? `<span class="tag">${list(item.skills).length} skills</span>` : '';
      return `<article class="card" data-slug="${escapeHtml(item.slug)}"><div class="card-top"><div class="card-kicker"><span class="card-kind">${page === 'agents' ? 'Agent' : 'Skill'}</span><span class="card-category">${escapeHtml(item.category || 'General')}</span></div>${isEnabled('favorites') ? `<button class="favorite-btn${isFavorite(item.slug) ? ' active' : ''}" type="button" data-favorite="${escapeHtml(item.slug)}" aria-label="Favorite ${escapeHtml(item.title)}">${isFavorite(item.slug) ? '★' : '☆'}</button>` : ''}</div><h3>${escapeHtml(item.title)}</h3><p class="card-description">${escapeHtml(item.description)}</p><div class="card-footer"><div class="tag-row">${tags}${connectedSkills}</div><button class="open-btn" type="button" data-open="${escapeHtml(item.slug)}">Mở detail →</button></div></article>`;
    }).join('');
    els.grid.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', () => openDetail(button.dataset.open)));
    els.grid.querySelectorAll('.card').forEach((card) => card.addEventListener('click', (event) => { if (!event.target.closest('button')) openDetail(card.dataset.slug); }));
    els.grid.querySelectorAll('[data-favorite]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); toggleFavorite(button.dataset.favorite); renderCards(); }));
  }

  function openDetail(slug, updateHash = true) {
    const item = state.items.find((candidate) => candidate.slug === slug);
    if (!item) return;
    state.activeItem = item; remember(slug);
    els.detailTitle.textContent = item.title;
    els.detailCategory.textContent = item.category || 'General';
    els.detailDescription.textContent = item.description || '';
    els.installPath.textContent = `Đường dẫn cài đặt: ${installPath(item)}`;
    els.copilotMeta.innerHTML = copilotMetadataHtml(item);
    els.detailMeta.innerHTML = [...list(item.tags).map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`), item.level ? `<span class="tag">${escapeHtml(item.level)}</span>` : '', item.updated ? `<span class="tag">Updated ${escapeHtml(item.updated)}</span>` : ''].join('');
    els.detailContent.innerHTML = markdownToHtml(item.content);
    if (isEnabled('relatedSkills') && page === 'agents' && list(item.skills).length) {
      els.relatedSkills.innerHTML = `<h3>Reusable skills</h3>${list(item.skills).map((skill) => `<a class="tag" href="skills.html#${encodeURIComponent(skill)}">↗ ${escapeHtml(skill)}</a>`).join('')}`;
    } else els.relatedSkills.innerHTML = '';
    els.backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (updateHash) history.replaceState(null, '', `#${encodeURIComponent(slug)}`);
  }

  function closeDetail(clearHash = true) {
    els.backdrop.classList.remove('open');
    document.body.style.overflow = '';
    state.activeItem = null;
    if (clearHash) history.replaceState(null, '', location.pathname + location.search);
  }

  async function copyActive() {
    if (!state.activeItem || !isEnabled('copy')) return;
    const text = markdownForInstall(state.activeItem);
    try { await navigator.clipboard.writeText(text); } catch {
      const textarea = document.createElement('textarea'); textarea.value = text; document.body.appendChild(textarea); textarea.select(); document.execCommand('copy'); textarea.remove();
    }
    const original = els.copy.textContent; els.copy.textContent = 'Đã copy'; setTimeout(() => { els.copy.textContent = original; }, 1300);
  }

  function bindUI() {
    if (!isEnabled('search')) els.search.closest('.search-wrap').style.display = 'none';
    if (!isEnabled('filters')) { els.filterToggle.style.display = 'none'; els.clear.style.display = 'none'; }
    if (isEnabled('filters')) {
      els.filterToggle.addEventListener('click', () => els.filterPanel.classList.toggle('open'));
      els.clear.addEventListener('click', () => { state.query = ''; state.category = ''; state.tag = ''; els.search.value = ''; renderFilterChips(); renderCards(); });
    }
    if (isEnabled('search')) {
      let timer;
      els.search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.query = els.search.value; renderCards(); }, 120); });
    }
    if (isEnabled('copy')) els.copy.addEventListener('click', copyActive); else els.copy.style.display = 'none';
    els.closeDetail.addEventListener('click', () => closeDetail());
    els.backdrop.addEventListener('click', (event) => { if (event.target === els.backdrop) closeDetail(); });
    if (isEnabled('keyboardShortcuts')) document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); els.search.focus(); }
      if (event.key === 'Escape' && els.backdrop.classList.contains('open')) closeDetail();
    });
  }

  async function start() {
    bindUI();
    try {
      const response = await fetch(`${CONFIG.dataBasePath || 'data'}/${page}.json`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json(); state.items = Array.isArray(payload.items) ? payload.items : [];
      renderFilterChips(); renderCards();
      const hash = decodeURIComponent(location.hash.slice(1)); if (hash) openDetail(hash, false);
    } catch (error) {
      els.count.textContent = 'Không tải được';
      els.grid.innerHTML = `<div class="empty-state"><strong>Chưa có dữ liệu build.</strong>Hãy chạy <code>node build.mjs</code> để quét các file Markdown.<br><small>${escapeHtml(error.message)}</small></div>`;
    }
  }
  start();
})();
