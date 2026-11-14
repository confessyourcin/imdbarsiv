# Geliştirici notları (IMDb Arşiv)

Bu dosya sürüm sürüm teknik kararları ve doğrulama notlarını tutar. Kullanıcı rehberi için README.md.

## 1.9.7: Servers listesi

Oynatıcı araç çubuğunda **Kaynak** listesinin yanında ayrı bir **Servers** listesi var (`EXTRA_SERVERS`, `getExtraServers` → `content.js`). Ana kaynak sırasına (`getServers`), `attempted` kümesine ve otomatik yedek geçişine girmez; zaman aşımı yok, yalnızca elle seçilir. Ek sunucu açıkken "Yedek kaynağa geç" sıradaki ek sunucuya gider, Kaynak listesinden seçim yapılınca Servers sıfırlanır. Dizide bölüm değişince seçili ek sunucu yeni bölüm adresiyle yeniden yüklenir. Ek sunucu açıkken VidSrc mesajları yok sayılır (`extraCurrent >= 0`). Liste HDFC girdisinin `external` alanından (IMDb kimliği, film/dizi) üretilir; HDFC girdisi yoksa liste görünmez.

Seçim: XXIKU'nun embed listesindeki 46 adres (40 alan adı) IMDb kimliğiyle, imdb.com kökenli bir sayfada iframe içinde Playwright ile denendi (Lupin S1B1 `tt2531336`; film `tt0111161`). Ölçüt: iframe içindeki `<video>` `currentTime` ilerliyor.

