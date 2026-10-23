/* ============================================================
   Token Counter — main logic
   - 100% client‑side, không API, không upload.
   - Dùng gpt-tokenizer v4 qua ESM CDN.
   ============================================================ */

// ---------- Tokenizer imports (ESM CDN) ----------
// @4 hiện resolve thành 4.1.0 trên esm.sh
let encode_o200k = null; // GPT-4o / o1 / o3 — o200k_base
let encode_cl100k = null; // GPT-4 / GPT-3.5 — cl100k_base
let decode_o200k = null;  // dùng cho visualization
let tokenizerReady = false;

try {
  const modO = await import(
    'https://esm.sh/gpt-tokenizer@4/model/gpt-4o'
  );
  encode_o200k = modO.encode;
  decode_o200k = modO.decode;

  const modC = await import(
    'https://esm.sh/gpt-tokenizer@4/model/gpt-4'
  );
  encode_cl100k = modC.encode;

  tokenizerReady = true;
} catch (err) {
  console.warn('[TokenCounter] Tokenizer load failed, fallback to estimate.', err);
}

// ---------- Constants ----------
const DEBOUNCE_MS = 200;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const LARGE_TEXT_THRESHOLD = 500 * 1024; // 500KB
const CHUNK_SIZE = 50 * 1024; // 50KB
const VIZ_PAGE_SIZE = 2000;

/**
 * Model definitions.
 * `cost` = USD per 1M input tokens (null = không hiển thị cost).
 * `exact` = true nếu có tokenizer chính xác.
 * `approxFn` chỉ dùng khi không có tokenizer hoặc model approx.
 */
const MODELS = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o / o1 / o3',
    tokenizer: 'o200k_base',
    color: '#22c55e',
    cost: 2.5,
    exact: true,
    tokenKey: 'o200k',
  },
  {
    id: 'gpt-4',
    name: 'GPT-4 / GPT-3.5-turbo',
    tokenizer: 'cl100k_base',
    color: '#38bdf8',
    cost: 10.0,
    exact: true,
    tokenKey: 'cl100k',
  },
  {
    id: 'claude',
    name: 'Claude 3 / 3.5 / 4',
    tokenizer: 'approx',
    color: '#a78bfa',
    cost: 3.0,
    exact: false,
    tokenKey: 'claude',
  },
  {
    id: 'gemini',
    name: 'Gemini 1.5 / 2.0',
    tokenizer: 'approx',
    color: '#fbbf24',
    cost: 0.1,
    exact: false,
    tokenKey: 'gemini',
  },
  {
    id: 'llama',
    name: 'Llama 3',
    tokenizer: 'approx',
    color: '#f97316',
    cost: null,
    exact: false,
    tokenKey: 'llama',
  },
];

// ---------- State ----------
const state = {
  text: '',
  filename: '',
  fileSize: 0,
  lineCount: 0,
  isBinary: false,
  loading: false,
  tokenizerReady,
  tokens: {
    o200k: 0,
    cl100k: 0,
    claude: 0,
    gemini: 0,
    llama: 0,
  },
  stats: {
    chars: 0,
    charsNoSpace: 0,
    words: 0,
    lines: 0,
    bytes: 0,
  },
  vizOffset: 0,
  vizTokenIds: [],
};

// ---------- DOM refs ----------
const $ = (sel) => document.querySelector(sel);
const inputEl = $('#input');
const fileInputEl = $('#fileInput');
const uploadBtn = $('#uploadBtn');
const clearBtn = $('#clearBtn');
const fileInfoEl = $('#fileInfo');
const warningBanner = $('#warningBanner');
const errorBanner = $('#errorBanner');
const statChars = $('#statChars');
const statCharsNoSpace = $('#statCharsNoSpace');
const statWords = $('#statWords');
const statLines = $('#statLines');
const statBytes = $('#statBytes');
const tokenCardsEl = $('#tokenCards');
const copySummaryBtn = $('#copySummaryBtn');
const themeToggle = $('#themeToggle');
const vizToggle = $('#vizToggle');
const vizContainer = $('#vizContainer');
const vizContent = $('#vizContent');
const vizMoreBtn = $('#vizMoreBtn');
const dropOverlay = $('#dropOverlay');

// ============================================================
//  DEBOUNCE
// ============================================================
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ============================================================
//  STATS
// ============================================================
function computeStats(text) {
  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, '').length;
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const lines = text === '' ? 0 : text.split('\n').length;
  const bytes = new TextEncoder().encode(text).length;

  return { chars, charsNoSpace, words, lines, bytes };
}

// ============================================================
//  TOKENIZATION
// ============================================================

