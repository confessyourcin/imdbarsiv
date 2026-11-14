// IMDb Arşivi: eklenti simgesine tıklanınca açılan sayfa.
// Top 10 listeleri IMDb'nin "en popüler" sayfalarından (JSON-LD), arama IMDb öneri
// uç noktasından gelir. Oynatma, IMDb sayfasındaki ile aynı oynatıcıyla (content.js) olur.
(function () {
    'use strict';

    const CHART_TTL = 6 * 60 * 60 * 1000;
    const SUGGEST = 'https://v3.sg.media-imdb.com/suggestion/x/';
    const TV_QIDS = new Set(['tvSeries', 'tvMiniSeries']);
    const SKIP_QIDS = new Set(['videoGame', 'podcastSeries', 'podcastEpisode', 'musicVideo']);
    const TYPE_LABELS = {
        movie: 'Film', tvSeries: 'Dizi', tvMiniSeries: 'Mini dizi', tvMovie: 'TV filmi',
        tvSpecial: 'TV özel', video: 'Video', short: 'Kısa film', tvShort: 'Kısa film', tvEpisode: 'Bölüm'
    };
    // IMDb listesi alınamazsa gösterilen öne çıkanlar (kimlikler öneri uç noktasıyla doğrulandı).
    const FEATURED = {
        movie: ['tt0111161', 'tt0068646', 'tt0468569', 'tt1375666', 'tt0816692',
                'tt0137523', 'tt0109830', 'tt0133093', 'tt15398776', 'tt6751668'],
        tv: ['tt0903747', 'tt0944947', 'tt0455275', 'tt4574334', 'tt0108778',
             'tt2861424', 'tt7366338', 'tt0306414', 'tt1475582', 'tt11280740']
    };

    const $ = (id) => document.getElementById(id);
    const el = (tag, cls, text) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined && text !== null) n.textContent = text;
        return n;
    };

    // ---------- Yardımcılar ----------
    const IMG_RE = /^https:\/\/m\.media-amazon\.com\/images\/[^"'()\s\\]+$/;
    function imgUrl(url, width) {
        if (typeof url !== 'string' || !IMG_RE.test(url)) return '';
        return url.replace(/\._V1_[^/]*?\.(jpg|jpeg|png|webp)$/i, `._V1_QL75_UX${width}_.$1`);
    }
    const parser = new DOMParser();
    function decode(s) {
        if (typeof s !== 'string' || !s.includes('&')) return s || '';
        return parser.parseFromString('<!doctype html><body>' + s, 'text/html').body.textContent || '';
    }
    function cacheGet(key) {
        try {
            const v = JSON.parse(localStorage.getItem(key) || 'null');
            return v && Date.now() - v.t < CHART_TTL ? v.items : null;
        } catch (e) { return null; }
    }
    function cacheSet(key, items) {
        try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), items })); } catch (e) { /* yok say */ }
    }

    // ---------- Veri ----------
    function fromSuggestion(d) {
        if (!d || typeof d.id !== 'string' || !/^tt\d+$/.test(d.id) || SKIP_QIDS.has(d.qid)) return null;
        return {
            id: d.id,
            title: d.l || d.id,
            isTV: TV_QIDS.has(d.qid),
            typeLabel: TYPE_LABELS[d.qid] || d.q || '',
            year: d.yr || (d.y ? String(d.y) : ''),
            image: d.i && d.i.imageUrl,
            cast: d.s || '',
            rating: null, genre: '', desc: ''
        };
    }

    async function suggest(query) {
        const q = query.trim().toLowerCase();
        const res = await fetch(SUGGEST + encodeURIComponent(q) + '.json', { credentials: 'omit' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        return (Array.isArray(data && data.d) ? data.d : []).map(fromSuggestion).filter(Boolean);
    }

    async function lookupById(id) {
        const list = await suggest(id);
        return list.find(x => x.id === id) || null;
    }

    async function fetchChart(kind) {
        const res = await fetch(`https://www.imdb.com/chart/${kind}/`, { credentials: 'include' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const html = await res.text();
        const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (!m) throw new Error('Liste verisi yok (bot doğrulaması olabilir)');
        const j = JSON.parse(m[1]);
        const list = j && j['@type'] === 'ItemList' && Array.isArray(j.itemListElement) ? j.itemListElement : [];
        const items = [];
        for (const li of list) {
            const it = li && li.item;
            const id = it && typeof it.url === 'string' && (it.url.match(/\/title\/(tt\d+)/) || [])[1];
            if (!id) continue;
            const agg = it.aggregateRating;
            items.push({
                id,
                title: decode(it.name) || id,
                isTV: kind === 'tvmeter' || /TV/.test(it['@type'] || ''),
                typeLabel: kind === 'tvmeter' ? 'Dizi' : 'Film',
                year: '',
                image: it.image,
                cast: '',
                rating: agg && Number.isFinite(Number(agg.ratingValue)) ? Number(agg.ratingValue) : null,
                genre: decode(it.genre || ''),
                desc: decode(it.description || '')
            });
            if (items.length === 10) break;
        }
        if (items.length < 10) throw new Error('Liste eksik geldi');
        return items;
    }

    async function loadTop(kind) {
        const key = 'imdb-archive:chart:' + kind;
        const cached = cacheGet(key);
        if (cached) return { items: cached, live: true };
        try {
            const items = await fetchChart(kind);
            cacheSet(key, items);
            return { items, live: true };
        } catch (e) {
            const ids = FEATURED[kind === 'tvmeter' ? 'tv' : 'movie'];
            const found = await Promise.all(ids.map(id => lookupById(id).catch(() => null)));
            return { items: found.filter(Boolean), live: false, error: e.message };
        }
    }

    // ---------- Oynatma ----------
    function play(item, episode) {
        const P = window.IMDbPlayer;
        if (!P) { alert('Oynatıcı yüklenemedi.'); return; }
        const servers = item.isTV && episode
            ? P.getServers(item.id, true, String(episode.season), String(episode.episode))
            : P.getServers(item.id, !!item.isTV);
        if (!servers.length) { alert('Bu başlık için kaynak oluşturulamadı.'); return; }
        if (playerOpen()) return;
        if (detail.open) detail.close();
        P.showModal(servers[0].url, servers);
    }

    // ---------- Görünüm parçaları ----------
    function posterEl(item, width, badge) {
        const box = el('div', 'poster');
        const src = imgUrl(item.image, width);
        if (src) {
            const img = el('img');
            img.loading = 'lazy';
            img.decoding = 'async';
            img.alt = '';
            img.src = src;
            img.onerror = () => { img.remove(); box.appendChild(el('span', 'no-img', item.title)); };
            box.appendChild(img);
        } else {
            box.appendChild(el('span', 'no-img', item.title));
        }
        if (badge) box.appendChild(el('span', 'poster-badge', badge));
        return box;
    }

    function topItem(item, rank) {
        const b = el('button', 'top-item');
        b.type = 'button';
        b.setAttribute('aria-label', `${rank}. ${item.title}`);
        b.appendChild(el('span', 'rank', String(rank)));
        const stack = el('span', 'top-stack');
        stack.appendChild(posterEl(item, 320));
        stack.appendChild(el('span', 'top-caption', item.title));
        b.appendChild(stack);
        b.onclick = () => openDetail(item);
        return b;
    }

    function card(item) {
        const b = el('button', 'card');
        b.type = 'button';
        b.appendChild(posterEl(item, 320, item.typeLabel));
        b.appendChild(el('span', 'card-title', item.title));
        const sub = [item.year, item.cast].filter(Boolean).join(' · ');
        if (sub) b.appendChild(el('span', 'card-sub', sub));
        b.onclick = () => openDetail(item);
        return b;
    }

    function skeletonRail(rail) {
        rail.textContent = '';
        for (let i = 1; i <= 10; i++) {
            const s = el('div', 'top-item skeleton');
            s.appendChild(el('span', 'rank', String(i)));
            s.appendChild(el('div', 'poster'));
            rail.appendChild(s);
        }
    }

    function metaParts(item) {
        const parts = [];
        if (item.rating) parts.push({ cls: 'rating', text: item.rating.toFixed(1) });
        if (item.year) parts.push({ text: item.year });
        if (item.genre) parts.push({ text: item.genre });
        return parts;
    }

    // ---------- Vitrin ----------
    let heroItem = null;
    function setHero(item, kicker) {
        heroItem = item;
        $('hero-kicker').textContent = kicker;
        $('hero-title').textContent = item.title;
        const meta = $('hero-meta');
        meta.textContent = '';
        for (const p of metaParts(item)) meta.appendChild(el('span', p.cls || '', p.text));
        if (!item.rating && !item.genre && item.cast) meta.appendChild(el('span', '', item.cast));
        $('hero-desc').textContent = item.desc || '';
        const bg = $('hero-bg');
        const big = imgUrl(item.image, 1200);
        bg.style.backgroundImage = big ? `url("${big}")` : '';
        bg.classList.add('blurred');
        const hero = $('hero');
        let poster = hero.querySelector('.hero-bg-poster');
        if (!poster) { poster = el('div', 'hero-bg-poster'); hero.appendChild(poster); }
        const p = imgUrl(item.image, 520);
        poster.style.backgroundImage = p ? `url("${p}")` : '';
        poster.hidden = !p;
        $('hero-actions').hidden = false;
    }
    $('hero-play').onclick = () => { if (heroItem) (heroItem.isTV ? openDetail(heroItem) : play(heroItem)); };
    $('hero-info').onclick = () => { if (heroItem) openDetail(heroItem); };

    // ---------- Ayrıntı ----------
    const detail = $('detail');
    let detailItem = null;
    const playerOpen = () => !!document.querySelector('.vidsrc-modal-overlay');
    function openDetail(item) {
        if (playerOpen()) return;
        detailItem = item;
        $('detail-type').textContent = item.typeLabel || (item.isTV ? 'Dizi' : 'Film');
        $('detail-title').textContent = item.title;
        $('detail-meta').textContent = metaParts(item).map(p => p.cls === 'rating' ? '★ ' + p.text : p.text)
            .concat(item.cast ? [item.cast] : []).join(' · ');
        $('detail-desc').textContent = item.desc || '';
        const p = imgUrl(item.image, 600);
        $('detail-poster').style.backgroundImage = p ? `url("${p}")` : '';
        $('detail-imdb').href = `https://www.imdb.com/title/${item.id}/`;
        $('episode-pick').hidden = !item.isTV;
        if (item.isTV) {
            $('ep-season').value = '1';
            $('ep-episode').value = '1';
            $('ep-free').checked = false;
            syncEpisodeInputs();
        }
        if (!detail.open) detail.showModal();
        $('detail-play').focus();
    }
    function syncEpisodeInputs() {
        const free = $('ep-free').checked;
        $('ep-season').disabled = free;
        $('ep-episode').disabled = free;
    }
    $('ep-free').onchange = syncEpisodeInputs;
    $('detail-close').onclick = () => detail.close();
    detail.addEventListener('click', (e) => { if (e.target === detail) detail.close(); });
    $('detail-play').onclick = () => {
        if (!detailItem) return;
        if (!detailItem.isTV || $('ep-free').checked) { play(detailItem); return; }
        const s = parseInt($('ep-season').value, 10);
        const ep = parseInt($('ep-episode').value, 10);
        if (!(s >= 1) || !(ep >= 1)) { $('ep-season').focus(); return; }
        play(detailItem, { season: s, episode: ep });
    };

    // ---------- Top 10 satırları ----------
    async function fillRow(kind, railId, titleId, noteId, label) {
        const rail = $(railId);
        skeletonRail(rail);
        const r = await loadTop(kind);
        rail.textContent = '';
        if (!r.live) {
            $(titleId).textContent = `Öne Çıkan ${label}`;
            $(noteId).textContent = 'IMDb popüler listesi alınamadı; IMDb sekmesini bir kez açıp sayfayı yenilemeyi dene.';
        } else {
            $(noteId).textContent = 'IMDb en popüler';
        }
        if (!r.items.length) {
            rail.appendChild(el('p', 'empty', 'Liste yüklenemedi.'));
            return r;
        }
        r.items.forEach((item, i) => rail.appendChild(topItem(item, i + 1)));
        return r;
    }

    document.querySelectorAll('.rail-wrap').forEach(wrap => {
        const rail = wrap.querySelector('.rail');
        wrap.querySelector('.prev').onclick = () => rail.scrollBy({ left: -rail.clientWidth * 0.85, behavior: 'smooth' });
        wrap.querySelector('.next').onclick = () => rail.scrollBy({ left: rail.clientWidth * 0.85, behavior: 'smooth' });
    });

    // ---------- Arama ----------
    const input = $('search-input');
    const clearBtn = $('search-clear');
    let searchSeq = 0;
    let debounce = 0;

    function showHome() {
        $('results').hidden = true;
        $('hero').hidden = false;
        $('rows').hidden = false;
    }
    function showResults() {
        $('results').hidden = false;
        $('hero').hidden = true;
        $('rows').hidden = true;
    }

    async function runSearch(q) {
        const seq = ++searchSeq;
        showResults();
        $('results-title').textContent = `“${q}” için sonuçlar`;
        $('results-note').textContent = 'Aranıyor…';
        let items;
        try {
            items = await suggest(q);
        } catch (e) {
            if (seq !== searchSeq) return;
            $('results-grid').textContent = '';
            $('results-note').textContent = 'Arama başarısız: ' + e.message;
            return;
        }
        if (seq !== searchSeq) return;
        const grid = $('results-grid');
        grid.textContent = '';
        $('results-note').textContent = items.length ? `${items.length} başlık` : '';
        if (!items.length) { grid.appendChild(el('p', 'empty', 'Sonuç bulunamadı.')); return; }
        items.forEach(item => grid.appendChild(card(item)));
    }

    input.addEventListener('input', () => {
        const q = input.value.trim();
        clearBtn.hidden = !input.value;
        clearTimeout(debounce);
        if (q.length < 2) {
            searchSeq++;
            if (!q) { showHome(); return; }
            if (!$('results').hidden) {
                $('results-grid').textContent = '';
                $('results-note').textContent = 'Aramak için en az 2 harf yaz.';
            }
            return;
        }
        debounce = setTimeout(() => runSearch(q), 300);
    });
    $('search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const q = input.value.trim();
        clearTimeout(debounce);
        if (q) runSearch(q);
    });
    function clearSearch() {
        clearTimeout(debounce);
        input.value = '';
        clearBtn.hidden = true;
        searchSeq++;
        showHome();
    }
    clearBtn.onclick = () => { clearSearch(); input.focus(); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && input.value) { e.preventDefault(); clearSearch(); } });
    $('brand').onclick = (e) => { e.preventDefault(); clearSearch(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== input && !detail.open && !playerOpen()
            && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName)) {
            e.preventDefault();
            input.focus();
        }
    });

    const topbar = $('topbar');
    window.addEventListener('scroll', () => topbar.classList.toggle('solid', window.scrollY > 40), { passive: true });

    // ---------- Başlangıç ----------
    (async () => {
        const [movies, tv] = await Promise.all([
            fillRow('moviemeter', 'rail-movies', 'row-movies-title', 'row-movies-note', 'Filmler'),
            fillRow('tvmeter', 'rail-tv', 'row-tv-title', 'row-tv-note', 'Diziler')
        ]);
        const first = movies.items[0] || tv.items[0];
        if (first) setHero(first, movies.live ? '#1 · Bugün en popüler film' : 'Öne çıkan');
        else {
            $('hero-kicker').textContent = 'Bağlantı yok';
            $('hero-title').textContent = 'Liste yüklenemedi';
            $('hero-desc').textContent = 'Yukarıdan arama yapmayı deneyebilirsin.';
        }
    })();

    try { $('app-version').textContent = chrome.runtime.getManifest().version; } catch (e) { /* test ortamı */ }

    input.focus({ preventScroll: true });
})();
