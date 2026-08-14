import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

// ─── MARTA Line route orders (terminus-to-terminus, direction agnostic) ──────
// Used to build the station progress view when a user taps a train row.
const LINE_ROUTES = {
    // Red Line: North Springs ↔ Airport (via I-285/Buckhead corridor)
    RED: [
        "NORTH SPRINGS", "SANDY SPRINGS", "DUNWOODY", "MEDICAL CENTER",
        "BUCKHEAD", "LINDBERGH", "ARTS CENTER", "MIDTOWN", "NORTH AVENUE",
        "CIVIC CENTER", "PEACHTREE CENTER", "FIVE POINTS", "GARNETT",
        "WEST END", "OAKLAND CITY", "LAKEWOOD", "EAST POINT", "COLLEGE PARK", "AIRPORT"
    ],
    // Gold Line: Doraville ↔ Airport (via Lenox/Buckhead corridor)
    GOLD: [
        "DORAVILLE", "CHAMBLEE", "BROOKHAVEN", "LENOX", "BUCKHEAD",
        "LINDBERGH", "ARTS CENTER", "MIDTOWN", "NORTH AVENUE", "CIVIC CENTER",
        "PEACHTREE CENTER", "FIVE POINTS", "GARNETT", "WEST END", "OAKLAND CITY",
        "LAKEWOOD", "EAST POINT", "COLLEGE PARK", "AIRPORT"
    ],
    // Blue Line: Hamilton E Holmes ↔ Indian Creek
    BLUE: [
        "HAMILTON E HOLMES", "WEST LAKE", "BANKHEAD", "VINE CITY",
        "OMNI", "FIVE POINTS", "GEORGIA STATE", "KING MEMORIAL", "INMAN PARK",
        "EDGEWOOD CANDLER PARK", "EAST LAKE", "DECATUR", "AVONDALE",
        "KENSINGTON", "INDIAN CREEK"
    ],
    // Green Line: Bankhead ↔ Indian Creek
    GREEN: [
        "BANKHEAD", "VINE CITY", "OMNI", "FIVE POINTS", "GEORGIA STATE",
        "KING MEMORIAL", "INMAN PARK", "EDGEWOOD CANDLER PARK", "EAST LAKE",
        "DECATUR", "AVONDALE", "KENSINGTON", "INDIAN CREEK"
    ],
};

