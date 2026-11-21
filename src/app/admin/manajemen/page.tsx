'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue, update, get, remove, push, set } from 'firebase/database'
import { useState, useEffect, useRef } from 'react'
import {
  Loader2, UserPlus, UserMinus, Play, Lock, Unlock,
  ShieldAlert, Trash2, KeyRound, Clock, FileText, ChevronDown, Users, RefreshCcw
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { CustomModal } from '@/components/ui/CustomModal'
import { AdminShell } from '@/components/admin/admin-shell'
import { SectionCard, inputCls, btn } from '@/components/admin/admin-ui'

interface Option { label: string; value: string }

const MosqueIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2.5v2" />
    <path d="M12 4.5c-3.6 2-5.5 4.2-5.5 6.5h11c0-2.3-1.9-4.5-5.5-6.5Z" />
    <path d="M4.5 11h15" />
    <path d="M5.5 11v10h13V11" />
    <path d="M19.5 8.5v12.5" />
    <path d="M19.5 6.5a1.5 1.5 0 0 1 0 3" />
    <path d="M10 21v-4.5a2 2 0 0 1 4 0V21" />
    <path d="M2.5 21h19" />
  </svg>
)

const cleanKey = (nama: string) => nama.trim().toLowerCase().replace(/\s+/g, '_')
const emailToKey = (email: string) => email.trim().toLowerCase().replace(/\./g, ',')
const pad2 = (n: number) => String(n).padStart(2, '0')
const getTodayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const getTodayIndo = (d = new Date()) => `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`

