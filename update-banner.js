// IMDb sayfalarında (ve arşiv sayfasında) güncelleme bildirimi.
// GitHub'daki sürüm daha yeniyse sağ altta "Güncellensin mi?" kartı gösterir.
// "Hayır" ve × kartı yalnızca o sayfa için gizler: F5'te ya da başka sayfaya geçince
// (IMDb'nin yeniden yüklemesiz sayfa geçişleri dahil) kart yeniden gelir.
(function () {
    'use strict';
    if (window.top !== window || window.__imdbArsivUpdateBanner) return;
    window.__imdbArsivUpdateBanner = true;

    let host = null;           // gösterilen kart
    let hiddenOnUrl = null;    // "Hayır" denilen sayfa adresi

    function send(msg) {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage(msg, (res) => {
                    if (chrome.runtime.lastError) resolve(null);
                    else resolve(res || null);
                });
            } catch (e) {
                // Eklenti yeniden yüklendiyse bu sekmedeki eski betik bağlantısını kaybeder.
                resolve(null);
            }
        });
    }

    function show(info) {
        host = document.createElement('div');
        // Oynatıcı overlay'inin (z-index 999999) altında kalır; açık videonun üstünü kapatmaz.
        host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:999990;';
        const root = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = `
            :host { all: initial; }
            .card {
                box-sizing: border-box;
                width: min(360px, calc(100vw - 32px));
                padding: 16px 16px 14px;
                border-radius: 10px;
                background: #1a1a1a;
                color: #f4f4f5;
                border: 1px solid #333;
                box-shadow: 0 14px 40px rgba(0,0,0,.55);
                font: 14px/1.45 "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                animation: in .25s ease-out;
            }
            @keyframes in { from { transform: translateY(12px); opacity: 0; } }
            @media (prefers-reduced-motion: reduce) { .card { animation: none; } }
            .top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
            .logo { background: #f5c518; color: #000; font-weight: 900; font-size: 13px; padding: 2px 6px; border-radius: 3px; }
            .title { font-weight: 700; font-size: 15px; flex: 1; }
            .x { all: unset; cursor: pointer; color: #a1a1aa; font-size: 20px; line-height: 1; padding: 2px 6px; border-radius: 4px; }
            .x:hover { color: #fff; background: #2a2a2a; }
            p { margin: 0 0 12px; color: #d4d4d8; }
            b { color: #fff; }
            .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
            button.primary, button.ghost {
                all: unset; cursor: pointer; box-sizing: border-box;
                min-height: 38px; padding: 0 16px; border-radius: 6px;
                display: inline-flex; align-items: center; font-weight: 700;
            }
            button.primary { background: #f5c518; color: #111; }
            button.primary:hover { background: #ffd43b; }
            button.ghost { background: #2c2c30; color: #f4f4f5; }
            button.ghost:hover { background: #3a3a40; }
            a { color: #a1a1aa; font-size: 12px; margin-left: auto; }
            a:hover { color: #fff; }
            :focus-visible { outline: 2px solid #f5c518; outline-offset: 2px; }
        `;
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-label', 'Eklenti güncellemesi');

        const top = document.createElement('div');
        top.className = 'top';
        const logo = document.createElement('span');
        logo.className = 'logo';
        logo.textContent = 'IMDb';
        const title = document.createElement('span');
        title.className = 'title';
        title.textContent = 'Güncelleme mevcut';
        const x = document.createElement('button');
        x.className = 'x';
        x.type = 'button';
        x.setAttribute('aria-label', 'Kapat');
        x.textContent = '×';
        top.append(logo, title, x);

        const p = document.createElement('p');
        const b1 = document.createElement('b');
        b1.textContent = info.latest;
        const b2 = document.createElement('b');
        b2.textContent = info.current;
        p.append('IMDb Arşiv eklentisinin ', b1, ' sürümü yayında (sende ', b2, '). Güncellensin mi?');

        const row = document.createElement('div');
        row.className = 'row';
        const yes = document.createElement('button');
        yes.className = 'primary';
        yes.type = 'button';
        yes.textContent = 'Evet, güncelle';
        const no = document.createElement('button');
        no.className = 'ghost';
        no.type = 'button';
        no.textContent = 'Hayır';
        const notes = document.createElement('a');
        notes.href = info.repoUrl + '/commits/main';
        notes.target = '_blank';
        notes.rel = 'noopener noreferrer';
        notes.textContent = 'Neler değişti?';
        row.append(yes, no, notes);

        card.append(top, p, row);
        root.append(style, card);
        document.documentElement.appendChild(host);

        const remove = () => { if (host) host.remove(); host = null; };
        const hideOnThisPage = () => { hiddenOnUrl = location.href; remove(); };
        x.onclick = hideOnThisPage;
        no.onclick = hideOnThisPage;
        yes.onclick = async () => {
            const res = await send({ type: 'update-open', version: info.latest });
            if (res && res.ok) { remove(); return; }
            p.textContent = 'Eklenti yeniden yüklenmiş görünüyor. Bu sayfayı yenileyip tekrar dene.';
            yes.remove();
        };
    }

    let running = false;
    async function run() {
        if (running || host) return;
        running = true;
        try {
            const info = await send({ type: 'update-check' });
            if (!info || !info.ok || !info.available) return;
            if (hiddenOnUrl === location.href || host) return;
            hiddenOnUrl = null;
            show(info);
        } finally {
            running = false;
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
    else run();

    // IMDb bazı sayfa geçişlerini yeniden yüklemeden yapar; adres değişince kart yeniden denenir.
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href === lastUrl) return;
        lastUrl = location.href;
        if (!host && hiddenOnUrl && hiddenOnUrl !== location.href) run();
    }, 1000);
})();