- **Eklendi (dizide oynadı):** braflix.dev, nxsha.space, embedmaster.link, vidcore.io, vixsrc.to, vidsrc.party, vidsrc.buzz, embedbandit.com, vidzen.fun. Film adresi tarayıcıda oynadı: braflix, nxsha, embedmaster, vidcore, vixsrc, vidsrc.party; vidsrc.buzz film sayfası başlığı doğru döndü (statik); embedbandit ve vidzen film adresi tarayıcıda doğrulanmadı (HTTP 200).
- **VidSrc adlı/aynası, eklenmedi:** vidsrc.me (vidsrc.sh'e yönlenir), vidsrc.ir, vidsrc2.ru, player.videasy.ws (vidsrc.sh ile aynı sayfa); embed.vidsrc.pk VixSrc'nin yayınını kullanıyor (`vixsrc.to/storage/enc.key`, `*.velvetvalley50.boats` HLS), VixSrc zaten listede.
- **VidSrc adlı ama ayrı (ağ trafiğiyle denendi, Lupin S1B1):** vidsrc.sh videoyu `hazelandhoney.space` / `stellarconductornexus.com` üzerinden çekiyor. vidsrc.party tüm istekleri kendi alan adı üzerinden yapıyor (arka ucu görünmüyor, vidsrc.sh sunucularına doğrudan istek yok); vidsrc.buzz `relay.videm.buzz` kullanıyor. İkisi de eklendi. web.nxsha.app = nxsha.space.
- **Eklenmedi:** watch.embed-api.stream (oynadı ama `beforeunload` iletişim kutusu açıyor; vidzee sarmalayıcısı), vidly.pro (yalnız TMDB kimliği), vidcore.org/vidspark.to (moviesapi.vip çerçeveyi reddediyor), vidplayer.cc (çerçeveyi reddediyor), player.vidzee.wtf ve vidbolt.pro (tıklamada reklama gidiyor), cinesrc.st, movietvapi.stream, cinextream.cc, player.cinezo.live, vidstorm.to, ishowstream.cc, player.embedheaven.st, vidy.st, vidfast.vc, filesun.sbs, embed.cinelite.xyz, play.xpass.top, zoryva.me, framextv.cc, player.vidmario.net (hata, 404 ya da kaynak bulunamadı), rivestream.ru (embed değil, site sayfası).

Gerçek eklentide (chrome://extensions) ve arşiv sayfasında denenmedi; sahte imdb.com sayfasında `content.js` ile seçim, bölüm değişimi, "Yedek kaynağa geç", Kaynak'a dönüş, 17 sn zaman aşımı olmaması ve 375 px'te taşma olmaması kontrol edildi.

## Güncel arşiv değişiklikleri

- `tvmaze-episodes.js`, yalnızca arşiv oynatıcısında IMDb listesi alınamadığında yedektir. IMDb kimliği doğrulanır; gerçek sezon/bölüm numaraları kullanılır, sayımdan tahmini aralık üretilmez. Bir saat önbellek ve eşzamanlı istek birleştirme vardır. Geç gelen yanıtlar kapanmış modalı veya VidSrc listesini ezmez. TMDB sezon verisi kullanılmaz.

- Arşiv oynatıcısında veri beklenirken tahmini S1–S20/B1–B30 listeleri gösterilmez (`knownEpisodesOnly`). Liste mevcut IMDb veya VidSrc verisiyle dolar; veri yokken yalnızca mevcut seçim görünür ve tahmini sonraki bölüme geçilmez. IMDb sayfasının modal çağrıları değişmedi; TMDB sezon kaynağı eklenmedi.

- `app-preferences.js`: ilk kullanımda EN/karanlık tema; sağ üstte tema ve TR/EN seçimi. Tercihler `localStorage` içinde saklanır.
- `turkish-metadata.js`: TMDB `find` isteğinde `tr-TR` veya `en-US`; dizi için `original_name`, film için çevrilmiş `title`. Önce IMDb verisi kopyalanır, yalnızca dolu TMDB alanları bunun üzerine eklenir. Ağ/HTTP/ayrıştırma hatasında IMDb verisi korunur. Türler TR seçiliyken yerel sözlükle çevrilir.
- TMDB yanıtları dile ve film/dizi kimliğine göre ayrı anahtarla 24 saat önbelleğe alınır. Varsayılan API anahtarı kodda bulunur; anahtar formu kaldırılmıştır.
- TR/EN için gerçek TMDB yanıtları ve tercihlerin kaydedilmesi yerel testlerle kontrol edildi. Görsel tarayıcı kontrolü yapılmadı.

## 1.6.0 ve öncesi

Film ve dizi menülerinde dört kaynak görünür: VidSrc, VidAPI / VAPlayer, IMDb Player, VidSrc.mov. Her iki menü ve oynatıcı penceresi aynı kaynak sırasını kullanır.

Dizi bölüm seçimi yapılmışsa dört kaynak da seçili sezon/bölümle açılır. Seçim yoksa VidSrc ve VAPlayer bölüm seçicisini; IMDb Player ve VidSrc.mov 1. sezon 1. bölümü açar (menüde S1E1 etiketi). Ana oynat ve kaynak menüleri tıklama anındaki bölüm seçimini okur.

IMDb Player dizi adresi HTTP 200 ile Player sayfası döndürdü; gerçek bölüm oynatımı doğrulanmadı. VidSrc.mov yalnız film ve sezon/bölümlü dizi adreslerini belgeliyor. IMDb kimlikleri açık sayfadan alınır.

## Kaynak merkezleri

- https://vidsrc.sh/ — https://vidsrc.sh/vidsrc/docs/ — alan adı listesi https://vidsrc.domains/
- https://vidapi.ru/ — https://vidapi.ru/api — embed sunucusu https://vaplayer.ru/
- https://player.imdb.su/ — StreamEmbed ana sayfası. IMDb.com ile resmi ilişki ve dizi API dokümanı doğrulanmadı.
- https://vidsrc.mov/#api — ayrı kaynak; VidSrc.sh ile işletmeci/ayna ilişkisi doğrulanmadı.

## Yedek geçişi

Oynatıcıda Kaynak seçimi ve Yedek kaynağa geç düğmesi bulunur. Yükleme hatası veya 15 saniye zaman aşımında sıradaki denenmemiş kaynak açılır. Her kaynak bir kez denenir; manuel geçiş kullanılabilir kalır. Cross-origin iframe içindeki video hataları her zaman algılanamaz; load olayı oynatma kanıtı değildir. Oynatıcı içindeki bölüm veya oynatma konumu diğer sağlayıcıya aktarılmaz.

## Kurulum ve doğrulama

chrome://extensions veya edge://extensions sayfasında mevcut eklentiyi Yenile, ardından IMDb sekmesini yenile. İlk kurulumda Geliştirici modu → Paketlenmemiş öğe yükle ile bu klasörü seç.

`node --check` ile sözdizimi denetlenir; projede otomatik test paketi yok.


## HDFilmCehennemi yedeği (1.7.0: oynatıcı penceresi)

Kaynak listesinin sonunda "HDFilmCehennemi (açılır pencere)" bulunur. Seçilince `background.js` siteyi IMDb kimliğiyle arar (`/search/?q=tt…`), dönen sayfada aynı IMDb kimliğinin geçtiğini doğrular, dizilerde sezon/bölüm bağlantısını (`/sezon-4/bolum-1-hd4/` gibi, sonekli) dizi sayfasından okur.

- Kaynak elle seçildiyse (menü veya "Yedek kaynağa geç") sayfa, oynatıcı modalının ekrandaki yerinde ve boyutunda, sekme çubuğu olmayan bir açılır pencerede (`chrome.windows.create({type:'popup'})`) açılır. Tek pencere kullanılır (servis çalışanı uyusa da adresi HDFC olan popup aranarak bulunur; çift tıklama ikinci pencere açmaz); yeni seçimde aynı pencere yeni adrese gider, öne gelir ve modalın üstüne yeniden yerleşir. Konum sekme yakınlaştırmasına göre hesaplanır. Gizli pencereden açılırsa popup da gizli pencerede açılır.
- Yerleşik kaynakların tümü başarısız olup bu kaynağa otomatik geçildiyse pencere kendiliğinden açılmaz; modalda "Oynatıcı penceresinde aç" düğmesi gösterilir.
- VidSrc "Media not found" derse (VidSrc embed sayfası iç oynatıcının `MEDIA_NOT_FOUND` mesajını gömen sayfaya `postMessage` ile iletir; köken `https://vidsrc.sh` denetlenir) kaynak otomatik HDFilmCehennemi'ye geçer ve oynatıcı penceresi açılır. Bu adres sayfa açık kaldıkça hatırlanır; Oynat düğmesine yeniden basılınca doğrudan HDFilmCehennemi seçili gelir. Menüden VidSrc açıkça seçilirse yine önce VidSrc denenir. HDFC'ye sıçrama modal başına bir kezdir; sonrasında (ör. "Yedek kaynağa geç" VidSrc'ye döndüğünde) normal yedek sırası işler. Otomatik gelinen HDFC aramasında içerik bulunamazsa denenmemiş kaynaklarla devam edilir. Diğer kaynakların "bulunamadı" durumu algılanmaz.
- Modalda ayrıca "yeni sekmede aç" bağlantısı kalır. Modal kapatılınca açılır pencere kapanmaz.

Neden modal içinde değil (Kasım 2026'da ölçüldü): film sayfası `X-Frame-Options: SAMEORIGIN` ve `frame-ancestors 'self'` gönderiyor. Gömme oynatıcı (`hdfilmcehennemi.mobi/video/embed/…`) `frame-ancestors` ile yalnızca hdfilmcehennemi.nl'e izin veriyor ve Referer hdfilmcehennemi.nl değilse 404 döndürüyor. Bu eklenti bu çerçeveleme ve Referer korumalarını aşmaz. Alan adı değişirse `background.js` ve `manifest.json` içindeki `hdfilmcehennemi.nl` güncellenmelidir.

Doğrulama: arama + bölüm çözümleme mantığı 1.6.0'da gerçek siteye karşı denendi. 1.7.0 için `node --check` geçti; arka plan pencere mantığı sahte `chrome` nesnesiyle denendi (eşzamanlı açma, yeniden başlatma, gizli mod, URL/gönderen reddi). VidSrc'nin `MEDIA_NOT_FOUND` aktarımı embed sayfasının kaynağından okundu. Açılır pencerenin gerçek tarayıcıda açılması, konumu ve otomatik geçiş henüz denenmedi.


## IMDb Arşivi sayfası (1.8.0)

Araç çubuğundaki eklenti simgesine tıklanınca yeni sekmede `app.html` açılır: Netflix tarzı satırlar ve IMDb renkleriyle bir film/dizi arşivi.

- **Bugün Top 10 Film / Dizi:** IMDb'nin `/chart/moviemeter/` ve `/chart/tvmeter/` sayfalarındaki JSON-LD `ItemList` verisinden okunur (ad, kapak, puan, tür, açıklama) ve 6 saat önbelleğe alınır. IMDb bot doğrulaması isterse liste alınamaz; o zaman satırlar "Öne Çıkan" başlığıyla yerleşik 10 film + 10 dizi gösterir. Bu başlıkların ad ve kapakları öneri uç noktasından gelir. Doğrulamayı geçmek için IMDb'yi bir sekmede bir kez açıp arşiv sayfasını yenilemek yeterli olabilir.
- **Arama:** IMDb'nin öneri uç noktası kullanılır (`v3.sg.media-imdb.com/suggestion/x/<sorgu>.json`, IMDb arama kutusunun kullandığı uç nokta). Sonuçlar tür rozetli kapak ızgarasında görünür; yalnızca `tt` başlıkları listelenir.
- **Oynatma:** Bir başlığa tıklayınca ayrıntı penceresi açılır. Dizilerde sezon/bölüm seçilir ya da "Bölümü oynatıcıda seçeceğim" işaretlenir. Oynat, IMDb sayfasındaki oynatıcının aynısını (`content.js`) aynı pencerede açar: aynı kaynak sırası, yedek geçişi ve VidSrc "Media not found" olunca HDFilmCehennemi açılır penceresi. "IMDb’de aç" bağlantısı da bulunur.
- **Kısayollar:** `/` aramaya odaklanır; Esc aramayı temizler.
- **Yeni izinler:** `https://www.imdb.com/*` (listeler) ve `https://v3.sg.media-imdb.com/*` (arama) host izinleri ile `action` (simge).

Doğrulama: arayüz yerel bir test kopyasında, gerçek IMDb öneri yanıtları ve IMDb listesiyle aynı biçimdeki verilerle denendi. Vitrin, iki Top 10 satırı, "prison break" araması, ayrıntı penceresi, S2E3 ile VidSrc oynatıcısı (gerçek embed yüklendi), 2027 yapımı dizide gerçek VidSrc `MEDIA_NOT_FOUND` → HDFC otomatik geçişi, liste alınamadığında öne çıkanlar ve 375 px genişlik çalıştı. Eklentinin yüklü hâlinde denenmeyenler: simgeye tıklama, eklenti sayfasından IMDb isteklerinin host izniyle geçmesi, IMDb listesinin bot doğrulaması ve popup pencerenin gerçekten açılması.

## Oynatıcıda sezon/bölüm seçici (1.8.0)

Dizilerde oynatıcı araç çubuğunda **Sezon**, **Bölüm** seçicileri ve **Sonraki bölüm ›** düğmesi bulunur. Bu araç çubuğu hem IMDb sayfasında hem de arşiv sayfasında görünür.

- Liste önce IMDb bölüm sayfasından okunur (`/title/tt…/episodes/?season=N`). Video başlayınca VidSrc'nin gönderdiği `TV_INFO` (sitede gerçekten bulunan bölümler) bu listenin yerine geçer. İkisi de yoksa 1–20 sezon / 1–30 bölüm aralığı gösterilir.
- Seçim değişince tüm kaynak adresleri yeni bölümle yenilenir ve geçerli kaynak yeniden yüklenir. VidSrc oynarken bölüm değişikliği sayfa yenilenmeden `TV_SET` mesajıyla gönderilir. HDFilmCehennemi seçiliyse açılır pencere yeni bölüme gider.
- Bölüm VidSrc'nin kendi menüsünden değiştirilirse (`TV_STATE`) üstteki seçiciler de güncellenir.
- Oynatıcı Esc ile kapanır (odak video çerçevesinin içindeyken Esc çerçeveye gider; o zaman × düğmesi), açıkken arka sayfa kaydırılmaz ve aynı anda yalnızca bir oynatıcı açılır.
- VidSrc bölüm değişikliğini (TV_SET) 4 sn içinde onaylamazsa kaynak yeni bölüm adresiyle yeniden yüklenir. VidSrc'den gelen sezon/bölüm sayıları tam sayı ve üst sınırla doğrulanır.

Doğrulama: IMDb bölüm ayrıştırıcısı gerçek IMDb'de denendi (Prison Break: 5 sezon, S2'de 22 bölüm). Test kopyasında S2B3 açıldı, B5, Sonraki bölüm (B6) ve S4 seçimleri doğru VidSrc adreslerini yükledi; VidSrc başlığı "S04 E01" oldu. Oynatma başladıktan sonra gelen `TV_INFO` ve `TV_SET` yolu videoyu başlatmadan denenemedi.


## Güncelleme sistemi (1.9.0)

Chrome'un yerleşik otomatik güncellemesi yalnızca Chrome Web Mağazası'ndan ya da `update_url` + CRX ile çalışır; Windows ve macOS'ta mağaza dışı CRX yalnızca kurumsal ilkeyle kurulabilir. "Paketlenmemiş" yüklenen eklenti kendi dosyalarını değiştiremez. Bu yüzden:

- `update-banner.js` (tüm imdb.com sayfaları + arşiv) arka plandan `update-check` ister. `background.js` en fazla 6 saatte bir `raw.githubusercontent.com/confessyourcin/imdbarsiv/main/manifest.json` dosyasını okur; yalnızca `version` alanı kullanılır ve sayısal karşılaştırılır (1.10.0 > 1.9.0). Daha yeniyse sağ altta "Güncellensin mi?" kartı çıkar. "Sonra" o sürümü 24 saat erteler; × yalnızca o sekmede kapatır.
- "Evet" → `update.html`. "Şimdi güncelle": ilk seferde `showDirectoryPicker` ile eklenti klasörü seçilir (manifest adı ve `update.html` varlığıyla doğrulanır), tanıtıcı IndexedDB'de saklanır; sonraki seferlerde yalnızca `requestPermission` onayı istenir.
- `updater-core.js`: `codeload.github.com/.../zip/refs/heads/main` indirilir (host izni CORS'u aşar), merkezi dizin okunur, `DecompressionStream('deflate-raw')` ile açılır. Paket adı aynı ve sürümü daha yeni olmalı. `..`, mutlak yol, `.git`/`.github` atlanır. Dosyalar klasörün üzerine yazılır (silme yok), `manifest.json` en son yazılır, sonra okunarak doğrulanır.
- Yeniden başlatma: `chrome.runtime.reload()` öncesi `storage.local.upd.pendingReload` yazılır; servis çalışanı açılınca sürümü karşılaştırır ve `update.html?done=…` ya da `?failed=1` açar.
- Elle yol: zip indirip üzerine kopyalamak; sayfa `manifest.json`'u izler ve yeni sürümü görünce yeniden başlatır.

Doğrulama: çekirdek tarayıcıda OPFS hedefiyle denendi — boş GitHub deposu zip'i ("manifest.json yok"), başka eklenti adı, aynı sürüm ve `../` yolları reddedildi/atlandı; doğru paket 15 dosyayı 42 ms'de yazdı, ikili dosyalar bayt bayt aynı, alt klasör oluştu, yereldeki fazla dosya korundu. Güncelleme kartı ve sayfanın "yeni dosyalar bulundu → yeniden başlat" akışı test kopyasında çalıştı. Gerçek eklentide klasör seçici, izin kalıcılığı ve `chrome.runtime.reload()` sonrası yeni dosyaların yüklenmesi henüz denenmedi.


## 1.9.1

- Top 10 satırı pencereye sığar: kart genişliği satırın genişliğinden (kapsayıcı sorgusu, `cqi`) hesaplanır; 92 px (900 px altı ekranda 118 px) alt sınırın altında satır kaydırılır, sığınca oklar gizlenir. Sıra numarası kartla orantılı; "10" daha dar yazılır. Ölçüldü: 1900 px ve 1280 px'te 10 kart sığar, 1024 px ve 375 px'te kaydırma, sayfada yatay taşma yok.
- Güncelleyici: seçilen klasörün gerçekten Chrome'un yüklediği klasör olduğu yoklama dosyasıyla kanıtlanır (`updater-probe.txt` yazılır, `chrome.runtime.getURL` ile okunur, silinir) — eklentinin başka bir kopyası artık kabul edilmez. Kayıtlı klasör geçersizse unutulur ve aynı tıklamada seçici açılmaz. "Klasörü yeniden seç" düğmesi (güncelleme ve başarısız sayfası).
- `upd` durum yazmaları sıraya alınır ve alan bazında birleştirilir ("Sonra" ve `pendingReload` ezilmez). Ağ hatası `fetchError` olarak bildirilir ve 30 dk sonra yeniden denenir; 404 "sürüm yok" sayılır.
- Paket sınırları: zip ≤ 30 MB, açılmış toplam ≤ 60 MB, her girdinin açılmış boyutu merkezi dizindekiyle birebir aynı olmalı. Windows'a ayrılmış adlar (CON, NUL, COM1…), sonu nokta/boşluk olan adlar, `.git`, `.github` ve kökte `_` ile başlayan adlar (`_locales` hariç) yazılmaz. Sürüm parçaları ≤ 65535.
- TV_SET beklenirken oynatıcının bildirdiği eski bölüm seçimi geri almaz; onay ya da 4 sn zaman aşımı beklenir.
- Güncelleme kartı oynatıcı overlay'inin altında kalır.
- Güncelleme sayfası sadeleşti: "İlk güncellemede bir kez" açıklaması ve "elle güncelle" bölümü (zip bağlantısı, manifest izleme) kaldırıldı. "Klasörü yeniden seç" seçme penceresini tıklamanın ilk adımı olarak hemen açar, klasör doğrulanınca güncellemeyi başlatır; başarısız sayfasındaki aynı düğme seçtirip `update.html?auto=1` ile güncellemeyi kendiliğinden başlatır.


## 1.9.3

- Sürüm denetimi anlık: `raw.githubusercontent.com` dal adresini ~5 dk önbellekte tutuyor ve sorgu dizesini (`?t=…`) yok sayıyor (ölçüldü: yeni `?t=` ile istek de `X-Cache: HIT`). Artık önce `api.github.com/repos/<repo>/commits/main` (`Accept: application/vnd.github.sha`, önbelleksiz) ile son commit kimliği alınır; `manifest.json` `raw.githubusercontent.com/<repo>/<sha>/manifest.json` adresinden, güncelleme zip'i `codeload.github.com/<repo>/zip/<sha>` adresinden okunur. Görülen sürümle indirilen paket aynı commit'tir. API'ye ulaşılamazsa (kimliksiz istekte saatte 60 sınırı) dal adresine düşülür; o durumda sonuç birkaç dakika eski olabilir.
- Arşiv alt bilgisindeki GitHub bağlantısı kaldırıldı (GitHub'daki 1.9.2 ile eşitlendi).
- Güncelleme kartında "Sonra" yerine **Hayır**: kart yalnızca o sayfa için gizlenir; F5'te ya da başka sayfaya geçince (IMDb'nin yeniden yüklemesiz geçişleri dahil, adres 1 sn'de bir denetlenir) yeniden gelir. × aynı davranır. 24 saatlik erteleme (`update-snooze`, `upd.snooze`) ve sekme bazlı `sessionStorage` gizleme kaldırıldı.
