import React, { useState } from 'react';
import { Search, BookOpen, Scale, FileText, Loader2, AlertCircle, Gavel, Globe } from 'lucide-react';
import './JudgementSearch.css';

const JudgementSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [webResults, setWebResults] = useState(null);
    const [webLoading, setWebLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setResults(null);
        setWebResults(null);

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

        try {
            const response = await fetch(`${API_URL}/query/court`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: query, mode: 'court' }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch judgments');
            }

            const data = await response.json();
            setResults(data);

            // Trigger web search after successful court search
            console.log("Triggering web search for:", query);
            fetchWebResults(query, API_URL);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchWebResults = async (searchQuery, apiUrl) => {
        setWebLoading(true);
        try {
            console.log("Fetching web results...");
            const response = await fetch(`${apiUrl}/search/web`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: searchQuery }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Web search response:", data);
                if (data.sources && Array.isArray(data.sources)) {
                    setWebResults(data.sources);
                } else {
                    console.warn("Web search returned no sources or invalid format", data);
                    setWebResults([]);
                }
            } else {
                console.error("Web search failed with status:", response.status);
            }
        } catch (err) {
            console.error("Web search failed", err);
        } finally {
            setWebLoading(false);
        }
    };

    return (
        <div className="judgement-container">
            {/* Header Section */}
            <div className="judgement-header">
                <h1 className="text-tricolor-gradient">
                    <Gavel size={36} color="var(--color-saffron)" />
                    Supreme Court Judgments
                </h1>
                <p>
                    Search through landmark Supreme Court and High Court Judgments using natural language.
                    Get AI-summarized insights and direct case citations.
                </p>
            </div>

            {/* Search Section */}
            <div className="search-box-wrapper">
                <form onSubmit={handleSearch} className="search-form">
                    <div className="search-input-group">
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="search-input"
                            placeholder="e.g., Right to Privacy vs Aadhaar card judgments..."
                        />
                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="btn-primary search-button"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>Searching...</span>
                                </>
                            ) : (
                                <span>Search Cases</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Error Message */}
            {error && (
                <div className="error-message">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            )}

            {/* Results Section */}
            {results && (
                <div className="results-grid">

                    {/* AI Summary - Full Width */}
                    <div className="answer-section">
                        <div className="answer-header">
                            <Scale size={24} color="var(--color-saffron)" />
                            <h2>Legal Analysis & Summary</h2>
                        </div>
                        <div className="answer-content">
                            <div
                                className="answer-html"
                                dangerouslySetInnerHTML={{ __html: results.answer }}
                            />
                        </div>
                    </div>

                    {/* Cited Judgments - Below Summary */}
                    {results.sources && results.sources.length > 0 && (
                        <div className="citations-section">
                            <h3>
                                <BookOpen size={20} color="var(--color-saffron)" />
                                Cited Judgments
                            </h3>
                            <div className="citations-list">
                                {results.sources.map((source, index) => (
                                    <div
                                        key={`${index}-${source.file_name}`}
                                        className="citation-card"
                                    >
                                        <div className="citation-header">
                                            <div className="citation-tag">
                                                <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                                Case Law
                                            </div>
                                            <span className="citation-id">
                                                DOC-{index + 1}
                                            </span>
                                        </div>
                                        <h4 className="citation-title">
                                            {source.file_name}
                                        </h4>
                                        <p className="citation-preview">
                                            {source.preview}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Web Search Results - Below Citations */}
                    <div className="web-results-section" style={{ display: (webLoading || (webResults && webResults.length > 0)) ? 'flex' : 'none' }}>
                        <h3>
                            <Globe size={20} color="#4ade80" />
                            Web Search Results
                        </h3>

                        {webLoading ? (
                            <div className="web-loading">
                                <Loader2 className="animate-spin" size={24} color="var(--text-secondary)" />
                                <span>Searching the web for latest updates...</span>
                            </div>
                        ) : (
                            <div className="web-results-list">
                                {webResults && webResults.map((source, index) => (
                                    <a
                                        key={index}
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="web-result-card"
                                    >
                                        <div className="web-result-header">
                                            <div className="web-result-tag">
                                                <Globe size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                                {source.url ? new URL(source.url).hostname.replace('www.', '') : 'Web Source'}
                                            </div>
                                        </div>
                                        <h4 className="web-result-title">
                                            {source.title || `Source ${index + 1}`}
                                        </h4>
                                        <p className="web-result-preview">
                                            {source.content}
                                        </p>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!results && !loading && !error && (
                <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.3 }}>
                    <Gavel size={64} style={{ margin: '0 auto 1rem', display: 'block' }} />
                    <p style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>Ready to search the legal archives</p>
                </div>
            )}
        </div>
    );
};

export default JudgementSearch;
