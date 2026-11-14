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
    let savedDir = null;
    let savedDirReady = false;
    const savedDirPromise = U.getSavedDir().then((dir) => { savedDir = dir; }).catch(() => {}).finally(() => { savedDirReady = true; });

    function only(id) {
        for (const s of ['state-check', 'state-update', 'state-done', 'state-failed']) $(s).hidden = s !== id;
    }
    function openExtensions() {
        chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
    }
    $('open-extensions-2').onclick = openExtensions;
    // Başarısız sayfası: klasörü hemen seçtir, sonra güncellemeyi kendiliğinden başlat.
    $('reselect-2').onclick = async () => {
        try {
            await pickFolder();
            location.href = 'update.html?auto=1';
        } catch (e) {
            if (!(e && e.name === 'AbortError')) alert(e && e.message || String(e));
        }
    };
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
        if (params.get('banner') === '1') {
            const result = await send({ type: 'update-inline-reload', version: target });
            if (!result || !result.ok) {
                reloading = false;
                setError('Yeniden başlatılamadı. Eklentiler sayfasından eklentiyi yenile.');
            }
            return;
        }
        const st = await chrome.storage.local.get('upd');
        await chrome.storage.local.set({ upd: { ...(st.upd || {}), pendingReload: { to: target || null, at: Date.now() } } });
        chrome.runtime.reload();
    }

    // ---- Arayüz yardımcıları ----
    function setProgress(text) {
        $('progress').hidden = !text;
        $('progress-text').textContent = text || '';
        if (text && params.get('banner') === '1') send({ type: 'update-banner-status', text });
    }
    function setError(text) {
        $('error').hidden = !text;
        $('error').textContent = text || '';
        if (text && params.get('banner') === '1') send({ type: 'update-banner-status', text, error: true });
    }

    // Seçilen klasör gerçekten Chrome'un bu eklentiyi yüklediği klasör mü?
    // (Eklentinin başka bir kopyası da aynı adı taşır; bu yüzden yoklama dosyasıyla kanıtlanır.)
    async function isOurFolder(dir) {
        try {
            const m = await U.readManifestFrom(dir);
            if (!m || m.name !== self.name) return false;
        } catch (e) {
            return false;
        }
        return U.provesLoadedFolder(dir, (name) => chrome.runtime.getURL(name));
    }

    let phase = '';
    // Klasör seçme penceresi. Tıklama etkinliği tükenmesin diye çağıranlar bunu
    // tıklamanın ilk adımı olarak (öncesinde bekleme olmadan) çağırır.
    async function pickFolder() {
        if (typeof window.showDirectoryPicker !== 'function') {
            throw new Error('Bu tarayıcı klasöre yazmayı desteklemiyor. Chrome ya da Edge\'in güncel sürümünü kullan.');
        }
        phase = 'picker';
        // Tarayıcı eklenti klasörünün yolunu vermez; seçici çoğu kişinin zip'i çıkardığı İndirilenler'de açılır.
        const dir = await window.showDirectoryPicker({ id: 'imdbarsiv', mode: 'readwrite', startIn: 'downloads' });
        phase = 'verify';
        setProgress('Klasör doğrulanıyor…');
        if (!(await isOurFolder(dir))) {
            setProgress('');
            throw new Error('Seçilen klasör, Chrome\'un bu eklentiyi yüklediği klasör değil (başka bir kopya olabilir). Eklentiler sayfasında Ayrıntılar → Kaynak satırındaki klasörü “Klasörü yeniden seç” ile seç.');
        }
        try { await U.saveDir(dir); } catch (e) { /* bir dahaki sefere yeniden sorulur */ }
        savedDir = dir;
        return dir;
    }

    async function getFolder(forcePick, backgroundAuto) {
        if (forcePick) return pickFolder();
        // Klasör tanıtıcısını sayfa açılırken yükle; tıklama sırasında IndexedDB beklemek,
        // requestPermission için gereken kullanıcı etkinliğini tüketebilir.
        if (!savedDirReady) {
            const err = new Error('Klasör bilgisi henüz yüklenmedi. Birkaç saniye sonra yeniden dene.');
            err.name = 'DirectoryNotReadyError';
            throw err;
        }
        const dir = savedDir;
        if (dir) {
            phase = 'permission';
            let perm;
            if (backgroundAuto) {
                perm = await dir.queryPermission({ mode: 'readwrite' });
                if (perm !== 'granted') {
                    const err = new Error('Devam etmek için aşağıdaki “Şimdi güncelle” düğmesine basıp klasör iznini onayla.');
                    err.name = 'PermissionRequiredError';
                    throw err;
                }
            } else {
                // Bu çağrı, tıklama olayından önce herhangi bir await olmadan yapılmalı.
                const permissionRequest = dir.requestPermission({ mode: 'readwrite' });
                perm = await permissionRequest;
            }
            if (perm !== 'granted') {
                const err = new Error('Klasöre yazma izni verilmedi.');
                err.name = 'NotAllowedError';
                throw err;
            }
            if (await isOurFolder(dir)) return dir;
            // Kayıtlı klasör artık Chrome'un yüklediği klasör değil: unut, yeni seçim iste.
            // (Aynı tıklamada seçici açılmaz; izin istemi tıklama etkinliğini tüketmiş olabilir.)
            try { await U.forgetDir(); } catch (e) { /* yok */ }
            savedDir = null;
            throw new Error('Kayıtlı klasör artık bu eklentinin yüklendiği klasör değil. Doğru klasörü “Klasörü yeniden seç” ile seç.');
        }
        if (backgroundAuto) {
            phase = 'picker';
            const err = new Error('Klasör seçimi için güncelleme sayfasındaki düğmeyi kullan.');
            err.name = 'SetupRequiredError';
            throw err;
        }
        return pickFolder();
    }

    let busy = false;
    let permissionWindow = false;
    async function runUpdate(info, forcePick, backgroundAuto) {
        if (busy) return;
        if (!savedDirReady && !forcePick) {
            setError('Klasör bilgisi yükleniyor. Birkaç saniye sonra yeniden dene.');
            return;
        }
        busy = true;
        const btn = $('do-update');
        btn.disabled = true;
        $('reselect').disabled = true;
        setError('');
        phase = '';
        try {
            // forcePick: "Klasörü yeniden seç" — seçici, tıklamanın ilk adımı olarak hemen açılır.
            const dir = await getFolder(forcePick, backgroundAuto);
            phase = 'download';
            setProgress('Yeni sürüm indiriliyor…');
            const res = await fetch(info.zipUrl, { cache: 'no-store', credentials: 'omit' });
            if (!res.ok) throw new Error('İndirme başarısız (HTTP ' + res.status + ')');
            const declared = Number(res.headers.get('content-length') || 0);
            if (declared > 30 * 1024 * 1024) throw new Error('Paket çok büyük');
            const buf = await res.arrayBuffer();
            phase = 'install';
            setProgress('Paket doğrulanıyor…');
            const pkg = await U.preparePackage(buf, self.name, installed);
            const total = await U.installPackage(dir, pkg, (i, n) => setProgress(`Dosyalar yazılıyor… ${i}/${n}`));
            const after = await U.readManifestFrom(dir);
            if (after.version !== pkg.version) throw new Error('Yazma doğrulanamadı');
            setProgress(`${total} dosya güncellendi (${pkg.version}). Eklenti yeniden başlatılıyor…`);
            setTimeout(() => reloadInto(pkg.version), 800);
        } catch (e) {
            setProgress('');
            const msg = e && e.name === 'PermissionRequiredError'
                ? 'Chrome klasör iznini yeniden istiyor. Küçük güncelleme penceresinde “İzin ver ve güncelle”ye basıp izni onayla.'
                : e && e.name === 'SetupRequiredError'
                    ? 'Küçük güncelleme penceresinde “Klasör seç ve güncelle”ye basıp eklenti klasörünü seç.'
                : e && e.name === 'DirectoryNotReadyError'
                    ? 'Klasör bilgisi yüklenemedi. Birkaç saniye sonra yeniden dene.'
                : e && e.name === 'AbortError' && phase === 'picker' ? 'Klasör seçimi iptal edildi.'
                : e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') && (phase === 'permission' || phase === 'picker')
                    ? 'Klasöre yazma izni verilmedi. “Şimdi güncelle”ye yeniden basıp izni onayla.'
                : 'Güncellenemedi: ' + (e && e.message || e)
                    + (phase === 'install' ? ' Bazı dosyalar yazılmış olabilir; “Şimdi güncelle” ile yeniden dene.' : '');
            setError(msg);
            btn.disabled = false;
            if (e && e.name === 'PermissionRequiredError') btn.textContent = 'İzin ver ve güncelle';
            if (e && e.name === 'SetupRequiredError') btn.textContent = 'Klasör seç ve güncelle';
            $('reselect').disabled = false;
            if (params.get('banner') === '1' && !permissionWindow && (phase === 'permission' || phase === 'picker')) {
                try {
                    const tab = await chrome.tabs.getCurrent();
                    if (tab && Number.isInteger(tab.id)) {
                        await chrome.windows.create({ tabId: tab.id, type: 'popup', width: 520, height: 680, focused: true });
                        permissionWindow = true;
                    }
                } catch (e) {
                    setError('İzin penceresi açılamadı. Arşiv sayfasından güncellemeyi başlat.');
                }
            }
        } finally {
            busy = false;
        }
    }

    function showUpdate(info) {
        only('state-update');
        $('ver-from').textContent = info.current;
        $('ver-to').textContent = info.latest;
        const updateButton = $('do-update');
        const reselectButton = $('reselect');
        updateButton.disabled = !savedDirReady;
        reselectButton.disabled = !savedDirReady;
        savedDirPromise.then(() => {
            updateButton.disabled = false;
            reselectButton.disabled = false;
        });
        updateButton.onclick = () => runUpdate(info, false);
        reselectButton.onclick = () => runUpdate(info, true);
        document.title = `Güncelleme ${info.latest} · IMDb Arşiv`;
        // Başarısız sayfasında klasör yeniden seçildiyse güncelleme kendiliğinden başlar.
        if (params.get('auto') === '1') savedDirPromise.then(() => runUpdate(info, false, params.get('banner') === '1'));
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
        if (!info || !info.ok || info.fetchError) {
            $('check-title').textContent = 'Denetlenemedi';
            $('check-text').textContent = 'GitHub\'a ulaşılamadı' + (info && info.fetchError ? ' (' + info.fetchError + ')' : '') + '. İnternet bağlantını kontrol edip yeniden dene.';
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
