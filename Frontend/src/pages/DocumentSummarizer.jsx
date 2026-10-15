import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const DocumentSummarizer = () => {
    const [file, setFile] = useState(null);
    const [summary, setSummary] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleFileUpload(droppedFile);
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            handleFileUpload(selectedFile);
        }
    };

    const handleFileUpload = async (uploadedFile) => {
        setFile(uploadedFile);
        setIsLoading(true);
        setError(null);
        setSummary(null);

        const formData = new FormData();
        formData.append('file', uploadedFile);

        try {
            const response = await fetch('http://127.0.0.1:8000/summarize', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Error: ${response.statusText}`);
            }

            const data = await response.json();

            // The backend might return the JSON wrapped in markdown (e.g. ```json ... ```)
            // We need to extract the JSON part if it exists.
            let resultString = data.result;
            const jsonMatch = resultString.match(/```json\n([\s\S]*?)\n```/) || resultString.match(/```([\s\S]*?)```/);
            if (jsonMatch) {
                resultString = jsonMatch[1];
            }

            let parsedResult;
            try {
                parsedResult = JSON.parse(resultString);
            } catch (e) {
                console.warn("JSON parse failed, falling back to raw text", e);
                // Fallback if it's not valid JSON
                parsedResult = {
                    summary: resultString,
                    verdict: "See summary",
                    acts_cited: []
                };
            }

            // Normalize summary if it's an array (sometimes LLM returns a list of lines)
            if (Array.isArray(parsedResult.summary)) {
                parsedResult.summary = parsedResult.summary.join('\n');
            }

            setSummary(parsedResult);
        } catch (err) {
            console.error("Summarization failed:", err);
            setError(err.message || "Failed to summarize document. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Document Summarizer</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Upload legal documents, court orders, or judgments for instant analysis.</p>
            </div>

            <div
                className="glass-panel"
                onDragOver={handleDragOver}
                onDragLeave={handleLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: '2px dashed ' + (isDragging ? 'var(--primary)' : 'var(--border-color)'),
                    borderRadius: 'var(--radius-lg)',
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    backgroundColor: isDragging ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
                    transition: 'all 0.3s ease',
                    marginBottom: '2rem',
                    cursor: isLoading ? 'wait' : 'pointer'
                }}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept=".pdf,.docx,.txt"
                />

                {isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <Loader2 size={48} className="animate-spin text-primary" />
                        <p>Analyzing document...</p>
                    </div>
                ) : (
                    <>
                        <div style={{
                            background: 'var(--surface-2)',
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem auto',
                            color: 'var(--primary)'
                        }}>
                            <UploadCloud size={32} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                            {file ? file.name : "Drag & Drop your file here"}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {file ? "Click to upload another" : "or click to browse (PDF, DOCX, TXT)"}
                        </p>
                    </>
                )}
            </div>

            {error && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--destructive)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--destructive)',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {summary && (
                <div className="fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        {/* Verdict Card */}
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--success)' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', marginBottom: '1rem' }}>
                                <CheckCircle size={20} /> Final Verdict
                            </h4>
                            <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{summary.verdict || "N/A"}</p>
                        </div>

                        {/* Acts Cited */}
                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--warning)' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', marginBottom: '1rem' }}>
                                <AlertCircle size={20} /> Acts Cited
                            </h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {summary.acts_cited && Array.isArray(summary.acts_cited) ? (
                                    summary.acts_cited.map((act, i) => (
                                        <span key={i} style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}>
                                            {act}
                                        </span>
                                    ))
                                ) : (
                                    <span style={{ color: 'var(--text-secondary)' }}>No specific acts cited.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ marginTop: '2rem', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                        <h4 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} className="text-secondary" /> Case Summary
                        </h4>
                        <div style={{ color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                            {summary.summary}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentSummarizer;
