/**
 * CausalFunnel User Analytics Tracking SDK
 * Standalone Vanilla JavaScript SDK
 */
(function (window, document) {
    'use strict';

    if (window.__CF_TRACKER_INITIALIZED__) {
        return;
    }
    window.__CF_TRACKER_INITIALIZED__ = true;

    var currentScript = document.currentScript;
    var configAttrUrl = currentScript ? currentScript.getAttribute('data-api-url') : null;
    var globalConfig = window.CF_ANALYTICS_CONFIG || {};

    var CONFIG = {
        apiUrl: (configAttrUrl || globalConfig.apiUrl || 'http://127.0.0.1:5000/api').replace(/\/+$/, ''),
        sessionStorageKey: 'cf_analytics_session_id',
        debug: Boolean(globalConfig.debug || false)
    };

    function log(msg, data) {
        if (CONFIG.debug && window.console && console.log) {
            console.log('[CF-Tracker] ' + msg, data || '');
        }
    }

    function generateUUID() {
        if (window.crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }

    function getSessionId() {
        try {
            var existingSession = window.sessionStorage.getItem(CONFIG.sessionStorageKey);
            if (existingSession && existingSession.trim().length > 0) {
                return existingSession;
            }
            var newSession = generateUUID();
            window.sessionStorage.setItem(CONFIG.sessionStorageKey, newSession);
            return newSession;
        } catch (e) {
            log('Storage access restricted, using memory session:', e);
            if (!window.__cf_fallback_session_id) {
                window.__cf_fallback_session_id = generateUUID();
            }
            return window.__cf_fallback_session_id;
        }
    }

    function getDimensions() {
        return {
            viewport: {
                width: window.innerWidth || document.documentElement.clientWidth || 0,
                height: window.innerHeight || document.documentElement.clientHeight || 0
            },
            document: {
                width: Math.max(document.body ? document.body.scrollWidth : 0, document.documentElement.scrollWidth || 0),
                height: Math.max(document.body ? document.body.scrollHeight : 0, document.documentElement.scrollHeight || 0)
            }
        };
    }

    function sendEvent(payload) {
        var endpoint = CONFIG.apiUrl + '/events';
        var dataString = JSON.stringify(payload);

        try {
            if (window.fetch) {
                fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: dataString,
                    keepalive: true
                }).then(function (res) {
                    if (CONFIG.debug) {
                        log('Event sent successfully: ' + payload.eventType, res.status);
                    }
                }).catch(function (err) {
                    log('Event dispatch failed: ' + err.message);
                });
            } else if (navigator.sendBeacon) {
                var blob = new Blob([dataString], { type: 'application/json' });
                navigator.sendBeacon(endpoint, blob);
            }
        } catch (err) {
            log('Exception in sendEvent:', err);
        }
    }

    function trackPageView() {
        try {
            var dims = getDimensions();
            var payload = {
                sessionId: getSessionId(),
                eventType: 'page_view',
                pageUrl: window.location.href,
                timestamp: new Date().toISOString(),
                viewport: dims.viewport,
                title: document.title || ''
            };
            log('Tracking page_view', payload);
            sendEvent(payload);
        } catch (e) {
            log('Error tracking page_view:', e);
        }
    }

    function isSensitiveElement(el) {
        if (!el || !el.tagName) return false;
        var tag = el.tagName.toLowerCase();
        if (tag === 'input') {
            var type = (el.getAttribute('type') || 'text').toLowerCase();
            if (type === 'password' || type === 'hidden') return true;
        }
        if (el.hasAttribute('data-analytics-ignore') || el.hasAttribute('data-private')) {
            return true;
        }
        return false;
    }

    function extractTargetInfo(el) {
        if (!el) return {};
        var tag = el.tagName ? el.tagName.toUpperCase() : 'UNKNOWN';
        var text = '';
        if (tag === 'BUTTON' || tag === 'A' || tag === 'SPAN') {
            text = (el.innerText || el.textContent || '').trim().substring(0, 60);
        }
        return {
            targetTag: tag,
            targetText: text,
            targetId: el.id ? el.id.substring(0, 40) : undefined,
            targetClass: el.className && typeof el.className === 'string' ? el.className.substring(0, 60) : undefined
        };
    }

    function trackClick(e) {
        try {
            var target = e.target || e.srcElement;
            if (isSensitiveElement(target)) {
                return;
            }

            var dims = getDimensions();
            var pageX = typeof e.pageX === 'number' ? e.pageX : (e.clientX + (document.documentElement.scrollLeft || document.body.scrollLeft || 0));
            var pageY = typeof e.pageY === 'number' ? e.pageY : (e.clientY + (document.documentElement.scrollTop || document.body.scrollTop || 0));

            var targetInfo = extractTargetInfo(target);

            var payload = {
                sessionId: getSessionId(),
                eventType: 'click',
                pageUrl: window.location.href,
                timestamp: new Date().toISOString(),
                clickCoordinates: {
                    x: Math.round(pageX * 100) / 100,
                    y: Math.round(pageY * 100) / 100
                },
                viewport: dims.viewport,
                targetTag: targetInfo.targetTag,
                targetText: targetInfo.targetText,
                targetId: targetInfo.targetId
            };

            log('Tracking click', payload);
            sendEvent(payload);

            if (window.dispatchEvent && window.CustomEvent) {
                window.dispatchEvent(new CustomEvent('cf:click_tracked', { detail: payload }));
            }
        } catch (err) {
            log('Error tracking click:', err);
        }
    }

    function init() {
        trackPageView();
        document.addEventListener('click', trackClick, true);
        log('Tracker initialized with session:', getSessionId());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.CausalFunnelTracker = {
        getSessionId: getSessionId,
        trackPageView: trackPageView,
        trackEvent: sendEvent,
        getConfig: function () { return CONFIG; }
    };

})(window, document);
