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

interface Option { label: string; value: string }

const cleanKey = (nama: string) => nama.trim().toLowerCase().replace(/\s+/g, '_')
const emailToKey = (email: string) => email.trim().toLowerCase().replace(/\./g, ',')

function CustomSelect({ options, value, onChange, placeholder = 'Pilih opsi...', icon }: { options: Option[], value: string, onChange: (val: string) => void, placeholder?: string, icon?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false)
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
        <span className={`truncate ${!value ? 'text-muted-foreground' : 'text-foreground font-bold uppercase'}`}>{displayLabel}</span>
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
                onClick={() => { onChange(opt.value); setIsOpen(false) }}
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
  }>({ isOpen: false, type: 'alert', title: '', message: '', confirmText: 'OK', onConfirm: () => {} })

  const showModal = (type: 'confirm' | 'alert' | 'success' | 'error', title: string, message: string, onConfirm: () => void = () => {}, confirmText?: string) =>
    setModalConfig({ isOpen: true, type, title, message, confirmText, onConfirm })

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    const d = new Date()
    setHariIniIndo(`${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`)
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
      list.sort((a, b) => a.nama.localeCompare(b.nama))
      setMasterSales(list)
    }, (err) => {
      console.error('Gagal baca mastersales:', err)
      showModal('error', 'Gagal memuat', 'Daftar promotor tidak bisa dibaca. Cek rules Firebase untuk path mastersales.')
    })
    const unsubAntrian = onValue(ref(db, `toko/${TOKO_ID}/antrian`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setDaftarAntrian(list)
    })
    return () => { unsubMaster(); unsubAntrian() }
  }, [TOKO_ID])

  // Tambah promotor: whitelist + mastersales ditulis sekaligus (atomik, gagal semua atau berhasil semua)
  const handleTambahPromotor = async (e: React.FormEvent) => {
    e.preventDefault()
    const nama = formNama.trim().toUpperCase()
    const email = formEmail.trim().toLowerCase()
    if (!nama || !email) { showModal('error', 'Peringatan', 'Isi semua field!'); return }
    setIsProcessing(true)
    try {
      const newKey = push(ref(db, 'mastersales')).key
      await update(ref(db), {
        [`users/whitelist/${emailToKey(email)}`]: { nama, email, role: 'PROMOTOR', tokoId: TOKO_ID },
        [`mastersales/${newKey}`]: { record: { NAMA_PROMOTOR: nama, EMAIL: email } },
      })
      showModal('success', 'Berhasil', `Promotor ${nama} sudah bisa login.`)
      setFormNama('')
      setFormEmail('')
    } catch (err) {
      console.error(err)
      showModal('error', 'Gagal', 'Gagal menambah promotor. Cek rules Firebase (path users/whitelist dan mastersales).')
    } finally { setIsProcessing(false) }
  }

  // Hitung waktuStandby supaya promotor menempati nomor antrian yang dipilih
  const hitungWaktuStandby = (kategori: string, posisi: number) => {
    const standby = daftarAntrian
      .filter(a => a.status === 'Standby' && String(a.kategori).toUpperCase() === kategori)
      .sort((a, b) => (a.waktuStandby || 0) - (b.waktuStandby || 0))
    if (!posisi || posisi > standby.length) return Date.now()
    if (posisi <= 1) return (standby[0].waktuStandby || Date.now()) - 1000
    const before = standby[posisi - 2].waktuStandby || 0
    const after = standby[posisi - 1].waktuStandby || before + 2000
    return Math.floor((before + after) / 2)
  }

  const handleMasukanAntri = async () => {
    if (!selectedSales) { showModal('error', 'Peringatan', 'Pilih promotor terlebih dahulu!'); return }
    setIsProcessing(true)
    try {
      const clean = cleanKey(selectedSales)
      const snap = await get(ref(db, `toko/${TOKO_ID}/antrian/${clean}`))
      if (snap.exists()) throw new Error('Promotor sudah ada di antrian.')
      const posisi = parseInt(selectedPosisi) || 0
      await set(ref(db, `toko/${TOKO_ID}/antrian/${clean}`), {
        nama: selectedSales, status: 'Standby', waktuStandby: hitungWaktuStandby(selectedKategori, posisi),
        kategori: selectedKategori, subkategori: selectedKategori,
        posisiTerkunci: 0, timerMulai: 0, timerAksi: ''
      })
      showModal('success', 'Berhasil', 'Berhasil memasukkan promotor ke antrian.')
      setSelectedSales('')
      setSelectedPosisi('')
    } catch (err: any) {
      showModal('error', 'Gagal', err.message || 'Gagal memasukkan promotor.')
    } finally { setIsProcessing(false) }
  }

  const handleKeluarkanAntrian = async () => {
    if (!selectedSales) { showModal('error', 'Peringatan', 'Pilih promotor terlebih dahulu!'); return }
    setIsProcessing(true)
    try {
      await remove(ref(db, `toko/${TOKO_ID}/antrian/${cleanKey(selectedSales)}`))
      showModal('success', 'Berhasil', 'Berhasil mengeluarkan promotor dari antrian.')
      setSelectedSales('')
    } catch (err) {
      showModal('error', 'Gagal', 'Gagal mengeluarkan promotor.')
    } finally { setIsProcessing(false) }
  }

  // Nama dikirim sebagai argumen, bukan lewat state, supaya tidak kosong saat dipanggil
  const handleHapusPermanen = (nama: string) => {
    if (!nama) { showModal('error', 'Peringatan', 'Pilih promotor terlebih dahulu!'); return }
    showModal('confirm', 'Konfirmasi Hapus', `Hapus permanen ${nama}? Tindakan ini tidak dapat dibatalkan.`, async () => {
      setIsProcessing(true)
      try {
        const target = masterSales.find(s => s.nama === nama)
        const updates: Record<string, null> = {
          [`toko/${TOKO_ID}/antrian/${cleanKey(nama)}`]: null,
        }
        if (target) {
          updates[`mastersales/${target._key}`] = null
          if (target.email) updates[`users/whitelist/${emailToKey(target.email)}`] = null
        }
        await update(ref(db), updates)
        showModal('success', 'Berhasil', 'Promotor dihapus permanen.')
        setSelectedLockSales('')
        setSelectedSales('')
      } catch (err) {
        console.error(err)
        showModal('error', 'Gagal', 'Gagal menghapus.')
      } finally { setIsProcessing(false) }
    }, 'Ya, Hapus')
  }

  const handlePaksaBawaCustomer = async () => {
    if (!selectedSales) { showModal('error', 'Peringatan', 'Pilih promotor terlebih dahulu!'); return }
    setIsProcessing(true)
    try {
      const clean = cleanKey(selectedSales)
      const snap = await get(ref(db, `toko/${TOKO_ID}/antrian/${clean}`))
      if (!snap.exists()) throw new Error('Promotor belum ada di antrian. Masukkan ke antrian dulu.')
      const now = Date.now()
      await update(ref(db, `toko/${TOKO_ID}/antrian/${clean}`), { status: 'Melayani', waktuMulaiMelayani: now, posisiTerkunci: 0 })
      await push(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), {
        nama: selectedSales, aksi: 'BawaCustomer', waktu: now,
        tanggal: hariIniIndo, waktuMulai: now, keterangan: 'Dipaksa Admin'
      })
      showModal('success', 'Berhasil', 'Promotor dipaksa melayani customer.')
      setSelectedSales('')
    } catch (err: any) {
      showModal('error', 'Gagal', err.message || 'Gagal memproses.')
    } finally { setIsProcessing(false) }
  }

  const handleResetIstirahat = () => {
    showModal('confirm', 'Reset Istirahat', '⚠️ Jalankan reset istirahat gelombang ini? (Melayani/Ibadah/CS dan shift lain yang belum waktunya akan aman)', async () => {
      setIsProcessing(true)
      try {
        const currentHour = new Date().getHours()
        const updates: Record<string, any> = {}

        for (const item of daftarAntrian) {
          if (item.status !== 'Standby') continue
          const waktuMasuk = item.waktuStandby ? new Date(item.waktuStandby).getHours() : 0
          let shouldReset = false

          if (currentHour >= 12 && currentHour < 15) shouldReset = waktuMasuk < 12      // istirahat siang: shift pagi
          else if (currentHour >= 15) shouldReset = waktuMasuk >= 12                   // istirahat sore: shift siang
          else shouldReset = true                                                       // pagi hari

          if (shouldReset) {
            updates[`toko/${TOKO_ID}/antrian/${cleanKey(item.nama)}`] = null
            const logKey = push(ref(db, `toko/${TOKO_ID}/statistikAktivitas`)).key
            updates[`toko/${TOKO_ID}/statistikAktivitas/${logKey}`] = {
              nama: item.nama, aksi: 'KeluarAntrian', waktu: Date.now(), tanggal: hariIniIndo, hasil: 'Reset Istirahat'
            }
          }
        }

        if (Object.keys(updates).length > 0) await update(ref(db), updates)
        showModal('success', 'Berhasil', 'Reset istirahat gelombang ini berhasil dijalankan.')
      } catch (err) {
        console.error(err)
        showModal('error', 'Gagal', 'Gagal melakukan reset istirahat.')
      } finally { setIsProcessing(false) }
    }, 'Ya, Reset')
  }

  const handleLockUnlock = async () => {
    if (!selectedLockSales) { showModal('error', 'Peringatan', 'Pilih promotor terlebih dahulu!'); return }
    setIsProcessing(true)
    try {
      const clean = cleanKey(selectedLockSales)
      const lockRef = ref(db, `toko/${TOKO_ID}/lockPromotor/${clean}`)

      if (lockAction === 'UNLOCK') {
        const snap = await get(lockRef)
        if (!snap.exists() || !snap.val().locked) {
          showModal('error', 'Informasi', `${selectedLockSales} tidak dalam status terkunci.`)
          return
        }
        // Hapus data lock supaya layar kunci promotor langsung tertutup
        await remove(lockRef)
        showModal('success', 'Kunci Dibuka', `${selectedLockSales} dibuka kuncinya.`)
      } else {
        const durasi = parseInt(lockDuration)
        if (!durasi || durasi < 1) { showModal('error', 'Peringatan', 'Durasi harus lebih dari 0 menit.'); return }
        await update(lockRef, {
          nama: selectedLockSales, locked: true, alasan: lockReason.trim() || 'Pelanggaran disiplin toko',
          waktuMulaiLock: Date.now(), waktuSelesaiLock: Date.now() + durasi * 60000
        })
        await remove(ref(db, `toko/${TOKO_ID}/antrian/${clean}`))
        showModal('success', 'Akun Dikunci', `${selectedLockSales} dikunci selama ${durasi} menit.`)
      }
      setSelectedLockSales('')
      setLockReason('')
    } catch (err) {
      console.error(err)
      showModal('error', 'Gagal', 'Gagal memproses lock.')
    } finally { setIsProcessing(false) }
  }

  const handleResetTotal = () => {
    showModal('confirm', 'Peringatan Reset', '⚠️ Hapus semua antrian aktif hari ini?', async () => {
      setIsProcessing(true)
      try {
        await remove(ref(db, `toko/${TOKO_ID}/antrian`))
        showModal('success', 'Berhasil', 'Semua antrian berhasil direset.')
      } catch (err) {
        showModal('error', 'Gagal', 'Gagal reset antrian.')
      } finally { setIsProcessing(false) }
    }, 'Ya, Reset')
  }

  if (authLoading || !mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  }

  const opsiPromotor = masterSales.map(s => ({ label: s.nama, value: s.nama }))

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
          <Link href="/admin" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><LayoutDashboard className="w-4 h-4" /> Dashboard</Link>
          <Link href="/admin/aktivitas" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><History className="w-4 h-4" /> Aktivitas & Rekap</Link>
          <Link href="/admin/manajemen" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-xs"><ShieldAlert className="w-4 h-4" /> Kontrol Antrian</Link>
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
              <button type="submit" disabled={isProcessing} className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-2xl uppercase tracking-wider text-xs hover:opacity-95 transition shadow-sm disabled:opacity-50">
                {isProcessing ? 'Memproses...' : 'Simpan Promotor'}
              </button>
            </form>
          </div>

          {/* ATUR ANTRIAN */}
          <div className="bg-white dark:bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><UserMinus className="w-4 h-4 text-amber-500" /> Atur Antrian</h3>
            <div className="space-y-3">

              <CustomSelect options={opsiPromotor} value={selectedSales} onChange={setSelectedSales} placeholder="-- Pilih Promotor --" icon={<Users className="w-4 h-4" />} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CustomSelect
                  options={[{ label: 'Kategori HA', value: 'HA' }, { label: 'Kategori AV', value: 'AV' }]}
                  value={selectedKategori}
                  onChange={setSelectedKategori}
                  placeholder="Pilih Kategori"
                />
                <input type="number" value={selectedPosisi} onChange={e => setSelectedPosisi(e.target.value)} placeholder="Nomor antrian (kosong = paling akhir)" className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 px-4 text-xs font-medium text-foreground focus:outline-none" min="1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button type="button" onClick={handleMasukanAntri} disabled={isProcessing} className="py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-full text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50">
                  <UserPlus className="w-4 h-4" /> Masukkan ke Antrian
                </button>
                <button type="button" onClick={handleKeluarkanAntrian} disabled={isProcessing} className="py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-full text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50">
                  <UserMinus className="w-4 h-4" /> Keluarkan dari Antrian
                </button>
              </div>

              <button type="button" onClick={handlePaksaBawaCustomer} disabled={isProcessing || !selectedSales} className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50">
                <Play className="w-4 h-4" /> Paksa Bawa Customer
              </button>
            </div>
          </div>

          {/* TINDAKAN DARURAT */}
          <div className="bg-white dark:bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-500" /> Tindakan Darurat</h3>
            <div className="space-y-3">

              <CustomSelect options={opsiPromotor} value={selectedLockSales} onChange={setSelectedLockSales} placeholder="-- Pilih Promotor untuk Lock / Hapus --" icon={<Users className="w-4 h-4" />} />

              <CustomSelect
                options={[{ label: 'Lock Akun Promotor', value: 'LOCK' }, { label: 'Unlock Akun Promotor', value: 'UNLOCK' }]}
                value={lockAction}
                onChange={setLockAction}
                placeholder="Pilih Aksi"
                icon={<KeyRound className="w-4 h-4" />}
              />

              {lockAction === 'LOCK' && (
                <>
                  <div className="relative">
                    <div className="absolute left-4 top-3.5 text-muted-foreground pointer-events-none"><FileText className="w-4 h-4" /></div>
                    <input type="text" value={lockReason} onChange={e => setLockReason(e.target.value)} placeholder="Masukkan alasan (misal: Pulang tanpa keluar antrian)" className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-foreground focus:outline-none" />
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-3.5 text-muted-foreground pointer-events-none"><Clock className="w-4 h-4" /></div>
                    <input type="number" min="1" value={lockDuration} onChange={e => setLockDuration(e.target.value)} placeholder="Durasi (menit)" className="w-full bg-slate-100 dark:bg-secondary/50 border border-border rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-foreground focus:outline-none" />
                  </div>
                </>
              )}

              <button type="button" onClick={handleLockUnlock} disabled={isProcessing} className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-rose-600/20 active:scale-95 disabled:opacity-50">
                {lockAction === 'LOCK' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {lockAction === 'LOCK' ? 'Kunci Akun' : 'Buka Kunci'}
              </button>

              <button type="button" onClick={() => handleHapusPermanen(selectedLockSales)} disabled={isProcessing || !selectedLockSales} className="w-full py-3.5 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-rose-700/20 active:scale-95 disabled:opacity-50">
                <Trash2 className="w-4 h-4" /> Hapus Promotor Permanen
              </button>

              <hr className="border-border my-2" />

              <button type="button" onClick={handleResetIstirahat} disabled={isProcessing} className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50">
                <Coffee className="w-4 h-4" /> RESET ISTIRAHAT (STANDBY)
              </button>

              <button type="button" onClick={handleResetTotal} disabled={isProcessing} className="w-full py-3.5 bg-rose-900 hover:bg-rose-950 text-white font-black rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20 active:scale-95 transition disabled:opacity-50">
                <RotateCcw className="w-4 h-4" /> RESET TOTAL ANTRIAN HARI INI
              </button>
            </div>
          </div>

        </div>
      </motion.div>

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
