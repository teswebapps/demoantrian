'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue, update, get, remove, push, set } from 'firebase/database'
import { useState, useEffect, useRef } from 'react'
import {
  Loader2, UserPlus, UserMinus, Lock, Unlock,
  ShieldAlert, Trash2, KeyRound, Clock, FileText, ChevronDown, Users, RefreshCcw, Coffee
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { CustomModal } from '@/components/ui/CustomModal'
import { AdminShell } from '@/components/admin/admin-shell'
import { SectionCard, inputCls, btn } from '@/components/admin/admin-ui'
import { autoResetHarian } from '@/lib/autoReset'

interface Option { label: string; value: string }

const cleanKey = (nama: string) => nama.trim().toLowerCase().replace(/\s+/g, '_')
const emailToKey = (email: string) => email.trim().toLowerCase().replace(/\./g, ',')
const pad2 = (n: number) => String(n).padStart(2, '0')
const getTodayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const getTodayIndo = (d = new Date()) => `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`

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

function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih opsi...',
  icon,
  searchable = false,
}: {
  options: Option[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
  icon?: React.ReactNode
  searchable?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  useEffect(() => {
    setQuery(selectedOption ? selectedOption.label : '')
  }, [value, selectedOption])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        if (searchable) {
          setQuery(selectedOption ? selectedOption.label : '')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [searchable, selectedOption])

  const filteredOptions = searchable
    ? options.filter((opt) => opt.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {searchable ? (
        <div className="relative flex items-center">
          {icon && <span className="absolute left-4 text-muted-foreground pointer-events-none">{icon}</span>}
          <input
            type="text"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              const val = e.target.value
              setQuery(val)
              setIsOpen(true)
              if (!val.trim() && value) onChange('')
            }}
            placeholder={placeholder}
            className={`${inputCls} ${icon ? 'pl-11' : ''} pr-16 uppercase font-bold placeholder:normal-case placeholder:font-normal`}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                onChange('')
                setIsOpen(true)
              }}
              aria-label="Hapus pencarian"
              className="absolute right-8 w-6 h-6 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground text-xs font-black flex items-center justify-center border border-border"
            >
              ×
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Buka daftar"
            className="absolute right-3 text-muted-foreground"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`${inputCls} ${icon ? 'pl-11' : ''} pr-10 text-left flex items-center justify-between hover:bg-secondary transition`}
        >
          {icon && <span className="absolute left-4 text-muted-foreground">{icon}</span>}
          <span className={`truncate ${!value ? 'text-muted-foreground' : 'text-foreground font-bold uppercase'}`}>{displayLabel}</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-card border border-border rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground text-center italic">
              {searchable && query ? `Promotor "${query}" tidak ditemukan` : 'Tidak ada pilihan'}
            </div>
          ) : (
            filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  if (searchable) setQuery(opt.label)
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
      setDaftarAntrian(list.sort((a, b) => (Number(a.waktuStandby) || 0) - (Number(b.waktuStandby) || 0)))
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

    return () => { unsubMaster(); unsubAntrian(); unsubCheckin() }
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
    } catch {
      showModal('error', 'Gagal', 'Gagal menambah promotor. Cek rules Firebase.')
    } finally { setIsProcessing(false) }
  }

  const hitungWaktuStandby = (kategori: string, posisi: number, antrianTerbaru: any[]) => {
    const katNorm = String(kategori).toUpperCase()
    const listKategori = antrianTerbaru
      .filter(a => a && a.nama && String(a.kategori || a.subkategori || 'HA').toUpperCase() === katNorm)
      .sort((a, b) => (Number(a.waktuStandby) || 0) - (Number(b.waktuStandby) || 0))

    const nowTs = Date.now()
    const maxWaktu = listKategori.reduce((max, item) => Math.max(max, Number(item.waktuStandby) || 0), 0)

    if (listKategori.length === 0) return nowTs

    if (!posisi || posisi < 1 || posisi > listKategori.length) {
      return Math.max(nowTs, maxWaktu + 1000)
    }

    if (posisi === 1) {
      const firstTs = Number(listKategori[0].waktuStandby) || nowTs
      return firstTs - 1000
    }

    const beforeTs = Number(listKategori[posisi - 2].waktuStandby) || 0
    const afterTs = Number(listKategori[posisi - 1].waktuStandby) || beforeTs + 2000

    if (afterTs - beforeTs > 2) {
      return Math.floor((beforeTs + afterTs) / 2)
    }

    return beforeTs + 1
  }

  const handleMasukanAntri = async () => {
    if (!selectedSales) { showModal('error', 'Peringatan', 'Pilih promotor terlebih dahulu!'); return }
    setIsProcessing(true)
    try {
      const clean = cleanKey(selectedSales)
      const snap = await get(ref(db, `toko/${TOKO_ID}/antrian/${clean}`))
      if (snap.exists()) throw new Error('Promotor sudah ada di antrian.')

      const allSnap = await get(ref(db, `toko/${TOKO_ID}/antrian`))
      const allVal = allSnap.val() || {}
      const antrianTerbaru = Object.keys(allVal)
        .filter(k => allVal[k] && allVal[k].nama)
        .map(k => ({ ...allVal[k], _key: k }))

      const posisi = parseInt(selectedPosisi, 10) || 0
      const katNorm = String(selectedKategori).toUpperCase() === 'AV' ? 'AV' : 'HA'
      const waktuStandbyBaru = hitungWaktuStandby(katNorm, posisi, antrianTerbaru)

      const updates: Record<string, any> = {
        [`toko/${TOKO_ID}/antrian/${clean}`]: {
          nama: selectedSales,
          status: 'Standby',
          waktuStandby: waktuStandbyBaru,
          kategori: katNorm,
          subkategori: katNorm,
          posisiTerkunci: 0,
          timerMulai: 0,
          timerAksi: ''
        }
      }

      if (posisi >= 1) {
        const listKategori = antrianTerbaru
          .filter(a => String(a.kategori || a.subkategori || 'HA').toUpperCase() === katNorm)
          .sort((a, b) => (Number(a.waktuStandby) || 0) - (Number(b.waktuStandby) || 0))

        let cursorTs = waktuStandbyBaru + 1000
        for (let i = posisi - 1; i < listKategori.length; i++) {
          const item = listKategori[i]
          const itemKey = item._key || cleanKey(item.nama)
          const currentTs = Number(item.waktuStandby) || 0
          if (currentTs <= cursorTs) {
            updates[`toko/${TOKO_ID}/antrian/${itemKey}/waktuStandby`] = cursorTs
            cursorTs += 1000
          }
        }
      }

      await update(ref(db), updates)
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
    } catch {
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
      } catch {
        showModal('error', 'Gagal', 'Gagal menghapus.')
      } finally { setIsProcessing(false) }
    }, 'Ya, Hapus')
  }

  /* RESET ISTIRAHAT MANUAL (Memanggil fungsi dari lib/autoReset) */
  const handleResetIstirahat = () => {
    showModal('confirm', 'Reset Istirahat', `⚠️ Jalankan reset istirahat manual sekarang? Sistem akan mengeluarkan promotor Standby sesuai aturan (Pagi < 12.00, Siang >= 12.00).`, async () => {
      setIsProcessing(true)
      try {
        const today = getTodayKey()
        
        // 1. Hapus penanda (marker) hari ini agar sistem mengizinkan reset jalan
        await update(ref(db, `toko/${TOKO_ID}`), {
          lastResetIstirahat_13: null,
          lastResetIstirahat_16: null
        })
        
        // 2. Panggil otak utamanya (yang juga dipakai oleh otomatis)
        await autoResetHarian(db, TOKO_ID)
        
        showModal('success', 'Berhasil', 'Reset istirahat berhasil dijalankan.')
      } catch (err) {
        console.error(err)
        showModal('error', 'Gagal', 'Gagal melakukan reset istirahat.')
      } finally { 
        setIsProcessing(false) 
      }
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
    } catch {
      showModal('error', 'Gagal', 'Gagal memproses lock.')
    } finally { setIsProcessing(false) }
  }

  const handleResetHariIni = () => {
    showModal('confirm', 'Reset Hari Ini', '⚠️ Bersihkan antrian dan check-in harian? Rekap bulanan promotor tetap aman.', async () => {
      setIsProcessing(true)
      try {
        await remove(ref(db, `toko/${TOKO_ID}/antrian`))
        await remove(ref(db, `toko/${TOKO_ID}/checkinHarian`))
        await set(ref(db, `toko/${TOKO_ID}/lastResetTimestamp`), Date.now())
        showModal('success', 'Berhasil', 'Reset harian berhasil! Antrian dibersihkan, rekap bulanan tetap utuh.')
      } catch {
        showModal('error', 'Gagal', 'Gagal melakukan reset hari ini.')
      } finally {
        setIsProcessing(false)
      }
    }, 'Ya, Reset')
  }

  if (authLoading || !mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  }

  const opsiPromotor = masterSales.map(s => ({ label: s.nama, value: s.nama }))

  return (
    <AdminShell isDark={isDark} onToggleTheme={toggleTheme} onLogout={logout} tokoId={TOKO_ID}>
      {/* TAMBAH PROMOTOR */}
      <SectionCard icon={<UserPlus className="w-5 h-5" />} tone="cyan" title="Tambah Promotor Baru" subtitle="Promotor bisa login dengan akun Google">
        <form onSubmit={handleTambahPromotor} className="space-y-3">
          <input type="text" value={formNama} onChange={e => setFormNama(e.target.value)} placeholder="CONTOH : ANDI AQUA" className={`${inputCls} uppercase font-bold`} required />
          <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="EMAIL GOOGLE" className={inputCls} required />
          <button type="submit" disabled={isProcessing} className={btn.cyan}>
            {isProcessing ? 'MEMPROSES...' : 'SIMPAN PROMOTOR'}
          </button>
        </form>
      </SectionCard>

      {/* ATUR ANTRIAN */}
      <SectionCard icon={<UserMinus className="w-5 h-5" />} tone="amber" title="Atur Antrian" subtitle="Ketik nama promotor untuk memasukkan atau mengeluarkan dari antrian">
        <div className="space-y-3">
          <CustomSelect options={opsiPromotor} value={selectedSales} onChange={setSelectedSales} placeholder="Ketik nama promotor" icon={<Users className="w-4 h-4" />} searchable />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CustomSelect options={[{ label: 'Kategori HA', value: 'HA' }, { label: 'Kategori AV', value: 'AV' }]} value={selectedKategori} onChange={setSelectedKategori} placeholder="Pilih Kategori" />
            <input type="number" value={selectedPosisi} onChange={e => setSelectedPosisi(e.target.value)} placeholder="Nomor antrian (kosong = akhir)" className={inputCls} min="1" />
          </div>
          <button type="button" onClick={handleMasukanAntri} disabled={isProcessing} className={btn.emerald}>
            <UserPlus className="w-5 h-5" /> MASUKKAN KE ANTRIAN
          </button>
          <button type="button" onClick={handleKeluarkanAntrian} disabled={isProcessing} className={btn.amber}>
            <UserMinus className="w-5 h-5" /> KELUARKAN DARI ANTRIAN
          </button>
        </div>
      </SectionCard>

      {/* RESET MANUAL */}
      <SectionCard
        icon={<RefreshCcw className="w-5 h-5" />}
        tone="blue"
        title="Reset Antrian"
        subtitle="Reset istirahat standby dan reset harian manual"
      >
        <div className="space-y-3">
          <button type="button" onClick={handleResetIstirahat} disabled={isProcessing} className={btn.amber}>
            <Coffee className="w-5 h-5" /> RESET ISTIRAHAT (STANDBY)
          </button>
          <button
            type="button"
            onClick={handleResetHariIni}
            disabled={isProcessing}
            className="w-full py-4 font-black rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50 text-sm bg-blue-600 text-white hover:bg-blue-500"
          >
            <RefreshCcw className="w-5 h-5" /> RESET HARI INI
          </button>
        </div>
      </SectionCard>

      {/* TINDAKAN DARURAT */}
      <SectionCard icon={<ShieldAlert className="w-5 h-5" />} tone="rose" title="Tindakan Darurat" subtitle="Kunci akun atau hapus promotor">
        <div className="space-y-3">
          <CustomSelect options={opsiPromotor} value={selectedLockSales} onChange={setSelectedLockSales} placeholder="Ketik nama promotor, misal: adhe..." icon={<Users className="w-4 h-4" />} searchable />
          <CustomSelect options={[{ label: 'Lock Akun Promotor', value: 'LOCK' }, { label: 'Unlock Akun Promotor', value: 'UNLOCK' }]} value={lockAction} onChange={setLockAction} placeholder="Pilih Aksi" icon={<KeyRound className="w-4 h-4" />} />

          {lockAction === 'LOCK' && (
            <>
              <div className="relative">
                <div className="absolute left-4 top-3.5 text-muted-foreground pointer-events-none"><FileText className="w-4 h-4" /></div>
                <input type="text" value={lockReason} onChange={e => setLockReason(e.target.value)} placeholder="Alasan (misal: Pulang tanpa keluar antrian)" className={`${inputCls} pl-11`} />
              </div>
              <div className="relative">
                <div className="absolute left-4 top-3.5 text-muted-foreground pointer-events-none"><Clock className="w-4 h-4" /></div>
                <input type="number" min="1" value={lockDuration} onChange={e => setLockDuration(e.target.value)} placeholder="Durasi (menit)" className={`${inputCls} pl-11`} />
              </div>
              <p className="text-[11px] text-muted-foreground italic px-1">ℹ️ Timer hukuman baru mulai saat promotor melakukan konfirmasi kehadiran.</p>
            </>
          )}

          <button type="button" onClick={handleLockUnlock} disabled={isProcessing} className={btn.rose}>
            {lockAction === 'LOCK' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            {lockAction === 'LOCK' ? 'KUNCI AKUN' : 'BUKA KUNCI'}
          </button>
          <button type="button" onClick={() => handleHapusPermanen(selectedLockSales)} disabled={isProcessing || !selectedLockSales} className={btn.rose}>
            <Trash2 className="w-5 h-5" /> HAPUS PROMOTOR PERMANEN
          </button>
        </div>
      </SectionCard>

      <CustomModal
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </AdminShell>
  )
}