'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, update, onValue } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Save, LayoutDashboard, History, Settings, LogOut, Sun, Moon, Store, MapPin, Globe, ShieldAlert, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'

export default function PengaturanAdminPage() {
  const { user, loading: authLoading, logout } = useAuth('ADMIN')
  const { isDark, toggleTheme, mounted } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const [form, setForm] = useState({
    namaToko: '',
    namaSistem: '',
    lat: '',
    lng: '',
    radiusMaks: '50'
  })

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    if (!TOKO_ID) return
    const unsub = onValue(ref(db, `toko/${TOKO_ID}/setting`), (snap) => {
      const data = snap.val()
      if (data) {
        setForm({
          namaToko: data.namaToko || '',
          namaSistem: data.namaSistem || '',
          lat: data.lat || '',
          lng: data.lng || '',
          radiusMaks: data.radiusMaks || '50'
        })
      }
      setLoading(false)
    })
    return () => unsub()
  }, [TOKO_ID])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    try {
      await update(ref(db, `toko/${TOKO_ID}/setting`), form)
      setSuccessMsg('Pengaturan berhasil disimpan!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const ambilLokasiGPS = () => {
    if (!navigator.geolocation) {
      alert('Browser tidak mendukung geolokasi')
      return
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm(prev => ({
        ...prev,
        lat: String(pos.coords.latitude),
        lng: String(pos.coords.longitude)
      }))
    }, (err) => {
      alert('Gagal mengambil GPS: ' + err.message)
    })
  }

  if (authLoading || loading || !mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex relative font-sans transition-colors duration-300 pb-16">
      
      {/* SIDEBAR (Desktop) */}
      <aside className="w-64 bg-card border-r border-border flex-col hidden md:flex">
        <div className="p-5 flex items-center gap-3 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-md overflow-hidden border border-border p-1">
            <img src="/logo-ufo.png" alt="UFO Logo" className="w-full h-full object-contain" />
          </div>
          <div><h1 className="text-xs font-bold text-foreground uppercase">UFO Admin</h1><p className="text-[9px] text-muted-foreground uppercase">Kebonsari</p></div>
        </div>
        <nav className="flex-1 p-3 space-y-1.5">
          <Link href="/admin" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><LayoutDashboard className="w-4 h-4" /> Dashboard</Link>
          <Link href="/admin/aktivitas" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><History className="w-4 h-4" /> Aktivitas & Rekap</Link>
          <Link href="/admin/manajemen" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><ShieldAlert className="w-4 h-4" /> Darurat</Link>
          <Link href="/admin/pengaturan" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-xs"><Settings className="w-4 h-4" /> Pengaturan</Link>
        </nav>
        <div className="p-3 border-t border-border">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition text-xs font-semibold shadow-sm">
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 p-4 md:p-6 overflow-y-auto max-w-3xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-tight">Pengaturan Toko</h1>
            <p className="text-xs text-muted-foreground uppercase">Identitas, lokasi GPS, & zona wilayah</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2.5 rounded-full bg-card border border-border text-muted-foreground hover:text-primary transition-colors shadow-sm">
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button onClick={logout} className="md:hidden p-2.5 rounded-full bg-rose-600 text-white shadow-sm">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* FORMULIR PENGATURAN */}
        <form onSubmit={handleSave} className="space-y-4">
          
          <div className="bg-card border border-border p-5 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Identitas & Informasi Toko</h3>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Nama Toko</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-secondary/50 border border-border rounded-2xl">
                <Store className="w-4 h-4 text-primary" />
                <input 
                  type="text" 
                  value={form.namaToko} 
                  onChange={e => setForm({...form, namaToko: e.target.value})}
                  className="w-full bg-transparent text-xs font-bold text-foreground outline-none uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Nama Sistem (Tampil di Login)</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-secondary/50 border border-border rounded-2xl">
                <Globe className="w-4 h-4 text-primary" />
                <input 
                  type="text" 
                  value={form.namaSistem} 
                  onChange={e => setForm({...form, namaSistem: e.target.value})}
                  className="w-full bg-transparent text-xs font-bold text-foreground outline-none uppercase"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border p-5 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Koordinat Toko (GPS)</h3>
              <button 
                type="button" 
                onClick={ambilLokasiGPS}
                className="flex items-center gap-1.5 text-[10px] font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-xl hover:bg-primary/20 transition"
              >
                <MapPin className="w-3 h-3" /> Gunakan Lokasi Saya
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Latitude</label>
                <input 
                  type="text" 
                  value={form.lat} 
                  onChange={e => setForm({...form, lat: e.target.value})}
                  className="w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-2xl text-xs font-medium text-foreground outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Longitude</label>
                <input 
                  type="text" 
                  value={form.lng} 
                  onChange={e => setForm({...form, lng: e.target.value})}
                  className="w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-2xl text-xs font-medium text-foreground outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Radius Maksimal Absen (Meter)</label>
              <input 
                type="number" 
                value={form.radiusMaks} 
                onChange={e => setForm({...form, radiusMaks: e.target.value})}
                className="w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-2xl text-xs font-medium text-foreground outline-none"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="w-full py-3 bg-primary text-primary-foreground rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-95 transition shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Pengaturan
          </button>

        </form>
      </motion.div>

      {/* POPUP NOTIFIKASI BERHASIL (Floating Toast) */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-emerald-500/30"
          >
            <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}