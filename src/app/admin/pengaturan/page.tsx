'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, update, onValue } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Save, Store, Globe, MapPin, CheckCircle2, AlertCircle } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAutoReset } from '@/hooks/useAutoReset'
import { AdminShell } from '@/components/admin/admin-shell'
import { SectionCard, inputCls, btn } from '@/components/admin/admin-ui'

const labelCls = 'text-[11px] font-bold text-muted-foreground uppercase'

export default function PengaturanAdminPage() {
  const { user, loading: authLoading, logout } = useAuth('ADMIN')
  const { isDark, toggleTheme, mounted } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [form, setForm] = useState({
    namaToko: '',
    namaSistem: '',
    lat: '',
    lng: '',
    radiusMaks: '50'
  })

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'
  useAutoReset(user ? TOKO_ID : undefined)

  useEffect(() => {
    if (!TOKO_ID) return
    const unsubSetting = onValue(ref(db, `toko/${TOKO_ID}/setting`), (snap) => {
      const data = snap.val()
      if (data) {
        setForm({
          namaToko: data.namaToko || '',
          namaSistem: data.namaSistem || '',
          lat: data.lat !== undefined && data.lat !== null ? String(data.lat) : '',
          lng: data.lng !== undefined && data.lng !== null ? String(data.lng) : '',
          radiusMaks: data.radiusMaks !== undefined && data.radiusMaks !== null ? String(data.radiusMaks) : '50'
        })
      }
      setLoading(false)
    }, (err) => {
      console.error(err)
      setErrorMsg('Pengaturan tidak bisa dibaca. Cek rules Firebase.')
      setLoading(false)
    })

    return () => unsubSetting()
  }, [TOKO_ID])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const lat = Number(String(form.lat).trim().replace(',', '.'))
      const lng = Number(String(form.lng).trim().replace(',', '.'))
      const radius = Number(form.radiusMaks)

      if (!Number.isFinite(lat) || !Number.isFinite(lng) || form.lat.trim() === '' || form.lng.trim() === '') {
        setErrorMsg('Latitude dan Longitude harus berupa angka, contoh: -7.98 dan 112.63')
        return
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setErrorMsg('Koordinat di luar jangkauan. Latitude -90 sampai 90, Longitude -180 sampai 180.')
        return
      }
      if (!Number.isFinite(radius) || radius < 1) {
        setErrorMsg('Radius harus berupa angka lebih dari 0 (dalam meter).')
        return
      }

      await update(ref(db, `toko/${TOKO_ID}/setting`), {
        namaToko: form.namaToko.trim(),
        namaSistem: form.namaSistem.trim(),
        lat,
        lng,
        radiusMaks: radius,
      })
      setSuccessMsg('Pengaturan toko berhasil disimpan.')
    } catch (err) {
      console.error(err)
      setErrorMsg('Gagal menyimpan pengaturan. Cek koneksi dan rules Firebase.')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading || !mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  }

  return (
    <AdminShell isDark={isDark} onToggleTheme={toggleTheme} onLogout={logout} tokoId={TOKO_ID}>
      <form onSubmit={handleSave} className="space-y-6">
        <SectionCard icon={<Store className="w-5 h-5" />} tone="cyan" title="Identitas Toko" subtitle="Tampil di halaman login">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className={labelCls}>Nama Toko</label>
              <div className="relative">
                <Store className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="text" value={form.namaToko} onChange={e => setForm({ ...form, namaToko: e.target.value })} className={`${inputCls} pl-11 uppercase font-bold`} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Nama Sistem (Tampil di Login)</label>
              <div className="relative">
                <Globe className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="text" value={form.namaSistem} onChange={e => setForm({ ...form, namaSistem: e.target.value })} className={`${inputCls} pl-11 uppercase font-bold`} />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={<MapPin className="w-5 h-5" />} tone="emerald" title="Lokasi & Radius" subtitle="Dipakai untuk validasi kehadiran GPS">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>Latitude</label>
                <input type="text" inputMode="decimal" placeholder="-7.xxxxx" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Longitude</label>
                <input type="text" inputMode="decimal" placeholder="112.xxxxx" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Radius Maksimal Absen (Meter)</label>
              <input type="number" min="1" value={form.radiusMaks} onChange={e => setForm({ ...form, radiusMaks: e.target.value })} className={inputCls} />
            </div>
          </div>
        </SectionCard>

        <button type="submit" disabled={saving} className={btn.cyan}>
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          SIMPAN PENGATURAN
        </button>
      </form>

      <AnimatePresence>
        {successMsg && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card border border-border w-full max-w-sm p-6 rounded-3xl shadow-2xl text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">BERHASIL</h3>
                <p className="text-xs text-muted-foreground">{successMsg}</p>
              </div>
              <button onClick={() => setSuccessMsg('')} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md transition">OK</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {errorMsg && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card border border-border w-full max-w-sm p-6 rounded-3xl shadow-2xl text-center space-y-5">
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">GAGAL</h3>
                <p className="text-xs text-muted-foreground">{errorMsg}</p>
              </div>
              <button onClick={() => setErrorMsg('')} className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md transition">OK</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminShell>
  )
}
