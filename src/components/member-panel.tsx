'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  User, Calendar, CreditCard, Clock, 
  LogIn, DollarSign, TrendingUp, Loader2,
  Dumbbell, Mail, Phone
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useAuthStore } from '@/store/auth'
import type { Member, Payment, EntryLog, Membership } from '@/types'

export function MemberPanel() {
  const { user, member, logout } = useAuthStore()
  const [memberData, setMemberData] = useState<Member | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [entryLogs, setEntryLogs] = useState<EntryLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        const response = await fetch('/api/member/me')
        if (response.ok) {
          const data = await response.json()
          setMemberData(data.member)
          setPayments(data.payments || [])
          setEntryLogs(data.entryLogs || [])
        }
      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMemberData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
          <p className="text-slate-500">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  const activeMembership = memberData?.activeMembership
  const remainingDays = activeMembership 
    ? differenceInDays(new Date(activeMembership.endDate), new Date())
    : null
  const totalDebt = memberData?.totalDebt || 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">GymPro</h1>
              <p className="text-xs text-slate-500">Üye Paneli</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            Çıkış Yap
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user?.image} />
                <AvatarFallback className="bg-emerald-500 text-white text-2xl">
                  {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold">{user?.name}</h2>
                <div className="flex flex-col sm:flex-row gap-4 mt-2 text-slate-500">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <Mail className="w-4 h-4" />
                    <span>{user?.email}</span>
                  </div>
                  {user?.phone && (
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <Phone className="w-4 h-4" />
                      <span>{user?.phone}</span>
                    </div>
                  )}
                </div>
                {memberData?.cardId && (
                  <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm">Kart ID: {memberData.cardId}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Membership Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              Üyelik Durumu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeMembership ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Durum</p>
                    <Badge 
                      className={
                        activeMembership.status === 'ACTIVE' ? 'bg-emerald-500' :
                        activeMembership.status === 'FROZEN' ? 'bg-cyan-500' :
                        activeMembership.status === 'EXPIRED' ? 'bg-red-500' : ''
                      }
                    >
                      {activeMembership.status === 'ACTIVE' ? 'Aktif' :
                       activeMembership.status === 'FROZEN' ? 'Dondurulmuş' :
                       activeMembership.status === 'EXPIRED' ? 'Süresi Dolmuş' : 'Pasif'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Kalan Süre</p>
                    <p className={`text-2xl font-bold ${
                      remainingDays !== null && remainingDays <= 3 ? 'text-red-500' : 'text-emerald-600'
                    }`}>
                      {remainingDays !== null && remainingDays > 0 ? `${remainingDays} gün` : 'Süresi doldu'}
                    </p>
                  </div>
                </div>

                <Progress 
                  value={activeMembership ? 
                    Math.max(0, Math.min(100, (remainingDays || 0) / activeMembership.durationDays * 100)) 
                    : 0
                  } 
                  className="h-2"
                />

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-slate-500">Başlangıç</p>
                    <p className="font-medium">
                      {format(new Date(activeMembership.startDate), 'dd MMMM yyyy', { locale: tr })}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-slate-500">Bitiş</p>
                    <p className="font-medium">
                      {format(new Date(activeMembership.endDate), 'dd MMMM yyyy', { locale: tr })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aktif üyelik bulunamadı</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debt Status */}
        {totalDebt > 0 && (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Toplam Borç</p>
                  <p className="text-2xl font-bold text-red-500">₺{totalDebt.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <LogIn className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{entryLogs.length}</p>
              <p className="text-sm text-slate-500">Toplam Giriş</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
              <p className="text-2xl font-bold">{payments.length}</p>
              <p className="text-sm text-slate-500">Ödeme</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{activeMembership?.durationDays || 0}</p>
              <p className="text-sm text-slate-500">Üyelik Günü</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CreditCard className="w-6 h-6 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">
                ₺{payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
              </p>
              <p className="text-sm text-slate-500">Toplam Ödenen</p>
            </CardContent>
          </Card>
        </div>

        {/* Entry History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LogIn className="w-5 h-5 text-blue-500" />
              Giriş Geçmişi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {entryLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Giriş kaydı bulunamadı
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Giriş</TableHead>
                      <TableHead>Çıkış</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entryLogs.slice(0, 10).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.entryTime), 'dd MMM yyyy', { locale: tr })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(log.entryTime), 'HH:mm')}
                        </TableCell>
                        <TableCell>
                          {log.exitTime ? format(new Date(log.exitTime), 'HH:mm') : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'ALLOWED' ? 'default' : 'destructive'}>
                            {log.status === 'ALLOWED' ? 'Başarılı' : 'Reddedildi'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Ödeme Geçmişi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Ödeme kaydı bulunamadı
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Tutar</TableHead>
                      <TableHead>Tür</TableHead>
                      <TableHead>Açıklama</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.slice(0, 10).map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.createdAt), 'dd MMM yyyy', { locale: tr })}
                        </TableCell>
                        <TableCell className="font-semibold text-emerald-600">
                          ₺{payment.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payment.type === 'CASH' ? 'Nakit' : payment.type === 'CARD' ? 'Kart' : 'Online'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {payment.description || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
