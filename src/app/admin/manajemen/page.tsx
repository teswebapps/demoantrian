'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue, update, get, remove, push, set } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Loader2, UserPlus, UserMinus, Play, Lock, Unlock, RotateCcw, 
  ShieldAlert, LayoutDashboard, History, Settings, LogOut, Sun, Moon, 
  Trash2, UserX, KeyRound, Clock, FileText 
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'
import { CustomModal } from '@/components/ui/CustomModal'

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

  // State untuk Modal Kustom Global
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean
    type: 'confirm' | 'alert' | 'success' | 'error'
    title: string
    message: string
    confirmText?: string
    onConfirm: () => void
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    confirmText: 'OK',
    onConfirm: () => {}
  })

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
    if (!formNama || !formEmail) {
      setModalConfig({ isOpen: true, type: 'error', title: 'Peringatan', message: 'Isi semua field!', onConfirm: () => {} })
      return
    }
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
      
      setModalConfig({
        isOpen: true,
        type: 'success',
        title: 'Berhasil',
        message: `Promotor ${formNama.toUpperCase()} sudah bisa login.`,
        onConfirm: () => {}
      })
      setFormNama('')
      setFormEmail('')
    } catch (err) {
      setModalConfig({ isOpen: true, type: 'error', title: 'Gagal', message: 'Gagal menambah promotor.', onConfirm: () => {} })
    } finally { setIsProcessing(false) }
  }

  const handleMasukanAntri = async () => {
    if (!selectedSales) {
      setModalConfig({ isOpen: true, type: 'error', title: 'Peringatan', message: 'Pilih promotor terlebih dahulu!', onConfirm: () => {} })
      return
    }
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
      setModalConfig({ isOpen: true, type: 'success', title: 'Berhasil', message: 'Berhasil memasukkan promotor ke antrian.', onConfirm: () => {} })
      setSelectedSales('')
    } catch (err: any) {
      setModalConfig({ isOpen: true, type: 'error', title: 'Gagal', message: err.message, onConfirm: () => {} })
    } finally { setIsProcessing(false) }
  }

  const handleKeluarkanAntrian = async () => {
    if (!selectedSales) {
      setModalConfig({ isOpen: true, type: 'error', title: 'Peringatan', message: 'Pilih promotor terlebih dahulu!', onConfirm: () => {} })
      return
    }
    setIsProcessing(true)
    try {
      const clean = selectedSales.trim().toLowerCase().replace(/\s+/g, '_')
      await remove(ref(db, `toko/${TOKO_ID}/antrian/${clean}`))
      setModalConfig({ isOpen: true, type: 'success', title: 'Berhasil', message: 'Berhasil mengeluarkan promotor dari antrian.', onConfirm: () => {} })
      setSelectedSales('')
    } catch (err) {
      setModalConfig({ isOpen: true, type: 'error', title: 'Gagal', message: 'Gagal mengeluarkan promotor.', onConfirm: () => {} })
    } finally { setIsProcessing(false) }
  }

  const handleHapusPermanen = () => {
    if (!selectedSales) {
      setModalConfig({ isOpen: true, type: 'error', title: 'Peringatan', message: 'Pilih promotor terlebih dahulu!', onConfirm: () => {} })
      return
    }
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Konfirmasi Hapus',
      message: `Hapus permanen ${selectedSales}? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
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
          setModalConfig({ isOpen: true, type: 'success', title: 'Berhasil', message: 'Promotor dihapus permanen.', onConfirm: () => {} })
          setSelectedSales('')
        } catch (err) {
          setModalConfig({ isOpen: true, type: 'error', title: 'Gagal', message: 'Gagal menghapus.', onConfirm: () => {} })
        } finally { setIsProcessing(false) }
      }
    })
  }

  const handlePaksaBawaCustomer = async () => {
    if (!selectedSales) {
      setModalConfig({ isOpen: true, type: 'error', title: 'Peringatan', message: 'Pilih promotor terlebih dahulu!', onConfirm: () => {} })
      return
    }
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
      setModalConfig({ isOpen: true, type: 'success', title: 'Berhasil', message: 'Promotor dipaksa melayani customer.', onConfirm: () => {} })
      setSelectedSales('')
    } catch (err) {
      setModalConfig({ isOpen: true, type: 'error', title: 'Gagal', message: 'Gagal memproses.', onConfirm: () => {} })
    } finally { setIsProcessing(false) }
  }

  const handleLockUnlock = async () => {
    if (!selectedLockSales) {
      setModalConfig({ isOpen: true, type: 'error', title: 'Peringatan', message: 'Pilih promotor terlebih dahulu!', onConfirm: () => {} })
      return
    }
    setIsProcessing(true)
    try {
      const clean = selectedLockSales.trim().toLowerCase().replace(/\s+/g, '_')
      const lockRef = ref(db, `toko/${TOKO_ID}/lockPromotor/${clean}`)
      
      if (lockAction === 'UNLOCK') {
        // Cek dulu apakah promotor benar-benar sedang dikunci
        const snap = await get(lockRef)
        if (!snap.exists() || !snap.val().locked) {
          setModalConfig({ 
            isOpen: true, 
            type: 'error', 
            title: 'Informasi', 
            message: `${selectedLockSales} tidak dalam status terkunci.`, 
            onConfirm: () => {} 
          })
          setIsProcessing(false)
          return
        }

        // Jika benar terkunci, proses buka kunci
        await update(lockRef, {
          locked: false, alasan: '', waktuSelesaiLock: 0, waktuMulaiLock: 0
        })
        setModalConfig({ isOpen: true, type: 'success', title: 'Kunci Dibuka', message: `${selectedLockSales} dibuka kuncinya.`, onConfirm: () => {} })
      } else {
        // Proses Mengunci Akun
        await update(lockRef, {
          nama: selectedLockSales, locked: true, alasan: lockReason,
          waktuMulaiLock: Date.now(), waktuSelesaiLock: Date.now() + (parseInt(lockDuration) * 60000)
        })
        await remove(ref(db, `toko/${TOKO_ID}/antrian/${clean}`))
        setModalConfig({ isOpen: true, type: 'success', title: 'Akun Dikunci', message: `${selectedLockSales} dikunci selama ${lockDuration} menit.`, onConfirm: () => {} })
      }
      setSelectedLockSales('')
    } catch (err) {
      setModalConfig({ isOpen: true, type: 'error', title: 'Gagal', message: 'Gagal memproses lock.', onConfirm: () => {} })
    } finally { setIsProcessing(false) }
  }

  const handleResetTotal = () => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Peringatan Reset',
      message: '⚠️ Hapus semua antrian aktif hari ini?',
      confirmText: 'Ya, Reset',
      onConfirm: async () => {
        setIsProcessing(true)
        try {
          await remove(ref(db, `toko/${TOKO_ID}/antrian`))
          setModalConfig({ isOpen: true, type: 'success', title: 'Berhasil', message: 'Semua antrian berhasil direset.', onConfirm: () => {} })
        } catch (err) {
          setModalConfig({ isOpen: true, type: 'error', title: 'Gagal', message: 'Gagal reset antrian.', onConfirm: () => {} })
        } finally { setIsProcessing(false) }
      }
    })
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
          <Link href="/admin" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          <Link href="/admin/aktivitas" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs">
            <History className="w-4 h-4" /> Aktivitas & Rekap
          </Link>
          <Link href="/admin/manajemen" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs">
            <ShieldAlert className="w-4 h-4" /> Darurat
          </Link>
          <Link href="/admin/pengaturan" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-xs">
            <Settings className="w-4 h-4" /> Pengaturan
          </Link>
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
          <div className="bg-white dark:bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Tambah Promotor Baru</h3>
            <form onSubmit={handleTambahPromotor} className="space-y-3">
              <input type="text" value={formNama} onChange={e => setFormNama(e.target.value)} placeholder="NAMA LENGKAP" className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 px-4 text-xs font-bold text-foreground focus:outline-none uppercase" required />
              <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="EMAIL GOOGLE" className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 px-4 text-xs font-medium text-foreground focus:outline-none" required />
              <button type="submit" disabled={isProcessing} className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-2xl uppercase tracking-wider text-xs hover:opacity-95 transition shadow-sm">Simpan Promotor</button>
            </form>
          </div>

          {/* MANAJEMEN URUTAN ANTRIAN (Hanya tombol Masuk, Keluar, Paksa) */}
          <div className="bg-white dark:bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button type="button" onClick={handleMasukanAntri} disabled={isProcessing} className="py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-full text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20 active:scale-95">
                  <UserPlus className="w-4 h-4" /> Masukkan ke Antrian
                </button>
                <button type="button" onClick={handleKeluarkanAntrian} disabled={isProcessing} className="py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-full text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95">
                  <UserMinus className="w-4 h-4" /> Keluarkan dari Antrian
                </button>
              </div>

              <button type="button" onClick={handlePaksaBawaCustomer} disabled={isProcessing || !selectedSales} className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-500/20 active:scale-95">
                <Play className="w-4 h-4" /> Paksa Bawa Customer
              </button>
            </div>
          </div>

          {/* TINDAKAN DARURAT (Termasuk Hapus Permanen dan ikon modern tanpa emoji jadul) */}
          <div className="bg-white dark:bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-500" /> Tindakan Darurat</h3>
            <div className="space-y-3">
              <select value={selectedLockSales} onChange={e => setSelectedLockSales(e.target.value)} className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 px-4 text-xs font-medium text-foreground focus:outline-none">
                <option value="">-- Pilih Promotor untuk Lock / Hapus --</option>
                {masterSales.map(s => <option key={s._key} value={s.nama}>{s.nama}</option>)}
              </select>

              <div className="relative">
                <div className="absolute left-4 top-3.5 text-muted-foreground pointer-events-none">
                  <KeyRound className="w-4 h-4" />
                </div>
                <select value={lockAction} onChange={e => setLockAction(e.target.value)} className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-foreground focus:outline-none appearance-none">
                  <option value="LOCK">Kunci Akun Promotor</option>
                  <option value="UNLOCK">Buka Kunci Akun</option>
                </select>
              </div>

              {lockAction === 'LOCK' && (
                <>
                  <div className="relative">
                    <div className="absolute left-4 top-3.5 text-muted-foreground pointer-events-none">
                      <FileText className="w-4 h-4" />
                    </div>
                    <input type="text" value={lockReason} onChange={e => setLockReason(e.target.value)} placeholder="Alasan hukuman" className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-foreground focus:outline-none" />
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-3.5 text-muted-foreground pointer-events-none">
                      <Clock className="w-4 h-4" />
                    </div>
                    <input type="number" value={lockDuration} onChange={e => setLockDuration(e.target.value)} placeholder="Durasi (menit)" className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-foreground focus:outline-none" />
                  </div>
                </>
              )}

              <button type="button" onClick={handleLockUnlock} disabled={isProcessing} className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-rose-600/20 active:scale-95">
                {lockAction === 'LOCK' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {lockAction === 'LOCK' ? 'Kunci Akun' : 'Buka Kunci'}
              </button>

              {/* Tombol Hapus Promotor Permanen dipindah ke sini */}
              <button type="button" onClick={() => { setSelectedSales(selectedLockSales); handleHapusPermanen(); }} disabled={isProcessing || !selectedLockSales} className="w-full py-3.5 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-rose-700/20 active:scale-95">
                <Trash2 className="w-4 h-4" /> Hapus Promotor Permanen
              </button>

              <hr className="border-border my-2" />
              
              <button type="button" onClick={handleResetTotal} disabled={isProcessing} className="w-full py-3.5 bg-rose-900 hover:bg-rose-950 text-white font-black rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20 active:scale-95 transition">
                <RotateCcw className="w-4 h-4" /> RESET TOTAL ANTRIAN HARI INI
              </button>
            </div>
          </div>

        </div>

      </motion.div>

      {/* Global Custom Modal */}
      <CustomModal 
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}