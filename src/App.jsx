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
    "AIRPORT": { lat: 33.6407, lon: -84.4440 }, "ARTS CENTER": { lat: 33.7893, lon: -84.3872 },
    "MIDTOWN": { lat: 33.7811, lon: -84.3863 }, "NORTH AVENUE": { lat: 33.7717, lon: -84.3870 },
    "FIVE POINTS": { lat: 33.7538, lon: -84.3915 }, "LINDBERGH": { lat: 33.8219, lon: -84.3674 }
    // Add remaining coordinates as needed
};

export default function App() {
    const [currentStation, setCurrentStation] = useState("MIDTOWN");
    const [trains, setTrains] = useState([]);
    const [activeFilter, setActiveFilter] = useState("ALL");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const [showStationModal, setShowStationModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [toastMsg, setToastMsg] = useState("");
    const [locationOverridden, setLocationOverridden] = useState(false);

    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('marta_theme') !== 'light';
    });

    useEffect(() => {
        if (isDarkMode) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
        localStorage.setItem('marta_theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    const fetchTrains = useCallback(async () => {
        setIsLoading(true);
        setError(false);
        try {
            // Relative URL routes perfectly to the Cloudflare Pages Function
            const response = await fetch(`/api/arrivals?station=${currentStation}`);
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            setTrains(data);
        } catch (err) {
            console.error("Fetch error", err);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [currentStation]);

    useEffect(() => {
        fetchTrains();
        const interval = setInterval(fetchTrains, 15000);
        return () => clearInterval(interval);
    }, [fetchTrains]);

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
        return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const handleStationChange = (station) => {
        setCurrentStation(station);
        setActiveFilter("ALL");
        setLocationOverridden(true);
        setShowStationModal(false);
    };

    const visibleTrains = trains.filter(t => activeFilter === "ALL" || t.destination === activeFilter);
    const uniqueDestinations = Array.from(new Set(trains.map(t => t.destination))).sort();
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

            <main>
                {error ? (
                    <div style={{ textAlign: 'center', padding: '50px', opacity: 0.5, fontSize: '1.5rem' }}>Connection Error</div>
                ) : trains.length === 0 && !isLoading ? (
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
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
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