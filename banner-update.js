// Arşiv sayfasında kullanıcı tıklamasından doğrudan klasör izni isteyen güncelleyici.
(function () {
    'use strict';
    const U = window.ImdbArsivUpdater;
    const self = chrome.runtime.getManifest();
    let savedDir = null;
    let loaded = false;
    let busy = false;
    const ready = U.getSavedDir().then(dir => { savedDir = dir; }).catch(() => {}).finally(() => { loaded = true; });

    async function start(info, progress) {
        if (busy) throw new Error('Güncelleme zaten sürüyor.');
        if (!loaded) throw new Error('Klasör bilgisi yükleniyor. Biraz sonra yeniden dene.');
        busy = true;
        let writing = false;
        try {
            let dir = savedDir;
            // İzin/seçici çağrısı, tıklamadan sonra herhangi bir await olmadan yapılır.
            if (dir) {
                const permission = dir.requestPermission({ mode: 'readwrite' });
                if (await permission !== 'granted') throw new Error('Klasöre yazma izni verilmedi.');
            } else {
                if (typeof window.showDirectoryPicker !== 'function') throw new Error('Tarayıcı klasör seçimini desteklemiyor.');
                const selection = window.showDirectoryPicker({ id: 'imdbarsiv', mode: 'readwrite', startIn: 'downloads' });
                dir = await selection;
            }
            progress('Klasör doğrulanıyor…');
            const manifest = await U.readManifestFrom(dir);
            if (!manifest || manifest.name !== self.name || !await U.provesLoadedFolder(dir, name => chrome.runtime.getURL(name))) {
                savedDir = null;
                await U.forgetDir();
                throw new Error('Klasör bu eklentinin yüklendiği klasör değil. Tekrar deneyip doğru klasörü seç.');
            }
            savedDir = dir;
            await U.saveDir(dir);
            progress('Yeni sürüm indiriliyor…');
            const res = await fetch(info.zipUrl, { cache: 'no-store', credentials: 'omit' });
            if (!res.ok) throw new Error('İndirme başarısız (HTTP ' + res.status + ')');
            if (Number(res.headers.get('content-length') || 0) > 30 * 1024 * 1024) throw new Error('Paket çok büyük');
            const buf = await res.arrayBuffer();
            progress('Paket doğrulanıyor…');
            const pkg = await U.preparePackage(buf, self.name, self.version);
            writing = true;
            await U.installPackage(dir, pkg, (i, n) => progress(`Dosyalar yazılıyor… ${i}/${n}`));
            const after = await U.readManifestFrom(dir);
            if (after.version !== pkg.version) throw new Error('Yazma doğrulanamadı');
            progress('Güncellendi. Eklenti yeniden başlatılıyor… Ardından bu sayfayı yenile.');
            await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'update-inline-reload', version: pkg.version }, res => {
                    if (chrome.runtime.lastError || !res || !res.ok) reject(new Error('Eklenti yeniden başlatılamadı. Eklentiler sayfasından yenile.'));
                    else resolve();
                });
            });
        } catch (e) {
            if (writing) throw new Error((e.message || String(e)) + ' Bazı dosyalar yazılmış olabilir; tekrar dene.');
            throw e;
        } finally { busy = false; }
    }
    window.ImdbArsivBannerUpdater = { ready, start };
})();
