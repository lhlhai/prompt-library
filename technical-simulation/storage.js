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
  let svgNodes = [];
  let svgPaths = [];
  const liveFlowScene = document.getElementById('liveFlowScene');
  const svgHarnessLabel = document.querySelector('.flow-harness-label');
  const flowScenarioTitle = document.getElementById('flowScenarioTitle');
  const svgPacket = document.getElementById('svgPacket');
  const svgStorageLabel = document.getElementById('svgStorageLabel');
  const svgEventLabel = document.getElementById('svgEventLabel');
  let svgResultLabel = document.getElementById('svgResultLabel');
  let flowTimer;
  let allLaneTimer;
  const storageNames = { all: 'All browser storage', local: 'Local Storage', session: 'Session Storage', cache: 'Cache', database: 'Database', cookies: 'Cookies', history: 'History' };
  const eventNames = { reload: 'Reload trang', 'new-tab': 'Mở tab mới', 'close-tab': 'Đóng tab' };
  const flowCopy = [
    ['Bước 1 · Người dùng', 'Ghi chú là “món đồ” bạn muốn cất.'],
    ['Bước 2 · Ứng dụng', 'Ứng dụng nhìn vào mục đích rồi chọn ngăn phù hợp.'],
    ['Bước 3 · Storage', 'Trình duyệt ghi dữ liệu vào ngăn đang chọn: '],
    ['Bước 4 · Sự kiện', 'Bây giờ ta thay đổi tình huống: '],
    ['Bước 5 · Kết quả', 'Quan sát dữ liệu còn lại hay biến mất. Đây là điều cần nhớ khi thiết kế app.']
  ];
  const flowBlueprints = {
    all: { title: 'ALL · browser storage phối hợp', color: '#a78bfa', nodes: [['👤','User action','login / settings'],['🧭','Ứng dụng','decision router'],['⇢','Khi nào dùng gì?','6 mục đích',['Session · form đang mở','Local · cài đặt lâu dài','Cache · tải ảnh / CSS','Cookies · gửi lên server','Database · nhiều records','History · đổi URL']],['🔄','Events','reload · request · URL'],['✓','Kết quả','trải nghiệm liền mạch']], paths: ['M205 220 C245 220 260 220 305 220','M455 220 C495 220 510 220 555 220','M705 220 C745 220 760 220 805 220','M850 270 C850 340 670 370 560 315'] },
    local: { title: 'LOCAL · reload vẫn còn', color: '#22c55e', nodes: [['👤','Người dùng','cài đặt'],['🧭','Ứng dụng','setItem()'],['▣','Local Storage','theo domain'],['🔄','Reload trang','đọc lại'],['✓','Kết quả','vẫn còn']], paths: ['M205 220 C245 220 260 220 305 220','M455 220 C495 220 510 220 555 220','M705 220 C745 220 760 220 805 220','M850 270 C850 340 670 370 560 315'] },
    session: { title: 'SESSION · mỗi tab một ngăn riêng', color: '#f59e0b', nodes: [['👤','Tab A','đang nhập form'],['↔','Session Storage','Tab A only'],['↗','Tab B','không thấy'],['✕','Đóng tab A','xoá ngăn'],['∅','Kết quả','mất dữ liệu']], paths: ['M205 220 C245 220 260 220 305 220','M455 220 C495 220 510 220 555 220','M705 220 C745 220 760 220 805 220','M850 270 C850 340 670 370 560 315'] },
    cache: { title: 'CACHE · cache hit hoặc miss', color: '#a78bfa', nodes: [['🌐','Request','cần tài nguyên'],['⚡','Cache lookup','hit / miss'],['✓','Cache HIT','trả ngay'],['⇩','Cache MISS','ra network'],['🚀','Response','nhanh hơn']], paths: ['M205 220 C245 220 260 220 305 220','M455 220 C495 220 510 220 555 220','M705 220 C745 220 760 220 805 220','M850 270 C850 340 670 370 560 315'] },
    database: { title: 'DATABASE · transaction → query → records', color: '#38bdf8', nodes: [['👤','User action','thêm bản ghi'],['▤','Transaction','ghi an toàn'],['⌗','IndexedDB','nhiều records'],['⌕','Query / index','tìm dữ liệu'],['▤','Result set','danh sách']], paths: ['M205 220 C245 220 260 220 305 220','M455 220 C495 220 510 220 555 220','M705 220 C745 220 760 220 805 220','M850 270 C850 340 670 370 560 315'] },
    cookies: { title: 'COOKIES · browser → request → server', color: '#f97316', nodes: [['🌐','Browser','document.cookie'],['🍪','Cookie jar','key = value'],['⇧','Request header','gửi cùng request'],['🖥️','Server','đọc cookie'],['↩','Response','session / prefs']], paths: ['M205 220 C245 220 260 220 305 220','M455 220 C495 220 510 220 555 220','M705 220 C745 220 760 220 805 220','M850 270 C850 340 670 370 560 315'] },
    history: { title: 'HISTORY · URL → Back / Forward', color: '#fb7185', nodes: [['👤','Người dùng','đổi URL'],['↗','History API','pushState()'],['↶','Browser history','entry stack'],['←','Back / Forward','popstate'],['✓','Kết quả','đổi màn hình']], paths: ['M205 220 C245 220 260 220 305 220','M455 220 C495 220 510 220 555 220','M705 220 C745 220 760 220 805 220','M850 270 C850 340 670 370 560 315'] }
  };
  function renderLiveFlow(kind) {
    const blueprint = flowBlueprints[kind] || flowBlueprints.local;
    if (!liveFlowScene) return;
    liveFlowScene.innerHTML = `<g class="live-wires">${blueprint.paths.map((d, i) => `<path id="svgPath${i}" class="live-wire" d="${d}" marker-end="url(#flowArrowHead)"></path>`).join('')}</g>${blueprint.nodes.map((node, i) => { const x = [65,305,555,805,430][i]; const y = i === 4 ? 300 : 175; const w = i === 3 ? 125 : i === 4 ? 160 : i === 0 ? 140 : 150; const laneClass = kind === 'all' && i === 2 ? ' all-lane' : ''; const details = node[3] ? node[3].map((line, index) => `<text class="live-detail${laneClass}" x="${w / 2}" y="${78 + index * 11}">${line}</text>`).join('') : ''; const h = node[3] ? 142 : i === 4 ? 82 : 90; return `<g class="live-node${i === 4 ? ' live-result' : ''}${node[3] ? ' live-hub' : ''}" data-svg-step="${i}" transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="17"></rect><text class="live-emoji" x="18" y="36">${node[0]}</text><text class="live-title" x="${w / 2 + 8}" y="38">${node[1]}</text><text class="live-caption" x="${w / 2}" y="62"${i === 4 ? ' id="svgResultLabel"' : ''}>${node[2]}</text>${details}</g>`; }).join('')}`;
    svgNodes = [...liveFlowScene.querySelectorAll('[data-svg-step]')]; svgPaths = [...liveFlowScene.querySelectorAll('.live-wire')];
    svgResultLabel = liveFlowScene.querySelector('#svgResultLabel');
    if (svgHarnessLabel) { svgHarnessLabel.textContent = blueprint.title; svgHarnessLabel.style.fill = blueprint.color; }
    if (flowScenarioTitle) { flowScenarioTitle.textContent = blueprint.title; flowScenarioTitle.style.color = blueprint.color; flowScenarioTitle.style.borderColor = `${blueprint.color}66`; }
    if (svgStorageLabel) svgStorageLabel.textContent = storageNames[kind];
    resetSvgFlow();
  }
  function explainFlow(step, extra = '') {
    if (!flowExplanation) return;
    const [heading, copy] = flowCopy[step];
    flowExplanation.innerHTML = `<strong>${heading}</strong><span>${copy}${extra}</span>`;
  }
  function movePacket(step) { if (flowPacket) flowPacket.style.left = `${Math.min(92, 6 + step * 22)}%`; }
  function moveSvgPacket(pathIndex) {
    const path = svgPaths[pathIndex];
    if (!path || !svgPacket) return;
    const length = path.getTotalLength(); const started = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / 820); const point = path.getPointAtLength(length * progress);
      svgPacket.setAttribute('cx', point.x); svgPacket.setAttribute('cy', point.y);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const allLaneExplanations = [
    'Session Storage: dùng khi dữ liệu chỉ cần sống trong tab hiện tại, như form đang nhập.',
    'Local Storage: dùng cho cài đặt nhỏ cần nhớ sau reload, như theme hoặc ngôn ngữ.',
    'Cache: dùng khi muốn tải lại ảnh, CSS hoặc response nhanh hơn.',
    'Cookies: dùng khi server cần nhận biết phiên đăng nhập hoặc preferences trong request.',
    'Database: dùng khi có nhiều records cần tìm, sửa, xoá hoặc query.',
    'History: dùng khi thay đổi URL và cần Back / Forward.'
  ];
  function resetAllLanes() {
    clearInterval(allLaneTimer); document.querySelectorAll('.all-lane').forEach((lane) => lane.classList.remove('is-lane-active'));
  }
  function animateAllLanes() {
    resetAllLanes(); const lanes = [...document.querySelectorAll('.all-lane')]; let index = 0;
    if (!lanes.length) return;
    const show = () => { lanes.forEach((lane, i) => lane.classList.toggle('is-lane-active', i === index)); explainFlow(2, ` ${allLaneExplanations[index]}`); index = (index + 1) % lanes.length; };
    show(); allLaneTimer = setInterval(show, 850);
  }
  function resetSvgFlow() {
    resetAllLanes();
    svgNodes.forEach((node, index) => { node.classList.toggle('is-active', index === 0); node.classList.remove('is-done'); });
    svgPaths.forEach((path) => path.classList.remove('is-active', 'is-done'));
    svgPacket?.classList.remove('is-running'); svgPacket?.setAttribute('cx', '115'); svgPacket?.setAttribute('cy', '220');
    if (svgStorageLabel) svgStorageLabel.textContent = storageNames[flowStorage?.value || 'local'];
    if (svgEventLabel) svgEventLabel.textContent = eventNames[flowEvent?.value || 'reload'].replace(' trang', '');
    if (svgResultLabel) svgResultLabel.textContent = 'đang chờ';
  }
  function resetFlow() {
    clearInterval(flowTimer); flowLab?.classList.remove('is-running'); flowPacket?.classList.remove('is-running');
    flowNodes.forEach((node, index) => { node.classList.toggle('is-active', index === 0); node.classList.remove('is-done'); });
    flowArrows.forEach((arrow) => arrow.classList.remove('is-done'));
    movePacket(0);
    resetSvgFlow();
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
    svgPacket?.classList.add('is-running');
    if (flowStorageLabel) flowStorageLabel.textContent = storageNames[selectedStorage];
    if (flowEventLabel) flowEventLabel.textContent = eventNames[selectedEvent];
    if (svgStorageLabel) svgStorageLabel.textContent = storageNames[selectedStorage];
    if (svgEventLabel) svgEventLabel.textContent = eventNames[selectedEvent].replace(' trang', '');
    log(`Flow animation: ${storageNames[selectedStorage]} → ${eventNames[selectedEvent]}.`, 'info');
    flowTimer = setInterval(() => {
      flowNodes[step]?.classList.remove('is-active'); flowNodes[step]?.classList.add('is-done');
      if (flowArrows[step]) flowArrows[step].classList.add('is-done');
      svgNodes[step]?.classList.remove('is-active'); svgNodes[step]?.classList.add('is-done');
      if (svgPaths[step]) { svgPaths[step].classList.add('is-active'); moveSvgPacket(step); }
      if (selectedStorage === 'all' && step === 2) animateAllLanes();
      step += 1;
      movePacket(step);
      if (step >= total) {
        clearInterval(flowTimer); clearInterval(allLaneTimer); flowPacket?.classList.remove('is-running'); svgPacket?.classList.remove('is-running'); flowLab?.classList.remove('is-running');
        const finalResult = selectedStorage === 'all' ? 'trải nghiệm liền mạch' : selectedEvent === 'close-tab' && selectedStorage === 'session' ? 'session biến mất' : 'có thể đọc lại';
        if (flowResultLabel) flowResultLabel.textContent = finalResult;
        if (svgResultLabel) svgResultLabel.textContent = finalResult;
        const finalExtra = selectedStorage === 'all' ? ' Mỗi loại đã xử lý một mục đích khác nhau: session cho tab, local cho cài đặt, cache cho tốc độ, cookies cho server, database cho records và history cho URL.' : selectedEvent === 'close-tab' && selectedStorage === 'session' ? ' Session Storage thường mất khi tab đóng.' : ` ${storageNames[selectedStorage]} thường được đọc lại sau ${eventNames[selectedEvent].toLowerCase()}.`;
        explainFlow(4, finalExtra);
        log('Flow animation: đã tới kết quả. Hãy thử một lựa chọn khác để so sánh.', 'ok');
        return;
      }
      flowNodes[step]?.classList.add('is-active');
      svgNodes[step]?.classList.add('is-active');
      const extra = step === 2 ? storageNames[selectedStorage] : step === 3 ? eventNames[selectedEvent] : '';
      if (!(selectedStorage === 'all' && step === 3)) explainFlow(step, extra ? ` ${extra}.` : '');
    }, 950);
  }
  document.getElementById('runFlow')?.addEventListener('click', runFlow);
  document.getElementById('resetFlow')?.addEventListener('click', resetFlow);
  flowStorage?.addEventListener('change', () => { renderLiveFlow(flowStorage.value); resetFlow(); }); flowEvent?.addEventListener('change', resetFlow);
  renderLiveFlow(flowStorage?.value || 'local');
  resetFlow();
  refreshStatuses();
})();
