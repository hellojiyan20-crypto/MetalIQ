import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout, { ProtectedRoute } from './components/layout/Layout'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/AuthContext'
import { DateRangeProvider } from './context/DateRangeContext'
import { AssetScopeProvider } from './context/AssetScopeContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MarketRatesPage from './pages/MarketRatesPage'
import AnalyticsPage from './pages/AnalyticsPage'
import InvestmentsPage from './pages/InvestmentsPage'
import InvestmentDetailPage from './pages/InvestmentDetailPage'
import PortfolioPage from './pages/PortfolioPage'
import ComparisonPage from './pages/ComparisonPage'
import CalculatorPage from './pages/CalculatorPage'
import JournalPage from './pages/JournalPage'
import AlertsPage from './pages/AlertsPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <DateRangeProvider initial="30d">
            <AssetScopeProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Gold app */}
                  <Route path="gold/dashboard" element={<DashboardPage />} />
                  <Route path="gold/rates" element={<MarketRatesPage />} />
                  <Route path="gold/analytics" element={<AnalyticsPage />} />
                  <Route path="gold/investments" element={<InvestmentsPage />} />
                  <Route path="gold/investments/:id" element={<InvestmentDetailPage />} />
                  <Route path="gold/portfolio" element={<PortfolioPage />} />
                  <Route path="gold/calculator" element={<CalculatorPage />} />
                  <Route path="gold/journal" element={<JournalPage />} />
                  <Route path="gold/alerts" element={<AlertsPage />} />

                  {/* Silver app */}
                  <Route path="silver/dashboard" element={<DashboardPage />} />
                  <Route path="silver/rates" element={<MarketRatesPage />} />
                  <Route path="silver/analytics" element={<AnalyticsPage />} />
                  <Route path="silver/investments" element={<InvestmentsPage />} />
                  <Route path="silver/investments/:id" element={<InvestmentDetailPage />} />
                  <Route path="silver/portfolio" element={<PortfolioPage />} />
                  <Route path="silver/calculator" element={<CalculatorPage />} />
                  <Route path="silver/journal" element={<JournalPage />} />
                  <Route path="silver/alerts" element={<AlertsPage />} />

                  {/* Both worlds meet only here */}
                  <Route path="comparison" element={<ComparisonPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="/" element={<Navigate to="/gold/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/gold/dashboard" replace />} />
                </Route>
              </Routes>
            </AssetScopeProvider>
          </DateRangeProvider>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  )
}