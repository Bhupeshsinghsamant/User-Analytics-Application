/**
 * User Analyser - Web Analytics Tracking SDK
 * Standalone Vanilla JavaScript SDK
 * 
 * Features:
 * - Tab-scoped session management via sessionStorage (reused across navigations)
 * - Automatic page_view event with deduplication
 * - Click tracking with document-relative coordinates, viewport dimensions, and normalized scaling
 * - Privacy protection: ignores password/hidden inputs and elements marked with data-analytics-ignore
 * - Non-blocking: failures never crash or disrupt the host website
 */
(function (window, document) {
    'use strict';

    // Prevent duplicate SDK initialization
    if (window.__USER_ANALYSER_INITIALIZED__ || window.__CF_TRACKER_INITIALIZED__) {
        return;
    }
    window.__USER_ANALYSER_INITIALIZED__ = true;
    window.__CF_TRACKER_INITIALIZED__ = true;

    // Detect configuration from script tag attributes or global object
    var currentScript = document.currentScript;
    var configAttrUrl = currentScript ? currentScript.getAttribute('data-api-url') : null;
    var globalConfig = window.USER_ANALYSER_CONFIG || window.CF_ANALYTICS_CONFIG || {};

    var CONFIG = {
        apiUrl: (configAttrUrl || globalConfig.apiUrl || 'http://127.0.0.1:5000/api').replace(/\/+$/, ''),
        sessionStorageKey: globalConfig.sessionStorageKey || 'user_analyser_session_id',
        debug: Boolean(globalConfig.debug || false)
    };

    /**
     * Helper to log debug messages when debug mode is enabled
     */
    function log(msg, data) {
        if (CONFIG.debug && window.console && console.log) {
            console.log('[User Analyser] ' + msg, data || '');
        }
    }

    /**
     * Generates a RFC4122 v4 UUID or cryptographic random fallback
     */
    function generateUUID() {
        if (window.crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }

    /**
     * Retrieves or generates a persistent session ID for the current browser tab
     */
    function getSessionId() {
        try {
            var existingSession = window.sessionStorage.getItem(CONFIG.sessionStorageKey) || window.sessionStorage.getItem('cf_analytics_session_id');
            if (existingSession && existingSession.trim().length > 0) {
                window.sessionStorage.setItem(CONFIG.sessionStorageKey, existingSession);
                return existingSession;
            }
            var newSession = generateUUID();
            window.sessionStorage.setItem(CONFIG.sessionStorageKey, newSession);
            return newSession;
        } catch (e) {
            log('Storage access restricted, using memory session:', e);
            if (!window.__user_analyser_fallback_session_id) {
                window.__user_analyser_fallback_session_id = window.__cf_fallback_session_id || generateUUID();
            }
            return window.__user_analyser_fallback_session_id;
        }
    }

    /**
     * Gets current viewport and document dimensions
     */
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

    /**
     * Dispatches event payload to the Flask backend
     */
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
            // Suppress error so host application never crashes
            log('Exception in sendEvent:', err);
        }
    }

    /**
     * Records a page_view event
     */
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

    /**
     * Determines whether an element or its input type is sensitive
     */
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

    /**
     * Extracts non-sensitive descriptive metadata from click target
     */
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

    /**
     * Records a click event
     */
    function trackClick(e) {
        try {
            var target = e.target || e.srcElement;
            if (isSensitiveElement(target)) {
                return;
            }

            var dims = getDimensions();
            // Document-relative coordinates including scroll offset
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

            // Dispatch visual feedback events (User Analyser with backward-compatible alias)
            if (window.dispatchEvent && window.CustomEvent) {
                window.dispatchEvent(new CustomEvent('user_analyser:click_tracked', { detail: payload }));
                window.dispatchEvent(new CustomEvent('cf:click_tracked', { detail: payload }));
            }
        } catch (err) {
            log('Error tracking click:', err);
        }
    }

    // Initialize Tracker
    function init() {
        // Track immediate pageview
        trackPageView();

        // Listen for global clicks
        document.addEventListener('click', trackClick, true);

        log('Tracker initialized with session:', getSessionId());
    }

    // Wait for DOM ready or execute immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose programmatic API with backward-compatible aliases
    var publicApi = {
        getSessionId: getSessionId,
        trackPageView: trackPageView,
        trackEvent: sendEvent,
        getConfig: function () { return CONFIG; }
    };

    window.UserAnalyserTracker = publicApi;
    window.CausalFunnelTracker = publicApi;

})(window, document);
