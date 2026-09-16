import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './App.css';

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

const MIN_WAIT_SECONDS = 15;
const ARRIVING_THRESHOLD_SECONDS = 30;
const TRAIN_STEP_SECONDS = 120;

const TRAIN_ROUTES = {
    RED: ["NORTH SPRINGS", "SANDY SPRINGS", "DUNWOODY", "MEDICAL CENTER", "BUCKHEAD", "LINDBERGH", "ARTS CENTER", "MIDTOWN", "NORTH AVENUE", "CIVIC CENTER", "PEACHTREE CENTER", "FIVE POINTS", "GARNETT", "WEST END", "OAKLAND CITY", "LAKEWOOD", "EAST POINT", "COLLEGE PARK", "AIRPORT"],
    GOLD: ["DORAVILLE", "CHAMBLEE", "BROOKHAVEN", "LENOX", "LINDBERGH", "ARTS CENTER", "MIDTOWN", "NORTH AVENUE", "CIVIC CENTER", "PEACHTREE CENTER", "FIVE POINTS", "GARNETT", "WEST END", "OAKLAND CITY", "LAKEWOOD", "EAST POINT", "COLLEGE PARK", "AIRPORT"],
    BLUE: ["HAMILTON E HOLMES", "WEST LAKE", "ASHBY", "VINE CITY", "OMNI", "FIVE POINTS", "GEORGIA STATE", "KING MEMORIAL", "INMAN PARK", "EDGEWOOD CANDLER PARK", "EAST LAKE", "DECATUR", "AVONDALE", "KENSINGTON", "INDIAN CREEK"],
    GREEN: ["BANKHEAD", "ASHBY", "VINE CITY", "OMNI", "FIVE POINTS", "GEORGIA STATE", "KING MEMORIAL", "INMAN PARK", "EDGEWOOD CANDLER PARK"]
};

const normalizeStation = (station) => String(station || "").toUpperCase().replace(/ STATION/i, "").trim();

const parseWaitingSeconds = (value) => {
    const secs = parseInt(value, 10);
    if (Number.isNaN(secs)) return ARRIVING_THRESHOLD_SECONDS;
    return Math.max(secs, MIN_WAIT_SECONDS);
};

const getTrainIdentityKey = (t) => {
    if (!t?.train_id) return null;
    return `${t.train_id}:${t.line || 'NA'}:${t.direction || 'NA'}`;
};

