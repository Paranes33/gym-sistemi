'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Building2,
  Fingerprint,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Dumbbell,
  IdCard
} from 'lucide-react'
import type { User } from '@/types'
import type { ActivePanel } from '@/app/page'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  activePanel: ActivePanel
  onPanelChange: (panel: ActivePanel) => void
  user: User
  onLogout: () => void
}

const menuItems: { id: ActivePanel; label: string; icon: React.ElementType; roles: User['role'][] }[] = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'SALON_ADMIN'] },
  { id: 'members', label: 'Üyeler', icon: Users, roles: ['SUPER_ADMIN', 'SALON_ADMIN'] },
  { id: 'memberships', label: 'Üyelikler', icon: IdCard, roles: ['SUPER_ADMIN', 'SALON_ADMIN'] },
  { id: 'payments', label: 'Ödemeler', icon: CreditCard, roles: ['SUPER_ADMIN', 'SALON_ADMIN'] },
  { id: 'gyms', label: 'Salonlar', icon: Building2, roles: ['SUPER_ADMIN'] },
  { id: 'kiosk', label: 'Kiosk', icon: Fingerprint, roles: ['SUPER_ADMIN', 'SALON_ADMIN'] },
  { id: 'reports', label: 'Raporlar', icon: BarChart3, roles: ['SUPER_ADMIN', 'SALON_ADMIN'] },
  { id: 'settings', label: 'Ayarlar', icon: Settings, roles: ['SUPER_ADMIN', 'SALON_ADMIN'] },
]

export function Sidebar({ isOpen, onToggle, activePanel, onPanelChange, user, onLogout }: SidebarProps) {
  const filteredItems = menuItems.filter(item => item.roles.includes(user.role))

  const getRoleBadge = (role: User['role']) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge variant="default" className="bg-red-500 text-xs">Super Admin</Badge>
      case 'SALON_ADMIN':
        return <Badge variant="default" className="bg-emerald-500 text-xs">Salon Admin</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">Üye</Badge>
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-16 lg:items-center"
      )}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
          <div className={cn("flex items-center gap-3", !isOpen && "lg:justify-center")}>
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            {isOpen && (
              <div className="lg:block">
                <h1 className="font-bold text-lg">GymPro</h1>
                <p className="text-xs text-slate-500">Yönetim Sistemi</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="lg:hidden"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = activePanel === item.id
            return (
              <button
                key={item.id}
                onClick={() => onPanelChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                  isActive 
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700",
                  !isOpen && "lg:justify-center lg:px-0"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "text-emerald-600 dark:text-emerald-400")} />
                {isOpen && <span className="font-medium">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50",
            !isOpen && "lg:justify-center"
          )}>
            <Avatar className="w-9 h-9">
              <AvatarImage src={user.image} />
              <AvatarFallback className="bg-emerald-500 text-white">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                {getRoleBadge(user.role)}
              </div>
            )}
          </div>
          
          {isOpen && (
            <Button
              variant="ghost"
              onClick={onLogout}
              className="w-full mt-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Çıkış Yap
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="fixed top-4 left-4 z-30 lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </Button>
    </>
  )
}
