/* =====================================================================
   THÁM TỬ PROMPT — game.js
   ---------------------------------------------------------------------
   Phần điều khiển trò chơi: màn hình, khung chat, hồ sơ vụ án, lưu tiến
   độ, âm thanh. Dữ liệu & luật nhân vật nằm trong levels.js.

   Cấu trúc:
     1. Luu      — lưu/đọc tiến độ bằng localStorage (an toàn với try/catch)
     2. AmThanh  — hiệu ứng âm thanh & nhạc nền tạo bằng Web Audio (không cần file)
     3. Mua      — hiệu ứng mưa noir trên nền
     4. Giao diện chung (chuyển màn hình, toast, hộp thoại)
     5. Màn hình chính (danh sách vụ án)
     6. Màn chơi (chat + hồ sơ + nộp đáp án)
     7. Thắng màn & Hồ sơ thám tử
     7b. Chế độ Phòng thủ (giao diện)
     8. Khởi động
   ===================================================================== */

'use strict';

/* Rút gọn: lấy phần tử theo id */
const $ = (id) => document.getElementById(id);

/* ---------------------------------------------------------------------
   1. LƯU TIẾN ĐỘ
   Mọi thao tác localStorage đều bọc try/catch vì có trình duyệt chặn
   (chế độ ẩn danh, iframe...). Khi lỗi, game vẫn chạy bình thường.
   --------------------------------------------------------------------- */
const Luu = {
  KHOA: 'thamTuPrompt.v1',

  macDinh() {
    return {
      moKhoa: 1, daPha: {},                 // tiến độ chế độ Tấn công
      phongThu: { moKhoa: 1, daPha: {} },   // tiến độ chế độ Phòng thủ
      cheDo: 'tancong',                     // chế độ đang chọn ở màn hình chính
      amThanh: true, nhacNen: false
    };
  },

  doc() {
    try {
      const raw = localStorage.getItem(this.KHOA);
      if (!raw) return this.macDinh();
      const data = JSON.parse(raw);
      return Object.assign(this.macDinh(), data); // gộp để không thiếu trường
    } catch (e) {
      return this.macDinh();
    }
  },

  ghi(data) {
    try { localStorage.setItem(this.KHOA, JSON.stringify(data)); } catch (e) { /* bỏ qua */ }
  },

  xoa() {
    try { localStorage.removeItem(this.KHOA); } catch (e) { /* bỏ qua */ }
  }
};

let tienDo = Luu.doc();

/* ---------------------------------------------------------------------
   2. ÂM THANH (Web Audio API)
   Tạo âm bằng bộ dao động (oscillator) nên không cần file mp3.
   Trình duyệt chỉ cho phát âm thanh sau khi người chơi bấm/gõ lần đầu.
   --------------------------------------------------------------------- */
const AmThanh = {
  ctx: null,
  nhac: null, // các node của nhạc nền

  khoiTao() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { this.ctx = null; }
  },

  /** Phát một nốt: tần số f (Hz), thời lượng d (giây), dạng sóng, âm lượng, độ trễ */
  not(f, d = 0.12, kieu = 'sine', vol = 0.08, tre = 0) {
    if (!tienDo.amThanh || !this.ctx) return;
    const t = this.ctx.currentTime + tre;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = kieu;
    osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + d + 0.02);
  },

  bam() { this.not(660, 0.05, 'square', 0.03); },
  gui() { this.not(520, 0.07, 'triangle', 0.06); this.not(780, 0.08, 'triangle', 0.05, 0.05); },
  go() { this.not(1400 + Math.random() * 400, 0.02, 'square', 0.012); },     // tiếng máy đánh chữ
  nhan() { this.not(440, 0.1, 'sine', 0.05); this.not(660, 0.12, 'sine', 0.04, 0.06); },
  sai() { this.not(160, 0.25, 'sawtooth', 0.06); this.not(120, 0.3, 'sawtooth', 0.05, 0.12); },
  goiY() { this.not(880, 0.1, 'sine', 0.05); this.not(1175, 0.15, 'sine', 0.04, 0.08); },
  baoDong() {
    for (let i = 0; i < 4; i++) this.not(i % 2 ? 620 : 880, 0.16, 'square', 0.05, i * 0.17);
  },
  thang() {
    // Hợp âm rải kiểu jazz: C - E - G - B - D
    [523, 659, 784, 988, 1175].forEach((f, i) => this.not(f, 0.5, 'triangle', 0.06, i * 0.09));
  },

  /** Nhạc nền: tiếng mưa (nhiễu trắng lọc thấp) + một nốt trầm ngân dài */
  batNhac() {
    if (!this.ctx || this.nhac) return;
    try {
      const ctx = this.ctx;
      // Tạo 2 giây nhiễu trắng và lặp lại
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf; noise.loop = true;
      const loc = ctx.createBiquadFilter();
      loc.type = 'lowpass'; loc.frequency.value = 900;
      const gMua = ctx.createGain(); gMua.gain.value = 0.035;
      noise.connect(loc).connect(gMua).connect(ctx.destination);
      noise.start();

      // Nốt trầm + rung nhẹ (LFO) tạo không khí noir
      const tram = ctx.createOscillator();
      tram.type = 'sine'; tram.frequency.value = 55;
      const gTram = ctx.createGain(); gTram.gain.value = 0.025;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.15;
      const gLfo = ctx.createGain(); gLfo.gain.value = 0.015;
      lfo.connect(gLfo).connect(gTram.gain);
      tram.connect(gTram).connect(ctx.destination);
      tram.start(); lfo.start();

      this.nhac = [noise, tram, lfo];
    } catch (e) { this.nhac = null; }
  },

  tatNhac() {
    if (!this.nhac) return;
    this.nhac.forEach((n) => { try { n.stop(); } catch (e) { /* đã dừng */ } });
    this.nhac = null;
  },

  capNhatNhac() {
    if (tienDo.nhacNen && tienDo.amThanh) this.batNhac(); else this.tatNhac();
  }
};

/* ---------------------------------------------------------------------
   3. HIỆU ỨNG MƯA (canvas) — chỉ chạy ở màn hình chính & hồ sơ
   --------------------------------------------------------------------- */
const Mua = {
  canvas: null, c2d: null, giot: [], chay: false, raf: 0,

  khoiTao() {
    this.canvas = $('rain');
    this.c2d = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.coDan());
    this.coDan();
  },

  coDan() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
    this.c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    const soGiot = Math.round(innerWidth / 9);
    this.giot = Array.from({ length: soGiot }, () => this.taoGiot(true));
  },

  taoGiot(ngauNhienY) {
    return {
      x: Math.random() * innerWidth * 1.2,
      y: ngauNhienY ? Math.random() * innerHeight : -20,
      dai: 10 + Math.random() * 18,
      toc: 6 + Math.random() * 8,
      mo: 0.08 + Math.random() * 0.22
    };
  },

  khung() {
    const c = this.c2d;
    c.clearRect(0, 0, innerWidth, innerHeight);
    c.lineWidth = 1;
    for (const g of this.giot) {
      c.strokeStyle = `rgba(242,200,120,${g.mo})`;
      c.beginPath();
      c.moveTo(g.x, g.y);
      c.lineTo(g.x - g.dai * 0.25, g.y + g.dai);
      c.stroke();
      g.y += g.toc; g.x -= g.toc * 0.25;
      if (g.y > innerHeight) Object.assign(g, this.taoGiot(false));
    }
    if (this.chay) this.raf = requestAnimationFrame(() => this.khung());
  },

  bat() {
    if (this.chay || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.chay = true;
    this.canvas.style.display = '';
    this.khung();
  },

  tat() {
    this.chay = false;
    cancelAnimationFrame(this.raf);
    this.canvas.style.display = 'none';
  }
};

