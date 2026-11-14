# CLAUDE.md

Bu depo için ortak ajan rehberi AGENTS.md dosyasındadır; Claude Code onu buradan içe aktarır:

@AGENTS.md

## Claude Code'a özel notlar

- Kullanıcıyla Türkçe konuş; kod yorumları ve arayüz metinleri de Türkçe.
- Bir değişikliği "bitti" saymadan önce AGENTS.md → *Doğrulama* bölümündeki `node --check` döngüsünü çalıştır ve sonucu söyle. Tarayıcıda denemediğin davranışı "çalışıyor" diye raporlama; "denenmedi" de.
- `content.js` büyük (≈950 satır). Önce `grep -n` ile ilgili fonksiyonu bul, sonra yalnızca o aralığı oku.
- `showModal` içindeki kapanış değişkenlerine (`current`, `attempted`, `generation`, `jumpedToHdfc`, `vidsrcLive`, `pendingSet`) dokunan değişikliklerde yedeğe geçiş ve "Media not found" akışını da düşün: sonsuz döngü ya da ulaşılamayan kaynak olmamalı.
- Dağıtım zip'lerini (`imdbarsiv-*.zip`) depoya ekleme; güncelleyici depo kökünü olduğu gibi kullanıcı klasörüne yazar.
- Commit ve push yalnızca kullanıcı isterse.
