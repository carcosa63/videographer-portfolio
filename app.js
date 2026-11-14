(() => {
  const $ = (s) => document.querySelector(s);
  const app = $('#app');

  // Создаёт элемент: el('a', {href: '...', text: '...'}, дети)
  function el(tag, props = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    kids.flat().forEach((c) => c && n.append(c));
    return n;
  }

  async function getJSON(path, fallback) {
    try {
      const r = await fetch(path, { cache: 'no-cache' });
      if (!r.ok) throw new Error(path);
      return await r.json();
    } catch (e) {
      console.error(e);
      return fallback;
    }
  }

  // Ссылка на YouTube/Vimeo -> адрес для встраивания
  function parseVideo(url = '') {
    url = url.trim();
    let m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
    if (m) {
      return {
        src: 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0',
        thumb: 'https://img.youtube.com/vi/' + m[1] + '/hqdefault.jpg',
      };
    }
    m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-z0-9]+))?/i);
    if (m) return { src: 'https://player.vimeo.com/video/' + m[1] + (m[2] ? '?h=' + m[2] : ''), thumb: '' };
    return null;
  }

  const imgOf = (p) => (typeof p === 'string' ? p : (p && p.image) || '');
  const data = { site: {}, videos: [], albums: [] };

  // ---------- плеер видео ----------
  const player = $('#player');
  const frame = $('#frame');
  function openVideo(video, title) {
    const u = new URL(video.src);
    u.searchParams.set('autoplay', '1');
    frame.replaceChildren(el('iframe', {
      src: u.toString(), title: title || 'Видео',
      allow: 'autoplay; fullscreen; picture-in-picture', allowfullscreen: '',
    }));
    player.showModal();
  }
  player.addEventListener('close', () => frame.replaceChildren());
  player.addEventListener('click', (e) => { if (e.target === player) player.close(); });
  $('#closePlayer').addEventListener('click', () => player.close());

  // ---------- просмотр фото ----------
  const viewer = $('#viewer');
  const vImg = $('#vImg');
  const vPrev = $('#vPrev');
  const vNext = $('#vNext');
  const vCount = $('#vCount');
  let list = [];
  let idx = 0;

  function showPhoto(i) {
    idx = (i + list.length) % list.length;
    vImg.src = list[idx];
    vCount.textContent = (idx + 1) + ' / ' + list.length;
    if (list.length > 1) { new Image().src = list[(idx + 1) % list.length]; }
  }
  function openViewer(photos, i) {
    list = photos;
    const many = photos.length > 1;
    vPrev.hidden = !many; vNext.hidden = !many; vCount.hidden = !many;
    showPhoto(i);
    viewer.showModal();
  }
  vPrev.addEventListener('click', () => showPhoto(idx - 1));
  vNext.addEventListener('click', () => showPhoto(idx + 1));
  $('#closeViewer').addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', () => vImg.removeAttribute('src'));
  viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });
  viewer.addEventListener('keydown', (e) => {
    if (list.length < 2) return;
    if (e.key === 'ArrowLeft') showPhoto(idx - 1);
    if (e.key === 'ArrowRight') showPhoto(idx + 1);
  });
  let startX = null;
  viewer.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  viewer.addEventListener('touchend', (e) => {
    if (startX === null || list.length < 2) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) showPhoto(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // ---------- страницы ----------
  const empty = (t) => el('p', { class: 'empty', text: t });

  function homeView() {
    const name = (data.site.name || '').trim();
    const [last, ...rest] = name.split(/\s+/);
    const about = el('div', { class: 'about' });
    (data.site.about || '').split(/\n\s*\n/).filter(Boolean)
      .forEach((p) => about.append(el('p', { text: p.trim() })));
    return el('section', { class: 'home' },
      el('h1', { class: 'home-name' }, el('span', { text: last || '' }), rest.length && el('span', { text: rest.join(' ') })),
      el('div', { class: 'rule' }),
      about);
  }

  function videoView() {
    const items = data.videos.map((v) => {
      const thumb = el('div', { class: 'thumb' },
        v.thumb ? el('img', { src: v.thumb, alt: '', loading: 'lazy', decoding: 'async' })
                : el('div', { class: 'noimg', text: v.title || v.category || '' }),
        v.video && el('span', { class: 'play', 'aria-hidden': 'true' }));
      const item = el('button', {
        class: 'vitem', type: 'button',
        'aria-label': (v.video ? 'Смотреть: ' : '') + (v.title || v.category || 'видео'),
      }, thumb,
        el('div', { class: 'vmeta' }, el('span', { class: 'cat', text: v.category || '' }), el('span', { class: 'year', text: v.year || '' })),
        v.title && el('div', { class: 'vtitle', text: v.title }),
        v.description && el('p', { class: 'vdesc', text: v.description }));
      if (v.video) item.addEventListener('click', () => openVideo(v.video, v.title));
      else item.style.cursor = 'default';
      return item;
    });
    return el('section', { class: 'page' },
      el('h1', { class: 'page-title', text: 'Видео' }),
      items.length ? el('div', { class: 'vlist' }, items) : empty('Видео скоро появятся.'));
  }

  function photoView() {
    const cards = data.albums.map((a) => el('a', { class: 'album', href: '#/photo/' + encodeURIComponent(a.title) },
      el('div', { class: 'strip' },
        a.photos.length
          ? a.photos.slice(0, 3).map((src) => el('img', { src, alt: '', loading: 'lazy', decoding: 'async' }))
          : el('div', { class: 'ph' })),
      el('div', { class: 'vmeta' }, el('span', { class: 'cat', text: a.title }), el('span', { class: 'year', text: a.year || '' }))));
    return el('section', { class: 'page' },
      el('h1', { class: 'page-title', text: 'Фото' }),
      cards.length ? el('div', { class: 'alist' }, cards) : empty('Фото скоро появятся.'));
  }

  function albumView(a) {
    const shots = a.photos.map((src, i) => {
      const b = el('button', { class: 'shot', type: 'button', 'aria-label': 'Открыть фото ' + (i + 1) },
        el('img', { src, alt: '', loading: 'lazy', decoding: 'async' }));
      b.addEventListener('click', () => openViewer(a.photos, i));
      return b;
    });
    return el('section', { class: 'page' },
      el('a', { class: 'back', href: '#/photo', text: '← Фото' }),
      el('h1', { class: 'page-title accent', text: a.title }),
      shots.length ? el('div', { class: 'mosaic' }, shots) : empty('В этой категории пока нет фото.'));
  }

  function renderFooter() {
    const s = data.site;
    const handle = (v) => v.trim().replace(/^@/, '').replace(/^https?:\/\/[^/]+\//, '');
    const ul = el('ul');
    const add = (href, text) => ul.append(el('li', {}, el('a', { href, text, rel: 'noopener' })));
    if (s.email) add('mailto:' + s.email, s.email);
    if (s.telegram) add('https://t.me/' + handle(s.telegram), 'Telegram @' + handle(s.telegram));
    if (s.vk) add('https://vk.com/' + handle(s.vk), 'ВКонтакте vk.com/' + handle(s.vk));
    if (s.instagram) add('https://instagram.com/' + handle(s.instagram), 'Instagram @' + handle(s.instagram));
    $('#footer').replaceChildren(
      el('nav', { class: 'foot-links', 'aria-label': 'Разделы' },
        el('a', { href: '#/video', text: 'Видео' }),
        el('span', { class: 'sep', 'aria-hidden': 'true', text: '|' }),
        el('a', { href: '#/photo', text: 'Фото' })),
      ul.children.length && el('div', { class: 'contacts' }, el('h2', { text: 'Контакты' }), ul));
  }

  // ---------- переходы между страницами ----------
  function route() {
    let parts = [];
    try {
      parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    } catch (e) { /* битая ссылка: покажем главную */ }
    const [section, sub] = parts;
    const name = (data.site.name || 'Портфолио').trim();
    let view = homeView();
    let title = name;

    if (section === 'video') { view = videoView(); title = 'Видео — ' + name; }
    else if (section === 'photo') {
      const album = sub && data.albums.find((a) => a.title === sub);
      view = album ? albumView(album) : photoView();
      title = (album ? album.title : 'Фото') + ' — ' + name;
    }

    document.body.classList.toggle('is-home', !(section === 'video' || section === 'photo'));
    document.querySelectorAll('[data-nav]').forEach((a) => {
      if (a.dataset.nav === section) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = title;
    app.replaceChildren(view);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  async function init() {
    const [site, videos, photos] = await Promise.all([
      getJSON('content/site.json', {}),
      getJSON('content/video.json', { videos: [] }),
      getJSON('content/photo.json', { albums: [] }),
    ]);
    data.site = site || {};
    data.videos = (videos.videos || []).map((v) => {
      const video = parseVideo(v.video_url);
      return { ...v, video, thumb: v.cover || (video && video.thumb) || '' };
    });
    data.albums = (photos.albums || []).filter((a) => a && a.title)
      .map((a) => ({ ...a, photos: (a.photos || []).map(imgOf).filter(Boolean) }));
    $('#brand').textContent = (data.site.name || '').trim();
    renderFooter();
    route();
  }

  window.addEventListener('hashchange', route);
  init();
})();