const getFocusedIndexForView = (viewState) => {
    if (!viewState) return null;
    const step = TRAIN_STEP_SECONDS > 0 ? TRAIN_STEP_SECONDS : 1;
    const stopsAway = Math.max(0, Math.floor(viewState.etaToFocusSeconds / step));
    const index = viewState.anchorIndex - stopsAway;
    return Math.max(0, Math.min(viewState.routeStations.length - 1, index));
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
                try {
                    initialCache[s] = JSON.parse(saved);
                } catch {
                    localStorage.removeItem(`marta_backup_${s}`);
                }
            }
        });
        return initialCache;
    });

    const [activeFilter, setActiveFilter] = useState("ALL");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const [showStationModal, setShowStationModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [toastMsg, setToastMsg] = useState("");
    const [locationOverridden, setLocationOverridden] = useState(() => {
        return localStorage.getItem('marta_user_station') !== null;
    });

    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('marta_theme') !== 'light';
    });

    const [isSplitScreen, setIsSplitScreen] = useState(() => {
        return localStorage.getItem('marta_split_screen') === 'true';
    });
    const [trainView, setTrainView] = useState(null);
    const stationItemRefs = useRef({});
    const lastTimelineScrollRef = useRef({ index: null, at: 0 });
    const currentTrains = useMemo(() => trainCache[currentStation] || [], [trainCache, currentStation]);

    useEffect(() => {
        if (isDarkMode) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
        localStorage.setItem('marta_theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    const toggleSplitScreen = () => {
        setIsSplitScreen(prev => {
            const next = !prev;
            localStorage.setItem('marta_split_screen', next ? 'true' : 'false');
            return next;
        });
    };

    // --- 2. IRONCLAD FETCH LOGIC (Now writes directly to the Omni-Cache) ---
    const fetchTrains = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/arrivals?station=${currentStation}`);
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();

            if (Array.isArray(data) && data.length > 0) {
                // Only update the specific station we are looking at
                setTrainCache(prev => ({ ...prev, [currentStation]: data }));
                localStorage.setItem(`marta_backup_${currentStation}`, JSON.stringify(data));
                setError(false);
            } else {
                console.warn("MARTA sent empty data. Ignoring glitch to prevent blank screen.");
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

                    const tickedTrains = stationTrains.map(t => {
                        if (t.status === 'Scheduled') return t;

                        let secs = parseInt(t.waiting_seconds, 10);
                        if (isNaN(secs) || secs <= 0) return t;

                        secs -= 1;

                        let newTimeStr = t.waiting_time;
                        if (secs <= 30) {
                            newTimeStr = "Arriving";
                        } else {
                            newTimeStr = Math.ceil(secs / 60) + " min";
                        }

                        return { ...t, waiting_seconds: secs.toString(), waiting_time: newTimeStr };
                    });

                    newCache[station] = tickedTrains;
                    stateChanged = true;
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

    const activeTrainKey = trainView?.trainKey || null;
    const selectedTrainIdentityKey = trainView?.trainIdentityKey || null;
    const selectedTrainIdentityRank = trainView?.trainIdentityRank ?? 0;
    const focusedTrainIndex = useMemo(() => getFocusedIndexForView(trainView), [trainView]);

    useEffect(() => {
        if (!activeTrainKey) return;
        const effectTrainKey = activeTrainKey;

        const ticker = setInterval(() => {
            setTrainView(prev => {
                if (!prev) return prev;
                if (prev.trainKey !== effectTrainKey) return prev;
                const nextEta = Math.max(0, prev.etaToFocusSeconds - 1);
                if (nextEta === prev.etaToFocusSeconds) return prev;
                return { ...prev, etaToFocusSeconds: nextEta };
            });
        }, 1000);

        return () => clearInterval(ticker);
    }, [activeTrainKey]);

    useEffect(() => {
        if (!activeTrainKey) return;

        let identitySeen = 0;
        const matched = currentTrains.find((t, i) => {
            const key = getTrainKey(t, i);
            if (key === activeTrainKey) return true;
            const identityKey = getTrainIdentityKey(t);
            if (selectedTrainIdentityKey && identityKey === selectedTrainIdentityKey) {
                if (identitySeen === selectedTrainIdentityRank) return true;
                identitySeen += 1;
            }
            return false;
        });
        if (!matched) {
            setTrainView(prev => (prev?.trainKey === activeTrainKey ? null : prev));
            return;
        }

        const freshEta = parseWaitingSeconds(matched.waiting_seconds);
        setTrainView(prev => {
            if (!prev) return prev;
            if (prev.trainKey !== activeTrainKey) return prev;
            const refreshedRoute = getRouteForTrain(matched.line || prev.line, matched.direction || prev.direction);
            const routeStations = refreshedRoute.length > 0 ? refreshedRoute : prev.routeStations;
            const normalizedMatchedStation = normalizeStation(matched.station);
            const refreshedAnchor = routeStations.indexOf(normalizedMatchedStation);
            const anchorIndex = refreshedAnchor >= 0 ? refreshedAnchor : prev.anchorIndex;
            const nextState = {
                ...prev,
                destination: matched.destination || prev.destination,
                line: matched.line || prev.line,
                direction: matched.direction || prev.direction,
                routeStations,
                anchorIndex,
                etaToFocusSeconds: freshEta
            };
            if (
                nextState.destination === prev.destination &&
                nextState.line === prev.line &&
                nextState.direction === prev.direction &&
                nextState.anchorIndex === prev.anchorIndex &&
                nextState.etaToFocusSeconds === prev.etaToFocusSeconds &&
                nextState.routeStations === prev.routeStations
            ) return prev;
            return nextState;
        });
    }, [activeTrainKey, currentTrains, selectedTrainIdentityKey, selectedTrainIdentityRank]);

    useEffect(() => {
        lastTimelineScrollRef.current = { index: null, at: 0 };
    }, [activeTrainKey]);

    useEffect(() => {
        if (focusedTrainIndex == null) return;
        const prevIndex = lastTimelineScrollRef.current.index;
        const elapsedSinceLast = Date.now() - lastTimelineScrollRef.current.at;
        const behavior = prevIndex == null || elapsedSinceLast < 1000 ? 'auto' : 'smooth';
        const focusedEl = stationItemRefs.current[focusedTrainIndex];
        if (focusedEl && focusedEl.scrollIntoView) {
            focusedEl.scrollIntoView({ behavior, block: 'center' });
        }
        lastTimelineScrollRef.current = { index: focusedTrainIndex, at: Date.now() };
    }, [focusedTrainIndex]);

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
            if (!nearest) return;
            setCurrentStation(prev => {
                if (prev === nearest) return prev;
                showToast(`📍 Found nearest: ${titleCase(nearest)}`);
                return nearest;
            });
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

    const getTrainKey = (t, i = -1) => {
        if (t.train_id) return `id:${t.train_id}:${t.line || 'NA'}:${t.direction || 'NA'}`;
        return `${t.line || 'NA'}-${t.direction || 'NA'}-${t.destination || 'NA'}-${normalizeStation(t.station) || 'NA'}-${i}`;
    };

    const getRouteForTrain = (line, direction) => {
        const route = TRAIN_ROUTES[line] || [];
        if (route.length === 0) return [];
        return direction === "S" || direction === "W" ? route : [...route].reverse();
    };

    const openTrainView = (train, rowIndex) => {
        const routeStations = getRouteForTrain(train.line, train.direction);
        if (routeStations.length === 0) {
            showToast("Route unavailable for this train.");
            return;
        }

        const stationFromTrain = normalizeStation(train.station);
        const fallbackStation = normalizeStation(currentStation);
        let focusIndex = routeStations.indexOf(stationFromTrain);
        if (focusIndex < 0) focusIndex = routeStations.indexOf(fallbackStation);
        if (focusIndex < 0) focusIndex = 0;

        setTrainView({
            trainKey: getTrainKey(train, rowIndex),
            trainId: train.train_id || "",
            destination: train.destination,
            line: train.line,
            direction: train.direction,
            trainIdentityKey: getTrainIdentityKey(train),
            trainIdentityRank: currentTrains
                .slice(0, rowIndex)
                .filter(item => getTrainIdentityKey(item) === getTrainIdentityKey(train)).length,
            routeStations,
            anchorIndex: focusIndex,
            etaToFocusSeconds: parseWaitingSeconds(train.waiting_seconds)
        });
    };

    const closeTrainView = () => setTrainView(null);

    const getStationEta = (viewState, stationIndex) => {
        if (!viewState) return null;
        const currentIndex = getFocusedIndexForView(viewState);
        if (currentIndex == null) return null;
        if (stationIndex < currentIndex) return -1;
        const etaAtCurrent = Math.max(0, viewState.etaToFocusSeconds - (viewState.anchorIndex - currentIndex) * TRAIN_STEP_SECONDS);
        return etaAtCurrent + (stationIndex - currentIndex) * TRAIN_STEP_SECONDS;
    };

    const formatTrainEta = (seconds) => {
        if (seconds == null) return "";
        if (seconds <= ARRIVING_THRESHOLD_SECONDS) return "Arriving";
        return `${Math.ceil(seconds / 60)} min`;
    };

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

    const visibleTrains = currentTrains.filter(t => activeFilter === "ALL" || t.destination === activeFilter);
    const uniqueDestinations = Array.from(new Set(currentTrains.map(t => t.destination))).sort();
    const displayStation = currentStation === "OMNI"
        ? "SEC District"
        : titleCase(currentStation.replace(/ STATION/i, ''));
    const trainHeaderTitle = trainView ? titleCase(trainView.destination || displayStation) : displayStation;
    const trainHeaderEta = trainView ? formatTrainEta(trainView.etaToFocusSeconds) : null;
    const trainIdLabel = trainView?.trainId ? `Train ${trainView.trainId}` : "Train";

    const northboundTrains = currentTrains.filter(t => t.direction === "N");
    const southboundTrains = currentTrains.filter(t => t.direction === "S");

    const renderTrainRow = (t, i) => {
        let mainTime = t.waiting_time;
        let subLabel = "MIN";
        if (mainTime === "Arriving") { mainTime = "ARR"; subLabel = ""; }
        else if (mainTime === "Boarding") { mainTime = "BRD"; subLabel = ""; }
        else { mainTime = mainTime.replace(' min', ''); }

        return (
            <button
                key={getTrainKey(t, i)}
                type="button"
                className="train-row status-real"
                onClick={() => openTrainView(t, i)}
                aria-label={`Open Train view for ${t.destination} ${t.direction || ''}`.trim()}
            >
                <div className={`line-bubble ${t.line}`}>{t.direction}</div>
                <div className="train-info"><div className="destination">{t.destination}</div></div>
                <div className="minutes-box">
                    <div className="minutes-main">{mainTime}</div>
                    <div className="minutes-sub">{subLabel}</div>
                </div>
            </button>
        );
    };

    const emptyState = (msg) => (
        <div style={{ textAlign: 'center', padding: '50px', opacity: 0.5, fontSize: '1.5rem' }}>{msg}</div>
    );

    return (
        <div className={`app-container${isSplitScreen ? ' split-screen-active' : ''}`}>
            <header className={trainView ? "train-view-header" : ""}>
                {trainView ? (
                    <>
                        <button className="back-btn" onClick={closeTrainView} aria-label="Close Train view">←</button>
                        <div className="train-header-main">
                            <div className="train-destination">{trainHeaderTitle}</div>
                            <div className="train-meta">
                                <div className={`line-bubble compact ${trainView.line}`}>{trainView.direction}</div>
                                <span>{trainHeaderEta}</span>
                                <small>{trainIdLabel}</small>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
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
                    </>
                )}
            </header>

            {trainView ? (
                <main className="train-timeline" tabIndex={0} aria-label="Train route timeline">
                    {trainView.routeStations.map((station, index) => {
                        const eta = getStationEta(trainView, index);
                        const isPassed = focusedTrainIndex != null ? index < focusedTrainIndex : false;
                        const isFocused = focusedTrainIndex != null ? index === focusedTrainIndex : false;
                        const rowClass = `timeline-row${isPassed ? ' passed' : ''}${isFocused ? ' focused' : ''}`;
                        return (
                            <div
                                key={`${station}-${index}`}
                                className={rowClass}
                                ref={(node) => { stationItemRefs.current[index] = node; }}
                                aria-current={isFocused ? "step" : undefined}
                                aria-label={`${titleCase(station)}${isFocused ? " current stop" : ""}${isPassed ? ", passed" : eta == null ? "" : `, ${formatTrainEta(eta)}`}`}
                            >
                                <div className="timeline-dot" />
                                <div className="timeline-station">{titleCase(station)}</div>
                                <div className="timeline-eta">{isPassed ? "Passed" : eta == null ? "" : formatTrainEta(eta)}</div>
                            </div>
                        );
                    })}
                </main>
            ) : isSplitScreen ? (
                <div className="split-container" style={{ opacity: isLoading && currentTrains.length > 0 ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                    <div className="split-panel">
                        <div className="split-panel-header">NORTHBOUND</div>
                        <div className="split-panel-body">
                            {isLoading && northboundTrains.length === 0
                                ? emptyState("Fetching schedule...")
                                : error && northboundTrains.length === 0
                                    ? emptyState("Connection Error")
                                    : northboundTrains.length === 0 && !isLoading
                                        ? emptyState("No trains found.")
                                        : northboundTrains.map((t, i) => renderTrainRow(t, i))
                            }
                        </div>
                    </div>
                    <div className="split-divider" />
                    <div className="split-panel">
                        <div className="split-panel-header">SOUTHBOUND</div>
                        <div className="split-panel-body">
                            {isLoading && southboundTrains.length === 0
                                ? emptyState("Fetching schedule...")
                                : error && southboundTrains.length === 0
                                    ? emptyState("Connection Error")
                                    : southboundTrains.length === 0 && !isLoading
                                        ? emptyState("No trains found.")
                                        : southboundTrains.map((t, i) => renderTrainRow(t, i))
                            }
                        </div>
                    </div>
                </div>
            ) : (
                <main style={{ transition: 'opacity 0.3s', opacity: isLoading && currentTrains.length > 0 ? 0.6 : 1 }}>
                    {isLoading && currentTrains.length === 0 ? (
                        emptyState("Fetching schedule...")
                    ) : error && currentTrains.length === 0 ? (
                        emptyState("Connection Error")
                    ) : currentTrains.length === 0 && !isLoading ? (
                        emptyState("No trains found.")
                    ) : (
                        visibleTrains.map((t, i) => renderTrainRow(t, i))
                    )}
                </main>
            )}

            <svg id="theme-toggle" viewBox="0 0 24 24" fill="currentColor" onClick={() => setIsDarkMode(!isDarkMode)}>
                {isDarkMode ? (
                    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
                ) : (
                    <path d="M12 9c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3m0-2c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z" />
                )}
            </svg>

            {!trainView && <button id="split-toggle" className={isSplitScreen ? 'active' : ''} onClick={toggleSplitScreen} title="Toggle split screen">⊞</button>}

            <div id="toast" className={toastMsg ? "show" : ""}>{toastMsg}</div>

            {!trainView && showStationModal && (
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

            {!trainView && showFilterModal && (
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