/* ---------------------------------------------------------------------
   4. GIAO DIỆN CHUNG
   --------------------------------------------------------------------- */

/** Chuyển giữa các màn hình: 'menu' | 'game' | 'dossier' */
function hienManHinh(ten) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $('screen-' + ten).classList.add('active');
  if (ten === 'game' || ten === 'defense') Mua.tat(); else Mua.bat();
  window.scrollTo(0, 0);
}

let hengToast = 0;
function toast(noiDung) {
  const el = $('toast');
  el.textContent = noiDung;
  el.classList.add('show');
  clearTimeout(hengToast);
  hengToast = setTimeout(() => el.classList.remove('show'), 2400);
}

/** Mở / đóng hộp thoại */
function moHop(id) { $(id).hidden = false; const b = $(id).querySelector('.btn.primary, .btn.danger'); if (b) b.focus(); }
function dongHop(id) { $(id).hidden = true; }

/** Hộp xác nhận xóa tiến độ */
function xacNhanXoa() {
  moHop('modal-confirm');
}

function xoaTienDo() {
  const giuAmThanh = { amThanh: tienDo.amThanh, nhacNen: tienDo.nhacNen, cheDo: tienDo.cheDo };
  Luu.xoa();
  tienDo = Object.assign(Luu.macDinh(), giuAmThanh);
  Luu.ghi(tienDo);
  dongHop('modal-confirm');
  veMenu();
  hienManHinh('menu');
  toast('Đã xóa tiến độ. Chào mừng thám tử mới!');
}

/** Cập nhật nút âm thanh ở mọi nơi */
function capNhatNutAmThanh() {
  $('btn-sound').textContent = tienDo.amThanh ? '🔊 Âm thanh' : '🔇 Âm thanh';
  $('btn-sound').setAttribute('aria-pressed', String(tienDo.amThanh));
  $('btn-music').setAttribute('aria-pressed', String(tienDo.nhacNen));
  $('btn-sound-2').textContent = tienDo.amThanh ? '🔊' : '🔇';
  $('def-sound').textContent = tienDo.amThanh ? '🔊' : '🔇';
}

function batTatAmThanh() {
  AmThanh.khoiTao();
  tienDo.amThanh = !tienDo.amThanh;
  Luu.ghi(tienDo);
  capNhatNutAmThanh();
  AmThanh.capNhatNhac();
  AmThanh.bam();
  toast(tienDo.amThanh ? 'Đã bật âm thanh' : 'Đã tắt âm thanh');
}

function batTatNhac() {
  AmThanh.khoiTao();
  tienDo.nhacNen = !tienDo.nhacNen;
  if (tienDo.nhacNen && !tienDo.amThanh) tienDo.amThanh = true; // nhạc cần âm thanh
  Luu.ghi(tienDo);
  capNhatNutAmThanh();
  AmThanh.capNhatNhac();
  toast(tienDo.nhacNen ? 'Nhạc nền: mưa đêm 🌧️' : 'Đã tắt nhạc nền');
}

/** Vẽ chuỗi sao: 2 → "★★☆" (sao tắt có class off) */
function htmlSao(so) {
  let s = '';
  for (let i = 1; i <= 3; i++) s += `<span class="${i <= so ? '' : 'off'}">★</span>`;
  return s;
}

/* ---------------------------------------------------------------------
   5. MÀN HÌNH CHÍNH
   --------------------------------------------------------------------- */
function soDaPha() { return Object.keys(tienDo.daPha).length; }
function daPhaDao() { return LEVELS.every((lv) => tienDo.daPha[lv.id]); }

function veMenu() {
  // Nút chọn chế độ
  const phongThu = tienDo.cheDo === 'phongthu';
  $('mode-attack').classList.toggle('active', !phongThu);
  $('mode-defense').classList.toggle('active', phongThu);
  $('mode-attack').setAttribute('aria-selected', String(!phongThu));
  $('mode-defense').setAttribute('aria-selected', String(phongThu));
  if (phongThu) { veMenuPhongThu(); return; }
  $('btn-dossier').textContent = '🗂️ Hồ sơ thám tử';

  const grid = $('case-grid');
  grid.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    // Tiêu đề chương (nếu levels.js có khai báo CHUONG)
    if (typeof CHUONG !== 'undefined') {
      const ch = CHUONG.find((c) => c.tuMan === lv.id);
      if (ch) {
        const h = document.createElement('h2');
        h.className = 'chapter';
        h.innerHTML = '<span></span><small></small>';
        h.querySelector('span').textContent = ch.ten;
        h.querySelector('small').textContent = ch.moTa;
        grid.appendChild(h);
      }
    }
    const moKhoa = lv.id <= tienDo.moKhoa;
    const ketQua = tienDo.daPha[lv.id];
    const the = document.createElement('button');
    the.type = 'button';
    the.className = 'case-card' + (moKhoa ? '' : ' locked') + (ketQua ? ' solved' : '') +
      (moKhoa && !ketQua ? ' current' : '');
    the.style.setProperty('--c', lv.mau);
    the.style.animationDelay = (i * 0.04) + 's';
    the.setAttribute('role', 'listitem');
    the.setAttribute('aria-label', moKhoa ? `Vụ án ${lv.id}: ${lv.ten}` : `Vụ án ${lv.id}: chưa mở khóa`);

    // Dùng textContent cho dữ liệu, chỉ dùng innerHTML cho khung cố định
    the.innerHTML = '<span class="num"></span><span class="av"></span><span class="nm"></span><span class="tc"></span><span class="st"></span>';
    the.querySelector('.num').textContent = 'VỤ ÁN #' + String(lv.id).padStart(2, '0');
    the.querySelector('.av').textContent = moKhoa ? lv.avatar : '🔒';
    the.querySelector('.nm').textContent = moKhoa ? lv.ten : 'Hồ sơ niêm phong';
    the.querySelector('.tc').textContent = ketQua ? lv.kyThuat : (moKhoa ? 'Đang điều tra' : 'Phá vụ trước để mở');
    if (ketQua) the.querySelector('.st').innerHTML = htmlSao(ketQua.sao);

    the.addEventListener('click', () => {
      AmThanh.khoiTao();
      if (!moKhoa) { AmThanh.sai(); toast('🔒 Hãy phá vụ án #' + String(lv.id - 1).padStart(2, '0') + ' trước.'); return; }
      AmThanh.bam();
      batDauMan(lv.id);
    });
    grid.appendChild(the);
  });

  const n = soDaPha();
  $('menu-progress').innerHTML = `Đã phá <b>${n}</b> / ${LEVELS.length} vụ án<div class="progress-bar"><i style="width:${n / LEVELS.length * 100}%"></i></div>`;
  $('btn-dossier').hidden = !daPhaDao();
}

/* ---------------------------------------------------------------------
   6. MÀN CHƠI
   --------------------------------------------------------------------- */

/** Trạng thái của màn đang chơi */
const Man = {
  level: null,      // dữ liệu màn (từ LEVELS)
  ctx: null,        // "trí nhớ" của nhân vật, gồm cả ctx.secret
  luot: 0,          // số tin nhắn đã gửi
  goiY: 0,          // số gợi ý đã mở
  nopSai: 0,        // số lần nộp sai
  dangTraLoi: false,// nhân vật đang "gõ"
  phien: 0,         // mã phiên: tăng mỗi lần vào màn để hủy hẹn giờ cũ
  soPhanHoi: 0,     // đếm phản hồi (cho nhật ký giám sát)
  daThang: false
};

