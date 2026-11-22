'use client'

import { useAuth } from '@/hooks/useAuth'
import { db, auth } from '@/lib/firebase'
import { ref, update, onValue, remove } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Save, Store, Globe, MapPin, CheckCircle2, AlertCircle, ShieldCheck, UserPlus, Trash2, Mail } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAutoReset } from '@/hooks/useAutoReset'
import { AdminShell } from '@/components/admin/admin-shell'
import { SectionCard, inputCls, btn } from '@/components/admin/admin-ui'

const labelCls = 'text-[11px] font-bold text-muted-foreground uppercase'
const emailToKey = (email: string) => email.trim().toLowerCase().replace(/\./g, ',')
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  // Kelola admin
  const [admins, setAdmins] = useState<any[]>([])
  const [adminNama, setAdminNama] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [busyKey, setBusyKey] = useState('')

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

  // Daftar admin dari whitelist
  useEffect(() => {
    if (!user) return
    const unsub = onValue(ref(db, 'users/whitelist'), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) {
        Object.keys(data).forEach(k => {
          if (data[k]?.role === 'ADMIN') {
            list.push({ _key: k, nama: data[k].nama || '-', email: data[k].email || k.replace(/,/g, '.') })
          }
        })
      }
      list.sort((a, b) => a.nama.localeCompare(b.nama))
      setAdmins(list)
    }, (err) => console.error(err))
    return () => unsub()
  }, [user])

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

  const handleTambahAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    const nama = adminNama.trim().toUpperCase()
    const email = adminEmail.trim().toLowerCase()

    if (!nama || !email) { setErrorMsg('Isi nama dan email admin!'); return }
    if (!EMAIL_RE.test(email)) { setErrorMsg('Format email tidak valid.'); return }
    if (admins.some(a => String(a.email).toLowerCase() === email)) {
      setErrorMsg('Email ini sudah terdaftar sebagai admin.')
      return
    }
    if (!window.confirm(`Jadikan ${nama} (${email}) sebagai ADMIN? Admin punya akses penuh ke semua pengaturan.`)) return

    setAddingAdmin(true)
    try {
      await update(ref(db, `users/whitelist/${emailToKey(email)}`), {
        nama,
        email,
        role: 'ADMIN',
        tokoId: TOKO_ID,
      })
      setSuccessMsg(`${nama} sudah terdaftar sebagai admin dan bisa login dengan akun Google tersebut.`)
      setAdminNama('')
      setAdminEmail('')
    } catch (err) {
      console.error(err)
      setErrorMsg('Gagal menambah admin. Cek rules Firebase.')
    } finally {
      setAddingAdmin(false)
    }
  }

  const handleHapusAdmin = async (a: any) => {
    const emailSaya = (auth.currentUser?.email || '').toLowerCase()
    if (String(a.email).toLowerCase() === emailSaya) {
      setErrorMsg('Anda tidak bisa menghapus akun Anda sendiri.')
      return
    }
    if (admins.length <= 1) {
      setErrorMsg('Harus ada minimal satu admin.')
      return
    }
    if (!window.confirm(`Hapus ${a.nama} dari daftar admin? Akunnya tidak akan bisa login lagi.`)) return

    setBusyKey(a._key)
    try {
      await remove(ref(db, `users/whitelist/${a._key}`))
      setSuccessMsg(`${a.nama} dihapus dari daftar admin.`)
    } catch (err) {
      console.error(err)
      setErrorMsg('Gagal menghapus admin.')
    } finally {
      setBusyKey('')
    }
  }

  if (authLoading || loading || !mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  }

  const emailSaya = (auth.currentUser?.email || '').toLowerCase()

  return (
    <AdminShell isDark={isDark} onToggleTheme={toggleTheme} onLogout={logout} tokoId={TOKO_ID}>
      {/* ===== KELOLA ADMIN DI PALING ATAS ===== */}
      <SectionCard icon={<ShieldCheck className="w-5 h-5" />} tone="emerald" title="Kelola Admin" subtitle="Admin punya akses penuh ke aplikasi">
        <form onSubmit={handleTambahAdmin} className="space-y-3 pb-4 border-b border-border">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Tambah Admin Baru</p>
          <div className="relative">
            <UserPlus className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input type="text" value={adminNama} onChange={e => setAdminNama(e.target.value)} placeholder="NAMA" className={`${inputCls} pl-11 uppercase font-bold`} required />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="EMAIL GOOGLE" className={`${inputCls} pl-11`} required />
          </div>
          <button
            type="submit"
            disabled={addingAdmin}
            className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {addingAdmin ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            {addingAdmin ? 'MEMPROSES...' : 'SIMPAN ADMIN'}
          </button>
        </form>

        <div className="space-y-2 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Daftar Admin Aktif</p>
          {admins.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-2">Belum ada data admin</p>
          ) : admins.map((a) => {
            const isSaya = String(a.email).toLowerCase() === emailSaya
            return (
              <div key={a._key} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-secondary/50 border border-border/60">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-foreground truncate">
                    {a.nama} {isSaya && <span className="ml-1 text-[9px] font-black bg-primary/15 text-primary px-1.5 py-0.5 rounded">ANDA</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{a.email}</p>
                </div>
                {!isSaya && (
                  <button
                    type="button"
                    onClick={() => handleHapusAdmin(a)}
                    disabled={busyKey === a._key}
                    aria-label={`Hapus ${a.nama}`}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95 transition disabled:opacity-50"
                  >
                    {busyKey === a._key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </SectionCard>

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