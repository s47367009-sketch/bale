/* ═══════════════════════════════════════════════════════════
   BalePay — دیتای نمایشی پنل
   ═══════════════════════════════════════════════════════════ */
'use strict';

const DATA = {

  /* ── کارت‌های آمار داشبورد ── */
  stats: [
    { icon: 'i-bag',     value: '۲۵۲',          label: 'سفارش امروز',        delta: '۱۲٪ نسبت به دیروز', up: true },
    { icon: 'i-check-c', value: '۱۹۲',          label: 'تأیید شده',          delta: '۸٪ رشد',            up: true },
    { icon: 'i-clock',   value: '۴۰',           label: 'در انتظار',          delta: '۳٪ کاهش',           up: false },
    { icon: 'i-wallet',  value: '۱۸۷٬۸۷۵٬۵۲۷ ت', label: 'فروش امروز (تومان)', delta: '۱۵٪ رشد',           up: true },
  ],

  /* ── نمودار فروش ۷ روز اخیر ── */
  week: {
    labels: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'],
    values: [142.5, 168.2, 155.0, 189.3, 176.4, 198.7, 187.9], // میلیون تومان
    exact:  [142500000, 168200000, 155000000, 189300000, 176400000, 198700000, 187875527],
  },

  /* ── نمودار وضعیت سفارشات ── */
  statuses: [
    { label: 'تأیید شده',   value: 192, color: '--ok' },
    { label: 'در انتظار',   value: 40,  color: '--warn' },
    { label: 'رد شده',      value: 12,  color: '--danger' },
    { label: 'بازگشت خورده', value: 8,   color: '--violet' },
  ],

  /* ── لیست تراکنش‌ها ── */
  transactions: [
    { id: 1250, customer: 'علی محمدی',   phone: '۰۹۱۲ ۱۲۳ ۴۵۶۷', amount: 850000,  platform: 'بله',     status: 'تأیید شده',   date: '1403/06/20' },
    { id: 1249, customer: 'سارا رضایی',  phone: '۰۹۳۵ ۲۳۴ ۵۶۷۸', amount: 420000,  platform: 'تلگرام',  status: 'در انتظار',   date: '1403/06/20' },
    { id: 1248, customer: 'رضا کریمی',   phone: '۰۹۱۹ ۳۴۵ ۶۷۸۹', amount: 1250000, platform: 'بله',     status: 'رد شده',      date: '1403/06/19' },
    { id: 1247, customer: 'مریم حسینی',  phone: '۰۹۱۲ ۴۵۶ ۷۸۹۰', amount: 330000,  platform: 'تلگرام',  status: 'تأیید شده',   date: '1403/06/19' },
    { id: 1246, customer: 'حسین رحیمی',  phone: '۰۹۳۷ ۵۶۷ ۸۹۰۱', amount: 680000,  platform: 'بله',     status: 'بازگشت خورده', date: '1403/06/18' },
    { id: 1245, customer: 'نگار موسوی',  phone: '۰۹۱۴ ۶۷۸ ۹۰۱۲', amount: 2150000, platform: 'بله',     status: 'تأیید شده',   date: '1403/06/18' },
    { id: 1244, customer: 'امیر تهرانی', phone: '۰۹۱۲ ۷۸۹ ۰۱۲۳', amount: 95000,   platform: 'تلگرام',  status: 'در انتظار',   date: '1403/06/17' },
    { id: 1243, customer: 'فاطمه احمدی', phone: '۰۹۳۰ ۸۹۰ ۱۲۳۴', amount: 540000,  platform: 'بله',     status: 'تأیید شده',   date: '1403/06/17' },
    { id: 1242, customer: 'مهدی نوری',   phone: '۰۹۱۵ ۹۰۱ ۲۳۴۵', amount: 780000,  platform: 'تلگرام',  status: 'رد شده',      date: '1403/06/16' },
    { id: 1241, customer: 'زهرا کاظمی',  phone: '۰۹۱۲ ۰۱۲ ۳۴۵۶', amount: 1900000, platform: 'بله',     status: 'تأیید شده',   date: '1403/06/16' },
    { id: 1240, customer: 'سعید مرادی',  phone: '۰۹۱۱ ۱۲۳ ۴۵۶۷', amount: 260000,  platform: 'بله',     status: 'در انتظار',   date: '1403/06/15' },
    { id: 1239, customer: 'الناز شریفی', phone: '۰۹۳۶ ۲۳۴ ۵۶۷۸', amount: 475000,  platform: 'تلگرام',  status: 'تأیید شده',   date: '1403/06/15' },
    { id: 1238, customer: 'پارسا رستمی', phone: '۰۹۱۲ ۳۴۵ ۶۷۸۹', amount: 3300000, platform: 'بله',     status: 'تأیید شده',   date: '1403/06/14' },
    { id: 1237, customer: 'شیما عباسی',  phone: '۰۹۳۸ ۴۵۶ ۷۸۹۰', amount: 150000,  platform: 'تلگرام',  status: 'بازگشت خورده', date: '1403/06/14' },
    { id: 1236, customer: 'کیان صادقی',  phone: '۰۹۱۳ ۵۶۷ ۸۹۰۱', amount: 620000,  platform: 'بله',     status: 'تأیید شده',   date: '1403/06/13' },
    { id: 1235, customer: 'ترانه قاسمی', phone: '۰۹۱۲ ۶۷۸ ۹۰۱۲', amount: 88000,   platform: 'تلگرام',  status: 'در انتظار',   date: '1403/06/13' },
    { id: 1234, customer: 'بهنام یوسفی', phone: '۰۹۱۷ ۷۸۹ ۰۱۲۳', amount: 1120000, platform: 'بله',     status: 'تأیید شده',   date: '1403/06/12' },
    { id: 1233, customer: 'آیدا ملکی',   phone: '۰۹۱۲ ۸۹۰ ۱۲۳۴', amount: 355000,  platform: 'بله',     status: 'رد شده',      date: '1403/06/12' },
  ],
  totalTransactions: 1234,

  /* ── کاربران ربات (برای انتخاب مدیر) ── */
  users: [
    { name: 'علی محمدی',   platform: 'بله',    chatId: '123456789' },
    { name: 'رضا کریمی',   platform: 'بله',    chatId: '1260583615' },
    { name: 'سارا رضایی',  platform: 'تلگرام', chatId: '7123456789' },
    { name: 'مریم حسینی',  platform: 'تلگرام', chatId: '582749301' },
    { name: 'حسین رحیمی',  platform: 'بله',    chatId: '934875612' },
    { name: 'نگار موسوی',  platform: 'بله',    chatId: '1049384756' },
  ],

  /* ── تاریخچه پیام گروهی ── */
  bulkHistory: [
    { title: 'تخفیف تابستانه',    count: 124, platform: 'بله',    date: '۱۴۰۳/۰۶/۱۸', status: 'ارسال شد' },
    { title: 'اطلاع‌رسانی تعطیلی', count: 98,  platform: 'تلگرام', date: '۱۴۰۳/۰۶/۱۵', status: 'ارسال شد' },
    { title: 'محصولات جدید',      count: 150, platform: 'بله',    date: '۱۴۰۳/۰۶/۱۰', status: 'در حال ارسال' },
    { title: 'کد تخفیف ویژه',     count: 87,  platform: 'تلگرام', date: '۱۴۰۳/۰۶/۰۵', status: 'ارسال شد' },
  ],

  /* ── تم‌ها ── */
  themes: [
    { id: 'bale',       name: 'آبی بله',      c1: '#2f6bdf', c2: '#9dc0ff' },
    { id: 'green-dark', name: 'سبز مشکی',     c1: '#0e1a12', c2: '#2fd575' },
    { id: 'purple',     name: 'بنفش آبی',     c1: '#7c5cff', c2: '#38bdf8' },
    { id: 'orange',     name: 'نارنجی سفید',  c1: '#f0761d', c2: '#ffd9ae' },
    { id: 'red-dark',   name: 'قرمز مشکی',    c1: '#3a0f0f', c2: '#ef4444' },
    { id: 'gold-dark',  name: 'طلایی مشکی',   c1: '#171208', c2: '#e3b34c' },
    { id: 'teal',       name: 'فیروزه‌ای آبی', c1: '#0c2a33', c2: '#18c8b8' },
    { id: 'dark',       name: 'حالت تاریک',   c1: '#161b23', c2: '#6366f1' },
  ],
  defaultTheme: 'gold-dark',

  /* ── دیباگ وضعیت تنظیمات ── */
  debugLines: [
    '=== BalePay Settings Status ===',
    '',
    'gateway_enabled:      yes',
    'bale_token:           set',
    'bale_admin_chat_id:   1260583615',
    'admin_phone:          (empty — optional)',
    'notify_customer_bale: ON',
    'notify_admin_bale:    ON',
    'sms_enabled:          no',
    'safir_enabled:        no',
    'active_cards:         2',
    '',
    '✓ همه تنظیمات ضروری درست هستند',
  ],

  /* ── لاگ سیستم ── */
  logs: [
    { time: '14:40:12', text: 'Webhook received: callback bpv:1250:approve — Order #1250 → processing', type: 'ok' },
    { time: '14:40:12', text: 'Notification sent to customer (bale) chat_id=123456789', type: '' },
    { time: '14:35:08', text: 'Receipt uploaded for order #1250 — status: pending → on-hold', type: '' },
    { time: '14:35:08', text: 'Admin notification sent with inline keyboard', type: '' },
    { time: '14:20:00', text: 'Order #1250 placed — total: 850,000 T', type: '' },
    { time: '14:20:00', text: 'Customer notification sent (bale)', type: '' },
    { time: '14:10:33', text: 'Telegram API error: token invalid (401 Unauthorized)', type: 'err' },
    { time: '09:00:00', text: 'Daily report sent to admin (bale)', type: 'ok' },
  ],

  /* ── شبیه‌ساز ── */
  simCustomers: ['علی محمدی', 'سارا رضایی', 'مریم حسینی', 'کیان صادقی', 'زهرا کاظمی'],
  simAmounts: [350000, 480000, 720000, 1250000, 2100000],
};
