'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue, update, get, remove, push, set } from 'firebase/database'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Loader2, UserPlus, UserMinus, Play, Lock, Unlock, RotateCcw, 
  ShieldAlert, LayoutDashboard, History, Settings, LogOut, Sun, Moon, 
  Trash2, KeyRound, Clock, FileText, ChevronDown, Users, Coffee
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'
import { CustomModal } from '@/components/ui/CustomModal'

interface Option {
  label: string
  value: string
}

function CustomSelect({ options, value, onChange, placeholder = 'Pilih opsi...', icon }: { options: Option[], value: string, onChange: (val: string) => void, placeholder?: string, icon?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 pl-11 pr-10 text-xs font-medium text-foreground text-left focus:outline-none flex items-center justify-between shadow-sm transition-all hover:bg-slate-200/50 dark:hover:bg-secondary"
      >
        {icon && <span className="absolute left-4 text-muted-foreground">{icon}</span>}
        <span className={`truncate ${!value ? 'text-muted-foreground' : 'text-foreground font-bold uppercase'}`}>
          {displayLabel}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground text-center italic">Tidak ada pilihan</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-3 text-xs text-left font-medium uppercase transition-colors flex items-center justify-between hover:bg-primary/10 hover:text-primary ${
                  value === opt.value ? 'bg-primary/10 text-primary font-bold' : 'text-foreground'
                }`}
              >
                <span>{opt.label}</span>
                {value === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function ManajemenPage() {
  const { user, loading: authLoading, logout } = useAuth('ADMIN')
  const { isDark, toggleTheme, mounted } = useTheme()
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [masterSales, setMasterSales] = useState<any[]>([])
  const [daftarAntrian, setDaftarAntrian] = useState<any[]>([])
  const [hariIniIndo, setHariIniIndo] = useState('')
  
  const [formNama, setFormNama] = useState('')
  const [formEmail, setFormEmail] = useState('')
  
  const [selectedSales, setSelectedSales] = useState('')
  const [selectedKategori, setSelectedKategori] = useState('HA')
  const [selectedPosisi, setSelectedPosisi] = useState('')
  
  const [selectedLockSales, setSelectedLockSales] = useState('')
  const [lockAction, setLockAction] = useState('LOCK')
  const [lockReason, setLockReason] = useState('')
  const [lockDuration, setLockDuration] = useState('60')

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
    const d = new Date()
    setHariIniIndo(`${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`)
  }, [])

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
        tanggal: hariIniIndo,
        waktuMulai: Date.now(), keterangan: 'Dipaksa Admin'
      })
      setModalConfig({ isOpen: true, type: 'success', title: 'Berhasil', message: 'Promotor dipaksa melayani customer.', onConfirm: () => {} })
      setSelectedSales('')
    } catch (err) {
      setModalConfig({ isOpen: true, type: 'error', title: 'Gagal', message: 'Gagal memproses.', onConfirm: () => {} })
    } finally { setIsProcessing(false) }
  }

  // FUNGSI RESET ISTIRAHAT CERDAS (DENGAN PROTEKSI GANDA SHIFT PAGI & SHIFT SIANG)
  const handleResetIstirahat = () => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Reset Istirahat',
      message: '⚠️ Jalankan reset istirahat gelombang ini? (Melayani/Ibadah/CS dan shift lain yang belum waktunya akan aman)',
      confirmText: 'Ya, Reset',
      onConfirm: async () => {
        setIsProcessing(true)
        try {
          const now = new Date()
          const currentHour = now.getHours()

          for (const item of daftarAntrian) {
            if (item.status === 'Standby') {
              const waktuMasuk = item.waktuStandby ? new Date(item.waktuStandby).getHours() : 0
              let shouldReset = false

              // Jika admin klik di gelombang istirahat siang (12:00 - 15:00)
              if (currentHour >= 12 && currentHour < 15) {
                // Hanya reset Shift Pagi (yang masuk sebelum jam 12:00)
                if (waktuMasuk < 12) shouldReset = true
              } 
              // Jika admin klik di gelombang istirahat sore (15:00 ke atas)
              else if (currentHour >= 15) {
                // Hanya reset Shift Siang (yang masuk di atas jam 12:00)
                // Promotor pagi yang masih nyangkut standby tidak akan ikut tersapu
                if (waktuMasuk >= 12) shouldReset = true
              } 
              // Jika ditekan pagi hari
              else {
                shouldReset = true
              }

              if (shouldReset) {
                const cleanNama = item.nama.trim().toLowerCase().replace(/\s+/g, '_')
                await remove(ref(db, `toko/${TOKO_ID}/antrian/${cleanNama}`))
                await push(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), {
                  nama: item.nama,
                  aksi: 'KeluarAntrian',
                  waktu: Date.now(),
                  tanggal: hariIniIndo,
                  hasil: 'Reset Istirahat'
                })
              }
            }
          }
          setModalConfig({ isOpen: true, type: 'success', title: 'Berhasil', message: 'Reset istirahat gelombang ini berhasil dijalankan.', onConfirm: () => {} })
        } catch (err) {
          setModalConfig({ isOpen: true, type: 'error', title: 'Gagal', message: 'Gagal melakukan reset istirahat.', onConfirm: () => {} })
        } finally { setIsProcessing(false) }
      }
    })
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

        await update(lockRef, {
          locked: false, alasan: '', waktuSelesaiLock: 0, waktuMulaiLock: 0
        })
        setModalConfig({ isOpen: true, type: 'success', title: 'Kunci Dibuka', message: `${selectedLockSales} dibuka kuncinya.`, onConfirm: () => {} })
      } else {
        await update(lockRef, {
          nama: selectedLockSales, locked: true, alasan: lockReason || 'isi alasan lock',
          waktuMulaiLock: Date.now(), waktuSelesaiLock: Date.now() + (parseInt(lockDuration) * 60000)
        })
        await remove(ref(db, `toko/${TOKO_ID}/antrian/${clean}`))
        setModalConfig({ isOpen: true, type: 'success', title: 'Akun Dikunci', message: `${selectedLockSales} dikunci selama ${lockDuration} menit.`, onConfirm: () => {} })
      }
      setSelectedLockSales('')
      setLockReason('')
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
    <div className="min-h-[100dvh] bg-background text-foreground flex relative font-sans transition-colors duration-300 pb-20 md:pb-6">
      
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
          <Link href="/admin/manajemen" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-xs">
            <ShieldAlert className="w-4 h-4" /> Kontrol Antrian
          </Link>
          <Link href="/admin/pengaturan" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs">
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
            <h1 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-tight">AKSI CEPAT</h1>
            <p className="text-xs text-muted-foreground uppercase">Kontrol Penuh Admin</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2.5 rounded-full bg-card border border-border text-muted-foreground hover:text-primary transition-colors shadow-sm">
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button onClick={logout} className="md:hidden p-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md transition">
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

          {/* MANAJEMEN URUTAN ANTRIAN */}
          <div className="bg-white dark:bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><UserMinus className="w-4 h-4 text-amber-500" /> Atur Antrian</h3>
            <div className="space-y-3">
              
              <CustomSelect 
                options={masterSales.map(s => ({ label: s.nama, value: s.nama }))}
                value={selectedSales}
                onChange={setSelectedSales}
                placeholder="-- Pilih Promotor --"
                icon={<Users className="w-4 h-4" />}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CustomSelect 
                  options={[
                    { label: 'Kategori HA', value: 'HA' },
                    { label: 'Kategori AV', value: 'AV' }
                  ]}
                  value={selectedKategori}
                  onChange={setSelectedKategori}
                  placeholder="Pilih Kategori"
                />
                <input type="number" value={selectedPosisi} onChange={e => setSelectedPosisi(e.target.value)} placeholder="Masukkan nomor antrian" className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 px-4 text-xs font-medium text-foreground focus:outline-none" min="1" />
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

          {/* TINDAKAN DARURAT */}
          <div className="bg-white dark:bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-500" /> Tindakan Darurat</h3>
            <div className="space-y-3">
              
              <CustomSelect 
                options={masterSales.map(s => ({ label: s.nama, value: s.nama }))}
                value={selectedLockSales}
                onChange={setSelectedLockSales}
                placeholder="-- Pilih Promotor untuk Lock / Hapus --"
                icon={<Users className="w-4 h-4" />}
              />

              <CustomSelect 
                options={[
                  { label: 'Lock Akun Promotor', value: 'LOCK' },
                  { label: 'Unlock Akun Promotor', value: 'UNLOCK' }
                ]}
                value={lockAction}
                onChange={setLockAction}
                placeholder="Pilih Aksi"
                icon={<KeyRound className="w-4 h-4" />}
              />

              {lockAction === 'LOCK' && (
                <>
                  <div className="relative">
                    <div className="absolute left-4 top-3.5 text-muted-foreground pointer-events-none">
                      <FileText className="w-4 h-4" />
                    </div>
                    <input 
                      type="text" 
                      value={lockReason} 
                      onChange={e => setLockReason(e.target.value)} 
                      placeholder="Masukkan alasan (misal: Pulang tanpa keluar antrian)" 
                      className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-foreground focus:outline-none" 
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-3.5 text-muted-foreground pointer-events-none">
                      <Clock className="w-4 h-4" />
                    </div>
                    <input 
                      type="number" 
                      value={lockDuration} 
                      onChange={e => setLockDuration(e.target.value)} 
                      placeholder="Durasi (menit)" 
                      className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-foreground focus:outline-none" 
                    />
                  </div>
                </>
              )}

              <button type="button" onClick={handleLockUnlock} disabled={isProcessing} className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-rose-600/20 active:scale-95">
                {lockAction === 'LOCK' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {lockAction === 'LOCK' ? 'Kunci Akun' : 'Buka Kunci'}
              </button>

              <button type="button" onClick={() => { setSelectedSales(selectedLockSales); handleHapusPermanen(); }} disabled={isProcessing || !selectedLockSales} className="w-full py-3.5 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-rose-700/20 active:scale-95">
                <Trash2 className="w-4 h-4" /> Hapus Promotor Permanen
              </button>

              <hr className="border-border my-2" />

              {/* TOMBOL RESET ISTIRAHAT */}
              <button type="button" onClick={handleResetIstirahat} disabled={isProcessing} className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition">
                <Coffee className="w-4 h-4" /> RESET ISTIRAHAT (STANDBY)
              </button>
              
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