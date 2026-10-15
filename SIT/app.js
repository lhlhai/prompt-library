/* Test Scope Lab — state and rendering without dependencies. */
(() => {
  'use strict';

  const state = {
    activeTab: 'simulation', running: false, mode: null, speed: 1,
    logs: [], quizIndex: 0, quizScore: 0, quizAnswered: false
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const svg = $('#systemDiagram');
  const runButtons = ['#runIT', '#runST', '#runSIT', '#runAll'].map(selector => $(selector));
  const scopeBadge = $('#scopeBadge');
  const scopeText = $('#scopeText');
  const logList = $('#logList');
  const runStatus = $('#runStatus');
  const comparisonResult = $('#comparisonResult');
  const speedSelect = $('#speedSelect');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const wait = (ms) => new Promise(resolve => window.setTimeout(resolve, ms));
  const duration = (base) => reducedMotion ? Math.min(140, base / 5) : base / state.speed;

  function setBusy(busy) {
    state.running = busy;
    runButtons.forEach(button => { button.disabled = busy; });
    $('#resetButton').disabled = busy;
    speedSelect.disabled = busy;
    runStatus.textContent = busy ? 'Đang chạy…' : 'Sẵn sàng';
  }

  function renderLogs() {
    logList.replaceChildren();
    if (!state.logs.length) {
      const item = document.createElement('li');
      item.className = 'log-placeholder';
      item.textContent = 'Kết quả từng bước sẽ xuất hiện tại đây.';
      logList.append(item);
      return;
    }
    state.logs.forEach(log => {
      const item = document.createElement('li');
      item.className = log.kind === 'info' ? 'log-info' : '';
      item.textContent = log.text;
      logList.append(item);
    });
  }

  function addLog(text, kind = 'pass') {
    state.logs.push({ text, kind });
    renderLogs();
  }

  function setMode(mode) {
    state.mode = mode;
    svg.classList.remove('mode-it', 'mode-st', 'mode-sit');
    if (mode) svg.classList.add(`mode-${mode}`);
    $$('.container').forEach(container => container.classList.remove('is-muted', 'is-lit'));
    $$('.node').forEach(node => node.classList.remove('is-muted', 'is-pulsing', 'is-passed'));
    $$('.edge').forEach(edge => edge.classList.remove('is-active', 'is-passed'));
    if (mode === 'it') {
      $('.container-c').classList.add('is-muted');
    } else if (mode === 'st') {
      $('.container-a').classList.add('is-lit');
      $('.container-b').classList.add('is-lit');
      $('.container-c').classList.add('is-muted');
    } else if (mode === 'sit') {
      $$('.container').forEach(container => container.classList.add('is-lit'));
    }
    const labels = {
      it: ['it', 'Scope: SMALL — within a single system'],
      st: ['st', 'Scope: FULL SYSTEM — black-box'],
      sit: ['sit', 'Scope: CROSS-SYSTEM — multiple deployable units']
    };
    if (mode && labels[mode]) {
      scopeBadge.dataset.kind = labels[mode][0];
      scopeText.textContent = labels[mode][1];
    } else {
      delete scopeBadge.dataset.kind;
      scopeText.textContent = 'Chọn kịch bản để xem phạm vi';
    }
  }

  function resetState() {
    setMode(null);
    state.logs = [];
    comparisonResult.hidden = true;
    renderLogs();
    setBusy(false);
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const isLight = theme === 'light';
    $('.theme-icon').textContent = isLight ? '☾' : '☼';
    $('.theme-label').textContent = isLight ? 'Giao diện tối' : 'Giao diện sáng';
    try { localStorage.setItem('test-scope-theme', theme); } catch (_) { /* Storage may be disabled for file URLs. */ }
  }

  function pulseNodes(nodeNames) {
    nodeNames.forEach(name => {
      const node = $(`[data-node="${name}"]`);
      if (node) node.classList.add('is-pulsing');
    });
  }

  function markNodesPassed(nodeNames) {
    nodeNames.forEach(name => {
      const node = $(`[data-node="${name}"]`);
      if (node) {
        node.classList.remove('is-pulsing');
        node.classList.add('is-passed');
      }
    });
  }

  function animateEdge(edgeName, nodeNames) {
    const edge = $(`[data-edge="${edgeName}"]`);
    if (!edge) return Promise.resolve();
    const line = $('path', edge);
    const circle = $('.edge-dot', edge);
    const motion = $('animateMotion', circle);
    const mpath = $('mpath', motion);
    const path = $(`#${mpath.getAttribute('href').slice(1)}`);
    // Fast visual fallback when SMIL is unavailable: the edge still highlights and pulses.
    edge.classList.add('is-active');
    pulseNodes(nodeNames);
    if (motion && typeof motion.beginElement === 'function') {
      const seconds = duration(800) / 1000;
      motion.setAttribute('dur', `${seconds}s`);
      circle.style.opacity = '1';
      try { motion.beginElement(); } catch (_) { /* CSS line highlight remains as fallback. */ }
    } else if (path && circle) {
      circle.style.opacity = '1';
      circle.setAttribute('cx', path.getPointAtLength(0).x);
      circle.setAttribute('cy', path.getPointAtLength(0).y);
      const start = performance.now();
      const total = duration(800);
      const move = (now) => {
        const progress = Math.min(1, (now - start) / total);
        const point = path.getPointAtLength(path.getTotalLength() * progress);
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        if (progress < 1) requestAnimationFrame(move);
      };
      requestAnimationFrame(move);
    }
    return wait(duration(800)).then(() => {
      circle.style.opacity = '0';
      edge.classList.remove('is-active');
      edge.classList.add('is-passed');
      markNodesPassed(nodeNames);
    });
  }

  async function runIntegrationTest() {
    setMode('it');
    addLog('▶ Bắt đầu IT: chỉ kiểm tra kết nối giữa module trong cùng container.', 'info');
    const steps = [
      ['ui-auth', ['ui', 'auth'], 'UI ↔ Auth'],
      ['payment-db', ['payment', 'database'], 'Payment ↔ Database'],
      ['payment-notification', ['payment', 'notification'], 'Payment ↔ Notification']
    ];
    for (const [edge, nodes, label] of steps) {
      await animateEdge(edge, nodes);
      addLog(`✅ [IT] ${label}: PASS`);
      await wait(duration(180));
    }
    return 'it';
  }

  async function runSystemTest() {
    setMode('st');
    addLog('▶ Bắt đầu ST: toàn bộ hệ thống được xem như black-box.', 'info');
    pulseNodes(['ui', 'auth', 'payment', 'database', 'notification']);
    await wait(duration(1050));
    $$('.node').forEach(node => node.classList.remove('is-pulsing'));
    addLog('✅ [ST] End-to-end user flow: PASS');
    return 'st';
  }

  async function runSIT() {
    setMode('sit');
    addLog('▶ Bắt đầu SIT: kiểm tra giao tiếp qua ranh giới các hệ thống.', 'info');
    await animateEdge('auth-payment', ['auth', 'payment']);
    addLog('✅ [SIT] Frontend ↔ Backend: PASS');
    await wait(duration(180));
    await animateEdge('payment-bank', ['payment', 'bank']);
    await animateEdge('notification-bank', ['notification', 'bank']);
    addLog('✅ [SIT] Backend ↔ Bank API / Notification: PASS');
    return 'sit';
  }

  async function runOne(kind) {
    if (state.running) return;
    resetState();
    setBusy(true);
    try {
      if (kind === 'it') await runIntegrationTest();
      else if (kind === 'st') await runSystemTest();
      else await runSIT();
      runStatus.textContent = 'Hoàn tất';
    } finally { setBusy(false); }
  }

  async function runAll() {
    if (state.running) return;
    resetState();
    setBusy(true);
    try {
      await runIntegrationTest();
      await wait(duration(1500));
      await runSystemTest();
      await wait(duration(1500));
      await runSIT();
      comparisonResult.hidden = false;
      comparisonResult.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
      runStatus.textContent = 'Hoàn tất · IT → ST → SIT';
    } finally { setBusy(false); }
  }

  // Accessible tab behavior: click or use Left/Right/Home/End while focused.
  const tabs = $$('.tab-button');
  function activateTab(name, focus = false) {
    state.activeTab = name;
    tabs.forEach(tab => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
      const panel = $(`#panel-${tab.dataset.tab}`);
      panel.hidden = !active;
      panel.classList.toggle('is-visible', active);
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      activateTab(tabs[next].dataset.tab, true);
    });
  });

  const questions = [
    { text: 'Một developer kiểm tra Auth Service đọc đúng tài khoản từ Database trong cùng ứng dụng. Đây là loại test nào?', answer: 'it', explanation: 'Hai module trong cùng một hệ thống đang được kiểm tra tại interface giữa chúng: đó là Integration Test.' },
    { text: 'QA làm theo requirement: người dùng đăng ký, nhận xác nhận và kiểm tra hành vi của sản phẩm hoàn chỉnh mà không soi module bên trong. Đây là gì?', answer: 'st', explanation: 'Toàn hệ thống được kiểm tra end-to-end theo requirement theo cách black-box: đó là System Test.' },
    { text: 'Payment Service gọi Bank API độc lập, sau đó phát message qua Kafka để Notification Service gửi thông báo. Đây là gì?', answer: 'sit', explanation: 'Luồng đi qua các service/deployable units riêng biệt và kết nối mạng/message broker: đây là System Integration Test.' },
    { text: 'Một nhóm chỉ xác minh rằng API nội bộ chuyển dữ liệu chính xác từ module Login sang Auth Service trong cùng ứng dụng. Chọn loại phù hợp nhất.', answer: 'it', explanation: 'Phạm vi chỉ là interface giữa một vài module trong cùng hệ thống, không phải toàn hệ thống hay liên hệ thống.' },
    { text: 'Tester xác minh hệ thống thương mại điện tử hoàn chỉnh đáp ứng yêu cầu đặt hàng từ lúc bấm “Đặt hàng” đến khi thấy trang xác nhận. Đây là gì?', answer: 'st', explanation: 'Mục tiêu là hành vi toàn bộ hệ thống theo requirement từ đầu vào đến đầu ra; đó là System Test.' }
  ];
  const answerLabels = { it: 'Integration Test (IT)', st: 'System Test (ST)', sit: 'System Integration Test (SIT)', unit: 'Unit Test' };

  function renderQuestion() {
    const question = questions[state.quizIndex];
    state.quizAnswered = false;
    $('#quizCount').textContent = `Câu ${state.quizIndex + 1} / ${questions.length}`;
    $('#quizScorePreview').textContent = `Đúng: ${state.quizScore}`;
    $('#progressBar').style.width = `${((state.quizIndex + 1) / questions.length) * 100}%`;
    $('#questionText').textContent = question.text;
    const choices = [
      ['it', answerLabels.it], ['st', answerLabels.st], ['sit', answerLabels.sit], ['unit', answerLabels.unit]
    ];
    const options = $('#quizOptions');
    options.replaceChildren();
    choices.forEach(([value, label], index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quiz-option';
      button.dataset.answer = value;
      const letter = document.createElement('span');
      letter.className = 'option-letter';
      letter.textContent = String.fromCharCode(65 + index);
      button.append(letter, document.createTextNode(label));
      button.addEventListener('click', () => chooseAnswer(button, value));
      options.append(button);
    });
    $('#quizFeedback').hidden = true;
    $('#quizNext').hidden = true;
  }

  function chooseAnswer(selectedButton, value) {
    if (state.quizAnswered) return;
    state.quizAnswered = true;
    const question = questions[state.quizIndex];
    const correct = value === question.answer;
    if (correct) state.quizScore += 1;
    $$('.quiz-option').forEach(button => {
      button.disabled = true;
      if (button.dataset.answer === question.answer) button.classList.add('is-correct');
    });
    if (!correct) selectedButton.classList.add('is-wrong');
    $('#quizScorePreview').textContent = `Đúng: ${state.quizScore}`;
    const feedback = $('#quizFeedback');
    feedback.className = `quiz-feedback ${correct ? 'is-correct' : 'is-wrong'}`;
    const title = document.createElement('strong');
    title.textContent = correct ? 'Chính xác!' : `Chưa đúng — đáp án: ${answerLabels[question.answer]}.`;
    feedback.replaceChildren(title, document.createTextNode(question.explanation));
    feedback.hidden = false;
    $('#quizNext').textContent = state.quizIndex === questions.length - 1 ? 'Xem kết quả →' : 'Câu tiếp theo →';
    $('#quizNext').hidden = false;
  }

  function showQuizResult() {
    $('#quizCard').hidden = true;
    $('#quizResult').hidden = false;
    $('#finalScore').textContent = `${state.quizScore} / ${questions.length} câu đúng`;
    $('#finalMessage').textContent = state.quizScore === questions.length
      ? 'Tuyệt vời — bạn đã phân biệt chính xác ba phạm vi.'
      : state.quizScore >= 3
        ? 'Khá tốt! Hãy nhớ: module trong hệ thống = IT; toàn hệ thống black-box = ST; nhiều hệ thống độc lập = SIT.'
        : 'Hãy xem lại mục So sánh rồi thử lại. Tập trung vào ranh giới của đối tượng được kiểm tra.';
  }

  $('#quizNext').addEventListener('click', () => {
    if (state.quizIndex >= questions.length - 1) showQuizResult();
    else { state.quizIndex += 1; renderQuestion(); }
  });
  $('#restartQuiz').addEventListener('click', () => {
    state.quizIndex = 0; state.quizScore = 0;
    $('#quizCard').hidden = false;
    $('#quizResult').hidden = true;
    renderQuestion();
  });

  $('#runIT').addEventListener('click', () => runOne('it'));
  $('#runST').addEventListener('click', () => runOne('st'));
  $('#runSIT').addEventListener('click', () => runOne('sit'));
  $('#runAll').addEventListener('click', runAll);
  $('#resetButton').addEventListener('click', resetState);
  speedSelect.addEventListener('change', () => { state.speed = Number(speedSelect.value) || 1; });
  $('#themeToggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));

  try {
    const savedTheme = localStorage.getItem('test-scope-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
    else setTheme('dark');
  } catch (_) { setTheme('dark'); }
  renderLogs();
  renderQuestion();
})();