// Check-in jam 08.00 - 11.59 = Shift Pagi | Check-in jam 12.00 - 15.59 = Shift Siang
const isShiftPagi = (jamShift: number) => jamShift >= 8 && jamShift <= 11
const isShiftSiang = (jamShift: number) => jamShift >= 12 && jamShift <= 15

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
        className={`${inputCls} ${icon ? 'pl-11' : ''} pr-10 text-left flex items-center justify-between hover:bg-secondary transition`}
      >
        {icon && <span className="absolute left-4 text-muted-foreground">{icon}</span>}
        <span className={`truncate ${!value ? 'text-muted-foreground' : 'text-foreground font-bold uppercase'}`}>{displayLabel}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-card border border-border rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
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
    const updateTanggal = () => {
      const d = new Date()
      setHariIniIndo(getTodayIndo(d))
      setTodayKey(getTodayKey(d))
    }
    updateTanggal()
    const t = setInterval(updateTanggal, 60_000)
    return () => clearInterval(t)
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
    } catch (err) {
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

  /* RESET ISTIRAHAT MANUAL (100% dikontrol Admin) */
  const handleResetIstirahat = () => {
    const currentHour = new Date().getHours()
    const keteranganGelombang = currentHour < 15 ? 'Shift Pagi (check-in sebelum 12.00)' : 'Shift Siang (check-in mulai 12.00)'

    showModal('confirm', 'Reset Istirahat', `⚠️ Keluarkan promotor Standby ${keteranganGelombang} dari antrian sekarang?`, async () => {
      setIsProcessing(true)
      try {
        const eksekusiAt = Date.now()
        const eksekusiDate = new Date(eksekusiAt)
        const eksekusiHour = eksekusiDate.getHours()
        const tKeyEksekusi = getTodayKey(eksekusiDate)
        const tIndoEksekusi = getTodayIndo(eksekusiDate)

        const updates: Record<string, any> = {}
        let jumlahKeluar = 0

        for (const item of daftarAntrian) {
          if (item.status !== 'Standby') continue
          const clean = cleanKey(item.nama)

          const checkin = checkinList.find(c => c.namaClean === clean && c.tanggalKey === tKeyEksekusi)
          const acuan = checkin?.waktu || item.waktuStandby
          const jamShift = acuan ? new Date(Number(acuan)).getHours() : -1

          const shouldReset = eksekusiHour < 15 ? isShiftPagi(jamShift) : isShiftSiang(jamShift)

          if (shouldReset) {
            updates[`toko/${TOKO_ID}/antrian/${clean}`] = null
            if (checkin) updates[`toko/${TOKO_ID}/checkinHarian/${clean}/${tKeyEksekusi}/waktuReset`] = eksekusiAt
            const logKey = push(ref(db, `toko/${TOKO_ID}/statistikAktivitas`)).key
            updates[`toko/${TOKO_ID}/statistikAktivitas/${logKey}`] = {
              nama: item.nama,
              aksi: 'KeluarAntrian',
              waktu: eksekusiAt,
              tanggal: tIndoEksekusi,
              tanggalKey: tKeyEksekusi,
              hasil: 'Reset Istirahat'
            }
            jumlahKeluar += 1
          }
        }

        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates)
          showModal('success', 'Berhasil', `${jumlahKeluar} promotor Standby berhasil dikeluarkan untuk istirahat.`)
        } else {
          showModal('alert', 'Tidak Ada Antrian', `Tidak ada promotor Standby ${keteranganGelombang} yang perlu dikeluarkan.`)
        }
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
        await remove(ref(db, `toko/${TOKO_ID}/antrian`))
        await remove(ref(db, `toko/${TOKO_ID}/checkinHarian`))
        await set(ref(db, `toko/${TOKO_ID}/lastResetTimestamp`), Date.now())
        showModal('success', 'Berhasil', 'Reset harian berhasil! Antrian dibersihkan, rekap bulanan tetap utuh.')
      } catch (err) {
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
    <AdminShell isDark={isDark} onToggleTheme={toggleTheme} onLogout={logout}>
      {/* TAMBAH PROMOTOR */}
      <SectionCard icon={<UserPlus className="w-5 h-5" />} tone="cyan" title="Tambah Promotor Baru" subtitle="Promotor bisa login dengan akun Google">
        <form onSubmit={handleTambahPromotor} className="space-y-3">
          <input type="text" value={formNama} onChange={e => setFormNama(e.target.value)} placeholder="NAMA LENGKAP" className={`${inputCls} uppercase font-bold`} required />
          <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="EMAIL GOOGLE" className={inputCls} required />
          <button type="submit" disabled={isProcessing} className={btn.cyan}>
            {isProcessing ? 'MEMPROSES...' : 'SIMPAN PROMOTOR'}
          </button>
        </form>
      </SectionCard>

      {/* ATUR ANTRIAN */}
      <SectionCard icon={<UserMinus className="w-5 h-5" />} tone="amber" title="Atur Antrian" subtitle="Masukkan, keluarkan, atau paksa melayani">
        <div className="space-y-3">
          <CustomSelect options={opsiPromotor} value={selectedSales} onChange={setSelectedSales} placeholder="-- Pilih Promotor --" icon={<Users className="w-4 h-4" />} />
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
          <button type="button" onClick={handlePaksaBawaCustomer} disabled={isProcessing || !selectedSales} className={btn.cyan}>
            <Play className="w-5 h-5" /> PAKSA BAWA CUSTOMER
          </button>
        </div>
      </SectionCard>

      {/* RESET MANUAL */}
      <SectionCard
        icon={<RefreshCcw className="w-5 h-5" />}
        tone="purple"
        title="Reset Antrian"
        subtitle="Reset istirahat standby dan reset harian manual"
      >
        <div className="space-y-3">
          <button type="button" onClick={handleResetIstirahat} disabled={isProcessing} className={btn.amber}>
            <MosqueIcon className="w-5 h-5" /> RESET ISTIRAHAT (STANDBY)
          </button>
          <button type="button" onClick={handleResetHariIni} disabled={isProcessing} className={btn.purple}>
            <RefreshCcw className="w-5 h-5" /> RESET HARI INI
          </button>
        </div>
      </SectionCard>

      {/* TINDAKAN DARURAT */}
      <SectionCard icon={<ShieldAlert className="w-5 h-5" />} tone="rose" title="Tindakan Darurat" subtitle="Kunci akun atau hapus promotor">
        <div className="space-y-3">
          <CustomSelect options={opsiPromotor} value={selectedLockSales} onChange={setSelectedLockSales} placeholder="-- Pilih Promotor --" icon={<Users className="w-4 h-4" />} />
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