function batDauMan(id) {
  const lv = LEVELS.find((l) => l.id === id);
  if (!lv) return;
  Man.level = lv;
  Man.ctx = { secret: chonNgauNhien(lv.matMa) };  // bí mật ngẫu nhiên mỗi lần chơi
  Man.luot = 0;
  Man.goiY = 0;
  Man.nopSai = 0;
  Man.dangTraLoi = false;
  Man.phien++;
  Man.soPhanHoi = 0;
  Man.daThang = false;

  // Màu nhấn riêng của màn
  document.documentElement.style.setProperty('--accent', lv.mau);

  // Thanh tiêu đề
  $('game-caseno').textContent = 'VỤ ÁN #' + String(lv.id).padStart(2, '0') + ' · ' + lv.kyThuat.toUpperCase();
  $('game-name').textContent = lv.avatar + ' ' + lv.ten;

  // Hồ sơ vụ án
  $('case-avatar').textContent = lv.avatar;
  $('case-name').textContent = lv.ten;
  $('case-role').textContent = lv.vaiTro;
  $('case-persona').textContent = '“' + lv.tinhCach + '”';
  $('case-system').textContent = lv.systemPrompt.join('\n');
  const ul = $('case-defenses');
  ul.innerHTML = '';
  lv.phongThu.forEach((p) => { const li = document.createElement('li'); li.textContent = p; ul.appendChild(li); });
  $('stat-par').textContent = lv.par;
  $('hint-list').innerHTML = '';
  $('btn-hint').disabled = false;
  $('btn-hint').textContent = '💡 Xin gợi ý (còn 3)';
  $('morse-box').hidden = !lv.cocBangMorse;
  $('submit-input').value = '';
  $('submit-msg').textContent = '';
  $('submit-msg').className = 'submit-msg';
  capNhatThongKe();

  // Khung AI Giám Sát
  $('supervisor').hidden = !lv.giamSat;
  $('sup-log').innerHTML = '';
  $('sup-status').textContent = 'Đang theo dõi mọi phản hồi…';
  $('sup-layer1').textContent = 'Lớp 1: KHÓA';
  $('sup-layer1').className = 'layer';
  $('sup-layer1').hidden = lv.khongLop1 === true;   // màn chỉ có giám sát, không có lớp thuyết phục
  $('supervisor').classList.remove('alarm');

  // Khung chat
  $('chat-log').innerHTML = '';
  themTinNhan('system', '📁 Hồ sơ đã mở. Mục tiêu: khiến nghi phạm để lộ mật mã, rồi nộp nó trong hồ sơ vụ án.');
  $('chat-input').value = '';
  $('chat-input').disabled = false;
  $('chat-send').disabled = false;
  chuyenTab('chat');

  hienManHinh('game');

  // Lời mở đầu của nhân vật (có hiệu ứng đang gõ)
  nhanVatTraLoi({ text: chonNgauNhien(lv.moDau), giamSat: null }, true);
  setTimeout(() => { if (window.innerWidth > 860) $('chat-input').focus(); }, 300);
}

function capNhatThongKe() {
  const el = $('stat-turns');
  el.textContent = Man.luot;
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); // chạy lại hiệu ứng
  $('stat-hints').textContent = Man.goiY + '/3';
}

/** Thêm một tin nhắn vào khung chat. loai: 'ai' | 'me' | 'system'
 *  Trả về phần tử bong bóng để có thể gõ chữ dần vào. */
function themTinNhan(loai, text, them = '') {
  const log = $('chat-log');
  const dong = document.createElement('div');
  dong.className = 'msg ' + loai + (them ? ' ' + them : '');

  if (loai !== 'system') {
    const av = document.createElement('div');
    av.className = 'avatar' + (loai === 'me' ? ' me' : '');
    av.textContent = loai === 'me' ? '🕵️' : Man.level.avatar;
    dong.appendChild(av);
  }
  const bong = document.createElement('div');
  bong.className = 'bubble';
  if (loai !== 'system') {
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = loai === 'me' ? 'Thám tử' : Man.level.ten;
    bong.appendChild(who);
  }
  const noiDung = document.createElement('span');
  noiDung.textContent = text; // textContent: an toàn, không chạy mã người chơi gõ
  bong.appendChild(noiDung);
  dong.appendChild(bong);
  log.appendChild(dong);
  log.scrollTop = log.scrollHeight;
  return noiDung;
}

/** Bong bóng "đang gõ..." */
function hienDangGo() {
  const log = $('chat-log');
  const dong = document.createElement('div');
  dong.className = 'msg ai typing';
  dong.innerHTML = '<div class="avatar"></div><div class="bubble"><i></i><i></i><i></i><span>đang gõ…</span></div>';
  dong.querySelector('.avatar').textContent = Man.level.avatar;
  log.appendChild(dong);
  log.scrollTop = log.scrollHeight;
  return dong;
}

/** Người chơi gửi tin nhắn */
function guiTinNhan(e) {
  if (e) e.preventDefault();
  if (!Man.level) return;
  if (Man.dangTraLoi) { toast('⏳ Đợi nghi phạm trả lời xong đã…'); return; }
  const input = $('chat-input');
  const text = input.value.trim();
  if (!text) { input.focus(); return; }

  AmThanh.khoiTao();
  AmThanh.gui();
  themTinNhan('me', text);
  input.value = '';
  tuDoCao();
  Man.luot++;
  capNhatThongKe();

  // Gọi "AI" giả lập trong levels.js
  const ketQua = taoCauTraLoi(Man.level, text, Man.ctx);
  nhanVatTraLoi(ketQua, false);
}

/** Hiển thị câu trả lời: "đang gõ…" → gõ dần từng chữ → (màn 10) giám sát kiểm tra */
function nhanVatTraLoi(ketQua, laMoDau) {
  const phien = Man.phien;
  Man.dangTraLoi = true;
  $('chat-send').disabled = true;

  const dangGo = hienDangGo();
  // Thời gian "suy nghĩ" phụ thuộc độ dài câu, có chút ngẫu nhiên
  const cho = 500 + Math.min(ketQua.text.length * 9, 1200) + Math.random() * 300;

  setTimeout(() => {
    if (phien !== Man.phien) return; // người chơi đã rời màn
    dangGo.remove();

    const biChan = ketQua.giamSat && ketQua.giamSat.chan;
    const span = themTinNhan('ai', '', biChan ? 'blocked' : '');
    goChuDan(span, ketQua.text, phien, () => {
      Man.dangTraLoi = false;
      $('chat-send').disabled = false;
      if (!laMoDau) AmThanh.nhan();
      if (Man.level.giamSat && !laMoDau) capNhatGiamSat(ketQua);
      // Báo chấm đỏ trên tab hồ sơ (điện thoại) khi nhân vật vừa lỡ lời
      if (ketQua.lo && window.innerWidth <= 860) $('tab-dot').hidden = false;
    });
  }, cho);
}

/** Hiệu ứng máy đánh chữ: hiện chữ dần, tổng thời gian tối đa ~1 giây */
function goChuDan(span, text, phien, xong) {
  const ky = Array.from(text); // Array.from để không cắt đôi emoji
  const buoc = Math.max(1, Math.ceil(ky.length / 60));
  let i = 0;
  const log = $('chat-log');
  const tick = () => {
    if (phien !== Man.phien) return;
    i = Math.min(ky.length, i + buoc);
    span.textContent = ky.slice(0, i).join('');
    log.scrollTop = log.scrollHeight;
    if (i % (buoc * 3) === 0) AmThanh.go();
    if (i < ky.length) setTimeout(tick, 16);
    else xong();
  };
  tick();
}

