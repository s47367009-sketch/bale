/* ═══════════════════════════════════════════════════════════
   BalePay — منطق اصلی پنل
   بخش‌ها: هلپرها، Toast، روتر، تم، داشبورد، تراکنش‌ها،
   پیام گروهی، تنظیمات، ابزار تست/دیباگ، شبیه‌ساز، درباره
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ─────────────── Helpers ─────────────── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fa = (n) => Number(n).toLocaleString('fa-IR');
const money = (n) => fa(n) + ' ت';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const enDigits = (s) => String(s)
  .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const STATUS_CLASS = {
  'تأیید شده': 'ok', 'در انتظار': 'warn', 'رد شده': 'danger', 'بازگشت خورده': 'violet',
  'ارسال شد': 'ok', 'در حال ارسال': 'info',
};

/* ─────────────── Toast ─────────────── */
const TOAST_ICON = { success: 'i-check-c', error: 'i-x-c', warn: 'i-alert', info: 'i-info' };
function toast(msg, type = 'info') {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<svg class="ic"><use href="#${TOAST_ICON[type] || TOAST_ICON.info}"/></svg><span>${msg}</span>`;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 3400);
}

/* ─────────────── Router ─────────────── */
const VIEWS = {
  dashboard:    { title: 'داشبورد',        sub: 'نمای کلی عملکرد فروش و سفارشات' },
  transactions: { title: 'لیست تراکنش‌ها', sub: 'مدیریت و فیلتر تراکنش‌های کارت به کارت' },
  bulk:         { title: 'پیام گروهی',     sub: 'ارسال پیام به کاربران بله و تلگرام' },
  settings:     { title: 'تنظیمات',        sub: 'پیکربندی اتصال‌ها، پرداخت و اعلان‌ها' },
  simulator:    { title: 'شبیه‌ساز',       sub: 'تست سناریوهای ربات پیش از راه‌اندازی' },
  about:        { title: 'درباره بله‌پی',  sub: 'نسخه ۱.۰ · BalePay' },
};

function navigate() {
  const name = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const view = VIEWS[name] ? name : 'dashboard';
  $$('.view').forEach((v) => v.classList.toggle('is-active', v.id === 'view-' + view));
  $$('.nav-link').forEach((a) => a.classList.toggle('is-active', a.dataset.view === view));
  $('#pageTitle').textContent = VIEWS[view].title;
  $('#pageSub').textContent = VIEWS[view].sub;
  closeSidebar();
  window.scrollTo({ top: 0 });
  if (view === 'dashboard') requestAnimationFrame(() => Dashboard.draw());
}
window.addEventListener('hashchange', navigate);

/* ─────────────── Theme ─────────────── */
function applyTheme(id, announce = false) {
  document.documentElement.dataset.theme = id;
  store.set('balepay-theme', id);
  renderThemes();
  if (announce) toast(`تم «${DATA.themes.find((t) => t.id === id).name}» اعمال شد`, 'success');
  if ($('#view-dashboard').classList.contains('is-active')) Dashboard.draw();
}

function renderThemes() {
  const active = document.documentElement.dataset.theme;
  $('#themeGrid').innerHTML = DATA.themes.map((t) => `
    <button class="theme-card ${t.id === active ? 'is-active' : ''}" data-theme-id="${t.id}">
      <span class="theme-check"><svg class="ic"><use href="#i-check"/></svg></span>
      <span class="theme-sw" style="background:linear-gradient(135deg, ${t.c1}, ${t.c2})"></span>
      ${t.name}
    </button>`).join('');
}

/* ─────────────── Dashboard ─────────────── */
const Dashboard = {
  draw() {
    Charts.bar($('#salesChart'), DATA.week, $('#chartTip'));
    Charts.donut($('#statusChart'), DATA.statuses, $('#statusLegend'));
  },
};

function renderStats() {
  $('#statsGrid').innerHTML = DATA.stats.map((s) => `
    <div class="stat-card">
      <div class="stat-ic"><svg class="ic"><use href="#${s.icon}"/></svg></div>
      <div>
        <div class="stat-val">${s.value}</div>
        <div class="stat-lbl">${s.label}</div>
        <div class="stat-trend ${s.up ? 'up' : 'down'}">
          <svg class="ic"><use href="#i-trend-${s.up ? 'up' : 'down'}"/></svg>${s.delta}
        </div>
      </div>
    </div>`).join('');
}

const txRow = (t, i, actions = false) => `
  <tr>
    <td class="num">${fa(i + 1)}</td>
    <td><span class="num">#${fa(t.id)}</span></td>
    <td>${t.customer}</td>
    ${actions ? `<td><span class="ltr muted">${t.phone}</span></td>` : ''}
    <td class="num">${money(t.amount)}</td>
    <td><span class="pf ${t.platform === 'بله' ? 'pf-bale' : 'pf-tg'}">
      <svg class="ic"><use href="#${t.platform === 'بله' ? 'i-bale' : 'i-telegram'}"/></svg>${t.platform}</span></td>
    <td><span class="badge ${STATUS_CLASS[t.status] || ''}">${t.status}</span></td>
    <td><span class="ltr muted small">${t.date}</span></td>
    ${actions ? `<td><div class="table-actions">
      <button class="icon-btn" data-view-tx="${t.id}" title="مشاهده"><svg class="ic"><use href="#i-eye"/></svg></button>
      <button class="icon-btn" data-del-tx="${t.id}" title="حذف"><svg class="ic danger-c"><use href="#i-trash"/></svg></button>
    </div></td>` : ''}
  </tr>`;

function renderLatest() {
  $('#latestBody').innerHTML = DATA.transactions.slice(0, 5).map((t, i) => txRow(t, i)).join('');
}

/* ─────────────── Transactions ─────────────── */
let filteredTx = [...DATA.transactions];

function applyFilters() {
  const customer = $('#txCustomer').value;
  const status = $('#txStatus').value;
  const platform = $('#txPlatform').value;
  const from = enDigits($('#txFrom').value.trim());
  const to = enDigits($('#txTo').value.trim());

  filteredTx = DATA.transactions.filter((t) =>
    (!customer || t.customer === customer) &&
    (!status || t.status === status) &&
    (!platform || t.platform === platform) &&
    (!from || t.date >= from) &&
    (!to || t.date <= to)
  );

  $('#txBody').innerHTML = filteredTx.length
    ? filteredTx.map((t, i) => txRow(t, i, true)).join('')
    : `<tr class="empty-row"><td colspan="9">تراکنشی با این فیلترها پیدا نشد</td></tr>`;
  $('#txInfo').innerHTML = `در مجموع <b>${fa(DATA.totalTransactions)}</b> تراکنش · نمایش <b>${fa(filteredTx.length)}</b> مورد`;
}

function exportCSV() {
  const head = ['#', 'سفارش', 'مشتری', 'تلفن', 'مبلغ (تومان)', 'پلتفرم', 'وضعیت', 'تاریخ'];
  const rows = filteredTx.map((t, i) => [i + 1, '#' + t.id, t.customer, enDigits(t.phone), t.amount, t.platform, t.status, t.date]);
  const csv = '\uFEFF' + [head, ...rows].map((r) => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'balepay-transactions.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`خروجی CSV دانلود شد (${fa(filteredTx.length)} تراکنش)`, "success");
}

/* ─────────────── Bulk Message ─────────────── */
function renderHistory() {
  $('#bulkHistoryBody').innerHTML = DATA.bulkHistory.map((h) => `
    <tr>
      <td class="num">${h.title}</td>
      <td>${fa(h.count)}</td>
      <td><span class="pf ${h.platform === 'بله' ? 'pf-bale' : 'pf-tg'}">
        <svg class="ic"><use href="#${h.platform === 'بله' ? 'i-bale' : 'i-telegram'}"/></svg>${h.platform}</span></td>
      <td><span class="ltr muted small">${h.date}</span></td>
      <td><span class="badge ${STATUS_CLASS[h.status] || ''}">${h.status}</span></td>
    </tr>`).join('');
}

function updatePreview() {
  $('#pvTitle').textContent = $('#bulkTitle').value.trim() || 'عنوان پیام اینجا...';
  $('#pvText').textContent = $('#bulkText').value.trim() || 'متن پیام اینجا نمایش داده می‌شود...';
  const t = $('#bulkTarget').value;
  $('#pvChannel').textContent = t === 'کاربران تلگرام' ? 'تلگرام' : t === 'کاربران بله' ? 'بله' : t === 'فعال در ۳۰ روز اخیر' ? 'بله + تلگرام' : 'همه پلتفرم‌ها';
}

function sendBulk(test = false) {
  const title = $('#bulkTitle').value.trim();
  const text = $('#bulkText').value.trim();
  if (!test && (!title || !text)) return toast('عنوان و متن پیام را کامل کنید', 'warn');
  if (test) return toast('پیام تست به آیدی مدیر ارسال شد ✅', 'info');

  const target = $('#bulkTarget').value;
  const platform = target === 'کاربران بله' ? 'بله' : target === 'کاربران تلگرام' ? 'تلگرام' : 'بله';
  const count = 80 + Math.floor(Math.random() * 90);
  DATA.bulkHistory.unshift({ title, count, platform, date: '۱۴۰۳/۰۶/۲۱', status: 'ارسال شد' });
  renderHistory();
  addLog(`Bulk message "${title}" sent to ${count} users (${platform})`, 'ok');
  toast(`پیام گروهی برای ${fa(count)} کاربر ارسال شد ✅`, 'success');
}

/* ─────────────── Settings: tabs & misc ─────────────── */
function initSettings() {
  /* تب‌ها */
  $('#settingsTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    $$('#settingsTabs .tab').forEach((t) => t.classList.toggle('is-active', t === tab));
    $$('.tab-panel').forEach((p) => p.classList.toggle('is-active', p.dataset.panel === tab.dataset.tab));
  });

  /* تست اتصال */
  $$('.btn[data-conn]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<svg class="ic sm spin"><use href="#i-refresh"/></svg>در حال تست...';
      await sleep(900);
      btn.disabled = false;
      btn.innerHTML = original;
      if (btn.dataset.conn === 'bale') {
        toast('اتصال به بله برقرار است ✅ (getMe: BalePayBot)', 'success');
        addLog('Bale connection test: OK (getMe)', 'ok');
      } else {
        toast('خطای اتصال تلگرام: توکن نامعتبر (401 Unauthorized)', 'error');
        addLog('Telegram API error: token invalid (401 Unauthorized)', 'err');
      }
    });
  });

  /* وب‌هوک */
  $('#copyWebhook').addEventListener('click', async () => {
    const url = $('#webhookUrl').value;
    try { await navigator.clipboard.writeText(url); }
    catch { const i = $('#webhookUrl'); i.select(); document.execCommand('copy'); }
    toast('آدرس وب‌هوک کپی شد', 'success');
  });
  $('#saveWebhook').addEventListener('click', () => {
    toast('وب‌هوک با موفقیت ثبت شد ✅', 'success');
    addLog('Webhook registered: ' + $('#webhookUrl').value, 'ok');
  });

  /* افزودن کارت بانکی */
  $('#addCardBtn').addEventListener('click', () => {
    const n = $$('#cardsWrap .bank-card').length + 1;
    const div = document.createElement('div');
    div.className = 'card inset-card bank-card';
    div.innerHTML = `
      <div class="card-head">
        <h3><svg class="ic"><use href="#i-card"/></svg> کارت بانکی ${fa(n)}</h3>
        <button class="icon-btn remove-card" title="حذف کارت"><svg class="ic danger-c"><use href="#i-trash"/></svg></button>
      </div>
      <label class="field"><span>شماره کارت</span><input type="text" class="ltr mono" placeholder="6037-0000-0000-0000" inputmode="numeric"></label>
      <label class="field"><span>نام بانک</span>
        <select><option>بانک ملی</option><option>بانک ملت</option><option>بانک صادرات</option><option>بانک تجارت</option><option>بانک پاسارگاد</option><option>بانک سامان</option><option>بانک آینده</option><option>بانک سپه</option></select>
      </label>
      <label class="field"><span>نام صاحب حساب</span><input type="text" placeholder="نام و نام خانوادگی"></label>`;
    $('#cardsWrap').appendChild(div);
    toast(`کارت بانکی ${fa(n)} اضافه شد`, 'success');
  });
  $('#cardsWrap').addEventListener('click', (e) => {
    const rm = e.target.closest('.remove-card');
    if (rm) { rm.closest('.bank-card').remove(); toast('کارت حذف شد', 'info'); }
  });

  /* گزارش خودکار */
  $('#reportType').addEventListener('change', () => {
    $('#reportDayField').style.display = $('#reportType').value === 'هفتگی' ? '' : 'none';
  });
  $('#reportDayField').style.display = 'none';
  $('#reportTest').addEventListener('click', () => {
    toast('گزارش تست برای مدیر ارسال شد ✅', 'success');
    addLog('Report test sent to admin (bale)', 'ok');
  });

  /* متغیرهای قالب پیام */
  let lastTpl = null;
  $$('.tpl-area').forEach((t) => t.addEventListener('focus', () => (lastTpl = t)));
  $('#varChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const area = lastTpl || $('.tpl-area');
    area.setRangeText(chip.textContent, area.selectionEnd, area.selectionEnd, 'end');
    area.focus();
  });

  /* ذخیره تنظیمات */
  $('#saveSettings').addEventListener('click', () => {
    toast('تنظیمات با موفقیت ذخیره شد ✅', 'success');
    addLog('Settings saved (balepay_options)', 'ok');
  });

  /* تم‌ها */
  $('#themeGrid').addEventListener('click', (e) => {
    const card = e.target.closest('.theme-card');
    if (card) applyTheme(card.dataset.themeId, true);
  });
}

/* ─────────────── Tools: debug / test / logs ─────────────── */
function renderDebug() {
  const lines = DATA.debugLines;
  $('#debugBlock').innerHTML =
    lines.slice(0, -1).map((l) => l || ' ').join('\n') +
    `\n<span class="ok-line">${lines[lines.length - 1]}</span>`;
}

function addLog(text, type = '') {
  const time = new Date().toLocaleTimeString('fa-IR', { hour12: false });
  DATA.logs.unshift({ time, text, type });
  renderLogs();
}

function renderLogs() {
  $('#logsWrap').innerHTML = DATA.logs.map((l) => `
    <div class="log-line ${l.type}"><span class="t">[${l.time}]</span> ${l.text}</div>`).join('');
}

function initTools() {
  renderDebug();
  renderLogs();
  $('#clearLogs').addEventListener('click', () => { DATA.logs = []; renderLogs(); toast('لاگ‌ها پاک شد', 'info'); });

  $('#tmsgSend').addEventListener('click', () => {
    const chat = $('#tmsgChat').value.trim();
    if (!chat) return toast('آیدی گیرنده را وارد کنید', 'warn');
    if ($('#tmsgPlatform').value === 'تلگرام') {
      toast('ارسال به تلگرام ناموفق: توکن نامعتبر (401)', 'error');
      addLog(`Telegram send error to chat_id=${enDigits(chat)} (401)`, 'err');
    } else {
      toast(`پیام تست به chat_id=${chat} ارسال شد ✅`, 'success');
      addLog(`Test message sent (bale) chat_id=${enDigits(chat)}`, 'ok');
    }
  });

  $('#hookRun').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<svg class="ic sm spin"><use href="�ر حال اجرا...';
    await sleep(800);
    btn.disabled = false;
    btn.innerHTML = original;
    $('#webhookResp').textContent = '200 OK · { "ok": true, "result": "processed" }';
    addLog(`Webhook test: ${$('#hookType').value} — 200 OK`, 'ok');
    toast('تست وب‌هوک اجرا شد — 200 OK', 'success');
  });
}

/* ─────────────── User Picker Modal ─────────────── */
function renderUsers() {
  $('#userList').innerHTML = DATA.users.map((u) => `
    <button class="user-row" data-chat="${u.chatId}" data-name="${u.name}">
      <span class="user-ava">${u.name[0]}</span>
      <div><b>${u.name}</b><span class="uid">chat_id: ${u.chatId}</span></div>
      <span class="pf ${u.platform === 'بله' ? 'pf-bale' : 'pf-tg'}" style="margin-inline-start:auto">
        <svg class="ic"><use href="#${u.platform === 'بله' ? 'i-bale' : 'i-telegram'}"/></svg>${u.platform}</span>
    </button>`).join('');
}

let pickerTarget = null;
function openPicker(targetSel) {
  pickerTarget = targetSel ? $(targetSel) : null;
  $('#userModal').hidden = false;
}
function closePicker() { $('#userModal').hidden = true; }

function initPicker() {
  renderUsers();
  $$('[data-pick]').forEach((b) => b.addEventListener('click', () => openPicker('#' + b.dataset.pick)));
  $('#pickAdminBtn').addEventListener('click', () => openPicker(null));
  $('#userModalClose').addEventListener('click', closePicker);
  $('#userModal').addEventListener('click', (e) => { if (e.target.id === 'userModal') closePicker(); });
  $('#userList').addEventListener('click', (e) => {
    const row = e.target.closest('.user-row');
    if (!row) return;
    closePicker();
    if (pickerTarget) pickerTarget.value = row.dataset.chat;
    toast(`«${row.dataset.name}» انتخاب شد (chat_id: ${row.dataset.chat})`, 'success');
  });
}

/* ─────────────── Simulator ─────────────── */
const Sim = {
  busy: false,
  orderNo: 1251,
  name: 'علی محمدی',
  amount: 850000,
  c: null, a: null,

  now() { return new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }); },

  bubble(chat, side, { title, text, photo, kb }) {
    const hint = chat.querySelector('.chat-hint');
    if (hint) hint.remove();
    const div = document.createElement('div');
    div.className = 'msg ' + side;
    div.innerHTML = `<div class="bubble">
      ${title ? `<div class="b-title">${title}</div>` : ''}
      ${photo ? `<div class="b-photo"><svg class="ic"><use href="#i-file"/></svg><span>${photo}</span></div>` : ''}
      ${text ? `<div class="b-text">${text}</div>` : ''}
      ${kb ? `<div class="b-kb">${kb}</div>` : ''}
      <div class="b-meta">${this.now()}<svg class="ic xs"><use href="#i-check-c"/></svg></div>
    </div>`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
  },

  async order() {
    this.name = pick(DATA.simCustomers);
    this.amount = pick(DATA.simAmounts);
    const id = fa(this.orderNo);
    this.bubble(this.c, 'bot', {
      title: '🛒 ثبت سفارش',
      text: `سفارش #${id} ثبت شد\n💰 مبلغ: ${money(this.amount)}\n👤 ${this.name}\n\n💳 برای پرداخت کارت به کارت، روی دکمه زیر بزنید:`,
      kb: '<button data-act="receipt">💳 پرداخت و ارسال رسید</button>',
    });
    this.bubble(this.a, 'bot', {
      title: '🔔 سفارش جدید',
      text: `سفارش #${id}\n👤 ${this.name}\n💰 ${money(this.amount)}\n⏳ در انتظار پرداخت کارت به کارت`,
    });
    addLog(`Order #${this.orderNo} placed — total: ${this.amount.toLocaleString('en-US')} T`, '');
  },

  async receipt() {
    const id = fa(this.orderNo);
    this.bubble(this.c, 'user', { photo: `🧾 receipt-${this.orderNo}.jpg · ۱۲۴ کیلوبایت` });
    await sleep(450);
    this.bubble(this.c, 'bot', { text: '🧾 رسید پرداخت دریافت شد!\nپس از بررسی مدیر، نتیجه برای شما ارسال می‌شود ⏳' });
    this.bubble(this.a, 'bot', {
      title: '🧾 رسید جدید',
      text: `مشتری «${this.name}» رسید پرداخت سفارش #${id} را ارسال کرد.\n💰 مبلغ: ${money(this.amount)}`,
      kb: '<button data-act="approve">✅ تأیید</button><button data-act="reject">❌ رد</button>',
    });
    addLog(`Receipt uploaded for order #${this.orderNo} — status: pending → on-hold`, '');
  },

  async approve(pressed = false) {
    if (!pressed) {
      const kb = this.a.querySelector('.msg:last-child .b-kb');
      if (kb) { kb.querySelector('[data-act="approve"]')?.classList.add('pressed'); kb.querySelectorAll('button').forEach((b) => (b.disabled = true)); }
    }
    const id = fa(this.orderNo);
    this.bubble(this.a, 'bot', { text: `✅ سفارش #${id} تأیید شد — وضعیت: در حال پردازش` });
    this.bubble(this.c, 'bot', {
      title: '✅ پرداخت تأیید شد',
      text: `پرداخت سفارش #${id} تأیید شد!\nسفارش شما در حال پردازش است 🎉\nاز خرید شما سپاسگزاریم.`,
    });
    addLog(`Webhook received: callback bpv:${this.orderNo}:approve — Order → processing`, 'ok');
    this.orderNo++;
  },

  async reject() {
    const kb = this.a.querySelector('.msg:last-child .b-kb');
    if (kb) { kb.querySelector('[data-act="reject"]')?.classList.add('pressed-rej'); kb.querySelectorAll('button').forEach((b) => (b.disabled = true)); }
    const id = fa(this.orderNo);
    this.bubble(this.a, 'bot', { text: `❌ سفارش #${id} رد شد` });
    this.bubble(this.c, 'bot', {
      title: '❌ پرداخت تأیید نشد',
      text: `متأسفانه پرداخت سفارش #${id} تأیید نشد.\nلطفاً رسید صحیح را مجدداً ارسال کنید یا با پشتیبانی تماس بگیرید.`,
    });
    addLog(`Webhook received: callback bpv:${this.orderNo}:reject — Order → failed`, 'err');
    this.orderNo++;
  },

  async undo() {
    const id = fa(this.orderNo - 1 || this.orderNo);
    const bar = document.createElement('div');
    bar.className = 'undo-bar';
    bar.innerHTML = `<svg class="ic sm"><use href="#i-undo"/></svg><span>امکان بازگشت تا ۳۰ ثانیه</span>
      <button class="btn btn-ghost btn-sm">↩️ بازگشت</button>`;
    this.a.appendChild(bar);
    this.a.scrollTop = this.a.scrollHeight;
    await sleep(1300);
    bar.classList.add('done');
    bar.innerHTML = `<svg class="ic sm"><use href="#i-check-c"/></svg><span>بازگشت انجام شد ✓</span>`;
    this.bubble(this.a, 'bot', { text: `↩️ تأیید سفارش #${id} لغو شد — وضعیت به «در انتظار» بازگشت` });
    this.bubble(this.c, 'bot', { text: '⚠️ تأیید پرداخت لغو شد؛ سفارش شما مجدداً در حال بررسی است.' });
    addLog(`Order #${id} approval rolled back (undo) — status: pending`, '');
  },

  async full() {
    await this.order();
    await sleep(1100);
    await this.receipt();
    await sleep(1100);
    await this.approve();
    toast('سناریوی کامل با موفقیت اجرا شد ✅', 'success');
  },

  reset() {
    this.orderNo = 1251;
    const hint = (icon, text) => `<div class="chat-hint"><svg class="ic"><use href="#${icon}"/></svg><p>${text}</p></div>`;
    this.c.innerHTML = hint('i-bale', 'روی یکی از سناریوها کلیک کنید');
    this.a.innerHTML = hint('i-shield', 'پیام‌های مدیر اینجا نمایش داده می‌شود');
    toast('شبیه‌ساز ریست شد', 'info');
  },
};

