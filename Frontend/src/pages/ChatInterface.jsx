import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, FileText, Minimize2, Loader2, AlertCircle, X, Bot, MapPin, Globe, Mic, MicOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import PDFViewer from '../components/PDFViewer';
import Avatar from '../components/Avatar';

const ChatInterface = () => {
    const [messages, setMessages] = useState([
        { id: 1, type: 'ai', content: 'Hello! I am your AI Legal Assistant. You can ask me about Indian Penal Codes, BNS sections, or upload legal documents for summarization. How can I help you today?', citations: [] }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [selectedChunk, setSelectedChunk] = useState(null);
    const [isAvatarActive, setIsAvatarActive] = useState(false);
    const [lastAiResponse, setLastAiResponse] = useState('');
    const [searchMode, setSearchMode] = useState('rag');
    const [showModeDropdown, setShowModeDropdown] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Analyzing legal corpus...');
    const messagesEndRef = useRef(null);

    const [isListening, setIsListening] = useState(false);
    const [sttError, setSttError] = useState(null);
    const recognitionRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => {
                setIsListening(true);
                setSttError(null);
            };

            recognitionRef.current.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (finalTranscript) {
                    const finalText = finalTranscript.trim();
                    setInput(finalText);
                    setTimeout(() => {
                        if (finalText.trim()) {
                            handleSend(finalText);
                        }
                    }, 200);
                } else if (interimTranscript) {
                    setInput(interimTranscript);
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setSttError(`Speech recognition error: ${event.error}`);
                setIsListening(false);

                if (event.error === 'no-speech') {
                    setTimeout(() => {
                        if (recognitionRef.current && isListening) {
                            try {
                                recognitionRef.current.start();
                            } catch (e) {
                                console.error('Failed to restart recognition:', e);
                            }
                        }
                    }, 500);
                }
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        } else {
            setSttError('Speech recognition is not supported in this browser.');
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignore
                }
            }
        };
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            setSttError('Speech recognition not available');
            return;
        }

        if (isListening) {
            try {
                recognitionRef.current.stop();
                setIsListening(false);
            } catch (e) {
                console.error('Error stopping recognition:', e);
            }
        } else {
            try {
                setInput('');
                setSttError(null);
                recognitionRef.current.start();
            } catch (e) {
                console.error('Error starting recognition:', e);
                setSttError('Failed to start speech recognition');
            }
        }
    };

    const handleSend = async (textOverride = null) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim()) return;

        const userMessage = { id: Date.now(), type: 'user', content: textToSend };
        const aiMessageId = Date.now() + 1;
        const isStreaming = searchMode !== 'web';
        setMessages(prev => isStreaming
            ? [...prev, userMessage, { id: aiMessageId, type: 'ai', content: '', citations: [] }]
            : [...prev, userMessage]
        );
        setInput('');
        setLoadingMessage('Searching local legal documents...');
        setIsLoading(true);

        try {
            const endpoint = searchMode === 'web'
                ? 'http://localhost:8000/search/web'
                : 'http://localhost:8000/query/stream';
            const body = searchMode === 'web'
                ? { query: textToSend }
                : { query: textToSend, mode: 'mixed' };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch response');
            }

            const mapCitations = (sources) => {
                if (searchMode === 'web') {
                    return sources.map((source, index) => ({
                        id: index,
                        text: source.title || `Source ${index + 1}`,
                        link: source.url,
                        type: 'web',
                        content: source.content,
                        details: source
                    }));
                }

                return sources.map((source, index) => {
                    const fileName = source.file_name || "";
                    const section = source.section && source.section !== "N/A" ? source.section : "";

                    return {
                        id: index,
                        text: section ? `${source.law_type} ${section}` : (fileName || `Source ${index + 1}`),
                        link: '#',
                        type: 'pdf',
                        pdfUrl: fileName ? `http://localhost:8000/pdfs/${encodeURIComponent(fileName)}` : null,
                        details: source
                    };
                });
            };

            if (isStreaming) {
                if (!response.body) throw new Error('Streaming response is unavailable in this browser.');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let answer = '';
                let citations = [];

                const handleEvent = (line) => {
                    if (!line.trim()) return;
                    const event = JSON.parse(line);
                    if (event.error) throw new Error(event.error);
                    if (event.status === 'retrieving') {
                        setLoadingMessage('Searching local legal documents...');
                    }
                    if (event.sources) {
                        citations = mapCitations(event.sources);
                        setLoadingMessage('Loading local model and generating answer...');
                        setMessages(prev => prev.map(message => message.id === aiMessageId
                            ? { ...message, citations }
                            : message
                        ));
                    }
                    if (event.token) {
                        answer += event.token;
                        setMessages(prev => prev.map(message => message.id === aiMessageId
                            ? { ...message, content: answer, citations }
                            : message
                        ));
                    }
                };

                while (true) {
                    const { value, done } = await reader.read();
                    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    lines.forEach(handleEvent);
                    if (done) break;
                }
                handleEvent(buffer);
                if (!answer) throw new Error('Ollama returned an empty answer.');
                setLastAiResponse(answer);
            } else {
                const data = await response.json();
                const aiMessage = {
                    id: Date.now() + 1,
                    type: 'ai',
                    content: data.answer,
                    citations: mapCitations(data.sources || [])
                };
                setMessages(prev => [...prev, aiMessage]);
                setLastAiResponse(data.answer);
            }
        } catch (error) {
            console.error("Error asking AI:", error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'error',
                content: `I couldn't get an answer from the local model: ${error.message}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePdfClick = async (citation) => {
        if (!citation.pdfUrl) return;

        console.log("Testing PDF URL:", citation.pdfUrl);

        try {
            const testResponse = await fetch(citation.pdfUrl, { method: 'HEAD' });
            console.log("PDF accessibility test:", testResponse.status);

            if (!testResponse.ok) {
                alert(`PDF not accessible (HTTP ${testResponse.status}). Please check:\n1. Backend server is running on port 8000\n2. PDF exists in data folder\n3. CORS is enabled\n\nFile: ${citation.pdfUrl}`);
                return;
            }

            const searchTerms = [];
            if (citation.details?.section && citation.details.section !== "N/A") {
                searchTerms.push(citation.details.section);
            }

            const chunkText = citation.details?.preview || citation.content || "";

            setSelectedPdf({
                url: citation.pdfUrl,
                searchTerms: searchTerms,
                chunkText: chunkText
            });
        } catch (err) {
            console.error("PDF fetch error:", err);
            alert(`Cannot access PDF. Error: ${err.message}\n\nPlease ensure:\n1. Backend is running on http://localhost:8000\n2. PDF file exists in the data folder\n3. File name matches exactly: ${citation.details?.file_name}`);
        }
    };

    return (
        <div className="fade-in" style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem' }}>Legal Assistant Chat</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>BNS & IPC Expert • Bilingual Support</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowModeDropdown(!showModeDropdown)}
                            className="glass-panel"
                            style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer',
                                minWidth: '160px',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {searchMode === 'rag' ? <FileText size={16} className="text-blue-400" /> : <Globe size={16} className="text-green-400" />}
                                <span style={{ fontWeight: 500 }}>
                                    {searchMode === 'rag' ? 'Legal Corpus' : 'Web Search'}
                                </span>
                            </div>
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.5, transform: showModeDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        {showModeDropdown && (
                            <div className="glass-panel" style={{
                                position: 'absolute',
                                top: '110%',
                                right: 0,
                                width: '100%',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                zIndex: 10,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                border: '1px solid var(--border-color)',
                                padding: '4px'
                            }}>
                                <button
                                    onClick={() => { setSearchMode('rag'); setShowModeDropdown(false); }}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        background: searchMode === 'rag' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                        border: 'none',
                                        color: 'var(--text-primary)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        borderRadius: '8px'
                                    }}
                                >
                                    <div style={{ padding: '6px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '6px', color: '#60a5fa' }}>
                                        <FileText size={16} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Legal Corpus</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Answers from uploaded docs</div>
                                    </div>
                                    {searchMode === 'rag' && <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#60a5fa' }} />}
                                </button>

                                <button
                                    onClick={() => { setSearchMode('web'); setShowModeDropdown(false); }}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        background: searchMode === 'web' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                        border: 'none',
                                        color: 'var(--text-primary)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        marginTop: '4px'
                                    }}
                                >
                                    <div style={{ padding: '6px', background: 'rgba(34, 197, 94, 0.2)', borderRadius: '6px', color: '#4ade80' }}>
                                        <Globe size={16} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Web Search</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Live internet results</div>
                                    </div>
                                    {searchMode === 'web' && <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />}
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setIsAvatarActive(!isAvatarActive)}
                            className={`glass-panel ${isAvatarActive ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : ''}`}
                            style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '8px',
                                color: isAvatarActive ? '#a855f7' : 'var(--text-secondary)',
                                transition: 'all 0.3s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: 500
                            }}
                            title={isAvatarActive ? "Deactivate AI HUMAN" : "Activate AI HUMAN"}
                        >
                            <Bot size={18} />
                            <span>AI HUMAN</span>
                        </button>
                        <button className="glass-panel" style={{ padding: '0.5rem', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                            <Minimize2 size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {messages.map((msg, idx) => (
                        <div key={msg.id} style={{
                            alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: msg.type === 'ai' ? '100%' : '85%',
                            width: msg.type === 'ai' ? '100%' : 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start'
                        }}>
                            <div style={{
                                padding: '1rem 1.5rem',
                                borderRadius: '1rem',
                                borderBottomLeftRadius: msg.type === 'ai' ? '0' : '1rem',
                                borderBottomRightRadius: msg.type === 'user' ? '0' : '1rem',
                                background: msg.type === 'user' ? 'var(--primary)' :
                                    msg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                color: msg.type === 'error' ? '#ef4444' : 'var(--text-primary)',
                                lineHeight: '1.6',
                                border: msg.type === 'ai' ? '1px solid var(--border-color)' :
                                    msg.type === 'error' ? '1px solid #ef4444' : 'none'
                            }}>
                                {msg.type === 'error' && <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', fontWeight: 'bold' }}><AlertCircle size={16} /> Error</div>}

                                {msg.type === 'ai' ? (
                                    <div className="markdown-content">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                                )}
                            </div>

                            {msg.type === 'ai' && msg.citations && msg.citations.length > 0 && (() => {
                                const pdfCitations = msg.citations.filter(c => c.type === 'pdf');
                                const webCitations = msg.citations.filter(c => c.type === 'web');

                                return (
                                    <div style={{ marginTop: '1.5rem', width: '100%' }}>
                                        {pdfCitations.length > 0 && (
                                            <div style={{ marginBottom: '1.5rem' }}>
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    color: 'var(--text-secondary)',
                                                    marginBottom: '1rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    <FileText size={16} className="text-blue-400" />
                                                    Citations
                                                </div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                                    gap: '1rem'
                                                }}>
                                                    {pdfCitations.map((citation, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                background: 'rgba(255,255,255,0.03)',
                                                                border: '1px solid var(--border-color)',
                                                                borderRadius: '12px',
                                                                padding: '1rem',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '0.75rem',
                                                                textAlign: 'left',
                                                                width: '100%'
                                                            }}
                                                        >
                                                            <button
                                                                onClick={() => handlePdfClick(citation)}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    padding: 0,
                                                                    textAlign: 'left',
                                                                    cursor: 'pointer',
                                                                    width: '100%',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '0.75rem'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                                    <FileText size={14} className="text-blue-400" />
                                                                    <span>Legal Document</span>
                                                                </div>

                                                                <div style={{
                                                                    fontSize: '0.95rem',
                                                                    fontWeight: 600,
                                                                    color: 'var(--text-primary)',
                                                                    display: '-webkit-box',
                                                                    WebkitLineClamp: 2,
                                                                    WebkitBoxOrient: 'vertical',
                                                                    overflow: 'hidden',
                                                                    lineHeight: '1.4'
                                                                }}>
                                                                    {citation.text}
                                                                </div>

                                                                {citation.content && (
                                                                    <div style={{
                                                                        fontSize: '0.875rem',
                                                                        color: 'var(--text-secondary)',
                                                                        display: '-webkit-box',
                                                                        WebkitLineClamp: 3,
                                                                        WebkitBoxOrient: 'vertical',
                                                                        overflow: 'hidden',
                                                                        lineHeight: '1.5'
                                                                    }}>
                                                                        {citation.content}
                                                                    </div>
                                                                )}
                                                            </button>
                                                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handlePdfClick(citation);
                                                                    }}
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: '6px',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid var(--border-color)',
                                                                        background: 'rgba(255,255,255,0.05)',
                                                                        color: 'var(--text-primary)',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.75rem',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                >
                                                                    <FileText size={12} /> View PDF
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedChunk(citation);
                                                                    }}
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: '6px',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid var(--border-color)',
                                                                        background: 'rgba(255,255,255,0.05)',
                                                                        color: 'var(--text-primary)',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.75rem',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                >
                                                                    <FileText size={12} /> View Text
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {webCitations.length > 0 && (
                                            <div>
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    color: 'var(--text-secondary)',
                                                    marginBottom: '1rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    <Globe size={16} className="text-green-400" />
                                                    Web Search Results
                                                </div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                                    gap: '1rem'
                                                }}>
                                                    {webCitations.map((citation, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={citation.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                background: 'rgba(255,255,255,0.03)',
                                                                border: '1px solid var(--border-color)',
                                                                borderRadius: '12px',
                                                                padding: '1rem',
                                                                textDecoration: 'none',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '0.75rem'
                                                            }}
                                                            onMouseOver={(e) => {
                                                                e.currentTarget.style.borderColor = 'var(--secondary-accent)';
                                                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                                <Globe size={14} className="text-green-400" />
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {new URL(citation.link).hostname.replace('www.', '')}
                                                                </span>
                                                            </div>

                                                            <div style={{
                                                                fontSize: '0.95rem',
                                                                fontWeight: 600,
                                                                color: 'var(--text-primary)',
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                lineHeight: '1.4'
                                                            }}>
                                                                {citation.text}
                                                            </div>

                                                            {citation.content && (
                                                                <div style={{
                                                                    fontSize: '0.875rem',
                                                                    color: 'var(--text-secondary)',
                                                                    display: '-webkit-box',
                                                                    WebkitLineClamp: 3,
                                                                    WebkitBoxOrient: 'vertical',
                                                                    overflow: 'hidden',
                                                                    lineHeight: '1.5'
                                                                }}>
                                                                    {citation.content}
                                                                </div>
                                                            )}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {msg.type === 'ai' && idx === messages.length - 1 && !isLoading && (
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => window.location.href = '/dashboard/lawyers'}
                                        style={{
                                            background: 'rgba(66, 133, 244, 0.1)',
                                            border: '1px solid #4285F4',
                                            color: '#4285F4',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '20px',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(66, 133, 244, 0.2)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(66, 133, 244, 0.1)'}
                                    >
                                        <MapPin size={16} />
                                        Find nearby lawyers?
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
                            <div style={{
                                padding: '1rem 1.5rem',
                                borderRadius: '1rem',
                                borderBottomLeftRadius: '0',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: 'var(--text-secondary)'
                            }}>
                                <Loader2 size={18} className="animate-spin" />
                                <span>{loadingMessage}</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                    {sttError && (
                        <div style={{
                            marginBottom: '0.5rem',
                            padding: '0.5rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            color: '#ef4444',
                            fontSize: '0.875rem'
                        }}>
                            {sttError}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button style={{ color: 'var(--text-secondary)', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s' }}>
                            <Paperclip size={20} />
                        </button>
                        <button
                            onClick={toggleListening}
                            disabled={isLoading}
                            style={{
                                color: isListening ? '#ef4444' : 'var(--text-secondary)',
                                padding: '0.5rem',
                                borderRadius: '8px',
                                transition: 'all 0.2s',
                                background: isListening ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                border: isListening ? '1px solid #ef4444' : 'none',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title={isListening ? "Stop listening" : "Start voice input"}
                        >
                            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={isListening ? "Listening..." : "Ask a legal question..."}
                            disabled={isLoading || isListening}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontSize: '1rem',
                                padding: '0.5rem',
                                outline: 'none',
                                opacity: isListening ? 0.7 : 1
                            }}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={isLoading || !input.trim() || isListening}
                            className="btn-primary"
                            style={{
                                padding: '0.5rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                borderRadius: '8px',
                                opacity: (isLoading || !input.trim() || isListening) ? 0.5 : 1,
                                cursor: (isLoading || !input.trim() || isListening) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <span>Send</span> <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .markdown-content p { margin-bottom: 0.5rem; }
                .markdown-content p:last-child { margin-bottom: 0; }
                .markdown-content ul, .markdown-content ol { margin-left: 1.5rem; margin-bottom: 0.5rem; }
                .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin-top: 0.5rem; margin-bottom: 0.5rem; font-size: 1.1em; font-weight: bold; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>

            {selectedChunk && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 1000,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '2rem'
                }}>
                    <div style={{
                        width: '600px',
                        maxWidth: '90%',
                        maxHeight: '80vh',
                        background: '#1e1e1e',
                        borderRadius: '1rem',
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.05)'
                        }}>
                            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                                {selectedChunk.text}
                            </h3>
                            <button
                                onClick={() => setSelectedChunk(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'none';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{
                            padding: '1.5rem',
                            overflowY: 'auto',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem'
                        }}>
                            {selectedChunk.content || selectedChunk.details?.preview || "No text content available."}
                        </div>
                    </div>
                </div>
            )}

            {selectedPdf && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 1000,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '2rem'
                }}>
                    <div style={{
                        width: '90%',
                        height: '90%',
                        background: 'white',
                        borderRadius: '1rem',
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '1rem',
                            borderBottom: '1px solid #eee',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8f9fa'
                        }}>
                            <h3 style={{ margin: 0, color: '#333' }}>Document Viewer</h3>
                            <button
                                onClick={() => setSelectedPdf(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#666'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <PDFViewer
                                fileUrl={selectedPdf.url}
                                searchTerms={selectedPdf.searchTerms}
                                chunkText={selectedPdf.chunkText}
                            />
                        </div>
                    </div>
                </div>
            )}

            <Avatar
                isActive={isAvatarActive}
                onClose={() => setIsAvatarActive(false)}
                textToSpeak={lastAiResponse}
            />
        </div>
    );
};

export default ChatInterface;