/**
 * Encode text với chunking nếu cần.
 * Trả về mảng token IDs.
 */
function encodeText(text, encodeFn) {
  if (!encodeFn) return null;

  if (text.length <= LARGE_TEXT_THRESHOLD) {
    return encodeFn(text);
  }

  // Chunk 50KB để tránh block UI / tràn stack
  const tokens = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    const chunkTokens = encodeFn(chunk);
    tokens.push(...chunkTokens);
  }
  return tokens;
}

/**
 * Tokenize toàn bộ text, cập nhật state.tokens.
 * Chạy trong setTimeout để không block UI.
 */
function tokenizeText() {
  const text = state.text;

  if (text === '') {
    state.tokens = { o200k: 0, cl100k: 0, claude: 0, gemini: 0, llama: 0 };
    state.vizTokenIds = [];
    renderTokenCards();
    return;
  }

  // Approx counts (luôn tính, dùng cho fallback hoặc model approx)
  const approxClaude = Math.ceil(state.stats.words * 1.3);
  const approxGemini = Math.ceil(state.stats.chars / 3.8);
  const approxLlama = Math.ceil(state.stats.chars / 3.5);

  if (!tokenizerReady) {
    // Fallback estimate: chars / 4
    const est = Math.ceil(state.stats.chars / 4);
    state.tokens = {
      o200k: est,
      cl100k: est,
      claude: approxClaude,
      gemini: approxGemini,
      llama: approxLlama,
    };
    state.vizTokenIds = [];
    renderTokenCards();
    showWarning('Không load được tokenizer, đang dùng ước lượng (chars / 4).');
    return;
  }

  // Tokenize o200k (GPT-4o)
  let o200kIds = null;
  try {
    o200kIds = encodeText(text, encode_o200k);
  } catch (e) {
    console.warn('o200k encode failed', e);
  }

  // Tokenize cl100k (GPT-4)
  let cl100kIds = null;
  try {
    cl100kIds = encodeText(text, encode_cl100k);
  } catch (e) {
    console.warn('cl100k encode failed', e);
  }

  state.tokens = {
    o200k: o200kIds ? o200kIds.length : Math.ceil(state.stats.chars / 4),
    cl100k: cl100kIds ? cl100kIds.length : Math.ceil(state.stats.chars / 4),
    claude: approxClaude,
    gemini: approxGemini,
    llama: approxLlama,
  };

  // Lưu token IDs cho visualization (chỉ GPT-4o)
  state.vizTokenIds = o200kIds || [];
  state.vizOffset = 0;

  renderTokenCards();
}

// ============================================================
//  RENDER — STATS
// ============================================================
function renderStats() {
  const s = state.stats;
  statChars.textContent = s.chars.toLocaleString();
  statCharsNoSpace.textContent = s.charsNoSpace.toLocaleString();
  statWords.textContent = s.words.toLocaleString();
  statLines.textContent = s.lines.toLocaleString();
  statBytes.textContent = s.bytes.toLocaleString();
}

// ============================================================
//  RENDER — TOKEN CARDS
// ============================================================
function renderTokenCards() {
  tokenCardsEl.innerHTML = '';

  for (const model of MODELS) {
    const count = state.tokens[model.tokenKey] ?? 0;
    const isExact = model.exact && tokenizerReady;
    const badgeClass = isExact ? 'tc-token-badge--exact' : 'tc-token-badge--approx';
    const badgeText = isExact ? 'exact' : 'approx';

    // Cost
    let costHtml = '';
    if (model.cost != null && count > 0) {
      const cost = (count / 1_000_000) * model.cost;
      costHtml = `<div class="tc-token-cost">Est. input cost: $${cost.toFixed(6)}</div>`;
    }

    const card = document.createElement('div');
    card.className = 'tc-token-card';
    card.style.setProperty('--card-accent', model.color);
    card.innerHTML = `
      <span class="tc-token-dot"></span>
      <div class="tc-token-main">
        <div class="tc-token-name">
          ${model.name}
          <span class="tc-token-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="tc-tokenizer">${model.tokenizer}</div>
        <div class="tc-token-count" data-count="${model.tokenKey}">
          ${isExact ? '' : '≈'}${count.toLocaleString()}
        </div>
        ${costHtml}
      </div>
      <div class="tc-token-actions">
        <button class="tc-copy-token" data-copy="${model.tokenKey}" title="Copy số token">📋</button>
      </div>
    `;

    tokenCardsEl.appendChild(card);
  }

  // Gắn sự kiện copy
  tokenCardsEl.querySelectorAll('.tc-copy-token').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.copy;
      const val = state.tokens[key] ?? 0;
      copyToClipboard(String(val), btn);
    });
  });
}

