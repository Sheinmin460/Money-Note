import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AdminDashboard from './components/AdminDashboard.tsx'
import ProjectsPage from './components/ProjectsPage.tsx'
import ProjectDetailPage from './components/ProjectDetailPage.tsx'
import WalletsPage from './components/WalletsPage.tsx'
import TransferLogPage from './components/TransferLogPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/wallets" element={<WalletsPage />} />
        <Route path="/wallets/logs" element={<TransferLogPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
