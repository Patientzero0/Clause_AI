import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { Outlet, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { Menu } from 'lucide-react';

const DashboardLayout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const mainRef = useRef(null);
    const location = useLocation();

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setIsSidebarCollapsed(true);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // Smooth fade-in on route change
        gsap.fromTo(mainRef.current,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
        );
    }, [location.pathname]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
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

            {/* Mobile Menu Button */}
            {isMobile && isSidebarCollapsed && (
                <button
                    onClick={toggleSidebar}
                    style={{
                        position: 'fixed',
                        top: '1rem',
                        left: '1rem',
                        zIndex: 101,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '0.5rem',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <Menu size={24} />
                </button>
            )}

            <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} isMobile={isMobile} />

            <main ref={mainRef} style={{
                flex: 1,
                padding: isMobile ? '1rem' : '3rem',
                paddingTop: isMobile ? '4rem' : '3rem', // Add top padding for mobile menu
                overflowY: 'auto',
                maxHeight: '100vh',
                position: 'relative',
                width: '100%'
            }}>
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

export default DashboardLayout;
