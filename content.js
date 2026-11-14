(function() {
    function getServers(imdbId, isTV, season, episode) {
        const list = getEmbedServers(imdbId, isTV, season, episode);
        if (!list.length) return list;
        list.push(...getExtraServers(imdbId, isTV, season, episode));
        // Yerleşik kaynakların hiçbirinde yoksa: HDFilmCehennemi sayfasını oynatıcı boyutunda
        // açılır pencerede açar. (Site sayfasının ve oynatıcısının başka sitelerde
        // çerçevelenmesine izin vermiyor; bu koruma aşılmaz.)
        list.push({
            name: 'HDFilmCehennemi (açılır pencere)',
            url: `hdfc:${imdbId}/${isTV ? 'tv' : 'movie'}/${season || ''}/${episode || ''}`,
            external: { imdbId, isTV: !!isTV, season, episode }
        });
        return list;
    }

    function getEmbedServers(imdbId, isTV, season, episode) {
        if (!/^tt\d+$/.test(imdbId)) return [];
        if (isTV) {
            if (season === undefined && episode === undefined) {
                return [
                    { name: 'VidSrc', url: `https://vidsrc.sh/embed/tv/${imdbId}` },
                    { name: 'VidAPI / VAPlayer', url: `https://vaplayer.ru/embed/tv/${imdbId}` },
                    { name: 'IMDb Player (S1E1)', url: `https://player.imdb.su/embed/tv/${imdbId}/1/1` },
                    { name: 'VidSrc.mov (S1E1)', url: `https://vidsrc.mov/embed/tv/${imdbId}/1/1` }
                ];
            }
            if (!/^[1-9]\d*$/.test(String(season)) || !/^[1-9]\d*$/.test(String(episode))) return [];
            return [
                { name: 'VidSrc', url: `https://vidsrc.sh/embed/tv/${imdbId}/${season}/${episode}` },
                { name: 'VidAPI / VAPlayer', url: `https://vaplayer.ru/embed/tv/${imdbId}/${season}/${episode}` },
                { name: 'IMDb Player', url: `https://player.imdb.su/embed/tv/${imdbId}/${season}/${episode}` },
                { name: 'VidSrc.mov (ayrı kaynak)', url: `https://vidsrc.mov/embed/tv/${imdbId}/${season}/${episode}` }
            ];
        }
        return [
            { name: 'VidSrc', url: `https://vidsrc.sh/embed/movie/${imdbId}` },
            { name: 'VidAPI / VAPlayer', url: `https://vaplayer.ru/embed/movie/${imdbId}` },
            { name: 'IMDb Player', url: `https://player.imdb.su/embed/movie/${imdbId}` },
            { name: 'VidSrc.mov (ayrı kaynak)', url: `https://vidsrc.mov/embed/movie/${imdbId}` }
        ];
    }

    // Ek sağlayıcılar aynı Kaynak listesinde, HDFC'den önce denenir.
    // vidsrc.sh aynaları (vidsrc.me/.ir, vidsrc2.ru,
    // videasy.ws) ve VixSrc'nin yayınını kullanan vidsrc.pk bilinçli olarak yok. VidSrc.party ve
    // VidSrc.buzz adı benzese de videoyu vidsrc.sh'ten farklı sunuculardan çeker (ağ trafiğiyle denendi). Hepsi IMDb kimliğiyle denendi (NOTLAR.md, 1.9.7).
    const EXTRA_SERVERS = [
        { name: 'Braflix', movie: 'https://braflix.dev/embed/movie/{id}', tv: 'https://braflix.dev/embed/tv/{id}/{s}/{e}' },
        { name: 'Nxsha', movie: 'https://nxsha.space/embed/movie/{id}', tv: 'https://nxsha.space/embed/tv/{id}/{s}/{e}' },
        { name: 'EmbedMaster', movie: 'https://embedmaster.link/movie/{id}', tv: 'https://embedmaster.link/tv/{id}/{s}/{e}' },
        { name: 'VidCore', movie: 'https://vidcore.io/movie/{id}', tv: 'https://vidcore.io/tv/{id}/{s}/{e}' },
        { name: 'VixSrc', movie: 'https://vixsrc.to/movie/{id}', tv: 'https://vixsrc.to/tv/{id}/{s}/{e}' },
        { name: 'VidSrc.party', movie: 'https://www.vidsrc.party/embed/movie/{id}', tv: 'https://www.vidsrc.party/embed/tv/{id}/{s}/{e}' },
        { name: 'VidSrc.buzz', movie: 'https://vidsrc.buzz/embed/movie/{id}', tv: 'https://vidsrc.buzz/embed/tv/{id}/{s}/{e}' },
        { name: 'EmbedBandit', movie: 'https://embedbandit.com/embed/movie/{id}', tv: 'https://embedbandit.com/embed/tv/{id}/{s}/{e}' },
        { name: 'VidZen', movie: 'https://vidzen.fun/movie/{id}', tv: 'https://vidzen.fun/tv/{id}/{s}/{e}' }
    ];

    // Dizide sezon/bölüm yoksa 1. sezon 1. bölüm açılır.
    function getExtraServers(imdbId, isTV, season, episode) {
        if (!/^tt\d+$/.test(imdbId)) return [];
        // getEmbedServers ile aynı kural: sezon ve bölüm birlikte verilir ya da hiç verilmez.
        if (isTV && ((season === undefined || season === null || season === '') !== (episode === undefined || episode === null || episode === ''))) return [];
        const s = isTV ? String(season || 1) : '', e = isTV ? String(episode || 1) : '';
        if (isTV && (!/^[1-9]\d*$/.test(s) || !/^[1-9]\d*$/.test(e))) return [];
        return EXTRA_SERVERS.map(server => ({
            name: server.name,
            url: (isTV ? server.tv : server.movie).replace('{id}', imdbId).replace('{s}', s).replace('{e}', e)
        }));
    }

    function getPageServers(imdbId, isTV) {
        if (isTV) {
            const season = document.querySelector('.vidsrc-season-select') || document.querySelector('.vidsrc-season-select-secondary');
            const episode = document.querySelector('.vidsrc-episode-select') || document.querySelector('.vidsrc-episode-select-secondary');
            if (season && episode && /^[1-9]\d*$/.test(season.value) && /^[1-9]\d*$/.test(episode.value))
                return getServers(imdbId, true, season.value, episode.value);
        }
        return getServers(imdbId, isTV);
    }

    async function checkVideoAvailability(imdbId, isTV, elements) {
        // Cross-origin fetch failures do not establish video availability.
        // Let the user open/select a provider instead of disabling playback.
        const isReady = getServers(imdbId, isTV).length > 0;

        elements.forEach(el => {
            if (!el) return;
            const statusTag = el.querySelector('.vidsrc-status-tag');
            if (isReady) {
                el.disabled = false;
                if (statusTag) {
                    statusTag.remove();
                }
            } else {
                el.disabled = true;
                if (el.classList.contains('vidsrc-split-main')) {
                    const svg = el.querySelector('svg');
                    el.innerHTML = '';
                    if (svg) el.appendChild(svg);
                    el.innerHTML += ` Not Available Yet <span class="vidsrc-info-tooltip" title="Not available yet">i</span>`;
                }
                if (statusTag) {
                    statusTag.className = 'vidsrc-status-tag vidsrc-status-notready';
                    statusTag.innerText = 'Pending';
                }
            }
        });
        
        return Promise.resolve(isReady);
    }

    function addButton() {
        const titleContainer = document.querySelector('h1[data-testid="hero__pageTitle"]');
        const isTV = document.querySelector('a[href*="/episodes"]') || document.body.innerText.includes('TV Series') || document.body.innerText.includes('TV Mini Series');
        const btnText = isTV ? 'Play TV Show' : 'Play Movie';

        if (titleContainer && !document.getElementById('vidsrc-play-split-btn-main')) {
            const imdbIdMatch = window.location.pathname.match(/tt\d+/);
            if (imdbIdMatch) {
                const imdbId = imdbIdMatch[0];
                
                const splitBtnWrapper = document.createElement('div');
                splitBtnWrapper.id = 'vidsrc-play-split-btn-main';
                splitBtnWrapper.className = 'vidsrc-split-button';

                const mainBtn = document.createElement('button');
                mainBtn.className = 'vidsrc-split-main';
                mainBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    ${btnText}
                `;
                mainBtn.disabled = true;
                mainBtn.innerHTML += '<span class="vidsrc-status-tag vidsrc-status-loading">Checking...</span>';
                mainBtn.onclick = (e) => handlePlay(e, imdbId);

                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'vidsrc-split-toggle';
                toggleBtn.disabled = true;
                toggleBtn.innerHTML = `
                    <span class="vidsrc-toggle-or">Servers</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.88 9.29L12 13.17 8.12 9.29a.996.996 0 1 0-1.41 1.41l4.59 4.59c.39.39 1.02.39 1.41 0l4.59-4.59a.996.996 0 0 0 0-1.41c-.39-.38-1.03-.39-1.42 0z"></path>
                    </svg>
                `;

                const menu = document.createElement('div');
                menu.className = 'vidsrc-split-menu';
                
                const servers = getServers(imdbId, isTV);

                servers.forEach(server => {
                    const item = document.createElement('div');
                    item.className = 'vidsrc-menu-item';
                    item.innerText = server.name;
                    item.onclick = (e) => {
                        e.stopPropagation();
                        const current = getPageServers(imdbId, isTV);
                        const index = servers.indexOf(server);
                        if (current[index]) showModal(current[index].url, current, { explicit: true });
                        menu.classList.remove('show');
                    };
                    menu.appendChild(item);
                });

                toggleBtn.onclick = (e) => {
                    e.stopPropagation();
                    menu.classList.toggle('show');
                };

                splitBtnWrapper.appendChild(mainBtn);
                splitBtnWrapper.appendChild(toggleBtn);
                splitBtnWrapper.appendChild(menu);
                titleContainer.parentElement.prepend(splitBtnWrapper);

                checkVideoAvailability(imdbId, isTV, [mainBtn, toggleBtn]).then(() => {
                    if (isTV) {
                        const epWrapper = document.createElement('div');
                        epWrapper.className = 'vidsrc-ep-wrapper';
                        
                        const epSelector = document.createElement('div');
                        epSelector.className = 'vidsrc-ep-selector-inline';
                        epSelector.innerHTML = `
                            <div class="vidsrc-ep-row">
                                <select class="vidsrc-season-select">
                                    <option value="1">Season 1</option>
                                </select>
                                <select class="vidsrc-episode-select">
                                    <option value="1">Episode 1</option>
                                </select>
                            </div>
                            <button class="vidsrc-go-btn">Watch Episode</button>
                        `;
                        
                        const seasonSelect = epSelector.querySelector('.vidsrc-season-select');
                        const episodeSelect = epSelector.querySelector('.vidsrc-episode-select');
                        const goBtn = epSelector.querySelector('.vidsrc-go-btn');

                        async function updateEpisodeList() {
                            try {
                                const response = await fetch(`https://www.imdb.com/title/${imdbId}/episodes/`);
                                const html = await response.text();
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(html, 'text/html');
                                
                                const seasonNodes = Array.from(doc.querySelectorAll('[data-testid="tab-season-entry"], a[href*="episodes/?season="]'));
                                const seasonNums = seasonNodes
                                    .map(el => {
                                        const match = el.href?.match(/season=(\d+)/) || el.textContent?.match(/(\d+)/);
                                        return match ? parseInt(match[1] || match[0]) : null;
                                    })
                                    .filter(n => n !== null && !isNaN(n));
                                
                                const maxSeason = seasonNums.length > 0 ? Math.max(...seasonNums) : 1;
                                
                                seasonSelect.innerHTML = '';
                                for(let i = 1; i <= maxSeason; i++) {
                                    const opt = document.createElement('option');
                                    opt.value = i;
                                    opt.textContent = `Season ${i}`;
                                    seasonSelect.appendChild(opt);
                                }

                                async function loadEpisodes(season) {
                                    episodeSelect.innerHTML = '<option>Loading...</option>';
                                    try {
                                        const res = await fetch(`https://www.imdb.com/title/${imdbId}/episodes/?season=${season}`);
                                        const text = await res.text();
                                        const epDoc = new DOMParser().parseFromString(text, 'text/html');
                                        
                                        const epTitles = Array.from(epDoc.querySelectorAll('.ipc-title__text, .episode-item-wrapper h4, article h4'))
                                            .map(el => el.textContent.trim())
                                            .filter(txt => {
                                                const match = txt.match(/S\d+\s*\.\s*E(\d+)/i);
                                                return match && match[1] !== '0';
                                            })
                                            .filter(txt => {
                                                const match = txt.match(/E(\d+)/i);
                                                return match && match[1] !== '0';
                                            });

                                        const uniqueEpisodes = [...new Set(epTitles.map(t => {
                                            const match = t.match(/E(\d+)/i);
                                            return match ? parseInt(match[1]) : null;
                                        }).filter(n => n !== null && !isNaN(n)))].sort((a,b) => a-b);
                                        
                                        episodeSelect.innerHTML = '';
                                        if (uniqueEpisodes.length > 0) {
                                            uniqueEpisodes.forEach(num => {
                                                const opt = document.createElement('option');
                                                opt.value = num;
                                                opt.textContent = `Episode ${num}`;
                                                episodeSelect.appendChild(opt);
                                            });
                                        } else {
                                            const epCards = epDoc.querySelectorAll('.episode-item-wrapper, article.sc-80cc9a2f-1');
                                            const count = epCards.length > 0 ? epCards.length : 10;
                                            for(let i = 1; i <= count; i++) {
                                                const opt = document.createElement('option');
                                                opt.value = i;
                                                opt.textContent = `Episode ${i}`;
                                                episodeSelect.appendChild(opt);
                                            }
                                        }
                                    } catch (err) {
                                        console.error('Failed to load episodes:', err);
                                        episodeSelect.innerHTML = '<option value="1">Episode 1</option>';
                                    }
                                }

                                seasonSelect.onchange = () => loadEpisodes(seasonSelect.value);
                                await loadEpisodes(1);
                            } catch (err) {
                                console.error('Failed to update lists:', err);
                            }
                        }

                        updateEpisodeList();

                        goBtn.onclick = (e) => {
                            e.stopPropagation();
                            const s = seasonSelect.value;
                            const ep = episodeSelect.value;
                            if (!ep) return;
                            const servers = getServers(imdbId, true, s, ep);
                            if (servers.length) showModal(servers[0].url, servers);
                        };

                        epWrapper.appendChild(epSelector);
                        splitBtnWrapper.after(epWrapper);
                    }
                });
            }
        }

        const watchlistBtn = document.querySelector('[data-testid="tm-box-wl-button"]');
        if (watchlistBtn && !document.getElementById('vidsrc-play-split-btn')) {
            const container = watchlistBtn.closest('.sc-dcb1530e-3.hgRMPJ') || watchlistBtn.parentElement.parentElement;
            const imdbIdMatch = window.location.pathname.match(/tt\d+/);
            if (imdbIdMatch) {
                const imdbId = imdbIdMatch[0];
                
                const splitBtnWrapper = document.createElement('div');
                splitBtnWrapper.id = 'vidsrc-play-split-btn';
                splitBtnWrapper.className = 'vidsrc-split-button vidsrc-split-secondary';

                const mainBtn = document.createElement('button');
                mainBtn.className = 'vidsrc-split-main';
                mainBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    ${btnText}
                `;
                mainBtn.disabled = true;
                mainBtn.innerHTML += '<span class="vidsrc-status-tag vidsrc-status-loading">Checking...</span>';
                mainBtn.onclick = (e) => handlePlay(e, imdbId);

                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'vidsrc-split-toggle vidsrc-toggle-icon-only';
                toggleBtn.disabled = true;
                toggleBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.88 9.29L12 13.17 8.12 9.29a.996.996 0 1 0-1.41 1.41l4.59 4.59c.39.39 1.02.39 1.41 0l4.59-4.59a.996.996 0 0 0 0-1.41c-.39-.38-1.03-.39-1.42 0z"></path>
                    </svg>
                `;

                const menu = document.createElement('div');
                menu.className = 'vidsrc-split-menu';
                
                const servers = getServers(imdbId, isTV);

                servers.forEach(server => {
                    const item = document.createElement('div');
                    item.className = 'vidsrc-menu-item';
                    item.innerText = server.name;
                    item.onclick = (e) => {
                        e.stopPropagation();
                        const current = getPageServers(imdbId, isTV);
                        const index = servers.indexOf(server);
                        if (current[index]) showModal(current[index].url, current, { explicit: true });
                        menu.classList.remove('show');
                    };
                    menu.appendChild(item);
                });

                toggleBtn.onclick = (e) => {
                    e.stopPropagation();
                    menu.classList.toggle('show');
                };

                splitBtnWrapper.appendChild(mainBtn);
                splitBtnWrapper.appendChild(toggleBtn);
                splitBtnWrapper.appendChild(menu);
                container.prepend(splitBtnWrapper);

                checkVideoAvailability(imdbId, isTV, [mainBtn, toggleBtn]).then(() => {
                    if (isTV) {
                        const epWrapperSecondary = document.createElement('div');
                        epWrapperSecondary.className = 'vidsrc-ep-wrapper';

                        const epSelector = document.createElement('div');
                        epSelector.className = 'vidsrc-ep-selector-inline';
                        epSelector.innerHTML = `
                            <div class="vidsrc-ep-row">
                                <select class="vidsrc-season-select-secondary">
                                    <option value="1">Season 1</option>
                                </select>
                                <select class="vidsrc-episode-select-secondary">
                                    <option value="1">Episode 1</option>
                                </select>
                            </div>
                            <button class="vidsrc-go-btn-secondary">Watch Episode</button>
                        `;
                        
                        const seasonSelect = epSelector.querySelector('.vidsrc-season-select-secondary');
                        const episodeSelect = epSelector.querySelector('.vidsrc-episode-select-secondary');
                        const goBtn = epSelector.querySelector('.vidsrc-go-btn-secondary');

                        async function updateEpisodeListSecondary() {
                            try {
                                const response = await fetch(`https://www.imdb.com/title/${imdbId}/episodes/`);
                                const html = await response.text();
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(html, 'text/html');
                                
                                const seasonNodes = Array.from(doc.querySelectorAll('[data-testid="tab-season-entry"], a[href*="episodes/?season="]'));
                                const seasonNums = seasonNodes
                                    .map(el => {
                                        const match = el.href?.match(/season=(\d+)/) || el.textContent?.match(/(\d+)/);
                                        return match ? parseInt(match[1] || match[0]) : null;
                                    })
                                    .filter(n => n !== null && !isNaN(n));
                                
                                const maxSeason = seasonNums.length > 0 ? Math.max(...seasonNums) : 1;
                                
                                seasonSelect.innerHTML = '';
                                for(let i = 1; i <= maxSeason; i++) {
                                    const opt = document.createElement('option');
                                    opt.value = i;
                                    opt.textContent = `Season ${i}`;
                                    seasonSelect.appendChild(opt);
                                }

                                async function loadEpisodesSecondary(season) {
                                    episodeSelect.innerHTML = '<option>Loading...</option>';
                                    try {
                                        const res = await fetch(`https://www.imdb.com/title/${imdbId}/episodes/?season=${season}`);
                                        const text = await res.text();
                                        const epDoc = new DOMParser().parseFromString(text, 'text/html');
                                        
                                        const epTitles = Array.from(epDoc.querySelectorAll('.ipc-title__text, .episode-item-wrapper h4, article h4'))
                                            .map(el => el.textContent.trim())
                                            .filter(txt => {
                                                const match = txt.match(/S\d+\s*\.\s*E(\d+)/i);
                                                return match && match[1] !== '0';
                                            })
                                            .filter(txt => {
                                                const match = txt.match(/E(\d+)/i);
                                                return match && match[1] !== '0';
                                            });

                                        const uniqueEpisodes = [...new Set(epTitles.map(t => {
                                            const match = t.match(/E(\d+)/i);
                                            return match ? parseInt(match[1]) : null;
                                        }).filter(n => n !== null && !isNaN(n)))].sort((a,b) => a-b);
                                        
                                        episodeSelect.innerHTML = '';
                                        if (uniqueEpisodes.length > 0) {
                                            uniqueEpisodes.forEach(num => {
                                                const opt = document.createElement('option');
                                                opt.value = num;
                                                opt.textContent = `Episode ${num}`;
                                                episodeSelect.appendChild(opt);
                                            });
                                        } else {
                                            const epCards = epDoc.querySelectorAll('.episode-item-wrapper, article.sc-80cc9a2f-1');
                                            const count = epCards.length > 0 ? epCards.length : 10;
                                            for(let i = 1; i <= count; i++) {
                                                const opt = document.createElement('option');
                                                opt.value = i;
                                                opt.textContent = `Episode ${i}`;
                                                episodeSelect.appendChild(opt);
                                            }
                                        }
                                    } catch (err) {
                                        console.error('Failed to load episodes secondary:', err);
                                        episodeSelect.innerHTML = '<option value="1">Episode 1</option>';
                                    }
                                }

                                seasonSelect.onchange = () => loadEpisodesSecondary(seasonSelect.value);
                                await loadEpisodesSecondary(1);
                            } catch (err) {
                                console.error('Failed to update lists secondary:', err);
                            }
                        }

                        updateEpisodeListSecondary();

                        goBtn.onclick = (e) => {
                            e.stopPropagation();
                            const s = seasonSelect.value;
                            const ep = episodeSelect.value;
                            if (!ep) return;
                            const servers = getServers(imdbId, true, s, ep);
                            if (servers.length) showModal(servers[0].url, servers);
                        };

                        epWrapperSecondary.appendChild(epSelector);
                        splitBtnWrapper.after(epWrapperSecondary);
                    }
                });

                document.addEventListener('click', () => {
                    menu.classList.remove('show');
                });
            }
        }
    }

    function handlePlay(e, imdbId) {
        e.preventDefault();
        e.stopPropagation();
        
        const isTV = document.querySelector('a[href*="/episodes"]') || document.body.innerText.includes('TV Series') || document.body.innerText.includes('TV Mini Series');
        
        const servers = getPageServers(imdbId, isTV);
        if (servers.length) showModal(servers[0].url, servers);
    }

    // Dizi sezon/bölüm listeleri: imdbId -> { seasons: number[]|null, eps: { [sezon]: number[] }, source }
    // Önce VidSrc'nin TV_INFO mesajı (mevcut bölümler), yoksa IMDb bölüm sayfası kullanılır.
    const tvEpisodeCache = new Map();
    function tvInfo(imdbId) {
        let info = tvEpisodeCache.get(imdbId);
        if (!info) { info = { seasons: null, eps: {}, source: null }; tvEpisodeCache.set(imdbId, info); }
        return info;
    }
    async function imdbSeasonList(imdbId, signal) {
        const res = await fetch(`https://www.imdb.com/title/${imdbId}/episodes/`, { credentials: 'include', ...(signal ? { signal } : {}) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        const nums = Array.from(doc.querySelectorAll('[data-testid="tab-season-entry"], a[href*="episodes/?season="]'))
            .map(a => { const m = (a.getAttribute('href') || '').match(/season=(\d+)/) || (a.textContent || '').match(/^\s*(\d+)\s*$/); return m ? parseInt(m[1], 10) : NaN; })
            .filter(n => n > 0 && n < 200);
        return [...new Set(nums)].sort((a, b) => a - b);
    }
    async function imdbEpisodeList(imdbId, season, signal) {
        const res = await fetch(`https://www.imdb.com/title/${imdbId}/episodes/?season=${season}`, { credentials: 'include', ...(signal ? { signal } : {}) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        const nums = Array.from(doc.querySelectorAll('.ipc-title__text, .episode-item-wrapper h4, article h4'))
            .map(n => { const m = (n.textContent || '').match(/S(\d+)\s*\.\s*E(\d+)/i); return m && Number(m[1]) === Number(season) ? parseInt(m[2], 10) : NaN; })
            .filter(n => n > 0 && n <= MAX_EPISODE);
        const list = [...new Set(nums)].sort((a, b) => a - b);
        // Sayfa yalnızca ilk 50 bölümü gösterir; daha fazlası olabilir, listeyi açık uçlu bırak.
        if (list.length >= 50) return rangeTo(list[list.length - 1] + 50);
        return list;
    }
    function rangeTo(n) { return Array.from({ length: Math.min(Math.max(0, n | 0), 5000) }, (_, i) => i + 1); }
    const MAX_SEASON = 200, MAX_EPISODE = 5000;
    function validSE(season, episode) {
        return Number.isInteger(season) && Number.isInteger(episode)
            && season >= 1 && season <= MAX_SEASON && episode >= 1 && episode <= MAX_EPISODE;
    }

    // Sağlayıcının "Media not found" bildirdiği adresler (sayfa açık kaldıkça hatırlanır).
    const unavailableSources = new Set();
    const VIDSRC_ORIGIN = 'https://vidsrc.sh';

    function showModal(url, servers = [], opts = {}) {
        // Aynı anda tek oynatıcı (klavyeyle tekrar tetiklenince ikinci overlay açılmasın).
        if (document.querySelector('.vidsrc-modal-overlay')) return;
        const explicit = !!opts.explicit;
        const sources = servers.length ? servers : [{ name: 'Oynatıcı', url }];
        let current = Math.max(0, sources.findIndex(server => server.url === url));
        const hdfcIndex = sources.findIndex(server => server.external);
        // Daha önce bulunamayan kaynağı atla; HDFC her zaman son seçenektir.
        if (!explicit && unavailableSources.has(sources[current].url)) {
            const available = sources.findIndex(server => !server.external && !unavailableSources.has(server.url));
            if (available >= 0) current = available;
            else if (hdfcIndex >= 0) current = hdfcIndex;
        }
        let attempted = new Set();
        let timeoutId;
        let closed = false;
        let generation = 0;
        const overlay = document.createElement('div');
        overlay.className = 'vidsrc-modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Video oynatıcı');
        
        const content = document.createElement('div');
        content.className = 'vidsrc-modal-content';
        
        const toolbar = document.createElement('div');
        toolbar.className = 'vidsrc-player-toolbar';
        const label = document.createElement('label');
        label.className = 'vidsrc-source-label';
        label.textContent = 'Kaynak';
        const select = document.createElement('select');
        select.className = 'vidsrc-source-select';
        select.setAttribute('aria-label', 'Video kaynağı');
        sources.forEach((server, index) => {
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = server.name;
            select.appendChild(option);
        });
        label.appendChild(select);
        const next = document.createElement('button');
        next.className = 'vidsrc-next-source';
        next.type = 'button';
        next.textContent = 'Yedek kaynağa geç';
        next.disabled = sources.length < 2;
        const status = document.createElement('span');
        status.className = 'vidsrc-source-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        const close = document.createElement('button');
        close.className = 'vidsrc-modal-close';
        close.type = 'button';
        close.textContent = '×';
        close.setAttribute('aria-label', 'Oynatıcıyı kapat');

        const extPanel = document.createElement('div');
        extPanel.className = 'vidsrc-external-panel';
        extPanel.hidden = true;

        const iframe = document.createElement('iframe');
        iframe.className = 'vidsrc-iframe';
        iframe.allowFullscreen = true;
        iframe.allow = "autoplay; encrypted-media";

        toolbar.appendChild(label);
        toolbar.appendChild(next);
        toolbar.appendChild(close);
        toolbar.appendChild(status);
        content.appendChild(toolbar);
        content.appendChild(extPanel);
        content.appendChild(iframe);
        overlay.appendChild(content);
        document.body.appendChild(overlay);

        // ---- Dizi: sezon/bölüm seçici (kaynak listesindeki HDFC girdisi dizi bilgisini taşır) ----
        const tvMeta = (sources.find(server => server.external) || {}).external;
        const tv = tvMeta && tvMeta.isTV && /^tt\d+$/.test(tvMeta.imdbId) ? {
            imdbId: tvMeta.imdbId,
            season: Number(tvMeta.season) || null,
            episode: Number(tvMeta.episode) || null
        } : null;
        let vidsrcLive = false;   // VidSrc TV_INFO gönderdiyse TV_SET ile yenilemeden bölüm değişir
        let pendingSet = null, pendingSetTimer = 0;
        let seasonSel = null, episodeSel = null, nextEpBtn = null;
        if (tv) {
            const group = document.createElement('div');
            group.className = 'vidsrc-episode-group';
            const mk = (text, cls) => {
                const l = document.createElement('label');
                l.className = 'vidsrc-source-label';
                l.textContent = text;
                const sel = document.createElement('select');
                sel.className = 'vidsrc-source-select ' + cls;
                sel.setAttribute('aria-label', text);
                l.appendChild(sel);
                group.appendChild(l);
                return sel;
            };
            seasonSel = mk('Sezon', 'vidsrc-season-pick');
            episodeSel = mk('Bölüm', 'vidsrc-episode-pick');
            nextEpBtn = document.createElement('button');
            nextEpBtn.type = 'button';
            nextEpBtn.className = 'vidsrc-ep-next';
            nextEpBtn.textContent = 'Sonraki bölüm ›';
            group.appendChild(nextEpBtn);
            toolbar.insertBefore(group, next);
        }
        function fillPick(sel, values, cur, prefix) {
            sel.textContent = '';
            values.forEach(v => {
                const o = document.createElement('option');
                o.value = String(v);
                o.textContent = prefix + v;
                if (v === cur) o.selected = true;
                sel.appendChild(o);
            });
        }
        function seasonValues() {
            const info = tvInfo(tv.imdbId);
            const s = tv.season || 1;
            const list = info.seasons && info.seasons.length ? info.seasons.slice()
                : opts.knownEpisodesOnly ? [s] : rangeTo(Math.max(s, 20));
            if (!list.includes(s)) list.push(s);
            return list.sort((a, b) => a - b);
        }
        function episodeValues(season) {
            const info = tvInfo(tv.imdbId);
            const e = tv.episode || 1;
            const list = info.eps[season] && info.eps[season].length ? info.eps[season].slice()
                : opts.knownEpisodesOnly ? [e] : rangeTo(Math.max(e, 30));
            if (!list.includes(e)) list.push(e);
            return list.sort((a, b) => a - b);
        }
        function nextEpisode() {
            const s = tv.season || 1, e = tv.episode || 1;
            const info = tvInfo(tv.imdbId);
            const eps = info.eps[s];
            if (eps && eps.length) {
                const later = eps.filter(n => n > e);
                if (later.length) return { season: s, episode: later[0] };
                const ns = (info.seasons || []).filter(n => n > s)[0];
                if (ns) return { season: ns, episode: (info.eps[ns] && info.eps[ns][0]) || 1 };
                return null;
            }
            return opts.knownEpisodesOnly ? null : { season: s, episode: e + 1 };
        }
        function renderEpisodeUi() {
            if (!tv || closed) return;
            const s = tv.season || 1;
            fillPick(seasonSel, seasonValues(), s, 'S');
            fillPick(episodeSel, episodeValues(s), tv.episode || 1, 'B');
            nextEpBtn.disabled = !nextEpisode();
        }
        async function ensureEpisodes(season) {
            if (!tv) return;
            const token = generation;
            const info = tvInfo(tv.imdbId);
            const active = () => !closed && token === generation && info.source !== 'vidsrc';
            if (info.source === 'vidsrc') return;
            try {
                if (info.source === 'tvmaze') throw new Error('Yedek listeyi yenile');
                if (!info.seasons) {
                    const list = await imdbSeasonList(tv.imdbId, opts.getEpisodeFallback ? AbortSignal.timeout(8000) : undefined);
                    if (!active()) return;
                    if (list.length && !info.seasons) { info.seasons = list; info.source = info.source || 'imdb'; }
                    if (!list.length && opts.getEpisodeFallback) throw new Error('IMDb sezon listesi boş');
                }
                if (!info.eps[season]) {
                    const eps = await imdbEpisodeList(tv.imdbId, season, opts.getEpisodeFallback ? AbortSignal.timeout(8000) : undefined);
                    if (!active()) return;
                    if (eps.length && !info.eps[season]) info.eps[season] = eps;
                }
            } catch (err) { /* Arşivde IMDb alınamazsa aşağıdaki yedek denenir. */ }
            if (!active()) return;
            if (typeof opts.getEpisodeFallback === 'function' &&
                (info.source === 'tvmaze' || !info.seasons || !info.eps[season])) {
                try {
                    const data = await opts.getEpisodeFallback(tv.imdbId);
                    if (!active()) return;
                    const eps = {};
                    for (const key of Object.keys(data && data.eps || {})) {
                        const sn = Number(key);
                        if (!validSE(sn, 1) || !Array.isArray(data.eps[key])) continue;
                        const list = [...new Set(data.eps[key].filter(ep => validSE(sn, ep)))].sort((a, b) => a - b);
                        if (list.length) eps[sn] = list;
                    }
                    const seasons = Object.keys(eps).map(Number).sort((a, b) => a - b);
                    if (seasons.length) {
                        // Farklı numaralandırmaları birleştirme: yedeğin bütün listesini kullan.
                        info.seasons = seasons;
                        info.eps = eps;
                        info.source = 'tvmaze';
                    }
                } catch (err) { /* Yedek de yoksa mevcut seçim korunur. */ }
            }
            renderEpisodeUi();
        }
        function applyEpisode(season, episode, fromPlayer) {
            if (!tv || !validSE(season, episode)) return;
            if (tv.season === season && tv.episode === episode) {
                if (fromPlayer && pendingSet && pendingSet.season === season && pendingSet.episode === episode) confirmSet();
                renderEpisodeUi();
                return;
            }
            // TV_SET beklenirken oynatıcı henüz eski bölümü bildirebilir: seçimi geri alma,
            // onay ya da zaman aşımı (yeniden yükleme) beklensin.
            if (fromPlayer && pendingSet) return;
            tv.season = season;
            tv.episode = episode;
            // Tüm kaynak adreslerini yeni bölümle yenile (sıra ve sayı aynı kalır).
            const fresh = getServers(tv.imdbId, true, String(season), String(episode));
            if (fresh.length === sources.length) {
                fresh.forEach((server, i) => {
                    sources[i] = server;
                    if (select.options[i]) select.options[i].textContent = server.name;
                });
            }
            renderEpisodeUi();
            if (fromPlayer) return;   // oynatıcı zaten bu bölümde
            clearPendingSet();
            const src = sources[current];
            if (vidsrcLive && src && !src.external && src.url.startsWith(VIDSRC_ORIGIN + '/') && iframe.contentWindow) {
                attempted = new Set([current]);
                status.textContent = `VidSrc: S${season} B${episode} açılıyor…`;
                const token = generation;
                pendingSet = { season, episode };
                pendingSetTimer = setTimeout(() => {
                    // VidSrc 4 sn içinde onaylamadı: yeni bölüm adresiyle yeniden yükle.
                    pendingSet = null;
                    if (!closed && token === generation) loadSource(current, true);
                }, 4000);
                iframe.contentWindow.postMessage({ type: 'TV_SET', season, episode }, VIDSRC_ORIGIN);
            } else {
                loadSource(current, true);
            }
        }
        function clearPendingSet() {
            clearTimeout(pendingSetTimer);
            pendingSet = null;
        }
        function confirmSet() {
            const p = pendingSet;
            clearPendingSet();
            if (p) status.textContent = `VidSrc: S${p.season} B${p.episode} açıldı.`;
        }
        if (tv) {
            seasonSel.onchange = () => {
                const s = Number(seasonSel.value);
                const info = tvInfo(tv.imdbId);
                const first = info.eps[s] && info.eps[s].length ? info.eps[s][0] : 1;
                applyEpisode(s, first, false);
            };
            episodeSel.onchange = () => applyEpisode(tv.season || 1, Number(episodeSel.value), false);
            nextEpBtn.onclick = () => { const n = nextEpisode(); if (n) applyEpisode(n.season, n.episode, false); };
            renderEpisodeUi();
        }

        function loadSource(index, manual = false, autoOpen = manual) {
            if (closed) return;
            clearTimeout(timeoutId);
            if (manual) attempted = new Set();
            current = index;
            attempted.add(index);
            select.value = String(index);
            status.textContent = `${sources[index].name} yükleniyor…`;
            const token = ++generation;
            if (tv) ensureEpisodes(tv.season || 1);
            vidsrcLive = false;
            clearPendingSet();
            if (sources[index].external) {
                loadExternal(sources[index], token, autoOpen, manual);
                return;
            }
            extPanel.hidden = true;
            iframe.hidden = false;
            iframe.onload = () => {
                if (closed || token !== generation) return;
                clearTimeout(timeoutId);
                status.textContent = `${sources[index].name} sayfası açıldı. Oynatılmıyorsa yedek kaynağa geçebilirsin.`;
            };
            iframe.onerror = () => {
                if (!closed && token === generation) automaticFallback();
            };
            timeoutId = setTimeout(() => {
                if (!closed && token === generation) automaticFallback();
            }, 15000);
            iframe.src = sources[index].url;
        }
        // Oynatıcı alanının görünüm alanındaki yeri (CSS piksel). Ekran koordinatına
        // çevirme arka planda, sekmenin yakınlaştırma oranıyla yapılır.
        function playerView() {
            const r = content.getBoundingClientRect();
            return {
                rect: { left: r.left, top: r.top, width: r.width, height: r.height },
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight
            };
        }
        function openInWindow(pageUrl) {
            const token = generation;
            status.textContent = 'HDFilmCehennemi oynatıcı penceresinde açılıyor…';
            try {
                chrome.runtime.sendMessage({ type: 'hdfc-open', url: pageUrl, view: playerView() }, (res) => {
                    if (chrome.runtime.lastError) { /* erken dönüşte "unchecked lastError" uyarısını önler */ }
                    if (closed || token !== generation) return;
                    if (chrome.runtime.lastError || !res || !res.ok) {
                        const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : (res && res.error);
                        status.textContent = 'Pencere açılamadı: ' + (err || 'yanıt alınamadı') + '. Bağlantıyı yeni sekmede açabilirsin.';
                        return;
                    }
                    status.textContent = 'HDFilmCehennemi oynatıcı penceresinde açıldı.';
                });
            } catch (err) {
                status.textContent = 'Pencere açılamadı: ' + String(err && err.message || err);
            }
        }
        function loadExternal(server, token, autoOpen, manual) {
            iframe.onload = null;
            iframe.onerror = null;
            iframe.src = 'about:blank';
            iframe.hidden = true;
            extPanel.hidden = false;
            extPanel.textContent = 'HDFilmCehennemi’de aranıyor…';
            const info = server.external;
            let done = false;
            const finish = (res) => {
                if (done || closed || token !== generation) return;
                done = true;
                extPanel.textContent = '';
                if (!res || !res.ok) {
                    status.textContent = 'HDFilmCehennemi: ' + ((res && res.error) || 'yanıt alınamadı');
                    extPanel.textContent = 'Bu içerik HDFilmCehennemi’de bulunamadı.';
                    // Otomatik gelindiyse denenmemiş kaynaklarla devam et.
                    if (!manual) automaticFallback();
                    return;
                }
                const text = document.createElement('p');
                text.textContent = res.exact
                    ? 'Bulundu. Site kendi oynatıcısını başka sayfalara gömdürmediği için video ayrı bir oynatıcı penceresinde açılır.'
                    : 'Dizi sayfası bulundu ama bu bölüm listede yok; dizi sayfası oynatıcı penceresinde açılır.';
                const openBtn = document.createElement('button');
                openBtn.type = 'button';
                openBtn.className = 'vidsrc-external-link';
                openBtn.textContent = 'Oynatıcı penceresinde aç';
                openBtn.onclick = () => openInWindow(res.url);
                const link = document.createElement('a');
                link.className = 'vidsrc-external-alt';
                link.href = res.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = 'ya da yeni sekmede aç ↗';
                extPanel.appendChild(text);
                extPanel.appendChild(openBtn);
                extPanel.appendChild(link);
                status.textContent = 'HDFilmCehennemi bağlantısı hazır.';
                // Dizide yalnızca dizi sayfasının bulunması bölümün bulunduğunu göstermez.
                if (autoOpen && (!info.isTV || res.exact)) openInWindow(res.url);
            };
            timeoutId = setTimeout(() => finish({ ok: false, error: 'zaman aşımı' }), 20000);
            try {
                chrome.runtime.sendMessage({ type: 'hdfc-resolve', ...info }, (res) => {
                    if (chrome.runtime.lastError) finish({ ok: false, error: chrome.runtime.lastError.message });
                    else finish(res);
                });
            } catch (err) {
                finish({ ok: false, error: String(err && err.message || err) });
            }
        }
        function automaticFallback() {
            clearTimeout(timeoutId);
            for (let step = 1; step < sources.length; step++) {
                const index = (current + step) % sources.length;
                if (sources[index].external || attempted.has(index) || unavailableSources.has(sources[index].url)) continue;
                loadSource(index);
                return;
            }
            if (hdfcIndex >= 0 && !attempted.has(hdfcIndex)) {
                loadSource(hdfcIndex, false, true);
                return;
            }
            status.textContent = 'Kaynaklar yüklenemedi. Kaynak seçerek yeniden deneyebilirsin.';
        }
        select.onchange = () => {
            const index = Number(select.value);
            if (Number.isInteger(index) && index >= 0 && index < sources.length) loadSource(index, true);
        };
        next.onclick = () => loadSource((current + 1) % sources.length, true);
        // VidSrc, iç oynatıcının mesajlarını (MEDIA_NOT_FOUND dahil) gömen sayfaya iletir.
        function onPlayerMessage(e) {
            if (closed || e.source !== iframe.contentWindow) return;
            const d = e.data;
            if (!d || typeof d !== 'object') return;
            const src = sources[current];
            if (!src || src.external) return;
            // Yalnızca açık iframe'in kendi kökeninden gelen hata kabul edilir.
            if (e.origin !== new URL(src.url).origin) return;
            if (d.type === 'MEDIA_NOT_FOUND') {
                unavailableSources.add(src.url);
                status.textContent = `${src.name}: içerik bulunamadı, sıradaki kaynak deneniyor…`;
                automaticFallback();
                return;
            }
            // VidSrc sezon protokolü diğer sağlayıcılara uygulanmaz.
            if (e.origin !== VIDSRC_ORIGIN) return;
            if (d.type === 'PLAYER_TITLE') {
                clearTimeout(timeoutId);
            } else if (d.type === 'TV_INFO') {
                clearTimeout(timeoutId);
                vidsrcLive = true;
                if (tv && d.eps && typeof d.eps === 'object') {
                    const eps = {};
                    for (const k of Object.keys(d.eps)) {
                        const sn = Number(k);
                        if (!Number.isInteger(sn) || sn < 1 || sn > MAX_SEASON || !Array.isArray(d.eps[k])) continue;
                        const list = [...new Set(d.eps[k].map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= MAX_EPISODE))].sort((a, b) => a - b);
                        if (list.length) eps[sn] = list;
                    }
                    const seasons = Object.keys(eps).map(Number).sort((a, b) => a - b);
                    if (seasons.length) {
                        const info = tvInfo(tv.imdbId);
                        info.seasons = seasons;
                        info.eps = eps;
                        info.source = 'vidsrc';
                    }
                }
                const ps = Number(d.season), pe = Number(d.episode);
                if (tv && validSE(ps, pe)) applyEpisode(ps, pe, true);
                else renderEpisodeUi();
            } else if (d.type === 'TV_STATE') {
                const ps = Number(d.season), pe = Number(d.episode);
                if (tv && validSE(ps, pe)) applyEpisode(ps, pe, true);
            }
        }
        window.addEventListener('message', onPlayerMessage);
        function cleanup() {
            if (closed) return;
            closed = true;
            clearTimeout(timeoutId);
            iframe.onload = null;
            iframe.onerror = null;
            iframe.src = 'about:blank';
            window.removeEventListener('message', onPlayerMessage);
            document.removeEventListener('keydown', onKey, true);
            clearPendingSet();
            document.documentElement.style.overflow = prevOverflow;
            document.body.removeChild(overlay);
            if (prevFocus && typeof prevFocus.focus === 'function') { try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* yok */ } }
        }
        const prevOverflow = document.documentElement.style.overflow;
        const prevFocus = document.activeElement;
        document.documentElement.style.overflow = 'hidden';
        function onKey(e) {
            if (e.key === 'Escape' && !closed) { e.stopPropagation(); cleanup(); }
        }
        document.addEventListener('keydown', onKey, true);
        close.onclick = cleanup;
        overlay.onclick = e => { if (e.target === overlay) cleanup(); };
        loadSource(current, explicit, explicit || current === hdfcIndex);
        try { close.focus({ preventScroll: true }); } catch (e) { /* yok */ }
    }

    // Eklentinin kendi arşiv sayfası (app.html) aynı oynatıcıyı kullanır.
    window.IMDbPlayer = { getServers, showModal };

    // IMDb düğmeleri yalnızca imdb.com sayfalarında eklenir.
    if (!/(^|\.)imdb\.com$/.test(location.hostname)) return;

    const observer = new MutationObserver(() => {
        addButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    addButton();
})();
