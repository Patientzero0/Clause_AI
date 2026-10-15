import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, Phone, Star, Navigation, Loader2 } from 'lucide-react';

const containerStyle = {
    width: '100%',
    height: '100%'
};

const defaultCenter = {
    lat: 28.6139, // New Delhi
    lng: 77.2090
};

const libraries = ['places'];

// Helper for Promisified Geocoding
const resultFromGeocoder = (geocoder, location) => {
    return new Promise((resolve, reject) => {
        geocoder.geocode({ location: location }, (results, status) => {
            if (status === 'OK' && results[0]) {
                // Try to find a locality or sublocality for better precision
                // or just use formatted_address
                resolve(results[0].formatted_address);
            } else {
                reject(status);
            }
        });
    });
};

const LawyerSearch = () => {
    const [center, setCenter] = useState(defaultCenter);
    const [lawyers, setLawyers] = useState([]);
    const [selectedLawyer, setSelectedLawyer] = useState(null);
    const [map, setMap] = useState(null);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('Initializing...');



    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: libraries
    });

    const onLoad = useCallback(function callback(map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map) {
        setMap(null);
    }, []);

    const generateDummyLawyers = (lat, lng) => {
        const names = [
            'Advocate Sharma & Associates', 'Legal Minds LLP', 'Supreme Legal Services',
            'Justice First Chambers', 'Gupta & Sons Law Firm', 'City Legal Aid',
            'Modern Law Offices', 'Right Path Legal', 'Verdict Chambers', 'Prime Legal Solutions'
        ];

        return names.map((name, i) => ({
            place_id: `dummy-${Date.now()}-${i}`,
            name: name,
            geometry: {
                location: {
                    lat: lat + (Math.random() - 0.5) * 0.04, // Random spread ~4km
                    lng: lng + (Math.random() - 0.5) * 0.04
                }
            },
            vicinity: `${Math.floor(Math.random() * 50) + 1}, Legal District, Near City Center`,
            rating: (4 + Math.random()).toFixed(1),
            user_ratings_total: Math.floor(Math.random() * 200) + 20,
            opening_hours: { open_now: Math.random() > 0.3 }
        }));
    };

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setCenter(pos);

                    if (map) {
                        map.panTo(pos);
                        searchNearbyLawyers(pos, map);
                    }
                },
                (err) => {
                    console.error("Location error:", err);
                    setError("Location access denied. Please enable location services.");
                    // Fallback to default center if location denied, but try to search there
                    if (map) {
                        searchNearbyLawyers(defaultCenter, map);
                    }
                }
            );
        } else {
            setError("Geolocation is not supported by this browser.");
        }
    }, [map]);

    const handleSearchArea = () => {
        if (map) {
            const center = map.getCenter();
            const pos = {
                lat: center.lat(),
                lng: center.lng()
            };
            searchNearbyLawyers(pos, map);
        }
    };

    const searchNearbyLawyers = async (location, mapInstance) => {
        setStatus('Identifying location...');
        setError(null);

        try {
            // 1. Reverse Geocode to get a City/Area name (Better for Web Search than Coords)
            let searchLocation = `${location.lat}, ${location.lng}`;
            try {
                const geocoder = new window.google.maps.Geocoder();
                const response = await resultFromGeocoder(geocoder, location);
                if (response) {
                    searchLocation = response;
                    console.log("Geocoded Location:", searchLocation);
                }
            } catch (geoErr) {
                console.warn("Geocoding failed, using coords:", geoErr);
            }

            setStatus(`Consulting AI for lawyers in ${searchLocation}...`);

            // Call our smart AI backend
            const query = `Find top rated advocates and law firms in ${searchLocation} India.`;

            const response = await fetch('http://localhost:8000/search/lawyers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query, mode: 'lawyer' })
            });

            if (!response.ok) throw new Error("AI Backend Error");

            const data = await response.json();
            console.log("AI Response:", data.result);

            // Attempt to parse JSON from the AI response
            // The prompt asks for a JSON list, but LLMs often wrap it in ```json ... ```
            let aiPlaces = [];
            const jsonMatch = data.result.match(/\[.*\]/s) || data.result.match(/\{.*\}/s);

            if (jsonMatch) {
                try {
                    aiPlaces = JSON.parse(jsonMatch[0]);
                    // Normalize data to match our component's expected shape
                    aiPlaces = aiPlaces.map((lawyer, i) => ({
                        place_id: `ai-${i}`,
                        name: lawyer.Name || lawyer.name,
                        vicinity: lawyer.Address || lawyer.address || "Address not available",
                        rating: lawyer.Rating || "N/A",
                        geometry: {
                            location: {
                                // If the AI gives coords, use them. Else, randomize slightly around center to show on map
                                lat: lawyer.lat || location.lat + (Math.random() - 0.5) * 0.01,
                                lng: lawyer.lng || location.lng + (Math.random() - 0.5) * 0.01
                            }
                        },
                        opening_hours: { open_now: true } // Assume found lawyers are relevant
                    }));
                } catch (e) {
                    console.warn("Failed to parse AI JSON:", e);
                }
            }

            if (aiPlaces.length > 0) {
                setLawyers(aiPlaces);
                setStatus(`AI found ${aiPlaces.length} lawyers.`);
            } else {
                // Fallback: If AI returned text but no JSON, we can't map them easily.
                // For now, let's just show a status or maybe the text?
                // But the component is designed for a list.
                setStatus("AI returned results but formatted as text. See console.");
                console.log("Full AI Text:", data.result);
                // We could fallback to dummy data if parsing fails, just to show UI works?
                // setLawyers(generateDummyLawyers(location.lat, location.lng));
            }

        } catch (e) {
            console.error("Search Error:", e);
            setStatus('AI Search Failed. Using Backup Data.');
            setLawyers(generateDummyLawyers(location.lat, location.lng));
        }
    };

    if (loadError) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>
                <h2>Map Load Error</h2>
                <p>There was an error loading Google Maps. Please check your internet connection or API key.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{loadError.message}</p>
                <button
                    onClick={() => window.location.reload()}
                    style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                <Loader2 className="animate-spin" /> Loading Maps...
            </div>
        );
    }

    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>
                <h2>Google Maps API Key Missing</h2>
                <p>Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.</p>
            </div>
        );
    }

    return (
        <div className="fade-in" style={{ height: 'calc(100vh - 4rem)', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Find Nearby Lawyers</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Locate legal professionals in your area</p>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, gap: '1rem', height: '100%', overflow: 'hidden', flexDirection: window.innerWidth < 768 ? 'column' : 'row' }}>
                {/* Map Section */}
                <div style={{ flex: 2, borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={center}
                        zoom={14}
                        onLoad={onLoad}
                        onUnmount={onUnmount}
                        options={{
                            styles: [
                                { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                                { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                                { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                                // Add more dark mode styles here if needed
                            ]
                        }}
                    >
                        {/* User Location Marker */}
                        <Marker
                            position={center}
                            icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 10,
                                fillOpacity: 1,
                                strokeWeight: 2,
                                fillColor: '#4285F4',
                                strokeColor: '#ffffff',
                            }}
                        />

                        {/* Search This Area Button */}
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 10
                        }}>
                            <button
                                onClick={handleSearchArea}
                                style={{
                                    background: 'white',
                                    border: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '20px',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                    fontWeight: 'bold',
                                    color: '#333',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Navigation size={16} />
                                Search this Area
                            </button>
                        </div>

                        {/* Lawyer Markers */}
                        {lawyers.map((lawyer) => (
                            <Marker
                                key={lawyer.place_id}
                                position={lawyer.geometry.location}
                                onClick={() => setSelectedLawyer(lawyer)}
                            />
                        ))}

                        {selectedLawyer && (
                            <InfoWindow
                                position={selectedLawyer.geometry.location}
                                onCloseClick={() => setSelectedLawyer(null)}
                            >
                                <div style={{ color: 'black', padding: '0.5rem', maxWidth: '200px' }}>
                                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>{selectedLawyer.name}</h3>
                                    <p style={{ margin: 0, fontSize: '0.875rem' }}>{selectedLawyer.vicinity}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.5rem' }}>
                                        <Star size={14} fill="gold" color="gold" />
                                        <span>{selectedLawyer.rating || 'N/A'}</span>
                                        <span style={{ color: '#666' }}>({selectedLawyer.user_ratings_total || 0})</span>
                                    </div>
                                </div>
                            </InfoWindow>
                        )}
                    </GoogleMap>
                </div>

                {/* List Section */}
                <div className="glass-panel" style={{
                    flex: 1,
                    borderRadius: '1rem',
                    overflowY: 'auto',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    minWidth: '300px'
                }}>
                    <h3 style={{ margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Nearby Professionals</h3>
                    {lawyers.length === 0 ? (
                        <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)' }}>
                            <p>{map ? "Searching..." : "Map loading..."}</p>
                            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Status: {status}</p>
                        </div>
                    ) : (
                        lawyers.map((lawyer) => (
                            <div
                                key={lawyer.place_id}
                                onClick={() => {
                                    setSelectedLawyer(lawyer);
                                    map?.panTo(lawyer.geometry.location);
                                }}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '0.5rem',
                                    background: selectedLawyer?.place_id === lawyer.place_id ? 'var(--surface-hover)' : 'rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    border: '1px solid var(--border-color)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)' }}>{lawyer.name}</h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(255,215,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                        <Star size={12} fill="gold" color="gold" />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'gold' }}>{lawyer.rating || '-'}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                    <MapPin size={14} />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lawyer.vicinity}</span>
                                </div>
                                {lawyer.opening_hours?.open_now && (
                                    <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.75rem', color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                                        Open Now
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default LawyerSearch;
