/* ═══════════════════════════════════════════════════════════
   BalePay — موتور نمودار سبک (Canvas خالص، بدون وابستگی)
   - Charts.bar()  → نمودار میله‌ای با تولتیپ هاور
   - Charts.donut() → نمودار دونات + لجند
   رنگ‌ها هنگام رسم از متغیرهای CSS خوانده می‌شوند؛
   بنابراین با تغییر تم، کافی است نمودار دوباره رسم شود.
   ═══════════════════════════════════════════════════════════ */
'use strict';

const Charts = (() => {

  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const fa = (n) => Number(n).toLocaleString('fa-IR');
  const faShort = (n) => fa(Number.isInteger(n) ? n : +n.toFixed(1));

  /* آماده‌سازی بوم با پشتیبانی از تراکم پیکسل */
  function setup(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const box = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(box.width, 10), h = Math.max(box.height, 10);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }

  /* ─────────────── نمودار میله‌ای ─────────────── */
  function bar(canvas, data, tipEl) {
    const { ctx, w, h } = setup(canvas);
    const pad = { t: 26, r: 10, b: 30, l: 10 };
    const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
    const max = Math.max(...data.values) * 1.15;
    const n = data.values.length;
    const slot = plotW / n;
    const barW = Math.min(slot * 0.52, 46);
    const gridColor = cssVar('--border');
    const textColor = cssVar('--text-3');
    const strong = cssVar('--text-2');
    const primary = cssVar('--primary');
    const primaryStrong = cssVar('--primary-strong');

    /* خطوط راهنما */
    ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (plotH / 4) * i + .5;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    }

    /* میله‌ها (راست به چپ — هفته شمبه سمت راست) */
    const hits = [];
    data.values.forEach((v, i) => {
      const cx = pad.l + plotW - (i + 0.5) * slot;           // مرکز میله
      const bh = (v / max) * plotH;
      const x = cx - barW / 2, y = pad.t + plotH - bh;
      const grad = ctx.createLinearGradient(0, y, 0, y + bh);
      grad.addColorStop(0, primary);
      grad.addColorStop(1, primaryStrong);
      ctx.fillStyle = i === n - 1 ? primary : grad;
      roundRect(ctx, x, y, barW, bh, 7); ctx.fill();
      hits.push({ x, y: pad.t, w: barW, h: plotH, cx, top: y, i });

      /* مقدار روی میله */
      ctx.fillStyle = strong;
      ctx.font = '600 11px ' + cssVar('--font');
      ctx.textAlign = 'center';
      ctx.fillText(faShort(v), cx, y - 8);

      /* برچسب روز */
      ctx.fillStyle = textColor;
      ctx.font = '500 10.5px ' + cssVar('--font');
      ctx.fillText(data.labels[i], cx, h - 10);
    });
    canvas._hits = hits;

    /* هاور + تولتیپ */
    if (!canvas._hoverBound) {
      canvas._hoverBound = true;
      canvas.addEventListener('pointermove', (e) => {
        const hit = (canvas._hits || []).find(b => e.offsetX >= b.x - 6 && e.offsetX <= b.x + b.w + 6);
        if (hit) {
          canvas.style.cursor = 'pointer';
          tipEl.innerHTML = `${data.labels[hit.i]} — ${fa(data.exact[hit.i])} تومان`;
          tipEl.style.left = e.clientX + 'px';
          tipEl.style.top = (hit.top + canvas.getBoundingClientRect().top) + 'px';
          tipEl.classList.add('show');
        } else {
          canvas.style.cursor = 'default';
          tipEl.classList.remove('show');
        }
      });
      canvas.addEventListener('pointerleave', () => tipEl.classList.remove('show'));
    }
  }

  /* ─────────────── نمودار دونات ─────────────── */
  function donut(canvas, items, legendEl) {
    const { ctx, w, h } = setup(canvas);
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) / 2 - 8;
    const total = items.reduce((s, x) => s + x.value, 0);
    const gap = 0.035;
    let angle = -Math.PI / 2;

    items.forEach((it) => {
      const sweep = (it.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, angle + gap / 2, angle + sweep - gap / 2);
      ctx.strokeStyle = cssVar(it.color);
      ctx.lineWidth = 26;
      ctx.lineCap = 'butt';
      ctx.stroke();
      angle += sweep;
    });

    /* متن مرکزی */
    ctx.textAlign = 'center';
    ctx.fillStyle = cssVar('--text');
    ctx.font = '800 26px ' + cssVar('--font');
    ctx.fillText(fa(total), cx, cy + 2);
    ctx.fillStyle = cssVar('--text-3');
    ctx.font = '500 12px ' + cssVar('--font');
    ctx.fillText('کل سفارشات', cx, cy + 24);

    /* لجند */
    if (legendEl) {
      legendEl.innerHTML = items.map((it) => {
        const pct = ((it.value / total) * 100).toFixed(0);
        return `<li>
          <span class="l-dot" style="background:${cssVar(it.color)}"></span>
          <span class="l-name">${it.label}</span>
          <span class="l-val">${fa(it.value)}</span>
          <span class="l-pct">${fa(pct)}٪</span>
        </li>`;
      }).join('');
    }
  }

  return { bar, donut };
})();