/** Màn 10: cập nhật khung AI Giám Sát sau mỗi phản hồi */
function capNhatGiamSat(ketQua) {
  Man.soPhanHoi++;
  const log = $('sup-log');
  const li = document.createElement('li');
  const sup = $('supervisor');

  if (ketQua.giamSat && ketQua.giamSat.chan) {
    li.className = 'bad';
    li.textContent = `⛔ Phản hồi #${Man.soPhanHoi}: phát hiện mật mã nguyên văn — ĐÃ CHẶN`;
    $('sup-status').textContent = 'CẢNH BÁO! Đã chặn một phản hồi chứa mật mã.';
    sup.classList.remove('alarm'); void sup.offsetWidth; sup.classList.add('alarm');
    AmThanh.baoDong();
  } else {
    li.className = 'good';
    li.textContent = `✔ Phản hồi #${Man.soPhanHoi}: không phát hiện mật mã — cho qua`;
    $('sup-status').textContent = 'Đang theo dõi mọi phản hồi…';
  }
  log.prepend(li);

  // Lớp 1 đã bị thuyết phục chưa?
  const kt = Man.ctx.kyThuat || [];
  if (kt.length) {
    $('sup-layer1').textContent = 'Lớp 1: ĐÃ MỞ (' + kt.join(', ') + ')';
    $('sup-layer1').className = 'layer ok';
  }
}

/** Nút gợi ý: mở lần lượt 3 mức */
function xinGoiY() {
  const lv = Man.level;
  if (!lv || Man.goiY >= lv.goiY.length) return;
  AmThanh.khoiTao();
  AmThanh.goiY();
  const li = document.createElement('li');
  li.textContent = lv.goiY[Man.goiY];
  $('hint-list').appendChild(li);
  Man.goiY++;
  capNhatThongKe();
  if (Man.goiY >= lv.goiY.length) $('btn-hint').disabled = true;
  $('btn-hint').textContent = Man.goiY >= lv.goiY.length ? '💡 Đã dùng hết gợi ý' : `💡 Gợi ý tiếp theo (${Man.goiY + 1}/3)`;
}

/** Nộp mật mã */
function nopDapAn(e) {
  e.preventDefault();
  if (!Man.level || Man.daThang) return;
  const input = $('submit-input');
  const msg = $('submit-msg');
  AmThanh.khoiTao();

  if (!input.value.trim()) {
    msg.textContent = 'Hãy nhập mật mã bạn tìm được.';
    msg.className = 'submit-msg bad';
    input.focus();
    return;
  }

  if (kiemTraDapAn(input.value, Man.ctx.secret)) {
    Man.daThang = true;
    msg.textContent = '✔ Chính xác! Vụ án đã được phá.';
    msg.className = 'submit-msg good';
    themTinNhan('system', '🔓 MẬT MÃ CHÍNH XÁC: ' + Man.ctx.secret, 'win');
    $('chat-input').disabled = true;
    $('chat-send').disabled = true;
    thangMan();
  } else {
    Man.nopSai++;
    AmThanh.sai();
    msg.textContent = '✘ Sai mật mã (' + Man.nopSai + ' lần). Đọc kỹ lại lời khai!';
    msg.className = 'submit-msg bad';
    const card = $('submit-form');
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    input.select();
  }
}

/** Tự giãn chiều cao ô nhập tin nhắn */
function tuDoCao() {
  const t = $('chat-input');
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 140) + 'px';
}

/** Tab trên điện thoại: 'chat' | 'case' */
function chuyenTab(ten) {
  const laChat = ten === 'chat';
  $('tab-chat').classList.toggle('active', laChat);
  $('tab-case').classList.toggle('active', !laChat);
  $('tab-chat').setAttribute('aria-selected', String(laChat));
  $('tab-case').setAttribute('aria-selected', String(!laChat));
  $('panel-chat').classList.toggle('hidden-mobile', !laChat);
  $('panel-case').classList.toggle('hidden-mobile', laChat);
  if (!laChat) $('tab-dot').hidden = true;
}

/* ---------------------------------------------------------------------
   7. THẮNG MÀN & HỒ SƠ THÁM TỬ
   --------------------------------------------------------------------- */

/** Tính sao: ★★★ nếu không gợi ý và trong mức chuẩn; ★★ nếu ≤ 2× chuẩn và ≤ 1 gợi ý */
function tinhSao(luot, goiY, par) {
  if (goiY === 0 && luot <= par) return 3;
  if (goiY <= 1 && luot <= par * 2) return 2;
  return 1;
}

function thangMan() {
  const lv = Man.level;
  const sao = tinhSao(Man.luot, Man.goiY, lv.par);
  const cu = tienDo.daPha[lv.id];
  const lanDau = !cu;
  const daPhaDaoTruoc = daPhaDao();

  // Lưu kết quả tốt nhất (nhiều sao hơn, hoặc bằng sao nhưng ít lượt hơn)
  if (!cu || sao > cu.sao || (sao === cu.sao && Man.luot < cu.luot)) {
    tienDo.daPha[lv.id] = { luot: Man.luot, goiY: Man.goiY, sao };
  }
  tienDo.moKhoa = Math.max(tienDo.moKhoa, Math.min(lv.id + 1, LEVELS.length));
  Luu.ghi(tienDo);

  AmThanh.thang();

  // Điền nội dung hộp thắng
  $('win-eyebrow').textContent = 'Vụ án đã khép lại';
  $('win-title').textContent = 'PHÁ ÁN THÀNH CÔNG!';
  $('win-label-1').textContent = 'Kỹ thuật vừa dùng';
  $('win-label-2').textContent = '🛡️ AI thật phòng thủ thế nào?';
  $('win-stars').innerHTML = htmlSao(sao);
  $('win-meta').textContent = `${Man.luot} lượt · ${Man.goiY} gợi ý · mức chuẩn ${lv.par} lượt` +
    (!lanDau && cu && cu.sao >= sao && cu.luot <= Man.luot ? ' · (kỷ lục cũ vẫn giữ)' : '');
  $('win-tech').textContent = lv.baiHoc.tieuDe;
  $('win-explain').textContent = lv.baiHoc.giaiThich;
  $('win-defense').textContent = lv.baiHoc.phongThu;

  const laCuoi = lv.id === LEVELS.length;
  const vuaPhaDao = !daPhaDaoTruoc && daPhaDao();
  const nutTiep = $('win-next');
  if (laCuoi || vuaPhaDao) {
    nutTiep.textContent = '🗂️ Xem Hồ sơ thám tử';
    nutTiep.onclick = () => { dongHop('modal-win'); moHoSo(); };
  } else {
    // Vụ án tiếp theo = vụ chưa phá đầu tiên sau màn này (hoặc màn kế)
    const keTiep = LEVELS.find((l) => l.id > lv.id && !tienDo.daPha[l.id]) || LEVELS[lv.id];
    nutTiep.textContent = 'Vụ án #' + String(keTiep.id).padStart(2, '0') + ' →';
    nutTiep.onclick = () => { dongHop('modal-win'); batDauMan(keTiep.id); };
  }

  setTimeout(() => {
    phaoGiay();
    moHop('modal-win');
  }, 600);
}

/** Pháo giấy màu vàng/màu nhấn */
function phaoGiay(mauNhan) {
  const khung = $('confetti');
  khung.innerHTML = '';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const mau = ['#f2b53a', mauNhan || (Man.level && Man.level.mau) || '#5ab0ff', '#ecdfc6', '#ffd166'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = mau[i % mau.length];
    p.style.animationDuration = (1.6 + Math.random() * 1.6) + 's';
    p.style.animationDelay = (Math.random() * 0.5) + 's';
    khung.appendChild(p);
  }
}

