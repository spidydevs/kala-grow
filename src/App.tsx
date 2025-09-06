import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { EnterpriseProvider } from '@/contexts/EnterpriseContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { MainLayout } from '@/components/layout/MainLayout'
import { SignInPage } from '@/pages/auth/SignInPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { OdooLikeCRMDashboard } from '@/pages/OdooLikeCRMDashboard'
import { TasksPage } from '@/pages/TasksPage'
import { TimeTrackingPage } from '@/pages/TimeTrackingPage'
import { GamificationPage } from '@/pages/GamificationPage'
import { UnifiedFinanceHub } from '@/pages/UnifiedFinanceHub'
import { NewInvoicePage } from '@/pages/NewInvoicePage'
import { EditInvoicePage } from '@/pages/EditInvoicePage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { UniversalExportImport } from '@/components/UniversalExportImport'

import { AdminManagement } from '@/components/enterprise/AdminManagement'
import { RoleManagement } from '@/pages/RoleManagement'
import { useConnectionStatus } from '@/lib/api'
import './index.css'

// Enhanced query client with improved error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry auth errors
        if (error?.message?.includes('401') || 
            error?.message?.includes('403') ||
            error?.message?.includes('unauthorized') ||
            error?.message?.includes('forbidden')) {
          return false
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

// Connection Status Indicator Component
const ConnectionStatus = () => {
  const { isConnected, isChecking } = useConnectionStatus()
  
  if (isConnected) return null
  
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
          <span className="text-sm font-medium">
            {isChecking ? 'Checking connection...' : 'Connection lost - Retrying...'}
          </span>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <EnterpriseProvider>
            <Router>
            <div className="App">
              <ConnectionStatus />
              <Routes>
                {/* Auth Routes */}
                <Route path="/auth/signin" element={<SignInPage />} />
                <Route path="/auth/signup" element={<SignUpPage />} />
                
                {/* Protected Routes */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="crm" element={<OdooLikeCRMDashboard />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="time-tracking" element={<TimeTrackingPage />} />
                  <Route path="gamification" element={<GamificationPage />} />
                  <Route path="finance" element={<UnifiedFinanceHub />} />
                  <Route path="finance/invoices/new" element={<NewInvoicePage />} />
                  <Route path="finance/invoices/edit/:id" element={<EditInvoicePage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="data-portability" element={<UniversalExportImport />} />
                  <Route path="admin" element={<AdminManagement />} />
                  <Route path="system-settings" element={<Navigate to="/settings" replace />} />
                  <Route path="" element={<Navigate to="/dashboard" replace />} />
                </Route>
                
                {/* Root redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
            </Router>
            
            {/* Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--toast-color)',
                  border: '1px solid var(--toast-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                }
              }}
            />
            
            {/* React Query Devtools */}
            <ReactQueryDevtools initialIsOpen={false} />
          </EnterpriseProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
