// js/config.js

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE_URL = isLocalHost
  ? 'http://localhost:3000'
  : 'https://kheng-physiocare-api.onrender.com';
window.API_BASE_URL = API_BASE_URL;
window.FACEBOOK_APP_ID = window.FACEBOOK_APP_ID || '';

// Wake up backend before API pages continue.
(function initServerWakeupGate() {
  if (window.__serverWakeupInstalled) return;
  window.__serverWakeupInstalled = true;

  const originalFetch = window.fetch.bind(window);
  const maxAttempts = 40;
  const retryDelayMs = 1500;
  const wakeKey = '__kheng_api_awake';
  const minOverlayMs = 800;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isApiRequest(input) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (!url) return false;
    return url.startsWith(API_BASE_URL) || /\/api\//.test(url);
  }

  function ensureOverlay() {
    if (document.getElementById('server-wakeup-overlay')) return;
    const style = document.createElement('style');
    style.id = 'server-wakeup-style';
    style.textContent = `
      #server-wakeup-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(9, 18, 34, 0.28);
        -webkit-backdrop-filter: blur(8px);
        backdrop-filter: blur(8px);
        color: #f3f7ff;
        font-family: Poppins, Arial, sans-serif;
        opacity: 1;
        transition: opacity 0.28s ease;
      }
      #server-wakeup-overlay .panel {
        width: min(90vw, 320px);
        border: 1px solid rgba(255, 255, 255, 0.45);
        background: rgba(255, 255, 255, 0.68);
        border-radius: 14px;
        padding: 18px;
        text-align: center;
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.18);
        transform: translateY(0);
        transition: transform 0.28s ease, opacity 0.28s ease;
      }
      #server-wakeup-overlay .spinner {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        margin: 0 auto 12px;
        border: 3px solid rgba(0, 51, 160, 0.2);
        border-top-color: #0033a0;
        animation: serverWakeSpin 0.9s linear infinite;
      }
      #server-wakeup-overlay .title {
        color: #0c2a5a;
        font-size: 1rem;
        margin-bottom: 2px;
        font-weight: 700;
      }
      #server-wakeup-overlay .status {
        color: #3a4a66;
        font-size: 0.88rem;
      }
      #server-wakeup-overlay.is-hiding {
        opacity: 0;
      }
      #server-wakeup-overlay.is-hiding .panel {
        transform: translateY(8px);
        opacity: 0;
      }
      @keyframes serverWakeSpin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'server-wakeup-overlay';
    overlay.innerHTML = `
      <div class="panel">
        <div class="spinner"></div>
        <div class="title">Loading...</div>
        <div class="status" id="server-wakeup-status">Please wait</div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function updateStatus(text) {
    const statusEl = document.getElementById('server-wakeup-status');
    if (statusEl) statusEl.textContent = text;
  }

  function hideOverlay() {
    const overlay = document.getElementById('server-wakeup-overlay');
    if (!overlay) return;
    overlay.classList.add('is-hiding');
    setTimeout(() => {
      const style = document.getElementById('server-wakeup-style');
      if (style) style.remove();
      overlay.remove();
    }, 300);
  }

  const wakePromise = (async () => {
    if (document.readyState === 'loading') {
      await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }

    const startedAt = Date.now();
    ensureOverlay();
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await originalFetch(`${API_BASE_URL}/api/test`, { cache: 'no-store' });
                if (response.ok) {
          const elapsed = Date.now() - startedAt;
          if (elapsed < minOverlayMs) {
            await sleep(minOverlayMs - elapsed);
          }
          sessionStorage.setItem(wakeKey, '1');
          hideOverlay();
          return true;
        }
      } catch (_) {
        // Keep retrying
      }
      await sleep(retryDelayMs);
    }

    updateStatus('Loading...');
    while (true) {
      try {
        const response = await originalFetch(`${API_BASE_URL}/api/test`, { cache: 'no-store' });
                if (response.ok) {
          const elapsed = Date.now() - startedAt;
          if (elapsed < minOverlayMs) {
            await sleep(minOverlayMs - elapsed);
          }
          sessionStorage.setItem(wakeKey, '1');
          hideOverlay();
          return true;
        }
      } catch (_) {}
      await sleep(retryDelayMs);
    }
  })();

  window.fetch = async function gatedFetch(input, init) {
    if (isApiRequest(input)) {
      await wakePromise;
    }
    return originalFetch(input, init);
  };
})();