/** Màn hình "Hồ sơ thám tử" sau khi phá đảo */
function moHoSo(che) {
  if (che === 'phongthu') { moHoSoPhongThu(); return; }
  $('dos-title').innerHTML = 'Hồ Sơ <span>Thám Tử</span>';
  $('dos-turns-label').textContent = 'Tổng số lượt';
  $('dos-hints-label').textContent = 'Gợi ý đã dùng';
  $('dos-note').textContent = 'Hãy nhớ: hiểu cách tấn công là để xây dựng AI an toàn hơn — và để chính bạn không bị lừa bởi những chiêu y hệt ngoài đời thật. Thử sức ở chế độ 🛡️ Phòng thủ nhé!';
  let tongLuot = 0, tongSao = 0, tongGoiY = 0;
  const ol = $('dossier-list');
  ol.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const kq = tienDo.daPha[lv.id] || { luot: 0, sao: 0, goiY: 0 };
    tongLuot += kq.luot; tongSao += kq.sao; tongGoiY += kq.goiY;
    const li = document.createElement('li');
    li.style.setProperty('--c', lv.mau);
    li.style.animationDelay = (i * 0.06) + 's';
    li.innerHTML = '<span class="av"></span><div><b></b><small></small></div><div class="rt"><em></em><span class="luot"></span></div>';
    li.querySelector('.av').textContent = lv.avatar;
    li.querySelector('b').textContent = (i + 1) + '. ' + lv.baiHoc.tieuDe;
    li.querySelector('small').textContent = lv.ten + ' — ' + lv.kyThuat;
    li.querySelector('em').innerHTML = htmlSao(kq.sao);
    li.querySelector('.luot').textContent = kq.luot + ' lượt';
    ol.appendChild(li);
  });

  $('dos-turns').textContent = tongLuot;
  $('dos-stars').textContent = tongSao;
  $('dos-hints').textContent = tongGoiY;

  // Danh hiệu dựa trên tổng số sao
  // Danh hiệu theo TỈ LỆ sao đạt được (tự đúng khi thêm/bớt màn)
  const saoToiDa = LEVELS.length * 3;
  const tiLe = tongSao / saoToiDa;
  $('dos-stars-label').textContent = 'Tổng số sao / ' + saoToiDa;
  $('dos-sub').textContent = LEVELS.length + ' kỹ thuật đã nắm vững';
  let danhHieu = 'THÁM TỬ TẬP SỰ';
  if (tiLe >= 0.93) danhHieu = 'THÁM TỬ HUYỀN THOẠI';
  else if (tiLe >= 0.73) danhHieu = 'THANH TRA LÃO LUYỆN';
  else if (tiLe >= 0.5) danhHieu = 'THÁM TỬ CHÍNH THỨC';
  $('dossier-rank').textContent = danhHieu;

  hienManHinh('dossier');
  AmThanh.thang();
}

/* ---------------------------------------------------------------------
   7b. CHẾ ĐỘ PHÒNG THỦ (giao diện) — dữ liệu & bộ máy nằm trong phongthu.js
   --------------------------------------------------------------------- */

/** Trạng thái màn phòng thủ đang chơi */
const Thu = {
  man: null,          // dữ liệu màn (MAN_PHONG_THU)
  lv: null,           // nhân vật tương ứng bên chế độ Tấn công (để lấy avatar, màu)
  chon: new Set(),    // các thẻ đang bật
  tuKhoa: '',         // danh sách từ khóa người chơi gõ
  lanChay: 0,         // số lần chạy mô phỏng
  goiY: 0,
  dangChay: false,
  daThang: false,
  phien: 0
};

const CHUONG_PHONG_THU = [
  { tuMan: 1, ten: 'Chương 1 · Vá lỗi cơ bản', moTa: 'Mỗi lỗ hổng một lớp bảo vệ' },
  { tuMan: 11, ten: 'Chương 2 · Phòng thủ nâng cao', moTa: 'Agent, dữ liệu ngoài và kiến trúc an toàn' }
];

function phongThuXong() { return MAN_PHONG_THU.every((m) => tienDo.phongThu.daPha[m.id]); }

/** Danh sách màn ở màn hình chính (chế độ Phòng thủ) */
function veMenuPhongThu() {
  const grid = $('case-grid');
  grid.innerHTML = '';
  const pt = tienDo.phongThu;
  MAN_PHONG_THU.forEach((man, i) => {
    const ch = CHUONG_PHONG_THU.find((c) => c.tuMan === man.id);
    if (ch) {
      const h = document.createElement('h2');
      h.className = 'chapter';
      h.innerHTML = '<span></span><small></small>';
      h.querySelector('span').textContent = ch.ten;
      h.querySelector('small').textContent = ch.moTa;
      grid.appendChild(h);
    }
    const lv = LEVELS.find((l) => l.id === man.nhanVat) || {};
    const moKhoa = man.id <= pt.moKhoa;
    const kq = pt.daPha[man.id];
    const the = document.createElement('button');
    the.type = 'button';
    the.className = 'case-card' + (moKhoa ? '' : ' locked') + (kq ? ' solved' : '') + (moKhoa && !kq ? ' current' : '');
    the.style.setProperty('--c', lv.mau || '#5ab0ff');
    the.style.animationDelay = (i * 0.03) + 's';
    the.setAttribute('role', 'listitem');
    the.innerHTML = '<span class="num"></span><span class="av"></span><span class="nm"></span><span class="tc"></span><span class="st"></span>';
    the.querySelector('.num').textContent = 'PHÒNG THỦ #' + String(man.id).padStart(2, '0');
    the.querySelector('.av').textContent = moKhoa ? (lv.avatar || '🛡️') : '🔒';
    the.querySelector('.nm').textContent = moKhoa ? man.ten : 'Hệ thống niêm phong';
    the.querySelector('.tc').textContent = kq ? ('Chi phí ' + kq.chiPhi + ' điểm') : (moKhoa ? 'Đang chờ vá lỗi' : 'Vá hệ thống trước để mở');
    if (kq) the.querySelector('.st').innerHTML = htmlSao(kq.sao);
    the.addEventListener('click', () => {
      AmThanh.khoiTao();
      if (!moKhoa) { AmThanh.sai(); toast('🔒 Hãy vá hệ thống #' + String(man.id - 1).padStart(2, '0') + ' trước.'); return; }
      AmThanh.bam();
      batDauPhongThu(man.id);
    });
    grid.appendChild(the);
  });
  const n = Object.keys(pt.daPha).length;
  $('menu-progress').innerHTML = `Đã vá <b>${n}</b> / ${MAN_PHONG_THU.length} hệ thống<div class="progress-bar"><i style="width:${n / MAN_PHONG_THU.length * 100}%"></i></div>`;
  $('btn-dossier').hidden = !phongThuXong();
  $('btn-dossier').textContent = '🗂️ Hồ sơ chuyên gia';
}