// ============================================================
//  RENDER — VISUALIZATION
// ============================================================
const VIZ_COLORS = [
  'rgba(34,197,94,0.25)',
  'rgba(56,189,248,0.25)',
  'rgba(167,139,250,0.25)',
  'rgba(251,191,36,0.25)',
  'rgba(249,115,22,0.25)',
];

function renderVisualization() {
  if (!tokenizerReady || !decode_o200k || state.vizTokenIds.length === 0) {
    vizContent.innerHTML =
      '<span style="color:var(--muted,#9ca3af)">Không có dữ liệu token để hiển thị.</span>';
    vizMoreBtn.hidden = true;
    return;
  }

  const start = state.vizOffset;
  const end = Math.min(start + VIZ_PAGE_SIZE, state.vizTokenIds.length);
  const slice = state.vizTokenIds.slice(start, end);

  const frag = document.createDocumentFragment();

  slice.forEach((id, idx) => {
    let str = '';
    try {
      str = decode_o200k([id]);
    } catch {
      str = '?';
    }
    if (str === '') str = '·';

    const span = document.createElement('span');
    span.textContent = str;
    span.style.background = VIZ_COLORS[(start + idx) % VIZ_COLORS.length];
    frag.appendChild(span);
  });

  if (start === 0) {
    vizContent.innerHTML = '';
  }
  vizContent.appendChild(frag);

  // More button
  vizMoreBtn.hidden = end >= state.vizTokenIds.length;
}

// ============================================================
//  MAIN UPDATE
// ============================================================
function updateAll() {
  const text = inputEl.value;
  state.text = text;
  state.stats = computeStats(text);
  state.lineCount = state.stats.lines;

  renderStats();

  // Tokenize trong setTimeout để không block UI
  setTimeout(() => {
    tokenizeText();
    if (!vizContainer.hidden) {
      renderVisualization();
    }
  }, 0);
}

const debouncedUpdate = debounce(updateAll, DEBOUNCE_MS);

// ============================================================
//  FILE HANDLING
// ============================================================
function isBinaryBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let suspicious = 0;
  const len = Math.min(bytes.length, 100);
  for (let i = 0; i < len; i++) {
    const b = bytes[i];
    if (b < 9 || b > 126) suspicious++;
  }
  return suspicious / len > 0.3;
}

async function handleFile(file) {
  // Reset
  hideError();
  hideWarning();

  if (!file) return;

  // Kích thước
  if (file.size > MAX_FILE_SIZE) {
    showError('File lớn hơn 5MB. Có thể mất vài giây… Visualization sẽ bị tắt.');
    // Vẫn cho đọc, nhưng disable viz
    vizToggle.disabled = true;
  } else {
    vizToggle.disabled = false;
  }

  state.filename = file.name;
  state.fileSize = file.size;

  // Detect binary
  try {
    const headBuffer = await file.slice(0, 100).arrayBuffer();
    if (isBinaryBuffer(headBuffer)) {
      state.isBinary = true;
      showError('File này có vẻ không phải text (binary detected).');
      return;
    }
  } catch (e) {
    console.warn('Binary detect failed', e);
  }

  state.isBinary = false;

  // Show spinner (đơn giản: disable textarea + hiện loading)
  showLoading(true);

  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    inputEl.value = text;
    state.text = text;

    // File info
    fileInfoEl.hidden = false;
    fileInfoEl.textContent = `📄 ${file.name} — ${formatBytes(file.size)} — ${state.stats.lines} lines`;

    updateAll();
    showLoading(false);
  };
  reader.onerror = () => {
    showError('Không đọc được file.');
    showLoading(false);
  };
  reader.readAsText(file, 'utf-8');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================
//  UI HELPERS
// ============================================================
function showWarning(msg) {
  warningBanner.hidden = false;
  warningBanner.textContent = msg;
}
function hideWarning() {
  warningBanner.hidden = true;
  warningBanner.textContent = '';
}
function showError(msg) {
  errorBanner.hidden = false;
  errorBanner.textContent = msg;
}
function hideError() {
  errorBanner.hidden = true;
  errorBanner.textContent = '';
}
function showLoading(on) {
  state.loading = on;
  inputEl.disabled = on;
  uploadBtn.disabled = on;
  clearBtn.disabled = on;
  if (on) {
    // Có thể thêm spinner overlay nhỏ
    document.body.style.cursor = 'progress';
  } else {
    document.body.style.cursor = '';
  }
}

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = '✅';
      setTimeout(() => (btn.textContent = orig), 1200);
    }
  } catch (e) {
    console.warn('Copy failed', e);
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

// ============================================================
//  COPY SUMMARY
// ============================================================
function buildSummary() {
  const s = state.stats;
  const t = state.tokens;

  const lines = [
    `Characters: ${s.chars}`,
    `Words: ${s.words}`,
    `Lines: ${s.lines}`,
    `GPT-4o: ${t.o200k} tokens${t.o200k ? ` ($${((t.o200k / 1_000_000) * 2.5).toFixed(6)})` : ''}`,
    `GPT-4: ${t.cl100k} tokens`,
    `Claude: ≈${t.claude} tokens`,
  ];

  return lines.join('\n');
}

// ============================================================
//  THEME
// ============================================================
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.dataset.theme = saved;
  } else {
    // fallback prefers-color-scheme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
  }
  updateThemeIcon();
}

