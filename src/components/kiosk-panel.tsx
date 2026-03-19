'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Fingerprint, Search, CheckCircle, XCircle, 
  Clock, User, Loader2, RefreshCw, LogIn, LogOut
} from 'lucide-react'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { EntryLog, Member } from '@/types'
import { useAuthStore } from '@/store/auth'

export function KioskPanel() {
  const { gym, user } = useAuthStore()
  const [cardId, setCardId] = useState('')
  const [member, setMember] = useState<Member | null>(null)
  const [checkResult, setCheckResult] = useState<{
    allowed: boolean
    reason?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [entryLogs, setEntryLogs] = useState<EntryLog[]>([])

  const fetchEntryLogs = useCallback(async () => {
    setLoading(true)
    try {
      const gymId = user?.role === 'SALON_ADMIN' ? gym?.id : undefined
      const response = await fetch(`/api/entry-logs${gymId ? `?gymId=${gymId}` : ''}`)
      if (response.ok) {
        setEntryLogs(await response.json())
      }
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [gym?.id, user?.role])

  useEffect(() => {
    fetchEntryLogs()
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchEntryLogs, 30000)
    return () => clearInterval(interval)
  }, [fetchEntryLogs])

  const checkCard = async () => {
    if (!cardId.trim()) {
      toast.error('Kart ID girin')
      return
    }

    setChecking(true)
    setMember(null)
    setCheckResult(null)

    try {
      const response = await fetch(`/api/members/check-entry/${cardId}`)
      const data = await response.json()

      if (data.member) {
        setMember(data.member)
      }
      
      setCheckResult({
        allowed: data.allowed,
        reason: data.reason
      })

      if (data.allowed) {
        toast.success('Giriş izni verildi')
        // Refresh entry logs
        fetchEntryLogs()
      } else {
        toast.error(data.reason || 'Giriş reddedildi')
      }
    } catch {
      toast.error('Kontrol başarısız')
      setCheckResult({ allowed: false, reason: 'Sistem hatası' })
    } finally {
      setChecking(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkCard()
    }
  }

  const todayEntries = entryLogs.filter(log => 
    new Date(log.entryTime).toDateString() === new Date().toDateString()
  )

  const currentInside = todayEntries.filter(log => 
    log.status === 'ALLOWED' && !log.exitTime
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kiosk & Giriş Kontrol</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Kart ID ile giriş kontrolü
          </p>
        </div>
        <Button variant="outline" onClick={fetchEntryLogs}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Yenile
        </Button>
      </div>

      {/* Kiosk Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Fingerprint className="w-12 h-12 text-emerald-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Giriş Kontrolü</h2>
              <p className="text-slate-400">Kart ID okutun veya girin</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Input
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Kart ID (örn: CARD001)"
              className="h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-slate-400"
            />
            <Button
              onClick={checkCard}
              disabled={checking}
              className="h-14 px-8 bg-emerald-600 hover:bg-emerald-700"
            >
              {checking ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Search className="w-6 h-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Result Display */}
        {checkResult && (
          <CardContent className="p-6">
            <div className={`flex items-center gap-4 p-4 rounded-lg ${
              checkResult.allowed 
                ? 'bg-emerald-50 dark:bg-emerald-900/20' 
                : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              {checkResult.allowed ? (
                <CheckCircle className="w-16 h-16 text-emerald-500" />
              ) : (
                <XCircle className="w-16 h-16 text-red-500" />
              )}
              
              {member ? (
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={member.user.image} />
                      <AvatarFallback className="bg-emerald-500 text-white">
                        {member.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold">{member.user.name}</h3>
                      <p className="text-slate-500">{member.user.email}</p>
                    </div>
                  </div>
                  
                  {member.activeMembership && (
                    <div className="flex items-center gap-4 text-sm">
                      <Badge className="bg-emerald-500">Aktif Üyelik</Badge>
                      <span className="text-slate-600 dark:text-slate-400">
                        Bitiş: {format(new Date(member.activeMembership.endDate), 'dd MMM yyyy', { locale: tr })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-red-600">
                    {checkResult.reason || 'Üye bulunamadı'}
                  </h3>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <LogIn className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Bugün Giriş</p>
                <p className="text-2xl font-bold">{todayEntries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <User className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">İçeride</p>
                <p className="text-2xl font-bold">{currentInside.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Reddedilen</p>
                <p className="text-2xl font-bold">
                  {todayEntries.filter(e => e.status !== 'ALLOWED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entry Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            Son Giriş Kayıtları
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
            </div>
          ) : entryLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Giriş kaydı bulunamadı
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Üye</TableHead>
                    <TableHead>Kart ID</TableHead>
                    <TableHead>Giriş</TableHead>
                    <TableHead>Çıkış</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entryLogs.slice(0, 20).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-slate-200">
                              {log.member?.user?.name?.split(' ').map(n => n[0]).join('') || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{log.member?.user?.name || 'Bilinmiyor'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">{log.cardId || '-'}</TableCell>
                      <TableCell>
                        <div>
                          <p>{format(new Date(log.entryTime), 'HH:mm', { locale: tr })}</p>
                          <p className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(log.entryTime), { locale: tr, addSuffix: true })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.exitTime ? (
                          format(new Date(log.exitTime), 'HH:mm', { locale: tr })
                        ) : log.status === 'ALLOWED' ? (
                          <Badge variant="outline" className="text-emerald-600">İçeride</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {log.status === 'ALLOWED' ? (
                          <Badge className="bg-emerald-500">İzinli</Badge>
                        ) : (
                          <Badge variant="destructive">
                            {log.status === 'DENIED_EXPIRED' ? 'Süresi Dolmuş' :
                             log.status === 'DENIED_FROZEN' ? 'Dondurulmuş' :
                             log.status === 'DENIED_DEBT' ? 'Borçlu' : 'Reddedildi'}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
