'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Plus, Edit, Snowflake, CalendarIcon, Clock,
  UserCheck, UserX, Search, Loader2, Check, X
} from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays, addMonths, differenceInDays } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Membership, Member, MembershipStatus } from '@/types'
import { useAuthStore } from '@/store/auth'

export function MembershipsPanel() {
  const { gym, user } = useAuthStore()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showFreezeDialog, setShowFreezeDialog] = useState<Membership | null>(null)
  const [showExtendDialog, setShowExtendDialog] = useState<Membership | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [durationDays, setDurationDays] = useState(30)
  const [price, setPrice] = useState<number>(0)
  const [paidAmount, setPaidAmount] = useState<number>(0)
  const [notes, setNotes] = useState('')

  // Freeze form
  const [freezeStart, setFreezeStart] = useState<Date>(new Date())
  const [freezeEnd, setFreezeEnd] = useState<Date>(addDays(new Date(), 7))
  const [freezeReason, setFreezeReason] = useState('')

  // Extend form
  const [extendDays, setExtendDays] = useState(30)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const gymId = user?.role === 'SALON_ADMIN' ? gym?.id : undefined
      const [membershipsRes, membersRes] = await Promise.all([
        fetch(`/api/memberships${gymId ? `?gymId=${gymId}` : ''}`),
        fetch(`/api/members?pageSize=100${gymId ? `&gymId=${gymId}` : ''}`)
      ])

      if (membershipsRes.ok) {
        setMemberships(await membershipsRes.json())
      }
      if (membersRes.ok) {
        const data = await membersRes.json()
        setMembers(data.data || data)
      }
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [gym?.id, user?.role])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateMembership = async () => {
    if (!selectedMember) {
      toast.error('Üye seçin')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMember,
          startDate: startDate.toISOString(),
          durationDays,
          price,
          paidAmount,
          notes
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Üyelik oluşturulamadı')
      }

      toast.success('Üyelik başarıyla oluşturuldu')
      setShowAddDialog(false)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFreezeMembership = async () => {
    if (!showFreezeDialog) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/memberships/${showFreezeDialog.id}/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: freezeStart.toISOString(),
          endDate: freezeEnd.toISOString(),
          reason: freezeReason
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Üyelik dondurulamadı')
      }

      toast.success('Üyelik başarıyla donduruldu')
      setShowFreezeDialog(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnfreezeMembership = async (membership: Membership) => {
    try {
      const response = await fetch(`/api/memberships/${membership.id}/unfreeze`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('İşlem başarısız')

      toast.success('Üyelik aktif edildi')
      fetchData()
    } catch {
      toast.error('İşlem başarısız')
    }
  }

  const handleExtendMembership = async () => {
    if (!showExtendDialog) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/memberships/${showExtendDialog.id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: extendDays })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Üyelik uzatılamadı')
      }

      toast.success(`Üyelik ${extendDays} gün uzatıldı`)
      setShowExtendDialog(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedMember('')
    setStartDate(new Date())
    setDurationDays(30)
    setPrice(0)
    setPaidAmount(0)
    setNotes('')
  }

  const getStatusBadge = (status: MembershipStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-emerald-500">Aktif</Badge>
      case 'EXPIRED':
        return <Badge variant="destructive">Süresi Dolmuş</Badge>
      case 'FROZEN':
        return <Badge className="bg-cyan-500">Dondurulmuş</Badge>
      default:
        return <Badge variant="secondary">Pasif</Badge>
    }
  }

  const filteredMemberships = memberships.filter(m => {
    const matchesSearch = !search || 
      m.member?.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.member?.user?.email?.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const quickDurations = [
    { days: 30, label: '1 Aylık' },
    { days: 60, label: '2 Aylık' },
    { days: 90, label: '3 Aylık' },
    { days: 180, label: '6 Aylık' },
    { days: 365, label: '1 Yıllık' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Üyelik Yönetimi</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Toplam {memberships.length} üyelik kaydı
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Üyelik
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Üye ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tümü</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="EXPIRED">Süresi Dolmuş</SelectItem>
                <SelectItem value="FROZEN">Dondurulmuş</SelectItem>
                <SelectItem value="INACTIVE">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Memberships Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
            </div>
          ) : filteredMemberships.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Üyelik bulunamadı
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Üye</TableHead>
                    <TableHead>Başlangıç</TableHead>
                    <TableHead>Bitiş</TableHead>
                    <TableHead>Kalan</TableHead>
                    <TableHead>Ücret</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMemberships.map((membership) => {
                    const remaining = differenceInDays(new Date(membership.endDate), new Date())
                    return (
                      <TableRow key={membership.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{membership.member?.user?.name || 'Bilinmiyor'}</p>
                            <p className="text-sm text-slate-500">{membership.member?.user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(membership.startDate), 'dd MMM yyyy', { locale: tr })}</TableCell>
                        <TableCell>{format(new Date(membership.endDate), 'dd MMM yyyy', { locale: tr })}</TableCell>
                        <TableCell>
                          <span className={remaining <= 3 ? 'text-red-500 font-medium' : remaining <= 7 ? 'text-amber-500' : ''}>
                            {remaining > 0 ? `${remaining} gün` : 'Süresi doldu'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>₺{membership.price.toLocaleString()}</p>
                            {membership.paidAmount < membership.price && (
                              <p className="text-sm text-red-500">
                                Kalan: ₺{(membership.price - membership.paidAmount).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(membership.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {membership.status === 'ACTIVE' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowExtendDialog(membership)}
                                  title="Uzat"
                                >
                                  <Clock className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setShowFreezeDialog(membership)
                                    setFreezeStart(new Date())
                                    setFreezeEnd(addDays(new Date(), 7))
                                  }}
                                  title="Dondur"
                                >
                                  <Snowflake className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {membership.status === 'FROZEN' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnfreezeMembership(membership)}
                                title="Aktif Et"
                                className="text-emerald-600"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Membership Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Üyelik Oluştur</DialogTitle>
            <DialogDescription>
              Yeni bir üyelik kaydı oluşturun
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Üye Seçin</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Üye seçin" />
                </SelectTrigger>
                <SelectContent>
                  {members.filter(m => !m.activeMembership || m.activeMembership.status === 'EXPIRED').map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.user.name} - {member.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Başlangıç Tarihi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(startDate, 'dd MMMM yyyy', { locale: tr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Süre</Label>
              <div className="flex gap-2 flex-wrap">
                {quickDurations.map((d) => (
                  <Button
                    key={d.days}
                    variant={durationDays === d.days ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDurationDays(d.days)}
                    className={durationDays === d.days ? 'bg-emerald-600' : ''}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                placeholder="Gün sayısı"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Toplam Ücret</Label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  placeholder="₺"
                />
              </div>
              <div className="space-y-2">
                <Label>Ödenen</Label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  placeholder="₺"
                />
              </div>
            </div>

            {paidAmount < price && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Borç: ₺{(price - paidAmount).toLocaleString()}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              İptal
            </Button>
            <Button onClick={handleCreateMembership} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Freeze Dialog */}
      <Dialog open={!!showFreezeDialog} onOpenChange={(open) => { if (!open) setShowFreezeDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Üyeliği Dondur</DialogTitle>
            <DialogDescription>
              Üyeliği belirtilen tarihler arasında dondurun
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Başlangıç</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(freezeStart, 'dd MMM', { locale: tr })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={freezeStart}
                      onSelect={(date) => date && setFreezeStart(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Bitiş</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(freezeEnd, 'dd MMM', { locale: tr })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={freezeEnd}
                      onSelect={(date) => date && setFreezeEnd(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sebep</Label>
              <Input
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="Dondurma sebebi (opsiyonel)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFreezeDialog(null)}>
              İptal
            </Button>
            <Button onClick={handleFreezeMembership} disabled={submitting} className="bg-cyan-600 hover:bg-cyan-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Dondur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Dialog */}
      <Dialog open={!!showExtendDialog} onOpenChange={(open) => { if (!open) setShowExtendDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Üyeliği Uzat</DialogTitle>
            <DialogDescription>
              Üyelik süresini uzatın
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2 flex-wrap">
              {quickDurations.map((d) => (
                <Button
                  key={d.days}
                  variant={extendDays === d.days ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExtendDays(d.days)}
                  className={extendDays === d.days ? 'bg-emerald-600' : ''}
                >
                  {d.label}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Gün Sayısı</Label>
              <Input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendDialog(null)}>
              İptal
            </Button>
            <Button onClick={handleExtendMembership} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Uzat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
