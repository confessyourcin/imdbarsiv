# AGENTS.md: IMDb Arşiv için yapay zekâ ajanı rehberi

Bu dosya, bu depoda çalışan kodlama ajanları (Claude Code, Codex, Cursor vb.) ve onları kullanan geliştiriciler içindir. Kullanıcı rehberi [README.md](README.md), sürüm sürüm teknik kararlar [NOTLAR.md](NOTLAR.md).

## Proje özeti

Chrome / Edge için **Manifest V3** eklentisi. Derleme adımı, paket yöneticisi ya da bağımlılık yok: düz JavaScript, HTML ve CSS. Dosyalar olduğu gibi "Paketlenmemiş öğe yükle" ile yüklenir.

Üç parçası var:
1. **IMDb sayfası:** `content.js` IMDb başlık sayfalarına *Play* düğmesi, kaynak menüsü ve modal oynatıcı ekler.
2. **Arşiv sayfası:** `app.html`, araç çubuğu simgesiyle açılır. Top 10 film ve dizi, IMDb araması ve aynı modal oynatıcı burada.
3. **Güncelleyici:** GitHub'daki `manifest.json` sürümünü denetler. Kullanıcı onaylarsa yeni sürümü tarayıcı içinden eklenti klasörüne yazar.

Arayüz metinleri **Türkçe**. Yeni metinleri de Türkçe yaz.

## Dosya haritası

| Dosya | Görev |
|---|---|
| `manifest.json` | İzinler, içerik betikleri, `action`. **`name` alanını değiştirme** (aşağıya bak). |
| `background.js` | Servis çalışanı. HDFilmCehennemi çözümleme (`hdfc-resolve`), oynatıcı boyutunda popup (`hdfc-open`), simge tıklaması → `app.html`, güncelleme denetimi (`update-check`, `update-open`), yeniden başlatma sonrası `pendingReload` kontrolü. |
| `content.js` | Kaynak listesi (`getServers`), modal oynatıcı (`showModal`), yedeğe geçiş, VidSrc `postMessage` dinleyicisi, dizi sezon/bölüm seçicisi. Sonunda `window.IMDbPlayer = { getServers, showModal }` dışa açılır. IMDb düğmeleri yalnızca `imdb.com` üzerinde eklenir. |
| `styles.css` | Oynatıcı ve IMDb düğme stilleri (yalnızca `.vidsrc-*` sınıfları). |
| `app.html` / `app.js` / `app.css` | Arşiv sayfası. `content.js`'i normal betik olarak yükleyip `window.IMDbPlayer`'ı kullanır. |
| `app-preferences.js` | Arşivde TR/EN ve aydınlık/karanlık tema seçimi; ilk kullanımda EN/karanlık. |
| `turkish-metadata.js` | TMDB üzerinden seçilen dilde ad/açıklama; dizi adı özgün kalır, hata veya boş alanda IMDb verisi korunur. |
| `banner-update.js` | Arşiv bannerında doğrudan izin isteme, paket doğrulama/yazma ve yeniden başlatma. |
| `update-banner.js` | Tüm `imdb.com` sayfalarında ve arşivde "Güncellensin mi?" kartı (gölge DOM). |
| `update.html` / `update.js` / `update.css` | Güncelleme sayfası: klasör izni, indirme, yazma, yeniden başlatma. |
| `updater-core.js` | Zip okuyucu (merkezi dizin + `DecompressionStream('deflate-raw')`), yol filtresi, paket doğrulama, klasöre yazma, IndexedDB'de klasör tanıtıcısı. |
| `icon.png` | Simge. |

## Mimari notlar

