import React, { useLayoutEffect, useRef } from 'react';
import { ArrowRight, MessageSquare, SplitSquareHorizontal, FileText, Scale, Shield, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const FeatureCard = ({ icon: Icon, title, description, to, index }) => (
    <Link to={to} style={{ textDecoration: 'none' }}>
        <div className="feature-card glass-panel" style={{
            padding: '2.5rem',
            borderRadius: 'var(--radius-sm)',
            height: '100%',
            border: '1px solid var(--border-color)',
            transition: 'all 0.4s ease',
            cursor: 'pointer',
            opacity: 0,
            transform: 'translateY(50px)'
        }}
            onMouseEnter={(e) => {
                gsap.to(e.currentTarget, { y: -10, borderColor: 'var(--primary)', boxShadow: '0 10px 30px var(--primary-dim)', duration: 0.3 });
                gsap.to(e.currentTarget.querySelector('.icon-wrapper'), { color: '#fff', backgroundColor: 'var(--primary)', duration: 0.3 });
            }}
            onMouseLeave={(e) => {
                gsap.to(e.currentTarget, { y: 0, borderColor: 'var(--border-color)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)', duration: 0.3 });
                gsap.to(e.currentTarget.querySelector('.icon-wrapper'), { color: 'var(--primary)', backgroundColor: 'var(--surface-2)', duration: 0.3 });
            }}
        >
            <div className="icon-wrapper" style={{
                background: 'var(--surface-2)',
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '2rem',
                color: 'var(--primary)',
                transition: 'all 0.3s ease'
            }}>
                <Icon size={28} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>{title}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.8', fontSize: '1rem', fontFamily: 'var(--font-serif)' }}>{description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, fontFamily: 'var(--font-sans)', letterSpacing: '0.05em', fontSize: '0.875rem' }}>
                ACCESS MODULE <ArrowRight size={16} />
            </div>
        </div>
    </Link>
);


const MetricCard = ({ label, value, subtext, color = "var(--primary)", delay = 0 }) => (
    <div className="metric-card glass-panel" style={{
        padding: '2rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        textAlign: 'center',
        opacity: 1,
        transform: 'translateY(0)',
        background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface-hover) 100%)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.4s ease'
    }}
        onMouseEnter={(e) => {
            gsap.to(e.currentTarget, {
                scale: 1.05,
                borderColor: color,
                boxShadow: `0 10px 40px ${color}33`,
                duration: 0.3
            });
        }}
        onMouseLeave={(e) => {
            gsap.to(e.currentTarget, {
                scale: 1,
                borderColor: 'var(--border-color)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                duration: 0.3
            });
        }}
    >
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${color} 0%, transparent 100%)`,
            opacity: 0.8
        }}></div>
        <div style={{ fontSize: '3.5rem', fontWeight: 700, color: color, marginBottom: '0.75rem', fontFamily: 'var(--font-display)', textShadow: `0 0 20px ${color}33` }}>
            <span className="counter" data-target={value}>{value}</span>{typeof value === 'number' && value % 1 !== 0 ? '' : (typeof value === 'string' ? '' : '%')}
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {label}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            {subtext}
        </div>
    </div>
);

const MetricsSection = () => {
    const sectionRef = useRef();

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            // Animate cards in
            gsap.to(".metric-card", {
                opacity: 1,
                y: 0,
                duration: 0.6,
                stagger: 0.1,
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top 80%"
                }
            });

            // Animate counters
            const counters = document.querySelectorAll('.counter');
            counters.forEach(counter => {
                const target = parseFloat(counter.getAttribute('data-target'));
                if (!isNaN(target)) {
                    gsap.to(counter, {
                        innerText: target,
                        duration: 2,
                        snap: { innerText: target % 1 !== 0 ? 0.1 : 1 },
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: "top 80%"
                        },
                        onUpdate: function () {
                            this.targets()[0].innerText = parseFloat(this.targets()[0].innerText).toFixed(target % 1 !== 0 ? 2 : 0) + (target === 100 ? '%' : '');
                        }
                    });
                }
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    const metrics = {
        retrieval_quality: {
            section_recall_percent: 100.0,
            avg_contexts_retrieved: 7
        },
        answer_quality: {
            relevancy_percent: 83.6,
            language_accuracy_percent: 80.0
        },
        system_performance: {
            avg_latency_seconds: 5.42
        }
    };

    return (
        <section ref={sectionRef} style={{ maxWidth: '1200px', margin: '0 auto 6rem auto', padding: '0 1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>System Performance</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Real-time metrics from our neural engine</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <MetricCard
                    label="Section Recall"
                    value={metrics.retrieval_quality.section_recall_percent}
                    subtext="Retrieval Quality"
                    color="var(--success)"
                />
                <MetricCard
                    label="Avg Contexts"
                    value={metrics.retrieval_quality.avg_contexts_retrieved}
                    subtext="Information Density"
                    color="var(--primary)"
                />
                <MetricCard
                    label="Relevancy"
                    value={metrics.answer_quality.relevancy_percent}
                    subtext="Answer Quality"
                    color="var(--color-saffron)"
                />
                <MetricCard
                    label="Language Accuracy"
                    value={metrics.answer_quality.language_accuracy_percent}
                    subtext="Multilingual Precision"
                    color="var(--warning)"
                />
                <MetricCard
                    label="Avg Latency"
                    value={metrics.system_performance.avg_latency_seconds}
                    subtext="Response Time (s)"
                    color="var(--text-muted)"
                />
            </div>
        </section>
    );
};

const Dashboard = () => {
    const containerRef = useRef();
    const titleRef = useRef();

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline();

            tl.from(titleRef.current.querySelectorAll('.hero-anim'), {
                y: 100,
                opacity: 0,
                duration: 1,
                stagger: 0.2,
                ease: "power4.out"
            })
                .to(".feature-card", {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    stagger: 0.1,
                    ease: "power3.out"
                }, "-=0.5");

        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <div ref={containerRef} style={{ paddingBottom: '4rem' }}>
            {/* Hero Section */}
            <section style={{ marginBottom: '6rem', textAlign: 'center', padding: '6rem 0' }}>
                <div className="hero-anim" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 1.25rem',
                    border: '1px solid var(--primary-dim)',
                    background: 'var(--surface-hover)',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    marginBottom: '2rem',
                    fontSize: '0.875rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-sans)'
                }}>
                    <Flag size={14} fill="currentColor" /> Official Legal Intelligence
                </div>

                <div ref={titleRef}>
                    <h1 className="hero-anim text-tricolor-gradient" style={{
                        fontSize: '5rem',
                        fontWeight: 700,
                        marginBottom: '1.5rem',
                        lineHeight: 1,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        fontFamily: 'var(--font-display)'
                    }}>
                        Nyaya <br /> Sanhita
                    </h1>
                    <p className="hero-anim" style={{
                        color: 'var(--text-secondary)',
                        fontSize: '1.5rem',
                        maxWidth: '700px',
                        margin: '0 auto 4rem auto',
                        lineHeight: 1.6,
                        fontFamily: 'var(--font-serif)',
                        fontWeight: 300
                    }}>
                        The definitive AI framework for the Bhartiya Nyaya Sanhita (BNS) & IPC. <br />
                        Process justice with absolute precision.
                    </p>

                    <div className="hero-anim" style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
                        <Link to="/chat" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem', padding: '1.25rem 2.5rem' }}>
                            <span>Initiate Query</span> <ArrowRight size={20} />
                        </Link>
                        <button className="glass-panel border-glow" style={{
                            padding: '1.25rem 2.5rem',
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                            fontSize: '1rem',
                            letterSpacing: '0.1em',
                            borderRadius: '2px'
                        }}>
                            SYSTEM DEMO
                        </button>
                    </div>
                </div>
            </section>

            {/* System Metrics Section */}
            <MetricsSection />

            {/* Features Grid */}
            <section style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '2.5rem',
                maxWidth: '1400px',
                margin: '0 auto'
            }}>
                <FeatureCard
                    icon={MessageSquare}
                    title="Consul AI"
                    description="Bilingual legal consultation engine. Query the BNS & IPC in English or Hindi with instant, cited responses."
                    to="/chat"
                />
                <FeatureCard
                    icon={SplitSquareHorizontal}
                    title="Codex Compare"
                    description="Side-by-side legislative analysis. Track the evolution of justice from the 1860 IPC to the 2023 BNS."
                    to="/comparison"
                />
                <FeatureCard
                    icon={FileText}
                    title="Brief Summarizer"
                    description="Extract the essence of justice. Upload court orders or lengthy documents for rapid, structured summarization."
                    to="/summarizer"
                />
                <FeatureCard
                    icon={Scale}
                    title="Regulatory Index"
                    description="Navigate the labyrinth of statutes. Domain-specific filtering for Corporate, IT, and Environmental laws."
                    to="/regulations"
                />
            </section>
        </div>
    );
};

export default Dashboard;