// Average travel time in minutes between each consecutive station pair per line.
// Index i = minutes from station[i] to station[i+1].
const LINE_SEGMENT_MINS = {
    RED:  [2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3],
    GOLD: [3, 3, 3, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3],
    BLUE: [3, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    GREEN: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
};

const STATION_LIST = [
    "AIRPORT", "ARTS CENTER", "ASHBY", "AVONDALE", "BANKHEAD", "BROOKHAVEN",
    "BUCKHEAD", "CHAMBLEE", "CIVIC CENTER", "COLLEGE PARK", "DECATUR",
    "DORAVILLE", "DUNWOODY", "EAST LAKE", "EAST POINT", "EDGEWOOD CANDLER PARK",
    "FIVE POINTS", "GARNETT", "GEORGIA STATE", "HAMILTON E HOLMES",
    "INDIAN CREEK", "INMAN PARK", "KENSINGTON", "KING MEMORIAL", "LAKEWOOD",
    "LENOX", "LINDBERGH", "MEDICAL CENTER", "MIDTOWN", "NORTH AVENUE",
    "NORTH SPRINGS", "OAKLAND CITY", "PEACHTREE CENTER", "SANDY SPRINGS",
    "SEC DISTRICT", "VINE CITY", "WEST END", "WEST LAKE"
];

const STATION_COORDS = {
    "AIRPORT": { lat: 33.6407, lon: -84.4440 },
    "ARTS CENTER": { lat: 33.7893, lon: -84.3872 },
    "ASHBY": { lat: 33.7563, lon: -84.4171 },
    "AVONDALE": { lat: 33.7753, lon: -84.2817 },
    "BANKHEAD": { lat: 33.7718, lon: -84.4288 },
    "BROOKHAVEN": { lat: 33.8601, lon: -84.3392 },
    "BUCKHEAD": { lat: 33.8484, lon: -84.3670 },
    "CHAMBLEE": { lat: 33.8862, lon: -84.3069 },
    "CIVIC CENTER": { lat: 33.7663, lon: -84.3875 },
    "COLLEGE PARK": { lat: 33.6517, lon: -84.4488 },
    "DECATUR": { lat: 33.7747, lon: -84.2956 },
    "DORAVILLE": { lat: 33.9032, lon: -84.2801 },
    "DUNWOODY": { lat: 33.9486, lon: -84.3370 },
    "EAST LAKE": { lat: 33.7651, lon: -84.3126 },
    "EAST POINT": { lat: 33.6774, lon: -84.4406 },
    "EDGEWOOD CANDLER PARK": { lat: 33.7620, lon: -84.3400 },
    "FIVE POINTS": { lat: 33.7538, lon: -84.3915 },
    "GARNETT": { lat: 33.7478, lon: -84.3964 },
    "GEORGIA STATE": { lat: 33.7505, lon: -84.3853 },
    "GOLD DOME": { lat: 33.7495, lon: -84.3853 },
    "HAMILTON E HOLMES": { lat: 33.7546, lon: -84.4678 },
    "INDIAN CREEK": { lat: 33.7697, lon: -84.2296 },
    "INMAN PARK": { lat: 33.7575, lon: -84.3526 },
    "KENSINGTON": { lat: 33.7725, lon: -84.2520 },
    "KING MEMORIAL": { lat: 33.7499, lon: -84.3755 },
    "LAKEWOOD": { lat: 33.7005, lon: -84.4288 },
    "LENOX": { lat: 33.8471, lon: -84.3563 },
    "LINDBERGH": { lat: 33.8219, lon: -84.3674 },
    "MEDICAL CENTER": { lat: 33.9106, lon: -84.3525 },
    "MIDTOWN": { lat: 33.7811, lon: -84.3863 },
    "NORTH AVENUE": { lat: 33.7717, lon: -84.3870 },
    "NORTH SPRINGS": { lat: 33.9446, lon: -84.3562 },
    "OAKLAND CITY": { lat: 33.7168, lon: -84.4251 },
    "OMNI": { lat: 33.7564, lon: -84.3973 },
    "PEACHTREE CENTER": { lat: 33.7596, lon: -84.3875 },
    "SANDY SPRINGS": { lat: 33.9330, lon: -84.3520 },
    "VINE CITY": { lat: 33.7568, lon: -84.4039 },
    "WEST END": { lat: 33.7361, lon: -84.4135 },
    "WEST LAKE": { lat: 33.7531, lon: -84.4461 }
};

export default function App() {
    const [currentStation, setCurrentStation] = useState(() => {
        return localStorage.getItem('marta_user_station') || "MIDTOWN";
    });

    // 1. THE OMNI-CACHE: Load every saved station into memory instantly
    const [trainCache, setTrainCache] = useState(() => {
        const initialCache = {};
        STATION_LIST.forEach(s => {
            const saved = localStorage.getItem(`marta_backup_${s}`);
            if (saved) {
                try { initialCache[s] = JSON.parse(saved); } catch { /* ignore invalid cache */ }
            }
        });
        return initialCache;
    });

    const [activeFilter, setActiveFilter] = useState("ALL");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const [showStationModal, setShowStationModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [selectedTrain, setSelectedTrain] = useState(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [toastMsg, setToastMsg] = useState("");
    const [locationOverridden, setLocationOverridden] = useState(() => {
        return localStorage.getItem('marta_user_station') !== null;
    });

    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('marta_theme') !== 'light';
    });

    useEffect(() => {
        if (isDarkMode) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
        localStorage.setItem('marta_theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    // --- 2. IRONCLAD FETCH LOGIC (Now writes directly to the Omni-Cache) ---
    const fetchTrains = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/arrivals?station=${currentStation}`);
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();

            if (Array.isArray(data) && data.length > 0) {
                // Fresh data arrived — replace the cache for this station outright
                setTrainCache(prev => ({ ...prev, [currentStation]: data }));
                localStorage.setItem(`marta_backup_${currentStation}`, JSON.stringify(data));
                setError(false);
            } else {
                // API returned empty — purge trains that are already overdue (waiting_seconds <= -30)
                // so stale "Arriving" entries don't linger indefinitely.
                setTrainCache(prev => {
                    const existing = prev[currentStation];
                    if (!existing) return prev;
                    const pruned = existing.filter(t => parseInt(t.waiting_seconds, 10) > -30);
                    if (pruned.length === existing.length) return prev;
                    return { ...prev, [currentStation]: pruned };
                });
                console.warn("MARTA sent empty data. Pruned overdue trains from cache.");
            }
        } catch (err) {
            console.error("Fetch error or disconnect", err);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [currentStation]);

    // --- 3. UNIVERSAL OFFLINE TICKER (Ticks all stations simultaneously) ---
    useEffect(() => {
        const ticker = setInterval(() => {
            setTrainCache(prevCache => {
                const newCache = { ...prevCache };
                let stateChanged = false;

                for (const station in newCache) {
                    const stationTrains = newCache[station];
                    if (!stationTrains || stationTrains.length === 0) continue;

                    const tickedTrains = stationTrains
                        .map(t => {
                            if (t.status === 'Scheduled') return t;

                            let secs = parseInt(t.waiting_seconds, 10);

                            // If API sent a non-numeric status (e.g. "Boarding", "Departing"),
                            // treat those as effectively 0 and let dead reckoning advance them.
                            if (isNaN(secs)) secs = 0;

                            secs -= 1;

                            let newTimeStr;
                            if (secs <= -30) {
                                // Train has departed — mark for removal
                                return null;
                            } else if (secs <= 0) {
                                // Dwell window: show Departing for the last 30s after arrival
                                newTimeStr = "Departing";
                            } else if (secs <= 30) {
                                newTimeStr = "Arriving";
                            } else {
                                newTimeStr = Math.ceil(secs / 60) + " min";
                            }

                            return { ...t, waiting_seconds: secs.toString(), waiting_time: newTimeStr };
                        })
                        .filter(Boolean); // remove departed trains

                    // Only write back if the result differs from the original
                    if (tickedTrains.length !== stationTrains.length ||
                        tickedTrains.some((t, i) => t.waiting_seconds !== stationTrains[i].waiting_seconds)) {
                        newCache[station] = tickedTrains;
                        stateChanged = true;
                    }
                }

                return stateChanged ? newCache : prevCache;
            });
        }, 1000);

        return () => clearInterval(ticker);
    }, []);

    // Polling Interval
    useEffect(() => {
        fetchTrains();
        const interval = setInterval(fetchTrains, 15000);
        return () => clearInterval(interval);
    }, [fetchTrains]);

    // Geolocation
    useEffect(() => {
        if (!navigator.geolocation || locationOverridden) return;

        const getDist = (lat1, lon1, lat2, lon2) => {
            const R = 6371;
            const dLat = (lat2 - lat1) * (Math.PI / 180);
            const dLon = (lon2 - lon1) * (Math.PI / 180);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        };

        navigator.geolocation.getCurrentPosition(position => {
            let minDist = Infinity;
            let nearest = null;
            for (const [station, coords] of Object.entries(STATION_COORDS)) {
                const d = getDist(position.coords.latitude, position.coords.longitude, coords.lat, coords.lon);
                if (d < minDist) { minDist = d; nearest = station; }
            }
            if (nearest && nearest !== currentStation) {
                showToast(`📍 Found nearest: ${titleCase(nearest)}`);
                setCurrentStation(nearest);
            }
        });
    }, [locationOverridden]);

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(""), 3000);
    };

    const titleCase = (str) => {
        if (!str) return "";
        return str.toLowerCase().replace(/(?:^|[\s-])\w/g, match => match.toUpperCase());
    };

    // Build the ordered list of stations with estimated arrival times for the detail view.
    // train: the train object from the API cache (has line, direction, waiting_seconds, destination)
    // fromStation: the current station the user is standing at (currentStation)
    const buildRouteStops = (train, fromStation) => {
        const line = (train.line || "").toUpperCase();
        const route = LINE_ROUTES[line];
        const segMins = LINE_SEGMENT_MINS[line];
        if (!route || !segMins) return [];

        const dest = (train.destination || "").toUpperCase();
        const from = fromStation.toUpperCase();

        // Find the current station index in the route
        let fromIdx = route.findIndex(s => s === from || from.includes(s) || s.includes(from));
        // Find the destination index
        let destIdx = route.findIndex(s => s === dest || dest.includes(s) || s.includes(dest));

        // If we can't find either end, bail
        if (fromIdx === -1 || destIdx === -1) return [];

        // Slice the route from origin (start of line) to destination, in travel direction
        const direction = destIdx > fromIdx ? 1 : -1;
        const stops = [];

        // Walk from the start of the line in the direction of travel
        // The train started from the far end from the destination
        const lineStart = direction === 1 ? 0 : route.length - 1;
        const lineEnd = destIdx;

        // Build stops array in travel order (lineStart → lineEnd)
        const ordered = [];
        for (let i = lineStart; direction === 1 ? i <= lineEnd : i >= lineEnd; i += direction) {
            ordered.push(route[i]);
        }

        // Calculate time offsets from current station
        // Time from current station to arrival (from API)
        const arrivalSecs = parseInt(train.waiting_seconds, 10);
        const arrivalMins = isNaN(arrivalSecs) ? 0 : Math.max(0, Math.ceil(arrivalSecs / 60));

        // Find current station index inside the ordered slice
        const curIdxInOrdered = ordered.findIndex(s => s === from || from.includes(s) || s.includes(from));

        ordered.forEach((stationName, idx) => {
            // Calculate minute offset from current station
            let minuteOffset = 0;
            if (idx < curIdxInOrdered) {
                // Stations already passed — negative offset
                for (let j = idx; j < curIdxInOrdered; j++) {
                    const segIdx = direction === 1 ? j : route.length - 2 - j;
                    const safeSegIdx = Math.min(segIdx, segMins.length - 1);
                    minuteOffset -= (segMins[safeSegIdx] || 2);
                }
            } else if (idx > curIdxInOrdered) {
                // Future stations — positive offset
                for (let j = curIdxInOrdered; j < idx; j++) {
                    const segIdx = direction === 1 ? j : route.length - 2 - j;
                    const safeSegIdx = Math.min(segIdx, segMins.length - 1);
                    minuteOffset += (segMins[safeSegIdx] || 2);
                }
            }

            const absMins = arrivalMins + minuteOffset;
            stops.push({
                name: stationName,
                isCurrent: idx === curIdxInOrdered,
                isPassed: idx < curIdxInOrdered,
                isDestination: stationName === dest || dest.includes(stationName) || stationName.includes(dest),
                minutesFromNow: absMins,
            });
        });

        return stops;
    };

    // Scroll current station into view when detail panel opens
    const currentStopRef = useRef(null);
    useEffect(() => {
        if (detailVisible && currentStopRef.current) {
            // Short delay so the slide-in animation has started
            setTimeout(() => {
                currentStopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
        }
    }, [detailVisible]);

    // Open train detail with animation
    const openTrainDetail = (train) => {
        setSelectedTrain(train);
        // Small delay so the element mounts before transition starts
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setDetailVisible(true));
        });
    };

    // Close train detail
    const closeTrainDetail = () => {
        setDetailVisible(false);
        setTimeout(() => setSelectedTrain(null), 350);
    };

    // Escape key closes detail view
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') closeTrainDetail(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // --- 4. THE CLEAN SWAP ---
    const handleStationChange = (station) => {
        setCurrentStation(station);
        setActiveFilter("ALL");
        setLocationOverridden(true);
        localStorage.setItem('marta_user_station', station);
        setShowStationModal(false);

        // We NO LONGER clear the array here! 
        // The renderer now dynamically pulls from the trainCache.
        setIsLoading(true);
    };

    // Dynamically grab the correct data block for whichever station is selected
    const currentTrains = trainCache[currentStation] || [];
    const visibleTrains = currentTrains.filter(t => activeFilter === "ALL" || t.destination === activeFilter);
    const uniqueDestinations = Array.from(new Set(currentTrains.map(t => t.destination))).sort();
    const displayStation = currentStation === "OMNI"
        ? "SEC District"
        : titleCase(currentStation.replace(/ STATION/i, ''));

    return (
        <div className="app-container">
            <header>
                <div className="brand">TRAINS</div>
                <div className="station-display">
                    <span>ARRIVING AT</span>
                    {displayStation}
                </div>
                <div className="controls">
                    {isLoading && <div className="spinner"></div>}
                    <button className="nav-btn" onClick={() => setShowFilterModal(true)}>FILTER</button>
                    <button className="nav-btn" onClick={() => setShowStationModal(true)}>STATION</button>
                </div>
            </header>

            {/* Dim the main container slightly if we are loading fresh data */}
            <main style={{ transition: 'opacity 0.3s', opacity: isLoading && currentTrains.length > 0 ? 0.6 : 1 }}>
                {isLoading && currentTrains.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px', opacity: 0.5, fontSize: '1.5rem' }}>Fetching schedule...</div>
                ) : error && currentTrains.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px', opacity: 0.5, fontSize: '1.5rem' }}>Connection Error</div>
                ) : currentTrains.length === 0 && !isLoading ? (
                    <div style={{ textAlign: 'center', padding: '50px', opacity: 0.5, fontSize: '1.5rem' }}>No trains found.</div>
                ) : (
                    visibleTrains.map((t, i) => {
                        let mainTime = t.waiting_time;
                        let subLabel = "MIN";
                        if (mainTime === "Arriving") { mainTime = "ARR"; subLabel = ""; }
                        else if (mainTime === "Boarding") { mainTime = "BRD"; subLabel = ""; }
                        else if (mainTime === "Departing") { mainTime = "DEP"; subLabel = ""; }
                        else { mainTime = mainTime.replace(' min', ''); }

                        return (
                            <div key={i} className="train-row status-real" onClick={() => openTrainDetail(t)}>
                                <div className={`line-bubble ${t.line}`}>{t.direction}</div>
                                <div className="train-info"><div className="destination">{t.destination}</div></div>
                                <div className="minutes-box">
                                    <div className="minutes-main">{mainTime}</div>
                                    <div className="minutes-sub">{subLabel}</div>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            {/* ── Train Detail / Route Progress View ── */}
            {selectedTrain && (() => {
                const stops = buildRouteStops(selectedTrain, currentStation);
                const line = (selectedTrain.line || "GRAY").toUpperCase();
                const lineColor = { RED: '#ED1C24', GOLD: '#FFA500', BLUE: '#009DDC', GREEN: '#69BE28' }[line] || '#999';

                let headerTime = selectedTrain.waiting_time;
                if (headerTime === "Arriving") headerTime = "ARR";
                else if (headerTime === "Boarding") headerTime = "BRD";
                else if (headerTime === "Departing") headerTime = "DEP";
                else headerTime = headerTime.replace(' min', '') + " min";

                return (
                    <div className={`detail-overlay${detailVisible ? ' detail-visible' : ''}`}>
                        <div className="detail-panel">
                            <div className="detail-header" style={{ borderBottom: `3px solid ${lineColor}` }}>
                                <button className="detail-back" onClick={closeTrainDetail}>&#8592;</button>
                                <div className="detail-header-info">
                                    <div className="detail-destination">{selectedTrain.destination}</div>
                                    <div className="detail-meta">
                                        <span className={`line-badge ${line}`}>{selectedTrain.direction}</span>
                                        <span className="detail-arrival-time">{headerTime}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="detail-stops-container">
                                {stops.length === 0 ? (
                                    <div className="detail-no-route">Route data unavailable for this train.</div>
                                ) : (
                                    stops.map((stop, idx) => {
                                        const isFirst = idx === 0;
                                        const isLast = idx === stops.length - 1;
                                        let timeLabel = "";
                                        if (stop.isCurrent) {
                                            timeLabel = headerTime;
                                        } else if (!stop.isPassed) {
                                            const m = stop.minutesFromNow;
                                            if (m <= 0) timeLabel = "ARR";
                                            else timeLabel = m + " min";
                                        }
                                        return (
                                            <div key={stop.name} ref={stop.isCurrent ? currentStopRef : null} className={`detail-stop${stop.isCurrent ? ' stop-current' : ''}${stop.isPassed ? ' stop-passed' : ''}${stop.isDestination ? ' stop-destination' : ''}`}>
                                                {/* Left rail */}
                                                <div className="stop-rail">
                                                    <div className="stop-rail-line stop-rail-top" style={{ background: isFirst ? 'transparent' : lineColor, opacity: isFirst ? 0 : (stop.isPassed ? 0.3 : 1) }} />
                                                    <div className={`stop-dot${stop.isCurrent ? ' stop-dot-current' : ''}`} style={{ background: stop.isPassed ? 'transparent' : lineColor, border: stop.isPassed ? `2px solid ${lineColor}` : 'none', opacity: stop.isPassed ? 0.3 : 1 }} />
                                                    <div className="stop-rail-line stop-rail-bottom" style={{ background: lineColor, opacity: (isLast || stop.isDestination) ? 0 : (stop.isPassed ? 0.3 : 1) }} />
                                                </div>
                                                {/* Station name + time */}
                                                <div className="stop-info">
                                                    <div className="stop-name">{titleCase(stop.name)}</div>
                                                    {timeLabel ? <div className="stop-time">{timeLabel}</div> : null}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            <svg id="theme-toggle" viewBox="0 0 24 24" fill="currentColor" onClick={() => setIsDarkMode(!isDarkMode)}>
                {isDarkMode ? (
                    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
                ) : (
                    <path d="M12 9c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3m0-2c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z" />
                )}
            </svg>

            <div id="toast" className={toastMsg ? "show" : ""}>{toastMsg}</div>

            {showStationModal && (
                <div className="modal-overlay" onClick={(e) => { if (e.target.className.includes('modal-overlay')) setShowStationModal(false); }}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <span className="modal-title">Select Station</span>
                            <button className="close-btn" onClick={() => setShowStationModal(false)}>&times;</button>
                        </div>
                        <div className="modal-list">
                            {STATION_LIST.map(s => (
                                <button key={s} className="list-item" onClick={() => handleStationChange(s)}>{titleCase(s)}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showFilterModal && (
                <div className="modal-overlay" onClick={(e) => { if (e.target.className.includes('modal-overlay')) setShowFilterModal(false); }}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <span className="modal-title">Filter Destination</span>
                            <button className="close-btn" onClick={() => setShowFilterModal(false)}>&times;</button>
                        </div>
                        <div className="modal-list">
                            <button className="list-item" onClick={() => { setActiveFilter("ALL"); setShowFilterModal(false); }}>Show All</button>
                            {uniqueDestinations.map(dest => (
                                <button key={dest} className="list-item" onClick={() => { setActiveFilter(dest); setShowFilterModal(false); }}>{dest}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}