- **Kaynak sırası tek yerde:** `getServers(imdbId, isTV, season, episode)` → `getEmbedServers` (VidSrc, VAPlayer, IMDb Player, VidSrc.mov) + en sonda HDFilmCehennemi girdisi. HDFC girdisi `external: { imdbId, isTV, season, episode }` taşır. Oynatıcı dizi bilgisini (sezon/bölüm seçici) **bu alandan** okur. Kaynak eklerken HDFC girdisinin sonda kalması ve `external` alanı korunmalı.
- **Diziler:** sezon ve bölüm ya birlikte verilir ya hiç verilmez. Yalnız biri verilirse `getEmbedServers` `[]` döner.
- **Modal oynatıcı (`showModal`)** kapanış (closure) değişkenleriyle çalışır: `current`, `attempted`, `generation` (eski olayları elemek için belirteç), `jumpedToHdfc`, `vidsrcLive`, `pendingSet`. Asenkron geri çağrılarda her zaman `closed` ve `token === generation` denetle. Aynı anda tek overlay açılır.
- **VidSrc mesaj protokolü:** `vidsrc.sh` embed sayfası iç oynatıcının mesajlarını gömen sayfaya iletir. Dinleyici `e.origin === 'https://vidsrc.sh'` ve `e.source === iframe.contentWindow` denetler.
  - **Gelen mesajlar:** `PLAYER_TITLE`, `TV_INFO` (`{eps: {"1":[1,2,…]}, season, episode}`, video başlayınca gelir), `TV_STATE`, `MEDIA_NOT_FOUND`.
  - **Giden mesaj:** `TV_SET {season, episode}`. 4 sn içinde onaylanmazsa kaynak yeniden yüklenir.
  - **Doğrulama:** dışarıdan gelen tüm sayıları `validSE` ile denetle.
- **"Media not found":** HDFC'ye modal başına **bir kez** sıçranır, sonra normal yedek sırası işler. Bilinen "bulunamadı" adresleri `vidsrcNotFound` içinde tutulur.
- **Arka plan mesajları:** her `onMessage` dinleyicisi `sender.id === chrome.runtime.id` denetler. Asenkron yanıt veren dal `return true` döndürür. Birden fazla dinleyici var; kendi türün değilse hiçbir şey döndürme.
- **Güncelleyici:**
  - **Uzak veri:** önce `api.github.com/repos/<repo>/commits/main` ile son commit kimliği (SHA) alınır, sonra yalnızca o commit'teki `manifest.json`'un `version` alanı okunur ve sayısal karşılaştırılır (`1.10.0 > 1.9.0`). Dal adresini (`raw…/main/…`) doğrudan kullanma: CDN ~5 dk eski içerik verir ve `?t=` gibi sorgu dizelerini yok sayar. API'ye ulaşılamazsa dal adresine düşülür.
  - **Klasör kanıtı:** seçilen klasörün Chrome'un yüklediği klasör olduğu `updater-probe.txt` yoklama dosyasıyla kanıtlanır (yazılır, `chrome.runtime.getURL` ile okunur, silinir).
  - **Paket doğrulaması:** paket `name` aynı ve sürüm daha yeni olmalı; zip ≤ 30 MB, açılmış toplam ≤ 60 MB.
  - **Yol filtresi:** `..`, mutlak yol, Windows'a ayrılmış adlar, sonu nokta/boşluk olan adlar, `.git`, `.github` ve kökte `_` ile başlayanlar (`_locales` hariç) yazılmaz.
  - **Durum:** `storage.local.upd` yazmaları `patchUpdateState` ile sıraya alınır; doğrudan `set` kullanma.
  - **Yazma sırası:** `manifest.json` en son yazılır, hiçbir dosya silinmez.

## Kesin kurallar

