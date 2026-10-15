import React, { useState } from 'react';
import { Filter, Search, ChevronRight, Globe, Loader2, AlertCircle, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const RegulatoryFilter = () => {
    const [activeFilter, setActiveFilter] = useState('All');
    const [jurisdiction, setJurisdiction] = useState('India');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const filters = ["All", "Corporate Law", "Information Technology", "Environmental", "Labor Laws", "Taxation"];
    const jurisdictions = ["India", "USA", "UK", "EU", "Singapore"];

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            // Prepare payload
            const payload = {
                query: query,
                domain: activeFilter === 'All' ? null : activeFilter
            };

            const response = await fetch(`${API_URL}/samvidhan/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch regulations');
            }

            const data = await response.json();
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Multi-Jurisdictional Regulatory Filtering</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Search and filter legal regulations by domain and jurisdiction.</p>
            </div>

            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>

                {/* Jurisdiction & Search Row */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Jurisdiction Dropdown */}
                    <div className="glass-panel" style={{
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        minWidth: '150px'
                    }}>
                        <Globe size={18} color="var(--primary)" />
                        <select
                            value={jurisdiction}
                            onChange={(e) => setJurisdiction(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                outline: 'none',
                                fontSize: '0.9rem',
                                width: '100%',
                                cursor: 'pointer'
                            }}
                        >
                            {jurisdictions.map(j => (
                                <option key={j} value={j} style={{ background: '#1a1a1a' }}>{j}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="glass-panel" style={{
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        flex: 1
                    }}>
                        <Search color="var(--text-secondary)" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={`Search ${jurisdiction} regulations...`}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '1rem' }}
                        />
                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            style={{
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : "Search"}
                        </button>
                    </form>
                </div>

                {/* Domain Filters */}
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {filters.map(filter => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '100px',
                                background: activeFilter === filter ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                                color: activeFilter === filter ? 'white' : 'var(--text-secondary)',
                                border: '1px solid ' + (activeFilter === filter ? 'var(--primary)' : 'var(--border-color)'),
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {filter === activeFilter && <Filter size={14} />}
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fca5a5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '2rem'
                }}>
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            )}

            {/* Results */}
            {results ? (
                <div className="fade-in">
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Legal Analysis</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <span style={{
                                        fontSize: '0.8rem',
                                        background: 'rgba(124, 58, 237, 0.1)',
                                        color: 'var(--primary)',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '100px'
                                    }}>
                                        {results.domain}
                                    </span>
                                    <span style={{
                                        fontSize: '0.8rem',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        color: 'var(--text-secondary)',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '100px'
                                    }}>
                                        {jurisdiction}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="markdown-content" style={{ lineHeight: '1.7', color: 'var(--text-primary)' }}>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    table: ({ node, ...props }) => (
                                        <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
                                            <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid var(--border-color)' }} {...props} />
                                        </div>
                                    ),
                                    th: ({ node, ...props }) => (
                                        <th style={{ border: '1px solid var(--border-color)', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', textAlign: 'left', fontWeight: '600' }} {...props} />
                                    ),
                                    td: ({ node, ...props }) => (
                                        <td style={{ border: '1px solid var(--border-color)', padding: '0.75rem' }} {...props} />
                                    ),
                                    a: ({ node, ...props }) => (
                                        <a style={{ color: 'var(--primary)', textDecoration: 'none' }} target="_blank" rel="noopener noreferrer" {...props} />
                                    ),
                                    ul: ({ node, ...props }) => (
                                        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }} {...props} />
                                    ),
                                    ol: ({ node, ...props }) => (
                                        <ol style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }} {...props} />
                                    ),
                                    h1: ({ node, ...props }) => <h1 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '1rem', color: 'white' }} {...props} />,
                                    h2: ({ node, ...props }) => <h2 style={{ fontSize: '1.25rem', marginTop: '1.5rem', marginBottom: '1rem', color: 'white' }} {...props} />,
                                    h3: ({ node, ...props }) => <h3 style={{ fontSize: '1.1rem', marginTop: '1rem', marginBottom: '0.5rem', color: 'white' }} {...props} />,
                                    p: ({ node, ...props }) => <p style={{ marginBottom: '1rem' }} {...props} />,
                                }}
                            >
                                {results.answer}
                            </ReactMarkdown>
                        </div>

                        {results.sources && results.sources.length > 0 && (
                            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <BookOpen size={18} color="var(--primary)" />
                                    Sources
                                </h4>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {results.sources.map((source, idx) => (
                                        <li key={idx} style={{ marginBottom: '0.5rem' }}>
                                            <a
                                                href={source}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                            >
                                                <ChevronRight size={14} />
                                                {source}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                !loading && (
                    <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.3 }}>
                        <Filter size={64} style={{ margin: '0 auto 1rem', display: 'block' }} />
                        <p style={{ fontSize: '1.2rem' }}>Select a domain and search for regulations</p>
                    </div>
                )
            )}
        </div>
    );
};

export default RegulatoryFilter;
