import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const STATION_LIST = [
    "AIRPORT", "ARTS CENTER", "ASHBY", "AVONDALE", "BANKHEAD", "BROOKHAVEN",
    "BUCKHEAD", "CHAMBLEE", "CIVIC CENTER", "COLLEGE PARK", "DECATUR",
    "DORAVILLE", "DUNWOODY", "EAST LAKE", "EAST POINT", "EDGEWOOD CANDLER PARK",
    "FIVE POINTS", "GARNETT", "GEORGIA STATE", "GOLD DOME", "HAMILTON E HOLMES",
    "INDIAN CREEK", "INMAN PARK", "KENSINGTON", "KING MEMORIAL", "LAKEWOOD",
    "LENOX", "LINDBERGH", "MEDICAL CENTER", "MIDTOWN", "NORTH AVENUE",
    "NORTH SPRINGS", "OAKLAND CITY", "PEACHTREE CENTER", "SANDY SPRINGS",
    "VINE CITY", "WEST END", "WEST LAKE"
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
                try { initialCache[s] = JSON.parse(saved); } catch (e) { }
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
    const displayStation = titleCase(currentStation.replace(/ STATION/i, ''));

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
                        else { mainTime = mainTime.replace(' min', ''); }

                        return (
                            <div key={i} className={`train-row status-real`}>
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