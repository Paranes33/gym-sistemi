'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Users, UserCheck, UserX, Snowflake, 
  TrendingUp, DollarSign, LogIn, Clock,
  ArrowUpRight, ArrowDownRight, AlertCircle
} from 'lucide-react'
import type { DashboardStats } from '@/types'
import { useAuthStore } from '@/store/auth'

interface DashboardData {
  stats: DashboardStats
  recentEntries: Array<{
    id: string
    memberName: string
    entryTime: string
    status: string
  }>
  expiringMembers: Array<{
    id: string
    name: string
    endDate: string
    remainingDays: number
  }>
}

export function Dashboard() {
  const { gym, user } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const gymId = user?.role === 'SALON_ADMIN' ? gym?.id : undefined
        const response = await fetch(`/api/dashboard/stats${gymId ? `?gymId=${gymId}` : ''}`)
        if (response.ok) {
          setData(await response.json())
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [gym?.id, user?.role])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const stats = data?.stats || {
    totalMembers: 0,
    activeMembers: 0,
    expiredMembers: 0,
    frozenMembers: 0,
    totalDebts: 0,
    todayIncome: 0,
    monthIncome: 0,
    todayEntries: 0,
    pendingPayments: 0
  }

  const statCards = [
    { 
      title: 'Toplam Üye', 
      value: stats.totalMembers, 
      icon: Users, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    { 
      title: 'Aktif Üye', 
      value: stats.activeMembers, 
      icon: UserCheck, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      trend: stats.totalMembers > 0 ? Math.round((stats.activeMembers / stats.totalMembers) * 100) : 0
    },
    { 
      title: 'Süresi Dolan', 
      value: stats.expiredMembers, 
      icon: UserX, 
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30'
    },
    { 
      title: 'Dondurulmuş', 
      value: stats.frozenMembers, 
      icon: Snowflake, 
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/30'
    },
    { 
      title: 'Bugünkü Gelir', 
      value: `₺${stats.todayIncome.toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      isMoney: true
    },
    { 
      title: 'Aylık Gelir', 
      value: `₺${stats.monthIncome.toLocaleString()}`, 
      icon: DollarSign, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      isMoney: true
    },
    { 
      title: 'Bugün Giriş', 
      value: stats.todayEntries, 
      icon: LogIn, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30'
    },
    { 
      title: 'Bekleyen Ödeme', 
      value: `₺${stats.totalDebts.toLocaleString()}`, 
      icon: AlertCircle, 
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      isMoney: true
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Panel</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {gym ? `${gym.name} - Genel Bakış` : 'Sistem Genel Bakış'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          {new Date().toLocaleDateString('tr-TR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                      {stat.value}
                    </p>
                    {stat.trend !== undefined && (
                      <div className="flex items-center gap-1 mt-2">
                        <Progress value={stat.trend} className="h-1.5 w-16" />
                        <span className="text-xs text-slate-500">%{stat.trend}</span>
                      </div>
                    )}
                  </div>
                  <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LogIn className="w-5 h-5 text-emerald-500" />
              Son Girişler
            </CardTitle>
            <CardDescription>Son 5 giriş kaydı</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.recentEntries && data.recentEntries.length > 0 ? (
              <div className="space-y-3">
                {data.recentEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{entry.memberName}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(entry.entryTime).toLocaleTimeString('tr-TR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={entry.status === 'ALLOWED' ? 'default' : 'destructive'} className="text-xs">
                      {entry.status === 'ALLOWED' ? 'İzinli' : 'Reddedildi'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <LogIn className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Henüz giriş kaydı yok</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Üyeliği Yakında Dolacaklar
            </CardTitle>
            <CardDescription>Son 7 gün içinde bitecek üyelikler</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.expiringMembers && data.expiringMembers.length > 0 ? (
              <div className="space-y-3">
                {data.expiringMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        member.remainingDays <= 1 
                          ? 'bg-red-100 dark:bg-red-900/30' 
                          : member.remainingDays <= 3 
                            ? 'bg-amber-100 dark:bg-amber-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        <Clock className={`w-4 h-4 ${
                          member.remainingDays <= 1 
                            ? 'text-red-600' 
                            : member.remainingDays <= 3 
                              ? 'text-amber-600'
                              : 'text-blue-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(member.endDate).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={member.remainingDays <= 1 ? 'destructive' : 'secondary'} className="text-xs">
                      {member.remainingDays} gün
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Yakında bitecek üyelik yok</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
