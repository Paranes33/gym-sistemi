'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Plus, DollarSign, CreditCard, TrendingUp, Search, 
  Trash2, Loader2, AlertCircle, CheckCircle, Wallet,
  User
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { Payment, Debt, Member, PaymentType } from '@/types'
import { useAuthStore } from '@/store/auth'

export function PaymentsPanel() {
  const { gym, user } = useAuthStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialog states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showDebtDialog, setShowDebtDialog] = useState(false)
  const [showPayDebtDialog, setShowPayDebtDialog] = useState<Debt | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Payment form
  const [paymentMember, setPaymentMember] = useState('')
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH')
  const [paymentDescription, setPaymentDescription] = useState('')

  // Debt form
  const [debtMember, setDebtMember] = useState('')
  const [debtAmount, setDebtAmount] = useState(0)
  const [debtDescription, setDebtDescription] = useState('')

  // Pay debt form
  const [payAmount, setPayAmount] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const gymId = user?.role === 'SALON_ADMIN' ? gym?.id : undefined
      
      const [paymentsRes, debtsRes, membersRes] = await Promise.all([
        fetch(`/api/payments${gymId ? `?gymId=${gymId}` : ''}`),
        fetch(`/api/debts${gymId ? `?gymId=${gymId}` : ''}`),
        fetch(`/api/members?pageSize=100${gymId ? `&gymId=${gymId}` : ''}`)
      ])

      if (paymentsRes.ok) {
        const data = await paymentsRes.json()
        setPayments(Array.isArray(data) ? data : (data.data || []))
      }
      
      if (debtsRes.ok) {
        const data = await debtsRes.json()
        setDebts(Array.isArray(data) ? data : (data.data || []))
      }
      
      if (membersRes.ok) {
        const data = await membersRes.json()
        setMembers(Array.isArray(data) ? data : (data.data || []))
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [gym?.id, user?.role])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreatePayment = async () => {
    if (!paymentMember || paymentAmount <= 0) {
      toast.error('Üye seçin ve geçerli bir tutar girin')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: paymentMember,
          amount: paymentAmount,
          type: paymentType,
          description: paymentDescription,
          gymId: gym?.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ödeme kaydedilemedi')
      }

      toast.success('Ödeme başarıyla kaydedildi')
      setShowPaymentDialog(false)
      resetPaymentForm()
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateDebt = async () => {
    if (!debtMember || debtAmount <= 0 || !debtDescription) {
      toast.error('Tüm alanları doldurun')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: debtMember,
          amount: debtAmount,
          description: debtDescription
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Borç eklenemedi')
      }

      toast.success('Borç başarıyla eklendi')
      setShowDebtDialog(false)
      resetDebtForm()
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayDebt = async () => {
    if (!showPayDebtDialog || payAmount <= 0) {
      toast.error('Geçerli bir tutar girin')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/debts/${showPayDebtDialog.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: payAmount })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ödeme yapılamadı')
      }

      toast.success('Ödeme başarıyla yapıldı')
      setShowPayDebtDialog(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteDebt = async (id: string) => {
    try {
      const response = await fetch(`/api/debts/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Silinemedi')
      
      toast.success('Borç silindi')
      fetchData()
    } catch {
      toast.error('Borç silinemedi')
    }
  }

  const resetPaymentForm = () => {
    setPaymentMember('')
    setPaymentAmount(0)
    setPaymentType('CASH')
    setPaymentDescription('')
  }

  const resetDebtForm = () => {
    setDebtMember('')
    setDebtAmount(0)
    setDebtDescription('')
  }

  const totalDebts = debts.filter(d => !d.isPaid).reduce((sum, d) => sum + d.amount, 0)
  const todayPayments = payments.filter(p => 
    new Date(p.createdAt).toDateString() === new Date().toDateString()
  )
  const todayTotal = todayPayments.reduce((sum, p) => sum + p.amount, 0)

  const filteredPayments = payments.filter(p => {
    const matchesSearch = !search || 
      p.member?.user?.name?.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  const filteredDebts = debts.filter(d => {
    const matchesSearch = !search || 
      d.member?.user?.name?.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ödeme & Borç Yönetimi</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Ödemeler ve borç takibi
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Bugünkü Gelir</p>
                <p className="text-xl font-bold text-emerald-600">₺{todayTotal.toLocaleString()}</p>
                <p className="text-xs text-slate-400">{todayPayments.length} ödeme</p>
              </div>
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Toplam Borç</p>
                <p className="text-xl font-bold text-red-600">₺{totalDebts.toLocaleString()}</p>
                <p className="text-xs text-slate-400">{debts.filter(d => !d.isPaid).length} üye</p>
              </div>
              <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Toplam Ödeme</p>
                <p className="text-xl font-bold text-blue-600">₺{payments.reduce((s, p) => s + p.amount, 0).toLocaleString()}</p>
                <p className="text-xs text-slate-400">{payments.length} işlem</p>
              </div>
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="payments" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList>
            <TabsTrigger value="payments">Ödemeler ({payments.length})</TabsTrigger>
            <TabsTrigger value="debts">Borçlar ({debts.filter(d => !d.isPaid).length})</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button onClick={() => setShowPaymentDialog(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-9">
              <Plus className="w-4 h-4 mr-1" />
              Ödeme
            </Button>
            <Button onClick={() => setShowDebtDialog(true)} variant="outline" size="sm" className="h-9">
              <Plus className="w-4 h-4 mr-1" />
              Borç
            </Button>
          </div>
        </div>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p>Ödeme bulunamadı</p>
                  <p className="text-sm">Yeni ödeme eklemek için yukarıdaki "Ödeme" butonunu kullanın</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                        <TableHead>Üye</TableHead>
                        <TableHead>Tutar</TableHead>
                        <TableHead>Tür</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead>Tarih</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.slice(0, 50).map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-500" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{payment.member?.user?.name || 'Bilinmiyor'}</p>
                                <p className="text-xs text-slate-500">{payment.member?.user?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-600">
                            ₺{payment.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={payment.type === 'CASH' ? 'default' : 'secondary'} className="text-xs">
                              {payment.type === 'CASH' ? 'Nakit' : payment.type === 'CARD' ? 'Kart' : 'Online'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm max-w-32 truncate">{payment.description || '-'}</TableCell>
                          <TableCell className="text-slate-500 text-sm">
                            {format(new Date(payment.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debts Tab */}
        <TabsContent value="debts">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
                </div>
              ) : filteredDebts.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
                  <p>Borç bulunamadı</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                        <TableHead>Üye</TableHead>
                        <TableHead>Tutar</TableHead>
                        <TableHead>Açıklama</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDebts.map((debt) => (
                        <TableRow key={debt.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-500" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{debt.member?.user?.name || 'Bilinmiyor'}</p>
                                <p className="text-xs text-slate-500">{debt.member?.user?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-red-600">
                            ₺{debt.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm max-w-32 truncate">{debt.description}</TableCell>
                          <TableCell>
                            {debt.isPaid ? (
                              <Badge className="bg-emerald-500 text-xs">Ödendi</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">Bekliyor</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">
                            {format(new Date(debt.createdAt), 'dd MMM yyyy', { locale: tr })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {!debt.isPaid && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-emerald-600"
                                  onClick={() => {
                                    setShowPayDebtDialog(debt)
                                    setPayAmount(debt.amount)
                                  }}
                                  title="Öde"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600"
                                onClick={() => handleDeleteDebt(debt.id)}
                                title="Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ödeme Al</DialogTitle>
            <DialogDescription>Üyeden ödeme al</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Üye</Label>
              <Select value={paymentMember} onValueChange={setPaymentMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Üye seçin" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.user.name} - {member.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tutar (₺)</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Ödeme Türü</Label>
                <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Nakit</SelectItem>
                    <SelectItem value="CARD">Kart</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                rows={2}
                placeholder="Ödeme açıklaması (opsiyonel)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPaymentDialog(false); resetPaymentForm(); }}>
              İptal
            </Button>
            <Button onClick={handleCreatePayment} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debt Dialog */}
      <Dialog open={showDebtDialog} onOpenChange={setShowDebtDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borç Ekle</DialogTitle>
            <DialogDescription>Üyeye borç ekle</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Üye</Label>
              <Select value={debtMember} onValueChange={setDebtMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Üye seçin" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.user.name} - {member.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tutar (₺)</Label>
              <Input
                type="number"
                value={debtAmount}
                onChange={(e) => setDebtAmount(Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama *</Label>
              <Textarea
                value={debtDescription}
                onChange={(e) => setDebtDescription(e.target.value)}
                rows={2}
                placeholder="Borç açıklaması"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDebtDialog(false); resetDebtForm(); }}>
              İptal
            </Button>
            <Button onClick={handleCreateDebt} disabled={submitting} className="bg-red-600 hover:bg-red-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Debt Dialog */}
      <Dialog open={!!showPayDebtDialog} onOpenChange={(open) => { if (!open) setShowPayDebtDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borç Öde</DialogTitle>
            <DialogDescription>
              {showPayDebtDialog?.member?.user?.name} - ₺{showPayDebtDialog?.amount.toLocaleString()} borç
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ödenecek Tutar (₺)</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                placeholder="0"
              />
              <p className="text-xs text-slate-500">
                Toplam borç: ₺{showPayDebtDialog?.amount.toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDebtDialog(null)}>
              İptal
            </Button>
            <Button onClick={handlePayDebt} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Öde
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
