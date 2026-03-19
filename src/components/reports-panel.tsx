'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts'
import { 
  TrendingUp, Users, DollarSign, LogIn,
  BarChart3, PieChartIcon, Calendar
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useAuthStore } from '@/store/auth'

interface ReportData {
  dailyIncome: Array<{ date: string; amount: number }>
  memberStats: { active: number; expired: number; frozen: number; inactive: number }
  entryStats: Array<{ hour: number; count: number }>
  monthlyIncome: { month: string; amount: number }[]
  topMembers: Array<{ name: string; visits: number }>
}

const COLORS = ['#10b981', '#ef4444', '#06b6d4', '#64748b']

export function ReportsPanel() {
  const { gym, user } = useAuthStore()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('7')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const gymId = user?.role === 'SALON_ADMIN' ? gym?.id : undefined
      const response = await fetch(`/api/reports?days=${period}${gymId ? `&gymId=${gymId}` : ''}`)
      if (response.ok) {
        setData(await response.json())
      }
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [gym?.id, user?.role, period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Generate chart data if not available
  const dailyIncomeData = data?.dailyIncome || generateMockDailyIncome(Number(period))
  const memberStatsData = data?.memberStats || { active: 45, expired: 12, frozen: 3, inactive: 8 }
  const entryStatsData = data?.entryStats || generateMockEntryStats()

  const pieData = [
    { name: 'Aktif', value: memberStatsData.active, color: COLORS[0] },
    { name: 'Süresi Dolmuş', value: memberStatsData.expired, color: COLORS[1] },
    { name: 'Dondurulmuş', value: memberStatsData.frozen, color: COLORS[2] },
    { name: 'Pasif', value: memberStatsData.inactive, color: COLORS[3] },
  ]

  const totalMembers = Object.values(memberStatsData).reduce((a, b) => a + b, 0)
  const totalIncome = dailyIncomeData.reduce((sum, d) => sum + d.amount, 0)
  const peakHour = entryStatsData.reduce((max, curr) => curr.count > max.count ? curr : max, entryStatsData[0])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Raporlar</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Performans ve istatistik raporları
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Son 7 Gün</SelectItem>
            <SelectItem value="30">Son 30 Gün</SelectItem>
            <SelectItem value="90">Son 90 Gün</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Toplam Üye</p>
                <p className="text-2xl font-bold">{totalMembers}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Toplam Gelir</p>
                <p className="text-2xl font-bold text-emerald-600">₺{totalIncome.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Aktif Oran</p>
                <p className="text-2xl font-bold">%{Math.round((memberStatsData.active / totalMembers) * 100)}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">En Yoğun Saat</p>
                <p className="text-2xl font-bold">{peakHour?.hour || 18}:00</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <LogIn className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Income Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              Günlük Gelir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyIncomeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => format(new Date(value), 'dd MMM', { locale: tr })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [`₺${value.toLocaleString()}`, 'Gelir']}
                    labelFormatter={(label) => format(new Date(label), 'dd MMMM yyyy', { locale: tr })}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Member Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-blue-500" />
              Üye Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Üye']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Entry Hours Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LogIn className="w-5 h-5 text-orange-500" />
              Saatlik Giriş Yoğunluğu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entryStatsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}:00`}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Giriş']}
                    labelFormatter={(label) => `${label}:00`}
                  />
                  <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Özet İstatistikler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Aktif Üyeler</span>
                  <Badge className="bg-emerald-500">{memberStatsData.active}</Badge>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${(memberStatsData.active / totalMembers) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Süresi Dolan</span>
                  <Badge variant="destructive">{memberStatsData.expired}</Badge>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${(memberStatsData.expired / totalMembers) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Dondurulmuş</span>
                  <Badge className="bg-cyan-500">{memberStatsData.frozen}</Badge>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-cyan-500 h-2 rounded-full"
                    style={{ width: `${(memberStatsData.frozen / totalMembers) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Pasif</span>
                  <Badge variant="secondary">{memberStatsData.inactive}</Badge>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-slate-500 h-2 rounded-full"
                    style={{ width: `${(memberStatsData.inactive / totalMembers) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Helper functions for mock data
function generateMockDailyIncome(days: number) {
  return Array.from({ length: days }, (_, i) => ({
    date: subDays(new Date(), days - i - 1).toISOString(),
    amount: Math.floor(Math.random() * 5000) + 1000
  }))
}

function generateMockEntryStats() {
  return [
    { hour: 6, count: 5 },
    { hour: 7, count: 15 },
    { hour: 8, count: 25 },
    { hour: 9, count: 20 },
    { hour: 10, count: 15 },
    { hour: 11, count: 10 },
    { hour: 12, count: 8 },
    { hour: 13, count: 12 },
    { hour: 14, count: 18 },
    { hour: 15, count: 22 },
    { hour: 16, count: 28 },
    { hour: 17, count: 35 },
    { hour: 18, count: 45 },
    { hour: 19, count: 40 },
    { hour: 20, count: 30 },
    { hour: 21, count: 20 },
    { hour: 22, count: 10 },
  ]
}
