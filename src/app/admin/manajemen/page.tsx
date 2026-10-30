'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue, update, get, remove, push, set } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, UserPlus, UserMinus, Trash2, Play, Lock, Unlock, RotateCcw, ShieldAlert, LayoutDashboard, History, Settings, LogOut, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'

export default function ManajemenPage() {
  const { user, loading: authLoading, logout } = useAuth('ADMIN')
  const { isDark, toggleTheme, mounted } = useTheme()
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [masterSales, setMasterSales] = useState<any[]>([])
  const [daftarAntrian, setDaftarAntrian] = useState<any[]>([])
  
  const [formNama, setFormNama] = useState('')
  const [formEmail, setFormEmail] = useState('')
  
  const [selectedSales, setSelectedSales] = useState('')
  const [selectedKategori, setSelectedKategori] = useState('HA')
  const [selectedPosisi, setSelectedPosisi] = useState('1')
  
  const [selectedLockSales, setSelectedLockSales] = useState('')
  const [lockAction, setLockAction] = useState('LOCK')
  const [lockReason, setLockReason] = useState('Pulang tanpa keluar antrian')
  const [lockDuration, setLockDuration] = useState('60')

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    if (!TOKO_ID) return
    const unsubMaster = onValue(ref(db, 'mastersales'), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) {
        Object.keys(data).forEach(k => {
          const item = data[k]
          const rec = item.record ? item.record : item
          const nama = rec.NAMA_PROMOTOR || rec.nama
          const email = rec.EMAIL || rec.email || ''
          if (nama) list.push({ _key: k, nama: String(nama).trim(), email })
        })
      }
      setMasterSales(list)
    })
    const unsubAntrian = onValue(ref(db, `toko/${TOKO_ID}/antrian`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setDaftarAntrian(list)
    })
    return () => { unsubMaster(); unsubAntrian(); }
  }, [TOKO_ID])

  const handleTambahPromotor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNama || !formEmail) return alert('Isi semua field!')
    setIsProcessing(true)
    try {
      const emailKey = formEmail.trim().toLowerCase().replace(/\./g, ',')
      await set(ref(db, 'users/whitelist/' + emailKey), {
        nama: formNama.toUpperCase(),
        email: formEmail.trim().toLowerCase(),
        role: 'PROMOTOR',
        tokoId: TOKO_ID
      })
      await push(ref(db, 'mastersales'), { record: { NAMA_PROMOTOR: formNama.toUpperCase(), EMAIL: formEmail.trim().toLowerCase() } })
      alert(`Berhasil! Promotor ${formNama.toUpperCase()} sudah bisa login.`)
      setFormNama('')
      setFormEmail('')
    } catch (err) { alert('Gagal menambah promotor.') } finally { setIsProcessing(false) }
  }

  const handleMasukanAntri = async () => {
    if (!selectedSales) return alert('Pilih promotor!')
    setIsProcessing(true)
    try {
      const clean = selectedSales.trim().toLowerCase().replace(/\s+/g, '_')
      const snap = await get(ref(db, `toko/${TOKO_ID}/antrian/${clean}`))
      if (snap.exists()) throw new Error('Promotor sudah ada di antrian.')
      await set(ref(db, `toko/${TOKO_ID}/antrian/${clean}`), {
        nama: selectedSales, status: 'Standby', waktuStandby: Date.now(),
        kategori: selectedKategori, subkategori: selectedKategori,
        posisiTerkunci: 0, timerMulai: 0, timerAksi: ''
      })
      alert('Berhasil memasukkan promotor ke antrian.')
      setSelectedSales('')
    } catch (err: any) { alert(err.message) } finally { setIsProcessing(false) }
  }

  const handleKeluarkanAntrian = async () => {
    if (!selectedSales) return alert('Pilih promotor!')
    setIsProcessing(true)
    try {
      const clean = selectedSales.trim().toLowerCase().replace(/\s+/g, '_')
      await remove(ref(db, `toko/${TOKO_ID}/antrian/${clean}`))
      alert('Berhasil mengeluarkan promotor dari antrian.')
      setSelectedSales('')
    } catch (err) { alert('Gagal mengeluarkan promotor.') } finally { setIsProcessing(false) }
  }

  const handleHapusPermanen = async () => {
    if (!selectedSales) return alert('Pilih promotor!')
    if (!window.confirm(`Hapus permanen ${selectedSales}?`)) return
    setIsProcessing(true)
    try {
      const target = masterSales.find(s => s.nama === selectedSales)
      if (target) {
        await remove(ref(db, 'mastersales/' + target._key))
        if (target.email) {
          const emailKey = target.email.toLowerCase().replace(/\./g, ',')
          await remove(ref(db, 'users/whitelist/' + emailKey))
        }
      }
      alert('Promotor dihapus permanen.')
      setSelectedSales('')
    } catch (err) { alert('Gagal menghapus.') } finally { setIsProcessing(false) }
  }

  const handlePaksaBawaCustomer = async () => {
    if (!selectedSales) return alert('Pilih promotor!')
    setIsProcessing(true)
    try {
      const clean = selectedSales.trim().toLowerCase().replace(/\s+/g, '_')
      await update(ref(db, `toko/${TOKO_ID}/antrian/${clean}`), {
        status: 'Melayani', waktuMulaiMelayani: Date.now(), posisiTerkunci: 0
      })
      await push(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), {
        nama: selectedSales, aksi: 'BawaCustomer', waktu: Date.now(),
        tanggal: new Date().toLocaleDateString('id-ID').split('/').join('-'),
        waktuMulai: Date.now(), keterangan: 'Dipaksa Admin'
      })
      alert('Promotor dipaksa melayani customer.')
      setSelectedSales('')
    } catch (err) { alert('Gagal memproses.') } finally { setIsProcessing(false) }
  }

  const handleLockUnlock = async () => {
    if (!selectedLockSales) return alert('Pilih promotor!')
    setIsProcessing(true)
    try {
      const clean = selectedLockSales.trim().toLowerCase().replace(/\s+/g, '_')
      if (lockAction === 'LOCK') {
        await update(ref(db, `toko/${TOKO_ID}/lockPromotor/${clean}`), {
          nama: selectedLockSales, locked: true, alasan: lockReason,
          waktuMulaiLock: Date.now(), waktuSelesaiLock: Date.now() + (parseInt(lockDuration) * 60000)
        })
        await remove(ref(db, `toko/${TOKO_ID}/antrian/${clean}`))
        alert(`${selectedLockSales} dikunci selama ${lockDuration} menit.`)
      } else {
        await update(ref(db, `toko/${TOKO_ID}/lockPromotor/${clean}`), {
          locked: false, alasan: '', waktuSelesaiLock: 0, waktuMulaiLock: 0
        })
        alert(`${selectedLockSales} dibuka kuncinya.`)
      }
      setSelectedLockSales('')
    } catch (err) { alert('Gagal memproses lock.') } finally { setIsProcessing(false) }
  }

  const handleResetTotal = async () => {
    if (!window.confirm("⚠️ PERINGATAN: Hapus semua antrian aktif hari ini?")) return
    setIsProcessing(true)
    try {
      await remove(ref(db, `toko/${TOKO_ID}/antrian`))
      alert('Semua antrian berhasil direset.')
    } catch (err) { alert('Gagal reset.') } finally { setIsProcessing(false) }
  }

  if (authLoading || !mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex relative font-sans transition-colors duration-300 pb-24">
      
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
          <Link href="/admin/manajemen" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-xs"><ShieldAlert className="w-4 h-4" /> Darurat</Link>
          <Link href="/admin/pengaturan" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><Settings className="w-4 h-4" /> Pengaturan</Link>
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
            <h1 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-tight">Manajemen & Darurat</h1>
            <p className="text-xs text-muted-foreground uppercase">Kontrol Penuh Admin</p>
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

        <div className="space-y-4">
          
          {/* TAMBAH PROMOTOR */}
          <div className="bg-card bg-white dark:bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Tambah Promotor Baru</h3>
            <form onSubmit={handleTambahPromotor} className="space-y-3">
              <input type="text" value={formNama} onChange={e => setFormNama(e.target.value)} placeholder="NAMA LENGKAP" className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 px-4 text-xs font-bold text-foreground focus:outline-none uppercase" required />
              <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="EMAIL GOOGLE" className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 px-4 text-xs font-medium text-foreground focus:outline-none" required />
              <button type="submit" disabled={isProcessing} className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-2xl uppercase tracking-wider text-xs hover:opacity-95 transition shadow-sm">Simpan Promotor</button>
            </form>
          </div>

          {/* MANAJEMEN URUTAN ANTRIAN */}
          <div className="bg-card bg-white dark:bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><UserMinus className="w-4 h-4 text-amber-500" /> Manajemen Urutan Antrian</h3>
            <div className="space-y-3">
              <select value={selectedSales} onChange={e => setSelectedSales(e.target.value)} className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 px-4 text-xs font-medium text-foreground focus:outline-none">
                <option value="">-- Pilih Promotor --</option>
                {masterSales.map(s => <option key={s._key} value={s.nama}>{s.nama}</option>)}
              </select>
              
              <div className="grid grid-cols-2 gap-3">
                <select value={selectedKategori} onChange={e => setSelectedKategori(e.target.value)} className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 px-4 text-xs font-medium text-foreground focus:outline-none">
                  <option value="HA">Kategori HA</option>
                  <option value="AV">Kategori AV</option>
                </select>
                <input type="number" value={selectedPosisi} onChange={e => setSelectedPosisi(e.target.value)} placeholder="Posisi" className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 px-4 text-xs font-medium text-foreground focus:outline-none" min="1" />
              </div>

              {/* TOMBOL AKSI ANTRIAN (SOLID DI MODE TERANG) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button onClick={handleMasukanAntri} disabled={isProcessing} className="py-3 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20 font-bold rounded-2xl text-[11px] uppercase hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition shadow-sm">Masukkan Promotor ke Antrian</button>
                <button onClick={handleKeluarkanAntrian} disabled={isProcessing} className="py-3 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/20 font-bold rounded-2xl text-[11px] uppercase hover:bg-amber-200 dark:hover:bg-amber-500/20 transition shadow-sm">Keluarkan Promotor dari Antrian</button>
              </div>

              <button onClick={handlePaksaBawaCustomer} disabled={isProcessing || !selectedSales} className="w-full py-3 bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-500/20 font-bold rounded-2xl text-xs uppercase flex items-center justify-center gap-2 hover:bg-sky-200 dark:hover:bg-sky-500/20 transition shadow-sm">
                <Play className="w-4 h-4" /> Paksa Bawa Customer (Pilih dari Promotor di Atas)
              </button>

              <button onClick={handleHapusPermanen} disabled={isProcessing} className="w-full py-3 bg-rose-100 dark:bg-destructive/10 text-rose-700 dark:text-destructive border border-rose-300 dark:border-destructive/20 font-bold rounded-2xl text-[11px] uppercase flex items-center justify-center gap-2 hover:bg-rose-200 dark:hover:bg-destructive/20 transition shadow-sm"><Trash2 className="w-4 h-4" /> Hapus Promotor Permanen</button>
            </div>
          </div>

          {/* TINDAKAN DARURAT */}
          <div className="bg-card bg-white dark:bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-500" /> Tindakan Darurat</h3>
            <div className="space-y-3">
              <select value={selectedLockSales} onChange={e => setSelectedLockSales(e.target.value)} className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 px-4 text-xs font-medium text-foreground focus:outline-none">
                <option value="">-- Pilih Promotor untuk Lock --</option>
                {masterSales.map(s => <option key={s._key} value={s.nama}>{s.nama}</option>)}
              </select>
              <select value={lockAction} onChange={e => setLockAction(e.target.value)} className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 px-4 text-xs font-medium text-foreground focus:outline-none">
                <option value="LOCK">🔒 Kunci Akun</option>
                <option value="UNLOCK">🔓 Buka Kunci</option>
              </select>
              {lockAction === 'LOCK' && (
                <>
                  <input type="text" value={lockReason} onChange={e => setLockReason(e.target.value)} placeholder="Alasan hukuman" className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 px-4 text-xs font-medium text-foreground focus:outline-none" />
                  <input type="number" value={lockDuration} onChange={e => setLockDuration(e.target.value)} placeholder="Durasi (menit)" className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 px-4 text-xs font-medium text-foreground focus:outline-none" />
                </>
              )}
              <button onClick={handleLockUnlock} disabled={isProcessing} className="w-full py-3 bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/20 font-bold rounded-2xl text-xs uppercase flex items-center justify-center gap-2 hover:bg-rose-200 dark:hover:bg-rose-500/20 transition shadow-sm">
                {lockAction === 'LOCK' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {lockAction === 'LOCK' ? 'Kunci Akun' : 'Buka Kunci'}
              </button>

              <hr className="border-border" />
              
              <button onClick={handleResetTotal} disabled={isProcessing} className="w-full py-3 bg-rose-600 text-white font-bold rounded-2xl text-xs uppercase flex items-center justify-center gap-2 shadow-sm hover:bg-rose-700 transition"><RotateCcw className="w-4 h-4" /> RESET TOTAL ANTRIAN HARI INI</button>
            </div>
          </div>

        </div>

      </motion.div>
    </div>
  )
}