async function runSim(name) {
  if (Sim.busy) return;
  if (name === 'reset') return Sim.reset();
  Sim.busy = true;
  try {
    if (name === 'full') await Sim.full();
    else await Sim[name]();
  } finally { Sim.busy = false; }
}

function initSimulator() {
  Sim.c = $('#customerChat');
  Sim.a = $('#adminChat');
  $$('.scenarios .btn').forEach((b) => b.addEventListener('click', () => runSim(b.dataset.sim)));
  /* دکمه‌های داخل چت (کیبورد Inline) */
  [Sim.c, Sim.a].forEach((chat) => {
    chat.addEventListener('click', async (e) => {
      const btn = e.target.closest('.b-kb button');
      if (!btn || btn.disabled) return;
      const act = btn.dataset.act;
      if (act === 'receipt' || act === 'approve' || act === 'reject') {
        btn.closest('.b-kb').querySelectorAll('button').forEach((b) => (b.disabled = true));
        btn.classList.add(act === 'reject' ? 'pressed-rej' : 'pressed');
      }
      if (act === 'receipt') await runSim('receipt');
      if (act === 'approve') await Sim.approve(true);
      if (act === 'reject') await Sim.reject();
    });
  });
}

/* ─────────────── About: stars ─────────────── */
function initStars() {
  const wrap = $('#stars');
  wrap.innerHTML = [1, 2, 3, 4, 5].map((i) =>
    `<button data-star="${i}" class="on" aria-label="${fa(i)} ستاره"><svg class="ic"><use href="#i-star"/></svg></button>`).join('');
  const paint = (n) => $$('#stars button').forEach((b) => b.classList.toggle('on', +b.dataset.star <= n));
  wrap.addEventListener('mouseover', (e) => { const b = e.target.closest('button'); if (b) paint(+b.dataset.star); });
  wrap.addEventListener('mouseleave', () => paint(5));
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const n = +b.dataset.star;
    paint(n);
    $('#rateMsg').textContent = n === 5 ? 'وای، ممنون! نظر شما ثبت شد ⭐⭐⭐⭐⭐' : `امتیاز ${fa(n)} ستاره‌ای شما ثبت شد؛ سپاس از بازخوردتان 🙏`;
    toast('امتیاز شما ثبت شد', 'success');
  });
}