1. **Uzaktan kod yok (MV3):** dışarıdan betik yükleme, `eval`, `new Function`, CDN yok. Kütüphane gerekiyorsa dosyayı depoya koy.
2. **Eklenti sayfalarında satır içi betik ya da `on*=` özniteliği yok.** Olayları JS'te bağla.
3. **Uzak metinler yalnızca `textContent` ile** basılır (IMDb, VidSrc, HDFC, GitHub verisi). `innerHTML`'e uzak veri koyma. CSS `url("…")` içine giden görsel adresleri `app.js` içindeki `IMG_RE` ile sınırlıdır; bu kontrolü gevşetme.
4. **Sitelerin çerçeveleme ve Referer korumalarını aşma.** HDFilmCehennemi `X-Frame-Options`/`frame-ancestors` ve Referer denetimi kullanıyor. Bu yüzden popup pencerede açılır. Başlık silme ya da Referer sahteleme (`declarativeNetRequest` vb.) ekleme. Bu bilinçli bir karar.
5. **`manifest.json` → `name` değişmez:** güncelleyici paketi bu adla doğrular. Değişirse kurulu herkesin güncellemesi kırılır.
6. **İzinleri en az tut:** yeni host ya da izin eklemek kullanıcıdan yeniden onay ister. Gerekçesini README'deki izin tablosuna yaz.
7. **Kodlama:** dosyalar UTF-8. Türkçe karakterler korunmalı.

## Sürüm yayınlama

- `main` dalı **canlıdır**: oradaki `manifest.json` sürümü artınca kullanıcılar en geç 6 saat içinde güncelleme kartını görür. Yarım işi ayrı dalda tut.
- Yayın: `manifest.json` → `"version"` artır, NOTLAR.md'ye kısa not ekle, `main`'e gönder.
- Dosyalar depo **kök dizininde** olmalı; güncelleyici `codeload.github.com/<repo>/zip/<sha>` zip'indeki (denetlenen commit) tek üst klasörü soyar ve kökte `manifest.json` arar.
- Depo ve dal adı iki yerde geçer: `background.js` (`UPDATE_REPO`, `UPDATE_BRANCH`) ve README bağlantıları.

## Doğrulama

Otomatik test paketi yok. Her değişiklikten sonra en azından:

```bash
for f in *.js; do node --check "$f" || echo "HATA: $f"; done
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))"
```

Tarayıcıda elle kontrol listesi (değişikliğe göre):
- `chrome://extensions` → eklentiyi yenile (⟳) → IMDb sekmesini yenile.
- **Film sayfası** (ör. `/title/tt0111161/`): Play → oynatıcı açılır; kaynak menüsü ve "Yedek kaynağa geç" çalışır.
- **Dizi sayfası** (ör. `/title/tt0455275/`): sezon/bölüm seçici dolar; bölüm değişince doğru adres yüklenir (`/embed/tv/<id>/<s>/<e>`).
- **VidSrc'de olmayan bir başlık:** kaynak HDFilmCehennemi'ye geçer, popup açılır.
- **Simgeye tıkla:** arşiv açılır; Top 10 satırları, arama, ayrıntı penceresi ve oynat çalışır. Telefon genişliğinde (375 px) yatay taşma olmamalı.
- **Güncelleyici:** yerelde `manifest.json` sürümünü geçici olarak GitHub'dakinden düşük yap → IMDb'de kart çıkar → güncelleme sayfası. Gerçek yazmayı denemeden önce hedef klasörün yedeğini al.
- **Güncelleyici çekirdeği** tarayıcı konsolunda gerçek klasör olmadan OPFS ile denenebilir: `navigator.storage.getDirectory()` bir `FileSystemDirectoryHandle` verir; `ImdbArsivUpdater.preparePackage` ve `installPackage` buna yazar.

Ağ isteği atan özellikleri (IMDb listeleri, öneri uç noktası, embed'ler) yalnızca gerçek eklentide tam doğrulayabilirsin. Eklenti sayfası dışındaki bir kökenden çalıştırınca CORS'a takılırlar.

## Bilinen sınırlar

- IMDb `/chart/*` sayfaları bot doğrulaması isteyebilir. O zaman arşiv yerleşik "Öne Çıkan" listesine düşer (`app.js` → `FEATURED`).
- `TV_INFO` yalnızca video başladıktan sonra gelir; öncesinde bölüm listesi IMDb bölüm sayfasından okunur (ilk ~50 bölüm, fazlası açık uçlu).
- Odak video iframe'inin içindeyken Esc iframe'e gider; oynatıcı × ile kapanır.
- Popup konumu çoklu monitör ve yana yapışık DevTools durumlarında kayabilir.
