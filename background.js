// HDFilmCehennemi yedek kaynağı: IMDb kimliğinden dizi/film sayfasını ve
// (diziler için) sezon/bölüm sayfasını bulur ve sitenin kendi sayfasını
// oynatıcı boyutunda bir açılır pencerede açar (çerçeveleme korumasına dokunmadan).
const HDFC_BASE = 'https://www.hdfilmcehennemi.nl';

function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function hdfcFetch(url, asJson) {
    const res = await fetch(url, {
        credentials: 'omit',
        headers: asJson ? { 'X-Requested-With': 'fetch' } : {}
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return asJson ? res.json() : res.text();
}

async function resolveHdfc({ imdbId, isTV, season, episode }) {
    if (!/^tt\d+$/.test(imdbId)) throw new Error('Geçersiz IMDb kimliği');

    // Site aramasına IMDb kimliği verilebiliyor.
    const data = await hdfcFetch(`${HDFC_BASE}/search/?q=${imdbId}`, true);
    const results = Array.isArray(data && data.results) ? data.results : [];
    const wantType = isTV ? 'Dizi' : 'Film';
    const hostRe = new RegExp('^' + escapeRe(HDFC_BASE) + '/');

    // Arama bulanık eşleşebilir; yanlış içeriği önlemek için sayfada IMDb kimliği aranır.
    let pageUrl = null;
    let pageHtml = '';
    for (const html of results.slice(0, 5)) {
        const href = (html.match(/href="([^"]+)"/) || [])[1];
        const type = (html.match(/class="type">([^<]+)</) || [])[1];
        if (!href || !hostRe.test(href) || (type && type.trim() !== wantType)) continue;
        try {
            const page = await hdfcFetch(href, false);
            if (page.includes(imdbId)) { pageUrl = href; pageHtml = page; break; }
        } catch (e) { /* sıradaki sonuç */ }
    }
    if (!pageUrl) throw new Error('Sitede bulunamadı');
    if (!isTV) return { url: pageUrl, exact: true };

    if (!season || !episode) return { url: pageUrl, exact: false };

    // Bölüm adresleri sonek içerir (bolum-1-hd4), bu yüzden dizi sayfasından okunur.
    const html = pageHtml;
    const re = new RegExp(
        'href="(' + escapeRe(HDFC_BASE) + '/dizi/[^"/]+/sezon-' + Number(season) +
        '/bolum-' + Number(episode) + '(?:-[a-z0-9]+)?/)"'
    );
    const m = html.match(re);
    if (m) return { url: m[1], exact: true };
    return { url: pageUrl, exact: false };
}

// Oynatıcı penceresi: sekme çubuğu olmayan tek bir popup pencere, yeniden kullanılır.
// Site çerçevelenmeye izin vermediği için sayfa kendi penceresinde, kendi adresiyle açılır.
// Servis çalışanı uyuyunca bellekteki kimlik kaybolabilir; bu yüzden pencere, adresi
// HDFC_BASE ile başlayan popup aranarak da bulunur (host izni sekme adresini görünür kılar).
const hdfcWindowIds = { normal: null, incognito: null };
let hdfcOpening = Promise.resolve();

chrome.windows.onRemoved.addListener((id) => {
    for (const k of Object.keys(hdfcWindowIds)) if (hdfcWindowIds[k] === id) hdfcWindowIds[k] = null;
});

function clampInt(v, min, max) {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) return undefined;
    return Math.min(max, Math.max(min, n));
}

function isHdfcUrl(url) {
    if (typeof url !== 'string') return false;
    try { return new URL(url).origin === HDFC_BASE; } catch (e) { return false; }
}

async function findHdfcWindow(incognito) {
    const key = incognito ? 'incognito' : 'normal';
    if (hdfcWindowIds[key] !== null) {
        try { return await chrome.windows.get(hdfcWindowIds[key], { populate: true }); }
        catch (e) { hdfcWindowIds[key] = null; }
    }
    const wins = await chrome.windows.getAll({ populate: true, windowTypes: ['popup'] });
    const win = wins.find(w => !!w.incognito === incognito && w.tabs && w.tabs.length === 1 && isHdfcUrl(w.tabs[0].url));
    if (win) hdfcWindowIds[key] = win.id;
    return win || null;
}

// Modalın görünüm alanı içindeki CSS piksel konumunu ekran (DIP) koordinatına çevirir.
async function targetBounds(sender, view) {
    if (!view || !view.rect || !sender.tab) return null;
    const r = view.rect;
    const src = await chrome.windows.get(sender.tab.windowId);
    let zoom = 1;
    try { zoom = await chrome.tabs.getZoom(sender.tab.id) || 1; } catch (e) { /* 1 */ }
    const viewW = Number(view.innerWidth) * zoom;
    const viewH = Number(view.innerHeight) * zoom;
    const chromeLeft = Math.max(0, (src.width - viewW) / 2);
    const chromeTop = Math.max(0, src.height - viewH - chromeLeft);
    const t = {
        left: src.left + chromeLeft + Number(r.left) * zoom,
        top: src.top + chromeTop + Number(r.top) * zoom,
        width: Number(r.width) * zoom,
        height: Number(r.height) * zoom
    };
    return Object.values(t).every(Number.isFinite) ? t : null;
}

// Popup'ın içerik alanı modalın üstüne gelsin diye pencere çerçevesi kadar büyütür.
async function placeWindow(winId, t) {
    if (!t) return;
    let dw = 0, dh = 0;
    try {
        const w = await chrome.windows.get(winId, { populate: true });
        const tab = w.tabs && w.tabs[0];
        if (tab && tab.width && tab.height) {
            dw = Math.max(0, w.width - tab.width);
            dh = Math.max(0, w.height - tab.height);
        }
    } catch (e) { return; }
    const opts = {
        left: clampInt(t.left - dw / 2, -10000, 10000),
        top: clampInt(t.top - (dh - dw / 2), -10000, 10000),
        width: clampInt(t.width + dw, 480, 10000),
        height: clampInt(t.height + dh, 320, 10000)
    };
    try { await chrome.windows.update(winId, opts); } catch (e) { /* konum uygulanamadı */ }
}

async function openHdfcWindowNow({ url, view }, sender) {
    if (!isHdfcUrl(url)) throw new Error('Geçersiz adres');
    const incognito = !!(sender.tab && sender.tab.incognito);
    const key = incognito ? 'incognito' : 'normal';
    let t = null;
    try { t = await targetBounds(sender, view); } catch (e) { /* varsayılan konum */ }

    const existing = await findHdfcWindow(incognito);
    if (existing && existing.tabs && existing.tabs[0]) {
        await chrome.tabs.update(existing.tabs[0].id, { url, active: true });
        try { await chrome.windows.update(existing.id, { focused: true, state: 'normal' }); } catch (e) { /* odak alınamadı */ }
        await placeWindow(existing.id, t);
        return { reused: true };
    }

    const opts = { url, type: 'popup', focused: true, incognito };
    if (t) {
        opts.left = clampInt(t.left, -10000, 10000);
        opts.top = clampInt(t.top, -10000, 10000);
        opts.width = clampInt(t.width, 480, 10000);
        opts.height = clampInt(t.height, 320, 10000);
    }
    let win;
    try {
        win = await chrome.windows.create(opts);
    } catch (e) {
        // Konum ekran dışına taşarsa varsayılan konumla yeniden dene.
        delete opts.left; delete opts.top;
        win = await chrome.windows.create(opts);
    }
    hdfcWindowIds[key] = win.id;
    await placeWindow(win.id, t);
    return { reused: false };
}

// Aynı anda gelen istekler (ör. çift tıklama) sıraya alınır; ikinci pencere açılmaz.
function openHdfcWindow(msg, sender) {
    const run = hdfcOpening.then(() => openHdfcWindowNow(msg, sender));
    hdfcOpening = run.catch(() => {});
    return run;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg) return;
    // Yalnızca eklentinin kendi içerik betiğinden gelen istekler.
    if (sender.id !== chrome.runtime.id) return;
    if (msg.type === 'hdfc-open') {
        openHdfcWindow(msg, sender)
            .then(r => sendResponse({ ok: true, ...r }))
            .catch(e => sendResponse({ ok: false, error: String(e && e.message || e) }));
        return true;
    }
    if (msg.type !== 'hdfc-resolve') return;
    resolveHdfc(msg)
        .then(r => sendResponse({ ok: true, ...r }))
        .catch(e => sendResponse({ ok: false, error: String(e && e.message || e) }));
    return true;
});

