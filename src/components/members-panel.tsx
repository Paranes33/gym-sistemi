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
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  Search, Plus, Trash2, Users, 
  Phone, Mail, CreditCard, Calendar as CalendarIcon,
  UserCheck, UserX, Snowflake, AlertCircle, Loader2,
  Clock, Ban, Check, Eye, Filter, Edit
} from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays, differenceInDays } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Member, MembershipStatus } from '@/types'
import { useAuthStore } from '@/store/auth'

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
  const [showFreezeDialog, setShowFreezeDialog] = useState<Member | null>(null)
  const [showExtendDialog, setShowExtendDialog] = useState<Member | null>(null)
  const [showEditDateDialog, setShowEditDateDialog] = useState<Member | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state - Yeni üye (üyelik ile birlikte)
  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    cardId: '',
    gender: '',
    // Üyelik bilgileri
    addMembership: true,
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

  // Form state - Tarih düzenleme
  const [editEndDate, setEditEndDate] = useState<Date>(new Date())

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (user?.role === 'SALON_ADMIN' && gym?.id) params.append('gymId', gym.id)

      const response = await fetch(`/api/members?${params}`)
      if (response.ok) {
        const data = await response.json()
        let membersList = data.data || data
        
        // Client-side filtreleme
        if (statusFilter !== 'ALL') {
          membersList = membersList.filter((m: Member) => {
            if (statusFilter === 'INACTIVE') {
              return !m.activeMembership
            }
            if (statusFilter === 'EXPIRING') {
              // Son 7 gün içinde bitecek aktif üyelikler
              const remaining = m.activeMembership ? getRemainingDays(m.activeMembership.endDate) : null
              return m.activeMembership?.status === 'ACTIVE' && remaining !== null && remaining > 0 && remaining <= 7
            }
            return m.activeMembership?.status === statusFilter
          })
        }
        
        if (showDebtOnly) {
          membersList = membersList.filter((m: Member) => (m.totalDebt || 0) > 0)
        }
        
        setMembers(membersList)
      }
    } catch (error) {
      console.error('Fetch members error:', error)
      toast.error('Üyeler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, showDebtOnly, gym?.id, user?.role])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Üye ekleme (üyelik ile birlikte)
  const handleAddMember = async () => {
    if (!memberForm.name || !memberForm.email || !memberForm.password) {
      toast.error('Ad, e-posta ve şifre zorunludur')
      return
    }

    setSubmitting(true)
    try {
      // 1. Üyeyi oluştur
      const memberResponse = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: memberForm.name,
          email: memberForm.email,
          phone: memberForm.phone,
          password: memberForm.password,
          cardId: memberForm.cardId,
          gender: memberForm.gender,
          gymId: gym?.id
        })
      })

      if (!memberResponse.ok) {
        const error = await memberResponse.json()
        throw new Error(error.error || 'Üye eklenemedi')
      }

      const newMember = await memberResponse.json()

      // 2. Üyelik ekle (seçiliyse)
      if (memberForm.addMembership && memberForm.durationDays > 0) {
        const membershipResponse = await fetch('/api/memberships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: newMember.id,
            startDate: memberForm.startDate.toISOString(),
            durationDays: memberForm.durationDays,
            price: memberForm.price,
            paidAmount: memberForm.paidAmount,
            notes: memberForm.notes
          })
        })

        if (!membershipResponse.ok) {
          toast.warning('Üye eklendi ama üyelik oluşturulamadı')
        }
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

  // Tarih düzenleme
  const handleEditDate = async () => {
    if (!showEditDateDialog?.activeMembership) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/memberships/${showEditDateDialog.activeMembership.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endDate: editEndDate.toISOString() })
      })

      if (!response.ok) throw new Error('Tarih güncellenemedi')

      toast.success('Bitiş tarihi güncellendi')
      setShowEditDateDialog(null)
      fetchMembers()
    } catch {
      toast.error('Tarih güncellenemedi')
    } finally {
      setSubmitting(false)
    }
  }

  // Üye silme
  const handleDeleteMember = async (id: string) => {
    try {
      const response = await fetch(`/api/members/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Üye silinemedi')
      }
      
      toast.success('Üye başarıyla silindi')
      setShowDeleteDialog(null)
      fetchMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Üye silinirken hata oluştu')
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
      addMembership: true,
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
  const getStatusBadge = (member: Member) => {
    const remaining = member.activeMembership ? getRemainingDays(member.activeMembership.endDate) : null
    
    if (!member.activeMembership) {
      return <Badge variant="secondary" className="text-xs">Pasif</Badge>
    }
    
    if (member.activeMembership.status === 'FROZEN') {
      return <Badge className="bg-cyan-500 text-xs">Dondurulmuş</Badge>
    }
    
    if (member.activeMembership.status === 'EXPIRED' || (remaining !== null && remaining <= 0)) {
      return <Badge variant="destructive" className="text-xs">Süresi Dolmuş</Badge>
    }
    
    // Son 7 gün - Yakında dolacak
    if (remaining !== null && remaining > 0 && remaining <= 7) {
      return <Badge className="bg-amber-500 text-xs">Yakında Dolacak</Badge>
    }
    
    return <Badge className="bg-emerald-500 text-xs">Aktif</Badge>
  }

  // Kalan gün hesaplama
  const getRemainingDays = (endDate?: string) => {
    if (!endDate) return null
    const end = new Date(endDate)
    const now = new Date()
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  // İstatistikler
  const allMembers = members
  const stats = {
    total: allMembers.length,
    active: allMembers.filter(m => {
      if (m.activeMembership?.status !== 'ACTIVE') return false
      const remaining = getRemainingDays(m.activeMembership.endDate)
      return remaining !== null && remaining > 7
    }).length,
    expiring: allMembers.filter(m => {
      if (m.activeMembership?.status !== 'ACTIVE') return false
      const remaining = getRemainingDays(m.activeMembership.endDate)
      return remaining !== null && remaining > 0 && remaining <= 7
    }).length,
    expired: allMembers.filter(m => 
      m.activeMembership?.status === 'EXPIRED' || 
      (m.activeMembership && getRemainingDays(m.activeMembership.endDate) !== null && getRemainingDays(m.activeMembership.endDate) <= 0)
    ).length,
    frozen: allMembers.filter(m => m.activeMembership?.status === 'FROZEN').length,
    withDebt: allMembers.filter(m => (m.totalDebt || 0) > 0).length,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Üye Yönetimi</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Toplam {stats.total} üye
          </p>
        </div>
        <Button onClick={() => { setShowAddDialog(true); resetMemberForm(); }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Üye
        </Button>
      </div>

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="İsim, telefon, e-posta veya kart ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-10">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tümü</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="EXPIRING">Yakında Dolacak</SelectItem>
            <SelectItem value="EXPIRED">Süresi Dolmuş</SelectItem>
            <SelectItem value="FROZEN">Dondurulmuş</SelectItem>
            <SelectItem value="INACTIVE">Pasif</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant={showDebtOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowDebtOnly(!showDebtOnly)}
          className={`h-10 ${showDebtOnly ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          Borçlu ({stats.withDebt})
        </Button>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <div 
          className={`p-2 rounded-lg border cursor-pointer transition-all ${statusFilter === 'ALL' && !showDebtOnly ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700'}`}
          onClick={() => { setStatusFilter('ALL'); setShowDebtOnly(false); }}
        >
          <div className="text-center">
            <p className="text-lg font-bold">{stats.total}</p>
            <p className="text-xs text-slate-500">Toplam</p>
          </div>
        </div>
        
        <div 
          className={`p-2 rounded-lg border cursor-pointer transition-all ${statusFilter === 'ACTIVE' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700'}`}
          onClick={() => { setStatusFilter('ACTIVE'); setShowDebtOnly(false); }}
        >
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">{stats.active}</p>
            <p className="text-xs text-slate-500">Aktif</p>
          </div>
        </div>
        
        <div 
          className={`p-2 rounded-lg border cursor-pointer transition-all ${statusFilter === 'EXPIRING' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700'}`}
          onClick={() => { setStatusFilter('EXPIRING'); setShowDebtOnly(false); }}
        >
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600">{stats.expiring}</p>
            <p className="text-xs text-slate-500">Yakında</p>
          </div>
        </div>
        
        <div 
          className={`p-2 rounded-lg border cursor-pointer transition-all ${statusFilter === 'EXPIRED' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700'}`}
          onClick={() => { setStatusFilter('EXPIRED'); setShowDebtOnly(false); }}
        >
          <div className="text-center">
            <p className="text-lg font-bold text-red-600">{stats.expired}</p>
            <p className="text-xs text-slate-500">Süresi D.</p>
          </div>
        </div>
        
        <div 
          className={`p-2 rounded-lg border cursor-pointer transition-all ${statusFilter === 'FROZEN' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700'}`}
          onClick={() => { setStatusFilter('FROZEN'); setShowDebtOnly(false); }}
        >
          <div className="text-center">
            <p className="text-lg font-bold text-cyan-600">{stats.frozen}</p>
            <p className="text-xs text-slate-500">Dondurulmuş</p>
          </div>
        </div>
        
        <div 
          className={`p-2 rounded-lg border cursor-pointer transition-all ${showDebtOnly ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700'}`}
          onClick={() => { setStatusFilter('ALL'); setShowDebtOnly(!showDebtOnly); }}
        >
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600">{stats.withDebt}</p>
            <p className="text-xs text-slate-500">Borçlu</p>
          </div>
        </div>
      </div>

      {/* Üye Tablosu */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
            </div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">Üye bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Üye</TableHead>
                    <TableHead>İletişim</TableHead>
                    <TableHead>Kart ID</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Üyelik Bitiş</TableHead>
                    <TableHead>Kalan</TableHead>
                    <TableHead>Borç</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member, index) => {
                    const remainingDays = getRemainingDays(member.activeMembership?.endDate)
                    
                    return (
                      <TableRow key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell className="text-slate-400 text-sm">{index + 1}</TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={member.user.image} />
                              <AvatarFallback className="bg-emerald-500 text-white text-xs">
                                {member.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{member.user.name}</span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm">
                            <p className="truncate max-w-32">{member.user.email}</p>
                            {member.user.phone && (
                              <p className="text-slate-500 text-xs">{member.user.phone}</p>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {member.cardId ? (
                            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {member.cardId}
                            </code>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          {getStatusBadge(member)}
                        </TableCell>
                        
                        <TableCell>
                          {member.activeMembership ? (
                            <span className="text-sm">
                              {format(new Date(member.activeMembership.endDate), 'dd MMM yyyy', { locale: tr })}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Üyelik yok</span>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          {member.activeMembership ? (
                            <span className={`font-medium text-sm ${
                              remainingDays !== null && remainingDays <= 0 ? 'text-red-600' :
                              remainingDays !== null && remainingDays <= 3 ? 'text-red-500' :
                              remainingDays !== null && remainingDays <= 7 ? 'text-amber-500' :
                              'text-emerald-600'
                            }`}>
                              {remainingDays !== null && remainingDays > 0 ? `${remainingDays} gün` : 'Süresi doldu'}
                            </span>
                          ) : '-'}
                        </TableCell>
                        
                        <TableCell>
                          {(member.totalDebt || 0) > 0 ? (
                            <span className="text-red-600 font-medium text-sm">
                              ₺{member.totalDebt?.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setShowDetailDialog(member)}
                              title="Detay"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            
                            {member.activeMembership?.status === 'ACTIVE' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 w-7 p-0 text-purple-500"
                                  onClick={() => {
                                    setShowEditDateDialog(member)
                                    setEditEndDate(new Date(member.activeMembership!.endDate))
                                  }}
                                  title="Tarih Değiştir"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 w-7 p-0 text-blue-500"
                                  onClick={() => {
                                    setShowExtendDialog(member)
                                    setExtendDays(30)
                                  }}
                                  title="Uzat"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 w-7 p-0 text-cyan-500"
                                  onClick={() => {
                                    setShowFreezeDialog(member)
                                    resetFreezeForm()
                                  }}
                                  title="Dondur"
                                >
                                  <Snowflake className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                            
                            {member.activeMembership?.status === 'FROZEN' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-7 w-7 p-0 text-emerald-500"
                                onClick={() => handleUnfreezeMembership(member)}
                                title="Aktif Et"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            
                            {!member.activeMembership && (
                              <span className="text-xs text-slate-400">Üyelik eklemek için ödemeler panelini kullanın</span>
                            )}
                            
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500"
                              onClick={() => setShowDeleteDialog(member.id)}
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
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

      {/* ========== DİALOGLAR ========== */}

      {/* Yeni Üye Dialog (üyelik dahil) */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Üye Ekle</DialogTitle>
            <DialogDescription>Üye bilgilerini ve üyelik detaylarını girin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            {/* Üye Bilgileri */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-500">Üye Bilgileri</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Ad Soyad *</Label>
                  <Input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">E-posta *</Label>
                  <Input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefon</Label>
                  <Input value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Şifre *</Label>
                  <Input type="password" value={memberForm.password} onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })} className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Kart ID</Label>
                  <Input value={memberForm.cardId} onChange={(e) => setMemberForm({ ...memberForm, cardId: e.target.value })} placeholder="CARD001" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cinsiyet</Label>
                  <Select value={memberForm.gender} onValueChange={(value) => setMemberForm({ ...memberForm, gender: value })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Erkek</SelectItem>
                      <SelectItem value="female">Kadın</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Üyelik Bilgileri */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={memberForm.addMembership} 
                  onChange={(e) => setMemberForm({ ...memberForm, addMembership: e.target.checked })}
                  className="rounded"
                />
                <Label className="text-sm font-medium">Üyelik Ekle</Label>
              </div>
              
              {memberForm.addMembership && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Başlangıç Tarihi</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start h-9">
                          <CalendarIcon className="w-3.5 h-3.5 mr-2" />
                          {format(memberForm.startDate, 'dd MMMM yyyy', { locale: tr })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={memberForm.startDate} onSelect={(date) => date && setMemberForm({ ...memberForm, startDate: date })} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs">Süre</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {quickDurations.map((d) => (
                        <Button 
                          key={d.days} 
                          variant={memberForm.durationDays === d.days ? 'default' : 'outline'} 
                          size="sm" 
                          onClick={() => setMemberForm({ ...memberForm, durationDays: d.days, price: d.price, paidAmount: d.price })} 
                          className={`h-8 text-xs ${memberForm.durationDays === d.days ? 'bg-emerald-600' : ''}`}
                        >
                          {d.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Toplam Ücret (₺)</Label>
                      <Input type="number" value={memberForm.price} onChange={(e) => setMemberForm({ ...memberForm, price: Number(e.target.value) })} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ödenen (₺)</Label>
                      <Input type="number" value={memberForm.paidAmount} onChange={(e) => setMemberForm({ ...memberForm, paidAmount: Number(e.target.value) })} className="h-9" />
                    </div>
                  </div>
                  
                  {memberForm.paidAmount < memberForm.price && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                      Borç oluşacak: ₺{(memberForm.price - memberForm.paidAmount).toLocaleString()}
                    </div>
                  )}
                </>
              )}
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

      {/* Tarih Düzenle Dialog */}
      <Dialog open={!!showEditDateDialog} onOpenChange={(open) => { if (!open) setShowEditDateDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bitiş Tarihi Değiştir</DialogTitle>
            <DialogDescription>{showEditDateDialog?.user.name}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Yeni Bitiş Tarihi</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start mt-2">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {format(editEndDate, 'dd MMMM yyyy', { locale: tr })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={editEndDate} onSelect={(date) => date && setEditEndDate(date)} />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDateDialog(null)}>İptal</Button>
            <Button onClick={handleEditDate} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dondur Dialog */}
      <Dialog open={!!showFreezeDialog} onOpenChange={(open) => { if (!open) setShowFreezeDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Üyeliği Dondur</DialogTitle>
            <DialogDescription>{showFreezeDialog?.user.name}</DialogDescription>
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
              <Label>Sebep (Opsiyonel)</Label>
              <Input value={freezeForm.reason} onChange={(e) => setFreezeForm({ ...freezeForm, reason: e.target.value })} />
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
            <DialogDescription>{showExtendDialog?.user.name}</DialogDescription>
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
            <Button onClick={() => handleExtendMembership()} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
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
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="bg-emerald-500 text-white text-lg">
                    {showDetailDialog.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold">{showDetailDialog.user.name}</h3>
                  <p className="text-sm text-slate-500">{showDetailDialog.user.email}</p>
                  {showDetailDialog.cardId && <p className="text-xs text-slate-400">Kart: {showDetailDialog.cardId}</p>}
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Durum</p>
                  {getStatusBadge(showDetailDialog)}
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Kalan Gün</p>
                  <p className="text-lg font-bold">{getRemainingDays(showDetailDialog.activeMembership?.endDate) ?? '-'}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Ödeme</p>
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
            <DialogDescription>Silmek istediğinizden emin misiniz?</DialogDescription>
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
