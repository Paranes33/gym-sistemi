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
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, Plus, Edit, Trash2, Users, Filter, 
  MoreVertical, Phone, Mail, CreditCard, Calendar,
  UserCheck, UserX, Snowflake, AlertCircle, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import type { Member, MembershipStatus } from '@/types'
import { useAuthStore } from '@/store/auth'

const statusFilters = [
  { value: 'ALL', label: 'Tümü', icon: Users },
  { value: 'ACTIVE', label: 'Aktif', icon: UserCheck, color: 'bg-emerald-500' },
  { value: 'EXPIRED', label: 'Süresi Dolmuş', icon: UserX, color: 'bg-red-500' },
  { value: 'FROZEN', label: 'Dondurulmuş', icon: Snowflake, color: 'bg-cyan-500' },
  { value: 'INACTIVE', label: 'Pasif', icon: AlertCircle, color: 'bg-slate-500' },
]

export function MembersPanel() {
  const { gym, user } = useAuthStore()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
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

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (search) params.append('search', search)
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
  }, [statusFilter, search, gym?.id, user?.role])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const resetForm = () => {
    setFormData({
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

  const handleAddMember = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Ad, e-posta ve şifre zorunludur')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          gymId: gym?.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Üye eklenemedi')
      }

      toast.success('Üye başarıyla eklendi')
      setShowAddDialog(false)
      resetForm()
      fetchMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditMember = async () => {
    if (!editingMember) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/members/${editingMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Üye güncellenemedi')
      }

      toast.success('Üye başarıyla güncellendi')
      setEditingMember(null)
      resetForm()
      fetchMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

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

  const openEditDialog = (member: Member) => {
    setEditingMember(member)
    setFormData({
      name: member.user.name,
      email: member.user.email,
      phone: member.user.phone || '',
      password: '',
      cardId: member.cardId || '',
      gender: member.gender || '',
      birthDate: member.birthDate ? new Date(member.birthDate).toISOString().split('T')[0] : '',
      emergencyContact: member.emergencyContact || '',
      notes: member.notes || ''
    })
  }

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

  const getRemainingDays = (endDate?: string) => {
    if (!endDate) return null
    const end = new Date(endDate)
    const now = new Date()
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Üye Yönetimi</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Toplam {members.length} üye
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Üye
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="İsim, telefon veya kart ID ile ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusFilters.map((filter) => {
                const Icon = filter.icon
                return (
                  <Button
                    key={filter.value}
                    variant={statusFilter === filter.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(filter.value)}
                    className={statusFilter === filter.value ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  >
                    <Icon className="w-4 h-4 mr-1" />
                    {filter.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const remainingDays = getRemainingDays(member.activeMembership?.endDate)
            return (
              <Card key={member.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.user.image} />
                        <AvatarFallback className="bg-emerald-500 text-white">
                          {member.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{member.user.name}</h3>
                        <p className="text-sm text-slate-500">{member.user.email}</p>
                      </div>
                    </div>
                    {getStatusBadge(member.activeMembership?.status)}
                  </div>

                  <div className="space-y-2 text-sm">
                    {member.user.phone && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Phone className="w-4 h-4" />
                        <span>{member.user.phone}</span>
                      </div>
                    )}
                    {member.cardId && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <CreditCard className="w-4 h-4" />
                        <span>Kart: {member.cardId}</span>
                      </div>
                    )}
                    {member.activeMembership && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {remainingDays !== null && (
                            <span className={remainingDays <= 3 ? 'text-red-500 font-medium' : ''}>
                              {remainingDays > 0 ? `${remainingDays} gün kaldı` : 'Süresi doldu'}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {(member.totalDebt || 0) > 0 && (
                      <div className="flex items-center gap-2 text-red-500 font-medium">
                        <AlertCircle className="w-4 h-4" />
                        <span>Borç: ₺{member.totalDebt?.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openEditDialog(member)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Düzenle
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setShowDeleteDialog(member.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Üye Ekle</DialogTitle>
            <DialogDescription>
              Yeni bir üye kaydı oluşturun
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardId">Kart ID</Label>
                <Input
                  id="cardId"
                  value={formData.cardId}
                  onChange={(e) => setFormData({ ...formData, cardId: e.target.value })}
                  placeholder="Örn: CARD001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Cinsiyet</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Erkek</SelectItem>
                    <SelectItem value="female">Kadın</SelectItem>
                    <SelectItem value="other">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Doğum Tarihi</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Acil İletişim</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              İptal
            </Button>
            <Button onClick={handleAddMember} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => { if (!open) { setEditingMember(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Üye Düzenle</DialogTitle>
            <DialogDescription>
              {editingMember?.user.name} bilgilerini düzenleyin
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Ad Soyad</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">E-posta</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefon</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cardId">Kart ID</Label>
                <Input
                  id="edit-cardId"
                  value={formData.cardId}
                  onChange={(e) => setFormData({ ...formData, cardId: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notlar</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingMember(null); resetForm(); }}>
              İptal
            </Button>
            <Button onClick={handleEditMember} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={(open) => { if (!open) setShowDeleteDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Üye Sil</DialogTitle>
            <DialogDescription>
              Bu üyeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={() => showDeleteDialog && handleDeleteMember(showDeleteDialog)}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
