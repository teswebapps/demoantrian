'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue, update, get, remove, push, set } from 'firebase/database'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2, UserPlus, UserMinus, Play, Lock, Unlock,
  ShieldAlert, LayoutDashboard, History, Settings, LogOut, Sun, Moon,
  Trash2, KeyRound, Clock, FileText, ChevronDown, Users, Coffee, RefreshCcw
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'
import { CustomModal } from '@/components/ui/CustomModal'

interface Option { label: string; value: string }

const cleanKey = (nama: string) => nama.trim().toLowerCase().replace(/\s+/g, '_')
const emailToKey = (email: string) => email.trim().toLowerCase().replace(/\./g, ',')

export async function cekLockPromotor(db: any, tokoId: string, nama: string) {
  const key = cleanKey(nama)
  const lockRef = ref(db, `toko/${tokoId}/lockPromotor/${key}`)
  const snap = await get(lockRef)
  if (!snap.exists()) return { terkunci: false, sisaMs: 0, data: null }
  const lock = snap.val()
  if (!lock?.locked) return { terkunci: false, sisaMs: 0, data: lock }

  if (!lock.lockStarted) return { terkunci: false, sisaMs: 0, data: lock, belumMulai: true }

  const sisa = (lock.waktuSelesaiLock || 0) - Date.now()
  if (sisa > 0) return { terkunci: true, sisaMs: sisa, data: lock }

  await remove(lockRef)
  return { terkunci: false, sisaMs: 0, data: null }
}

export async function mulaiTimerLockJikaBelum(db: any, tokoId: string, nama: string) {
  const key = cleanKey(nama)
  const lockRef = ref(db, `toko/${tokoId}/lockPromotor/${key}`)
  const snap = await get(lockRef)
  if (!snap.exists()) return { baruMulai: false, sisaMs: 0 }
  const lock = snap.val()
  if (!lock?.locked) return { baruMulai: false, sisaMs: 0 }

  if (lock.lockStarted) {
    const sisa = (lock.waktuSelesaiLock || 0) - Date.now()
    if (sisa > 0) return { baruMulai: false, sisaMs: sisa, terkunci: true }
    await remove(lockRef)
    return { baruMulai: false, sisaMs: 0 }
  }

  const mulai = Date.now()
  const selesai = mulai + (lock.durasiMenit || 60) * 60000
  await update(lockRef, {
    lockStarted: true,
    waktuMulaiLock: mulai,
    waktuSelesaiLock: selesai,
  })
  return { baruMulai: true, sisaMs: selesai - mulai, terkunci: true }
}

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
  const [todayKey, setTodayKey] = useState('')

  const [formNama, setFormNama] = useState('')
  const [formEmail, setFormEmail] = useState('')

  const [selectedSales, setSelectedSales] = useState('')
  const [selectedKategori, setSelectedKategori] = useState('HA')
  const [selectedPosisi, setSelectedPosisi] = useState('')

  const [selectedLockSales, setSelectedLockSales] = useState('')
  const [lockAction, setLockAction] = useState('LOCK')
  const [lockReason, setLockReason] = useState('')
  const [lockDuration, setLockDuration] = useState('60')

  const [checkinList, setCheckinList] = useState<any[]>([])
  const [statistikList, setStatistikList] = useState<any[]>([])

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
    const pad = (n: number) => String(n).padStart(2, '0')
    setHariIniIndo(`${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`)
    setTodayKey(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
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
    })

    const unsubAntrian = onValue(ref(db, `toko/${TOKO_ID}/antrian`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setDaftarAntrian(list)
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

    return () => { unsubMaster(); unsubAntrian(); unsubStat(); unsubCheckin() }
  }, [TOKO_ID])

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
      showModal('error', 'Gagal', 'Gagal menambah promotor. Cek rules Firebase.')
    } finally { setIsProcessing(false) }
  }

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

  const handleHapusPermanen = (namaTarget: string) => {
    if (!namaTarget) { showModal('error', 'Peringatan', 'Pilih promotor di bagian Tindakan Darurat terlebih dahulu!'); return }
    showModal('confirm', 'Konfirmasi Hapus', `Hapus permanen ${namaTarget}? Tindakan ini tidak dapat dibatalkan.`, async () => {
      setIsProcessing(true)
      try {
        const target = masterSales.find(s => s.nama === namaTarget)
        const updates: Record<string, null> = {
          [`toko/${TOKO_ID}/antrian/${cleanKey(namaTarget)}`]: null,
          [`toko/${TOKO_ID}/lockPromotor/${cleanKey(namaTarget)}`]: null,
        }
        if (target) {
          updates[`mastersales/${target._key}`] = null
          if (target.email) updates[`users/whitelist/${emailToKey(target.email)}`] = null
        }
        await update(ref(db), updates)
        showModal('success', 'Berhasil', 'Promotor dihapus permanen.')
        setSelectedLockSales('')
      } catch (err) {
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
        tanggal: hariIniIndo, tanggalKey: todayKey, waktuMulai: now, keterangan: 'Dipaksa Admin'
      })
      showModal('success', 'Berhasil', 'Promotor dipaksa melayani customer.')
      setSelectedSales('')
    } catch (err: any) {
      showModal('error', 'Gagal', err.message || 'Gagal memproses.')
    } finally { setIsProcessing(false) }
  }

  const handleResetIstirahat = () => {
    showModal('confirm', 'Reset Istirahat', '⚠️ Jalankan reset istirahat gelombang ini?', async () => {
      setIsProcessing(true)
      try {
        const currentHour = new Date().getHours()
        const updates: Record<string, any> = {}

        for (const item of daftarAntrian) {
          if (item.status !== 'Standby') continue
          const waktuMasuk = item.waktuStandby ? new Date(item.waktuStandby).getHours() : 0
          let shouldReset = false

          if (currentHour >= 12 && currentHour < 15) shouldReset = waktuMasuk < 12
          else if (currentHour >= 15) shouldReset = waktuMasuk >= 12
          else shouldReset = true

          if (shouldReset) {
            updates[`toko/${TOKO_ID}/antrian/${cleanKey(item.nama)}`] = null
            const logKey = push(ref(db, `toko/${TOKO_ID}/statistikAktivitas`)).key
            updates[`toko/${TOKO_ID}/statistikAktivitas/${logKey}`] = {
              nama: item.nama, aksi: 'KeluarAntrian', waktu: Date.now(), tanggal: hariIniIndo, tanggalKey: todayKey, hasil: 'Reset Istirahat'
            }
          }
        }

        if (Object.keys(updates).length > 0) await update(ref(db), updates)
        showModal('success', 'Berhasil', 'Reset istirahat gelombang ini berhasil dijalankan.')
      } catch (err) {
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
        await remove(lockRef)
        showModal('success', 'Kunci Dibuka', `${selectedLockSales} dibuka kuncinya.`)
      } else {
        const durasi = parseInt(lockDuration)
        if (!durasi || durasi < 1) { showModal('error', 'Peringatan', 'Durasi harus lebih dari 0 menit.'); return }
        await update(lockRef, {
          nama: selectedLockSales,
          locked: true,
          alasan: lockReason.trim() || 'Pelanggaran disiplin toko',
          durasiMenit: durasi,
          lockStarted: false,
          waktuMulaiLock: null,
          waktuSelesaiLock: null,
          createdAt: Date.now(),
        })
        await remove(ref(db, `toko/${TOKO_ID}/antrian/${clean}`))
        showModal(
          'success',
          'Akun Dikunci',
          `${selectedLockSales} dikunci. Timer hukuman ${durasi} menit baru akan berjalan saat promotor melakukan konfirmasi kehadiran.`
        )
      }
      setSelectedLockSales('')
      setLockReason('')
    } catch (err) {
      showModal('error', 'Gagal', 'Gagal memproses lock.')
    } finally { setIsProcessing(false) }
  }

 const handleResetHariIni = () => {
    showModal('confirm', 'Reset Hari Ini', '⚠️ Bersihkan antrian dan check-in harian? Rekap bulanan promotor tetap aman.', async () => {
      setIsProcessing(true)
      try {
        // HANYA bersihkan antrian aktif & check-in harian
        await remove(ref(db, `toko/${TOKO_ID}/antrian`))
        await remove(ref(db, `toko/${TOKO_ID}/checkinHarian`))
        
        // Catat waktu reset untuk menyembunyikan rincian harian promotor
        await set(ref(db, `toko/${TOKO_ID}/lastResetTimestamp`), Date.now())

        showModal('success', 'Berhasil', 'Reset harian berhasil! Antrian dibersihkan, rekap bulanan tetap utuh.')
      } catch (err) {
        showModal('error', 'Gagal', 'Gagal melakukan reset hari ini.')
      } finally {
        setIsProcessing(false)
      }
    }, 'Ya, Reset')
  }
  }
  if (authLoading || !mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  }

  const opsiPromotor = masterSales.map(s => ({ label: s.nama, value: s.nama }))

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex relative font-sans transition-colors duration-300 pb-20 md:pb-6">
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 p-4 md:p-6 overflow-y-auto max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-tight">AKSI CEPAT</h1>
            <p className="text-xs text-muted-foreground uppercase">Kontrol Penuh Admin</p>
          </div>
          <button onClick={toggleTheme} className="p-2.5 rounded-full bg-card border border-border text-muted-foreground hover:text-primary transition-colors shadow-sm">
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="space-y-4">
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

          <div className="bg-white dark:bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><UserMinus className="w-4 h-4 text-amber-500" /> Atur Antrian</h3>
            <div className="space-y-3">
              <CustomSelect options={opsiPromotor} value={selectedSales} onChange={setSelectedSales} placeholder="-- Pilih Promotor --" icon={<Users className="w-4 h-4" />} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CustomSelect options={[{ label: 'Kategori HA', value: 'HA' }, { label: 'Kategori AV', value: 'AV' }]} value={selectedKategori} onChange={setSelectedKategori} placeholder="Pilih Kategori" />
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

          <div className="bg-white dark:bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-500" /> Tindakan Darurat</h3>
            <div className="space-y-3">
              <CustomSelect options={opsiPromotor} value={selectedLockSales} onChange={setSelectedLockSales} placeholder="-- Pilih Promotor untuk Lock / Hapus --" icon={<Users className="w-4 h-4" />} />
              <CustomSelect options={[{ label: 'Lock Akun Promotor', value: 'LOCK' }, { label: 'Unlock Akun Promotor', value: 'UNLOCK' }]} value={lockAction} onChange={setLockAction} placeholder="Pilih Aksi" icon={<KeyRound className="w-4 h-4" />} />

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
                  <p className="text-[10px] text-muted-foreground italic px-1">ℹ️ Timer hukuman baru mulai saat promotor melakukan konfirmasi kehadiran.</p>
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

              <button type="button" onClick={handleResetHariIni} disabled={isProcessing} className="w-full py-3.5 bg-rose-900 hover:bg-rose-950 text-white font-black rounded-full text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20 active:scale-95 transition disabled:opacity-50">
                <RefreshCcw className="w-4 h-4" /> RESET HARI INI
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

