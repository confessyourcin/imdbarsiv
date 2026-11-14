// VidSrc.mov sarmalayıcısındaki iç VidSrc iframe'inin bulunamadı mesajını aktarır.
(function () {
    'use strict';
    if (location.hostname !== 'vidsrc.mov' || window.parent === window) return;
    window.addEventListener('message', event => {
        if (event.origin !== 'https://vidsrc.sh' || !event.data || event.data.type !== 'MEDIA_NOT_FOUND') return;
        const frame = Array.from(document.querySelectorAll('iframe')).find(frame => {
            try { return new URL(frame.src).origin === 'https://vidsrc.sh' && event.source === frame.contentWindow; }
            catch (e) { return false; }
        });
        if (!frame) return;
        // Üst oynatıcı ayrıca bu iframe'in kaynağını ve vidsrc.mov kökenini doğrular.
        window.parent.postMessage({ type: 'MEDIA_NOT_FOUND' }, '*');
    });
})();
