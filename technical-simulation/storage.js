(() => {
  'use strict';
  const NOTE_KEY = 'technical-sim-note';
  const CACHE_NAME = 'technical-simulation-cache-v1';
  const CACHE_URL = new URL('./demo-note.json', location.href).href;
  const DB_NAME = 'technical-simulation-db';
  const DB_VERSION = 1;
  const input = document.getElementById('noteInput');
  const list = document.getElementById('consoleList');
  const statusIds = { local: 'localStatus', session: 'sessionStatus', cache: 'cacheStatus', database: 'databaseStatus', history: 'historyStatus' };

  function stamp() { return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  function log(message, type = 'info') {
    if (!list) return;
    const empty = list.querySelector('.console-placeholder');
    empty?.remove();
    const item = document.createElement('li');
    item.className = `log-${type}`;
    item.textContent = `[${stamp()}] ${message}`;
    list.prepend(item);
  }
  function setStatus(name, value, saved) {
    const el = document.getElementById(statusIds[name]);
    if (!el) return;
    el.textContent = value;
    el.classList.toggle('is-saved', Boolean(saved));
  }
  function note() { return input?.value.trim() || 'Một ghi chú demo'; }
  function setInput(value) { if (input && value) input.value = value; }
  function safeGet(storage, key) { try { return storage.getItem(key); } catch (_) { return null; } }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB không được hỗ trợ'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => request.result.createObjectStore('notes', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Không mở được database'));
    });
  }
  async function putDatabase(value) {
    const db = await openDatabase();
    await new Promise((resolve, reject) => { const tx = db.transaction('notes', 'readwrite'); tx.objectStore('notes').put({ id: 'demo', text: value, savedAt: Date.now() }); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    db.close();
  }
  async function readDatabase() {
    try { const db = await openDatabase(); const result = await new Promise((resolve, reject) => { const tx = db.transaction('notes', 'readonly'); const request = tx.objectStore('notes').get('demo'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); db.close(); return result?.text || null; } catch (_) { return null; }
  }
  async function clearDatabase() { try { const db = await openDatabase(); await new Promise((resolve, reject) => { const tx = db.transaction('notes', 'readwrite'); tx.objectStore('notes').clear(); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); db.close(); } catch (_) {} }

  async function save(name) {
    const value = note();
    try {
      if (name === 'history') {
        const hash = `#note-${encodeURIComponent(value.slice(0, 28))}`;
        history.pushState({ note: value }, '', hash);
        setStatus('history', 'Đã thêm điểm', true); log('History: thêm một entry vào lịch sử điều hướng.', 'ok'); return;
      }
      if (name === 'local') { localStorage.setItem(NOTE_KEY, value); setStatus('local', 'Đã lưu', true); log('Local Storage: ghi note theo domain, còn sau reload.', 'ok'); return; }
      if (name === 'session') { sessionStorage.setItem(NOTE_KEY, value); setStatus('session', 'Đã lưu', true); log('Session Storage: ghi note cho tab hiện tại.', 'ok'); return; }
      if (name === 'cache') { const cache = await caches.open(CACHE_NAME); await cache.put(CACHE_URL, new Response(JSON.stringify({ text: value, savedAt: Date.now() }), { headers: { 'Content-Type': 'application/json' } })); setStatus('cache', 'Đã lưu bản sao', true); log('Cache: lưu một bản sao response để đọc nhanh.', 'ok'); return; }
      if (name === 'database') { await putDatabase(value); setStatus('database', 'Đã ghi bản ghi', true); log('Database: ghi một record có id demo vào IndexedDB.', 'ok'); }
    } catch (error) { log(`${name}: trình duyệt từ chối thao tác (${error.message}).`, 'warn'); }
  }
  async function saveAll() { for (const name of ['history', 'local', 'session', 'cache', 'database']) await save(name); }

  async function refreshStatuses() {
    const local = safeGet(localStorage, NOTE_KEY); const session = safeGet(sessionStorage, NOTE_KEY);
    setStatus('local', local ? 'Có dữ liệu' : 'Trống', Boolean(local)); setStatus('session', session ? 'Có dữ liệu' : 'Trống', Boolean(session));
    if (local && !input.value) setInput(local);
    try { const cache = await caches.open(CACHE_NAME); const response = await cache.match(CACHE_URL); setStatus('cache', response ? 'Có bản sao' : 'Trống', Boolean(response)); } catch (_) { setStatus('cache', 'Không hỗ trợ', false); }
    const db = await readDatabase(); setStatus('database', db ? 'Có bản ghi' : 'Trống', Boolean(db));
    setStatus('history', location.hash ? 'Đang có entry' : 'Sẵn sàng', Boolean(location.hash));
  }

  async function clearAll() {
    localStorage.removeItem(NOTE_KEY); sessionStorage.removeItem(NOTE_KEY); input.value = '';
    try { const cache = await caches.open(CACHE_NAME); await cache.delete(CACHE_URL); } catch (_) {}
    await clearDatabase(); history.replaceState({}, '', location.pathname + location.search);
    await refreshStatuses(); log('Đã xoá dữ liệu demo ở các ngăn kéo. Theme của trang không bị xoá.', 'warn');
  }
  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => save(button.dataset.action)));
  document.getElementById('saveAll')?.addEventListener('click', saveAll);
  document.getElementById('clearAll')?.addEventListener('click', clearAll);
  document.getElementById('clearLog')?.addEventListener('click', () => { list.innerHTML = '<li class="console-placeholder">Log đã được xoá. Hãy thử thêm thao tác.</li>'; });
  document.getElementById('reloadButton')?.addEventListener('click', () => { log('Đang reload: trình duyệt sẽ đọc lại các storage...', 'info'); setTimeout(() => location.reload(), 250); });
  document.getElementById('newTabButton')?.addEventListener('click', () => { const opened = window.open(location.href, '_blank', 'noopener'); log(opened ? 'Đã mở tab mới: local/cache/database có thể dùng lại, session là ngăn riêng.' : 'Trình duyệt chặn popup. Hãy cho phép mở tab để thử.', opened ? 'ok' : 'warn'); });
  document.getElementById('closeTabButton')?.addEventListener('click', async () => { sessionStorage.removeItem(NOTE_KEY); await refreshStatuses(); log('Giả lập đóng tab: sessionStorage của tab này đã được xoá.', 'warn'); });
  window.addEventListener('popstate', () => { setStatus('history', 'Đang ở entry khác', true); log('History: popstate — trạng thái điều hướng đã thay đổi.', 'info'); });
  input?.addEventListener('input', () => { if (input.value.trim()) document.querySelector('.guide-strip .guide-number')?.replaceChildren(document.createTextNode('02')); });
  const flowLab = document.getElementById('flowLab');
  const flowNodes = [...document.querySelectorAll('[data-flow-step]')];
  const flowArrows = [...document.querySelectorAll('[data-flow-arrow]')];
  const flowPacket = document.getElementById('flowPacket');
  const flowExplanation = document.getElementById('flowExplanation');
  const flowStorage = document.getElementById('flowStorage');
  const flowEvent = document.getElementById('flowEvent');
  const flowStorageLabel = document.getElementById('flowStorageLabel');
  const flowEventLabel = document.getElementById('flowEventLabel');
  const flowResultLabel = document.getElementById('flowResultLabel');
  let flowTimer;
  const storageNames = { local: 'Local Storage', session: 'Session Storage', cache: 'Cache', database: 'Database', history: 'History' };
  const eventNames = { reload: 'Reload trang', 'new-tab': 'Mở tab mới', 'close-tab': 'Đóng tab' };
  const flowCopy = [
    ['Bước 1 · Người dùng', 'Ghi chú là “món đồ” bạn muốn cất.'],
    ['Bước 2 · Ứng dụng', 'Ứng dụng nhìn vào mục đích rồi chọn ngăn phù hợp.'],
    ['Bước 3 · Storage', 'Trình duyệt ghi dữ liệu vào ngăn đang chọn: '],
    ['Bước 4 · Sự kiện', 'Bây giờ ta thay đổi tình huống: '],
    ['Bước 5 · Kết quả', 'Quan sát dữ liệu còn lại hay biến mất. Đây là điều cần nhớ khi thiết kế app.']
  ];
  function explainFlow(step, extra = '') {
    if (!flowExplanation) return;
    const [heading, copy] = flowCopy[step];
    flowExplanation.innerHTML = `<strong>${heading}</strong><span>${copy}${extra}</span>`;
  }
  function movePacket(step) { if (flowPacket) flowPacket.style.left = `${Math.min(92, 6 + step * 22)}%`; }
  function resetFlow() {
    clearInterval(flowTimer); flowLab?.classList.remove('is-running'); flowPacket?.classList.remove('is-running');
    flowNodes.forEach((node, index) => { node.classList.toggle('is-active', index === 0); node.classList.remove('is-done'); });
    flowArrows.forEach((arrow) => arrow.classList.remove('is-done'));
    movePacket(0);
    if (flowStorageLabel) flowStorageLabel.textContent = storageNames[flowStorage?.value || 'local'];
    if (flowEventLabel) flowEventLabel.textContent = eventNames[flowEvent?.value || 'reload'];
    if (flowResultLabel) flowResultLabel.textContent = 'đang chờ';
    explainFlow(0);
  }
  function runFlow() {
    resetFlow();
    const selectedStorage = flowStorage?.value || 'local';
    const selectedEvent = flowEvent?.value || 'reload';
    const total = flowNodes.length;
    let step = 0;
    flowLab?.classList.add('is-running'); flowPacket?.classList.add('is-running');
    if (flowStorageLabel) flowStorageLabel.textContent = storageNames[selectedStorage];
    if (flowEventLabel) flowEventLabel.textContent = eventNames[selectedEvent];
    log(`Flow animation: ${storageNames[selectedStorage]} → ${eventNames[selectedEvent]}.`, 'info');
    flowTimer = setInterval(() => {
      flowNodes[step]?.classList.remove('is-active'); flowNodes[step]?.classList.add('is-done');
      if (flowArrows[step]) flowArrows[step].classList.add('is-done');
      step += 1;
      movePacket(step);
      if (step >= total) {
        clearInterval(flowTimer); flowPacket?.classList.remove('is-running'); flowLab?.classList.remove('is-running');
        if (flowResultLabel) flowResultLabel.textContent = selectedEvent === 'close-tab' && selectedStorage === 'session' ? 'session biến mất' : 'có thể đọc lại';
        explainFlow(4, selectedEvent === 'close-tab' && selectedStorage === 'session' ? ' Session Storage thường mất khi tab đóng.' : ` ${storageNames[selectedStorage]} thường được đọc lại sau ${eventNames[selectedEvent].toLowerCase()}.`);
        log('Flow animation: đã tới kết quả. Hãy thử một lựa chọn khác để so sánh.', 'ok');
        return;
      }
      flowNodes[step]?.classList.add('is-active');
      const extra = step === 2 ? storageNames[selectedStorage] : step === 3 ? eventNames[selectedEvent] : '';
      explainFlow(step, extra ? ` ${extra}.` : '');
    }, 950);
  }
  document.getElementById('runFlow')?.addEventListener('click', runFlow);
  document.getElementById('resetFlow')?.addEventListener('click', resetFlow);
  flowStorage?.addEventListener('change', resetFlow); flowEvent?.addEventListener('change', resetFlow);
  resetFlow();
  refreshStatuses();
})();
