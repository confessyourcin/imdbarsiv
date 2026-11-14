# IMDb Arşiv

IMDb sayfalarına oynatıcı ekleyen ve kendi film/dizi arşivi sayfası olan bir Chrome eklentisi. Netflix tarzı arayüz, IMDb verisi, tek pencerede oynatma ve tarayıcı içinden güncelleme.

> IMDb ile resmi bir bağı yoktur. Eklenti hiçbir video barındırmaz; üçüncü taraf oynatıcıları gösterir. Bu kaynakların kullanımı ve yasallığı kullanıcının sorumluluğundadır.

## Özellikler

- **IMDb sayfasında oynat** — Film ve dizi sayfalarına *Play* düğmesi ve kaynak menüsü eklenir. Oynatıcı aynı sayfada açılır.
- **Tek Kaynak listesi** — VidSrc, VidAPI / VAPlayer, IMDb Player, VidSrc.mov, Braflix, Nxsha, EmbedMaster, VidCore, VixSrc, VidSrc.party, VidSrc.buzz, EmbedBandit, VidZen ve en sonda HDFilmCehennemi. Ayrı Servers menüsü kaldırıldı. Dizide bölüm değişince bütün adresler yeni bölümle yenilenir.
- **Otomatik yedek** — Açık iframe kendi kökeninden `MEDIA_NOT_FOUND` bildirirse, iframe yükleme hatasında veya yükleme zaman aşımında sıradaki denenmemiş iframe kaynağı açılır. Bunlar tükenince HDFilmCehennemi aranır; içerik/bölüm bulunursa ayrı oynatıcı penceresi açılır. Bütün kaynaklar başarısızsa döngü durur. İç hatasını bildirmeyen yüklenmiş iframe'lerde "Yedek kaynağa geç" kullanılmalıdır; sayfanın yüklenmesi video oynadığı anlamına gelmez.
- **Sezon / bölüm seçici** — Dizilerde oynatıcı panelinde Sezon, Bölüm ve *Sonraki bölüm ›* düğmesi bulunur.
- **IMDb Arşivi sayfası** — Araç çubuğundaki eklenti simgesine tıkla:
  - Bugün en popüler **Top 10 film** ve **Top 10 dizi** (IMDb'den, kapak ve puanlarıyla)
  - IMDb araması: yaz, kapaklı sonuçlardan seç, oynat
  - `/` aramaya odaklanır, `Esc` temizler / oynatıcıyı kapatır
- **Otomatik güncelleme bildirimi** — GitHub'da yeni sürüm çıkınca IMDb'ye girdiğinde "Güncellensin mi?" diye sorar; tek tıkla güncellenir.

## Dil ve görünüm

Arşiv oynatıcısında sezon/bölüm listesi önce IMDb'den alınır. IMDb verisi boşsa veya alınamazsa IMDb kimliğiyle TVmaze denenir; VidSrc'nin gönderdiği gerçek liste her zaman önceliklidir. TVmaze yanıtı bir saat önbellekte tutulur; farklı kaynakların sezon düzenleri birleştirilmez. TVmaze bölüm verisi [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) lisanslıdır; kaynak: [TVmaze](https://www.tvmaze.com/). Yeni bölümün listelenmesi oynatıcıda hazır olduğunu garanti etmez.

Arşiv sayfası ilk açılışta **EN** ve karanlık temayla başlar. Sağ üstteki **TR / EN** düğmeleri içerik ve arayüz dilini, güneş/ay düğmesi temayı değiştirir. Son seçimin bu tarayıcıda saklanır.

Dizi adları özgün dilinde kalır. Film adları ve açıklamalar TMDB'den seçilen dilde alınır; tür adları TR seçiliyken yerelde Türkçeleştirilir. TMDB yanıt vermezse, hata döndürürse veya ilgili alan boşsa mevcut IMDb adı ve açıklaması korunur. TMDB için ayrı bir ayar ekranı yoktur; varsayılan API anahtarı kodda tanımlıdır.

## Kurulum (ilk kez)

1. Bu sayfada **Code → Download ZIP** ile indir.
2. Zip'i **kalıcı** bir klasöre çıkar (ör. `Belgeler\imdbarsiv`). Bu klasörü sonra silme ya da taşıma; Chrome eklentiyi buradan yükler.
3. Chrome'da `chrome://extensions` adresini aç (Edge: `edge://extensions`).
4. Sağ üstten **Geliştirici modu**nu aç.
5. **Paketlenmemiş öğe yükle** → çıkardığın klasörü seç (içinde `manifest.json` olan klasör).
6. Araç çubuğundaki yapboz simgesinden eklentiyi **sabitle**; simgeye tıklayınca arşiv açılır.

## Güncelleme

Yeni sürüm çıktığında IMDb'de sağ altta bir kart görünür. **Hayır** (ya da ×) kartı yalnızca o sayfada gizler; sayfayı yenileyince ya da başka sayfaya geçince kart yeniden gelir.

1. **Evet, güncelle** → güncelleme sayfası açılır.
2. **Şimdi güncelle**'ye bas.
3. *Yalnızca ilk seferde:* Chrome bir klasör seçme penceresi açar. Eklentiyi yüklediğin klasörü seç ve **Dosyaları düzenle** iznini onayla. Sonraki güncellemelerde yalnızca bu izin onayı istenir.
4. Sayfa yeni sürümü indirir, doğrular, klasöre yazar ve eklentiyi yeniden başlatır. Açık IMDb sekmelerini yenile.

Kart çıkmadıysa: arşiv sayfasının altındaki **Güncellemeleri denetle** bağlantısı.

Neden tamamen sessiz değil? Chrome, Web Mağazası dışından elle yüklenen eklentilerin kendini güncellemesine izin vermiyor. Bu eklenti dosyaları senin onayınla, Chrome'un dosya erişimi izniyle yazar; komut dosyası ya da program çalıştırmaz.

**Elle güncelleme (yedek yol):** zip'i indir, içindeki `imdbarsiv-main` klasörünün **içindekileri** eklenti klasörünün üzerine kopyala (dosyaların üzerine yaz), sonra `chrome://extensions` sayfasında eklentinin yenile (⟳) düğmesine bas.

## Sorun giderme

| Sorun | Çözüm |
|---|---|
| IMDb'de Play düğmesi yok | `chrome://extensions` → eklentiyi yenile (⟳), sonra IMDb sekmesini yenile |
| Arşivde "Öne Çıkan" yazıyor, Top 10 gelmiyor | IMDb bot doğrulaması istemiş olabilir. imdb.com'u bir sekmede açıp arşivi yenile |
| Video "Media not found" | Kaynak kendiliğinden HDFilmCehennemi'ye geçer; olmazsa *Yedek kaynağa geç* |
| HDFilmCehennemi penceresi açılmadı | Oynatıcıdaki *Oynatıcı penceresinde aç* düğmesi ya da *yeni sekmede aç* bağlantısı |
| Güncellemede "Chrome'un bu eklentiyi yüklediği klasör değil" | Eklentinin başka bir kopyası seçilmiş. Eklentiler sayfasında **Ayrıntılar → Kaynak** satırındaki klasörü seç; gerekirse güncelleme sayfasında **Klasörü yeniden seç** |
| Güncelleme sonrası "Chrome eski sürümü yükledi" | `chrome://extensions` → eklentinin yenile (⟳) düğmesi |

## İzinler

| İzin | Neden |
|---|---|
| `imdb.com` | Oynatıcı düğmeleri, Top 10 listeleri, bölüm listeleri |
| `v3.sg.media-imdb.com` | IMDb arama önerileri |
| `hdfilmcehennemi.nl` | HDFilmCehennemi'de IMDb kimliğiyle arama |
| `codeload.github.com` | Güncelleme zip'ini indirme |
| `api.themoviedb.org` | Kullanıcı TMDB API anahtarı eklerse Türkçe ad ve açıklamaları alma |
| `api.tvmaze.com` | Arşiv oynatıcısında IMDb sezon/bölüm listesi alınamazsa yedek bölüm verisi |
| `vidsrc.mov/embed/*` (içerik betiği) | İç VidSrc iframe'inin bulunamadı mesajını ana oynatıcıya aktarma; sayfa içeriği değiştirilmez |
| `storage` | Güncelleme denetim zamanı ve "sonra" tercihi |
| `activeTab` | Etkin sekmede çalışma |

Eklenti kişisel veri toplamaz. İzlemek istediğin başlığın IMDb kimliği, oynatmak için seçilen kaynağa (VidSrc, VAPlayer, IMDb Player, VidSrc.mov ya da Servers listesinden seçilen sunucu) ve HDFilmCehennemi aramasına gider; aramalar IMDb'ye gider. Güncelleme denetimi yalnızca GitHub'dan bu deponun son commit kimliğini ve o commit'teki `manifest.json` dosyasını okur.

## Yeni sürüm yayınlama (geliştirici için)

1. `manifest.json` içindeki `"version"` değerini artır (ör. `1.9.0` → `1.9.1`).
2. Dosyaları bu deponun **kök dizinine**, `main` dalına yükle. Alt klasöre yüklersen güncelleme bulunamaz.
3. `manifest.json` içindeki `"name"` alanını değiştirme; güncelleyici paketi bu adla doğrular.
4. Kullanıcılar IMDb'ye girince en geç 6 saat içinde güncelleme kartını görür; güncelleme sayfası ve “Güncellemeleri denetle” ise her açılışta anlık denetler (bağlantı hatasında 30 dk sonra yeniden denenir). `main`'e her gönderim kullanıcılara gider; yarım işi ayrı dalda tut.

Teknik notlar: [NOTLAR.md](NOTLAR.md)

## Lisans

[MIT](LICENSE)
