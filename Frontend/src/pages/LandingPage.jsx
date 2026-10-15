
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Scale, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const LandingPage = () => {
    const navigate = useNavigate();

    const styles = {
        container: {
            minHeight: '100vh',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            position: 'relative',
        },
        backgroundGlow1: {
            position: 'absolute',
            top: '-10%',
            left: '-10%',
            width: '50%',
            height: '50%',
            backgroundColor: 'var(--color-saffron)',
            opacity: 0.1,
            filter: 'blur(120px)',
            borderRadius: '50%',
            zIndex: 0,
            pointerEvents: 'none',
        },
        backgroundGlow2: {
            position: 'absolute',
            bottom: '-10%',
            right: '-10%',
            width: '50%',
            height: '50%',
            backgroundColor: 'var(--color-india-green)',
            opacity: 0.1,
            filter: 'blur(120px)',
            borderRadius: '50%',
            zIndex: 0,
            pointerEvents: 'none',
        },
        navbar: {
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.5rem 2rem',
            maxWidth: '1280px',
            margin: '0 auto',
        },
        logoContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
        },
        logoIcon: {
            width: '2.5rem',
            height: '2.5rem',
            background: 'linear-gradient(135deg, var(--color-saffron), var(--color-india-green))',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.25rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        },
        navButton: {
            padding: '0.5rem 1.5rem',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 153, 51, 0.3)',
            color: 'var(--primary)',
            backgroundColor: 'transparent',
            transition: 'all 0.3s ease',
            fontWeight: 500,
            fontFamily: 'var(--font-display)',
        },
        main: {
            position: 'relative',
            zIndex: 10,
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '5rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
        },
        badge: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border-color)',
            marginBottom: '2rem',
        },
        badgeDot: {
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '50%',
            backgroundColor: 'var(--color-saffron)',
        },
        badgeText: {
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        },
        heading: {
            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
            fontFamily: 'var(--font-display)',
            fontWeight: 'bold',
            marginBottom: '1.5rem',
            lineHeight: 1.1,
        },
        gradientText: {
            background: 'linear-gradient(90deg, var(--color-saffron), #ffffff, var(--color-india-green))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
        },
        subtext: {
            fontSize: '1.25rem',
            color: 'var(--text-muted)',
            maxWidth: '42rem',
            margin: '0 auto 2.5rem',
            lineHeight: 1.6,
        },
        ctaButton: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '1rem 2rem',
            backgroundColor: 'var(--primary)',
            color: 'white',
            borderRadius: '9999px',
            fontSize: '1.125rem',
            fontWeight: 600,
            boxShadow: '0 0 20px rgba(255, 153, 51, 0.4)',
            transition: 'all 0.3s ease',
            border: 'none',
            fontFamily: 'var(--font-display)',
            cursor: 'pointer',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginTop: '6rem',
            width: '100%',
        },
        card: {
            padding: '2rem',
            borderRadius: '1rem',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border-color)',
            textAlign: 'left',
            transition: 'border-color 0.3s ease',
        },
        iconBox: {
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '0.75rem',
            display: 'inline-block',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        },
        cardTitle: {
            fontSize: '1.25rem',
            fontWeight: 'bold',
            marginBottom: '0.75rem',
            fontFamily: 'var(--font-display)',
        },
        cardDesc: {
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
        }
    };

    return (
        <div style={styles.container}>
            {/* Background Gradients */}
            <div style={styles.backgroundGlow1}></div>
            <div style={styles.backgroundGlow2}></div>

            {/* Navbar */}
            <nav style={styles.navbar}>
                <div style={styles.logoContainer}>
                    <div style={styles.logoIcon}>C</div>
                    <span className="text-tricolor-gradient" style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 'bold' }}>Clause AI</span>
                </div>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={styles.navButton}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--surface-hover)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                    Login
                </button>
            </nav>

            {/* Hero Section */}
            <main style={styles.main}>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div style={styles.badge}>
                        <span style={styles.badgeDot}></span>
                        <span style={styles.badgeText}>Powered by Bhartiya Nyaya Sanhita</span>
                    </div>

                    <h1 style={styles.heading}>
                        Legal Intelligence for the <br />
                        <span style={styles.gradientText}>
                            Modern Indian Era
                        </span>
                    </h1>

                    <p style={styles.subtext}>
                        Navigate the complexities of Indian law with AI-driven insights, Clause comparison, and automatic document summarization.
                    </p>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/dashboard')}
                        style={styles.ctaButton}
                    >
                        <span>Get Started Now</span>
                        <ArrowRight size={20} />
                    </motion.button>
                </motion.div>

                {/* Feature Grid */}
                <div style={styles.grid}>
                    <FeatureCard
                        icon={<Scale size={32} color="var(--color-saffron)" />}
                        title="Legal Analysis"
                        description="Instant analysis of legal documents against the latest BNS regulations."
                        styles={styles}
                    />
                    <FeatureCard
                        icon={<Shield size={32} color="#60A5FA" />}
                        title="Secure & Private"
                        description="Enterprise-grade security ensuring your sensitive legal data remains confidential."
                        styles={styles}
                    />
                    <FeatureCard
                        icon={<Zap size={32} color="var(--color-india-green)" />}
                        title="AI Automation"
                        description="Automate repetitive tasks like summarization and clause comparison."
                        styles={styles}
                    />
                </div>
            </main>
        </div>
    );
};

const FeatureCard = ({ icon, title, description, styles }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={styles.card}
    >
        <div style={styles.iconBox}>
            {icon}
        </div>
        <h3 style={styles.cardTitle}>{title}</h3>
        <p style={styles.cardDesc}>{description}</p>
    </motion.div>
);

export default LandingPage;