/** Bắt đầu một màn phòng thủ */
function batDauPhongThu(id) {
  const man = MAN_PHONG_THU.find((m) => m.id === id);
  if (!man) return;
  const lv = LEVELS.find((l) => l.id === man.nhanVat) || { avatar: '🛡️', mau: '#5ab0ff', ten: man.ten, vaiTro: '' };
  Object.assign(Thu, { man, lv, chon: new Set(), tuKhoa: '', lanChay: 0, goiY: 0, dangChay: false, daThang: false });
  Thu.phien++;

  document.documentElement.style.setProperty('--accent', lv.mau);
  $('def-caseno').textContent = 'PHÒNG THỦ #' + String(man.id).padStart(2, '0') + ' · NGÂN SÁCH ' + man.nganSach + ' ĐIỂM';
  $('def-name').textContent = lv.avatar + ' ' + man.ten;
  $('def-avatar').textContent = lv.avatar;
  $('def-title').textContent = lv.ten;
  $('def-role').textContent = lv.vaiTro;
  $('def-desc').textContent = man.moTa;

  // Tình báo: các kỹ thuật tấn công sắp gặp
  const chips = $('def-threats');
  chips.innerHTML = '';
  const daCo = new Set();
  man.tanCong.forEach((tc) => tc.kt.forEach((k) => {
    const khoa = k + (tc.manh ? '+' : '');
    if (daCo.has(khoa)) return;
    daCo.add(khoa);
    const c = document.createElement('span');
    c.className = 'chip' + (tc.manh ? ' manh' : '');
    c.textContent = (TEN_KY_THUAT[k] || k) + (tc.manh ? ' ⚡mạnh' : '');
    chips.appendChild(c);
  }));
  const ul = $('def-legit');
  ul.innerHTML = '';
  man.khach.forEach((kh) => { const li = document.createElement('li'); li.textContent = kh.text; ul.appendChild(li); });

  veThePhongThu();
  $('def-hint-list').innerHTML = '';
  $('def-hint').disabled = false;
  $('def-hint').textContent = '💡 Xin gợi ý (còn 3)';
  $('def-results').innerHTML = '';
  $('def-summary').innerHTML = '<p class="muted">Chọn các lớp phòng thủ, rồi bấm <b>Chạy mô phỏng</b>. Hệ thống sẽ thử mọi biến thể tấn công và gửi tin nhắn của khách thật. Thẻ ⚡ <b>mạnh</b> bỏ qua mọi quy tắc trong system prompt.</p>';
  $('def-run').disabled = false;
  $('def-tab-dot').hidden = true;
  chuyenTabPT('config');
  hienManHinh('defense');
}

/** Vẽ các thẻ phòng thủ, chia theo lớp */
function veThePhongThu() {
  const man = Thu.man;
  const duocDung = theDuocDung(man);
  const box = $('def-cards');
  box.innerHTML = '';
  ['vao', 'mohinh', 'ra', 'kientruc'].forEach((lop) => {
    const ds = THE_PHONG_THU.filter((t) => t.lop === lop && duocDung.includes(t.id));
    if (!ds.length) return;
    const g = document.createElement('div');
    g.className = 'card-group';
    const h = document.createElement('h3');
    h.textContent = TEN_LOP[lop];
    g.appendChild(h);
    ds.forEach((t) => {
      const lab = document.createElement('label');
      lab.className = 'def-card' + (Thu.chon.has(t.id) ? ' on' : '');
      lab.innerHTML = '<input type="checkbox"><span><b></b><small></small></span><span class="cost"></span>';
      const cb = lab.querySelector('input');
      cb.checked = Thu.chon.has(t.id);
      lab.querySelector('b').textContent = t.ten;
      if (man.theMoi.includes(t.id)) {
        const m = document.createElement('span'); m.className = 'new'; m.textContent = 'MỚI';
        lab.querySelector('b').appendChild(m);
      }
      lab.querySelector('small').textContent = t.cauLenh ? '“' + t.cauLenh + '”' : t.moTa;
      lab.querySelector('.cost').textContent = t.id === 'loc_tu_khoa' ? '1đ/3 từ' : t.chiPhi + 'đ';
      cb.addEventListener('change', () => {
        AmThanh.bam();
        if (cb.checked) Thu.chon.add(t.id); else Thu.chon.delete(t.id);
        lab.classList.toggle('on', cb.checked);
        if (t.id === 'loc_tu_khoa') veThePhongThu(); // hiện/ẩn ô từ khóa
        capNhatNganSach();
      });
      g.appendChild(lab);

      // Ô nhập từ khóa ngay dưới thẻ bộ lọc
      if (t.id === 'loc_tu_khoa' && Thu.chon.has('loc_tu_khoa')) {
        const kw = document.createElement('div');
        kw.className = 'kw-box';
        kw.innerHTML = '<textarea placeholder="Các từ cần chặn, cách nhau bằng dấu phẩy. VD: mật mã, mật khẩu"></textarea><small></small>';
        const ta = kw.querySelector('textarea');
        ta.value = Thu.tuKhoa;
        ta.setAttribute('aria-label', 'Danh sách từ khóa cần chặn');
        ta.addEventListener('input', () => { Thu.tuKhoa = ta.value; capNhatNganSach(); });
        g.appendChild(kw);
      }
    });
    box.appendChild(g);
  });
  capNhatNganSach();
}

/** Cập nhật thanh ngân sách và system prompt xem trước */
function capNhatNganSach() {
  const man = Thu.man;
  const kws = tachTuKhoa(Thu.tuKhoa);
  const chiPhi = tinhChiPhi(Thu.chon, kws);
  const vuot = chiPhi > man.nganSach;
  $('def-budget-text').textContent = chiPhi + ' / ' + man.nganSach + ' điểm';
  $('def-budget-bar').style.width = Math.min(100, chiPhi / man.nganSach * 100) + '%';
  $('def-budget').classList.toggle('over', vuot);
  $('def-budget-note').textContent = vuot ? '⚠ Vượt ngân sách — cấu hình này không được duyệt.' :
    (Thu.chon.has('loc_tu_khoa') ? `Bộ lọc: ${kws.length} từ khóa (tối đa 9).` : 'Mỗi thẻ có chi phí. Càng ít điểm, càng nhiều sao.');
  const kwSmall = document.querySelector('.kw-box small');
  if (kwSmall) kwSmall.textContent = kws.length ? 'Đang chặn: ' + kws.join(' · ') : 'Chưa có từ khóa nào.';

  // System prompt người chơi đang xây
  const dong = ['Bạn là ' + Thu.lv.ten + '.'];
  dong.push(Thu.chon.has('kt_tach_bi_mat') ? '(Mật mã KHÔNG có ở đây. Dùng công cụ kiem_tra_ma() khi cần xác minh.)' : 'Mật mã: ██████');
  THE_PHONG_THU.filter((t) => t.lop === 'mohinh' && Thu.chon.has(t.id)).forEach((t) => dong.push('- ' + t.cauLenh));
  if (dong.length === 2) dong.push('(Chưa có quy tắc nào — hãy bật thẻ ở Lớp mô hình.)');
  $('def-sp').textContent = dong.join('\n');
}

