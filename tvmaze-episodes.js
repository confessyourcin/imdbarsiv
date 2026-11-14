// Arşiv oynatıcısı için IMDb alınamadığında kullanılan bölüm listesi.
(function () {
    'use strict';
    const TTL = 60 * 60 * 1000;
    const pending = new Map();
    async function read(url) {
        const res = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error('TVmaze HTTP ' + res.status);
        return res.json();
    }
    async function load(imdbId) {
        const key = 'imdb-archive:tvmaze:' + imdbId;
        let rows;
        try {
            const cached = JSON.parse(localStorage.getItem(key) || 'null');
            if (cached && Date.now() - cached.at < TTL && Array.isArray(cached.rows)) rows = cached.rows;
        } catch (e) { /* önbellek yok */ }
        if (!rows) {
            const show = await read('https://api.tvmaze.com/lookup/shows?imdb=' + encodeURIComponent(imdbId));
            if (!show || !Number.isInteger(show.id) || show.id < 1 || !show.externals || show.externals.imdb !== imdbId) return null;
            const data = await read(`https://api.tvmaze.com/shows/${show.id}/episodes`);
            if (!Array.isArray(data)) return null;
            rows = data.map(e => ({ season: e && e.season, episode: e && e.number }));
            try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), rows })); } catch (e) { /* önbellek dolu */ }
        }
        const eps = {};
        for (const row of rows) {
            if (!row || !Number.isInteger(row.season) || row.season < 1 || row.season > 200
                || !Number.isInteger(row.episode) || row.episode < 1 || row.episode > 5000) continue;
            if (!eps[row.season]) eps[row.season] = [];
            eps[row.season].push(row.episode);
        }
        const seasons = Object.keys(eps).map(Number).sort((a, b) => a - b);
        for (const sn of seasons) eps[sn] = [...new Set(eps[sn])].sort((a, b) => a - b);
        return seasons.length ? { seasons, eps } : null;
    }
    window.ImdbTvmazeEpisodes = {
        get(imdbId) {
            if (!/^tt\d+$/.test(imdbId)) return Promise.resolve(null);
            if (!pending.has(imdbId)) {
                const task = load(imdbId).catch(() => null).finally(() => pending.delete(imdbId));
                pending.set(imdbId, task);
            }
            return pending.get(imdbId);
        }
    };
})();
