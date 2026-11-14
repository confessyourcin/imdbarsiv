(function () {
    'use strict';
    function read(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; } }
    function save(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* oturumda uygula */ } }
    const language = read('imdb-archive:language', 'en') === 'tr' ? 'tr' : 'en';
    let theme = read('imdb-archive:theme', 'dark') === 'light' ? 'light' : 'dark';
    const t = (tr, en) => language === 'en' ? en : tr;
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    window.ArchivePreferences = { language, t };
    document.addEventListener('DOMContentLoaded', () => {
        document.title = t('IMDb Arşivi', 'IMDb Archive');
        document.querySelectorAll('[data-tr][data-en]').forEach(node => { node.textContent = node.dataset[language]; });
        const labels = {
            brand: ['Ana sayfa', 'Home'], 'search-input': ['Film veya dizi ara', 'Search movies or series'],
            'search-clear': ['Aramayı temizle', 'Clear search'], 'detail-close': ['Kapat', 'Close']
        };
        for (const [id, values] of Object.entries(labels)) document.getElementById(id).setAttribute('aria-label', t(...values));
        document.getElementById('search-input').placeholder = t('Film veya dizi ara (ör. Prison Break)', 'Search movies or series (e.g. Prison Break)');
        document.querySelectorAll('.rail-btn').forEach(node => node.setAttribute('aria-label', node.classList.contains('prev') ? t('Geri kaydır', 'Scroll back') : t('İleri kaydır', 'Scroll forward')));
        const button = document.getElementById('theme-toggle');
        function applyTheme() {
            document.documentElement.dataset.theme = theme;
            const label = theme === 'dark' ? t('Aydınlık moda geç', 'Switch to light mode') : t('Karanlık moda geç', 'Switch to dark mode');
            button.setAttribute('aria-label', label);
            button.title = label;
            button.setAttribute('aria-pressed', String(theme === 'light'));
        }
        applyTheme();
        button.addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; save('imdb-archive:theme', theme); applyTheme(); });
        document.querySelectorAll('[data-language]').forEach(node => {
            node.setAttribute('aria-pressed', String(node.dataset.language === language));
            node.addEventListener('click', () => {
                if (node.dataset.language === language) return;
                save('imdb-archive:language', node.dataset.language);
                location.reload();
            });
        });
    });
})();