/** Chạy mô phỏng và hiện kết quả từng dòng */
function chayMoPhongUI() {
  if (!Thu.man || Thu.dangChay) return;
  AmThanh.khoiTao();
  AmThanh.gui();
  const man = Thu.man;
  const kq = chayMoPhong(man, Thu.chon, tachTuKhoa(Thu.tuKhoa));
  Thu.lanChay++;
  Thu.dangChay = true;
  $('def-run').disabled = true;
  const phien = Thu.phien;

  // Tổng kết
  const chan = kq.tanCong.filter((x) => x.chan).length;
  const phucVu = kq.khach.filter((x) => x.ok).length;
  let ketLuan;
  if (kq.thang) ketLuan = '<p class="verdict good-c">✔ HỆ THỐNG AN TOÀN — đã duyệt!</p>';
  else if (!kq.chanHet) ketLuan = '<p class="verdict bad-c">💥 Còn ' + (kq.tanCong.length - chan) + ' tấn công lọt qua!</p>';
  else if (!kq.phucVuHet) ketLuan = '<p class="verdict warn-c">⚠ Chặn nhầm khách thật — chặn quá tay rồi!</p>';
  else ketLuan = '<p class="verdict warn-c">⚠ An toàn nhưng vượt ngân sách. Tìm cách rẻ hơn!</p>';
  $('def-summary').innerHTML =
    '<div class="sum-grid">' +
    `<div><span class="${chan === kq.tanCong.length ? 'good-c' : 'bad-c'}">${chan}/${kq.tanCong.length}</span><small>Tấn công bị chặn</small></div>` +
    `<div><span class="${kq.phucVuHet ? 'good-c' : 'warn-c'}">${phucVu}/${kq.khach.length}</span><small>Khách được phục vụ</small></div>` +
    `<div><span class="${kq.trongNganSach ? 'good-c' : 'bad-c'}">${kq.chiPhi}/${man.nganSach}</span><small>Chi phí</small></div>` +
    '</div>' + ketLuan + `<p class="muted small" style="text-align:center;margin-top:6px">Lần mô phỏng thứ ${Thu.lanChay}</p>`;

  // Danh sách chi tiết: lỗi hiện lên đầu để dễ thấy
  const dong = [];
  kq.tanCong.forEach((x) => dong.push({ loai: 'tc', x }));
  kq.khach.forEach((x) => dong.push({ loai: 'kh', x }));
  dong.sort((a, b) => Number(laLoi(a)) - Number(laLoi(b))).reverse();
  const ol = $('def-results');
  ol.innerHTML = '';

  if (window.innerWidth <= 860) chuyenTabPT('sim');

  dong.forEach((d, i) => {
    setTimeout(() => {
      if (phien !== Thu.phien) return;
      ol.appendChild(veDongKetQua(d));
      if (laLoi(d)) AmThanh.not(180, 0.08, 'sawtooth', 0.03); else AmThanh.go();
      if (i === dong.length - 1) xongMoPhong(kq, phien);
    }, i * 90);
  });
  if (!dong.length) xongMoPhong(kq, phien);
}

function laLoi(d) { return d.loai === 'tc' ? !d.x.chan : !d.x.ok; }

/** Vẽ một dòng kết quả */
function veDongKetQua(d) {
  const li = document.createElement('li');
  li.innerHTML = '<div class="rh"><span class="l"></span><span class="r"></span></div><div class="msgtext"></div><div class="out"></div>';
  const x = d.x;
  if (d.loai === 'tc') {
    li.className = x.chan ? 'blocked' : 'leak';
    li.querySelector('.l').textContent = '🗡️ ' + x.tc.kt.map((k) => TEN_KY_THUAT[k] || k).join(' + ') + (x.tc.manh ? ' ⚡' : '');
    li.querySelector('.r').textContent = x.chan ? '🛡 Đã chặn' : '💥 Lọt';
    li.querySelector('.msgtext').textContent = '“' + x.text + '”';
    li.querySelector('.out').textContent = x.chan
      ? 'Chặn ở ' + TEN_LOP[x.lop] + ' — ' + x.ten + ' (' + x.chiTiet + ')'
      : 'AI trả lời: ' + cauRoRi(Thu.man, x.tc);
  } else {
    li.className = x.ok ? 'served' : 'overblock';
    li.querySelector('.l').textContent = '👤 Khách thật';
    li.querySelector('.r').textContent = x.ok ? '✔ Phục vụ' : '⚠ Chặn nhầm';
    li.querySelector('.msgtext').textContent = '“' + x.kh.text + '”';
    li.querySelector('.out').textContent = x.ok ? 'Trả lời bình thường.' : 'Bị chặn bởi ' + x.ten + ' (' + x.chiTiet + ') — khách bực mình bỏ đi!';
  }
  return li;
}

function xongMoPhong(kq, phien) {
  if (phien !== Thu.phien) return;
  Thu.dangChay = false;
  $('def-run').disabled = false;
  $('def-run').textContent = '▶ Chạy lại mô phỏng';
  if (kq.thang) {
    setTimeout(() => thangPhongThu(kq), 500);
  } else {
    AmThanh.sai();
  }
}

/** Thắng màn phòng thủ */
function thangPhongThu(kq) {
  if (Thu.daThang) return;
  Thu.daThang = true;
  const man = Thu.man;
  const toiUu = chiPhiToiUu(man);
  const sao = tinhSaoPhongThu(kq.chiPhi, toiUu);
  const pt = tienDo.phongThu;
  const cu = pt.daPha[man.id];
  const xongTruoc = phongThuXong();
  if (!cu || sao > cu.sao || (sao === cu.sao && kq.chiPhi < cu.chiPhi)) {
    pt.daPha[man.id] = { chiPhi: kq.chiPhi, sao, lanChay: Thu.lanChay, goiY: Thu.goiY };
  }
  pt.moKhoa = Math.max(pt.moKhoa, Math.min(man.id + 1, MAN_PHONG_THU.length));
  Luu.ghi(tienDo);
  AmThanh.thang();

  $('win-eyebrow').textContent = 'Hệ thống đã được vá';
  $('win-title').textContent = 'PHÒNG THỦ THÀNH CÔNG!';
  $('win-stars').innerHTML = htmlSao(sao);
  $('win-meta').textContent = `Chi phí ${kq.chiPhi}/${man.nganSach} · tối ưu ${toiUu} điểm · ${Thu.lanChay} lần mô phỏng · ${Thu.goiY} gợi ý`;
  $('win-label-1').textContent = 'Bài học phòng thủ';
  $('win-tech').textContent = man.baiHoc.tieuDe;
  $('win-explain').textContent = man.baiHoc.giaiThich;
  $('win-label-2').textContent = '🌍 Ngoài đời thật';
  $('win-defense').textContent = man.baiHoc.phongThu;

  const nut = $('win-next');
  if (man.id === MAN_PHONG_THU.length || (!xongTruoc && phongThuXong())) {
    nut.textContent = '🗂️ Xem Hồ sơ chuyên gia';
    nut.onclick = () => { dongHop('modal-win'); moHoSoPhongThu(); };
  } else {
    const keTiep = MAN_PHONG_THU.find((m) => m.id > man.id && !pt.daPha[m.id]) || MAN_PHONG_THU[man.id];
    nut.textContent = 'Hệ thống #' + String(keTiep.id).padStart(2, '0') + ' →';
    nut.onclick = () => { dongHop('modal-win'); batDauPhongThu(keTiep.id); };
  }
  phaoGiay(Thu.lv.mau);
  moHop('modal-win');
}

function xinGoiYPhongThu() {
  const man = Thu.man;
  if (!man || Thu.goiY >= man.goiY.length) return;
  AmThanh.khoiTao();
  AmThanh.goiY();
  const li = document.createElement('li');
  li.textContent = man.goiY[Thu.goiY];
  $('def-hint-list').appendChild(li);
  Thu.goiY++;
  $('def-hint').disabled = Thu.goiY >= man.goiY.length;
  $('def-hint').textContent = Thu.goiY >= man.goiY.length ? '💡 Đã dùng hết gợi ý' : `💡 Gợi ý tiếp theo (${Thu.goiY + 1}/3)`;
}

/** Tab trên điện thoại: 'config' | 'sim' */
function chuyenTabPT(ten) {
  const cfg = ten === 'config';
  $('def-tab-config').classList.toggle('active', cfg);
  $('def-tab-sim').classList.toggle('active', !cfg);
  $('def-tab-config').setAttribute('aria-selected', String(cfg));
  $('def-tab-sim').setAttribute('aria-selected', String(!cfg));
  $('def-panel-config').classList.toggle('hidden-mobile', !cfg);
  $('def-panel-sim').classList.toggle('hidden-mobile', cfg);
  if (!cfg) $('def-tab-dot').hidden = true;
}

