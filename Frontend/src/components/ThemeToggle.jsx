import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                transition: 'all 0.3s ease',
                background: 'var(--surface-1)'
            }}
            className="border-glow"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
    );
};

export default ThemeToggle;
