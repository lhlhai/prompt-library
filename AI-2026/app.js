/* AI Pattern Lab — toàn bộ flow là mock, không gọi API thật. */
(() => {
  'use strict';

  const state = { activeTab: 'simulation', mode: null, running: false, step: 0, speed: 1, logs: [], quizIndex: 0, quizScore: 0, answered: false };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const diagram = $('#mainDiagram');

  // Single source of truth for every AI pattern exposed by the static app.
  // Maintainers can disable a feature here without editing multiple UI sections.
  const PATTERN_CONFIG = Object.freeze([
    { key: 'oneshot', order: '01', label: 'Zero / One-shot', buttonLabel: 'One-shot', buttonClass: 'p-one', badge: '1 LLM call · stateless · no tools', enabled: true, playground: true, theoryClass: 't-one', exampleFile: '01-zero-one-shot.md', summary: ['1', 'Một prompt, không/ít ví dụ; không tool'] },
    { key: 'fewshot', order: '02', label: 'Few-shot', buttonLabel: 'Few-shot', buttonClass: 'p-few', badge: '1 LLM call · N examples in context', enabled: true, playground: true, theoryClass: 't-few', exampleFile: '02-few-shot.md', summary: ['1', 'Nhiều ví dụ trong context window'] },
    { key: 'planning', order: '03', label: 'Planning', buttonLabel: 'Planning', buttonClass: 'p-plan', badge: '1 + N LLM calls · sequential reasoning · no tools', enabled: true, playground: true, theoryClass: 't-plan', exampleFile: '03-planning.md', summary: ['1 + N', 'Chia bước tuần tự; không nhất thiết có tool'] },
    { key: 'tool', order: '04', label: 'Tool Use', buttonLabel: 'Tool Use', buttonClass: 'p-tool', badge: '2 LLM calls · 1 tool call · single-shot tool', enabled: true, playground: true, theoryClass: 't-tool', exampleFile: '04-tool-use.md', summary: ['Thường 2', 'Một vòng function call rồi trả kết quả'] },
    { key: 'agent', order: '05', label: 'Agent · ReAct', buttonLabel: 'Agent', buttonClass: 'p-agent', badge: 'N LLM calls (dynamic) · tools + memory · loop until done', enabled: true, playground: true, theoryClass: 't-agent', exampleFile: '05-agent-react.md', summary: ['N, động', 'Lặp thought/action/observation tới goal'] },
    { key: 'skill', order: '06', label: 'Skill', buttonLabel: 'Skill', buttonClass: 'p-skill', badge: 'Packaged capability · reusable · composable', enabled: true, playground: true, theoryClass: 't-skill', exampleFile: '06-skill.md', summary: ['Tùy flow', 'Capability tái sử dụng; Caller/Agent chọn, Runtime/Harness nạp và enforce quyền'] },
    { key: 'harness', order: '07', label: 'Harness', buttonLabel: 'Harness', buttonClass: 'p-harness', badge: 'Runtime layer · context + tools + memory + loop + guardrails', enabled: true, playground: true, theoryClass: 't-harness', exampleFile: '07-harness.md', summary: ['N + overhead', 'Runtime điều phối context, tools, memory, guardrails'] }
  ]);
  const patternByKey = new Map(PATTERN_CONFIG.map(pattern => [pattern.key, pattern]));
  const activePatterns = () => PATTERN_CONFIG.filter(pattern => pattern.enabled);
  const modeKeys = activePatterns().map(pattern => pattern.key);
  const modeNames = Object.fromEntries(PATTERN_CONFIG.map(pattern => [pattern.key, pattern.label]));
  const modeBadges = Object.fromEntries(PATTERN_CONFIG.map(pattern => [pattern.key, pattern.badge]));
  const githubExampleBase = 'https://github.com/lhlhai/prompt-library/blob/main/AI-2026/';
  const speedSelect = $('#speedSelect');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function sleep(baseMs) {
    return new Promise(resolve => window.setTimeout(resolve, reducedMotion ? 0 : baseMs / state.speed));
  }

  function setBusy(value) {
    state.running = value;
    $$('[data-run-mode], #runAllButton, #resetButton, #speedSelect, [data-play-pattern]').forEach(button => { button.disabled = value; });
    if (value) $('#runStatus').textContent = 'Đang chạy…';
  }

  function renderPatternRegistry() {
    const enabled = activePatterns();
    const simulationStrip = $('#patternStrip');
    const playgroundButtons = $('#playButtons');
    if (simulationStrip) {
      simulationStrip.replaceChildren();
      enabled.forEach(pattern => {
        const button = document.createElement('button');
        button.className = `pattern-button ${pattern.buttonClass}`;
        button.type = 'button';
        button.dataset.runMode = pattern.key;
        const order = document.createElement('span');
        order.textContent = pattern.order;
        button.append(order, document.createTextNode(pattern.buttonLabel));
        simulationStrip.append(button);
      });
    }
    if (playgroundButtons) {
      playgroundButtons.replaceChildren();
      enabled.filter(pattern => pattern.playground).forEach(pattern => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.playPattern = pattern.key;
        button.textContent = `Run as ${pattern.buttonLabel}`;
        playgroundButtons.append(button);
      });
    }
    PATTERN_CONFIG.forEach(pattern => {
      const card = $(`.theory-card.${pattern.theoryClass}`);
      if (!card) return;
      card.hidden = !pattern.enabled;
      const link = $('.markdown-example-link', card);
      if (link) {
        link.dataset.patternKey = pattern.key;
        link.href = `${githubExampleBase}${pattern.exampleFile}`;
        link.replaceChildren(document.createTextNode(`📄 Xem ví dụ Markdown · ${pattern.label}`));
        const arrow = document.createElement('span');
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '↗';
        link.append(arrow);
      }
    });
    const summaryBody = $('#summaryBody');
    if (summaryBody) {
      summaryBody.replaceChildren();
      enabled.forEach(pattern => {
        const row = document.createElement('tr');
        const name = document.createElement('th');
        name.scope = 'row';
        name.textContent = pattern.label;
        const calls = document.createElement('td');
        calls.textContent = pattern.summary[0];
        const difference = document.createElement('td');
        difference.textContent = pattern.summary[1];
        row.append(name, calls, difference);
        summaryBody.append(row);
      });
    }
    const count = $('#summaryPatternCount');
    if (count) count.textContent = `${enabled.length} PATTERN`;
  }

  function renderLogs() {
    const list = $('#logList');
    list.replaceChildren();
    if (!state.logs.length) {
      const empty = document.createElement('li');
      empty.className = 'console-placeholder';
      empty.textContent = 'Chọn một pattern để xem các sự kiện theo thứ tự.';
      list.append(empty);
      return;
    }
    state.logs.forEach(entry => {
      const item = document.createElement('li');
      item.className = `log-${entry.type}`;
      const time = document.createElement('time');
      time.dateTime = entry.iso;
      time.textContent = entry.time;
      const text = document.createElement('span');
      text.textContent = entry.text;
      item.append(time, text);
      list.append(item);
    });
    list.scrollTop = list.scrollHeight;
  }

  function addLog(text, type = 'info') {
    const now = new Date();
    state.logs.push({ text, type, iso: now.toISOString(), time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
    renderLogs();
  }

  function resetVisuals() {
    modeKeys.forEach(key => diagram.classList.remove(`mode-${key}`));
    $$('.node').forEach(node => node.classList.remove('is-pulsing', 'is-lit', 'is-blocked'));
    $$('.wire').forEach(wire => wire.classList.remove('is-active', 'is-passed'));
    $('#agentLoop').classList.remove('is-running');
    $('#planLoop').classList.remove('is-running');
    $('#packetDot').style.opacity = '0';
    $('#packetText').style.opacity = '0';
    $('#callCounter').textContent = 'ready';
    $('#exampleStack').hidden = true;
    $('#planPanel').hidden = true;
    $('#toolBubble').hidden = true;
    $('#skillPanel').hidden = true;
    $('#runSummary').hidden = true;
    $$('#planSteps li').forEach(step => step.classList.remove('is-active', 'is-done'));
    $$('.example-chips span').forEach(chip => chip.classList.remove('is-added'));
    $('#stepCounter').textContent = 'Đang chuẩn bị…';
  }

  // Render trạng thái pattern lên SVG, badge và trạng thái của các node.
  function renderDiagram(currentState = state) {
    const mode = currentState.mode;
    const badge = $('#modeBadge');
    if (!mode) {
      badge.removeAttribute('data-mode');
      $('#modeBadgeText').textContent = 'Mode: Chưa chạy';
      return;
    }
    diagram.classList.add(`mode-${mode}`);
    badge.dataset.mode = mode;
    $('#modeBadgeText').textContent = `Mode: ${modeNames[mode]} · ${modeBadges[mode]}`;
  }

  function setMode(mode) {
    resetVisuals();
    state.mode = mode;
    state.step = 0;
    renderDiagram(state);
  }

  function resetSimulation() {
    if (state.running) return;
    setMode(null);
    state.logs = [];
    renderLogs();
    $('#runStatus').textContent = 'Sẵn sàng';
  }

  function colorFor(mode = state.mode) {
    return getComputedStyle(document.documentElement).getPropertyValue({ oneshot: '--memory', fewshot: '--memory', planning: '--llm', tool: '--tool', agent: '--llm', skill: '--memory', harness: '--harness' }[mode] || '--llm').trim();
  }

  // Nội suy vị trí packet trên SVG path bằng getPointAtLength và requestAnimationFrame.
  async function animatePacket(edgeName, label = 'message', mode = state.mode, ms = 650) {
    const wire = $(`[data-edge="${edgeName}"]`);
    const path = wire && $('path', wire);
    if (!path) return;
    const dot = $('#packetDot');
    const text = $('#packetText');
    const total = path.getTotalLength();
    const color = colorFor(mode);
    wire.classList.add('is-active');
    dot.style.fill = color;
    dot.style.opacity = '1';
    text.style.opacity = '1';
    text.textContent = label;
    const setAt = (fraction) => {
      const point = path.getPointAtLength(total * fraction);
      dot.setAttribute('cx', point.x);
      dot.setAttribute('cy', point.y);
      text.setAttribute('x', point.x + 10);
      text.setAttribute('y', point.y - 12);
    };
    if (reducedMotion) {
      setAt(1);
    } else {
      await new Promise(resolve => {
        const duration = ms / state.speed;
        let start = null;
        const frame = (time) => {
          if (start === null) start = time;
          const progress = Math.min(1, (time - start) / duration);
          setAt(progress);
          if (progress < 1) requestAnimationFrame(frame); else resolve();
        };
        requestAnimationFrame(frame);
      });
    }
    dot.style.opacity = '0';
    text.style.opacity = '0';
    wire.classList.remove('is-active');
    wire.classList.add('is-passed');
  }

  async function pulseNode(name, ms = 450) {
    const node = $(`[data-node="${name}"]`);
    if (!node) return;
    node.classList.add('is-pulsing', 'is-lit');
    $('#callCounter').textContent = 'processing…';
    await sleep(ms);
    node.classList.remove('is-pulsing');
    $('#callCounter').textContent = state.mode === 'agent' ? 'ReAct loop' : state.mode === 'harness' ? 'runtime call' : 'call complete';
  }

  function showToolCall(json) {
    $('#toolBubble').hidden = false;
    $('#toolJson').textContent = JSON.stringify(json, null, 2);
  }

  async function runOneShot() {
    addLog('Prompt → LLM: 1 request, không có ví dụ mẫu.', 'info');
    await animatePacket('prompt-llm', 'prompt');
    await pulseNode('llm');
    await animatePacket('llm-output', 'answer');
    addLog('Output → câu trả lời trực tiếp · không tool, không memory.', 'ok');
  }

  async function runFewShot() {
    $('#exampleStack').hidden = false;
    addLog('Thêm 3 examples vào context window; model weights không thay đổi.', 'info');
    const chips = [$('#exampleChip1'), $('#exampleChip2'), $('#exampleChip3')];
    for (let i = 0; i < chips.length; i += 1) {
      await animatePacket('prompt-llm', `Ex ${i + 1}`, state.mode, 200);
      chips[i].classList.add('is-added');
      await sleep(70);
    }
    $('#queryChip').classList.add('is-added');
    await animatePacket('prompt-llm', 'query');
    addLog('3 examples + query → một lần gọi LLM (context dài hơn).', 'info');
    await pulseNode('llm', 780);
    await animatePacket('llm-output', 'answer');
    addLog('Output theo pattern mẫu · vẫn là 1 LLM call.', 'ok');
  }

  async function runPlanning() {
    $('#planPanel').hidden = false;
    addLog('Prompt → LLM: lập kế hoạch giải bài toán (mock).', 'info');
    await animatePacket('prompt-llm', 'task');
    await pulseNode('llm');
    addLog('Plan được chia thành 4 bước; bắt đầu thực thi tuần tự.', 'info');
    const steps = $$('#planSteps li');
    for (let i = 0; i < steps.length; i += 1) {
      state.step = i + 1;
      steps.forEach(item => item.classList.remove('is-active'));
      steps[i].classList.add('is-active');
      if (i > 0) steps[i - 1].classList.add('is-done');
      $('#stepCounter').textContent = `Step ${i + 1}/${steps.length} · LLM call`;
      $('#planLoop').classList.add('is-running');
      addLog(`Execute step ${i + 1}/${steps.length}: ${steps[i].textContent}.`, 'info');
      await pulseNode('llm', 380);
      await sleep(120);
    }
    state.step = steps.length;
    steps[steps.length - 1].classList.add('is-done');
    $('#stepCounter').textContent = '4/4 · plan complete';
    $('#planLoop').classList.remove('is-running');
    await animatePacket('llm-output', 'final');
    addLog('Final answer · planning không cần tool trong ví dụ này.', 'ok');
  }

  async function runToolUse() {
    $('#toolBubble').hidden = false;
    showToolCall({ name: 'weather', args: { city: 'Hanoi' } });
    addLog('LLM: “I need a tool: weather_api” (function-call JSON).', 'info');
    await animatePacket('prompt-llm', 'task');
    await pulseNode('llm');
    await animatePacket('llm-tools', 'tool call');
    await pulseNode('tools', 550);
    addLog('Tool weather(city=Hanoi) → 28°C [mock data].', 'warn');
    await animatePacket('tools-llm', 'result');
    await pulseNode('llm');
    await animatePacket('llm-output', 'answer');
    addLog('LLM: “Hà Nội 28°C” · một vòng tool rồi kết thúc.', 'ok');
  }

  async function runAgent() {
    $('#agentLoop').classList.add('is-running');
    addLog('Memory/scratchpad bật · bắt đầu vòng ReAct (demo 3 iterations).', 'info');
    await animatePacket('prompt-llm', 'goal');
    const iterations = [
      { thought: 'cần tìm đơn hàng #42', action: 'search_orders("#42")', observation: 'đã tiếp nhận; cần trạng thái vận chuyển' },
      { thought: 'cần kiểm tra tracking', action: 'track_shipment("#42")', observation: 'đang giao; cập nhật lúc 10:30 [mock]' },
      { thought: 'đã đủ dữ kiện để trả lời', action: 'finish', observation: 'goal đạt; dừng loop' }
    ];
    for (let i = 0; i < iterations.length; i += 1) {
      state.step = i + 1;
      const step = iterations[i];
      addLog(`Thought ${i + 1}: ${step.thought}.`, 'info');
      await pulseNode('llm', 330);
      if (step.action !== 'finish') {
        showToolCall({ name: step.action.split('(')[0], args: { order: '#42' } });
        addLog(`Action ${i + 1}: ${step.action}.`, 'warn');
        await animatePacket('llm-tools', 'action');
        await pulseNode('tools', 350);
        await animatePacket('tools-llm', 'observation');
      }
      addLog(`Observation ${i + 1}: ${step.observation}.`, i === iterations.length - 1 ? 'ok' : 'info');
      await pulseNode('memory', 260);
      await sleep(180);
    }
    $('#agentLoop').classList.remove('is-running');
    await animatePacket('llm-output', 'final');
    addLog('Final Answer → đơn #42 đang được giao [demo].', 'ok');
  }

  async function runSkill() {
    $('#skillPanel').hidden = false;
    addLog('[caller/agent] Chọn skill “summarize_article” vì task có quy trình lặp lại.', 'info');
    await animatePacket('prompt-llm', 'task');
    addLog('[runtime/harness] Nạp instructions + examples + tool reference; cùng package có thể tái sử dụng.', 'info');
    await pulseNode('llm', 380);
    addLog('[skill] Định nghĩa các bước read → summarize; không tự suy luận hay thực thi tool.', 'info');
    showToolCall({ name: 'read_article', args: { source: 'sample_article' } });
    await animatePacket('llm-tools', 'read');
    await pulseNode('tools', 280);
    addLog('[runtime] Thực thi read_article và kiểm tra quyền tool.', 'warn');
    await animatePacket('tools-llm', 'article');
    await pulseNode('llm', 380);
    await animatePacket('llm-output', 'summary');
    addLog('Output theo cùng tiêu chuẩn; Skill giúp reuse + consistency, còn runtime enforce quyền.', 'ok');
  }

  async function runHarness() {
    addLog('[harness] build context (system + tool schema + memory).', 'info');
    await animatePacket('prompt-context', 'prompt');
    await pulseNode('context', 300);
    await animatePacket('context-llm', 'context');
    await pulseNode('llm', 400);
    addLog('[llm] call #1 → đề xuất tool bulk_delete_users.', 'warn');
    showToolCall({ name: 'bulk_delete_users', args: { scope: 'all' } });
    await animatePacket('llm-guardrails', 'validate');
    const guardrails = $('[data-node="guardrails"]');
    guardrails.classList.add('is-blocked', 'is-lit');
    await pulseNode('guardrails', 280);
    addLog('[harness] validate tool → ⛔ blocked: hành động destructive không được phép.', 'block');
    await sleep(220);
    guardrails.classList.remove('is-blocked');
    addLog('[llm] call #2 → chuyển sang tool đọc trạng thái an toàn.', 'info');
    showToolCall({ name: 'get_order_status', args: { order_id: '#42' } });
    await animatePacket('llm-tools', 'allowed tool');
    await pulseNode('tools', 350);
    addLog('[harness] validate tool → ok · [tool] exec → “đang giao” [mock].', 'ok');
    await animatePacket('tools-llm', 'result');
    await pulseNode('llm', 350);
    await animatePacket('llm-output', 'final');
    addLog('[llm] call #3 → final · [harness] return + log.', 'ok');
  }

  const runners = { oneshot: runOneShot, fewshot: runFewShot, planning: runPlanning, tool: runToolUse, agent: runAgent, skill: runSkill, harness: runHarness };
  async function playAnimation(mode) {
    const pattern = patternByKey.get(mode);
    if (!pattern || !pattern.enabled || typeof runners[mode] !== 'function') throw new Error(`Pattern không khả dụng: ${mode}`);
    setMode(mode);
    $('#runStatus').textContent = `Đang chạy ${pattern.label}…`;
    addLog(`── ${pattern.label} ──`, 'info');
    await runners[mode]();
  }

  // Sau khi bấm nút đang sticky, đưa sơ đồ xuống dưới header/dock để không che node trên cùng.
  function alignDiagramBelowControls() {
    const headerHeight = $('.app-header').getBoundingClientRect().height;
    const dockHeight = $('.simulation-dock').getBoundingClientRect().height;
    const diagramTop = $('#stageCard').getBoundingClientRect().top + window.scrollY;
    const top = Math.max(0, diagramTop - headerHeight - dockHeight - 8);
    window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  async function runSingle(mode) {
    if (state.running) return;
    resetSimulation();
    alignDiagramBelowControls();
    setBusy(true);
    try {
      await playAnimation(mode);
      $('#runStatus').textContent = 'Hoàn tất';
    } catch (error) {
      addLog(`Lỗi mô phỏng: ${error.message}`, 'block');
      $('#runStatus').textContent = 'Có lỗi';
    } finally { setBusy(false); }
  }

  async function runAll() {
    if (state.running) return;
    resetSimulation();
    alignDiagramBelowControls();
    setBusy(true);
    try {
      for (let i = 0; i < modeKeys.length; i += 1) {
        await playAnimation(modeKeys[i]);
        if (i < modeKeys.length - 1) {
          addLog('Run All: tạm nghỉ 1.5 giây trước pattern kế tiếp.', 'info');
          await sleep(1500);
        }
      }
      $('#runSummary').hidden = false;
      $('#runStatus').textContent = `Hoàn tất · ${modeKeys.length} pattern`;
      $('#runSummary').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    } catch (error) {
      addLog(`Lỗi mô phỏng: ${error.message}`, 'block');
      $('#runStatus').textContent = 'Có lỗi';
    } finally { setBusy(false); }
  }

  const tabs = $$('.tab-button');
  function activateTab(name, focus = false) {
    state.activeTab = name;
    tabs.forEach((tab, index) => {
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

  function mockOutput(task, mode) {
    const normalized = task.toLowerCase();
    if (/15\s*%|15 phần trăm/.test(normalized) && /200/.test(normalized)) return '15% của 200.000đ = 30.000đ. (Kết quả mock minh họa)';
    if (/vé máy bay|chuyến bay|book|flight/.test(normalized)) return 'Để chọn chuyến rẻ nhất cần ngày đi, điểm đến và dữ liệu giá trực tiếp. Flow demo không truy cập hãng bay.';
    const name = modeNames[mode] || 'Pattern';
    return `Đã mô phỏng “${task.slice(0, 95)}” qua ${name}. Đây là output mẫu, không phải kết quả từ model.`;
  }

  async function runPlayground(mode) {
    if (state.running) return;
    const task = $('#taskInput').value.trim();
    if (!task) {
      $('#taskInput').focus();
      $('#playPatternLabel').textContent = 'Hãy nhập task trước';
      return;
    }
    setBusy(true);
    $('#playPatternLabel').textContent = `${modeNames[mode]} · MOCK`;
    $('#playOutput').textContent = 'Đang mô phỏng…';
    const flows = {
      oneshot: ['Prompt: task + instruction', 'LLM call #1', 'Output trực tiếp'],
      fewshot: ['Prompt + examples trong context', 'LLM call #1', 'Output theo pattern mẫu'],
      planning: ['LLM tạo plan', 'Thực hiện các bước tuần tự', 'Tổng hợp final answer'],
      tool: ['LLM đề xuất function call', 'Runtime thực thi tool mock', 'LLM nhận result và trả lời'],
      agent: ['Thought: xác định goal', 'Action: gọi tool mock', 'Observation: đọc kết quả', 'Lặp / kết thúc khi đạt goal'],
      skill: ['Caller/Agent chọn capability phù hợp task', 'Nạp procedure + examples + tool references', 'LLM áp dụng cùng quy tắc/format', 'Runtime thực thi tool và kiểm tra quyền', 'Tái sử dụng Skill cho task tương tự'],
      harness: ['Build context + tool schema + history', 'LLM đề xuất action', 'Guardrail kiểm tra quyền', 'Runtime thực thi an toàn / chặn', 'Trả kết quả + log']
    };
    const list = $('#playFlow');
    list.replaceChildren();
    try {
      for (const step of flows[mode]) {
        const item = document.createElement('li');
        item.textContent = step;
        item.className = 'is-active';
        list.append(item);
        await sleep(240);
        item.classList.remove('is-active');
      }
      $('#playOutput').textContent = mockOutput(task, mode);
    } finally { setBusy(false); }
  }

  const quizQuestions = [
    { q: 'Bạn đưa model task rõ ràng, không kèm ví dụ; cần phân loại một ticket trong một request. Pattern nào?', a: 0, o: ['Zero-shot prompting', 'Few-shot prompting', 'Agent', 'Harness'], e: 'Không có ví dụ và chỉ cần một phản hồi trực tiếp: zero-shot.' },
    { q: 'Bạn thêm 3 cặp câu mẫu vào prompt để model áp dụng cùng format cho câu mới; không cập nhật weights. Đây là gì?', a: 1, o: ['Fine-tuning', 'Few-shot prompting', 'Planning', 'Skill'], e: 'Examples chỉ nằm trong context của request, nên đây là few-shot chứ không phải fine-tuning.' },
    { q: 'Một bài toán được tách thành “đọc đề → lập biến → giải → kiểm tra”, không gọi tool ngoài. Pattern trọng tâm?', a: 2, o: ['Tool Use', 'Harness', 'Planning / Decomposition', 'Few-shot'], e: 'Trọng tâm là chia bài toán thành các bước có thứ tự: planning.' },
    { q: 'LLM gửi function-call JSON một lần; app chạy weather API và gửi kết quả lại để model trả lời. Đây là gì?', a: 0, o: ['Tool Use / Function Calling', 'Agent loop', 'Few-shot', 'Skill'], e: 'Một vòng function call qua runtime là Tool Use; chưa đủ để gọi là agent loop.' },
    { q: 'Sau mỗi kết quả tìm kiếm, model quyết định tiếp tục gọi công cụ hay kết thúc; lặp tới khi đạt goal. Đây là gì?', a: 1, o: ['One-shot', 'Agent · ReAct loop', 'Tool Use đơn lẻ', 'Fine-tuning'], e: 'Loop dựa trên action và observation mới là đặc trưng của agent.' },
    { q: 'Nhiều Agent cần áp dụng cùng quy trình phân loại bug và format báo cáo; muốn cập nhật/test quy trình một chỗ. Chọn gì?', a: 2, o: ['Một tool function', 'Harness', 'Skill', 'Zero-shot'], e: 'Skill đóng gói procedure/examples để reuse và giữ output nhất quán. Caller/Agent chọn nó; runtime nạp và enforce quyền. Skill không tự suy luận hoặc thực thi tool.' },
    { q: 'Lớp runtime tạo context, lưu history, cấp tool registry, quản lý loop và chặn thao tác nguy hiểm là gì?', a: 3, o: ['Planning', 'Few-shot', 'Agent', 'Harness'], e: 'Đó là Harness: lớp runtime bao quanh và điều phối model/agent.' },
    { q: 'Điểm khác nhau quan trọng nhất giữa Tool Use và Agent là gì?', a: 1, o: ['Tool Use luôn an toàn hơn', 'Agent lặp theo observation; tool use có thể chỉ một vòng', 'Agent không được dùng tools', 'Tool Use cần fine-tune'], e: 'Tool Use mô tả tương tác với function; Agent nhấn mạnh loop quyết định tiếp theo dựa trên observation.' },
    { q: 'Bạn đã có agent policy, muốn thêm context building, logging, retry, guardrails và quản lý quyền trong production. Cần gì?', a: 2, o: ['Thêm one-shot example', 'Chuyển thành few-shot', 'Harness runtime', 'Thêm một tool rồi gọi xong'], e: 'Harness cung cấp runtime controls và có thể chạy agent hoặc các kiểu flow khác.' }
  ];

  function renderQuestion() {
    const item = quizQuestions[state.quizIndex];
    state.answered = false;
    $('#quizCount').textContent = `Câu ${state.quizIndex + 1} / ${quizQuestions.length}`;
    $('#quizScore').textContent = `Đúng: ${state.quizScore}`;
    $('#quizProgress').style.transform = `scaleX(${(state.quizIndex + 1) / quizQuestions.length})`;
    $('#questionText').textContent = item.q;
    const options = $('#quizOptions');
    options.replaceChildren();
    item.o.forEach((label, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quiz-option';
      button.dataset.index = String(index);
      const letter = document.createElement('span');
      letter.className = 'option-letter';
      letter.textContent = String.fromCharCode(65 + index);
      button.append(letter, document.createTextNode(label));
      button.addEventListener('click', () => chooseAnswer(button, index));
      options.append(button);
    });
    $('#quizFeedback').hidden = true;
    $('#quizNext').hidden = true;
  }

  function chooseAnswer(selected, index) {
    if (state.answered) return;
    state.answered = true;
    const item = quizQuestions[state.quizIndex];
    const correct = index === item.a;
    if (correct) state.quizScore += 1;
    $$('.quiz-option').forEach(button => {
      button.disabled = true;
      if (Number(button.dataset.index) === item.a) button.classList.add('is-correct');
    });
    if (!correct) selected.classList.add('is-wrong');
    $('#quizScore').textContent = `Đúng: ${state.quizScore}`;
    const feedback = $('#quizFeedback');
    feedback.className = `quiz-feedback ${correct ? 'is-correct' : 'is-wrong'}`;
    const title = document.createElement('strong');
    title.textContent = correct ? 'Đúng rồi.' : `Chưa đúng. Đáp án: ${item.o[item.a]}.`;
    feedback.replaceChildren(title, document.createTextNode(item.e));
    feedback.hidden = false;
    $('#quizNext').textContent = state.quizIndex === quizQuestions.length - 1 ? 'Xem kết quả →' : 'Câu tiếp theo →';
    $('#quizNext').hidden = false;
  }

  function showQuizResult() {
    $('#quizCard').hidden = true;
    $('#quizResult').hidden = false;
    $('#finalScore').textContent = `${state.quizScore} / ${quizQuestions.length} câu đúng`;
    $('#finalMessage').textContent = state.quizScore >= 7 ? 'Rất tốt — bạn đã nắm vai trò của prompt, tool, Skill, Agent và Harness.' : 'Ôn lại bảng so sánh: phân biệt số calls, loop, tool, capability và runtime rồi thử lại.';
  }

  $('#quizNext').addEventListener('click', () => {
    if (state.quizIndex === quizQuestions.length - 1) showQuizResult();
    else { state.quizIndex += 1; renderQuestion(); }
  });
  $('#restartQuiz').addEventListener('click', () => {
    state.quizIndex = 0; state.quizScore = 0;
    $('#quizCard').hidden = false; $('#quizResult').hidden = true;
    renderQuestion();
  });
  renderPatternRegistry();
  $$('[data-run-mode]').forEach(button => button.addEventListener('click', () => runSingle(button.dataset.runMode)));
  $('#runAllButton').addEventListener('click', runAll);
  $('#resetButton').addEventListener('click', resetSimulation);
  speedSelect.addEventListener('change', () => { state.speed = Number(speedSelect.value) || 1; });
  $$('[data-play-pattern]').forEach(button => button.addEventListener('click', () => runPlayground(button.dataset.playPattern)));
  $('#themeToggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const light = theme === 'light';
    $('#themeIcon').textContent = light ? '☾' : '☼';
    $('#themeLabel').textContent = light ? 'Giao diện tối' : 'Giao diện sáng';
    try { localStorage.setItem('ai-pattern-theme', theme); } catch (_) { /* local file may disable storage */ }
  }

  $('#fullscreenButton').addEventListener('click', async () => {
    const stage = $('#stageCard');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (stage.requestFullscreen) await stage.requestFullscreen();
      else stage.classList.toggle('is-expanded');
    } catch (_) { stage.classList.toggle('is-expanded'); }
  });
  document.addEventListener('fullscreenchange', () => {
    $('#fullscreenButton').innerHTML = document.fullscreenElement ? '⤢ <span>Thu nhỏ</span>' : '⤢ <span>Sơ đồ lớn</span>';
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') $('#stageCard').classList.remove('is-expanded');
  });

  try {
    const saved = localStorage.getItem('ai-pattern-theme');
    setTheme(saved === 'light' ? 'light' : 'dark');
  } catch (_) { setTheme('dark'); }
  renderLogs();
  renderQuestion();
})();
