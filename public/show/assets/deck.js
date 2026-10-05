/* HACKBACK show engine.
 *  → / Space / PageDown / click : next (reveals the next line first, then the next slide)
 *  ← / PageUp                   : back
 *  F fullscreen · N emcee cues · T start/pause timer · R reset timer · L light the lamp
 *  Home / End · H help · number + Enter jumps to a slide
 */
(function () {
  const CFG = window.CONFIG || {};
  const stage = document.getElementById('stage');
  const slides = [...document.querySelectorAll('.slide')];
  const progress = document.getElementById('progress');
  const footR = document.getElementById('footR');
  const notes = document.getElementById('notes');
  let cur = 0;
  let typed = '';

  // fill CONFIG placeholders
  document.querySelectorAll('[data-cfg]').forEach((el) => {
    const v = CFG[el.dataset.cfg];
    if (v) el.textContent = v;
  });

  // split letters for .split headings (keeps <br> and coloured <span>s)
  document.querySelectorAll('.split').forEach((el) => {
    let i = 0;
    const wrap = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const part of n.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
            const word = document.createElement('span');
            word.style.whiteSpace = 'nowrap';
            for (const ch of part) {
              const s = document.createElement('span');
              s.className = 'ch';
              s.style.setProperty('--ci', i++);
              s.textContent = ch;
              word.appendChild(s);
            }
            frag.appendChild(word);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') wrap(n);
      });
    };
    wrap(el);
  });

  // stagger index for .st children and cards
  document.querySelectorAll('.st').forEach((p) => [...p.children].forEach((c, i) => c.style.setProperty('--i', i)));
  document.querySelectorAll('[data-i]').forEach((el) => el.style.setProperty('--i', el.dataset.i));

  // floating suits
  const sf = document.querySelector('.suits-float');
  if (sf) {
    const suits = ['♠', '♥', '♦', '♣'];
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('span');
      s.textContent = suits[i % 4];
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      s.style.fontSize = 40 + Math.random() * 140 + 'px';
      s.style.animationDelay = -Math.random() * 18 + 's';
      sf.appendChild(s);
    }
  }

  // scale stage to window
  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  window.addEventListener('resize', fit);
  fit();

  const frags = (sl) => [...sl.querySelectorAll('.f')];

  function show(n, revealAll) {
    n = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach((s, i) => {
      s.classList.toggle('on', i === n);
      if (i !== n) s.classList.remove('on');
    });
    const sl = slides[n];
    // restart animations
    sl.classList.remove('on'); void sl.offsetWidth; sl.classList.add('on');
    frags(sl).forEach((f) => f.classList.toggle('shown', !!revealAll));
    if (revealAll && sl.querySelector('[data-action="lamp"]')) sl.querySelectorAll('.lamp').forEach((l) => l.classList.add('lit'));
    stage.classList.toggle('light', sl.classList.contains('light'));
    cur = n;
    progress.style.width = ((n + 1) / slides.length) * 100 + '%';
    if (footR) footR.textContent = `${String(n + 1).padStart(2, '0')} / ${slides.length}`;
    notes.textContent = sl.dataset.notes || '';
    history.replaceState(null, '', '#' + (n + 1));
    sl.querySelectorAll('.count').forEach(countUp);
    stopTimers(sl);
  }

  function next() {
    const hidden = frags(slides[cur]).filter((f) => !f.classList.contains('shown'));
    if (hidden.length) {
      const f = hidden[0];
      // optional: dim previously shown lines in a .dimprev group
      const grp = f.closest('.dimprev');
      if (grp) frags(grp).forEach((x) => x.classList.toggle('dimmed', x !== f && x.classList.contains('shown')));
      f.classList.add('shown');
      if (f.dataset.action === 'lamp') document.querySelectorAll('.lamp').forEach((l) => l.classList.add('lit'));
      return;
    }
    if (cur < slides.length - 1) show(cur + 1);
  }
  function prev() {
    const shown = frags(slides[cur]).filter((f) => f.classList.contains('shown'));
    if (shown.length) { shown[shown.length - 1].classList.remove('shown'); return; }
    if (cur > 0) show(cur - 1, true);
  }

  // count-up numbers
  function countUp(el) {
    const to = +el.dataset.to, steps = 40;
    let k = 0;
    clearInterval(el._iv);
    el._iv = setInterval(() => {
      k++;
      el.textContent = Math.round(to * (1 - Math.pow(1 - k / steps, 3)));
      if (k >= steps) clearInterval(el._iv);
    }, 35);
  }

  // timers
  const timers = new Map();
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  function resetTimer(el) {
    const st = timers.get(el); if (st) clearInterval(st.iv);
    el.dataset.left = el.dataset.sec; el.textContent = fmt(+el.dataset.sec);
    el.classList.remove('run', 'done'); timers.delete(el);
  }
  document.querySelectorAll('.timer').forEach(resetTimer);
  function toggleTimer() {
    slides[cur].querySelectorAll('.timer').forEach((el) => {
      const st = timers.get(el);
      if (st) { clearInterval(st.iv); timers.delete(el); el.classList.remove('run'); return; }
      el.classList.add('run');
      const iv = setInterval(() => {
        let left = +el.dataset.left - 1; el.dataset.left = left;
        el.textContent = fmt(Math.max(0, left));
        if (left <= 0) { clearInterval(iv); timers.delete(el); el.classList.remove('run'); el.classList.add('done'); }
      }, 1000);
      timers.set(el, { iv });
    });
  }
  function stopTimers() { /* timers keep running if you leave a slide; press R on it to reset */ }

  // keys
  document.addEventListener('keydown', (e) => {
    const k = e.key;
    if (/^[0-9]$/.test(k)) { typed += k; return; }
    if (k === 'Enter' && typed) { show(+typed - 1); typed = ''; return; }
    typed = '';
    if (['ArrowRight', ' ', 'PageDown', 'ArrowDown'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') show(0);
    else if (k === 'End') show(slides.length - 1);
    else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
    else if (k === 'n' || k === 'N') notes.classList.toggle('show');
    else if (k === 't' || k === 'T') toggleTimer();
    else if (k === 'r' || k === 'R') slides[cur].querySelectorAll('.timer').forEach(resetTimer);
    else if (k === 'l' || k === 'L') document.querySelectorAll('.lamp').forEach((l) => l.classList.toggle('lit'));
    else if (k === 'h' || k === 'H' || k === '?') document.getElementById('help').classList.toggle('show');
  });
  document.addEventListener('click', (e) => { if (e.button === 0) next(); });
  document.addEventListener('contextmenu', (e) => { e.preventDefault(); prev(); });
  let mt; document.addEventListener('mousemove', () => { document.body.classList.add('cursor'); clearTimeout(mt); mt = setTimeout(() => document.body.classList.remove('cursor'), 1500); });

  const start = parseInt(location.hash.slice(1), 10);
  // ?all reveals every line at once (for previews and printing)
  show(Number.isFinite(start) ? start - 1 : 0, location.search.includes('all'));
})();
