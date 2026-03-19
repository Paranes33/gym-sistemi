'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  Search, Plus, Edit, Trash2, Users, Filter, 
  Phone, Mail, CreditCard, Calendar as CalendarIcon,
  UserCheck, UserX, Snowflake, AlertCircle, Loader2,
  Clock, Snowflake as FreezeIcon, Ban, Check, X,
  ChevronDown, ChevronUp, MoreVertical, Eye
} from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays, differenceInDays } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Member, MembershipStatus, Membership } from '@/types'
import { useAuthStore } from '@/store/auth'

// Durum seçenekleri
const statusOptions = [
  { value: 'ALL', label: 'Tümü', icon: Users, color: '' },
  { value: 'ACTIVE', label: 'Aktif', icon: UserCheck, color: 'bg-emerald-500' },
  { value: 'EXPIRED', label: 'Süresi Dolmuş', icon: UserX, color: 'bg-red-500' },
  { value: 'FROZEN', label: 'Dondurulmuş', icon: Snowflake, color: 'bg-cyan-500' },
  { value: 'INACTIVE', label: 'Pasif', icon: Ban, color: 'bg-slate-500' },
]

// Hızlı üyelik süreleri
const quickDurations = [
  { days: 30, label: '1 Aylık', price: 1500 },
  { days: 60, label: '2 Aylık', price: 2800 },
  { days: 90, label: '3 Aylık', price: 4000 },
  { days: 180, label: '6 Aylık', price: 7500 },
  { days: 365, label: '1 Yıllık', price: 14000 },
]