2. File Promotor: src/app/promotor/page.tsx
TypeScript

'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, get, set, remove, update, push, onValue } from 'firebase/database'
import { auth, db } from '@/lib/firebase'
import { toast } from 'sonner'
import { useTheme } from '@/hooks/useTheme'
import dynamic from 'next/dynamic'
import { Loader2, ShieldCheck, Lock, Play, MapPin, Package, ArrowRight, LogOut, ChevronDown, ChevronUp, Users, CalendarDays, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { AppHeader } from '@/components/queue/app-header'
import { PromoterCard } from '@/components/queue/promoter-card'
import { TurnCard } from '@/components/queue/turn-card'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false })

const MosqueIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2c-1.5 2-4 3-4 6 0 1.5.5 2.5 1 3H5v10h14V11h-4c.5-.5 1-1.5 1-3 0-3-2.5-4-4-6z" />
    <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
    <path d="M3 21h18" />
  </svg>
)

const pad = (n: number) => String(n).padStart(2, '0')
const getTanggalIndo = (d?: Date) => {
  const now = d ? new Date(d) : new Date()
  return `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`
}
const getTanggalKey = (d?: Date) => {
  const now = d ? new Date(d) : new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
const cleanNama = (nama: string) => nama.trim().toLowerCase().replace(/\s+/g, '_')

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const hitungJarak = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const pesanErrorGPS = (error: GeolocationPositionError) => {
  if (error.code === 1) return 'Izin lokasi ditolak. Buka pengaturan situs di Chrome dan izinkan lokasi.'
  if (error.code === 2) return 'Lokasi tidak tersedia. Aktifkan GPS HP.'
  if (error.code === 3) return 'GPS terlalu lama merespons. Coba lagi.'
  return `GPS gagal: ${error.message}`
}

function KategoriPicker({ value, onChange }: { value: 'HA' | 'AV'; onChange: (v: 'HA' | 'AV') => void }) {
  const items: { id: 'HA' | 'AV'; label: string }[] = [
    { id: 'HA', label: 'Home Appliance' },
    { id: 'AV', label: 'Audio Video' },
  ]
  return (
    <div className="mb-4 text-left">
      <label className="text-xs font-bold text-muted-foreground mb-2 block uppercase">Pilih Kategori</label>
      <div className="flex bg-secondary rounded-xl p-1.5 gap-1.5">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={`flex-1 py-2 px-1 rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 ${
              value === it.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="text-sm font-bold">{it.id}</span>
            <span className="text-[10px] font-medium opacity-80">{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function LogoutModal({ show, onCancel, onConfirm }: { show: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card text-foreground border border-border w-full max-w-sm p-6 rounded-3xl shadow-2xl text-center space-y-5"
          >
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <LogOut className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">KELUAR APLIKASI</h3>
              <p className="text-xs text-muted-foreground">Apakah Anda yakin ingin keluar dari sesi promotor?</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={onCancel} className="flex-1 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-2xl text-xs font-bold uppercase tracking-wider transition">
                Batal
              </button>
              <button onClick={onConfirm} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md transition">
                Ya, Keluar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default function PromotorPage() {
  const { isDark, toggleTheme, mounted } = useTheme()
  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [antrian, setAntrian] = useState<any[]>([])
  const [setting, setSetting] = useState<any>(null)
  const [lockData, setLockData] = useState<any>(null)
  const [sisaWaktu, setSisaWaktu] = useState('')
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [jarak, setJarak] = useState<number | null>(null)
  const [statusGPS, setStatusGPS] = useState('Menunggu GPS...')
  const [showClosing, setShowClosing] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const [sudahCheckinHariIni, setSudahCheckinHariIni] = useState(false)
  const [jamCheckin, setJamCheckin] = useState<number | null>(null)
  const [isLoadingCheckin, setIsLoadingCheckin] = useState(true)
  const [todayKey, setTodayKey] = useState('')
  const [kategoriPilih, setKategoriPilih] = useState<'HA' | 'AV'>('HA')

  const [statistikList, setStatistikList] = useState<any[]>([])
  const [lastResetTimestamp, setLastResetTimestamp] = useState<number>(0)
  const [hariIniIndo, setHariIniIndo] = useState('')

  const [isAktivitasOpen, setIsAktivitasOpen] = useState(true)

  const [openCollapse, setOpenCollapse] = useState<{ [key: string]: boolean }>({
    checkin: false,
    bawa: false,
    ibadah: false,
    keluar: false,
    autokick: false,
    rekap: false,
    bulanan: false,
  })

  const toggleCollapse = (menu: string) => {
    setOpenCollapse((prev) => ({ ...prev, [menu]: !prev[menu] }))
  }

  const TOKO_ID = userData?.tokoId || 'ufo-kebonsari'

  const latTokoFinal = Number(setting?.latToko || setting?.lat || 0)
  const lngTokoFinal = Number(setting?.lngToko || setting?.lng || 0)
  const radiusFinal = Number(setting?.radiusToko || setting?.radiusMaks || 50) || 50

  useEffect(() => {
    setHariIniIndo(getTanggalIndo())
    setTodayKey(getTanggalKey())
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.email) { setUserData(null); setIsLoading(false); return }
      const emailKey = user.email.replace(/\./g, ',')
      const snap = await get(ref(db, 'users/whitelist/' + emailKey))
      if (snap.exists()) {
        const data = snap.val()
        if (data.role === 'ADMIN') {
          await signOut(auth)
          toast.error('Akun Admin tidak bisa login di sini.')
          setUserData(null)
        } else {
          setUserData({ nama: data.nama, email: user.email, tokoId: data.tokoId || 'ufo-kebonsari' })
        }
      } else {
        await signOut(auth)
        setUserData(null)
      }
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    setShowLogoutConfirm(false)
    await signOut(auth)
    setUserData(null)
  }

  useEffect(() => {
    if (!userData || !todayKey) return
    const clean = cleanNama(userData.nama)
    const unsub = onValue(ref(db, `toko/${TOKO_ID}/checkinHarian/${clean}/${todayKey}`), (snap) => {
      if (snap.exists()) {
        const val = snap.val()
        const waktuCheckin = Number(val.waktu || 0)
        if (lastResetTimestamp > 0 && waktuCheckin < lastResetTimestamp) {
          setSudahCheckinHariIni(false)
          setJamCheckin(null)
        } else {
          setSudahCheckinHariIni(true)
          setJamCheckin(val.waktu)
        }
      } else {
        setSudahCheckinHariIni(false)
        setJamCheckin(null)
      }
      setIsLoadingCheckin(false)
    })
    return () => unsub()
  }, [userData, todayKey, TOKO_ID, lastResetTimestamp])

  useEffect(() => {
    if (!TOKO_ID) return
    const unsubAntrian = onValue(ref(db, `toko/${TOKO_ID}/antrian`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setAntrian(list.sort((a, b) => (a.waktuStandby || 0) - (b.waktuStandby || 0)))
    })
    const unsubSetting = onValue(ref(db, `toko/${TOKO_ID}/setting`), (snap) => {
      if (snap.exists()) setSetting(snap.val())
    })
    const unsubLock = onValue(ref(db, `toko/${TOKO_ID}/lockPromotor`), (snap) => {
      const data = snap.val()
      if (data && userData) {
        const lockSaya = data[cleanNama(userData.nama)]
        if (lockSaya && lockSaya.locked) {
          const now = Date.now()
          if (!lockSaya.lockStarted) {
            setLockData((prev: any) => (prev && prev.lockStarted) ? prev : null)
            return
          }
          const mulai = Number(lockSaya.waktuMulaiLock) || 0
          const expired = Number(lockSaya.waktuSelesaiLock) || 0
          if ((mulai === 0 || now >= mulai) && (expired === 0 || now < expired)) {
            setLockData(lockSaya)
          } else setLockData(null)
        } else setLockData(null)
      } else {
        setLockData(null)
      }
    })
    const unsubAktivitas = onValue(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setStatistikList(list)
    })
    const unsubReset = onValue(ref(db, `toko/${TOKO_ID}/lastResetTimestamp`), (snap) => {
      if (snap.exists()) setLastResetTimestamp(snap.val())
      else setLastResetTimestamp(0)
    })

    return () => { unsubAntrian(); unsubSetting(); unsubLock(); unsubAktivitas(); unsubReset() }
  }, [TOKO_ID, userData])

  useEffect(() => {
    if (!lockData || !userData) return
    const expiredAwal = Number(lockData.waktuSelesaiLock) || 0
    if (expiredAwal === 0) {
      setSisaWaktu('∞')
    } else {
      const sisaAwal = Math.max(0, expiredAwal - Date.now())
      const mAwal = Math.floor(sisaAwal / 60000)
      const sAwal = Math.floor((sisaAwal % 60000) / 1000)
      setSisaWaktu(`${mAwal}:${sAwal.toString().padStart(2, '0')}`)
    }

    const interval = setInterval(() => {
      const expired = Number(lockData.waktuSelesaiLock) || 0
      if (expired === 0) { setSisaWaktu('∞'); return }
      const sisa = expired - Date.now()
      if (sisa <= 0) {
        setSisaWaktu('00:00')
        setLockData(null)
      } else {
        const m = Math.floor(sisa / 60000); const s = Math.floor((sisa % 60000) / 1000)
        setSisaWaktu(`${m}:${s.toString().padStart(2, '0')}`)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockData, userData, TOKO_ID])

  useEffect(() => {
    if (!userData) return
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setStatusGPS('Situs harus dibuka lewat HTTPS agar GPS bisa jalan.')
      return
    }
    if (!navigator.geolocation) {
      setStatusGPS('Browser tidak mendukung GPS.')
      return
    }
    let permStatus: PermissionStatus | null = null
    navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then((p) => {
      permStatus = p
      if (p.state === 'denied') setStatusGPS('Izin lokasi diblokir. Buka pengaturan situs di Chrome dan izinkan lokasi.')
    }).catch(() => {})
    return () => { if (permStatus) permStatus.onchange = null }
  }, [userData])

  useEffect(() => {
    if (!userData || typeof window === 'undefined' || !window.isSecureContext || !navigator.geolocation) return
    setStatusGPS('Meminta lokasi dari perangkat...')
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatusGPS('GPS aktif')
      },
      (err) => {
        setStatusGPS(pesanErrorGPS(err))
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [userData])

  useEffect(() => {
    if (!userLoc) { setJarak(null); return }
    if (!latTokoFinal || !lngTokoFinal) {
      setJarak(null)
      setStatusGPS('Lokasi HP ditemukan, tetapi koordinat toko belum valid')
      return
    }
    setJarak(hitungJarak(userLoc.lat, userLoc.lng, latTokoFinal, lngTokoFinal))
  }, [userLoc, latTokoFinal, lngTokoFinal])

  const mintaIzinGPS = () => {
    if (!window.isSecureContext) { setStatusGPS('Situs harus dibuka lewat HTTPS agar GPS bisa jalan.'); return }
    if (!navigator.geolocation) { setStatusGPS('Browser tidak mendukung GPS.'); return }
    setStatusGPS('Sedang meminta lokasi...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatusGPS('GPS aktif')
      },
      (err) => {
        setStatusGPS(pesanErrorGPS(err))
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    )
  }

  const dataSaya = antrian.find(a => a.nama.toLowerCase() === userData?.nama.toLowerCase())
  const statusSaya = dataSaya ? dataSaya.status : 'Offline'
  const listHA = antrian.filter(a => a.kategori === 'HA')
  const listAV = antrian.filter(a => a.kategori === 'AV')

  const posisiStandby = () => {
    const kat = String(dataSaya?.kategori || 'HA').toUpperCase()
    const listStandby = antrian
      .filter(i => i.status === 'Standby' && String(i.kategori).toUpperCase() === kat)
      .sort((a, b) => (a.waktuStandby || 0) - (b.waktuStandby || 0))
    return listStandby.findIndex(i => i.nama.toLowerCase() === userData.nama.toLowerCase()) + 1
  }

  const handleAksi = async (aksi: string, hasil: string = '') => {
    if (!userData) return
    setIsProcessing(true)
    const clean = cleanNama(userData.nama)
    const tglIndo = getTanggalIndo()
    const pathAntrian = `toko/${TOKO_ID}/antrian/${clean}`
    const pathStatistik = `toko/${TOKO_ID}/statistikAktivitas`

    try {
      if (aksi === 'CheckIn') {
        if (setting?.statusAntrian === 'TUTUP') {
          toast.error('❌ Maaf, antrian saat ini sedang DITUTUP oleh Admin.')
          return
        }

        const lockRef = ref(db, `toko/${TOKO_ID}/lockPromotor/${clean}`)
        const lockSnap = await get(lockRef)
        if (lockSnap.exists()) {
          const l = lockSnap.val()
          if (l.locked) {
            if (!l.lockStarted) {
              const mulai = Date.now()
              const selesai = mulai + (Number(l.durasiMenit) || 60) * 60000
              await update(lockRef, {
                lockStarted: true,
                waktuMulaiLock: mulai,
                waktuSelesaiLock: selesai,
              })
              const lockBaru = {
                ...l,
                lockStarted: true,
                waktuMulaiLock: mulai,
                waktuSelesaiLock: selesai,
              }
              setLockData(lockBaru)
              const mAwal = Math.floor((selesai - mulai) / 60000)
              setSisaWaktu(`${mAwal}:00`)
              toast.error(`🔒 Akun Anda dikunci. Alasan: ${l.alasan || '-'}`)
              return
            }

            const now = Date.now()
            const expired = Number(l.waktuSelesaiLock) || 0
            if (expired === 0 || now < expired) {
              setLockData(l)
              toast.error(`🔒 Akun Anda dikunci. Alasan: ${l.alasan || '-'}`)
              return
            }
            await remove(lockRef)
          }
        }

        const checkinRef = ref(db, `toko/${TOKO_ID}/checkinHarian/${clean}/${todayKey}`)
        const checkinSnap = await get(checkinRef)

        let waktuStandbyFinal: number
        if (checkinSnap.exists()) {
          waktuStandbyFinal = checkinSnap.val().waktu
        } else {
          waktuStandbyFinal = Date.now()
          await set(checkinRef, { nama: userData.nama, tanggal: tglIndo, tanggalKey: todayKey, waktu: waktuStandbyFinal })
        }

        await set(ref(db, pathAntrian), {
          nama: userData.nama,
          status: 'Standby',
          waktuStandby: waktuStandbyFinal,
          kategori: kategoriPilih,
          subkategori: kategoriPilih,
          posisiTerkunci: 0,
        })
        toast.success('Berhasil Masuk Antrian!')
      } else if (aksi === 'BawaCustomer') {
        await update(ref(db, pathAntrian), { status: 'Melayani', posisiTerkunci: 0, waktuMulaiMelayani: Date.now() })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'BawaCustomer', waktu: Date.now(), tanggal: tglIndo, tanggalKey: todayKey, waktuMulai: Date.now() })
        toast.success('Status: Melayani Customer')
      } else if (aksi === 'Selesai') {
        setShowClosing(true)
        return
      } else if (aksi === 'SimpanClosing') {
        const waktuMulai = dataSaya?.waktuMulaiMelayani || Date.now()
        const now = Date.now()
        const snapAkt = await get(ref(db, pathStatistik))
        const dataAkt = snapAkt.val() || {}
        const aktivitasBelumSelesai = Object.keys(dataAkt)
          .filter((key) => dataAkt[key].nama === userData.nama && dataAkt[key].aksi === 'BawaCustomer' && !dataAkt[key].waktuSelesai)
          .map((key) => ({ _key: key, ...dataAkt[key] }))
          .sort((a: any, b: any) => (b.waktu || 0) - (a.waktu || 0))
        const target = aktivitasBelumSelesai[0]
        await remove(ref(db, pathAntrian))
        if (target && target._key) {
          await update(ref(db, `${pathStatistik}/${target._key}`), { waktuSelesai: now, hasil, durasiDetik: Math.floor((now - waktuMulai) / 1000) })
        } else {
          await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'BawaCustomer', waktu: waktuMulai, tanggal: tglIndo, tanggalKey: todayKey, waktuMulai, waktuSelesai: now, hasil, durasiDetik: Math.floor((now - waktuMulai) / 1000) })
        }
        toast.success(`Berhasil disimpan: ${hasil}`)
        setShowClosing(false)
      } else if (aksi === 'Ibadah') {
        const posisi = posisiStandby()
        await update(ref(db, pathAntrian), { status: 'Ibadah', posisiTerkunci: posisi, waktuStandbySebelumIbadah: dataSaya?.waktuStandby || Date.now() })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'MulaiIbadah', waktu: Date.now(), tanggal: tglIndo, tanggalKey: todayKey, kategori: 'Ibadah', posisi })
        toast.info('Waktu Ibadah dimulai.')
      } else if (aksi === 'KembaliIbadah') {
        const posisiLama = dataSaya?.posisiTerkunci || 0
        const waktuStandbyKembali = dataSaya?.waktuStandbySebelumIbadah || dataSaya?.waktuStandby || Date.now()
        await update(ref(db, pathAntrian), { status: 'Standby', posisiTerkunci: 0, waktuStandby: waktuStandbyKembali })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'SelesaiIbadah', waktu: Date.now(), tanggal: tglIndo, tanggalKey: todayKey, kategori: 'Ibadah', posisi: posisiLama })
        toast.success('Kembali ke antrian.')
      } else if (aksi === 'PanggilCS') {
        const posisi = posisiStandby()
        await update(ref(db, pathAntrian), { status: 'Dipanggil CS', posisiTerkunci: posisi, waktuStandbySebelumCS: dataSaya?.waktuStandby || Date.now() })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'PanggilCS', waktu: Date.now(), tanggal: tglIndo, tanggalKey: todayKey })
        toast.info('Dipanggil ke CS/Gudang.')
      } else if (aksi === 'KembaliCS') {
        const waktuStandbyKembali = dataSaya?.waktuStandbySebelumCS || dataSaya?.waktuStandby || Date.now()
        await update(ref(db, pathAntrian), { status: 'Standby', waktuStandby: waktuStandbyKembali, posisiTerkunci: 0 })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'KembaliAntriDariCS', waktu: Date.now(), tanggal: tglIndo, tanggalKey: todayKey })
        toast.success('Kembali ke antrian.')
      } else if (aksi === 'Keluar') {
        await remove(ref(db, pathAntrian))
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'KeluarAntrian', waktu: Date.now(), tanggal: tglIndo, tanggalKey: todayKey, hasil: 'Manual' })
        toast.success('Anda keluar dari antrian.')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Filter Aktivitas Harian (Sinkron dengan lastResetTimestamp admin agar bersih total menjadi 0)
  const aktivitasHariIni = statistikList.filter(a => {
    const waktuAktivitas = Number(a.waktu || a.waktuMulai || 0)
    const isSetelahReset = lastResetTimestamp === 0 || waktuAktivitas > lastResetTimestamp
    const isPromotorSama = String(a.nama || '').trim().toLowerCase() === String(userData?.nama || '').trim().toLowerCase()
    const isHariIni = (a.tanggalKey && a.tanggalKey === todayKey) || (a.tanggal && a.tanggal === hariIniIndo)

    return isSetelahReset && isPromotorSama && (isHariIni || (lastResetTimestamp > 0 && waktuAktivitas >= lastResetTimestamp))
  })

  const listBawaSaya = aktivitasHariIni.filter(a => a.aksi === 'BawaCustomer')
  const totalDeal = listBawaSaya.filter(a => a.hasil === 'Deal').length
  const totalLihat = listBawaSaya.filter(a => a.hasil === 'Lihat').length
  const listIbadahSaya = aktivitasHariIni.filter(a => (a.aksi === 'MulaiIbadah' || a.aksi === 'SelesaiIbadah' || a.aksi === 'Ibadah'))
  const listKeluarSaya = aktivitasHariIni.filter(a => a.aksi === 'KeluarAntrian')
  const listAutokickSaya = aktivitasHariIni.filter(a => (a.aksi === 'Autokick' || a.aksi === 'AutoKick'))

  // Filter Rekap Bulanan (Tetap utuh dan akumulatif tidak terhapus saat reset harian)
  const rekapBulananMap = statistikList
    .filter(a => a.aksi === 'BawaCustomer' && a.waktu && String(a.nama || '').trim().toLowerCase() === String(userData?.nama || '').trim().toLowerCase())
    .reduce((acc: any, curr: any) => {
      const d = new Date(curr.waktu)
      const bulanIdx = d.getMonth()
      const tahun = d.getFullYear()
      const key = `${tahun}-${pad(bulanIdx + 1)}`
      if (!acc[key]) acc[key] = { label: `${NAMA_BULAN[bulanIdx]} ${tahun}`, deal: 0, lihat: 0 }
      if (curr.hasil === 'Deal') acc[key].deal += 1
      if (curr.hasil === 'Lihat') acc[key].lihat += 1
      return acc
    }, {})

  const listRekapBulanan = Object.keys(rekapBulananMap)
    .sort((a, b) => b.localeCompare(a))
    .map(k => rekapBulananMap[k])

  const formatJam = (ts: number) => ts ? `${pad(new Date(ts).getHours())}.${pad(new Date(ts).getMinutes())}` : '-'

  if (isLoading || !mounted || isLoadingCheckin) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  }

  if (!userData) {
    if (typeof window !== 'undefined') window.location.href = '/'
    return null
  }

  if (lockData?.locked) {
    const expired = Number(lockData.waktuSelesaiLock) || 0
    const sisa = expired - Date.now()
    const sudahHabis = expired !== 0 && sisa <= 0

    return (
      <div className="fixed inset-0 z-50 bg-rose-600 text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6 shadow-lg">
          <Lock className="w-12 h-12 text-white animate-pulse" />
        </div>
        <h1 className="text-3xl font-black mb-2 uppercase tracking-wider">AKUN ANDA DIKUNCI</h1>
        <p className="text-base font-semibold mb-6 text-rose-100 max-w-xs">
          Alasan Sanksi: <span className="underline decoration-white/50">{lockData.alasan || 'Pelanggaran Disiplin Toko'}</span>
        </p>

        <div className="bg-rose-950/40 backdrop-blur-md p-6 rounded-[2rem] w-full max-w-sm border border-white/20 shadow-2xl mb-8">
          {!sudahHabis ? (
            <>
              <p className="text-xs uppercase tracking-widest mb-1 text-rose-200 font-bold">Sisa Waktu Hukuman</p>
              <div className="text-5xl font-black text-white tracking-tighter my-2">{sisaWaktu}</div>
              <p className="text-[11px] text-rose-200/80 mt-2">Harap tunggu hingga timer selesai.</p>
            </>
          ) : (
            <div className="py-2">
              <p className="text-lg font-black text-white mb-1 uppercase tracking-wide">Waktu Hukuman Telah Selesai</p>
              <p className="text-xs text-rose-100 font-medium">Silakan hubungi Admin untuk membuka kunci akun Anda.</p>
            </div>
          )}
        </div>

        <button onClick={() => setShowLogoutConfirm(true)} className="bg-white text-rose-600 font-bold py-3.5 px-8 rounded-xl shadow-lg hover:bg-rose-50 transition active:scale-95 text-sm uppercase tracking-wide">
          Keluar Aplikasi
        </button>

        <LogoutModal show={showLogoutConfirm} onCancel={() => setShowLogoutConfirm(false)} onConfirm={handleLogout} />
      </div>
    )
  }

  const gpsAktif = latTokoFinal !== 0 && lngTokoFinal !== 0
  const dalamRadius = !gpsAktif || (jarak !== null && jarak <= radiusFinal)
  const antrianTutup = setting?.statusAntrian === 'TUTUP'

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background relative">
      <AppHeader storeName="UFO Malang Kebonsari" isOpen={!antrianTutup} onLogout={() => setShowLogoutConfirm(true)} onToggleTheme={toggleTheme} isDark={isDark} />

      <main className="flex-1 px-4 pt-4 pb-28 space-y-6">
        <PromoterCard name={userData.nama} />

        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Giliran saat ini</h2>
          <div className="grid grid-cols-2 gap-3">
            <TurnCard type="HA" label="Home Appliance" holder={listHA.length > 0 ? listHA[0].nama : null} />
            <TurnCard type="AV" label="Audio Video" holder={listAV.length > 0 ? listAV[0].nama : null} />
          </div>
        </section>

        {statusSaya === 'Offline' && (
          <div className="bg-card rounded-3xl p-6 shadow-sm border border-border relative overflow-hidden">
            {sudahCheckinHariIni ? (
              <div className="text-center py-4 relative z-10">
                <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-2 uppercase">Sudah Check-in Hari Ini</h2>
                <p className="text-xs text-muted-foreground mb-4">Ambil antrian jika ingin mulai bekerja.</p>
                <KategoriPicker value={kategoriPilih} onChange={setKategoriPilih} />
                <button onClick={() => handleAksi('CheckIn')} disabled={isProcessing || antrianTutup || !dalamRadius} className="w-full py-4 bg-primary text-primary-foreground font-black rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 transition-all flex justify-center items-center gap-2">
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-primary-foreground" />}
                  {isProcessing ? 'Memproses...' : antrianTutup ? 'ANTRIAN DITUTUP' : !dalamRadius ? 'DI LUAR RADIUS' : 'MASUK ANTRIAN'}
                </button>
              </div>
            ) : (
              <div className="relative z-10">
                <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 uppercase"><MapPin className="w-4 h-4 text-primary" /> Konfirmasi Kehadiran</h2>
                {gpsAktif ? (
                  <div className="mb-4">
                    <div className="w-full h-40 rounded-2xl overflow-hidden border border-border relative bg-secondary">
                      <MapComponent tokoLat={latTokoFinal} tokoLng={lngTokoFinal} radius={radiusFinal} userLat={userLoc?.lat} userLng={userLoc?.lng} />
                    </div>
                    <div className={`mt-2 p-2 rounded-lg text-center text-xs font-bold ${jarak === null ? 'bg-amber-500/10 text-amber-600' : dalamRadius ? 'bg-accent/15 text-accent' : 'bg-destructive/15 text-destructive'}`}>
                      {jarak !== null ? (dalamRadius ? `✓ Di dalam radius (${jarak.toFixed(0)}m)` : `⚠️ Di luar radius (${jarak.toFixed(0)}m)`) : statusGPS}
                    </div>
                    <button type="button" onClick={mintaIzinGPS} className="w-full mt-2 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold">
                      <MapPin className="w-4 h-4 inline mr-2" /> AKTIFKAN / COBA GPS LAGI
                    </button>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-secondary rounded-xl text-center text-xs text-muted-foreground">GPS toko belum diatur di admin.</div>
                )}
                <KategoriPicker value={kategoriPilih} onChange={setKategoriPilih} />
                <button onClick={() => handleAksi('CheckIn')} disabled={isProcessing || antrianTutup || !dalamRadius} className="w-full py-4 bg-primary text-primary-foreground font-black rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 transition-all flex justify-center items-center gap-2">
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-primary-foreground" />}
                  {isProcessing ? 'Memproses...' : antrianTutup ? 'ANTRIAN DITUTUP' : !dalamRadius ? 'DI LUAR RADIUS' : 'KONFIRMASI KEHADIRAN'}
                </button>
              </div>
            )}
          </div>
        )}

        {statusSaya === 'Standby' && (
          <div className="bg-card rounded-3xl p-6 text-center shadow-xl border border-border relative overflow-hidden">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] relative z-10">Nomor Antrian Anda</p>
            <div className="text-8xl font-black text-foreground my-2 tracking-tighter relative z-10">
              {(() => {
                const listKategoriSaya = dataSaya?.kategori === 'AV' ? listAV : listHA
                const posisi = listKategoriSaya.filter(a => a.status === 'Standby' || a.status === 'Melayani').findIndex(a => a.nama.toLowerCase() === userData.nama.toLowerCase()) + 1
                return posisi.toString().padStart(2, '0')
              })()}
            </div>
            <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-8 bg-primary/10 text-primary border border-primary/20 uppercase relative z-10">KATEGORI {dataSaya?.kategori}</div>
            <div className="space-y-3 relative z-10">
              <button onClick={() => handleAksi('BawaCustomer')} className="w-full py-4 bg-cyan-500 text-slate-950 font-black rounded-xl shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 transition-all active:scale-95 flex justify-center items-center gap-2">
                <Play className="w-5 h-5 fill-slate-950" /> SUDAH MEMBAWA CUSTOMER
              </button>
              <button onClick={() => handleAksi('Ibadah')} className="w-full py-4 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:bg-amber-400 transition-all active:scale-95 flex justify-center items-center gap-2">
                <MosqueIcon className="w-5 h-5" /> SEDANG IBADAH
              </button>
              <button onClick={() => handleAksi('PanggilCS')} className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 hover:bg-purple-500 transition-all active:scale-95 flex justify-center items-center gap-2">
                <Package className="w-5 h-5" /> DIPANGGIL CS / GUDANG
              </button>
              <button onClick={() => handleAksi('Keluar')} className="w-full py-4 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/30 hover:bg-rose-500 transition-all active:scale-95 flex justify-center items-center gap-2">
                <LogOut className="w-5 h-5" /> KELUAR ANTRIAN
              </button>
            </div>
          </div>
        )}

        {statusSaya === 'Melayani' && (
          <div className="bg-blue-600 rounded-3xl p-8 text-center text-white shadow-xl shadow-blue-500/20">
            <h2 className="text-2xl font-black mb-2 uppercase">Sedang Melayani</h2>
            <p className="text-xs text-blue-100 mb-8">Berikan pelayanan terbaik!</p>
            <button onClick={() => handleAksi('Selesai')} className="w-full py-4 bg-white text-blue-700 font-black rounded-xl shadow-lg flex justify-center items-center gap-2 active:scale-95 transition-all"><ArrowRight className="w-5 h-5" /> SELESAI MELAYANI</button>
          </div>
        )}

        {statusSaya === 'Dipanggil CS' && (
          <div className="bg-purple-600 rounded-3xl p-8 text-center text-white shadow-xl shadow-purple-500/20">
            <Package className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-black mb-2 uppercase">Dipanggil CS/GUDANG</h2>
            <p className="text-xs text-purple-100 mb-8">Posisi #{dataSaya?.posisiTerkunci || '-'} Anda aman terkunci.</p>
            <button onClick={() => handleAksi('KembaliCS')} className="w-full py-4 bg-white text-purple-700 font-black rounded-xl shadow-lg active:scale-95 transition-all">KEMBALI ANTRI</button>
          </div>
        )}

        {statusSaya === 'Ibadah' && (
          <div className="bg-amber-500 rounded-3xl p-8 text-center text-white shadow-xl shadow-amber-500/20 relative overflow-hidden">
            <MosqueIcon className="w-12 h-12 mx-auto mb-4 relative z-10" />
            <h2 className="text-2xl font-black mb-2 uppercase relative z-10">Sedang Ibadah</h2>
            <p className="text-xs text-amber-100 mb-8 relative z-10">Posisi #{dataSaya?.posisiTerkunci || '-'} Anda aman terkunci.</p>
            <button onClick={() => handleAksi('KembaliIbadah')} className="w-full py-4 bg-white text-amber-700 font-black rounded-xl shadow-lg active:scale-95 transition-all relative z-10">SELESAI IBADAH</button>
          </div>
        )}

        <div className="space-y-4">
          {['HA', 'AV'].map((kat) => {
            const list = kat === 'HA' ? listHA : listAV
            const listStandby = list.filter(a => a.status === 'Standby')

            return (
              <div key={kat} className="bg-card border border-border p-5 rounded-3xl">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase">
                    <span className={`w-2 h-2 rounded-full ${kat === 'HA' ? 'bg-cyan-500' : 'bg-purple-500'}`}></span>
                    Live Urutan {kat}
                  </h3>
                  <span className="text-[10px] font-bold bg-secondary text-muted-foreground px-2.5 py-1 rounded-md">{listStandby.length} Antri</span>
                </div>
                <div className="space-y-2">
                  {list.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2">Belum ada antrian</p>
                  ) : (
                    list.map((item, idx) => {
                      const isSaya = item.nama.toLowerCase() === userData?.nama.toLowerCase()
                      const isGiliranUtama = item.status === 'Standby' && listStandby.findIndex(a => a.nama === item.nama) === 0
                      return (
                        <div key={item._key || idx} className={`flex justify-between items-center p-3 rounded-xl transition-colors ${isSaya ? 'bg-white dark:bg-primary/20 text-slate-900 dark:text-primary border border-slate-200 dark:border-primary/30 shadow-sm' : 'bg-white dark:bg-secondary/50 text-slate-900 dark:text-foreground border border-slate-200 dark:border-border/60 shadow-sm'}`}>
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black ${isGiliranUtama ? 'bg-rose-500 text-white' : 'bg-secondary text-muted-foreground'}`}>{item.status === 'Melayani' ? '-' : (idx + 1)}</span>
                            <span className={`text-xs font-bold uppercase ${isSaya ? 'text-slate-900 dark:text-primary' : 'text-slate-900 dark:text-foreground'}`}>{item.nama} {isSaya && '(Anda)'}</span>
                          </div>
                          {item.status === 'Melayani' ? (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-blue-600 text-white">Melayani</span>
                          ) : item.status === 'Dipanggil CS' ? (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-purple-600 text-white">Dipanggil CS</span>
                          ) : item.status === 'Ibadah' ? (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-amber-500 text-white">Ibadah</span>
                          ) : isGiliranUtama ? (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-rose-500 text-white animate-pulse">Utama</span>
                          ) : (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-secondary text-muted-foreground">Standby</span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* AKTIVITAS & REKAP */}
        <div className="bg-card border border-border p-5 rounded-3xl mt-6 space-y-4 text-foreground shadow-sm">
          <div onClick={() => setIsAktivitasOpen(!isAktivitasOpen)} className="flex justify-between items-center cursor-pointer select-none">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground">AKTIVITAS & REKAP</h3>
              <p className="text-xs text-muted-foreground">Monitoring operasional & kinerja</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
              {isAktivitasOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>

          {isAktivitasOpen && (
            <div className="space-y-3 pt-2">
              <div className="bg-secondary/50 border border-border/60 rounded-2xl overflow-hidden">
                <div onClick={() => toggleCollapse('checkin')} className="p-4 flex justify-between items-center transition cursor-pointer hover:bg-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide text-foreground">CHECK-IN PROMOTOR</h4>
                      <p className="text-[11px] text-muted-foreground">{jamCheckin ? `Jam ${formatJam(jamCheckin)}` : 'Belum check-in'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-emerald-500 text-white">{jamCheckin ? '1' : '0'}</span>
                    {openCollapse.checkin ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {openCollapse.checkin && (
                  <div className="p-3 bg-secondary/80 border-t border-border text-xs space-y-1 mx-3 mb-3 rounded-xl">
                    <p className="font-bold text-foreground">Status Kehadiran:</p>
                    <p className="text-muted-foreground">{jamCheckin ? `Anda sudah melakukan konfirmasi kehadiran pada pukul ${formatJam(jamCheckin)}` : 'Anda belum melakukan check-in hari ini.'}</p>
                  </div>
                )}
              </div>

              <div className="bg-secondary/50 border border-border/60 rounded-2xl overflow-hidden">
                <div onClick={() => toggleCollapse('bawa')} className="p-4 flex justify-between items-center transition cursor-pointer hover:bg-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center"><Users className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide text-foreground">BAWA CUSTOMER</h4>
                      <p className="text-[11px] text-muted-foreground">Deal: {totalDeal} | Lihat: {totalLihat}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-cyan-500 text-slate-950">{listBawaSaya.length}</span>
                    {openCollapse.bawa ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {openCollapse.bawa && (
                  <div className="p-3 bg-secondary/80 border-t border-border text-xs space-y-2 mx-3 mb-3 rounded-xl">
                    <p className="font-bold text-foreground">Rincian Waktu Mulai & Selesai Melayani:</p>
                    {listBawaSaya.length === 0 ? (
                      <p className="text-muted-foreground italic">Belum ada riwayat membawa customer hari ini.</p>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {listBawaSaya.map((a, i) => {
                          const durasiMenit = a.durasiDetik ? Math.floor(a.durasiDetik / 60) : null
                          return (
                            <div key={i} className="bg-background border border-border rounded-xl p-3 space-y-1.5 shadow-sm">
                              <div className="flex justify-between items-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${a.hasil === 'Deal' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'}`}>{a.hasil || 'Proses'}</span>
                                <span className="text-muted-foreground text-[11px]">{durasiMenit !== null ? `${durasiMenit} menit` : 'Berlangsung'}</span>
                              </div>
                              <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
                                <span>Mulai: <strong className="text-foreground">{formatJam(a.waktuMulai || a.waktu)}</strong></span>
                                <span>Selesai: <strong className="text-foreground">{a.waktuSelesai ? formatJam(a.waktuSelesai) : '-'}</strong></span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-secondary/50 border border-border/60 rounded-2xl overflow-hidden">
                <div onClick={() => toggleCollapse('ibadah')} className="p-4 flex justify-between items-center transition cursor-pointer hover:bg-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center"><MosqueIcon className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide text-foreground">IBADAH</h4>
                      <p className="text-[11px] text-muted-foreground">Catatan istirahat / ibadah</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-amber-500 text-white">{listIbadahSaya.length}</span>
                    {openCollapse.ibadah ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {openCollapse.ibadah && (
                  <div className="p-3 bg-secondary/80 border-t border-border text-xs space-y-2 mx-3 mb-3 rounded-xl">
                    <p className="font-bold text-foreground">Rincian Catatan Ibadah:</p>
                    {listIbadahSaya.length === 0 ? (
                      <p className="text-muted-foreground italic">Belum ada catatan ibadah hari ini.</p>
                    ) : (
                      <div className="space-y-1 pt-1">
                        {listIbadahSaya.map((a, i) => (
                          <div key={i} className="bg-background border border-border rounded-lg p-2.5 flex justify-between items-center">
                            <span className="font-medium text-amber-600">{a.aksi === 'MulaiIbadah' ? 'Mulai Ibadah' : a.aksi === 'SelesaiIbadah' ? 'Selesai Ibadah' : 'Ibadah'}</span>
                            <span className="text-muted-foreground">{formatJam(a.waktu)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-secondary/50 border border-border/60 rounded-2xl overflow-hidden">
                <div onClick={() => toggleCollapse('keluar')} className="p-4 flex justify-between items-center transition cursor-pointer hover:bg-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center"><LogOut className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide text-foreground">KELUAR ANTRIAN</h4>
                      <p className="text-[11px] text-muted-foreground">Riwayat keluar manual</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-rose-500 text-white">{listKeluarSaya.length}</span>
                    {openCollapse.keluar ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {openCollapse.keluar && (
                  <div className="p-3 bg-secondary/80 border-t border-border text-xs space-y-2 mx-3 mb-3 rounded-xl">
                    <p className="font-bold text-foreground">Riwayat Keluar Antrian:</p>
                    {listKeluarSaya.length === 0 ? (
                      <p className="text-muted-foreground italic">Tidak ada riwayat keluar antrian hari ini.</p>
                    ) : (
                      <div className="space-y-1 pt-1">
                        {listKeluarSaya.map((a, i) => (
                          <div key={i} className="bg-background border border-border rounded-lg p-2.5 flex justify-between items-center">
                            <span className="font-medium text-rose-600">Keluar Antrian</span>
                            <span className="text-muted-foreground">{formatJam(a.waktu)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-secondary/50 border border-border/60 rounded-2xl overflow-hidden">
                <div onClick={() => toggleCollapse('autokick')} className="p-4 flex justify-between items-center transition cursor-pointer hover:bg-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide text-foreground">AUTOKICK</h4>
                      <p className="text-[11px] text-muted-foreground">Riwayat sistem mengeluarkan otomatis</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-red-500 text-white">{listAutokickSaya.length}</span>
                    {openCollapse.autokick ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {openCollapse.autokick && (
                  <div className="p-3 bg-secondary/80 border-t border-border text-xs space-y-2 mx-3 mb-3 rounded-xl">
                    <p className="font-bold text-foreground">Riwayat Autokick Sistem:</p>
                    {listAutokickSaya.length === 0 ? (
                      <p className="text-muted-foreground italic">Tidak ada catatan autokick hari ini.</p>
                    ) : (
                      <div className="space-y-1 pt-1">
                        {listAutokickSaya.map((a, i) => (
                          <div key={i} className="bg-background border border-border rounded-lg p-2.5 flex justify-between items-center">
                            <span className="font-medium text-red-600">Autokick Sistem</span>
                            <span className="text-muted-foreground">{formatJam(a.waktu)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-secondary/50 border border-border/60 rounded-2xl overflow-hidden">
                <div onClick={() => toggleCollapse('rekap')} className="p-4 flex justify-between items-center transition cursor-pointer hover:bg-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center"><Users className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide text-foreground">REKAP PROMOTOR</h4>
                      <p className="text-[11px] text-muted-foreground">Akumulasi deal & lihat harian</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-purple-500 text-white">{listBawaSaya.length}</span>
                    {openCollapse.rekap ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {openCollapse.rekap && (
                  <div className="p-3 bg-secondary/80 border-t border-border text-xs space-y-2 mx-3 mb-3 rounded-xl">
                    <p className="font-bold text-foreground">Ringkasan Performa Hari Ini:</p>
                    <div className="bg-background border border-border rounded-xl p-3 flex justify-around text-center shadow-sm">
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold">Deal</p>
                        <p className="text-emerald-600 text-base font-black">{totalDeal}</p>
                      </div>
                      <div className="border-r border-border"></div>
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase font-bold">Lihat</p>
                        <p className="text-amber-600 text-base font-black">{totalLihat}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-secondary/50 border border-border/60 rounded-2xl overflow-hidden">
                <div onClick={() => toggleCollapse('bulanan')} className="p-4 flex justify-between items-center transition cursor-pointer hover:bg-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><CalendarDays className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide text-foreground">TOTAL BULANAN</h4>
                      <p className="text-[11px] text-muted-foreground">{listRekapBulanan.length > 0 ? `${listRekapBulanan.length} Bulan tercatat` : 'Belum ada rekap'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-primary text-primary-foreground">{listRekapBulanan.length}</span>
                    {openCollapse.bulanan ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {openCollapse.bulanan && (
                  <div className="p-3 bg-secondary/80 border-t border-border text-xs space-y-2 mx-3 mb-3 rounded-xl">
                    <p className="font-bold text-foreground">Akumulasi Deal & Lihat Bulanan:</p>
                    {listRekapBulanan.length === 0 ? (
                      <p className="text-muted-foreground italic">Belum ada data rekap bulanan.</p>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {listRekapBulanan.map((rekap: any, idx: number) => (
                          <div key={idx} className="bg-background border border-border rounded-xl p-3 flex justify-between items-center shadow-sm">
                            <span className="font-bold text-foreground">{rekap.label}</span>
                            <div className="flex gap-2">
                              <span className="font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded">Deal: {rekap.deal}</span>
                              <span className="font-bold text-amber-600 bg-amber-500/10 px-2 py-1 rounded">Lihat: {rekap.lihat}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {showClosing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-3xl p-6 w-full max-w-sm text-center border border-border shadow-2xl">
            <h3 className="text-lg font-bold mb-5 text-foreground uppercase">Hasil Melayani Customer</h3>
            <div className="space-y-3">
              <button onClick={() => handleAksi('SimpanClosing', 'Deal')} disabled={isProcessing} className="w-full py-3.5 bg-accent text-accent-foreground font-bold rounded-xl shadow-lg shadow-accent/20 disabled:opacity-50">✓ DEAL / CLOSING</button>
              <button onClick={() => handleAksi('SimpanClosing', 'Lihat')} disabled={isProcessing} className="w-full py-3.5 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50">👀 LIHAT-LIHAT SAJA</button>
              <button onClick={() => setShowClosing(false)} className="w-full py-2 text-muted-foreground font-medium text-xs mt-2">Batal</button>
            </div>
          </div>
        </div>
      )}

      <LogoutModal show={showLogoutConfirm} onCancel={() => setShowLogoutConfirm(false)} onConfirm={handleLogout} />
    </div>
  )
}