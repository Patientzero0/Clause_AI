import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Phone, Star, Navigation, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const FindLawyers = () => {
    const [userLocation, setUserLocation] = useState(null);
    const [lawyers, setLawyers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLawyer, setSelectedLawyer] = useState(null);
    const mapRef = useRef(null);
    const googleMapRef = useRef(null);

    useEffect(() => {
        // Get User Location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(location);
                },
                (err) => {
                    console.error("Error getting location:", err);
                    setError("Could not get your location. Please enable location services.");
                    setLoading(false);
                }
            );
        } else {
            setError("Geolocation is not supported by this browser.");
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (userLocation && !googleMapRef.current) {
            initMap();
        }
    }, [userLocation]);

    const initMap = () => {
        if (!window.google) {
            setError("Google Maps API not loaded. Please check your API Key.");
            setLoading(false);
            return;
        }

        try {
            const map = new window.google.maps.Map(mapRef.current, {
                center: userLocation,
                zoom: 14,
                styles: [
                    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                    {
                        featureType: "administrative.locality",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                    },
                    {
                        featureType: "poi",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                    },
                    {
                        featureType: "poi.park",
                        elementType: "geometry",
                        stylers: [{ color: "#263c3f" }],
                    },
                    {
                        featureType: "poi.park",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#6b9a76" }],
                    },
                    {
                        featureType: "road",
                        elementType: "geometry",
                        stylers: [{ color: "#38414e" }],
                    },
                    {
                        featureType: "road",
                        elementType: "geometry.stroke",
                        stylers: [{ color: "#212a37" }],
                    },
                    {
                        featureType: "road",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#9ca5b3" }],
                    },
                    {
                        featureType: "road.highway",
                        elementType: "geometry",
                        stylers: [{ color: "#746855" }],
                    },
                    {
                        featureType: "road.highway",
                        elementType: "geometry.stroke",
                        stylers: [{ color: "#1f2835" }],
                    },
                    {
                        featureType: "road.highway",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#f3d19c" }],
                    },
                    {
                        featureType: "water",
                        elementType: "geometry",
                        stylers: [{ color: "#17263c" }],
                    },
                    {
                        featureType: "water",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#515c6d" }],
                    },
                    {
                        featureType: "water",
                        elementType: "labels.text.stroke",
                        stylers: [{ color: "#17263c" }],
                    },
                ],
            });

            googleMapRef.current = map;

            // User Marker
            new window.google.maps.Marker({
                position: userLocation,
                map: map,
                title: "You are here",
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#4285F4",
                    fillOpacity: 1,
                    strokeColor: "white",
                    strokeWeight: 2,
                },
            });

            searchNearbyLawyers(map);
        } catch (e) {
            console.error("Map init error:", e);
            setError("Error initializing map.");
            setLoading(false);
        }
    };

    const searchNearbyLawyers = async (map) => {
        try {
            setLoading(true);
            const query = `Find top rated lawyers near ${userLocation.lat}, ${userLocation.lng}`;

            const response = await fetch('http://localhost:8000/search/lawyers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query, mode: 'lawyer' })
            });

            if (!response.ok) throw new Error('Failed to fetch lawyers from AI');

            const data = await response.json();
            const rawText = data.result;

            let places = [];
            try {
                // 1. Clean the string: Remove markdown code blocks and whitespace
                let cleanJson = rawText
                    .replace(/```json/g, "")
                    .replace(/```/g, "")
                    .trim();

                // 2. Locate the array start/end (in case there's preamble text)
                const startIdx = cleanJson.indexOf('[');
                const endIdx = cleanJson.lastIndexOf(']') + 1;

                if (startIdx !== -1 && endIdx !== 0) {
                    cleanJson = cleanJson.substring(startIdx, endIdx);

                    // 3. Robust Parse
                    // Note: If AI sends unquoted keys (reason: instead of "reason":), 
                    // pure JSON.parse will still fail. We use a regex fix for common unquoted keys:
                    const fixedJson = cleanJson.replace(/(\s*?{\s*?|\s*?,\s*?)(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '$1"$3":');

                    places = JSON.parse(fixedJson);
                }
            } catch (pErr) {
                console.error("JSON Clean/Parse failed:", pErr);
                setError("The AI returned data in a format I couldn't read. Please try again.");
            }

            if (places.length > 0) {
                setLawyers(places);

                // Initialize Geocoder
                const geocoder = new window.google.maps.Geocoder();

                places.forEach((lawyer, index) => {
                    // 1. If we already have coordinates, use them
                    if (lawyer.lat && lawyer.lng) {
                        new window.google.maps.Marker({
                            position: { lat: parseFloat(lawyer.lat), lng: parseFloat(lawyer.lng) },
                            map: map,
                            title: lawyer.Name || lawyer.name,
                            animation: window.google.maps.Animation.DROP,
                        });
                    }
                    // 2. Otherwise, Geocode the address
                    else if (lawyer.Address || lawyer.address) {
                        const addressToGeocode = lawyer.Address || lawyer.address;

                        geocoder.geocode({ address: addressToGeocode }, (results, status) => {
                            if (status === "OK" && results[0]) {
                                const location = results[0].geometry.location;

                                new window.google.maps.Marker({
                                    position: location,
                                    map: map,
                                    title: lawyer.Name || lawyer.name,
                                    animation: window.google.maps.Animation.DROP,
                                });

                                // Optional: Extend bounds to include this new marker
                                // bounds.extend(location);
                                // map.fitBounds(bounds);
                            } else {
                                console.warn(`Geocode failed for ${lawyer.Name}: ${status}`);
                            }
                        });
                    }
                });
            }

            setLoading(false);
        } catch (err) {
            console.error("Backend search error:", err);
            setError("Error fetching lawyers from AI backend.");
            setLoading(false);
        }
    };

    return (
        <div className="fade-in" style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Find Nearby Lawyers (AI Powered)</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Using Google Gemini Maps Grounding to find the best legal help per your location.</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflow: 'hidden' }}>
                {/* Map Container - Keep it for context/visuals even if markers are tricky initially */}
                <div style={{ flex: 1, borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-color)' }}>
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                    {loading && <div className="loading-overlay">Scouring the map...</div>}
                </div>

                {/* List Container */}
                <div className="glass-panel" style={{ flex: 1, overflowY: 'auto', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                        AI Recommendations
                    </h3>

                    {lawyers.length === 0 && !loading && (
                        <div style={{ color: 'var(--text-secondary)' }}>
                            <p>No structured data found yet.</p>
                        </div>
                    )}

                    {lawyers.map((lawyer, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            style={{
                                padding: '1.5rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '12px',
                                marginBottom: '1rem',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-saffron)', marginBottom: '0.5rem' }}>
                                {lawyer.Name || lawyer.name}
                            </h4>
                            <p style={{ marginBottom: '0.5rem' }}><MapPin size={16} style={{ display: 'inline' }} /> {lawyer.Address || lawyer.address}</p>
                            {lawyer.Rating && <p style={{ color: '#fbbf24' }}><Star size={16} fill="#fbbf24" style={{ display: 'inline' }} /> {lawyer.Rating}</p>}
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                {lawyer.Specialization || "General Practice"}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FindLawyers;
