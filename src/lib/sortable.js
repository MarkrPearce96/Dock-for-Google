import { insertionIndex } from './grid.js';

const DRAG_THRESHOLD = 5;

function hit(el, e) {
  const r = el.getBoundingClientRect();
  return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
}

export function createDragController(config) {
  const { myGrid, availablePanel, onReorder, onAddAt, onRemove } = config;
  let st = null;

  function down(e, source) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    st = { source, x0: e.clientX, y0: e.clientY, dragging: false, index: null };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  }

  function movableTiles() {
    return [...myGrid.querySelectorAll('.tile.mine')]
      .filter((t) => t !== st.source.tileEl && !t.classList.contains('placeholder'));
  }

  function begin(e) {
    st.dragging = true;
    st.source.onDragStart?.();
    document.getSelection?.()?.removeAllRanges?.();
    const tile = st.source.tileEl;
    const r = tile.getBoundingClientRect();
    st.offX = e.clientX - r.left;
    st.offY = e.clientY - r.top;

    const clone = tile.cloneNode(true);
    clone.classList.add('drag-clone');
    clone.classList.remove('drag-source-hidden');
    clone.style.width = `${r.width}px`;
    clone.style.height = `${r.height}px`;
    clone.style.left = `${r.left}px`;
    clone.style.top = `${r.top}px`;
    document.body.appendChild(clone);
    st.clone = clone;

    const ph = document.createElement('div');
    ph.className = 'tile placeholder';
    st.ph = ph;

    if (st.source.kind === 'mine') {
      tile.classList.add('drag-source-hidden');
      tile.after(ph);
      availablePanel.classList.add('removing');
    }
    document.body.classList.add('dragging-active');
  }

  function move(e) {
    if (!st) return;
    if (!st.dragging) {
      if (Math.hypot(e.clientX - st.x0, e.clientY - st.y0) < DRAG_THRESHOLD) return;
      begin(e);
    }
    st.clone.style.left = `${e.clientX - st.offX}px`;
    st.clone.style.top = `${e.clientY - st.offY}px`;

    const overRemove = st.source.kind === 'mine' && hit(availablePanel, e);
    const overMy = hit(myGrid, e) && !overRemove;
    availablePanel.classList.toggle('remove-hot', overRemove);
    st.overRemove = overRemove;
    st.overMy = overMy;

    if (overMy) {
      const tiles = movableTiles();
      const centers = tiles.map((t) => {
        const b = t.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      });
      const idx = insertionIndex(centers, e.clientX, e.clientY);
      showPh(true);
      if (idx !== st.index) { placeAt(tiles, idx); st.index = idx; }
    } else {
      showPh(false);
      st.index = null;
    }
  }

  function placeAt(tiles, idx) {
    const ph = st.ph;
    const first = tiles.map((t) => t.getBoundingClientRect());
    const ref = tiles[idx] || null;
    if (ref) myGrid.insertBefore(ph, ref);
    else myGrid.appendChild(ph);
    tiles.forEach((t, i) => {
      const last = t.getBoundingClientRect();
      const dx = first[i].left - last.left;
      const dy = first[i].top - last.top;
      if (dx || dy) {
        t.style.transition = 'none';
        t.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
          t.style.transition = 'transform 240ms ease';
          t.style.transform = '';
        });
      }
    });
  }

  function showPh(on) {
    if (!st.ph) return;
    if (on && !st.ph.isConnected) myGrid.appendChild(st.ph);
    st.ph.style.display = on ? '' : 'none';
  }

  function up() {
    if (st && st.dragging) {
      if (st.overRemove && st.source.kind === 'mine') {
        onRemove(st.source.id);
      } else if (st.overMy && st.index !== null) {
        if (st.source.kind === 'mine') onReorder(st.source.id, st.index);
        else onAddAt(st.source.entry, st.index);
      }
    }
    finish();
  }

  function cancel() { finish(); }

  function finish() {
    if (st) {
      st.clone?.remove();
      st.ph?.remove();
      st.source.tileEl.classList.remove('drag-source-hidden');
      availablePanel.classList.remove('removing', 'remove-hot');
      document.body.classList.remove('dragging-active');
      myGrid.querySelectorAll('.tile.mine').forEach((t) => {
        t.style.transition = '';
        t.style.transform = '';
      });
    }
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    st = null;
  }

  return { down };
}
