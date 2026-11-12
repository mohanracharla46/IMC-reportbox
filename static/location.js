/**
 * IRA MEDIA CONCEPTS - Live High-Precision Geolocation & Reverse Geocoding Helper
 * Uses continuous watchPosition streaming (ignoring stale OS cached readings) to lock onto
 * the most accurate live GPS/Wi-Fi coordinates and resolves street-level addresses without
 * hijacking the location with unrelated nearby shop/POI names.
 */
(function (global) {
    'use strict';

    const HIGH_ACCURACY_TARGET_METERS = 20;
    const DEFAULT_MIN_WARMUP_MS = 1200;
    const DEFAULT_SETTLE_WINDOW_MS = 5500;
    const DEFAULT_MAX_WAIT_MS = 14000;
    const STALE_FIX_AGE_MS = 4500;
    const GEOCODE_TIMEOUT_MS = 5000;

    function normalizeText(val) {
        return String(val || '').replace(/\s+/g, ' ').trim();
    }

    function haversineMeters(lat1, lng1, lat2, lng2) {
        const toRad = (deg) => (deg * Math.PI) / 180;
        const R = 6371000;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function isFreshPosition(pos, referenceNowMs) {
        if (!pos || !Number.isFinite(pos.timestamp)) return true;
        return (referenceNowMs - pos.timestamp) <= STALE_FIX_AGE_MS;
    }

    function dedupeAddressParts(parts) {
        const result = [];
        for (const raw of parts) {
            const part = normalizeText(raw);
            if (!part) continue;
            const lower = part.toLowerCase();
            const isDuplicate = result.some((existing) => {
                const exLower = existing.toLowerCase();
                return exLower === lower || exLower.includes(lower) || lower.includes(exLower);
            });
            if (!isDuplicate) {
                result.push(part);
            }
        }
        return result;
    }

    async function fetchJsonWithTimeout(url, options, timeoutMs) {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
        try {
            const res = await fetch(url, {
                ...options,
                cache: 'no-store',
                signal: controller ? controller.signal : undefined
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (err) {
            return null;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    /**
     * Builds a street & locality address from Nominatim without snapping to random nearby shops/POIs.
     */
    function formatNominatimAddress(data) {
        if (!data || typeof data !== 'object') {
            return { address: '', hasStreetDetail: false };
        }
        const addr = data.address || {};
        const road = addr.road || addr.pedestrian || addr.footway || addr.street ||
            addr.residential || addr.path || addr.cycleway || '';
        const street = [addr.house_number, road].filter(Boolean).join(' ');
        const locality = addr.neighbourhood || addr.quarter || addr.hamlet ||
            addr.allotments || addr.locality || addr.residential || '';
        const suburb = addr.suburb || addr.city_district || addr.borough || addr.district || '';
        const city = addr.city || addr.town || addr.village || addr.municipality ||
            addr.state_district || addr.county || '';
        const statePin = [addr.state, addr.postcode].filter(Boolean).join(' ');

        // Use building/campus name ONLY when road & locality are both absent
        const fallbackBuilding = (!street && !locality)
            ? (addr.building || addr.office || addr.commercial || addr.industrial || addr.university || addr.hospital || '')
            : '';

        let parts = dedupeAddressParts([street, fallbackBuilding, locality, suburb, city, statePin]);

        if (parts.length < 2 && data.display_name) {
            const displayTokens = String(data.display_name)
                .split(',')
                .map((t) => normalizeText(t))
                .filter(Boolean);
            if (addr.country && displayTokens.length > 1 &&
                displayTokens[displayTokens.length - 1].toLowerCase() === addr.country.toLowerCase()) {
                displayTokens.pop();
            }
            if (displayTokens.length > parts.length) {
                parts = dedupeAddressParts(displayTokens.slice(0, 5));
            }
        }

        const hasStreetDetail = Boolean(street || locality);
        return {
            address: parts.join(', '),
            hasStreetDetail
        };
    }

    function formatPhotonAddress(data) {
        if (!data || !Array.isArray(data.features) || data.features.length === 0) {
            return { address: '', hasStreetDetail: false };
        }
        const p = (data.features[0] && data.features[0].properties) || {};
        const street = [p.housenumber, p.street].filter(Boolean).join(' ');
        const locality = p.district || p.locality || '';
        const city = p.city || p.county || '';
        const statePin = [p.state, p.postcode].filter(Boolean).join(' ');
        const fallbackName = (!street && !locality) ? (p.name || '') : '';

        const parts = dedupeAddressParts([street, fallbackName, locality, city, statePin]);
        const hasStreetDetail = Boolean(street || locality);
        return {
            address: parts.join(', '),
            hasStreetDetail
        };
    }

    function formatBigDataCloudAddress(data) {
        if (!data || typeof data !== 'object') {
            return { address: '', hasStreetDetail: false };
        }
        const statePin = [data.principalSubdivision, data.postcode].filter(Boolean).join(' ');
        const parts = dedupeAddressParts([data.locality, data.city, statePin]);
        return {
            address: parts.join(', '),
            hasStreetDetail: Boolean(data.locality)
        };
    }

    async function reverseGeocodeExact(lat, lng) {
        const latFixed = Number(lat).toFixed(6);
        const lngFixed = Number(lng).toFixed(6);
        const coordSuffix = `(${latFixed}, ${lngFixed})`;

        // 1. Primary: OpenStreetMap Nominatim at zoom=17 (street & house level, avoids nearby shop POI hijacking)
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=17&addressdetails=1`;
        const nomData = await fetchJsonWithTimeout(
            nominatimUrl,
            { headers: { 'Accept-Language': 'en' } },
            GEOCODE_TIMEOUT_MS
        );
        const nomResult = formatNominatimAddress(nomData);
        if (nomResult.address && nomResult.hasStreetDetail) {
            return `${nomResult.address} ${coordSuffix}`;
        }

        // 2. Fallback / Detail upgrade: Photon (OSM street reverse geocoder)
        const photonUrl = `https://photon.komoot.io/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&lang=en`;
        const photonData = await fetchJsonWithTimeout(photonUrl, {}, GEOCODE_TIMEOUT_MS);
        const photonResult = formatPhotonAddress(photonData);
        if (photonResult.address && (photonResult.hasStreetDetail || !nomResult.address)) {
            return `${photonResult.address} ${coordSuffix}`;
        }

        if (nomResult.address) {
            return `${nomResult.address} ${coordSuffix}`;
        }

        // 3. Fallback: BigDataCloud client reverse geocoder
        const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=en`;
        const bdcData = await fetchJsonWithTimeout(bdcUrl, {}, GEOCODE_TIMEOUT_MS);
        const bdcResult = formatBigDataCloudAddress(bdcData);
        if (bdcResult.address) {
            return `${bdcResult.address} ${coordSuffix}`;
        }

        // 4. Exact coordinate fallback
        return `Lat: ${latFixed}, Lng: ${lngFixed}`;
    }

    function buildPositionError(code, message) {
        const err = new Error(message);
        err.code = code;
        return err;
    }

    function isSecureGeolocationContext() {
        return Boolean(
            global.isSecureContext ||
            global.location.hostname === 'localhost' ||
            global.location.hostname === '127.0.0.1'
        );
    }

    function isBetterCandidate(candidatePos, candidateFresh, currentBest, currentFresh) {
        if (!currentBest) return true;
        const candAcc = Number.isFinite(candidatePos.coords.accuracy) ? candidatePos.coords.accuracy : Infinity;
        const currAcc = Number.isFinite(currentBest.coords.accuracy) ? currentBest.coords.accuracy : Infinity;

        // Always upgrade from a stale OS cached reading to a genuine live reading unless live is wildly unusable
        if (candidateFresh && !currentFresh && candAcc <= Math.max(currAcc * 2, 150)) {
            return true;
        }
        if (!candidateFresh && currentFresh) {
            return false;
        }

        if (candAcc < currAcc) {
            return true;
        }

        // If accuracy is similar and live GPS shifted noticeably (e.g. moving or correcting Wi-Fi drift), take newer fix
        const movedMeters = haversineMeters(
            currentBest.coords.latitude,
            currentBest.coords.longitude,
            candidatePos.coords.latitude,
            candidatePos.coords.longitude
        );
        if (candidateFresh && candAcc <= 35 && movedMeters >= 15 && candAcc <= currAcc + 10) {
            return true;
        }
        return false;
    }

    /**
     * Collects live position updates via watchPosition, waits past initial stale cached fixes,
     * and resolves with the sharpest GPS coordinate available.
     */
    function getExactPosition(options = {}) {
        const targetAccuracyMeters = options.targetAccuracyMeters || HIGH_ACCURACY_TARGET_METERS;
        const minWarmupMs = options.minWarmupMs !== undefined ? options.minWarmupMs : DEFAULT_MIN_WARMUP_MS;
        const settleWindowMs = options.settleWindowMs || DEFAULT_SETTLE_WINDOW_MS;
        const maxWaitMs = options.maxWaitMs || DEFAULT_MAX_WAIT_MS;
        const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

        return new Promise((resolve, reject) => {
            if (!isSecureGeolocationContext()) {
                reject(buildPositionError('INSECURE_CONTEXT', 'Geolocation requires HTTPS or localhost.'));
                return;
            }
            if (!global.navigator || !global.navigator.geolocation) {
                reject(buildPositionError('UNSUPPORTED', 'Geolocation is not supported by this browser.'));
                return;
            }

            const startedAt = Date.now();
            let finished = false;
            let watchId = null;
            let settleTimer = null;
            let overallTimer = null;
            let warmupTimer = null;
            let bestPos = null;
            let bestIsFresh = false;
            let updateCount = 0;

            function cleanup() {
                if (watchId !== null) {
                    global.navigator.geolocation.clearWatch(watchId);
                    watchId = null;
                }
                if (settleTimer) {
                    clearTimeout(settleTimer);
                    settleTimer = null;
                }
                if (overallTimer) {
                    clearTimeout(overallTimer);
                    overallTimer = null;
                }
                if (warmupTimer) {
                    clearTimeout(warmupTimer);
                    warmupTimer = null;
                }
            }

            function finishWithBest() {
                if (finished) return;
                finished = true;
                cleanup();
                if (bestPos) {
                    resolve(bestPos);
                } else {
                    reject(buildPositionError(3, 'Timed out waiting for location.'));
                }
            }

            function tryLowAccuracyFallback(originalErr) {
                global.navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        if (finished) return;
                        finished = true;
                        cleanup();
                        resolve(pos);
                    },
                    (fallbackErr) => {
                        if (finished) return;
                        finished = true;
                        cleanup();
                        const finalErr = fallbackErr && fallbackErr.code === 1 ? fallbackErr : (originalErr || fallbackErr);
                        reject(finalErr || buildPositionError(2, 'Unable to determine location.'));
                    },
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
                );
            }

            overallTimer = setTimeout(() => {
                if (bestPos) {
                    finishWithBest();
                } else {
                    cleanup();
                    tryLowAccuracyFallback(buildPositionError(3, 'High-accuracy location timed out.'));
                }
            }, maxWaitMs);

            watchId = global.navigator.geolocation.watchPosition(
                (pos) => {
                    if (finished) return;
                    const lat = pos && pos.coords ? pos.coords.latitude : NaN;
                    const lng = pos && pos.coords ? pos.coords.longitude : NaN;
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                    updateCount += 1;
                    const elapsedMs = Date.now() - startedAt;
                    const candFresh = isFreshPosition(pos, startedAt);
                    const acc = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : Infinity;

                    if (isBetterCandidate(pos, candFresh, bestPos, bestIsFresh)) {
                        bestPos = pos;
                        bestIsFresh = candFresh;
                    }

                    const bestAcc = bestPos && Number.isFinite(bestPos.coords.accuracy)
                        ? bestPos.coords.accuracy
                        : Infinity;

                    if (onProgress) {
                        onProgress(bestPos, { isFresh: bestIsFresh, updateCount });
                    }

                    // Instant lock only after warmup (or >=2 fresh high-accuracy fixes) so stale network caches don't win
                    const readyToLock = bestIsFresh && bestAcc <= targetAccuracyMeters &&
                        (elapsedMs >= minWarmupMs || (updateCount >= 2 && bestAcc <= 15));

                    if (readyToLock) {
                        finishWithBest();
                        return;
                    }

                    // If already below target accuracy before warmup completes, re-check right at warmup end
                    if (bestIsFresh && bestAcc <= targetAccuracyMeters && !warmupTimer) {
                        warmupTimer = setTimeout(() => {
                            if (!finished && bestPos && bestIsFresh &&
                                Number(bestPos.coords.accuracy) <= targetAccuracyMeters) {
                                finishWithBest();
                            }
                        }, Math.max(0, minWarmupMs - elapsedMs));
                    }

                    if (!settleTimer) {
                        settleTimer = setTimeout(finishWithBest, settleWindowMs);
                    }
                },
                (err) => {
                    if (finished) return;
                    if (err && err.code === 1) {
                        finished = true;
                        cleanup();
                        reject(err);
                        return;
                    }
                    if (bestPos) {
                        finishWithBest();
                        return;
                    }
                    cleanup();
                    tryLowAccuracyFallback(err);
                },
                {
                    enableHighAccuracy: true,
                    timeout: maxWaitMs,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * Continuous Zomato/Swiggy-style live location stream. Keeps updating as GPS sharpens or user moves.
     * Emits onUpdate(pos, meta) and onError(err). Returns { stop() }.
     */
    function startLiveLocationWatch(options = {}) {
        const onUpdate = typeof options.onUpdate === 'function' ? options.onUpdate : function () {};
        const onError = typeof options.onError === 'function' ? options.onError : function () {};
        const settlePreviewMs = options.settlePreviewMs !== undefined ? options.settlePreviewMs : 1200;

        if (!isSecureGeolocationContext()) {
            onError(buildPositionError('INSECURE_CONTEXT', 'Geolocation requires HTTPS or localhost.'));
            return { stop: function () {} };
        }
        if (!global.navigator || !global.navigator.geolocation) {
            onError(buildPositionError('UNSUPPORTED', 'Geolocation is not supported by this browser.'));
            return { stop: function () {} };
        }

        const startedAt = Date.now();
        let stopped = false;
        let watchId = null;
        let previewTimer = null;
        let currentPos = null;
        let currentIsFresh = false;
        let updateCount = 0;

        function stop() {
            stopped = true;
            if (watchId !== null) {
                global.navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
            if (previewTimer) {
                clearTimeout(previewTimer);
                previewTimer = null;
            }
        }

        function emit(pos, isFresh) {
            currentPos = pos;
            currentIsFresh = isFresh;
            const acc = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : Infinity;
            onUpdate(pos, {
                isFresh,
                isExact: acc <= 35,
                updateCount
            });
        }

        function tryNetworkFallback(originalErr) {
            global.navigator.geolocation.getCurrentPosition(
                (pos) => {
                    if (stopped) return;
                    emit(pos, isFreshPosition(pos, startedAt));
                },
                (fallbackErr) => {
                    if (stopped) return;
                    const finalErr = fallbackErr && fallbackErr.code === 1 ? fallbackErr : (originalErr || fallbackErr);
                    onError(finalErr || buildPositionError(2, 'Unable to determine location.'));
                },
                { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
            );
        }

        watchId = global.navigator.geolocation.watchPosition(
            (pos) => {
                if (stopped) return;
                const lat = pos && pos.coords ? pos.coords.latitude : NaN;
                const lng = pos && pos.coords ? pos.coords.longitude : NaN;
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                updateCount += 1;
                const candFresh = isFreshPosition(pos, startedAt);
                const acc = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : Infinity;

                // If the very first fix is stale or coarse (> 50m), hold briefly so fresh GPS can replace it seamlessly
                if (!currentPos) {
                    if (candFresh && acc <= 35) {
                        if (previewTimer) {
                            clearTimeout(previewTimer);
                            previewTimer = null;
                        }
                        emit(pos, candFresh);
                    } else {
                        currentPos = pos;
                        currentIsFresh = candFresh;
                        if (!previewTimer) {
                            previewTimer = setTimeout(() => {
                                previewTimer = null;
                                if (!stopped && currentPos) {
                                    emit(currentPos, currentIsFresh);
                                }
                            }, settlePreviewMs);
                        }
                    }
                    return;
                }

                if (previewTimer) {
                    if (isBetterCandidate(pos, candFresh, currentPos, currentIsFresh)) {
                        currentPos = pos;
                        currentIsFresh = candFresh;
                        if (candFresh && acc <= 35) {
                            clearTimeout(previewTimer);
                            previewTimer = null;
                            emit(pos, candFresh);
                        }
                    }
                    return;
                }

                if (isBetterCandidate(pos, candFresh, currentPos, currentIsFresh)) {
                    emit(pos, candFresh);
                }
            },
            (err) => {
                if (stopped) return;
                if (err && err.code === 1) {
                    stop();
                    onError(err);
                    return;
                }
                if (currentPos) {
                    // Keep any valid coordinate already obtained, fall back gently only if none was emitted
                    if (previewTimer) {
                        clearTimeout(previewTimer);
                        previewTimer = null;
                        emit(currentPos, currentIsFresh);
                    }
                    return;
                }
                stop();
                tryNetworkFallback(err);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );

        return { stop };
    }

    async function captureExactLocation(options = {}) {
        const pos = await getExactPosition(options);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null;
        const locationText = await reverseGeocodeExact(lat, lng);
        return {
            pos,
            lat,
            lng,
            accuracy,
            locationText
        };
    }

    global.GeoLocationHelper = {
        haversineMeters,
        getExactPosition,
        startLiveLocationWatch,
        reverseGeocodeExact,
        captureExactLocation
    };
})(window);
