(function () {
    'use strict';
    const DEFAULT_API_KEY = 'a55c55990dc3d95c484ee750a4efda03';
    const genres = { Action: 'Aksiyon', Adventure: 'Macera', Animation: 'Animasyon', Biography: 'Biyografi', Comedy: 'Komedi', Crime: 'Suç', Documentary: 'Belgesel', Drama: 'Dram', Family: 'Aile', Fantasy: 'Fantastik', History: 'Tarih', Horror: 'Korku', Music: 'Müzik', Musical: 'Müzikal', Mystery: 'Gizem', Romance: 'Romantik', 'Sci-Fi': 'Bilim Kurgu', Sport: 'Spor', Thriller: 'Gerilim', War: 'Savaş', Western: 'Vahşi Batı', 'Reality-TV': 'Reality Şov', 'Talk-Show': 'Sohbet Programı', News: 'Haber', 'Game-Show': 'Yarışma' };
    const apiKey = DEFAULT_API_KEY;
    const language = window.ArchivePreferences.language;
    const requests = new Map();
    function translateGenre(value) {
        const values = Array.isArray(value) ? value : String(value || '').split(',');
        if (language === 'en') return values.map(v => String(v).trim()).filter(Boolean).join(', ');
        return values.map(v => genres[String(v).trim()] || String(v).trim()).filter(Boolean).join(', ');
    }
    async function lookup(item) {
        const key = 'imdb-archive:metadata:v3:' + language + ':' + item.id + ':' + (item.isTV ? 'tv' : 'movie');
        try {
            const cached = JSON.parse(localStorage.getItem(key) || 'null');
            if (cached && Date.now() - cached.at < 86400000) return cached.data;
        } catch (e) { /* önbellek yok */ }
        const url = new URL('https://api.themoviedb.org/3/find/' + item.id);
        url.search = new URLSearchParams({ api_key: apiKey, external_source: 'imdb_id', language: language === 'en' ? 'en-US' : 'tr-TR' });
        const res = await fetch(url.href, { credentials: 'omit', signal: AbortSignal.timeout(7000) });
        if (!res.ok) throw new Error('TMDB HTTP ' + res.status);
        const json = await res.json();
        const rows = item.isTV ? json.tv_results : json.movie_results;
        const row = Array.isArray(rows) ? rows[0] : null;
        const title = row && (item.isTV ? row.original_name : row.title);
        const data = row ? { title: typeof title === 'string' ? title : '', desc: typeof row.overview === 'string' ? row.overview : '' } : {};
        try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch (e) { /* önbellek dolu */ }
        return data;
    }
    async function localize(item) {
        const result = { ...item, genre: translateGenre(item.genre) };
        if (language === 'en') {
            const types = { 'Film': 'Movie', 'Dizi': 'Series', 'Mini dizi': 'Miniseries', 'TV filmi': 'TV movie', 'TV özel': 'TV special', 'Kısa film': 'Short film', 'Bölüm': 'Episode' };
            result.typeLabel = types[item.typeLabel] || item.typeLabel;
        }
        if (!/^[a-f\d]{32}$/i.test(apiKey) || !/^tt\d+$/.test(item.id)) return result;
        const key = item.id + ':' + item.isTV;
        if (!requests.has(key)) requests.set(key, lookup(item).catch(() => ({})));
        const data = await requests.get(key);
        if (data.title) result.title = data.title;
        if (data.desc) result.desc = data.desc;
        return result;
    }
    async function items(list) {
        const out = list.slice();
        let index = 0;
        await Promise.all(Array.from({ length: Math.min(4, list.length) }, async () => {
            while (index < list.length) {
                const i = index++;
                out[i] = await localize(list[i]);
            }
        }));
        return out;
    }
    window.ImdbTurkishMetadata = { items, translateGenre };
})();
