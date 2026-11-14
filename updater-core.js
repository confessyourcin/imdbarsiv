// Betiksiz güncelleme çekirdeği (yalnızca eklenti sayfalarında çalışır).
// GitHub zip'ini indirir, tarayıcının yerleşik DecompressionStream'i ile açar,
// paketi doğrular ve kullanıcının izin verdiği eklenti klasörüne yazar.
(function () {
    'use strict';
    const VERSION_RE = /^\d{1,5}(\.\d{1,5}){0,3}$/;

    function cmpVersions(a, b) {
        const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            const d = (pa[i] || 0) - (pb[i] || 0);
            if (d) return d > 0 ? 1 : -1;
        }
        return 0;
    }

    // --- Zip okuma (merkezi dizin; GitHub zip'leri için yeterli, Zip64 yok) ---
    function readZipEntries(buf) {
        const dv = new DataView(buf);
        const len = buf.byteLength;
        let eocd = -1;
        for (let i = len - 22; i >= Math.max(0, len - 22 - 65535); i--) {
            if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
        }
        if (eocd < 0) throw new Error('Zip dosyası okunamadı');
        const count = dv.getUint16(eocd + 10, true);
        let off = dv.getUint32(eocd + 16, true);
        const dec = new TextDecoder();
        const entries = [];
        for (let n = 0; n < count; n++) {
            if (off + 46 > len || dv.getUint32(off, true) !== 0x02014b50) throw new Error('Zip dizini bozuk');
            const method = dv.getUint16(off + 10, true);
            const csize = dv.getUint32(off + 20, true);
            const usize = dv.getUint32(off + 24, true);
            const nlen = dv.getUint16(off + 28, true);
            const xlen = dv.getUint16(off + 30, true);
            const clen = dv.getUint16(off + 32, true);
            const lho = dv.getUint32(off + 42, true);
            const name = dec.decode(new Uint8Array(buf, off + 46, nlen));
            off += 46 + nlen + xlen + clen;
            if (name.endsWith('/')) continue;
            if (lho + 30 > len || dv.getUint32(lho, true) !== 0x04034b50) throw new Error('Zip kaydı bozuk: ' + name);
            const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
            if (start + csize > len) throw new Error('Zip kaydı eksik: ' + name);
            entries.push({ name, method, usize, data: new Uint8Array(buf, start, csize) });
        }
        return entries;
    }

    async function inflate(entry) {
        if (entry.method === 0) return entry.data;
        if (entry.method !== 8) throw new Error('Desteklenmeyen sıkıştırma: ' + entry.name);
        const stream = new Blob([entry.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        const out = new Uint8Array(await new Response(stream).arrayBuffer());
        if (entry.usize && out.byteLength !== entry.usize) throw new Error('Boyut uyuşmuyor: ' + entry.name);
        return out;
    }

    // Güvenli göreli yol: "..", mutlak yol, sürücü harfi, gizli .git vb. reddedilir.
    function safeParts(path) {
        const parts = path.split('/');
        if (!parts.length) return null;
        for (const p of parts) {
            if (!p || p === '.' || p === '..' || /[\\:*?"<>|\x00-\x1f]/.test(p)) return null;
        }
        if (parts[0] === '.git' || parts[0] === '.github') return null;
        return parts;
    }

    // Zip'teki dosyaları { yol: Uint8Array } olarak hazırlar; tek üst klasörü (imdbarsiv-main/) soyar.
    async function preparePackage(zipBuf, expectName, installedVersion, opts) {
        const entries = readZipEntries(zipBuf);
        if (!entries.length) throw new Error('Zip boş');
        const tops = new Set(entries.map(e => e.name.split('/')[0]));
        const strip = tops.size === 1 && entries.every(e => e.name.includes('/')) ? [...tops][0] + '/' : '';
        const files = [];
        for (const e of entries) {
            const rel = strip ? e.name.slice(strip.length) : e.name;
            if (!rel) continue;
            const parts = safeParts(rel);
            if (!parts) continue;   // şüpheli yol: atla
            files.push({ parts, entry: e });
        }
        const mf = files.find(f => f.parts.length === 1 && f.parts[0] === 'manifest.json');
        if (!mf) throw new Error('Pakette manifest.json yok. GitHub deposunda dosyalar kök dizinde olmalı.');
        const manifest = JSON.parse(new TextDecoder().decode(await inflate(mf.entry)));
        if (!manifest || manifest.name !== expectName) throw new Error('Paket bu eklentiye ait değil');
        if (typeof manifest.version !== 'string' || !VERSION_RE.test(manifest.version)) throw new Error('Paketteki sürüm geçersiz');
        if (!(opts && opts.force) && cmpVersions(manifest.version, installedVersion) <= 0) {
            throw new Error(`Paketteki sürüm (${manifest.version}) kurulu sürümden (${installedVersion}) yeni değil`);
        }
        return { version: manifest.version, files };
    }

    async function writeFile(root, parts, bytes) {
        let dir = root;
        for (let i = 0; i < parts.length - 1; i++) dir = await dir.getDirectoryHandle(parts[i], { create: true });
        const fh = await dir.getFileHandle(parts[parts.length - 1], { create: true });
        const w = await fh.createWritable();
        await w.write(bytes);
        await w.close();
    }

    // manifest.json en son yazılır: yarıda kalırsa Chrome eski sürümü görmeye devam eder.
    async function installPackage(root, pkg, onProgress) {
        const ordered = pkg.files.slice().sort((a, b) =>
            (a.parts.join('/') === 'manifest.json') - (b.parts.join('/') === 'manifest.json'));
        let i = 0;
        for (const f of ordered) {
            await writeFile(root, f.parts, await inflate(f.entry));
            i++;
            if (onProgress) onProgress(i, ordered.length, f.parts.join('/'));
        }
        return ordered.length;
    }

    async function readManifestFrom(root) {
        const fh = await root.getFileHandle('manifest.json');
        return JSON.parse(await (await fh.getFile()).text());
    }

    // --- Klasör tanıtıcısını kalıcı saklama (IndexedDB) ---
    function idb() {
        return new Promise((resolve, reject) => {
            const r = indexedDB.open('imdbarsiv-updater', 1);
            r.onupgradeneeded = () => r.result.createObjectStore('kv');
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
        });
    }
    async function kvGet(key) {
        const db = await idb();
        return new Promise((resolve, reject) => {
            const q = db.transaction('kv').objectStore('kv').get(key);
            q.onsuccess = () => resolve(q.result);
            q.onerror = () => reject(q.error);
        });
    }
    async function kvSet(key, value) {
        const db = await idb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('kv', 'readwrite');
            tx.objectStore('kv').put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    window.ImdbArsivUpdater = {
        cmpVersions, readZipEntries, preparePackage, installPackage, readManifestFrom,
        getSavedDir: () => kvGet('extDir'),
        saveDir: (h) => kvSet('extDir', h)
    };
})();
