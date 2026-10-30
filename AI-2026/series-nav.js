(() => {
  'use strict';

  const home = {
    href: 'index.html',
    code: 'HOME',
    title: 'AI Pattern Lab',
    description: 'Trang chính · hub của series',
  };
  const groups = [
    {
      title: 'Bắt đầu',
      items: [
        { href: 'cpu-gpu-guide.html', code: 'GUIDE', title: 'CPU, GPU, RAM', description: 'Hướng dẫn nhập môn' },
        { href: 'cpu-gpu.html', code: 'CPU/GPU', title: 'Mô phỏng CPU vs GPU', description: 'Phần cứng chạy model' },
        { href: 'token.html', code: 'TOKEN', title: 'Token', description: 'Model đọc và sinh văn bản' },
      ],
    },
    {
      title: 'Model & bộ nhớ',
      items: [
        { href: 'context-memory-effort.html', code: 'PARAM', title: 'Parameters, context & effort', description: 'Liên hệ với dung lượng bộ nhớ' },
        { href: 'quantization.html', code: 'QNT', title: 'Quantization', description: 'FP16 · INT8 · INT4' },
        { href: 'kv-cache.html', code: 'KV', title: 'KV cache', description: 'Cache tăng theo token và phiên' },
        { href: 'attention-tiling.html', code: 'ATTN', title: 'Attention & FlashAttention', description: 'Score matrix và tiling' },
      ],
    },
    {
      title: 'Sinh & phục vụ',
      items: [
        { href: 'prefill-decode.html', code: 'P/D', title: 'Prefill vs Decode', description: 'Xử lý prompt và sinh token' },
        { href: 'speculative-decoding.html', code: 'SPEC', title: 'Speculative Decoding', description: 'Draft đề xuất · target xác minh' },
        { href: 'continuous-batching.html', code: 'BATCH', title: 'Continuous batching', description: 'Phục vụ nhiều phiên cùng lúc' },
      ],
    },
  ];

  const currentFile = decodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
  const root = document.createElement('aside');
  root.className = 'ai26-series-nav';
  root.setAttribute('aria-label', 'Menu điều hướng AI-2026');

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.setAttribute('aria-label', 'Mở menu các trang AI-2026');
  const mark = document.createElement('span');
  mark.className = 'ai26-menu-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = 'AI';
  const label = document.createElement('span');
  label.textContent = 'AI-2026 · Menu';
  const caret = document.createElement('span');
  caret.className = 'ai26-menu-caret';
  caret.setAttribute('aria-hidden', 'true');
  caret.textContent = '▲';
  summary.append(mark, label, caret);
  details.append(summary);

  const panel = document.createElement('div');
  panel.className = 'ai26-menu-panel';
  const heading = document.createElement('div');
  heading.className = 'ai26-menu-heading';
  const headingTitle = document.createElement('strong');
  headingTitle.textContent = 'Đi đến trang';
  const headingNote = document.createElement('span');
  headingNote.textContent = 'Chọn chủ đề để tiếp tục khám phá series.';
  heading.append(headingTitle, headingNote);
  panel.append(heading);

  const links = document.createElement('nav');
  links.className = 'ai26-menu-links';
  links.setAttribute('aria-label', 'Các trang AI-2026');

  function createLink(item, isHome = false) {
    const link = document.createElement('a');
    link.className = isHome ? 'ai26-menu-home' : 'ai26-menu-link';
    link.href = item.href;
    if (item.href === currentFile) {
      link.setAttribute('aria-current', 'page');
      const current = document.createElement('span');
      current.className = 'ai26-menu-current';
      current.textContent = 'Đang xem';
      link.append(current);
    }
    const icon = document.createElement('span');
    icon.className = 'ai26-menu-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = item.code;
    const copy = document.createElement('span');
    copy.className = 'ai26-menu-copy';
    const title = document.createElement('strong');
    title.textContent = item.title;
    const description = document.createElement('small');
    description.textContent = item.description;
    copy.append(title, description);
    link.prepend(icon, copy);
    return link;
  }

  links.append(createLink(home, true));
  groups.forEach((group) => {
    const section = document.createElement('section');
    section.className = 'ai26-menu-section';
    const title = document.createElement('h3');
    title.textContent = group.title;
    section.append(title);
    group.items.forEach((item) => section.append(createLink(item)));
    links.append(section);
  });
  panel.append(links);
  details.append(panel);
  root.append(details);
  document.body.append(root);

  document.addEventListener('pointerdown', (event) => {
    if (details.open && !root.contains(event.target)) details.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && details.open) {
      details.open = false;
      summary.focus();
    }
  });
})();
