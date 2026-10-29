(() => {
  'use strict';

  // Tham số KV-cache minh họa theo kiến trúc phổ biến; bytes dùng cho KV vẫn giả định FP16.
  const MODELS = {
    llama1: { name: 'Llama 3.2 1B', params: 1e9, layers: 16, kvHeads: 8, headDim: 64 },
    llama8: { name: 'Llama 3.1 8B', params: 8e9, layers: 32, kvHeads: 8, headDim: 128 },
    qwen14: { name: 'Qwen 2.5 14B', params: 14e9, layers: 48, kvHeads: 8, headDim: 128 },
    llama70: { name: 'Llama 3.1 70B', params: 70e9, layers: 80, kvHeads: 8, headDim: 128 },
  };
  const QUANT = { fp16: { label: 'FP16 / BF16', bytes: 2 }, q8: { label: 'Q8', bytes: 1 }, q4: { label: 'Q4_K_M', bytes: 0.55 }, q2: { label: 'Q2_K', bytes: 0.35 } };
  const HARDWARE = {
    cpu: { name: 'CPU DDR5 · 16 cores', ram: 32, vram: 0, bandwidth: 80, anchor: 7.5, kind: 'cpu' },
    rtx4060: { name: 'RTX 4060', ram: 16, vram: 8, bandwidth: 272, anchor: 50, kind: 'gpu' },
    rtx4090: { name: 'RTX 4090', ram: 32, vram: 24, bandwidth: 1008, anchor: 120, kind: 'gpu' },
    m3max: { name: 'M3 Max unified', ram: 64, vram: 64, bandwidth: 400, anchor: 80, kind: 'unified', usable: 0.8 },
    offload: { name: 'RTX 4060 + CPU offload', ram: 64, vram: 8, bandwidth: 272, anchor: 50, kind: 'gpu' },
    a100: { name: 'A100 80GB', ram: 64, vram: 80, bandwidth: 2000, anchor: 200, kind: 'gpu' },
  };
  const CONTEXTS = [2048, 4096, 8192, 32768];
  const TOKENS = 'Xin chào! Mô hình ngôn ngữ lớn xử lý prompt, tính toán các ma trận, rồi sinh phản hồi từng phần. GPU thực hiện nhiều phép nhân song song; CPU điều phối và hỗ trợ khi bộ nhớ đồ họa không đủ. Đây là luồng minh họa để bạn quan sát tốc độ và bộ nhớ.'.split(' ');
  const $ = (id) => document.getElementById(id);
  const ui = {
    model: $('modelSelect'), quant: $('quantSelect'), hardware: $('hardwareSelect'), context: $('contextSelect'), contextOut: $('contextOutput'),
    generate: $('generateButton'), reset: $('resetButton'), demo: $('demoButton'), status: $('statusTitle'), detail: $('statusDetail'), statusCard: document.querySelector('.status-card'), statusIcon: $('statusIcon'), modePill: $('modePill'),
    ramValue: $('ramValue'), ramBar: $('ramBar'), ramCaption: $('ramCaption'), vramMeter: $('vramMeter'), vramValue: $('vramValue'), vramBar: $('vramBar'), vramCaption: $('vramCaption'), cpuValue: $('cpuValue'), cpuBar: $('cpuBar'), gpuValue: $('gpuValue'), gpuBar: $('gpuBar'), speedValue: $('speedValue'), latency: $('latencyValue'),
    visualMode: $('visualMode'), singleStage: $('singleStage'), compareStage: $('compareStage'), mainCanvas: $('hardwareCanvas'), cpuCanvas: $('cpuCanvas'), gpuCanvas: $('gpuCanvas'), cpuCount: $('demoCpuCount'), gpuCount: $('demoGpuCount'), demoClock: $('demoClock'), stream: $('tokenStream'), tokenCount: $('tokenCount'), breakdown: $('breakdown'), total: $('totalMemory'), footnote: $('memoryFootnote'), bandwidth: $('bandwidthChip'), explanation: $('speedExplanation'),
  };
  let current = null;
  let generated = 0;
  let generateTimer = 0;
  let demoCpuTimer = 0;
  let demoGpuTimer = 0;
  let demoEndTimer = 0;
  let meterTimer = 0;
  let animationFrame = 0;
  let isGenerating = false;
  let isDemo = false;
  let demoCpuTokens = 0;
  let demoGpuTokens = 0;
  let demoStartedAt = 0;

  function formatGB(value) { return `${Number(value).toFixed(value >= 10 ? 1 : 2)} GB`; }
  function computeRequirements(model, quant, context) {
    const weights = model.params * quant.bytes / 1e9;
    // KV = 2 (K,V) × layers × KV heads × head dimension × context × bytes/element.
    const kv = 2 * model.layers * model.kvHeads * model.headDim * context * 2 / 1e9;
    const overhead = (weights + kv) * 0.15;
    return { weights, kv, overhead, total: weights + kv + overhead };
  }
  function planExecution(req, hw) {
    if (hw.kind === 'cpu') return req.total <= hw.ram * 0.9 ? { mode: 'cpu', offload: 1, gpuGB: 0, ramGB: req.total } : { mode: 'insufficient', offload: 1, gpuGB: 0, ramGB: req.total };
    if (hw.kind === 'unified') return req.total <= hw.ram * hw.usable ? { mode: 'unified', offload: 0, gpuGB: 0, ramGB: req.total } : { mode: 'insufficient', offload: 0, gpuGB: 0, ramGB: req.total };
    const gpuBudget = hw.vram * 0.9;
    const hostBudget = hw.ram * 0.85;
    if (req.total <= gpuBudget) return { mode: 'full-gpu', offload: 0, gpuGB: req.total, ramGB: 3.5 };
    if (req.total <= gpuBudget + hostBudget) {
      // Phân bổ xấp xỉ phần vượt ngân sách VRAM sang RAM; runtime thật phân lớp theo kiến trúc.
      const hostPart = req.total - gpuBudget;
      return { mode: 'offload', offload: Math.min(1, hostPart / req.total), gpuGB: gpuBudget, ramGB: 3.5 + hostPart };
    }
    return { mode: 'insufficient', offload: 1, gpuGB: Math.min(req.total, gpuBudget), ramGB: hw.ram };
  }
  function estimateSpeed(req, hw, plan) {
    if (plan.mode === 'insufficient') return 0;
    const baseline = computeRequirements(MODELS.llama8, QUANT.q4, 8192).total;
    // Dạng bandwidth / model bytes, với efficiency hiệu chỉnh để khớp baseline tham chiếu.
    const effectiveEfficiency = hw.anchor * baseline / hw.bandwidth;
    const gpuRate = hw.bandwidth * effectiveEfficiency / req.total;
    if (plan.mode === 'cpu') return gpuRate;
    if (plan.mode === 'unified') return gpuRate;
    if (plan.mode === 'offload') {
      const cpuRate = HARDWARE.cpu.anchor * baseline / req.total;
      const share = Math.max(0.15, plan.offload);
      // Điều hòa hai chặng gần đúng; offload không phải benchmark thực.
      return 1 / ((1 - share) / Math.max(gpuRate, 0.1) + share / Math.max(cpuRate, 0.1));
    }
    return gpuRate;
  }
  function getSelection() {
    const model = MODELS[ui.model.value];
    const quant = QUANT[ui.quant.value];
    const hw = HARDWARE[ui.hardware.value];
    const context = CONTEXTS[Number(ui.context.value)];
    const req = computeRequirements(model, quant, context);
    const plan = planExecution(req, hw);
    const speed = estimateSpeed(req, hw, plan);
    return { model, quant, hw, context, req, plan, speed };
  }
  function drawBreakdown(s) {
    const contextLabel = `${Math.round(s.context / 1024)}K`;
    const lines = [
      ['Weights', `${(s.model.params / 1e9).toFixed(s.model.params < 10e9 ? 1 : 0)}B × ${s.quant.bytes.toFixed(2)} B = ${formatGB(s.req.weights)}`],
      ['KV cache · FP16', `2 × ${s.model.layers} layers × ${s.model.kvHeads} KV heads × ${s.model.headDim} × ${contextLabel} × 2 B = ${formatGB(s.req.kv)}`],
      ['Overhead · 15%', `(weights + KV) × 0.15 = ${formatGB(s.req.overhead)}`],
    ];
    ui.breakdown.replaceChildren(...lines.map(([name, formula]) => {
      const row = document.createElement('div'); row.className = 'breakdown-line';
      const label = document.createElement('span'); label.textContent = name;
      const value = document.createElement('code'); value.textContent = formula;
      row.append(label, value); return row;
    }));
    ui.total.textContent = formatGB(s.req.total);
    ui.footnote.textContent = `KV dùng công thức kiến trúc × ${contextLabel} context, giả định KV giữ FP16. ${s.model.name} tham số kiến trúc ở đây là gần đúng; cấu hình model, tokenizer, format GGUF, tensor không quantize và allocator có thể làm footprint thực khác. Overhead 15% chỉ là mức minh họa.`;
  }
  function updateMeters(cpu = null, gpu = null) {
    const s = current || getSelection();
    const p = s.plan; const h = s.hw;
    const cpuUse = cpu ?? (p.mode === 'cpu' ? (isGenerating ? 72 : 9) : p.mode === 'offload' ? (isGenerating ? 88 : 14) : (isGenerating ? 12 : 4));
    const gpuUse = gpu ?? (p.mode === 'full-gpu' || p.mode === 'unified' ? (isGenerating ? 94 : 6) : p.mode === 'offload' ? (isGenerating ? 89 : 5) : 0);
    const ramUsed = Math.min(h.ram, p.ramGB);
    const vramUsed = h.kind === 'unified' ? 0 : Math.min(h.vram, p.gpuGB);
    ui.ramValue.textContent = `${formatGB(ramUsed)} / ${h.ram} GB`;
    ui.ramBar.style.width = `${Math.min(100, ramUsed / h.ram * 100)}%`;
    ui.ramCaption.textContent = h.kind === 'unified' ? 'Unified memory · pool dùng chung' : h.kind === 'cpu' ? 'DDR5 · chứa toàn bộ model' : p.mode === 'offload' ? 'Host RAM · layers offload + OS' : 'Host RAM · OS/runtime';
    if (h.kind === 'unified') { ui.vramMeter.hidden = true; }
    else { ui.vramMeter.hidden = false; ui.vramValue.textContent = h.vram ? `${formatGB(vramUsed)} / ${h.vram} GB` : 'Không có'; ui.vramBar.style.width = h.vram ? `${Math.min(100, vramUsed / h.vram * 100)}%` : '0%'; ui.vramCaption.textContent = p.mode === 'offload' ? 'GPU portion · phần còn lại ở RAM' : 'Weights + KV cache (ước tính)'; }
    ui.cpuValue.textContent = `${Math.round(cpuUse)}%`; ui.cpuBar.style.width = `${cpuUse}%`;
    ui.gpuValue.textContent = `${Math.round(gpuUse)}%`; ui.gpuBar.style.width = `${gpuUse}%`;
    ui.speedValue.textContent = s.speed > 0 ? s.speed.toFixed(s.speed < 10 ? 1 : 0) : '—';
    ui.latency.textContent = s.speed > 0 ? `${Math.round(1000 / s.speed)} ms/token` : 'không chạy được';
  }
  function updateStatus(s) {
    const p = s.plan; const card = ui.statusCard;
    if (p.mode === 'insufficient') {
      card.dataset.state = 'insufficient'; ui.statusIcon.textContent = '×'; ui.status.textContent = 'Không đủ bộ nhớ'; ui.modePill.textContent = 'KHÔNG CHẠY';
      ui.detail.textContent = s.hw.kind === 'unified' ? `Ước tính ${formatGB(s.req.total)} vượt unified memory khả dụng.` : `Cần ${formatGB(s.req.total)}; vượt capacity khả dụng của ${s.hw.name}.`;
      ui.visualMode.textContent = 'Thiếu bộ nhớ';
    } else if (p.mode === 'offload') {
      card.dataset.state = 'offload'; ui.statusIcon.textContent = '⇄'; ui.status.textContent = 'Cần offload · chạy được'; ui.modePill.textContent = 'GPU + CPU';
      ui.detail.textContent = `VRAM thiếu khoảng ${formatGB(Math.max(0, s.req.total - s.hw.vram * .9))}; phần vượt dự kiến chuyển sang RAM.`;
      ui.visualMode.textContent = 'Offload · trao đổi qua lại';
    } else if (p.mode === 'cpu') {
      card.dataset.state = 'ready'; ui.statusIcon.textContent = '✓'; ui.status.textContent = 'Chạy được trên CPU'; ui.modePill.textContent = 'CPU ONLY';
      ui.detail.textContent = `Model nằm trong system RAM; matmul chạy trên ${s.hw.name}.`;
      ui.visualMode.textContent = 'CPU · tuần tự';
    } else if (p.mode === 'unified') {
      card.dataset.state = 'ready'; ui.statusIcon.textContent = '✓'; ui.status.textContent = 'Chạy được · unified memory'; ui.modePill.textContent = 'UNIFIED';
      ui.detail.textContent = 'CPU/GPU chia sẻ cùng một pool memory; không cộng thành RAM + VRAM riêng.';
      ui.visualMode.textContent = 'Unified · song song';
    } else {
      card.dataset.state = 'ready'; ui.statusIcon.textContent = '✓'; ui.status.textContent = 'Chạy được trên GPU'; ui.modePill.textContent = 'FULL GPU';
      ui.detail.textContent = `Weights và KV cache ước tính vừa trong VRAM của ${s.hw.name}.`;
      ui.visualMode.textContent = 'GPU · song song';
    }
  }
  function renderPlan() {
    current = getSelection();
    const s = current;
    ui.contextOut.textContent = `${Math.round(s.context / 1024)}K`;
    drawBreakdown(s); updateStatus(s); updateMeters();
    ui.bandwidth.textContent = `${s.hw.bandwidth.toLocaleString()} GB/s`;
    ui.explanation.textContent = `Baseline hiệu chỉnh minh họa cho ${s.hw.name}: ${s.hw.bandwidth.toLocaleString()} GB/s. Ước tính tok/s scale theo lượng dữ liệu model phải đọc (${formatGB(s.req.total)} gồm weights, KV và overhead); ${s.plan.mode === 'offload' ? 'phần offload thêm một chặng CPU nên tốc độ giảm đáng kể.' : 'kết quả thực tế phụ thuộc backend, kernel, batching và context.'}`;
  }
  function getCanvasContext(canvas) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const ctx = canvas.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, width: rect.width, height: rect.height };
  }
  function drawCore(ctx, x, y, w, h, active, color, round = 3) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, round); ctx.fillStyle = active ? color : '#142738'; ctx.fill();
    ctx.strokeStyle = active ? color : 'rgba(151,181,199,.15)'; ctx.lineWidth = 1; ctx.stroke();
    if (active) { ctx.shadowBlur = 12; ctx.shadowColor = color; ctx.fillStyle = '#f0fff4'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, Math.max(1.2, Math.min(w, h) * .12), 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
  }
  function drawScene(canvas, mode, now, tokens = generated) {
    if (!canvas || canvas.hidden) return;
    const { ctx, width: w, height: h } = getCanvasContext(canvas);
    ctx.clearRect(0, 0, w, h);
    const isCompareCpu = canvas === ui.cpuCanvas;
    const isCompareGpu = canvas === ui.gpuCanvas;
    const cpuOnly = isCompareCpu || mode === 'cpu' || mode === 'insufficient';
    const offload = mode === 'offload';
    const gpuOnly = isCompareGpu || mode === 'full-gpu' || mode === 'unified';
    const pulse = Math.floor(now / (isCompareCpu ? 95 : 180));
    if (offload) {
      const split = w * .53;
      ctx.fillStyle = 'rgba(34,197,94,.035)'; ctx.fillRect(0, 0, split, h);
      ctx.fillStyle = 'rgba(59,130,246,.035)'; ctx.fillRect(split, 0, w - split, h);
      ctx.fillStyle = '#86efac'; ctx.font = '700 10px system-ui'; ctx.fillText('GPU · layers đầu', 12, 19);
      ctx.fillStyle = '#93c5fd'; ctx.fillText('CPU · layers còn lại', split + 10, 19);
      const cols = 10; const rows = 9; const gap = 5; const cell = Math.min(15, (split - 25 - gap * (cols - 1)) / cols); const startX = 12; const startY = 30;
      for (let i = 0; i < cols * rows; i++) { const x = startX + (i % cols) * (cell + gap); const y = startY + Math.floor(i / cols) * (cell + gap); const active = i < 72 && ((i + pulse) % 5 !== 0); drawCore(ctx, x, y, cell, cell, active, '#22c55e', 4); }
      const cpuX = split + 15; const cpuW = Math.min(27, (w - split - 32) / 4); const cpuGap = 7;
      for (let i = 0; i < 8; i++) { const x = cpuX + (i % 4) * (cpuW + cpuGap); const y = 40 + Math.floor(i / 4) * 48; drawCore(ctx, x, y, cpuW, 29, isGenerating && i === pulse % 8, '#3b82f6', 5); }
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(split - 8, h - 21); ctx.lineTo(split + 11, h - 21); ctx.stroke(); ctx.setLineDash([]);
      const dot = (now / 9) % (w - split + 16); ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(split - 8 + dot, h - 21, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9bb0c0'; ctx.font = '9px system-ui'; ctx.fillText('layer activations / data transfer', 12, h - 7);
      return;
    }
    if (cpuOnly) {
      ctx.fillStyle = '#93c5fd'; ctx.font = '700 11px system-ui'; ctx.fillText(isCompareCpu ? 'CPU · 8 illustrative cores · sequential' : mode === 'insufficient' ? 'Thiếu memory để nạp model' : 'CPU · 8 illustrative cores · tuần tự', 14, 22);
      const gap = 10; const cellW = Math.min(62, (w - 40 - gap * 3) / 4); const cellH = 48; const fullW = cellW * 4 + gap * 3; const left = (w - fullW) / 2; const top = Math.max(43, (h - cellH * 2 - gap) / 2);
      for (let i = 0; i < 8; i++) { const x = left + (i % 4) * (cellW + gap); const y = top + Math.floor(i / 4) * (cellH + gap); const active = isCompareCpu ? (i === pulse % 8) : (isGenerating ? i === pulse % 8 : i === Math.floor((now / 700) % 8)); drawCore(ctx, x, y, cellW, cellH, active, '#3b82f6', 8); ctx.fillStyle = active ? '#eff6ff' : '#9bb0c0'; ctx.font = '9px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.fillText(`CORE ${i + 1}`, x + cellW / 2, y + cellH + 13); }
      ctx.textAlign = 'left';
      const blockX = left + ((pulse % 8) * (cellW + gap)); const blockY = top + 2 * (cellH + gap) + 11; ctx.fillStyle = 'rgba(245,158,11,.14)'; ctx.strokeStyle = '#f59e0b'; ctx.fillRect(blockX + 5, Math.min(h - 24, blockY), Math.max(20, cellW - 10), 10); ctx.strokeRect(blockX + 5, Math.min(h - 24, blockY), Math.max(20, cellW - 10), 10);
      return;
    }
    if (gpuOnly) {
      const label = isCompareGpu ? 'GPU · 20 × 20 lanes · parallel' : mode === 'unified' ? 'UNIFIED MEMORY · GPU compute lanes' : 'GPU · many compute lanes · song song';
      ctx.fillStyle = '#86efac'; ctx.font = '700 11px system-ui'; ctx.fillText(label, 14, 21);
      const cols = 20; const rows = 20; const gap = Math.max(2, Math.min(5, w / 175)); const cell = Math.min(10, (w - 40 - gap * (cols - 1)) / cols); const gridW = cols * cell + (cols - 1) * gap; const left = (w - gridW) / 2; const top = Math.max(33, (h - rows * cell - (rows - 1) * gap) / 2);
      for (let i = 0; i < cols * rows; i++) { const x = left + (i % cols) * (cell + gap); const y = top + Math.floor(i / cols) * (cell + gap); const active = isCompareGpu ? ((i + pulse) % 11 !== 0) : ((i + pulse) % 13 !== 0); drawCore(ctx, x, y, cell, cell, active, '#22c55e', cell / 2); }
      return;
    }
  }
  function drawAll(now) {
    const mode = current ? current.plan.mode : 'full-gpu';
    if (isDemo) { drawScene(ui.cpuCanvas, 'cpu', now, demoCpuTokens); drawScene(ui.gpuCanvas, 'full-gpu', now, demoGpuTokens); }
    else drawScene(ui.mainCanvas, mode, now, generated);
    animationFrame = requestAnimationFrame(drawAll);
  }
  function addToken(index, target = ui.stream) {
    if (target === ui.stream && generated === 0) target.replaceChildren();
    const word = TOKENS[index % TOKENS.length];
    const chip = document.createElement('span'); chip.className = 'token-chip';
    const text = document.createTextNode(word);
    const latency = document.createElement('small'); latency.textContent = `${Math.round(1000 / Math.max(current?.speed || 1, 1))}ms`;
    chip.append(text, latency); target.append(chip);
    while (target.children.length > 70) target.firstElementChild.remove();
    if (target === ui.stream) { ui.stream.scrollTop = ui.stream.scrollHeight; ui.tokenCount.textContent = `${generated} chunks`; }
  }
  function clearTimers() {
    window.clearInterval(generateTimer); window.clearInterval(demoCpuTimer); window.clearInterval(demoGpuTimer); window.clearTimeout(demoEndTimer);
    generateTimer = demoCpuTimer = demoGpuTimer = demoEndTimer = 0;
  }
  function stopActivity() {
    clearTimers(); isGenerating = false; isDemo = false;
    ui.generate.disabled = false; ui.demo.disabled = false; ui.generate.textContent = '▶ Generate Response';
    ui.demo.textContent = '⇄ Auto-demo · 10s';
    ui.singleStage.hidden = false; ui.compareStage.hidden = true;
    updateMeters();
  }
  function generateResponse() {
    if (isGenerating) { stopActivity(); return; }
    stopActivity(); renderPlan();
    if (current.plan.mode === 'insufficient') return;
    generated = 0; ui.stream.replaceChildren(); ui.tokenCount.textContent = '0 chunks';
    isGenerating = true; ui.generate.textContent = '■ Stop'; ui.demo.disabled = true;
    const delay = Math.max(20, Math.min(900, 1000 / Math.max(current.speed, 0.1)));
    addToken(generated++);
    generateTimer = window.setInterval(() => {
      if (generated >= TOKENS.length) { stopActivity(); return; }
      addToken(generated++); updateMeters();
    }, delay);
    updateMeters();
  }
  function gpuBaselinePlan(req) {
    const gpu = HARDWARE.rtx4060;
    return planExecution(req, gpu);
  }
  function startAutoDemo() {
    if (isDemo) { stopActivity(); return; }
    stopActivity(); renderPlan();
    isDemo = true; ui.singleStage.hidden = true; ui.compareStage.hidden = false;
    ui.demo.disabled = false; ui.demo.textContent = '■ Dừng demo'; ui.generate.disabled = true;
    demoCpuTokens = 0; demoGpuTokens = 0; ui.cpuCount.textContent = '0 chunks'; ui.gpuCount.textContent = '0 chunks';
    demoStartedAt = performance.now();
    const cpuHw = HARDWARE.cpu; const cpuPlan = planExecution(current.req, cpuHw); const cpuSpeed = estimateSpeed(current.req, cpuHw, cpuPlan);
    const gpuHw = HARDWARE.rtx4060; const gpuPlan = gpuBaselinePlan(current.req); const gpuSpeed = estimateSpeed(current.req, gpuHw, gpuPlan);
    const cpuAvailable = cpuPlan.mode !== 'insufficient'; const gpuAvailable = gpuPlan.mode !== 'insufficient';
    ui.cpuCount.textContent = cpuAvailable ? '0 tokens' : 'Không đủ system RAM';
    ui.gpuCount.textContent = gpuAvailable ? '0 tokens' : 'Không đủ VRAM + RAM';
    function tickCounts() {
      const elapsed = performance.now() - demoStartedAt;
      if (cpuAvailable) { demoCpuTokens = Math.floor(elapsed * cpuSpeed / 1000); ui.cpuCount.textContent = `${demoCpuTokens} tokens · ${cpuSpeed.toFixed(1)} tok/s est.`; }
      if (gpuAvailable) { demoGpuTokens = Math.floor(elapsed * gpuSpeed / 1000); ui.gpuCount.textContent = `${demoGpuTokens} tokens · ${gpuSpeed.toFixed(1)} tok/s est.`; }
    }
    tickCounts();
    demoCpuTimer = window.setInterval(tickCounts, 100);
    demoGpuTimer = demoCpuTimer;
    const endAt = demoStartedAt + 10000;
    const updateClock = () => {
      if (!isDemo) return;
      const remaining = Math.max(0, (endAt - performance.now()) / 1000);
      const constraints = [cpuAvailable ? '' : 'CPU thiếu RAM', gpuAvailable ? '' : 'GPU thiếu VRAM/RAM'].filter(Boolean).join(' · ');
      ui.demoClock.textContent = remaining > 0 ? `Chạy song song · ${remaining.toFixed(1)} giây${constraints ? ` · ${constraints}` : ''}` : `Demo xong · CPU ${demoCpuTokens} tokens · GPU ${demoGpuTokens} tokens${constraints ? ` · ${constraints}` : ''}`;
      if (remaining > 0) demoEndTimer = window.setTimeout(updateClock, 100);
    };
    demoEndTimer = window.setTimeout(() => {
      if (!isDemo) return;
      tickCounts();
      window.clearInterval(demoCpuTimer); window.clearInterval(demoGpuTimer); demoCpuTimer = demoGpuTimer = 0;
      isDemo = false; ui.generate.disabled = false; ui.demo.textContent = '⇄ Chạy lại demo';
      const constraints = [cpuAvailable ? '' : 'CPU thiếu RAM', gpuAvailable ? '' : 'GPU thiếu VRAM/RAM'].filter(Boolean).join(' · ');
      ui.demoClock.textContent = `Demo xong · CPU ${demoCpuTokens} tokens · GPU ${demoGpuTokens} tokens (10 giây)${constraints ? ` · ${constraints}` : ''}.`;
      updateMeters();
    }, 10000);
    updateClock(); updateMeters(83, 93);
  }
  function resetAll() {
    stopActivity(); generated = 0; demoCpuTokens = 0; demoGpuTokens = 0;
    ui.stream.replaceChildren(); const placeholder = document.createElement('span'); placeholder.className = 'stream-placeholder'; placeholder.textContent = 'Bấm Generate Response để bắt đầu…'; ui.stream.append(placeholder);
    ui.tokenCount.textContent = '0 chunks'; ui.demoClock.textContent = 'Auto-demo chạy song song trong 10 giây.';
    renderPlan();
  }
  [ui.model, ui.quant, ui.hardware, ui.context].forEach((control) => control.addEventListener('input', () => { if (isGenerating || isDemo) stopActivity(); renderPlan(); }));
  ui.generate.addEventListener('click', generateResponse);
  ui.demo.addEventListener('click', startAutoDemo);
  ui.reset.addEventListener('click', resetAll);
  window.addEventListener('resize', () => { if (animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = requestAnimationFrame(drawAll); } });
  window.addEventListener('beforeunload', clearTimers);

  renderPlan();
  meterTimer = window.setInterval(() => {
    if (isDemo) updateMeters(83 + Math.random() * 12, 91 + Math.random() * 8);
    else if (isGenerating) updateMeters(current.plan.mode === 'cpu' ? 60 + Math.random() * 30 : current.plan.mode === 'offload' ? 78 + Math.random() * 18 : 7 + Math.random() * 14, current.plan.mode === 'full-gpu' || current.plan.mode === 'offload' || current.plan.mode === 'unified' ? 88 + Math.random() * 10 : 0);
    else updateMeters();
  }, 500);
  animationFrame = requestAnimationFrame(drawAll);
})();
