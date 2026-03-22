import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

// Context
import { AuthProvider } from './context/AuthContext'

// Layouts
import { AppLayout } from './layouts/AppLayout'
import { AuthLayout } from './layouts/AuthLayout'

// Auth pages
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProfilePage } from './pages/ProfilePage'

// App pages
import HomePage from './pages/HomePage.tsx'
import AdminDashboard from './components/AdminDashboard.tsx'
import ProjectsPage from './components/ProjectsPage.tsx'
import ProjectDetailPage from './components/ProjectDetailPage.tsx'
import WalletsPage from './components/WalletsPage.tsx'
import TransferLogPage from './components/TransferLogPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Public / Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected routes */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/wallets" element={<WalletsPage />} />
            <Route path="/wallets/logs" element={<TransferLogPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
