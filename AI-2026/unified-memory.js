(() => {
  'use strict';

  const MODELS = {
    llama1: { label: 'Llama 3.2 1B', params: 1e9, layers: 16, kvHeads: 8, headDim: 64 },
    llama8: { label: 'Llama 3.1 8B', params: 8e9, layers: 32, kvHeads: 8, headDim: 128 },
    qwen14: { label: 'Qwen 2.5 14B', params: 14e9, layers: 48, kvHeads: 8, headDim: 128 },
    llama70: { label: 'Llama 3.1 70B', params: 70e9, layers: 80, kvHeads: 8, headDim: 128 },
  };
  const QUANT = {
    fp16: { label: 'FP16 / BF16', bytes: 2 },
    q8: { label: 'Q8', bytes: 1 },
    q4: { label: 'Q4_K_M', bytes: .55 },
    q2: { label: 'Q2_K', bytes: .35 },
  };
  const CONTEXTS = [2048, 4096, 8192, 32768];
  const $ = (id) => document.getElementById(id);
  const ui = {
    model: $('modelSelect'), quant: $('quantSelect'), context: $('contextSelect'),
    dedicatedBudget: $('dedicatedBudget'), hostBudget: $('hostRamBudget'), unifiedBudget: $('unifiedBudget'),
    prefillSteps: [...document.querySelectorAll('#prefillSteps [data-step]')],
    prefillCount: $('prefillCount'), prefillProgress: $('prefillProgress'), prefillFill: $('prefillProgressFill'),
    run: $('runPrefill'), reset: $('resetPrefill'), status: $('prefillStatus'),
    dedicatedTrack: $('dedicatedTrack'), dedicatedWeights: $('dedicatedWeights'), dedicatedKv: $('dedicatedKv'), dedicatedWork: $('dedicatedWork'), dedicatedUsage: $('dedicatedUsage'), dedicatedVerdict: $('dedicatedVerdict'),
    hostUsage: $('hostUsage'), hostOffload: $('hostOffload'), hostCaption: $('hostCaption'),
    unifiedTrack: $('unifiedTrack'), unifiedWeights: $('unifiedWeights'), unifiedKv: $('unifiedKv'), unifiedWork: $('unifiedWork'), unifiedUsage: $('unifiedUsage'), unifiedVerdict: $('unifiedVerdict'),
  };
  if (!ui.model || !ui.quant || !ui.context || !ui.run) return;

  let processedTokens = 0;
  let chunkIndex = 0;
  let isRunning = false;
  let timer = 0;

  const formatGB = (value) => `${value.toFixed(value >= 10 ? 1 : 2)} GB`;
  const selectedContext = () => CONTEXTS[Number(ui.context.value)] || CONTEXTS[0];

  function estimate(model, quant, tokens) {
    const weights = model.params * quant.bytes / 1e9;
    const kv = 2 * model.layers * model.kvHeads * model.headDim * tokens * 2 / 1e9;
    const workspace = (weights + kv) * .15;
    return { weights, kv, workspace, total: weights + kv + workspace };
  }

  function setPool(track, segments, capacity, usage) {
    const denominator = Math.max(capacity, usage.total, .01);
    const parts = [usage.weights, usage.kv, usage.workspace];
    segments.forEach((segment, index) => { segment.style.width = `${Math.min(100, parts[index] / denominator * 100)}%`; });
    track.dataset.over = String(usage.total > capacity);
    track.setAttribute('aria-label', `Weights ${formatGB(usage.weights)}, KV cache ${formatGB(usage.kv)}, workspace ${formatGB(usage.workspace)}; ${formatGB(usage.total)} trên budget ${capacity} GB`);
  }

  function updateVerdicts(model, quant, targetTokens, current) {
    const final = estimate(model, quant, targetTokens);
    const vram = Number(ui.dedicatedBudget.value);
    const host = Number(ui.hostBudget.value);
    const unified = Number(ui.unifiedBudget.value);
    const spill = Math.max(0, final.total - vram);
    const at = `${processedTokens.toLocaleString('vi-VN')} / ${targetTokens.toLocaleString('vi-VN')} token prompt`;

    ui.dedicatedUsage.textContent = `${formatGB(current.total)} / ${vram} GB`;
    if (final.total <= vram) {
      ui.dedicatedVerdict.dataset.state = 'ready';
      ui.dedicatedVerdict.textContent = `Prompt đầy đủ: khoảng ${formatGB(final.total)} nằm trong VRAM ${vram} GB. Hiện đã xử lý ${at}.`;
    } else if (spill <= host) {
      ui.dedicatedVerdict.dataset.state = 'warning';
      ui.dedicatedVerdict.textContent = `Prompt đầy đủ có thể cần offload khoảng ${formatGB(spill)} sang host RAM (budget ${host} GB), nếu runtime hỗ trợ. Hiện ${at}.`;
    } else {
      ui.dedicatedVerdict.dataset.state = 'error';
      ui.dedicatedVerdict.textContent = `Thiếu VRAM khoảng ${formatGB(spill)}; mức tràn còn lớn hơn host RAM đã chọn (${host} GB). Có thể cần model/quant/context nhỏ hơn.`;
    }
    ui.hostUsage.textContent = `${formatGB(Math.min(spill, host))} / ${host} GB`;
    ui.hostOffload.style.width = `${Math.min(100, spill / host * 100)}%`;
    ui.hostCaption.textContent = spill ? `Ước tính overflow lúc prompt đầy đủ: ${formatGB(spill)}; dùng RAM này cần offload/copy, không biến nó thành VRAM.` : 'Prompt này chưa cần spill sang host RAM trong ước tính.';

    ui.unifiedUsage.textContent = `${formatGB(current.total)} / ${unified} GB`;
    if (final.total <= unified) {
      ui.unifiedVerdict.dataset.state = 'ready';
      ui.unifiedVerdict.textContent = `Prompt đầy đủ: khoảng ${formatGB(final.total)} vừa trong budget shared ${unified} GB. CPU/GPU vẫn cùng dùng pool này.`;
    } else {
      ui.unifiedVerdict.dataset.state = 'warning';
      ui.unifiedVerdict.textContent = `Prompt đầy đủ vượt budget shared khoảng ${formatGB(final.total - unified)}. Unified Memory không xóa giới hạn capacity; hệ thống/app khác cũng cần chỗ.`;
    }
  }

  function render() {
    const model = MODELS[ui.model.value];
    const quant = QUANT[ui.quant.value];
    const targetTokens = selectedContext();
    processedTokens = Math.min(processedTokens, targetTokens);
    const current = estimate(model, quant, processedTokens);
    const vram = Number(ui.dedicatedBudget.value);
    const unified = Number(ui.unifiedBudget.value);
    setPool(ui.dedicatedTrack, [ui.dedicatedWeights, ui.dedicatedKv, ui.dedicatedWork], vram, current);
    setPool(ui.unifiedTrack, [ui.unifiedWeights, ui.unifiedKv, ui.unifiedWork], unified, current);
    updateVerdicts(model, quant, targetTokens, current);

    const percent = targetTokens ? Math.round(processedTokens / targetTokens * 100) : 0;
    ui.prefillCount.textContent = `${processedTokens.toLocaleString('vi-VN')} / ${targetTokens.toLocaleString('vi-VN')} tokens`;
    ui.prefillProgress.setAttribute('aria-valuenow', String(percent));
    ui.prefillFill.style.width = `${percent}%`;
    ui.prefillSteps.forEach((step, index) => {
      const boundary = Math.ceil((index + 1) * targetTokens / ui.prefillSteps.length);
      const start = Math.floor(index * targetTokens / ui.prefillSteps.length);
      step.dataset.state = processedTokens >= boundary ? 'done' : isRunning && processedTokens >= start && processedTokens < boundary ? 'active' : 'idle';
    });
    ui.run.disabled = isRunning || processedTokens >= targetTokens;
    ui.run.textContent = processedTokens >= targetTokens ? '✓ Prompt đã được xử lý' : isRunning ? 'Đang nạp prompt từng khúc…' : '▶ Xử lý prompt theo 4 khúc';
    if (!isRunning) {
      ui.status.textContent = processedTokens >= targetTokens ? `Prefill hoàn tất: ${targetTokens.toLocaleString('vi-VN')} prompt tokens đã tạo KV cache.` : processedTokens ? `Đã xử lý ${percent}% prompt; cache tăng dần, weights giữ nguyên.` : 'Chọn độ dài context ở sidebar rồi bắt đầu.';
    }
  }

  function stopAndReset(message = '') {
    window.clearTimeout(timer);
    isRunning = false;
    chunkIndex = 0;
    processedTokens = 0;
    render();
    if (message) ui.status.textContent = message;
  }

  function processNextChunk() {
    const total = selectedContext();
    if (chunkIndex >= ui.prefillSteps.length) {
      isRunning = false;
      ui.status.textContent = `Prefill hoàn tất: ${total.toLocaleString('vi-VN')} prompt tokens đã tạo KV cache.`;
      render();
      return;
    }
    chunkIndex += 1;
    processedTokens = Math.min(total, Math.round(total * chunkIndex / ui.prefillSteps.length));
    const percent = Math.round(processedTokens / total * 100);
    ui.status.textContent = `Đang xử lý khúc ${chunkIndex}/${ui.prefillSteps.length} · ${percent}% prompt; KV cache tăng theo.`;
    render();
    timer = window.setTimeout(processNextChunk, 720);
  }

  function startPrefill() {
    if (isRunning || processedTokens >= selectedContext()) return;
    isRunning = true;
    chunkIndex = Math.floor(processedTokens / selectedContext() * ui.prefillSteps.length);
    ui.status.textContent = 'Bắt đầu prefill; weights ở lại bộ nhớ, KV cache được dựng dần.';
    render();
    timer = window.setTimeout(processNextChunk, 240);
  }

  [ui.model, ui.quant].forEach((control) => control.addEventListener('change', () => stopAndReset('Cấu hình model đổi; đã đặt lại prefill để so sánh nhất quán.')));
  ui.context.addEventListener('input', () => stopAndReset('Độ dài context đổi; đã đặt lại tiến độ prefill.'));
  [ui.dedicatedBudget, ui.hostBudget, ui.unifiedBudget].forEach((control) => control.addEventListener('change', render));
  ui.run.addEventListener('click', startPrefill);
  ui.reset.addEventListener('click', () => stopAndReset('Đã xóa tiến độ prefill; weights vẫn được giữ trong bộ nhớ.'));
  window.addEventListener('beforeunload', () => window.clearTimeout(timer));
  render();
})();
