// Waveforms: a VCD reader and an animated timing-diagram viewer on a canvas.
//   Wave.parseVCD(text) -> { timescale, end, signals: [{ id, name, scope, width, changes: [[time, value]] }] }
//   new Wave.View(container, { onCursor }) .show(vcd, { animate }) .replay() .setRadix('hex'|'dec'|'bin'|'sdec')
// Each signal gets its own colour. When new results arrive a playhead sweeps from time 0 to the end, drawing the
// waves as it goes, with a glow where a signal changes, so the timing can be followed by eye.
(function (root) {
  'use strict';

  function parseVCD(text) {
    const out = { timescale: '1s', end: 0, signals: [] };
    const byId = new Map(), scope = [];
    let i = 0, t = 0;
    const words = text.split(/\s+/);
    while (i < words.length) {
      const w = words[i++];
      if (!w) continue;
      if (w === '$timescale') { const parts = []; while (i < words.length && words[i] !== '$end') parts.push(words[i++]); i++; out.timescale = parts.join(''); }
      else if (w === '$scope') { i++; scope.push(words[i++]); while (words[i] !== '$end') i++; i++; }
      else if (w === '$upscope') { scope.pop(); while (words[i] !== '$end') i++; i++; }
      else if (w === '$var') {
        const type = words[i++], width = +words[i++], id = words[i++];
        let name = words[i++];
        const rest = [];
        while (words[i] !== '$end') rest.push(words[i++]);
        i++;
        if (rest.length && /^\[/.test(rest[0])) name += rest.join('');
        const sig = { id, name, scope: scope.join('.'), width, type, changes: [] };
        out.signals.push(sig);
        if (!byId.has(id)) byId.set(id, []);
        byId.get(id).push(sig);
      }
      else if (w[0] === '$') { if (w !== '$dumpvars' && w !== '$dumpall' && w !== '$dumpon' && w !== '$dumpoff' && w !== '$end') { while (i < words.length && words[i] !== '$end') i++; i++; } }
      else if (w[0] === '#') { t = +w.slice(1); if (t > out.end) out.end = t; }
      else if (w[0] === 'b' || w[0] === 'B' || w[0] === 'r' || w[0] === 'R') { const v = w.slice(1), id = words[i++]; const s = byId.get(id); if (s) for (const x of s) push(x, t, v); }
      else { const v = w[0], id = w.slice(1); const s = byId.get(id); if (s) for (const x of s) push(x, t, v); }
    }
    function push(sig, time, v) {
      const c = sig.changes;
      if (sig.width > 1 && v.length < sig.width) v = (/[xz]/i.test(v[0]) ? v[0] : '0').repeat(sig.width - v.length) + v;   // left-extend
      if (c.length && c[c.length - 1][0] === time) c[c.length - 1][1] = v.toLowerCase();
      else if (!c.length || c[c.length - 1][1] !== v.toLowerCase()) c.push([time, v.toLowerCase()]);
    }
    return out;
  }

  function fmt(v, width, radix) {
    if (/[xz]/.test(v)) return width > 1 && /^[x]+$/.test(v) ? 'x' : width > 1 && /^[z]+$/.test(v) ? 'z' : v;
    if (radix === 'bin') return v;
    const big = BigInt('0b' + (v || '0'));
    if (radix === 'dec') return big.toString(10);
    if (radix === 'sdec') return (v[0] === '1' && width > 1 ? big - (1n << BigInt(width)) : big).toString(10);
    return big.toString(16).toUpperCase();
  }
  // the VCD counts in its timescale ("1ps"); show times in a unit that suits the span (ns, us...)
  const UNITS = { s: 1, ms: 1e-3, us: 1e-6, ns: 1e-9, ps: 1e-12, fs: 1e-15 };
  function tsSeconds(ts) { const m = /^(\d+)\s*(s|ms|us|ns|ps|fs)$/.exec(String(ts).trim()); return m ? +m[1] * UNITS[m[2]] : 1; }
  function timeFmt(ts, span) {
    const k = tsSeconds(ts), s = span * k;
    const unit = s >= 1 ? 's' : s >= 1e-3 ? 'ms' : s >= 1e-6 ? 'us' : s >= 1e-9 ? 'ns' : s >= 1e-12 ? 'ps' : 'fs';
    const f = k / UNITS[unit];
    return { unit, f, fmt: t => +(t * f).toPrecision(6) + ' ' + unit };
  }
  const valueAt = (sig, t) => { const c = sig.changes; let lo = 0, hi = c.length - 1, r = null; while (lo <= hi) { const m = (lo + hi) >> 1; if (c[m][0] <= t) { r = c[m][1]; lo = m + 1; } else hi = m - 1; } return r; };

  const PALETTE_LIGHT = ['#0a6f8c', '#7c3aed', '#c2410c', '#15803d', '#be123c', '#0369a1', '#a16207', '#4d7c0f', '#9333ea', '#0f766e'];
  const PALETTE_DARK = ['#4cc3e6', '#b79cff', '#fb923c', '#4ade80', '#fb7185', '#60a5fa', '#facc15', '#a3e635', '#d8b4fe', '#2dd4bf'];

  class View {
    constructor(el, opts = {}) {
      this.el = el; this.opts = opts;
      this.radix = 'hex'; this.data = null; this.rows = []; this.hidden = new Set();
      this.t0 = 0; this.t1 = 1; this.cursor = null; this.progress = 1; this.anim = 0;
      el.innerHTML = '<div class="wv-names"></div><div class="wv-plot"><canvas></canvas></div>';
      this.names = el.querySelector('.wv-names'); this.plot = el.querySelector('.wv-plot'); this.canvas = el.querySelector('canvas');
      this.ROW = 30; this.TOP = 26;
      new ResizeObserver(() => this.draw()).observe(this.plot);
      this.plot.addEventListener('wheel', e => {
        if (!this.data) return;
        e.preventDefault();
        const r = this.plot.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
        if (e.ctrlKey || e.metaKey || !e.shiftKey) {
          const at = this.t0 + x * (this.t1 - this.t0), f = e.deltaY < 0 ? 0.8 : 1.25;
          let span = Math.max(2, Math.min(this.data.end * 1.05 || 10, (this.t1 - this.t0) * f));
          this.t0 = Math.max(0, at - x * span); this.t1 = this.t0 + span;
        } else { const d = (this.t1 - this.t0) * (e.deltaY > 0 ? 0.1 : -0.1); this.t0 = Math.max(0, this.t0 + d); this.t1 += d; }
        this.draw();
      }, { passive: false });
      let drag = null;
      this.plot.addEventListener('pointerdown', e => { drag = { x: e.clientX, t0: this.t0, t1: this.t1, moved: false }; });
      addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.moved = true; if (!drag.moved) return; const dt = -dx / this.plot.clientWidth * (drag.t1 - drag.t0); const s = Math.max(-drag.t0, dt); this.t0 = drag.t0 + s; this.t1 = drag.t1 + s; this.draw(); });
      addEventListener('pointerup', e => {
        if (drag && !drag.moved && e.target === this.canvas) { const r = this.canvas.getBoundingClientRect(); this.cursor = this.t0 + (e.clientX - r.left) / r.width * (this.t1 - this.t0); this.draw(); this.names_(); window.dispatchEvent(new CustomEvent('vl-cursor', { detail: this.cursor })); }
        drag = null;
      });
      this.names.addEventListener('click', e => { const s = e.target.closest('[data-i]'); if (s && e.target.closest('.wv-hide')) { this.hidden.add(s.dataset.key); this.layout(); } });
    }
    show(data, { animate = true, keepView = false } = {}) {
      const same = keepView && this.data && this.data.end === data.end;
      this.data = data;
      if (!same) { this.t0 = 0; this.t1 = Math.max(1, data.end) * 1.04; }
      this.layout();
      if (animate) this.replay(); else { this.progress = 1; this.draw(); }
    }
    layout() {
      const d = this.data;
      this.rows = d ? d.signals.filter(s => !this.hidden.has(s.scope + '.' + s.name)) : [];
      // one row per name within a scope (the same net dumped twice only once)
      const seen = new Set();
      this.rows = this.rows.filter(s => { const k = s.scope + '.' + s.name; if (seen.has(k)) return false; seen.add(k); return true; });
      this.names_(); this.draw();
    }
    names_() {
      const dark = this.isDark(), pal = dark ? PALETTE_DARK : PALETTE_LIGHT;
      let html = `<div class="wv-head">signal${this.cursor != null ? ` <span>@ ${esc(this.tf ? this.tf.fmt(this.cursor) : Math.round(this.cursor))}</span>` : ''}</div>`, lastScope = null;
      this.rows.forEach((s, i) => {
        if (s.scope !== lastScope) { lastScope = s.scope; }
        const v = this.cursor != null ? valueAt(s, this.cursor) : null;
        html += `<div class="wv-name" data-i="${i}" data-key="${esc(s.scope + '.' + s.name)}" style="height:${this.ROW}px;--c:${pal[i % pal.length]}" title="${esc(s.scope + '.' + s.name)} (${s.width} bit${s.width > 1 ? 's' : ''})"><i></i><b>${esc(s.name)}</b><small>${esc(s.scope.split('.').slice(1).join('.'))}</small>${v != null ? `<em>${esc(fmt(v, s.width, this.radix))}</em>` : ''}<button class="wv-hide" type="button" title="Hide this signal">×</button></div>`;
      });
      this.names.innerHTML = html;
    }
    showAll() { this.hidden.clear(); this.layout(); }
    setRadix(r) { this.radix = r; this.names_(); this.draw(); }
    fit() { if (!this.data) return; this.t0 = 0; this.t1 = Math.max(1, this.data.end) * 1.04; this.draw(); }
    zoom(f) { const mid = (this.t0 + this.t1) / 2, span = Math.max(2, (this.t1 - this.t0) * f); this.t0 = Math.max(0, mid - span / 2); this.t1 = this.t0 + span; this.draw(); }
    replay() {
      cancelAnimationFrame(this.anim);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { this.progress = 1; this.draw(); return; }
      const start = performance.now(), dur = Math.min(3200, 900 + this.rows.length * 60 + 1400);
      const step = now => { this.progress = Math.min(1, (now - start) / dur); this.draw(); if (this.progress < 1) this.anim = requestAnimationFrame(step); };
      this.progress = 0; this.anim = requestAnimationFrame(step);
    }
    isDark() { const t = document.documentElement.dataset.theme; return t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); }
    draw() {
      const cv = this.canvas, W = this.plot.clientWidth, H = Math.max(this.plot.clientHeight, this.TOP + this.rows.length * this.ROW + 8);
      const dpr = devicePixelRatio || 1;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const css = getComputedStyle(this.el);
      const ink = css.getPropertyValue('--ink').trim() || '#16202a', muted = css.getPropertyValue('--muted').trim() || '#5a6876', line = css.getPropertyValue('--line').trim() || '#d3dbe3';
      const dark = this.isDark(), pal = dark ? PALETTE_DARK : PALETTE_LIGHT;
      g.clearRect(0, 0, W, H);
      if (!this.data) return;
      const { t0, t1 } = this, X = t => (t - t0) / (t1 - t0) * W;
      const tNow = this.progress >= 1 ? Infinity : t0 + (Math.min(this.data.end * 1.04, t1) - t0) * this.progress;
      // time axis
      g.font = '11px "JetBrains Mono", monospace'; g.fillStyle = muted; g.strokeStyle = line; g.lineWidth = 1;
      const span = t1 - t0, tf = timeFmt(this.data.timescale, span);
      this.tf = tf;
      // ticks at round numbers of the display unit
      const rawU = span * tf.f / Math.max(2, W / 90), mag = 10 ** Math.floor(Math.log10(rawU)), stepU = [1, 2, 5, 10].map(k => k * mag).find(k => k >= rawU) || mag * 10, stepT = stepU / tf.f;
      for (let t = Math.ceil(t0 / stepT) * stepT; t <= t1; t += stepT) {
        const x = Math.round(X(t)) + 0.5;
        g.globalAlpha = 0.5; g.beginPath(); g.moveTo(x, this.TOP - 6); g.lineTo(x, H); g.stroke(); g.globalAlpha = 1;
        g.fillText(tf.fmt(t), x + 3, 12);
      }
      // signals
      this.rows.forEach((s, i) => {
        const col = pal[i % pal.length], y = this.TOP + i * this.ROW, hi = y + 5, lo = y + this.ROW - 7, mid = (hi + lo) / 2;
        const c = s.changes;
        g.strokeStyle = line; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(0, y + this.ROW - 0.5); g.lineTo(W, y + this.ROW - 0.5); g.stroke(); g.globalAlpha = 1;
        for (let k = 0; k < c.length; k++) {
          const a = c[k][0], b = k + 1 < c.length ? c[k + 1][0] : Math.max(this.data.end, t1);
          if (b < t0 || a > t1 || a > tNow) continue;
          const xa = Math.max(-2, X(a)), xb = Math.min(W + 2, X(Math.min(b, tNow)));
          const v = c[k][1];
          if (s.width === 1) {
            const unk = v === 'x' || v === 'z';
            const yy = v === '1' ? hi : v === '0' ? lo : mid;
            if (v === '1') { g.fillStyle = col; g.globalAlpha = dark ? 0.22 : 0.14; g.fillRect(xa, hi, xb - xa, lo - hi); g.globalAlpha = 1; }
            g.strokeStyle = unk ? (v === 'x' ? '#e11d48' : '#d97706') : col; g.lineWidth = 2;
            g.beginPath();
            if (k > 0 && a >= t0) { const pv = c[k - 1][1]; g.moveTo(xa, pv === '1' ? hi : pv === '0' ? lo : mid); g.lineTo(xa, yy); } else g.moveTo(xa, yy);
            g.lineTo(xb, yy); g.stroke();
          } else {
            const unk = /[xz]/.test(v);
            g.fillStyle = unk ? '#e11d48' : col; g.globalAlpha = unk ? 0.18 : (k % 2 ? 0.16 : 0.28);
            const sl = Math.min(5, (xb - xa) / 2);
            g.beginPath(); g.moveTo(xa, mid); g.lineTo(xa + sl, hi); g.lineTo(xb - sl, hi); g.lineTo(xb, mid); g.lineTo(xb - sl, lo); g.lineTo(xa + sl, lo); g.closePath(); g.fill();
            g.globalAlpha = 1; g.strokeStyle = unk ? '#e11d48' : col; g.lineWidth = 1.5; g.stroke();
            const txt = fmt(v, s.width, this.radix);
            if (xb - xa > 18) { g.fillStyle = ink; g.font = '600 11px "JetBrains Mono", monospace'; g.save(); g.beginPath(); g.rect(xa + 4, hi, xb - xa - 8, lo - hi); g.clip(); g.fillText(txt, xa + 7, mid + 4); g.restore(); }
          }
          // a glow where the value changes, brighter while the playhead is close
          if (k > 0 && a >= t0 && tNow !== Infinity) {
            const age = (tNow - a) / (t1 - t0);
            if (age < 0.08) { g.fillStyle = col; g.globalAlpha = 0.55 * (1 - age / 0.08); g.beginPath(); g.arc(xa, mid, 7, 0, 7); g.fill(); g.globalAlpha = 1; }
          }
        }
      });
      // playhead
      if (tNow !== Infinity && tNow >= t0 && tNow <= t1) {
        const x = X(tNow);
        const grad = g.createLinearGradient(x - 40, 0, x, 0); grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, dark ? 'rgba(76,184,216,.25)' : 'rgba(10,111,140,.18)');
        g.fillStyle = grad; g.fillRect(x - 40, this.TOP - 4, 40, H);
        g.strokeStyle = dark ? '#4cb8d8' : '#0a6f8c'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, this.TOP - 4); g.lineTo(x, H); g.stroke();
      }
      // cursor
      if (this.cursor != null && this.cursor >= t0 && this.cursor <= t1) {
        const x = Math.round(X(this.cursor)) + 0.5;
        g.strokeStyle = dark ? '#fbbf24' : '#b45309'; g.lineWidth = 1.5; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(x, this.TOP - 8); g.lineTo(x, H); g.stroke(); g.setLineDash([]);
        g.fillStyle = dark ? '#fbbf24' : '#b45309'; g.fillText((this.tf ? this.tf.fmt(this.cursor) : Math.round(this.cursor)), x + 4, this.TOP - 10 + 22);
      }
    }
    png() { return this.canvas.toDataURL('image/png'); }
  }
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  root.Wave = { parseVCD, View, fmt, valueAt };
})(typeof window !== 'undefined' ? window : globalThis);
