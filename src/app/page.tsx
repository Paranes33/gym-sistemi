'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { Dashboard } from '@/components/dashboard'
import { LoginScreen } from '@/components/login-screen'
import { Sidebar } from '@/components/sidebar'
import { MembersPanel } from '@/components/members-panel'
import { MembershipsPanel } from '@/components/memberships-panel'
import { PaymentsPanel } from '@/components/payments-panel'
import { GymsPanel } from '@/components/gyms-panel'
import { KioskPanel } from '@/components/kiosk-panel'
import { ReportsPanel } from '@/components/reports-panel'
import { MemberPanel } from '@/components/member-panel'
import { Toaster } from '@/components/ui/sonner'

export type ActivePanel = 'dashboard' | 'members' | 'memberships' | 'payments' | 'gyms' | 'kiosk' | 'reports' | 'settings' | 'member-panel'

export default function Home() {
  const { isAuthenticated, isLoading, user, logout, setLoading, login } = useAuthStore()
  const [activePanel, setActivePanel] = useState<ActivePanel>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          login(data.user, 'session', data.member, data.gym)
        }
      } catch {
        // Not authenticated
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [login, setLoading])

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      logout()
    }
  }, [logout])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-lg">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Login screen
  if (!isAuthenticated || !user) {
    return <LoginScreen onLogin={login} />
  }

  // Member panel
  if (user.role === 'MEMBER') {
    return <MemberPanel />
  }

  // Admin panels
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        user={user}
        onLogout={handleLogout}
      />
      
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-0' : 'ml-0'}`}>
        <div className="p-4 md:p-6 min-h-screen">
          {activePanel === 'dashboard' && <Dashboard />}
          {activePanel === 'members' && <MembersPanel />}
          {activePanel === 'memberships' && <MembershipsPanel />}
          {activePanel === 'payments' && <PaymentsPanel />}
          {activePanel === 'gyms' && user.role === 'SUPER_ADMIN' && <GymsPanel />}
          {activePanel === 'kiosk' && <KioskPanel />}
          {activePanel === 'reports' && <ReportsPanel />}
        </div>
      </main>

      <Toaster position="top-right" />
    </div>
  )
}
