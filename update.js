// Güncelleme sayfası: GitHub'daki sürümü gösterir ve "Şimdi güncelle" ile yeni sürümü
// doğrudan eklenti klasörüne yazar (Dosya Sistemi Erişimi API'si, kullanıcı izniyle),
// ardından eklentiyi yeniden başlatır. Komut dosyası gerekmez.
(function () {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const U = window.ImdbArsivUpdater;
    const params = new URLSearchParams(location.search);
    const VERSION_RE = /^\d{1,5}(\.\d{1,5}){0,3}$/;
    const self = chrome.runtime.getManifest();
    const installed = self.version;
    $('foot-ver').textContent = installed;

    function only(id) {
        for (const s of ['state-check', 'state-update', 'state-done', 'state-failed']) $(s).hidden = s !== id;
    }
    function openExtensions() {
        chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
    }
    $('open-extensions').onclick = openExtensions;
    $('open-extensions-2').onclick = openExtensions;
    $('open-archive').onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL('app.html') });

    function send(msg) {
        return new Promise((resolve) => {
            try { chrome.runtime.sendMessage(msg, (r) => resolve(chrome.runtime.lastError ? null : r)); }
            catch (e) { resolve(null); }
        });
    }

    // ---- Yeniden başlatma ----
    let reloading = false;
    async function reloadInto(target) {
        if (reloading) return;
        reloading = true;
        clearInterval(pollTimer);
        const st = await chrome.storage.local.get('upd');
        await chrome.storage.local.set({ upd: { ...(st.upd || {}), pendingReload: { to: target || null, at: Date.now() } } });
        chrome.runtime.reload();
    }

    // Elle kopyalama yolu için: eklenti klasöründeki manifest.json izlenir.
    let pollTimer = 0;
    async function diskVersion() {
        const res = await fetch(chrome.runtime.getURL('manifest.json') + '?t=' + Date.now(), { cache: 'no-store' });
        const j = await res.json();
        return j && typeof j.version === 'string' ? j.version : null;
    }
    function watchDisk(target) {
        clearInterval(pollTimer);
        pollTimer = setInterval(async () => {
            if (reloading || busy) return;
            let v = null;
            try { v = await diskVersion(); } catch (e) { return; }
            if (v && VERSION_RE.test(v) && U.cmpVersions(v, target) >= 0) {
                setProgress(`${v} dosyaları bulundu. Eklenti yeniden başlatılıyor…`);
                setTimeout(() => reloadInto(v), 1000);
            }
        }, 2500);
    }

    // ---- Arayüz yardımcıları ----
    function setProgress(text) {
        $('progress').hidden = !text;
        $('progress-text').textContent = text || '';
    }
    function setError(text) {
        $('error').hidden = !text;
        $('error').textContent = text || '';
    }

    // Seçilen klasör gerçekten bu eklentinin klasörü mü?
    async function isOurFolder(dir) {
        try {
            const m = await U.readManifestFrom(dir);
            if (!m || m.name !== self.name || typeof m.version !== 'string') return false;
            await dir.getFileHandle('update.html');   // bu eklentiye özgü dosya
            return true;
        } catch (e) {
            return false;
        }
    }

    async function getFolder() {
        let dir = null;
        try { dir = await U.getSavedDir(); } catch (e) { dir = null; }
        if (dir) {
            let perm = await dir.queryPermission({ mode: 'readwrite' });
            if (perm !== 'granted') perm = await dir.requestPermission({ mode: 'readwrite' });
            if (perm === 'granted' && await isOurFolder(dir)) return dir;
            dir = null;
        }
        if (typeof window.showDirectoryPicker !== 'function') {
            throw new Error('Bu tarayıcı klasöre yazmayı desteklemiyor. Aşağıdaki “elle güncelle” yolunu kullan.');
        }
        setProgress('Eklenti klasörünü seç…');
        dir = await window.showDirectoryPicker({ id: 'imdbarsiv', mode: 'readwrite' });
        if (!(await isOurFolder(dir))) {
            throw new Error('Seçilen klasör bu eklentinin klasörü değil. İçinde manifest.json ve update.html olan klasörü seç.');
        }
        try { await U.saveDir(dir); } catch (e) { /* bir dahaki sefere yeniden sorulur */ }
        $('first-time').hidden = true;
        return dir;
    }

    let busy = false;
    async function runUpdate(info) {
        if (busy) return;
        busy = true;
        const btn = $('do-update');
        btn.disabled = true;
        setError('');
        try {
            const dir = await getFolder();
            setProgress('Yeni sürüm indiriliyor…');
            const res = await fetch(info.zipUrl, { cache: 'no-store', credentials: 'omit' });
            if (!res.ok) throw new Error('İndirme başarısız (HTTP ' + res.status + ')');
            const buf = await res.arrayBuffer();
            setProgress('Paket doğrulanıyor…');
            const pkg = await U.preparePackage(buf, self.name, installed);
            const total = await U.installPackage(dir, pkg, (i, n) => setProgress(`Dosyalar yazılıyor… ${i}/${n}`));
            const after = await U.readManifestFrom(dir);
            if (after.version !== pkg.version) throw new Error('Yazma doğrulanamadı');
            setProgress(`${total} dosya güncellendi (${pkg.version}). Eklenti yeniden başlatılıyor…`);
            setTimeout(() => reloadInto(pkg.version), 800);
        } catch (e) {
            setProgress('');
            const msg = e && e.name === 'AbortError' ? 'Klasör seçimi iptal edildi.'
                : e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'Klasöre yazma izni verilmedi. “Şimdi güncelle”ye yeniden basıp izni onayla.'
                : 'Güncellenemedi: ' + (e && e.message || e);
            setError(msg);
            btn.disabled = false;
        } finally {
            busy = false;
        }
    }

    function showUpdate(info) {
        only('state-update');
        $('ver-from').textContent = info.current;
        $('ver-to').textContent = info.latest;
        $('zip-link').href = info.zipUrl;
        $('reload-now').onclick = () => reloadInto(info.latest);
        $('do-update').onclick = () => runUpdate(info);
        document.title = `Güncelleme ${info.latest} · IMDb Arşiv`;
        U.getSavedDir().then(d => { if (d) $('first-time').hidden = true; }, () => {});
        watchDisk(info.latest);
    }

    async function check(force) {
        only('state-check');
        $('check-title').textContent = 'Güncelleme denetleniyor…';
        $('check-text').textContent = '';
        $('check-actions').hidden = true;
        const info = await send({ type: 'update-check', force: !!force });
        if (info && info.ok && info.available) { showUpdate(info); return; }
        $('check-actions').hidden = false;
        if (info && info.repoUrl) $('repo-link').href = info.repoUrl;
        if (!info || !info.ok) {
            $('check-title').textContent = 'Denetlenemedi';
            $('check-text').textContent = 'GitHub\'a ulaşılamadı. İnternet bağlantını kontrol edip yeniden dene.';
        } else if (!info.latest) {
            $('check-title').textContent = 'Sürüm bilgisi bulunamadı';
            $('check-text').textContent = 'GitHub deposunda manifest.json henüz yok ya da okunamadı.';
        } else {
            $('check-title').textContent = 'Güncelsin';
            $('check-text').textContent = `Kurulu sürüm ${info.current}, GitHub'daki sürüm ${info.latest}.`;
        }
    }
    $('check-again').onclick = () => check(true);

    const done = params.get('done');
    const failed = params.get('failed');
    if (done && VERSION_RE.test(done)) {
        only('state-done');
        $('done-ver').textContent = done;
        document.title = `Güncellendi ${done} · IMDb Arşiv`;
    } else if (failed) {
        only('state-failed');
    } else {
        check(true);
    }
})();