// Araç çubuğundaki eklenti simgesi: IMDb Arşivi sayfasını açar.
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('app.html') });
});

// ---------------------------------------------------------------------------
// Güncelleme kontrolü (GitHub). Chrome, paketlenmemiş bir eklentinin kendi
// dosyalarını değiştirmesine izin vermez; bu yüzden eklenti yalnızca GitHub'daki
// manifest.json içindeki "version" alanını okur, kullanıcıya sorar ve güncelleme
// sayfasını açar. Dosyaları güncelleme sayfası (update.js + updater-core.js) kullanıcının
// izin verdiği klasöre Dosya Sistemi Erişimi API'siyle yazar.
// ---------------------------------------------------------------------------
const UPDATE_REPO = 'confessyourcin/imdbarsiv';
const UPDATE_BRANCH = 'main';
const UPDATE_MANIFEST_URL = `https://raw.githubusercontent.com/${UPDATE_REPO}/${UPDATE_BRANCH}/manifest.json`;
const UPDATE_CHECK_EVERY = 6 * 60 * 60 * 1000;
const UPDATE_SNOOZE = 24 * 60 * 60 * 1000;
const UPDATE_RETRY_AFTER_ERROR = 30 * 60 * 1000;
const VERSION_RE = /^\d{1,5}(\.\d{1,5}){0,3}$/;
// Chrome sürüm parçaları 0-65535 aralığında olmalı.
function isValidVersion(v) {
    return typeof v === 'string' && VERSION_RE.test(v) && v.split('.').every(n => Number(n) <= 65535);
}

