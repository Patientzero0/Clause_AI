import React, { useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { Outlet, useLocation } from 'react-router-dom';
import gsap from 'gsap';

const Layout = () => {
    const mainRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        // Smooth fade-in on route change
        gsap.fromTo(mainRef.current,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
        );
    }, [location.pathname]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', position: 'relative' }}>
            {/* Tricolor Top Border/Glow */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, var(--color-saffron) 0%, #fff 50%, var(--color-india-green) 100%)',
                zIndex: 100,
                boxShadow: '0 0 20px rgba(255, 153, 51, 0.3)'
            }}></div>

            <Sidebar />
            <main ref={mainRef} style={{ flex: 1, padding: '3rem', overflowY: 'auto', maxHeight: '100vh', position: 'relative' }}>
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '200px',
                    background: 'linear-gradient(to bottom, var(--bg-primary), transparent)',
                    pointerEvents: 'none',
                    zIndex: 5
                }} />
                <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 6 }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
