/**
 * IRA MEDIA CONCEPTS - PWA Registration & Install Controller
 * - Registers /sw.js once with root scope '/'.
 * - Manages beforeinstallprompt (Chrome, Edge, Android) and iOS Add to Home Screen modal.
 * - Shows Install App buttons only when installation is available and hides them once installed.
 */

(function () {
    'use strict';

    // Avoid duplicate initialization if script is accidentally loaded more than once
    if (window.__iraPwaInitialized) return;
    window.__iraPwaInitialized = true;

    const isStandalone = () =>
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.startsWith('android-app://');

    const isIOS = () => {
        const ua = window.navigator.userAgent || '';
        return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    };

    if (isStandalone()) {
        document.documentElement.classList.add('pwa-standalone');
    }

    // Register Service Worker once at root scope
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then(function (registration) {
                    registration.update().catch(function () {});
                })
                .catch(function (err) {
                    console.warn('Service Worker registration failed:', err);
                });
        });
    }

    let deferredPrompt = null;

    function getInstallButtons() {
        return document.querySelectorAll('[data-pwa-install]');
    }

    function showInstallButtons() {
        if (isStandalone()) return;
        getInstallButtons().forEach(function (btn) {
            btn.style.display = btn.getAttribute('data-install-display') || 'inline-flex';
        });
    }

    function hideInstallButtons() {
        getInstallButtons().forEach(function (btn) {
            btn.style.display = 'none';
        });
    }

    function openIosInstallModal() {
        if (typeof showModal === 'function') {
            showModal('iosInstallModal');
        } else {
            const modal = document.getElementById('iosInstallModal');
            if (modal) modal.classList.add('active');
        }
    }

    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredPrompt = e;
        if (!isStandalone()) {
            showInstallButtons();
        }
    });

    window.addEventListener('appinstalled', function () {
        deferredPrompt = null;
        hideInstallButtons();
        document.documentElement.classList.add('pwa-standalone');
    });

    document.addEventListener('DOMContentLoaded', function () {
        if (isStandalone()) {
            hideInstallButtons();
            return;
        }

        // iOS does not fire beforeinstallprompt; offer Add to Home Screen instructions
        if (isIOS()) {
            showInstallButtons();
        } else if (deferredPrompt) {
            showInstallButtons();
        } else {
            hideInstallButtons();
        }

        getInstallButtons().forEach(function (btn) {
            btn.addEventListener('click', async function () {
                const navMenu = document.getElementById('nav-menu');
                const navToggle = document.getElementById('nav-toggle');
                if (navMenu && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    if (navToggle) navToggle.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                }
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    try {
                        const choiceResult = await deferredPrompt.userChoice;
                        if (choiceResult && choiceResult.outcome === 'accepted') {
                            hideInstallButtons();
                        }
                    } catch (err) {
                        console.warn('Install prompt error:', err);
                    }
                    deferredPrompt = null;
                } else if (isIOS()) {
                    openIosInstallModal();
                }
            });
        });
    });
})();