function compareVersions(a, b) {
    const pa = String(a).split('.').map(Number);
    const pb = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] || 0) - (pb[i] || 0);
        if (d) return d > 0 ? 1 : -1;
    }
    return 0;
}

async function getUpdateState() {
    const st = await chrome.storage.local.get('upd');
    return st.upd || {};
}

// "upd" durumuna yazmalar sıraya alınır ve her yazma yalnızca kendi alanlarını en güncel
// durumun üzerine birleştirir (eşzamanlı denetim "Sonra" ya da pendingReload'ı ezmesin).
let updQueue = Promise.resolve();
function patchUpdateState(patch) {
    const run = updQueue.then(async () => {
        const u = await getUpdateState();
        await chrome.storage.local.set({ upd: { ...u, ...patch } });
    });
    updQueue = run.catch(() => {});
    return run;
}

async function checkForUpdate(force) {
    const current = chrome.runtime.getManifest().version;
    let u = await getUpdateState();
    let latest = u.latest || null;
    let fetchError = null;
    const due = !u.checkedAt || Date.now() - u.checkedAt > UPDATE_CHECK_EVERY;
    const retryOk = !u.failedAt || Date.now() - u.failedAt > UPDATE_RETRY_AFTER_ERROR;
    if (force || (due && retryOk)) {
        try {
            const res = await fetch(UPDATE_MANIFEST_URL + '?t=' + Date.now(), { cache: 'no-store', credentials: 'omit' });
            if (res.ok) {
                const j = await res.json();
                // Uzaktan yalnızca sürüm metni okunur; başka hiçbir alan kullanılmaz.
                latest = j && isValidVersion(j.version) ? j.version : null;
                await patchUpdateState({ latest, checkedAt: Date.now(), failedAt: 0 });
            } else if (res.status === 404) {
                // Depoda manifest.json yok: hata değil, yalnızca sürüm bilgisi yok.
                latest = null;
                await patchUpdateState({ latest, checkedAt: Date.now(), failedAt: 0 });
            } else {
                throw new Error('HTTP ' + res.status);
            }
        } catch (e) {
            // Çevrimdışı ya da GitHub hatası: 6 saat değil, 30 dk sonra yeniden denenir.
            fetchError = String(e && e.message || e);
            await patchUpdateState({ failedAt: Date.now() });
        }
        u = await getUpdateState();
    }
    const available = !!latest && compareVersions(latest, current) > 0;
    const snoozed = available && !!u.snooze && u.snooze.version === latest && Date.now() < u.snooze.until;
    return {
        current,
        latest,
        available,
        snoozed,
        fetchError,
        repoUrl: `https://github.com/${UPDATE_REPO}`,
        zipUrl: `https://codeload.github.com/${UPDATE_REPO}/zip/refs/heads/${UPDATE_BRANCH}`
    };
}

function openUpdatePage(params) {
    const q = new URLSearchParams(params || {}).toString();
    return chrome.tabs.create({ url: chrome.runtime.getURL('update.html') + (q ? '?' + q : '') });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || sender.id !== chrome.runtime.id) return;
    if (msg.type === 'update-check') {
        checkForUpdate(!!msg.force)
            .then(r => sendResponse({ ok: true, ...r }))
            .catch(e => sendResponse({ ok: false, error: String(e && e.message || e) }));
        return true;
    }
    if (msg.type === 'update-snooze') {
        patchUpdateState({ snooze: { version: String(msg.version), until: Date.now() + UPDATE_SNOOZE } })
            .then(() => sendResponse({ ok: true }), () => sendResponse({ ok: false }));
        return true;
    }
    if (msg.type === 'update-open') {
        const to = isValidVersion(msg.version) ? msg.version : '';
        openUpdatePage(to ? { to } : {}).then(() => sendResponse({ ok: true }), () => sendResponse({ ok: false }));
        return true;
    }
});

// Güncelleme sayfası eklentiyi yeniden başlattıysa: yeni sürüm gerçekten yüklendi mi?
(async () => {
    try {
        const u = await getUpdateState();
        if (!u.pendingReload) return;
        const { to } = u.pendingReload;
        const now = chrome.runtime.getManifest().version;
        await patchUpdateState({ pendingReload: null, checkedAt: 0 });
        const ok = !to || compareVersions(now, to) >= 0;
        await openUpdatePage(ok ? { done: now } : { to, failed: '1' });
    } catch (e) { /* yok say */ }
})();
