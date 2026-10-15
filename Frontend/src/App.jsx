import React from 'react'
import DashboardLayout from './components/DashboardLayout'
import Dashboard from './pages/Dashboard'
import ChatInterface from './pages/ChatInterface'
import ClauseComparison from './pages/ClauseComparison'
import DocumentSummarizer from './pages/DocumentSummarizer'
import RegulatoryFilter from './pages/RegulatoryFilter'
import JudgementSearch from './pages/JudgementSearch'
import LawyerSearch from './pages/LawyerSearch'
import SimulationPage from './pages/SimulationPage'
import LandingPage from './pages/LandingPage'
import LegalGraph from './pages/LegalGraph'
import DraftEditor from './pages/DraftEditor'
import { Routes, Route, Navigate } from 'react-router-dom'

function App() {
    return (
        <Routes>
            {/* Public Route: Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Private/Protected Routes: Dashboard */}
            <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="chat" element={<ChatInterface />} />
                <Route path="comparison" element={<ClauseComparison />} />
                <Route path="summarizer" element={<DocumentSummarizer />} />
                <Route path="regulations" element={<RegulatoryFilter />} />
                <Route path="judgements" element={<JudgementSearch />} />
                <Route path="lawyers" element={<LawyerSearch />} />
                <Route path="simulation" element={<SimulationPage />} />
                <Route path="draft" element={<DraftEditor />} />
                <Route path="graph" element={<LegalGraph />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