/* ─────────────── Layout: mobile sidebar ─────────────── */
function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebarBackdrop').classList.remove('show');
}
function initLayout() {
  $('#menuBtn').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
    $('#sidebarBackdrop').classList.toggle('show');
  });
  $('#sidebarBackdrop').addEventListener('click', closeSidebar);
  $('#themeBtn').addEventListener('click', () => {
    const ids = DATA.themes.map((t) => t.id);
    const cur = document.documentElement.dataset.theme;
    applyTheme(ids[(ids.indexOf(cur) + 1) % ids.length], true);
  });
  $('#bellBtn').addEventListener('click', () => toast('اعلان جدیدی ندارید 🔔', 'info'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closePicker(); closeSidebar(); }
  });
}

/* ─────────────── Init ─────────────── */
function init() {
  /* تم ذخیره‌شده یا پیش‌فرض */
  applyTheme(store.get('balepay-theme') || DATA.defaultTheme);

  renderStats();
  renderLatest();
  $('#txCustomer').innerHTML = '<option value="">همه مشتریان</option>' +
    [...new Set(DATA.transactions.map((t) => t.customer))].map((c) => `<option>${c}</option>`).join('');
  applyFilters();

  $('#txFilter').addEventListener('click', () => {
    applyFilters();
    toast('فیلتر اعمال شد', 'info');
  });
  $('#csvBtn').addEventListener('click', exportCSV);
  $('#txBody').addEventListener('click', (e) => {
    const view = e.target.closest('[data-view-tx]');
    const del = e.target.closest('[data-del-tx]');
    if (view) {
      const t = DATA.transactions.find((x) => x.id === +view.dataset.viewTx);
      toast(`سفارش #${fa(t.id)} · ${t.customer} · ${money(t.amount)} · ${t.status}`, 'info');
    }
    if (del) {
      const id = +del.dataset.delTx;
      DATA.transactions = DATA.transactions.filter((x) => x.id !== id);
      applyFilters();
      toast(`تراکنش #${fa(id)} حذف شد`, 'success');
    }
  });

  renderHistory();
  updatePreview();
  ['#bulkTitle', '#bulkText'].forEach((s) => $(s).addEventListener('input', updatePreview));
  $('#bulkTarget').addEventListener('change', updatePreview);
  $('#bulkSend').addEventListener('click', () => sendBulk(false));
  $('#bulkTest').addEventListener('click', () => sendBulk(true));

  initSettings();
  initTools();
  initPicker();
  initSimulator();
  initStars();
  initLayout();
  $$('.prod-link').forEach((b) => b.addEventListener('click', () => toast('این بخش در نسخه دمو فعال نیست', 'info')));

  /* رسم مجدد نمودارها در تغییر اندازه صفحه */
  window.addEventListener('resize', debounce(() => {
    if ($('#view-dashboard').classList.contains('is-active')) Dashboard.draw();
  }, 160));

  navigate();
  setTimeout(() => toast('به پنل مدیریت بله‌پی خوش آمدید 👋', 'success'), 700);
}

document.addEventListener('DOMContentLoaded', init);
