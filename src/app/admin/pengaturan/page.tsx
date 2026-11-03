'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, update, onValue, remove } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Save, LayoutDashboard, History, Settings, LogOut, Sun, Moon, Store, Globe, ShieldAlert, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'

export default function PengaturanAdminPage() {
  const { user, loading: authLoading, logout } = useAuth('ADMIN')
  const { isDark, toggleTheme, mounted } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const [todayKey, setTodayKey] = useState('')
  const [hariIniIndo, setHariIniIndo] = useState('')
  const [checkinList, setCheckinList] = useState<any[]>([])
  const [statistikList, setStatistikList] = useState<any[]>([])

  const [form, setForm] = useState({
    namaToko: '',
    namaSistem: '',
    lat: '',
    lng: '',
    radiusMaks: '50'
  })

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    setHariIniIndo(`${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()}`)
    setTodayKey(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`)
  }, [])

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

    const unsubStat = onValue(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setStatistikList(list)
    })

    const unsubCheckin = onValue(ref(db, `toko/${TOKO_ID}/checkinHarian`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) {
        Object.keys(data).forEach(namaClean => {
          const tglObj = data[namaClean]
          if (tglObj) {
            Object.keys(tglObj).forEach(tKey => {
              list.push({ namaClean, tanggalKey: tKey, ...tglObj[tKey] })
            })
          }
        })
      }
      setCheckinList(list)
    })

    return () => { unsubSetting(); unsubStat(); unsubCheckin() }
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

  // FUNGSI RESET ANTRIAN HARI INI (DI MENU PENGATURAN)
  const handleResetAntrianHariIni = async () => {
    if (!TOKO_ID || isResetting) return
    setIsResetting(true)
    try {
      // 1. Hapus antrian aktif saat ini
      await remove(ref(db, `toko/${TOKO_ID}/antrian`))

      // 2. Hapus data checkin hari ini berdasarkan todayKey
      if (checkinList.length > 0) {
        for (const ch of checkinList) {
          if (ch.tanggalKey === todayKey) {
            await remove(ref(db, `toko/${TOKO_ID}/checkinHarian/${ch.namaClean}/${todayKey}`))
          }
        }
      }

      // 3. Hapus statistik aktivitas hari ini (total bulanan tetap aman)
      if (statistikList.length > 0) {
        for (const stat of statistikList) {
          if (stat.tanggal === hariIniIndo) {
            await remove(ref(db, `toko/${TOKO_ID}/statistikAktivitas/${stat._key}`))
          }
        }
      }

      setSuccessMsg('Reset antrian & aktivitas hari ini berhasil! Total bulanan tetap aman.')
      setShowResetConfirm(false)
    } catch (err) {
      console.error(err)
      setErrorMsg('Gagal melakukan reset hari ini.')
    } finally {
      setIsResetting(false)
    }
  }

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false)
    await logout()
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
          <Link href="/admin/manajemen" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><ShieldAlert className="w-4 h-4" /> Kontrol Antrian</Link>
          <Link href="/admin/pengaturan" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-xs"><Settings className="w-4 h-4" /> Pengaturan</Link>
        </nav>
        <div className="p-3 border-t border-border">
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition text-xs font-semibold shadow-sm">
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 p-4 md:p-6 overflow-y-auto max-w-3xl mx-auto space-y-6">

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-tight">Pengaturan Toko</h1>
            <p className="text-xs text-muted-foreground uppercase">Identitas, lokasi GPS, & kontrol sistem harian</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2.5 rounded-full bg-card border border-border text-muted-foreground hover:text-primary transition-colors shadow-sm">
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          {/* KARTU PENGATURAN RESET HARIAN */}
          <div className="bg-card border border-border p-5 rounded-3xl shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kontrol Sistem Harian</h3>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-secondary/40 p-4 rounded-2xl border border-border/60">
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase">Reset Data Hari Ini</h4>
                <p className="text-[11px] text-muted-foreground">Menghapus antrian aktif, check-in harian, & aktivitas hari ini. <span className="font-bold text-foreground">Rekap bulanan tetap aman.</span></p>
              </div>
              <button 
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm uppercase transition shrink-0"
              >
                <RefreshCcw className="w-3.5 h-3.5" /> Reset Hari Ini
              </button>
            </div>
          </div>

          <div className="bg-card border border-border p-5 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Identitas & Informasi Toko</h3>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Nama Toko</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-secondary/50 border border-border rounded-2xl">
                <Store className="w-4 h-4 text-primary" />
                <input type="text" value={form.namaToko} onChange={e => setForm({ ...form, namaToko: e.target.value })} className="w-full bg-transparent text-xs font-bold text-foreground outline-none uppercase" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Nama Sistem (Tampil di Login)</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-secondary/50 border border-border rounded-2xl">
                <Globe className="w-4 h-4 text-primary" />
                <input type="text" value={form.namaSistem} onChange={e => setForm({ ...form, namaSistem: e.target.value })} className="w-full bg-transparent text-xs font-bold text-foreground outline-none uppercase" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border p-5 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Koordinat Toko (Manual)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Latitude</label>
                <input type="text" inputMode="decimal" placeholder="-7.xxxxx" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} className="w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-2xl text-xs font-medium text-foreground outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Longitude</label>
                <input type="text" inputMode="decimal" placeholder="112.xxxxx" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} className="w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-2xl text-xs font-medium text-foreground outline-none" />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Radius Maksimal Absen (Meter)</label>
              <input type="number" min="1" value={form.radiusMaks} onChange={e => setForm({ ...form, radiusMaks: e.target.value })} className="w-full px-3 py-2.5 bg-secondary/50 border border-border rounded-2xl text-xs font-medium text-foreground outline-none" />
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full py-3 bg-primary text-primary-foreground rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-95 transition shadow-sm disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Pengaturan
          </button>
        </form>
      </motion.div>

      {/* MODAL KONFIRMASI RESET HARI INI */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card border border-border w-full max-w-sm p-6 rounded-3xl shadow-2xl text-center space-y-5">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <RefreshCcw className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">RESET HARI INI</h3>
                <p className="text-xs text-muted-foreground">Tindakan ini akan menghapus antrian aktif, check-in hari ini, dan aktivitas harian promotor. <strong className="text-foreground">Total rekap bulanan Anda tetap aman</strong>.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowResetConfirm(false)} disabled={isResetting} className="flex-1 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-2xl text-xs font-bold uppercase tracking-wider transition">Batal</button>
                <button onClick={handleResetAntrianHariIni} disabled={isResetting} className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2">
                  {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ya, Reset'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL BERHASIL */}
      <AnimatePresence>
        {successMsg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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

      {/* MODAL ERROR */}
      <AnimatePresence>
        {errorMsg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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

      {/* MODAL LOGOUT */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card border border-border w-full max-w-sm p-6 rounded-3xl shadow-2xl text-center space-y-5">
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <LogOut className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">KELUAR APLIKASI</h3>
                <p className="text-xs text-muted-foreground">Apakah Anda yakin ingin keluar dari sesi admin?</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-2xl text-xs font-bold uppercase tracking-wider transition">Batal</button>
                <button onClick={handleConfirmLogout} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md transition">Ya, Keluar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}