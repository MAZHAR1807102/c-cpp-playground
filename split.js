// Drag handles between panes. Split.handle(container, a, b, dir, onMove) puts a thin handle in the gap between the
// elements a and b ("x": a is left of b, "y": a is above b) and calls onMove(px, rects) while it is dragged, px being
// the pointer position measured from the start of a. The handle hides itself whenever a and b are not laid out that
// way (for example when a narrow screen stacks the panes), and follows them when the layout changes.
// Double-click a handle to go back to the default sizes (onReset). Sizes are kept by the pages in localStorage.
(function () {
  'use strict';
  const all = [];
  function handle(container, a, b, dir, onMove, onReset) {
    const h = document.createElement('div');
    h.className = 'splitter ' + (dir === 'x' ? 'sx' : 'sy');
    h.setAttribute('role', 'separator');
    h.setAttribute('aria-orientation', dir === 'x' ? 'vertical' : 'horizontal');
    h.title = 'Drag to resize · double-click for the default size';
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(h);
    const show = on => { if (h.hidden === on) h.hidden = !on; };   // only real changes (the page watches for them)
    function place() {
      // (offsetParent is null for fixed-position panels, so look at their boxes instead)
      const shown = a.getClientRects().length > 0 && b.getClientRects().length > 0;
      if (!shown) { show(false); return; }
      const cr = container.getBoundingClientRect(), ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
      if (dir === 'x') {
        if (ar.right > br.left + 2 || ar.width < 2 || br.width < 2) { show(false); return; }
        const top = Math.max(ar.top, br.top), bottom = Math.min(ar.bottom, br.bottom);
        if (bottom - top < 20) { show(false); return; }
        show(true);
        h.style.left = (ar.right - cr.left + container.scrollLeft + (br.left - ar.right) / 2 - 5) + 'px';
        h.style.top = (top - cr.top + container.scrollTop) + 'px';
        h.style.height = (bottom - top) + 'px'; h.style.width = '10px';
      } else {
        if (ar.bottom > br.top + 2 || ar.height < 2 || br.height < 2) { show(false); return; }
        const left = Math.max(ar.left, br.left), right = Math.min(ar.right, br.right);
        if (right - left < 20) { show(false); return; }
        show(true);
        h.style.top = (ar.bottom - cr.top + container.scrollTop + (br.top - ar.bottom) / 2 - 5) + 'px';
        h.style.left = (left - cr.left + container.scrollLeft) + 'px';
        h.style.width = (right - left) + 'px'; h.style.height = '10px';
      }
    }
    let drag = null;
    h.addEventListener('pointerdown', e => {
      e.preventDefault();
      h.setPointerCapture(e.pointerId);
      drag = { ar: a.getBoundingClientRect(), br: b.getBoundingClientRect() };
      h.classList.add('on');
      document.body.classList.add('splitting', dir === 'x' ? 'split-x' : 'split-y');
    });
    h.addEventListener('pointermove', e => {
      if (!drag) return;
      const px = dir === 'x' ? e.clientX - drag.ar.left : e.clientY - drag.ar.top;
      onMove(px, drag);
      placeAll();
    });
    const end = () => { if (!drag) return; drag = null; h.classList.remove('on'); document.body.classList.remove('splitting', 'split-x', 'split-y'); placeAll(); window.dispatchEvent(new Event('resize')); };
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
    h.addEventListener('dblclick', () => { if (onReset) { onReset(); placeAll(); window.dispatchEvent(new Event('resize')); } });
    const ro = new ResizeObserver(place);
    ro.observe(container); ro.observe(a); ro.observe(b);
    const entry = { place, h };
    all.push(entry);
    requestAnimationFrame(place);
    return entry;
  }
  function placeAll() { for (const e of all) e.place(); }
  addEventListener('resize', () => requestAnimationFrame(placeAll));
  let queued = false;
  new MutationObserver(list => {
    // changes inside drawings and the editor (the circuit's animated wires, highlighted lines) never move the panes:
    // skipping them avoids measuring the layout again on every animation frame
    if (queued || list.every(m => !m.target.closest || m.target.closest('.splitter, svg, .CodeMirror, .wv-names, .stimt, .tt, #vizFrames, #out'))) return;
    queued = true; requestAnimationFrame(() => { queued = false; placeAll(); });
  }).observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['class', 'hidden'] });
  const store = { get(k) { try { return localStorage.getItem('ccp.split.' + k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem('ccp.split.' + k, v); } catch (_) {} }, del(k) { try { localStorage.removeItem('ccp.split.' + k); } catch (_) {} } };
  window.Split = { handle, placeAll, store };
})();