export function MembersPanel() {
  const { gym, user } = useAuthStore()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [showDebtOnly, setShowDebtOnly] = useState(false)
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState<Member | null>(null)
  const [showMembershipDialog, setShowMembershipDialog] = useState<Member | null>(null)
  const [showFreezeDialog, setShowFreezeDialog] = useState<Member | null>(null)
  const [showExtendDialog, setShowExtendDialog] = useState<Member | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state - Yeni üye
  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    cardId: '',
    gender: '',
    birthDate: '',
    emergencyContact: '',
    notes: ''
  })

  // Form state - Yeni üyelik
  const [membershipForm, setMembershipForm] = useState({
    durationDays: 30,
    price: 1500,
    paidAmount: 1500,
    startDate: new Date(),
    notes: ''
  })

  // Form state - Dondurma
  const [freezeForm, setFreezeForm] = useState({
    startDate: new Date(),
    endDate: addDays(new Date(), 7),
    reason: ''
  })

  // Form state - Uzatma
  const [extendDays, setExtendDays] = useState(30)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (search) params.append('search', search)
      if (showDebtOnly) params.append('hasDebt', 'true')
      if (user?.role === 'SALON_ADMIN' && gym?.id) params.append('gymId', gym.id)

      const response = await fetch(`/api/members?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMembers(data.data || data)
      }
    } catch (error) {
      console.error('Fetch members error:', error)
      toast.error('Üyeler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, showDebtOnly, gym?.id, user?.role])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Üye ekleme
  const handleAddMember = async () => {
    if (!memberForm.name || !memberForm.email || !memberForm.password) {
      toast.error('Ad, e-posta ve şifre zorunludur')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...memberForm,
          gymId: gym?.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Üye eklenemedi')
      }

      toast.success('Üye başarıyla eklendi')
      setShowAddDialog(false)
      resetMemberForm()
      fetchMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  // Üyelik ekleme
  const handleAddMembership = async () => {
    if (!showMembershipDialog) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: showMembershipDialog.id,
          startDate: membershipForm.startDate.toISOString(),
          durationDays: membershipForm.durationDays,
          price: membershipForm.price,
          paidAmount: membershipForm.paidAmount,
          notes: membershipForm.notes
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Üyelik oluşturulamadı')
      }

      toast.success('Üyelik başarıyla oluşturuldu')
      setShowMembershipDialog(null)
      resetMembershipForm()
      fetchMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  // Üyelik dondurma
  const handleFreezeMembership = async () => {
    if (!showFreezeDialog?.activeMembership) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/memberships/${showFreezeDialog.activeMembership.id}/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: freezeForm.startDate.toISOString(),
          endDate: freezeForm.endDate.toISOString(),
          reason: freezeForm.reason
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Üyelik dondurulamadı')
      }

      toast.success('Üyelik başarıyla donduruldu')
      setShowFreezeDialog(null)
      resetFreezeForm()
      fetchMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  // Üyelik uzatma
  const handleExtendMembership = async () => {
    if (!showExtendDialog?.activeMembership) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/memberships/${showExtendDialog.activeMembership.id}/extend`, {
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
      setExtendDays(30)
      fetchMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  // Dondurmayı kaldır
  const handleUnfreezeMembership = async (member: Member) => {
    if (!member.activeMembership) return

    try {
      const response = await fetch(`/api/memberships/${member.activeMembership.id}/unfreeze`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('İşlem başarısız')

      toast.success('Üyelik aktif edildi')
      fetchMembers()
    } catch {
      toast.error('İşlem başarısız')
    }
  }

  // Üye silme
  const handleDeleteMember = async (id: string) => {
    try {
      const response = await fetch(`/api/members/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Üye silinemedi')
      
      toast.success('Üye başarıyla silindi')
      setShowDeleteDialog(null)
      fetchMembers()
    } catch {
      toast.error('Üye silinirken hata oluştu')
    }
  }

  // Form sıfırlama
  const resetMemberForm = () => {
    setMemberForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      cardId: '',
      gender: '',
      birthDate: '',
      emergencyContact: '',
      notes: ''
    })
  }

  const resetMembershipForm = () => {
    setMembershipForm({
      durationDays: 30,
      price: 1500,
      paidAmount: 1500,
      startDate: new Date(),
      notes: ''
    })
  }

  const resetFreezeForm = () => {
    setFreezeForm({
      startDate: new Date(),
      endDate: addDays(new Date(), 7),
      reason: ''
    })
  }

  // Durum badge'i
  const getStatusBadge = (status?: MembershipStatus) => {
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

  // Kalan gün hesaplama
  const getRemainingDays = (endDate?: string) => {
    if (!endDate) return null
    const end = new Date(endDate)
    const now = new Date()
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  // İlerleme çubuğu
  const getProgressValue = (membership?: Membership) => {
    if (!membership) return 0
    const total = membership.durationDays
    const remaining = getRemainingDays(membership.endDate) || 0
    const used = total - remaining
    return Math.max(0, Math.min(100, (used / total) * 100))
  }

  // İstatistikler
  const stats = {
    total: members.length,
    active: members.filter(m => m.activeMembership?.status === 'ACTIVE').length,
    expired: members.filter(m => m.activeMembership?.status === 'EXPIRED' || 
      (m.activeMembership && getRemainingDays(m.activeMembership.endDate) !== null && getRemainingDays(m.activeMembership.endDate) <= 0)).length,
    frozen: members.filter(m => m.activeMembership?.status === 'FROZEN').length,
    withDebt: members.filter(m => (m.totalDebt || 0) > 0).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Üye Yönetimi</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Toplam {stats.total} üye • {stats.active} aktif • {stats.withDebt} borçlu
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Üye
        </Button>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('ALL')}>
          <CardContent className="p-3 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-slate-500" />
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-xs text-slate-500">Toplam</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'ACTIVE' ? 'ring-2 ring-emerald-500' : ''}`} onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}>
          <CardContent className="p-3 text-center">
            <UserCheck className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-xl font-bold text-emerald-600">{stats.active}</p>
            <p className="text-xs text-slate-500">Aktif</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'EXPIRED' ? 'ring-2 ring-red-500' : ''}`} onClick={() => setStatusFilter(statusFilter === 'EXPIRED' ? 'ALL' : 'EXPIRED')}>
          <CardContent className="p-3 text-center">
            <UserX className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-xl font-bold text-red-600">{stats.expired}</p>
            <p className="text-xs text-slate-500">Süresi Dolmuş</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${statusFilter === 'FROZEN' ? 'ring-2 ring-cyan-500' : ''}`} onClick={() => setStatusFilter(statusFilter === 'FROZEN' ? 'ALL' : 'FROZEN')}>
          <CardContent className="p-3 text-center">
            <Snowflake className="w-5 h-5 mx-auto mb-1 text-cyan-500" />
            <p className="text-xl font-bold text-cyan-600">{stats.frozen}</p>
            <p className="text-xs text-slate-500">Dondurulmuş</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${showDebtOnly ? 'ring-2 ring-amber-500' : ''}`} onClick={() => setShowDebtOnly(!showDebtOnly)}>
          <CardContent className="p-3 text-center">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-xl font-bold text-amber-600">{stats.withDebt}</p>
            <p className="text-xs text-slate-500">Borçlu</p>
          </CardContent>
        </Card>
      </div>

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="İsim, telefon, e-posta veya kart ID ile ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Üye Listesi */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">Üye bulunamadı</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
            const remainingDays = getRemainingDays(member.activeMembership?.endDate)
            const progress = getProgressValue(member.activeMembership)
            
            return (
              <Card key={member.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Ana Bilgi */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-14 h-14">
                          <AvatarImage src={member.user.image} />
                          <AvatarFallback className="bg-emerald-500 text-white text-lg">
                            {member.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{member.user.name}</h3>
                            {getStatusBadge(member.activeMembership?.status)}
                            {(member.totalDebt || 0) > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                ₺{member.totalDebt?.toLocaleString()} Borç
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                            {member.user.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {member.user.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {member.user.email}
                            </span>
                            {member.cardId && (
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                {member.cardId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Üyelik Bilgisi */}
                    <div className="sm:w-72 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                      {member.activeMembership ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">Üyelik</span>
                            <span className="font-semibold">{member.activeMembership.durationDays} Günlük</span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">Kalan</span>
                              <span className={`font-bold ${remainingDays !== null && remainingDays <= 3 ? 'text-red-500' : remainingDays !== null && remainingDays <= 7 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                {remainingDays !== null && remainingDays > 0 ? `${remainingDays} gün` : 'Süresi doldu'}
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{format(new Date(member.activeMembership.startDate), 'dd MMM', { locale: tr })}</span>
                            <span>{format(new Date(member.activeMembership.endDate), 'dd MMM yyyy', { locale: tr })}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                          <p className="text-sm text-slate-500">Aktif üyelik yok</p>
                          <Button 
                            size="sm" 
                            className="mt-2 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                              setShowMembershipDialog(member)
                              resetMembershipForm()
                            }}
                          >
                            Üyelik Ekle
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* İşlemler */}
                    <div className="flex sm:flex-col justify-end gap-1 p-2 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowDetailDialog(member)}
                        title="Detay"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {member.activeMembership?.status === 'ACTIVE' && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setShowExtendDialog(member)
                              setExtendDays(30)
                            }}
                            title="Uzat"
                          >
                            <Clock className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setShowFreezeDialog(member)
                              resetFreezeForm()
                            }}
                            title="Dondur"
                          >
                            <FreezeIcon className="w-4 h-4 text-cyan-500" />
                          </Button>
                        </>
                      )}
                      
                      {member.activeMembership?.status === 'FROZEN' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleUnfreezeMembership(member)}
                          title="Aktif Et"
                          className="text-emerald-600"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {!member.activeMembership && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setShowMembershipDialog(member)
                            resetMembershipForm()
                          }}
                          title="Üyelik Ekle"
                          className="text-emerald-600"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setShowDeleteDialog(member.id)}
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ========== DİALOGLAR ========== */}

      {/* Yeni Üye Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Üye Ekle</DialogTitle>
            <DialogDescription>Yeni bir üye kaydı oluşturun</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ad Soyad *</Label>
                <Input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-posta *</Label>
                <Input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Şifre *</Label>
                <Input type="password" value={memberForm.password} onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kart ID</Label>
                <Input value={memberForm.cardId} onChange={(e) => setMemberForm({ ...memberForm, cardId: e.target.value })} placeholder="CARD001" />
              </div>
              <div className="space-y-2">
                <Label>Cinsiyet</Label>
                <Select value={memberForm.gender} onValueChange={(value) => setMemberForm({ ...memberForm, gender: value })}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Erkek</SelectItem>
                    <SelectItem value="female">Kadın</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea value={memberForm.notes} onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetMemberForm(); }}>İptal</Button>
            <Button onClick={handleAddMember} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Üyelik Ekle Dialog */}
      <Dialog open={!!showMembershipDialog} onOpenChange={(open) => { if (!open) setShowMembershipDialog(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Üyelik Ekle</DialogTitle>
            <DialogDescription>{showMembershipDialog?.user.name} için yeni üyelik</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Başlangıç Tarihi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(membershipForm.startDate, 'dd MMMM yyyy', { locale: tr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={membershipForm.startDate} onSelect={(date) => date && setMembershipForm({ ...membershipForm, startDate: date })} />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Süre</Label>
              <div className="flex gap-2 flex-wrap">
                {quickDurations.map((d) => (
                  <Button key={d.days} variant={membershipForm.durationDays === d.days ? 'default' : 'outline'} size="sm" onClick={() => setMembershipForm({ ...membershipForm, durationDays: d.days, price: d.price, paidAmount: d.price })} className={membershipForm.durationDays === d.days ? 'bg-emerald-600' : ''}>
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Toplam Ücret</Label>
                <Input type="number" value={membershipForm.price} onChange={(e) => setMembershipForm({ ...membershipForm, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Ödenen</Label>
                <Input type="number" value={membershipForm.paidAmount} onChange={(e) => setMembershipForm({ ...membershipForm, paidAmount: Number(e.target.value) })} />
              </div>
            </div>
            
            {membershipForm.paidAmount < membershipForm.price && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">Borç: ₺{(membershipForm.price - membershipForm.paidAmount).toLocaleString()}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMembershipDialog(null)}>İptal</Button>
            <Button onClick={handleAddMembership} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dondur Dialog */}
      <Dialog open={!!showFreezeDialog} onOpenChange={(open) => { if (!open) setShowFreezeDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Üyeliği Dondur</DialogTitle>
            <DialogDescription>{showFreezeDialog?.user.name} - Üyeliği geçici olarak dondurun</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Başlangıç</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(freezeForm.startDate, 'dd MMM', { locale: tr })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={freezeForm.startDate} onSelect={(date) => date && setFreezeForm({ ...freezeForm, startDate: date })} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Bitiş</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(freezeForm.endDate, 'dd MMM', { locale: tr })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={freezeForm.endDate} onSelect={(date) => date && setFreezeForm({ ...freezeForm, endDate: date })} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sebep</Label>
              <Input value={freezeForm.reason} onChange={(e) => setFreezeForm({ ...freezeForm, reason: e.target.value })} placeholder="Dondurma sebebi (opsiyonel)" />
            </div>
            <p className="text-sm text-slate-500">Dondurma süresi kadar üyelik otomatik uzatılacak.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFreezeDialog(null)}>İptal</Button>
            <Button onClick={handleFreezeMembership} disabled={submitting} className="bg-cyan-600 hover:bg-cyan-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Dondur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Uzat Dialog */}
      <Dialog open={!!showExtendDialog} onOpenChange={(open) => { if (!open) setShowExtendDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Üyeliği Uzat</DialogTitle>
            <DialogDescription>{showExtendDialog?.user.name} - Üyelik süresini uzatın</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2 flex-wrap">
              {quickDurations.map((d) => (
                <Button key={d.days} variant={extendDays === d.days ? 'default' : 'outline'} size="sm" onClick={() => setExtendDays(d.days)} className={extendDays === d.days ? 'bg-emerald-600' : ''}>
                  {d.label}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Gün Sayısı</Label>
              <Input type="number" value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendDialog(null)}>İptal</Button>
            <Button onClick={handleExtendMembership} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Uzat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detay Dialog */}
      <Dialog open={!!showDetailDialog} onOpenChange={(open) => { if (!open) setShowDetailDialog(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Üye Detayları</DialogTitle>
          </DialogHeader>
          {showDetailDialog && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-emerald-500 text-white text-xl">
                    {showDetailDialog.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{showDetailDialog.user.name}</h3>
                  <p className="text-slate-500">{showDetailDialog.user.email}</p>
                  {showDetailDialog.cardId && <p className="text-sm text-slate-400">Kart: {showDetailDialog.cardId}</p>}
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Durum</p>
                  {getStatusBadge(showDetailDialog.activeMembership?.status)}
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Kalan Gün</p>
                  <p className="text-lg font-bold">{getRemainingDays(showDetailDialog.activeMembership?.endDate) ?? '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Toplam Ödeme</p>
                  <p className="text-lg font-bold text-emerald-600">₺{(showDetailDialog.payments?.reduce((s, p) => s + p.amount, 0) || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Borç</p>
                  <p className={`text-lg font-bold ${(showDetailDialog.totalDebt || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>₺{(showDetailDialog.totalDebt || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={(open) => { if (!open) setShowDeleteDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Üye Sil</DialogTitle>
            <DialogDescription>Bu üyeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>İptal</Button>
            <Button variant="destructive" onClick={() => showDeleteDialog && handleDeleteMember(showDeleteDialog)}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
