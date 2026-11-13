(() => {
  const $ = (s) => document.querySelector(s);

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

  async function getJSON(path) {
    const r = await fetch(path, { cache: 'no-cache' });
    if (!r.ok) throw new Error('Не удалось загрузить ' + path);
    return r.json();
  }

  // Превращает ссылку на YouTube/Vimeo в адрес для встраивания
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
    if (m) {
      return { src: 'https://player.vimeo.com/video/' + m[1] + (m[2] ? '?h=' + m[2] : ''), thumb: '' };
    }
    return null;
  }

  // ---------- плеер ----------
  const dialog = $('#player');
  const frame = $('#frame');

  function openVideo(video, title) {
    const u = new URL(video.src);
    u.searchParams.set('autoplay', '1');
    frame.replaceChildren(el('iframe', {
      src: u.toString(),
      title: title || 'Видео',
      allow: 'autoplay; fullscreen; picture-in-picture',
      allowfullscreen: '',
    }));
    dialog.showModal();
  }
  dialog.addEventListener('close', () => frame.replaceChildren());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  $('#close').addEventListener('click', () => dialog.close());

  // ---------- страница ----------
  function renderSite(site) {
    const name = site.name || 'Видеограф';
    const role = [site.role, site.city].filter(Boolean).join(', ');
    document.title = name + (site.role ? ' — ' + site.role.toLowerCase() : '');
    $('#brand').textContent = name;
    $('#heroName').textContent = name;
    $('#heroRole').textContent = role;
    $('#footer').textContent = '© ' + new Date().getFullYear() + ' ' + name;

    const about = $('#aboutText');
    (site.about || '').split(/\n\s*\n/).filter(Boolean)
      .forEach((p) => about.append(el('p', { text: p.trim() })));
    if (!about.children.length) $('#about').hidden = true;

    if (site.photo) {
      $('#aboutPhoto').append(el('img', { src: site.photo, alt: name, loading: 'lazy' }));
      $('#aboutPhoto').hidden = false;
    }

    const list = $('#contactList');
    const add = (href, text) => list.append(el('li', {}, el('a', { href, text, rel: 'noopener' })));
    const handle = (s) => s.trim().replace(/^@/, '').replace(/^https?:\/\/[^/]+\//, '');
    if (site.email) add('mailto:' + site.email, site.email);
    if (site.telegram) add('https://t.me/' + handle(site.telegram), 'Telegram @' + handle(site.telegram));
    if (site.instagram) add('https://instagram.com/' + handle(site.instagram), 'Instagram @' + handle(site.instagram));
    if (!list.children.length) $('#contact').hidden = true;
  }

  function renderWorks(works) {
    works = works.map((w) => {
      const video = parseVideo(w.video_url);
      return { ...w, video, thumb: w.cover || (video && video.thumb) || '' };
    });

    // главный экран: первая работа с отметкой «на главную»
    const featured = works.find((w) => w.featured);
    if (featured) {
      if (featured.thumb) $('#heroBg').style.backgroundImage = 'url("' + featured.thumb + '")';
      if (featured.video) {
        const b = $('#heroPlay');
        b.textContent = 'Смотреть: ' + featured.title;
        b.hidden = false;
        b.addEventListener('click', () => openVideo(featured.video, featured.title));
      }
    }

    if (!works.length) { $('#empty').hidden = false; $('#filters').hidden = true; return; }

    const grid = $('#grid');
    const filters = $('#filters');
    const cats = [...new Set(works.map((w) => w.category).filter(Boolean))];

    function draw(cat) {
      grid.replaceChildren(...works
        .filter((w) => !cat || w.category === cat)
        .map((w) => {
          const thumb = el('div', { class: 'thumb' },
            w.thumb
              ? el('img', { src: w.thumb, alt: '', loading: 'lazy' })
              : el('div', { class: 'noimg', text: w.title }),
            w.video && el('span', { class: 'play', 'aria-hidden': 'true' }));
          const tile = el('button', {
            class: 'tile', type: 'button',
            'aria-label': w.video ? 'Смотреть: ' + w.title : w.title,
          }, thumb, el('h3', { text: w.title }),
            el('div', { class: 'meta' },
              el('span', { text: w.category || '' }),
              el('span', { text: w.year || '' })),
            w.description && el('p', { class: 'desc', text: w.description }));
          if (w.video) tile.addEventListener('click', () => openVideo(w.video, w.title));
          else tile.style.cursor = 'default';
          return tile;
        }));
    }

    if (cats.length > 1) {
      let current = '';
      const buttons = ['Все', ...cats].map((label, i) => {
        const b = el('button', { type: 'button', text: label, 'aria-pressed': String(i === 0) });
        b.addEventListener('click', () => {
          current = i === 0 ? '' : label;
          buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          draw(current);
        });
        return b;
      });
      filters.append(...buttons);
    } else {
      filters.hidden = true;
    }
    draw('');
  }

  Promise.all([getJSON('content/site.json'), getJSON('content/works.json')])
    .then(([site, data]) => { renderSite(site); renderWorks(data.works || []); })
    .catch((err) => {
      console.error(err);
      $('#empty').textContent = 'Не удалось загрузить сайт. Обновите страницу.';
      $('#empty').hidden = false;
    });
})();
