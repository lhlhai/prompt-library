(() => {
  'use strict';

  const OWNER = 'lhlhai';
  const REPO = 'prompt-library';
  const BRANCH = 'main';
  const API_ROOT = `https://api.github.com/repos/${OWNER}/${REPO}`;
  const RAW_ROOT = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`;
  const LATEST_CACHE_KEY = `md-browser:${OWNER}/${REPO}:latest`;
  const $ = (id) => document.getElementById(id);
  const els = {
    search: $('search-input'),
    category: $('category-filter'),
    clear: $('clear-btn'),
    status: $('status'),
    progress: $('progress-bar'),
    count: $('file-count'),
    list: $('file-list'),
    reader: $('reader'),
  };
  const state = { documents: [], activePath: '', loading: false };

  function safeDecode(value) {
    try { return decodeURIComponent(value); } catch { return value; }
  }

  function scalar(value) {
    const text = String(value ?? '').trim();
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
    return text;
  }

  function frontmatterOf(source) {
    const match = source.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
    if (!match) return { raw: '', body: source, values: {} };
    const values = {};
    for (const line of match[1].split(/\r?\n/)) {
      const field = line.match(/^([\w-]+):\s*(.*)$/);
      if (field) values[field[1]] = scalar(field[2]);
    }
    return { raw: match[1], body: source.slice(match[0].length), values };
  }

  function categoryFor(path, values) {
    if (values.category) return values.category;
    const first = path.split('/')[0];
    const known = { agents: 'Agents', skills: 'Skills', examples: 'Examples' };
    if (known[first]) return known[first];
    return path.includes('/') ? first : 'Root documents';
  }

  function titleFor(path, body, values) {
    if (values.title) return values.title;
    const heading = body.match(/^#\s+(.+)\s*$/m);
    if (heading) return heading[1].replace(/[`*_]/g, '').trim();
    return path.split('/').pop().replace(/\.md$/i, '').replace(/[-_]/g, ' ');
  }

  function parseDocument(path, source, error = '') {
    const frontmatter = frontmatterOf(source);
    const values = frontmatter.values;
    const title = titleFor(path, frontmatter.body, values);
    const category = categoryFor(path, values);
    const tags = String(values.tags || '').replace(/^\[|\]$/g, '').split(',').map(scalar).map((x) => x.replace(/^#/, '').trim()).filter(Boolean);
    return {
      path,
      title,
      category,
      tags,
      source,
      body: frontmatter.body,
      frontmatter: frontmatter.raw,
      error,
      searchText: `${title}\n${path}\n${category}\n${tags.join(' ')}\n${source}`.toLocaleLowerCase(),
    };
  }

  function setStatus(message) { els.status.textContent = message; }

  function readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(LATEST_CACHE_KEY) || 'null');
      if (cached && Array.isArray(cached.documents)) return cached;
    } catch { /* Ignore damaged or unavailable browser cache. */ }
    return null;
  }

  function writeCache(treeSha, documents) {
    try {
      localStorage.setItem(LATEST_CACHE_KEY, JSON.stringify({ treeSha, savedAt: Date.now(), documents }));
    } catch {
      setStatus('Đã tải xong; trình duyệt không đủ chỗ để lưu cache offline.');
    }
  }

  function restoreDocuments(documents) {
    state.documents = documents.map((doc) => parseDocument(doc.path, doc.source || '', doc.error || ''));
    populateCategories();
    renderFileList();
    if (state.activePath) {
      const current = state.documents.find((doc) => doc.path === state.activePath);
      if (current) renderDocument(current);
    }
  }

  function populateCategories() {
    const selected = els.category.value;
    const counts = new Map();
    for (const doc of state.documents) counts.set(doc.category, (counts.get(doc.category) || 0) + 1);
    els.category.replaceChildren(new Option('Tất cả category', ''));
    [...counts.keys()].sort((a, b) => a.localeCompare(b, 'vi')).forEach((category) => {
      els.category.add(new Option(`${category} (${counts.get(category)})`, category));
    });
    if (counts.has(selected)) els.category.value = selected;
  }

  function filteredDocuments() {
    const query = els.search.value.trim().toLocaleLowerCase();
    const category = els.category.value;
    return state.documents.filter((doc) => (!category || doc.category === category) && (!query || doc.searchText.includes(query)));
  }

  function renderFileList() {
    const docs = filteredDocuments();
    els.count.textContent = `${docs.length} / ${state.documents.length} tài liệu`;
    els.list.replaceChildren();
    if (!docs.length) {
      const empty = document.createElement('p');
      empty.className = 'loading';
      empty.textContent = state.documents.length ? 'Không tìm thấy Markdown phù hợp.' : 'Chưa có tài liệu nào được tải.';
      els.list.append(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const doc of docs) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'file-item';
      button.dataset.path = doc.path;
      button.setAttribute('aria-current', String(doc.path === state.activePath));
      const title = document.createElement('span');
      title.className = 'file-title';
      title.textContent = doc.title;
      const path = document.createElement('span');
      path.className = 'file-path';
      path.textContent = doc.path;
      const category = document.createElement('span');
      category.className = 'file-category';
      category.textContent = doc.category;
      button.append(title, path, category);
      button.addEventListener('click', () => selectDocument(doc.path, true));
      fragment.append(button);
    }
    els.list.append(fragment);
  }

  function addTag(container, text) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = text;
    container.append(tag);
  }

  function renderDocument(doc) {
    state.activePath = doc.path;
    const article = document.createElement('div');
    const header = document.createElement('header');
    header.className = 'doc-head';
    const title = document.createElement('h2');
    title.textContent = doc.title;
    const meta = document.createElement('div');
    meta.className = 'doc-meta';
    addTag(meta, doc.category);
    for (const tag of doc.tags) addTag(meta, `#${tag}`);
    const sourceLink = document.createElement('a');
    sourceLink.href = `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/${doc.path.split('/').map(encodeURIComponent).join('/')}`;
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    sourceLink.textContent = 'Mở file trên GitHub ↗';
    meta.append(sourceLink);
    header.append(title, meta);
    article.append(header);

    if (doc.frontmatter) {
      const details = document.createElement('details');
      details.className = 'frontmatter';
      const summary = document.createElement('summary');
      summary.textContent = 'Xem frontmatter';
      const pre = document.createElement('pre');
      pre.textContent = doc.frontmatter;
      details.append(summary, pre);
      article.append(details);
    }

    if (doc.error) {
      const error = document.createElement('div');
      error.className = 'error';
      error.textContent = `Không tải được nội dung file này (${doc.error}). Bạn có thể mở bản gốc trên GitHub.`;
      article.append(error);
    }

    const content = document.createElement('div');
    content.className = 'markdown';
    if (!doc.error && window.marked && window.DOMPurify) {
      const html = window.marked.parse(doc.body, { gfm: true, breaks: false });
      content.innerHTML = window.DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
      content.querySelectorAll('a[href]').forEach((link) => {
        if (link.origin !== window.location.origin) {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
      });
    } else if (!doc.error) {
      const pre = document.createElement('pre');
      pre.textContent = doc.body;
      content.append(pre);
    }
    article.append(content);
    els.reader.replaceChildren(article);
    renderFileList();
  }

  function selectDocument(path, updateHash) {
    const doc = state.documents.find((item) => item.path === path);
    if (!doc) return;
    renderDocument(doc);
    if (updateHash) history.replaceState(null, '', `#${encodeURIComponent(path)}`);
    if (window.matchMedia('(max-width: 650px)').matches) els.reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function getRepositoryTree() {
    const response = await fetch(`${API_ROOT}/git/trees/${BRANCH}?recursive=1`, {
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    });
    if (!response.ok) throw new Error(response.status === 403 ? 'GitHub API đang giới hạn truy vấn; thử lại sau ít phút.' : `Không đọc được danh sách repo (HTTP ${response.status}).`);
    const tree = await response.json();
    if (tree.truncated) throw new Error('Danh sách file GitHub trả về bị cắt; không thể bảo đảm đã lấy hết Markdown.');
    return tree;
  }

  async function fetchMarkdown(path) {
    const url = `${RAW_ROOT}/${path.split('/').map(encodeURIComponent).join('/')}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }

  async function loadRepository() {
    state.loading = true;
    const staleCache = readCache();
    if (staleCache) {
      restoreDocuments(staleCache.documents);
      setStatus('Đang hiển thị cache gần nhất trong lúc kiểm tra repository…');
    }
    try {
      const tree = await getRepositoryTree();
      const paths = tree.tree
        .filter((entry) => entry.type === 'blob' && entry.path.toLowerCase().endsWith('.md'))
        .map((entry) => entry.path)
        .sort((a, b) => a.localeCompare(b, 'vi'));
      if (!paths.length) throw new Error('Không tìm thấy file Markdown trong branch main.');
      const cached = readCache();
      if (cached && cached.treeSha === tree.sha && cached.documents.length === paths.length) {
        restoreDocuments(cached.documents);
        setStatus(`Đã tải ${state.documents.length} Markdown từ cache mới nhất của main.`);
        els.progress.style.width = '100%';
        state.loading = false;
        return;
      }

      const docs = new Array(paths.length);
      let next = 0;
      let completed = 0;
      let failed = 0;
      els.progress.style.width = '0%';
      setStatus(`Đang tải nội dung 0 / ${paths.length} Markdown…`);

      const worker = async () => {
        while (true) {
          const index = next++;
          if (index >= paths.length) return;
          const path = paths[index];
          try {
            docs[index] = { path, source: await fetchMarkdown(path) };
          } catch (error) {
            failed += 1;
            docs[index] = { path, source: '', error: error.message };
          }
          completed += 1;
          els.progress.style.width = `${Math.round((completed / paths.length) * 100)}%`;
          if (completed === paths.length || completed % 4 === 0) setStatus(`Đang tải nội dung ${completed} / ${paths.length} Markdown${failed ? ` · ${failed} lỗi` : ''}…`);
        }
      };
      await Promise.all(Array.from({ length: Math.min(6, paths.length) }, worker));
      const good = docs.filter((doc) => !doc.error);
      restoreDocuments(docs);
      const requestedPath = safeDecode(location.hash.slice(1));
      if (requestedPath && state.documents.some((doc) => doc.path === requestedPath)) selectDocument(requestedPath, false);
      if (!failed) writeCache(tree.sha, good);
      setStatus(`Đã tải ${good.length} / ${paths.length} Markdown từ main${failed ? ` · ${failed} file không tải được` : ''}.`);
      state.loading = false;
    } catch (error) {
      if (staleCache) {
        setStatus(`Không cập nhật được repo (${error.message}); đang dùng cache cũ gồm ${state.documents.length} file.`);
        els.progress.style.width = '100%';
      } else {
        els.list.replaceChildren();
        const message = document.createElement('div');
        message.className = 'error';
        message.textContent = `Không tải được danh sách Markdown: ${error.message} Hãy thử tải lại trang hoặc mở file trực tiếp trên GitHub.`;
        els.list.append(message);
        setStatus('Không kết nối được tới repository.');
      }
      state.loading = false;
    }
  }

  els.search.addEventListener('input', renderFileList);
  els.category.addEventListener('change', renderFileList);
  els.clear.addEventListener('click', () => {
    els.search.value = '';
    els.category.value = '';
    renderFileList();
  });
  window.addEventListener('hashchange', () => {
    const path = safeDecode(location.hash.slice(1));
    if (path) selectDocument(path, false);
  });

  loadRepository();
})();
