import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, Scale, AlertCircle, ChevronDown, ChevronRight, Play, BookOpen, User, Shield, BarChart3, FileText, CheckCircle2 } from 'lucide-react';

const SimulationPage = () => {
    const [caseSummary, setCaseSummary] = useState("First-time offender, age 21, convicted for Shoplifting (BNS 303). Value of goods: Rs. 2000. No prior criminal record.");
    const [simulationData, setSimulationData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeStep, setActiveStep] = useState(0);

    const handleSimulation = async () => {
        setLoading(true);
        setError(null);
        setSimulationData(null);
        setActiveStep(0);

        try {
            const response = await fetch('http://localhost:8000/advocate/simulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ case_summary: caseSummary }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Simulation failed');
            }

            const data = await response.json();

            // Parse the simulation string into steps
            const steps = parseSimulation(data.simulation);

            setSimulationData({
                ...data,
                steps: steps
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const parseSimulation = (simulationText) => {
        const segments = simulationText.split(/\*\*Judge:\*\*/g).filter(s => s.trim());

        return segments.map((segment, index) => {
            const parts = segment.split(/\*\*Counsel:\*\*/g);
            const question = parts[0]?.trim();
            const response = parts[1]?.trim();

            return {
                id: index,
                question: question || "Question parsing failed",
                response: response || "Response parsing failed",
                title: `Judicial Inquiry ${index + 1}`
            };
        });
    };

    // Styles
    const containerStyle = {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
        overflow: 'hidden',
        color: 'var(--text-primary)'
    };

    const headerStyle = {
        padding: '1.5rem 2rem',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    };

    const mainStyle = {
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
    };

    const simulationAreaStyle = {
        flex: 1,
        padding: '2rem',
        overflowY: 'auto',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
    };

    const analysisPanelStyle = {
        width: '400px',
        backgroundColor: 'var(--bg-secondary)',
        padding: '1.5rem',
        overflowY: 'auto',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
    };

    const cardStyle = {
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
    };

    return (
        <div style={containerStyle}>
            {/* Header Section */}
            <header style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Gavel size={28} color="var(--primary)" />
                    <h1 className="text-tricolor-gradient" style={{ fontSize: '1.75rem', margin: 0 }}>
                        Judicial Simulation
                    </h1>
                </div>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '800px', margin: 0, fontSize: '0.95rem' }}>
                    Experience a structured courtroom evaluation. This simulation demonstrates how judicial reasoning applies legal principles to specific case facts.
                </p>
            </header>

            <div style={mainStyle}>
                {/* Main Simulation Area */}
                <main style={simulationAreaStyle} className="custom-scrollbar">

                    {/* Input Section */}
                    <div style={cardStyle}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Case Context
                        </label>
                        <textarea
                            value={caseSummary}
                            onChange={(e) => setCaseSummary(e.target.value)}
                            style={{
                                width: '100%',
                                height: '100px',
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '1rem',
                                color: 'var(--text-primary)',
                                fontFamily: 'var(--font-sans)',
                                fontSize: '0.95rem',
                                resize: 'none',
                                outline: 'none'
                            }}
                            placeholder="Enter case details..."
                        />
                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleSimulation}
                                disabled={loading}
                                className="btn-primary"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    opacity: loading ? 0.7 : 1,
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? 'Deliberating...' : (
                                    <>
                                        <Play size={18} fill="currentColor" />
                                        Commence Simulation
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <AlertCircle size={20} />
                            <p style={{ margin: 0 }}>{error}</p>
                        </div>
                    )}

                    {/* Simulation Timeline */}
                    {simulationData && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ width: '6px', height: '24px', backgroundColor: 'var(--primary)', borderRadius: '4px' }} />
                                Courtroom Proceedings
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {simulationData.steps.map((step, index) => (
                                    <motion.div
                                        key={step.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        style={{
                                            border: activeStep === index ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                            backgroundColor: activeStep === index ? 'var(--surface-hover)' : 'var(--bg-secondary)',
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        <button
                                            onClick={() => setActiveStep(index)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '1rem 1.5rem',
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: activeStep === index ? 'var(--primary)' : 'var(--surface-2)',
                                                    color: activeStep === index ? 'white' : 'var(--text-secondary)'
                                                }}>
                                                    {index + 1}
                                                </div>
                                                <span style={{ fontWeight: 500, color: activeStep === index ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '1rem' }}>
                                                    {step.title}
                                                </span>
                                            </div>
                                            {activeStep === index ? <ChevronDown size={20} color="var(--text-primary)" /> : <ChevronRight size={20} color="var(--text-secondary)" />}
                                        </button>

                                        <AnimatePresence>
                                            {activeStep === index && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    style={{ borderTop: '1px solid var(--border-color)' }}
                                                >
                                                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                        {/* Judge's Question */}
                                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                <Scale size={20} color="var(--text-primary)" />
                                                            </div>
                                                            <div>
                                                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Honorable Judge</p>
                                                                <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: '1.125rem', fontStyle: 'italic' }}>
                                                                    "{step.question}"
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Counsel's Response */}
                                                        <div style={{ display: 'flex', gap: '1rem', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border-color)', marginLeft: '1.25rem' }}>
                                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255, 153, 51, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                <Shield size={20} color="var(--primary)" />
                                                            </div>
                                                            <div>
                                                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Defense Counsel</p>
                                                                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                                                                    {step.response}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>

                {/* Analysis Panel */}
                <aside style={analysisPanelStyle} className="custom-scrollbar">
                    <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <BookOpen size={20} color="var(--primary)" />
                        Judicial Analysis
                    </h2>

                    {!simulationData ? (
                        <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: '12px' }}>
                            <Scale size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Start the simulation to view legal analysis and context.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                            {/* Verdict Probability Chart */}
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <BarChart3 size={16} />
                                    Outcome Probability
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Probation / Leniency</span>
                                            <span style={{ color: 'var(--color-india-green)', fontWeight: 'bold' }}>75%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: '75%', height: '100%', backgroundColor: 'var(--color-india-green)' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Community Service</span>
                                            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>45%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: '45%', height: '100%', backgroundColor: 'var(--primary)' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Incarceration</span>
                                            <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>10%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: '10%', height: '100%', backgroundColor: 'var(--text-muted)' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Legal Context Table */}
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileText size={16} />
                                    Statutory Framework
                                </h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)' }}>Section</th>
                                                <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)' }}>Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr style={{ borderBottom: '1px solid var(--surface-2)' }}>
                                                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--primary)', fontWeight: 600 }}>BNS 303</td>
                                                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Theft and related offenses.</td>
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid var(--surface-2)' }}>
                                                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--primary)', fontWeight: 600 }}>BNSS 479</td>
                                                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>Probation for first-time offenders.</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Key Considerations */}
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle2 size={16} />
                                    Judicial Considerations
                                </h3>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-india-green)', borderRadius: '50%', marginTop: '8px', flexShrink: 0 }} />
                                        <span>First-time offense indicates high rehabilitation potential.</span>
                                    </li>
                                    <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-saffron)', borderRadius: '50%', marginTop: '8px', flexShrink: 0 }} />
                                        <span>Value of goods (Rs. 2000) is relatively minor.</span>
                                    </li>
                                    <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', marginTop: '8px', flexShrink: 0 }} />
                                        <span>Age (21) suggests leniency under probation laws.</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Context Text */}
                            <div style={{ ...cardStyle, backgroundColor: 'rgba(0, 0, 128, 0.1)', borderColor: 'rgba(0, 0, 128, 0.2)' }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-chakra-blue)', marginBottom: '0.5rem' }}>Legal Context</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    {simulationData.context ? simulationData.context.substring(0, 200) + "..." : "Context loading..."}
                                </p>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default SimulationPage;
