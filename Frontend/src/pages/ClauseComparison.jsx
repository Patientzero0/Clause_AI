import React, { useState } from 'react';
import { Search, ArrowRight, AlertTriangle, Scale, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ComparisonCard = ({ item, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="glass-panel"
        style={{
            marginBottom: '1.5rem',
            padding: '0',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)'
        }}
    >
        {/* Header - Feature Name & Impact */}
        <div style={{
            padding: '1rem 1.5rem',
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Scale size={18} color="var(--primary)" />
                {item.feature}
            </h3>
            <span style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontWeight: 600,
                background: item.impact?.toLowerCase() === 'high' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                color: item.impact?.toLowerCase() === 'high' ? '#ef4444' : '#eab308'
            }}>
                {item.impact} Impact
            </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', position: 'relative' }}>
            {/* IPC Side */}
            <div style={{ padding: '1.5rem', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>IPC (Old)</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>{item.ipc}</p>
            </div>

            {/* BNS Side */}
            <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.02)' }}>
                <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>BNS (New)</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>{item.bns}</p>
            </div>

            {/* Center Arrow Icon - Absolute Positioned */}
            <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
                <ArrowRight size={14} color="var(--text-tertiary)" />
            </div>
        </div>

        {/* Footer - Key Change */}
        <div style={{ padding: '1rem 1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderTop: '1px solid rgba(59, 130, 246, 0.1)' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem' }}>
                <ShieldAlert size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span><strong style={{ color: '#60a5fa' }}>Key Change:</strong> {item.key_change}</span>
            </p>
        </div>
    </motion.div>
);

const ClauseComparison = () => {
    const [query, setQuery] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setData(null);

        try {
            const response = await fetch('http://localhost:8000/query/comparison', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query, mode: "compare" }),
            });

            if (!response.ok) throw new Error('Failed to fetch comparison');

            const result = await response.json();

            // Backend returns { answer: { summary: "...", comparisons: [...] }, mode_used: "comparison" }
            // Note: comparison_agent.py returns a python dict which FastAPI converts to JSON.
            // So result.answer should be the object structure.

            if (typeof result.answer === 'string') {
                // Fallback if parsing failed on backend and it returned raw string
                // Try parsing it here just in case, or show error
                try {
                    setData(JSON.parse(result.answer));
                } catch (e) {
                    setError("Received raw text instead of structured data. Please try again.");
                }
            } else {
                setData(result.answer);
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Legal Provision Comparison
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    Analyze differences between the Indian Penal Code (1860) and Bharatiya Nyaya Sanhita (2023)
                </p>
            </div>

            <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '16px', marginBottom: '3rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Search size={20} color="var(--text-secondary)" style={{ marginLeft: '0.5rem' }} />
                <input
                    type="text"
                    placeholder="Enter a crime or section (e.g., 'Theft', 'Section 302')..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '1.1rem' }}
                />
                <button
                    onClick={handleSearch}
                    disabled={loading}
                    style={{
                        background: 'var(--primary)',
                        color: 'black',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        fontWeight: 600,
                        cursor: loading ? 'wait' : 'pointer',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Analyzing...' : 'Compare'}
                </button>
            </div>

            {error && (
                <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', textAlign: 'center', marginBottom: '2rem' }}>
                    <AlertTriangle size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    {error}
                </div>
            )}

            <AnimatePresence>
                {data && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {/* Summary Section */}
                        {data.summary && (
                            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', marginBottom: '3rem', background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)' }}>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>Summary of Changes</h3>
                                <p style={{ fontSize: '1.05rem', lineHeight: '1.7', color: 'var(--text-secondary)' }}>{data.summary}</p>
                            </div>
                        )}

                        {/* Comparison Cards */}
                        {data.comparisons && data.comparisons.map((item, index) => (
                            <ComparisonCard key={index} item={item} index={index} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {!loading && !data && !error && (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '10vh' }}>
                    <CheckCircle2 size={64} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                    <p>Ready to analyze legal frameworks.</p>
                </div>
            )}
        </div>
    );
};

export default ClauseComparison;
