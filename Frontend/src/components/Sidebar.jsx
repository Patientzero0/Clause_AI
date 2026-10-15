import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, SplitSquareHorizontal, FileText, Scale, Flag, ChevronLeft, ChevronRight, Menu, X, MapPin, Gavel, PlayCircle, Share2 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LanguageSelect from './LanguageSelect';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isCollapsed, toggleSidebar, isMobile }) => {
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: MessageSquare, label: 'Legal Chat', path: '/dashboard/chat' },
        { icon: SplitSquareHorizontal, label: 'Comparison', path: '/dashboard/comparison' },
        { icon: FileText, label: 'Summarizer', path: '/dashboard/summarizer' },
        { icon: Scale, label: 'Regulations', path: '/dashboard/regulations' },
        { icon: Gavel, label: 'Judgements', path: '/dashboard/judgements' },
        { icon: MapPin, label: 'Find Lawyers', path: '/dashboard/lawyers' },
        { icon: PlayCircle, label: 'Simulation One', path: '/dashboard/simulation' },
        { icon: FileText, label: 'Draft Generation', path: '/dashboard/draft' },
        { icon: Share2, label: 'Legal Graph', path: '/dashboard/graph' },
    ];

    const sidebarWidth = isMobile ? '100%' : '280px';
    const collapsedWidth = isMobile ? '0px' : '80px';

    return (
        <>
            {/* Mobile Overlay Backdrop */}
            {isMobile && !isCollapsed && (
                <div
                    onClick={toggleSidebar}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        zIndex: 19,
                        backdropFilter: 'blur(4px)'
                    }}
                />
            )}

            <motion.aside
                initial={{ width: isCollapsed ? collapsedWidth : sidebarWidth, x: isMobile && isCollapsed ? -100 : 0 }}
                animate={{
                    width: isCollapsed ? collapsedWidth : sidebarWidth,
                    x: isMobile && isCollapsed ? -100 : 0
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{
                    height: '100vh',
                    position: isMobile ? 'fixed' : 'sticky',
                    top: 0,
                    left: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRight: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    zIndex: 20,
                    overflow: 'hidden',
                    maxWidth: isMobile ? '85%' : 'none', // Limit width on mobile so user can click out
                    boxShadow: isMobile && !isCollapsed ? '4px 0 24px rgba(0,0,0,0.3)' : 'none'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '2rem 1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: isCollapsed ? 'center' : 'space-between', alignItems: 'center' }}>
                        <AnimatePresence mode='wait'>
                            {!isCollapsed && (
                                <motion.h1
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-tricolor-gradient"
                                    style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        fontFamily: 'var(--font-display)',
                                        letterSpacing: '0.02em',
                                        margin: 0,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Clause AI
                                </motion.h1>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={toggleSidebar}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {isMobile ? <X size={24} /> : (isCollapsed ? <Menu size={24} /> : <ChevronLeft size={20} />)}
                        </button>
                        {!isCollapsed && <ThemeToggle />}
                    </div>

                    {!isCollapsed && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                        >
                            <Flag size={12} fill="var(--color-saffron)" color="var(--color-saffron)" /> Bhartiya Nyaya Sanhita
                        </motion.p>
                    )}

                    {!isCollapsed && (
                        <div style={{ marginTop: '0.5rem' }}>
                            <LanguageSelect />
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    padding: '1rem',
                    flex: 1,
                    overflowY: 'auto',
                    scrollbarWidth: 'none', // Firefox
                    msOverflowStyle: 'none',  // IE 10+
                }}>
                    <style>
                        {`
                            nav::-webkit-scrollbar {
                                display: none; /* Chrome/Safari */
                            }
                        `}
                    </style>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={isMobile ? toggleSidebar : undefined} // Close sidebar on nav click in mobile
                            end={item.path === '/dashboard'}
                            className={({ isActive }) => isActive ? "border-glow" : ""}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isCollapsed ? 'center' : 'flex-start',
                                gap: '1rem',
                                padding: '1rem 1.25rem',
                                textDecoration: 'none',
                                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                backgroundColor: isActive ? 'var(--surface-hover)' : 'transparent',
                                border: isActive ? '1px solid var(--primary-dim)' : '1px solid transparent',
                                borderRadius: '12px',
                                transition: 'all 0.3s ease',
                                fontFamily: 'var(--font-display)',
                                fontSize: '0.875rem',
                                letterSpacing: '0.05em',
                                position: 'relative' // For tooltip logic if needed later
                            })}
                            title={isCollapsed ? item.label : ''}
                        >
                            <item.icon size={20} />
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ fontWeight: 500, whiteSpace: 'nowrap' }}
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User Profile */}
                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', borderRadius: '50%', flexShrink: 0 }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>A</span>
                        </div>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>Advocate</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--primary)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Pro Access</p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </motion.aside>
        </>
    );
};

export default Sidebar;
