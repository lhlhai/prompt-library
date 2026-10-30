(() => {
  'use strict';
  const root = document.documentElement;
  const themeKey = 'technical-sim-theme';
  const savedTheme = localStorage.getItem(themeKey);
  const preferred = savedTheme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  root.dataset.theme = preferred;

  const themeButton = document.getElementById('themeToggle');
  function paintTheme() {
    const light = root.dataset.theme === 'light';
    if (themeButton) themeButton.textContent = light ? '☾ Giao diện tối' : '☼ Giao diện sáng';
  }
  themeButton?.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    localStorage.setItem(themeKey, next);
    paintTheme();
  });
  paintTheme();

  const overlay = document.getElementById('tourOverlay');
  const title = document.getElementById('tourTitle');
  const text = document.getElementById('tourText');
  const progress = document.getElementById('tourProgress');
  const nextButton = document.getElementById('tourNext');
  const skipButton = document.getElementById('tourSkip');
  const tourSteps = document.body.contains(document.getElementById('simulator'))
    ? [
      ['simulator', '1. Nhập dữ liệu', 'Đây là nơi bạn nhập một ghi chú. Hãy coi nó như món đồ bạn muốn cất vào các ngăn kéo khác nhau.'],
      ['stores', '2. Chọn ngăn kéo', 'Mỗi thẻ giải thích một loại storage. Bấm nút lưu riêng để thấy trình duyệt ghi dữ liệu thật vào nơi đó.'],
      ['events', '3. Thay đổi tình huống', 'Reload, mở tab mới hoặc giả lập đóng tab. Đây là lúc khác biệt giữa local, session, cache và database trở nên rõ ràng.'],
      ['explain', '4. Chọn theo mục đích', 'Đọc phần Vai trò & chức năng để nhớ nhanh: cần điều hướng, nhớ lâu, tạm thời, tải nhanh hay truy vấn nhiều dữ liệu?']
    ]
    : [
      ['.hero', '1. Bắt đầu ở trang này', 'Đây là bản đồ bài học. Mỗi card là một “ngăn kéo” dữ liệu với vai trò riêng.'],
      ['.callout', '2. Học theo flow', 'Đọc flow từ trái sang phải: nhập dữ liệu → chọn mục đích → ghi vào nơi phù hợp → thay đổi tình huống → quan sát kết quả.'],
      ['.flow-preview', '3. Mở mô phỏng', 'Bấm Mở Storage Lab để thao tác trực tiếp với History, Local Storage, Session Storage, Cache và Database.']
    ];
  let stepIndex = 0;
  let highlighted;

  function renderTour() {
    const [selector, stepTitle, stepText] = tourSteps[stepIndex];
    highlighted?.classList.remove('tour-highlight');
    highlighted = document.querySelector(selector.startsWith('.') || selector === 'main' ? selector : `[data-tour="${selector}"]`);
    highlighted?.classList.add('tour-highlight');
    highlighted?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (title) title.textContent = stepTitle;
    if (text) text.textContent = stepText;
    if (progress) progress.innerHTML = tourSteps.map((_, i) => `<i class="${i === stepIndex ? 'is-active' : ''}"></i>`).join('');
    if (nextButton) nextButton.textContent = stepIndex === tourSteps.length - 1 ? 'Hoàn tất ✓' : 'Tiếp theo →';
  }
  function closeTour() {
    overlay?.setAttribute('hidden', '');
    highlighted?.classList.remove('tour-highlight');
    localStorage.setItem('technical-sim-tour-done', '1');
  }
  function openTour() { if (!overlay) return; stepIndex = 0; overlay.removeAttribute('hidden'); renderTour(); nextButton?.focus(); }
  document.getElementById('startTour')?.addEventListener('click', openTour);
  document.getElementById('openTour')?.addEventListener('click', openTour);
  nextButton?.addEventListener('click', () => { if (stepIndex === tourSteps.length - 1) closeTour(); else { stepIndex += 1; renderTour(); } });
  skipButton?.addEventListener('click', closeTour);
  overlay?.addEventListener('click', (event) => { if (event.target.classList.contains('tour-backdrop')) closeTour(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && overlay && !overlay.hasAttribute('hidden')) closeTour(); });
})();