/** Hồ sơ chuyên gia (phá đảo chế độ Phòng thủ) */
function moHoSoPhongThu() {
  let tongChiPhi = 0, tongSao = 0, tongLan = 0;
  const ol = $('dossier-list');
  ol.innerHTML = '';
  MAN_PHONG_THU.forEach((man, i) => {
    const lv = LEVELS.find((l) => l.id === man.nhanVat) || { avatar: '🛡️', mau: '#5ab0ff' };
    const kq = tienDo.phongThu.daPha[man.id] || { chiPhi: 0, sao: 0, lanChay: 0 };
    tongChiPhi += kq.chiPhi; tongSao += kq.sao; tongLan += kq.lanChay;
    const li = document.createElement('li');
    li.style.setProperty('--c', lv.mau);
    li.style.animationDelay = (i * 0.04) + 's';
    li.innerHTML = '<span class="av"></span><div><b></b><small></small></div><div class="rt"><em></em><span class="luot"></span></div>';
    li.querySelector('.av').textContent = lv.avatar;
    li.querySelector('b').textContent = (i + 1) + '. ' + man.baiHoc.tieuDe;
    li.querySelector('small').textContent = man.ten;
    li.querySelector('em').innerHTML = htmlSao(kq.sao);
    li.querySelector('.luot').textContent = kq.chiPhi + ' điểm';
    ol.appendChild(li);
  });
  const saoToiDa = MAN_PHONG_THU.length * 3;
  const tiLe = tongSao / saoToiDa;
  $('dos-title').innerHTML = 'Hồ Sơ <span>Chuyên Gia</span>';
  $('dos-turns').textContent = tongChiPhi;
  $('dos-turns-label').textContent = 'Tổng chi phí';
  $('dos-stars').textContent = tongSao;
  $('dos-stars-label').textContent = 'Tổng số sao / ' + saoToiDa;
  $('dos-hints').textContent = tongLan;
  $('dos-hints-label').textContent = 'Lần mô phỏng';
  $('dos-sub').textContent = MAN_PHONG_THU.length + ' bài học phòng thủ';
  $('dos-note').textContent = 'Bạn đã tự tay trải nghiệm vì sao bảo mật AI cần nhiều lớp: quy tắc, giám sát, phân quyền — và trên hết là thiết kế để mô hình không chạm vào thứ nó không cần biết.';
  let danhHieu = 'THỰC TẬP SINH AN NINH';
  if (tiLe >= 0.93) danhHieu = 'KIẾN TRÚC SƯ BẢO MẬT';
  else if (tiLe >= 0.73) danhHieu = 'CHUYÊN GIA PHÒNG THỦ';
  else if (tiLe >= 0.5) danhHieu = 'KỸ SƯ BẢO MẬT';
  $('dossier-rank').textContent = danhHieu;
  hienManHinh('dossier');
  AmThanh.thang();
}

/* ---------------------------------------------------------------------
   8. KHỞI ĐỘNG — gắn sự kiện cho các nút
   --------------------------------------------------------------------- */
function khoiDong() {
  // Kiểm tra levels.js đã nạp chưa
  if (typeof LEVELS === 'undefined') {
    document.body.innerHTML = '<p style="padding:2rem">Lỗi: không tải được levels.js. Hãy kiểm tra các file nằm cùng thư mục.</p>';
    return;
  }

  Mua.khoiTao();
  // Số màn lấy từ levels.js, nên thêm màn không cần sửa file này
  $('tagline').textContent = `${LEVELS.length} nhân vật AI. ${LEVELS.length} mật mã. Chỉ có lời nói làm vũ khí.`;
  capNhatNutAmThanh();
  veMenu();
  hienManHinh('menu');

  // Bảng Morse trong hồ sơ
  $('morse-grid').innerHTML = '';
  Object.entries(MORSE).filter(([k]) => /[A-Z]/.test(k)).forEach(([k, v]) => {
    const s = document.createElement('span');
    s.innerHTML = '<b></b>';
    s.querySelector('b').textContent = k;
    s.append(v);
    $('morse-grid').appendChild(s);
  });

  // Màn hình chính
  $('btn-help').onclick = () => { AmThanh.khoiTao(); AmThanh.bam(); moHop('modal-help'); };
  $('help-close').onclick = () => dongHop('modal-help');
  $('btn-sound').onclick = batTatAmThanh;
  $('btn-sound-2').onclick = batTatAmThanh;
  $('btn-music').onclick = batTatNhac;
  $('btn-reset').onclick = xacNhanXoa;
  $('btn-dossier').onclick = () => moHoSo(tienDo.cheDo);
  $('confirm-no').onclick = () => dongHop('modal-confirm');
  $('confirm-yes').onclick = xoaTienDo;

  // Màn chơi
  $('btn-back').onclick = () => { Man.phien++; Man.dangTraLoi = false; AmThanh.bam(); veMenu(); hienManHinh('menu'); };
  $('btn-restart-level').onclick = () => {
    if (!Man.level) return;
    AmThanh.bam();
    batDauMan(Man.level.id);
    toast('Vụ án được mở lại — mật mã đã đổi!');
  };
  $('chat-form').addEventListener('submit', guiTinNhan);
  $('chat-input').addEventListener('input', tuDoCao);
  $('chat-input').addEventListener('keydown', (e) => {
    // Enter = gửi, Shift+Enter = xuống dòng (dùng cho mẫu điền nhiều dòng ở màn 9)
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); guiTinNhan(); }
  });
  $('btn-hint').onclick = xinGoiY;
  $('submit-form').addEventListener('submit', nopDapAn);
  $('tab-chat').onclick = () => chuyenTab('chat');
  $('tab-case').onclick = () => chuyenTab('case');

  // Hộp thắng & hồ sơ
  $('win-menu').onclick = () => { dongHop('modal-win'); veMenu(); hienManHinh('menu'); };
  $('btn-dos-menu').onclick = () => { veMenu(); hienManHinh('menu'); };
  $('btn-dos-reset').onclick = xacNhanXoa;

  // Chọn chế độ
  $('mode-attack').onclick = () => { AmThanh.khoiTao(); AmThanh.bam(); tienDo.cheDo = 'tancong'; Luu.ghi(tienDo); veMenu(); };
  $('mode-defense').onclick = () => { AmThanh.khoiTao(); AmThanh.bam(); tienDo.cheDo = 'phongthu'; Luu.ghi(tienDo); veMenu(); };

  // Màn phòng thủ
  $('def-back').onclick = () => { Thu.phien++; AmThanh.bam(); veMenu(); hienManHinh('menu'); };
  $('def-sound').onclick = batTatAmThanh;
  $('def-reset').onclick = () => { if (Thu.man) { AmThanh.bam(); batDauPhongThu(Thu.man.id); toast('Đã xóa cấu hình phòng thủ.'); } };
  $('def-run').onclick = chayMoPhongUI;
  $('def-hint').onclick = xinGoiYPhongThu;
  $('def-tab-config').onclick = () => chuyenTabPT('config');
  $('def-tab-sim').onclick = () => chuyenTabPT('sim');

  // Phím Esc đóng hộp thoại (trừ hộp thắng — phải chọn hướng đi)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    ['modal-help', 'modal-confirm'].forEach((id) => { if (!$(id).hidden) dongHop(id); });
  });
  // Bấm ra ngoài hộp thoại để đóng
  ['modal-help', 'modal-confirm'].forEach((id) => {
    $(id).addEventListener('click', (e) => { if (e.target.id === id) dongHop(id); });
  });

  // Nhạc nền chỉ bắt đầu sau tương tác đầu tiên (quy định của trình duyệt)
  document.addEventListener('pointerdown', function batLanDau() {
    AmThanh.khoiTao();
    AmThanh.capNhatNhac();
    document.removeEventListener('pointerdown', batLanDau);
  });
}

document.addEventListener('DOMContentLoaded', khoiDong);