function updateThemeIcon() {
  const isDark = document.documentElement.dataset.theme !== 'light';
  themeToggle.textContent = isDark ? '🌙' : '☀️';
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  updateThemeIcon();
}

// ============================================================
//  QUERY PARAM PREFILL
// ============================================================
function initPrefill() {
  const params = new URLSearchParams(location.search);
  const prefill = params.get('prefill');
  if (prefill) {
    inputEl.value = prefill;
    // Không auto-focus
    return true;
  }
  return false;
}

// ============================================================
//  DRAG & DROP
// ============================================================
let dragCounter = 0;

function initDragDrop() {
  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dropOverlay.hidden = false;
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropOverlay.hidden = true;
    }
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.hidden = true;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  });
}

// ============================================================
//  KEYBOARD SHORTCUT (Ctrl/Cmd + V trên body)
// ============================================================
function initKeyboardShortcut() {
  document.addEventListener('keydown', async (e) => {
    const isMod = e.ctrlKey || e.metaKey;
    if (!isMod || e.key.toLowerCase() !== 'v') return;

    const active = document.activeElement;
    if (active === inputEl) return; // đang ở textarea thì bỏ qua

    e.preventDefault();

    // Best effort: đọc clipboard và paste vào textarea
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        inputEl.value = text;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.focus();
      }
    } catch (err) {
      // Nếu không có quyền, chỉ focus textarea
      inputEl.focus();
      showWarning('Hãy nhấn Ctrl/Cmd + V lần nữa để paste vào ô text.');
    }
  });
}

// ============================================================
//  EVENT BINDINGS
// ============================================================
function bindEvents() {
  // Textarea
  inputEl.addEventListener('input', debouncedUpdate);

  // Upload
  uploadBtn.addEventListener('click', () => fileInputEl.click());
  fileInputEl.addEventListener('change', () => {
    const file = fileInputEl.files?.[0];
    if (file) handleFile(file);
    fileInputEl.value = ''; // reset để upload lại cùng file
  });

  // Clear
  clearBtn.addEventListener('click', () => {
    inputEl.value = '';
    state.filename = '';
    state.fileSize = 0;
    state.isBinary = false;
    fileInfoEl.hidden = true;
    fileInfoEl.textContent = '';
    vizToggle.disabled = false;
    hideError();
    hideWarning();
    updateAll();
    inputEl.focus();
  });

  // Copy summary
  copySummaryBtn.addEventListener('click', () => {
    copyToClipboard(buildSummary(), copySummaryBtn);
  });

  // Theme
  themeToggle.addEventListener('click', toggleTheme);

  // Visualization toggle
  vizToggle.addEventListener('click', () => {
    const expanded = vizToggle.getAttribute('aria-expanded') === 'true';
    vizToggle.setAttribute('aria-expanded', String(!expanded));
    vizContainer.hidden = expanded;

    if (!expanded) {
      // Mở → render
      state.vizOffset = 0;
      vizContent.innerHTML = '';
      renderVisualization();
    }
  });

  // Viz more
  vizMoreBtn.addEventListener('click', () => {
    state.vizOffset += VIZ_PAGE_SIZE;
    renderVisualization();
  });

  // Drag & drop
  initDragDrop();

  // Keyboard shortcut
  initKeyboardShortcut();
}

// ============================================================
//  INIT
// ============================================================
function init() {
  initTheme();
  bindEvents();

  const hasPrefill = initPrefill();

  // Auto-focus nếu không có prefill
  if (!hasPrefill) {
    inputEl.focus();
  }

  // Nếu tokenizer fail, hiện banner ngay
  if (!tokenizerReady) {
    showWarning('Không load được tokenizer, đang dùng ước lượng (chars / 4).');
  }

  // Tính toán lần đầu
  updateAll();
}

init();
