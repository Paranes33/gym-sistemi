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
import { 
  Plus, Edit, Trash2, Building2, Users, 
  MapPin, Phone, Mail, Loader2, Check, X
} from 'lucide-react'
import { toast } from 'sonner'
import type { Gym, User } from '@/types'

export function GymsPanel() {
  const [gyms, setGyms] = useState<Gym[]>([])
  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingGym, setEditingGym] = useState<Gym | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    adminId: ''
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [gymsRes, adminsRes] = await Promise.all([
        fetch('/api/gyms'),
        fetch('/api/users?role=SALON_ADMIN')
      ])

      if (gymsRes.ok) setGyms(await gymsRes.json())
      if (adminsRes.ok) setAdmins(await adminsRes.json())
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateGym = async () => {
    if (!formData.name) {
      toast.error('Salon adı zorunludur')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/gyms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Salon oluşturulamadı')
      }

      toast.success('Salon başarıyla oluşturuldu')
      setShowAddDialog(false)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateGym = async () => {
    if (!editingGym) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/gyms/${editingGym.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Salon güncellenemedi')
      }

      toast.success('Salon başarıyla güncellendi')
      setEditingGym(null)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteGym = async () => {
    if (!showDeleteDialog) return

    try {
      const response = await fetch(`/api/gyms/${showDeleteDialog}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Silinemedi')
      
      toast.success('Salon silindi')
      setShowDeleteDialog(null)
      fetchData()
    } catch {
      toast.error('Salon silinemedi')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      adminId: ''
    })
  }

  const openEditDialog = (gym: Gym) => {
    setEditingGym(gym)
    setFormData({
      name: gym.name,
      address: gym.address || '',
      phone: gym.phone || '',
      email: gym.email || '',
      adminId: gym.adminId || ''
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Salon Yönetimi</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Toplam {gyms.length} spor salonu
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Salon
        </Button>
      </div>

      {/* Gyms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : gyms.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">Henüz salon eklenmemiş</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gyms.map((gym) => (
            <Card key={gym.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{gym.name}</CardTitle>
                      <Badge variant={gym.isActive ? 'default' : 'secondary'} className="mt-1">
                        {gym.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {gym.address && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="w-4 h-4" />
                    <span>{gym.address}</span>
                  </div>
                )}
                {gym.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Phone className="w-4 h-4" />
                    <span>{gym.phone}</span>
                  </div>
                )}
                {gym.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Mail className="w-4 h-4" />
                    <span>{gym.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Users className="w-4 h-4" />
                  <span>{gym.memberCount || 0} üye</span>
                </div>
                {gym.admin && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500">Yönetici:</p>
                    <p className="font-medium">{gym.admin.name}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openEditDialog(gym)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Düzenle
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setShowDeleteDialog(gym.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Gym Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Salon Ekle</DialogTitle>
            <DialogDescription>
              Yeni bir spor salonu ekleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Salon Adı *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: Fitness Center Kadıköy"
              />
            </div>
            <div className="space-y-2">
              <Label>Adres</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Tam adres"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0212 xxx xxxx"
                />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="salon@email.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Salon Yöneticisi</Label>
              <Select value={formData.adminId} onValueChange={(value) => setFormData({ ...formData, adminId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Yönetici seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  {admins.filter(a => !a.managedGym).map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name} - {admin.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              İptal
            </Button>
            <Button onClick={handleCreateGym} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Gym Dialog */}
      <Dialog open={!!editingGym} onOpenChange={(open) => { if (!open) { setEditingGym(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salon Düzenle</DialogTitle>
            <DialogDescription>
              {editingGym?.name} bilgilerini düzenleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Salon Adı</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Adres</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Salon Yöneticisi</Label>
              <Select value={formData.adminId} onValueChange={(value) => setFormData({ ...formData, adminId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Yönetici seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Yok</SelectItem>
                  {admins.filter(a => !a.managedGym || a.managedGym?.id === editingGym?.id).map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name} - {admin.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingGym(null); resetForm(); }}>
              İptal
            </Button>
            <Button onClick={handleUpdateGym} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
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
            <DialogTitle>Salon Sil</DialogTitle>
            <DialogDescription>
              Bu salonu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm üyeler silinir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDeleteGym}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
