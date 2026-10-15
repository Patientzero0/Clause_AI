import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, Download, ArrowLeft, Bot, User, Loader2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import ReactMarkdown from 'react-markdown';

const DraftEditor = () => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am Clause.ai. Describe the legal document or clause you need drafted.' }
    ]);
    const [inputText, setInputText] = useState('');
    const [currentDraft, setCurrentDraft] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const draftRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const userMessage = { role: 'user', content: inputText };
        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            // Prepare history for backend (exclude the very first greeting if it was local only, but here it's fine)
            // Backend expects history to include the *current* query? No, usually history is past. 
            // The DraftRequest has 'query' and 'history'.
            // Let's pass the conversation history accumulated so far.

            const historyPayload = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const response = await fetch('http://localhost:8000/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: userMessage.content,
                    history: historyPayload
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate draft');
            }

            const data = await response.json();

            // Should contain: status, message, draft (optional), reference (optional)



            const aiMessageContent = data.message || "Draft updated.";
            const missingInfo = data.missing_info || []; // Capture missing info

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: aiMessageContent,
                missing_info: missingInfo // Store in message state
            }]);

            if (data.draft) {
                setCurrentDraft(data.draft);
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error creating the draft." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();

        // Simple text dump for now, can be enhanced with proper splitTextToSize
        // Clean markdown symbols roughly for PDF
        const cleanText = currentDraft
            .replace(/\*\*/g, '') // bold
            .replace(/#/g, '') // headers
            .replace(/\n\n/g, '\n'); // spacing

        doc.setFontSize(12);
        const splitText = doc.splitTextToSize(cleanText, 180);
        doc.text(splitText, 15, 20);
        doc.save('legal-draft.pdf');
    };

    return (
        <div style={{
            height: 'calc(100vh - 100px)', // adjust for dashboard header/padding
            display: 'flex',
            gap: '1.5rem',
            fontFamily: 'var(--font-inter)'
        }}>

            {/* LEFT PANEL: Chat / Instructions */}
            <div style={{
                flex: '1',
                backgroundColor: 'var(--surface-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--surface-header)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <Bot size={20} className="text-primary" />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Drafting Assistant</h3>
                </div>

                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                marginBottom: '0.5rem'
                            }}
                        >
                            <div style={{
                                maxWidth: '85%',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                backgroundColor: msg.role === 'user' ? 'var(--primary)' : 'var(--surface-hover)',
                                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                                fontSize: '0.9rem',
                                borderTopLeftRadius: msg.role === 'assistant' ? '2px' : '12px',
                                borderTopRightRadius: msg.role === 'user' ? '2px' : '12px'
                            }}>
                                {msg.content}
                            </div>

                            {/* Render Missing Info Chips if available for this assistant message */}
                            {msg.missing_info && msg.missing_info.length > 0 && (
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem',
                                    marginTop: '0.5rem',
                                    marginLeft: msg.role === 'assistant' ? '0.5rem' : '0'
                                }}>
                                    {msg.missing_info.map((info, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setInputText(prev => prev + (prev ? ', ' : '') + info + ": ")}
                                            style={{
                                                fontSize: '0.75rem',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '20px',
                                                border: '1px solid var(--primary)',
                                                background: 'var(--surface-card)',
                                                color: 'var(--primary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--surface-card)'}
                                        >
                                            + {info}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ))}
                    <div ref={messagesEndRef} />

                    {isLoading && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Thinking...</span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSendMessage} style={{
                    padding: '1rem',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: '0.5rem'
                }}>
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Describe what to draft directly..."
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            outline: 'none'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            backgroundColor: 'var(--primary)',
                            color: '#fff',
                            border: 'none',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div >

            {/* RIGHT PANEL: Draft Preview */}
            < div style={{
                flex: '1.2',
                backgroundColor: 'var(--surface-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--surface-header)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} className="text-secondary" />
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Draft Preview</h3>
                    </div>
                    {currentDraft && (
                        <button
                            onClick={handleExportPDF}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--surface-hover)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            <Download size={16} />
                            Export PDF
                        </button>
                    )}
                </div>

                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '2rem',
                    backgroundColor: '#fff', // White paper-like background for the actual draft
                    color: '#000',
                    fontFamily: 'Times New Roman, serif', // Legal look
                    fontSize: '1.1rem',
                    lineHeight: '1.6'
                }}>
                    {currentDraft ? (
                        <div className="markdown-content" style={{ color: '#000' }}>
                            <ReactMarkdown>{currentDraft}</ReactMarkdown>
                        </div>
                    ) : (
                        <div style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                            opacity: 0.7
                        }}>
                            <FileText size={48} style={{ marginBottom: '1rem' }} />
                            <p>Generated draft will appear here.</p>
                        </div>
                    )}
                </div>
            </div >

        </div >
    );
};

export default DraftEditor;
