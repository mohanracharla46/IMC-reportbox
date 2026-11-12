/**
 * IRA MEDIA CONCEPTS - High-Precision Geolocation & Reverse Geocoding Helper
 * Shared by login and logout flows to acquire the most accurate GPS/Wi-Fi fix
 * and resolve it to a street/building-level address with exact coordinates.
 */
(function (global) {
    'use strict';

    const HIGH_ACCURACY_TARGET_METERS = 30;
    const DEFAULT_SETTLE_WINDOW_MS = 4000;
    const DEFAULT_MAX_WAIT_MS = 12000;
    const GEOCODE_TIMEOUT_MS = 5000;

    function normalizeText(val) {
        return String(val || '').replace(/\s+/g, ' ').trim();
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

    function formatNominatimAddress(data) {
        if (!data || typeof data !== 'object') {
            return { address: '', hasStreetDetail: false };
        }
        const addr = data.address || {};
        const premise = addr.amenity || addr.building || addr.office || addr.shop ||
            addr.commercial || addr.industrial || addr.tourism || addr.leisure ||
            addr.university || addr.hospital || addr.mall || '';
        const road = addr.road || addr.pedestrian || addr.footway || addr.street ||
            addr.residential || addr.path || addr.cycleway || '';
        const street = [addr.house_number, road].filter(Boolean).join(' ');
        const locality = addr.neighbourhood || addr.quarter || addr.hamlet ||
            addr.allotments || addr.locality || '';
        const suburb = addr.suburb || addr.city_district || addr.borough || addr.district || '';
        const city = addr.city || addr.town || addr.village || addr.municipality ||
            addr.state_district || addr.county || '';
        const statePin = [addr.state, addr.postcode].filter(Boolean).join(' ');

        // Include data.name only when it adds a specific place/building not already in road/area/city
        const rawName = normalizeText(data.name);
        const nameAlreadyCovered = [road, locality, suburb, city, addr.state, addr.country]
            .some((v) => v && normalizeText(v).toLowerCase() === rawName.toLowerCase());
        const place = premise || (!nameAlreadyCovered ? rawName : '');

        let parts = dedupeAddressParts([place, street, locality, suburb, city, statePin]);

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

        const hasStreetDetail = Boolean(place || street || locality);
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
        const place = p.name || '';
        const street = [p.housenumber, p.street].filter(Boolean).join(' ');
        const locality = p.district || p.locality || '';
        const city = p.city || p.county || '';
        const statePin = [p.state, p.postcode].filter(Boolean).join(' ');

        const parts = dedupeAddressParts([place, street, locality, city, statePin]);
        const hasStreetDetail = Boolean(place || street || locality);
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

        // 1. Primary: OpenStreetMap Nominatim at zoom=18 (building & street precision)
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;
        const nomData = await fetchJsonWithTimeout(
            nominatimUrl,
            { headers: { 'Accept-Language': 'en' } },
            GEOCODE_TIMEOUT_MS
        );
        const nomResult = formatNominatimAddress(nomData);
        if (nomResult.address && nomResult.hasStreetDetail) {
            return `${nomResult.address} ${coordSuffix}`;
        }

        // 2. Fallback / Detail upgrade: Photon (OSM street/POI reverse geocoder)
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

    /**
     * Collects position updates via watchPosition and picks the highest-accuracy fix.
     * Resolves immediately once accuracy <= targetAccuracyMeters, or after settleWindowMs
     * once at least one valid fix has been received.
     */
    function getExactPosition(options = {}) {
        const targetAccuracyMeters = options.targetAccuracyMeters || HIGH_ACCURACY_TARGET_METERS;
        const settleWindowMs = options.settleWindowMs || DEFAULT_SETTLE_WINDOW_MS;
        const maxWaitMs = options.maxWaitMs || DEFAULT_MAX_WAIT_MS;
        const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

        return new Promise((resolve, reject) => {
            if (!global.isSecureContext &&
                global.location.hostname !== 'localhost' &&
                global.location.hostname !== '127.0.0.1') {
                reject(buildPositionError('INSECURE_CONTEXT', 'Geolocation requires HTTPS or localhost.'));
                return;
            }
            if (!global.navigator || !global.navigator.geolocation) {
                reject(buildPositionError('UNSUPPORTED', 'Geolocation is not supported by this browser.'));
                return;
            }

            let finished = false;
            let watchId = null;
            let settleTimer = null;
            let overallTimer = null;
            let bestPos = null;

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

                    const acc = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : Infinity;
                    const bestAcc = bestPos && Number.isFinite(bestPos.coords.accuracy)
                        ? bestPos.coords.accuracy
                        : Infinity;

                    if (!bestPos || acc < bestAcc) {
                        bestPos = pos;
                    }

                    if (acc <= targetAccuracyMeters) {
                        finishWithBest();
                        return;
                    }

                    if (onProgress) {
                        onProgress(bestPos);
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
     * Passively watches for a sharper GPS fix while the user stays on the page (e.g., login form).
     * Returns a stop() function.
     */
    function watchForBetterPosition(initialPos, options = {}) {
        if (!global.navigator || !global.navigator.geolocation || !initialPos || !initialPos.coords) {
            return function () {};
        }
        const targetAccuracyMeters = options.targetAccuracyMeters || 25;
        const durationMs = options.durationMs || 25000;
        const onBetterPosition = typeof options.onBetterPosition === 'function' ? options.onBetterPosition : null;

        let bestAccuracy = Number.isFinite(initialPos.coords.accuracy)
            ? initialPos.coords.accuracy
            : Infinity;

        if (bestAccuracy <= targetAccuracyMeters) {
            return function () {};
        }

        let watchId = null;
        let stopTimer = null;

        function stop() {
            if (watchId !== null) {
                global.navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
            if (stopTimer) {
                clearTimeout(stopTimer);
                stopTimer = null;
            }
        }

        stopTimer = setTimeout(stop, durationMs);

        watchId = global.navigator.geolocation.watchPosition(
            (pos) => {
                const lat = pos && pos.coords ? pos.coords.latitude : NaN;
                const lng = pos && pos.coords ? pos.coords.longitude : NaN;
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                const acc = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : Infinity;
                if (acc < bestAccuracy * 0.75 || (bestAccuracy > targetAccuracyMeters && acc <= targetAccuracyMeters)) {
                    bestAccuracy = acc;
                    if (onBetterPosition) {
                        onBetterPosition(pos);
                    }
                    if (acc <= targetAccuracyMeters) {
                        stop();
                    }
                }
            },
            () => {
                stop();
            },
            {
                enableHighAccuracy: true,
                timeout: durationMs,
                maximumAge: 0
            }
        );

        return stop;
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
        getExactPosition,
        watchForBetterPosition,
        reverseGeocodeExact,
        captureExactLocation
    };
})(window);

