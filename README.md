# IMDb Arşiv

IMDb sayfalarına oynatıcı ekleyen ve kendi film/dizi arşivi sayfası olan bir Chrome eklentisi. Netflix tarzı arayüz, IMDb verisi, tek pencerede oynatma ve tarayıcı içinden güncelleme.

> IMDb ile resmi bir bağı yoktur. Eklenti hiçbir video barındırmaz; üçüncü taraf oynatıcıları gösterir. Bu kaynakların kullanımı ve yasallığı kullanıcının sorumluluğundadır.

## Özellikler

- **IMDb sayfasında oynat** — Film ve dizi sayfalarına *Play* düğmesi ve kaynak menüsü eklenir. Oynatıcı aynı sayfada açılır.
- **Yedek kaynaklar** — VidSrc, VidAPI / VAPlayer, IMDb Player, VidSrc.mov. Bir kaynak açılmazsa sıradakine geçilir.
- **"Media not found" olunca HDFilmCehennemi** — VidSrc içeriği bulamazsa kaynak kendiliğinden HDFilmCehennemi'ye geçer ve oynatıcı boyutunda bir pencerede açılır. Site kendi oynatıcısının başka sayfalara gömülmesine izin vermediği için ayrı pencere kullanılır.
- **Sezon / bölüm seçici** — Dizilerde oynatıcı panelinde Sezon, Bölüm ve *Sonraki bölüm ›* düğmesi bulunur.
- **IMDb Arşivi sayfası** — Araç çubuğundaki eklenti simgesine tıkla:
  - Bugün en popüler **Top 10 film** ve **Top 10 dizi** (IMDb'den, kapak ve puanlarıyla)
  - IMDb araması: yaz, kapaklı sonuçlardan seç, oynat
  - `/` aramaya odaklanır, `Esc` temizler / oynatıcıyı kapatır
- **Otomatik güncelleme bildirimi** — GitHub'da yeni sürüm çıkınca IMDb'ye girdiğinde "Güncellensin mi?" diye sorar; tek tıkla güncellenir.

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
| `storage` | Güncelleme denetim zamanı ve "sonra" tercihi |
| `activeTab` | Etkin sekmede çalışma |

Eklenti kişisel veri toplamaz. İzlemek istediğin başlığın IMDb kimliği, oynatmak için seçilen kaynağa (VidSrc, VAPlayer, IMDb Player, VidSrc.mov) ve HDFilmCehennemi aramasına gider; aramalar IMDb'ye gider. Güncelleme denetimi yalnızca GitHub'dan bu deponun son commit kimliğini ve o commit'teki `manifest.json` dosyasını okur.

## Yeni sürüm yayınlama (geliştirici için)

1. `manifest.json` içindeki `"version"` değerini artır (ör. `1.9.0` → `1.9.1`).
2. Dosyaları bu deponun **kök dizinine**, `main` dalına yükle. Alt klasöre yüklersen güncelleme bulunamaz.
3. `manifest.json` içindeki `"name"` alanını değiştirme; güncelleyici paketi bu adla doğrular.
4. Kullanıcılar IMDb'ye girince en geç 6 saat içinde güncelleme kartını görür; güncelleme sayfası ve “Güncellemeleri denetle” ise her açılışta anlık denetler (bağlantı hatasında 30 dk sonra yeniden denenir). `main`'e her gönderim kullanıcılara gider; yarım işi ayrı dalda tut.

Teknik notlar: [NOTLAR.md](NOTLAR.md)

## Lisans

[MIT](LICENSE)
