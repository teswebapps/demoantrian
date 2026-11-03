'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, get, set, remove, update, push, onValue } from 'firebase/database'
import { auth, db } from '@/lib/firebase'
import { toast } from 'sonner'
import { useTheme } from '@/hooks/useTheme'
import dynamic from 'next/dynamic'
import { Loader2, ShieldCheck, Lock, Play, MapPin, Package, ArrowRight, LogOut, History, ChevronDown, Users, CalendarDays } from 'lucide-react'
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

  const [aktivitasHariIni, setAktivitasHariIni] = useState<any[]>([])
  const [isAktivitasOpen, setIsAktivitasOpen] = useState(false)
  const [hariIniIndo, setHariIniIndo] = useState('')

  const TOKO_ID = userData?.tokoId || 'ufo-kebonsari'

  // Koordinat & radius dari admin (mendukung lat/lng maupun latToko/lngToko, radiusMaks/radiusToko)
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
      setSudahCheckinHariIni(snap.exists())
      setJamCheckin(snap.exists() ? snap.val().waktu : null)
      setIsLoadingCheckin(false)
    })
    return () => unsub()
  }, [userData, todayKey, TOKO_ID])

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

          // Lock belum mulai (menunggu konfirmasi kehadiran promotor).
          // Jangan aktifkan layar lock, TAPI jangan juga reset kalau state lokal
          // sudah di-set oleh handleAksi (lockStarted true) — cegah flicker.
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
        setLockData(null) // lock dihapus admin -> buka kunci
      }
    })
    const unsubAktivitas = onValue(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setAktivitasHariIni(list)
    })
    return () => { unsubAntrian(); unsubSetting(); unsubLock(); unsubAktivitas() }
  }, [TOKO_ID, userData])

  useEffect(() => {
    if (!lockData || !userData) return
    // Set nilai awal segera supaya countdown tidak kosong sesaat
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

  // ---------- GPS ----------
  // Diagnosa awal: HTTPS & status izin
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

  // Pantau posisi terus-menerus
  useEffect(() => {
    if (!userData || typeof window === 'undefined' || !window.isSecureContext || !navigator.geolocation) return
    setStatusGPS('Meminta lokasi dari perangkat...')
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatusGPS('GPS aktif')
      },
      (err) => {
        console.error('GPS Error:', err.code, err.message)
        setStatusGPS(pesanErrorGPS(err))
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [userData])

  // Hitung jarak setiap posisi atau koordinat toko berubah
  useEffect(() => {
    if (!userLoc) { setJarak(null); return }
    if (!latTokoFinal || !lngTokoFinal) {
      setJarak(null)
      setStatusGPS('Lokasi HP ditemukan, tetapi koordinat toko belum valid')
      return
    }
    setJarak(hitungJarak(userLoc.lat, userLoc.lng, latTokoFinal, lngTokoFinal))
  }, [userLoc, latTokoFinal, lngTokoFinal])

  // Tombol manual (aksi pengguna -> Chrome lebih mau menampilkan prompt)
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
        console.error('GPS Error:', err.code, err.message)
        setStatusGPS(pesanErrorGPS(err))
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    )
  }

  // ---------- Data turunan ----------
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
          toast.error('❌ Maaf, antrian saat ini sedang DITUTUP oleh Admin. Anda tidak dapat masuk antrian.')
          return
        }

        // ====================================================================
        // CEK LOCK: timer hukuman mulai SAAT konfirmasi kehadiran ini
        // ====================================================================
        const lockRef = ref(db, `toko/${TOKO_ID}/lockPromotor/${clean}`)
        const lockSnap = await get(lockRef)
        if (lockSnap.exists()) {
          const l = lockSnap.val()
          if (l.locked) {
            // a) Belum pernah mulai → MULAI TIMER SEKARANG
            if (!l.lockStarted) {
              const mulai = Date.now()
              const selesai = mulai + (Number(l.durasiMenit) || 60) * 60000
              await update(lockRef, {
                lockStarted: true,
                waktuMulaiLock: mulai,
                waktuSelesaiLock: selesai,
              })
              // ⬇️ KUNCI PERBAIKAN: set state lokal SEKARANG supaya layar merah
              // langsung muncul tanpa menunggu listener onValue Firebase.
              const lockBaru = {
                ...l,
                lockStarted: true,
                waktuMulaiLock: mulai,
                waktuSelesaiLock: selesai,
              }
              setLockData(lockBaru)
              const mAwal = Math.floor((selesai - mulai) / 60000)
              setSisaWaktu(`${mAwal}:00`)
              toast.error(`🔒 Akun Anda dikunci. Alasan: ${l.alasan || '-'}. Timer ${Number(l.durasiMenit) || 60} menit dimulai sekarang.`)
              return
            }

            // b) Sudah pernah mulai → cek sisa
            const now = Date.now()
            const expired = Number(l.waktuSelesaiLock) || 0
            if (expired === 0 || now < expired) {
              setLockData(l) // pastikan state sinkron
              toast.error(`🔒 Akun Anda dikunci. Alasan: ${l.alasan || '-'}`)
              return
            }
            // Sudah expired → hapus lock, lanjut check-in
            await remove(lockRef)
          }
        }
        // ====================================================================

        const checkinRef = ref(db, `toko/${TOKO_ID}/checkinHarian/${clean}/${getTanggalKey()}`)
        const checkinSnap = await get(checkinRef)

        let waktuStandbyFinal: number
        if (checkinSnap.exists()) {
          waktuStandbyFinal = checkinSnap.val().waktu
        } else {
          waktuStandbyFinal = Date.now()
          await set(checkinRef, { nama: userData.nama, tanggal: tglIndo, tanggalKey: getTanggalKey(), waktu: waktuStandbyFinal })
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
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'BawaCustomer', waktu: Date.now(), tanggal: tglIndo, waktuMulai: Date.now() })
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
          await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'BawaCustomer', waktu: waktuMulai, waktuMulai, waktuSelesai: now, tanggal: tglIndo, hasil, durasiDetik: Math.floor((now - waktuMulai) / 1000) })
        }
        toast.success(`Berhasil disimpan: ${hasil}`)
        setShowClosing(false)
      } else if (aksi === 'Ibadah') {
        const posisi = posisiStandby()
        await update(ref(db, pathAntrian), { status: 'Ibadah', posisiTerkunci: posisi, waktuStandbySebelumIbadah: dataSaya?.waktuStandby || Date.now() })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'MulaiIbadah', waktu: Date.now(), tanggal: tglIndo, kategori: 'Ibadah', posisi })
        toast.info('Waktu Ibadah dimulai.')
      } else if (aksi === 'KembaliIbadah') {
        const posisiLama = dataSaya?.posisiTerkunci || 0
        const waktuStandbyKembali = dataSaya?.waktuStandbySebelumIbadah || dataSaya?.waktuStandby || Date.now()
        await update(ref(db, pathAntrian), { status: 'Standby', posisiTerkunci: 0, waktuStandby: waktuStandbyKembali })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'SelesaiIbadah', waktu: Date.now(), tanggal: tglIndo, kategori: 'Ibadah', posisi: posisiLama })
        toast.success('Kembali ke antrian.')
      } else if (aksi === 'PanggilCS') {
        const posisi = posisiStandby()
        await update(ref(db, pathAntrian), { status: 'Dipanggil CS', posisiTerkunci: posisi, waktuStandbySebelumCS: dataSaya?.waktuStandby || Date.now() })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'PanggilCS', waktu: Date.now(), tanggal: tglIndo })
        toast.info('Dipanggil ke CS/Gudang.')
      } else if (aksi === 'KembaliCS') {
        const waktuStandbyKembali = dataSaya?.waktuStandbySebelumCS || dataSaya?.waktuStandby || Date.now()
        await update(ref(db, pathAntrian), { status: 'Standby', waktuStandby: waktuStandbyKembali, posisiTerkunci: 0 })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'KembaliAntriDariCS', waktu: Date.now(), tanggal: tglIndo })
        toast.success('Kembali ke antrian.')
      } else if (aksi === 'Keluar') {
        await remove(ref(db, pathAntrian))
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'KeluarAntrian', waktu: Date.now(), tanggal: tglIndo, hasil: 'Manual' })
        toast.success('Anda keluar dari antrian.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Terjadi kesalahan.')
    } finally {
      setIsProcessing(false)
    }
  }

  const aktivitasSaya = aktivitasHariIni.filter(a => a.nama.toLowerCase() === userData?.nama.toLowerCase())
  const listBawaSaya = aktivitasSaya.filter(a => a.aksi === 'BawaCustomer' && a.tanggal === hariIniIndo)
  const totalDeal = listBawaSaya.filter(a => a.hasil === 'Deal').length
  const totalLihat = listBawaSaya.filter(a => a.hasil === 'Lihat').length
  const listIbadahSaya = aktivitasSaya.filter(a => (a.aksi === 'MulaiIbadah' || a.aksi === 'SelesaiIbadah') && a.tanggal === hariIniIndo)
  const listKeluarSaya = aktivitasSaya.filter(a => a.aksi === 'KeluarAntrian' && a.tanggal === hariIniIndo)

  const rekapBulananMap = aktivitasHariIni
    .filter(a => a.nama.toLowerCase() === userData?.nama.toLowerCase() && a.aksi === 'BawaCustomer' && a.waktu)
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

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="bg-white text-rose-600 font-bold py-3.5 px-8 rounded-xl shadow-lg hover:bg-rose-50 transition active:scale-95 text-sm uppercase tracking-wide"
        >
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

      <AppHeader
        storeName="UFO Malang Kebonsari"
        isOpen={!antrianTutup}
        onLogout={() => setShowLogoutConfirm(true)}
        onToggleTheme={toggleTheme}
        isDark={isDark}
      />

      <main className="flex-1 px-4 pt-4 pb-28 space-y-6">

        <PromoterCard name={userData.nama} />

        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Giliran saat ini</h2>
          <div className="grid grid-cols-2 gap-3">
            <TurnCard type="HA" label="Home Appliance" holder={listHA.length > 0 ? listHA[0].nama : null} />
            <TurnCard type="AV" label="Audio Video" holder={listAV.length > 0 ? listAV[0].nama : null} />
          </div>
        </section>

        {/* STATUS: OFFLINE / KONFIRMASI KEHADIRAN */}
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

                <button
                  onClick={() => handleAksi('CheckIn')}
                  disabled={isProcessing || antrianTutup || !dalamRadius}
                  className="w-full py-4 bg-primary text-primary-foreground font-black rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                >
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
                    <div className={`mt-2 p-2 rounded-lg text-center text-xs font-bold ${
                      jarak === null
                        ? 'bg-amber-500/10 text-amber-600'
                        : dalamRadius
                          ? 'bg-accent/15 text-accent'
                          : 'bg-destructive/15 text-destructive'
                    }`}>
                      {jarak !== null
                        ? dalamRadius
                          ? `✓ Di dalam radius (${jarak.toFixed(0)}m)`
                          : `⚠️ Di luar radius (${jarak.toFixed(0)}m)`
                        : statusGPS}
                    </div>

                    <button
                      type="button"
                      onClick={mintaIzinGPS}
                      className="w-full mt-2 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
                    >
                      <MapPin className="w-4 h-4 inline mr-2" />
                      AKTIFKAN / COBA GPS LAGI
                    </button>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-secondary rounded-xl text-center text-xs text-muted-foreground">GPS toko belum diatur di admin.</div>
                )}

                <KategoriPicker value={kategoriPilih} onChange={setKategoriPilih} />

                <button
                  onClick={() => handleAksi('CheckIn')}
                  disabled={isProcessing || antrianTutup || !dalamRadius}
                  className="w-full py-4 bg-primary text-primary-foreground font-black rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-primary-foreground" />}
                  {isProcessing ? 'Memproses...' : antrianTutup ? 'ANTRIAN DITUTUP' : !dalamRadius ? 'DI LUAR RADIUS' : 'KONFIRMASI KEHADIRAN'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* STATUS: STANDBY */}
        {statusSaya === 'Standby' && (
          <div className="bg-card rounded-3xl p-6 text-center shadow-xl border border-border relative overflow-hidden">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] relative z-10">Nomor Antrian Anda</p>
            <div className="text-8xl font-black text-foreground my-2 tracking-tighter relative z-10">
              {(() => {
                const listKategoriSaya = dataSaya?.kategori === 'AV' ? listAV : listHA
                const posisi = listKategoriSaya
                  .filter(a => a.status === 'Standby' || a.status === 'Melayani')
                  .findIndex(a => a.nama.toLowerCase() === userData.nama.toLowerCase()) + 1
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

        {/* STATUS: MELAYANI */}
        {statusSaya === 'Melayani' && (
          <div className="bg-blue-600 rounded-3xl p-8 text-center text-white shadow-xl shadow-blue-500/20">
            <h2 className="text-2xl font-black mb-2 uppercase">Sedang Melayani</h2>
            <p className="text-xs text-blue-100 mb-8">Berikan pelayanan terbaik!</p>
            <button onClick={() => handleAksi('Selesai')} className="w-full py-4 bg-white text-blue-700 font-black rounded-xl shadow-lg flex justify-center items-center gap-2 active:scale-95 transition-all"><ArrowRight className="w-5 h-5" /> SELESAI MELAYANI</button>
          </div>
        )}

        {/* STATUS: DIPANGGIL CS */}
        {statusSaya === 'Dipanggil CS' && (
          <div className="bg-purple-600 rounded-3xl p-8 text-center text-white shadow-xl shadow-purple-500/20">
            <Package className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-black mb-2 uppercase">Dipanggil CS/GUDANG</h2>
            <p className="text-xs text-purple-100 mb-8">Posisi #{dataSaya?.posisiTerkunci || '-'} Anda aman terkunci.</p>
            <button onClick={() => handleAksi('KembaliCS')} className="w-full py-4 bg-white text-purple-700 font-black rounded-xl shadow-lg active:scale-95 transition-all">KEMBALI ANTRI</button>
          </div>
        )}

        {/* STATUS: IBADAH */}
        {statusSaya === 'Ibadah' && (
          <div className="bg-amber-500 rounded-3xl p-8 text-center text-white shadow-xl shadow-amber-500/20 relative overflow-hidden">
            <MosqueIcon className="w-12 h-12 mx-auto mb-4 relative z-10" />
            <h2 className="text-2xl font-black mb-2 uppercase relative z-10">Sedang Ibadah</h2>
            <p className="text-xs text-amber-100 mb-8 relative z-10">Posisi #{dataSaya?.posisiTerkunci || '-'} Anda aman terkunci.</p>
            <button onClick={() => handleAksi('KembaliIbadah')} className="w-full py-4 bg-white text-amber-700 font-black rounded-xl shadow-lg active:scale-95 transition-all relative z-10">SELESAI IBADAH</button>
          </div>
        )}

        {/* LIVE URUTAN ANTRIAN */}
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
                  <span className="text-[10px] font-bold bg-secondary text-muted-foreground px-2.5 py-1 rounded-md">
                    {listStandby.length} Antri
                  </span>
                </div>

                <div className="space-y-2">
                  {list.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2">Belum ada antrian</p>
                  ) : (
                    list.map((item, idx) => {
                      const isSaya = item.nama.toLowerCase() === userData?.nama.toLowerCase()
                      const isGiliranUtama = item.status === 'Standby' && listStandby.findIndex(a => a.nama === item.nama) === 0

                      return (
                        <div key={item._key || idx} className={`flex justify-between items-center p-3 rounded-xl transition-colors ${
                          isSaya
                            ? 'bg-white dark:bg-primary/20 text-slate-900 dark:text-primary border border-slate-200 dark:border-primary/30 shadow-sm'
                            : 'bg-white dark:bg-secondary/50 text-slate-900 dark:text-foreground border border-slate-200 dark:border-border/60 shadow-sm'
                        }`}>
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black ${isGiliranUtama ? 'bg-rose-500 text-white' : 'bg-secondary text-muted-foreground'}`}>
                              {item.status === 'Melayani' ? '-' : (idx + 1)}
                            </span>
                            <span className={`text-xs font-bold uppercase ${isSaya ? 'text-slate-900 dark:text-primary' : 'text-slate-900 dark:text-foreground'}`}>
                              {item.nama} {isSaya && '(Anda)'}
                            </span>
                          </div>

                          {item.status === 'Melayani' ? (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-blue-600 dark:bg-blue-500/20 text-white dark:text-blue-400">Melayani</span>
                          ) : item.status === 'Dipanggil CS' ? (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-purple-600 dark:bg-purple-500/20 text-white dark:text-purple-400">Dipanggil CS/GUDANG</span>
                          ) : item.status === 'Ibadah' ? (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-amber-500 dark:bg-amber-500/20 text-white dark:text-amber-400">Ibadah</span>
                          ) : isGiliranUtama ? (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-rose-500 text-white animate-pulse">Utama</span>
                          ) : (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-slate-200 dark:bg-secondary text-slate-800 dark:text-muted-foreground">Standby</span>
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

       {/* MENU AKTIVITAS HARI INI & REKAP BULANAN */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden mt-6 shadow-sm">
          <button 
            onClick={() => setIsAktivitasOpen(!isAktivitasOpen)} 
            className="w-full flex justify-between items-center p-5 hover:bg-secondary/50 transition"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Aktivitas & Riwayat</h3>
                <p className="text-[11px] text-muted-foreground">Log kehadiran, pelayanan, & rekap</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isAktivitasOpen ? 'rotate-180' : ''}`} />
          </button>

          {isAktivitasOpen && (
            <div className="p-5 border-t border-border space-y-6 bg-secondary/20">
              
              {/* 1. Status Check-in Hari Ini */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Status Check-in Hari Ini
                </p>
                <div className="bg-card border border-border rounded-2xl p-3.5 flex justify-between items-center shadow-xs">
                  {jamCheckin ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Sudah Check-in</span>
                      </div>
                      <span className="text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg">
                        Jam {formatJam(jamCheckin)}
                      </span>
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-muted-foreground italic">Belum melakukan check-in hari ini</span>
                      <span className="text-[10px] font-bold bg-rose-500/10 text-rose-500 px-2.5 py-1 rounded-lg">Offline</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Log Bawa Customer Hari Ini */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-cyan-500" /> Log Pelayanan Customer
                  </p>
                  <div className="flex gap-1.5">
                    <span className="text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                      Deal: {totalDeal}
                    </span>
                    <span className="text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md">
                      Lihat: {totalLihat}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {listBawaSaya.length === 0 ? (
                    <div className="text-center py-6 bg-card border border-dashed border-border rounded-2xl">
                      <p className="text-xs text-muted-foreground italic">Belum ada riwayat melayani customer hari ini</p>
                    </div>
                  ) : (
                    listBawaSaya.map((a, i) => {
                      const durasiMenit = a.durasiDetik ? Math.floor(a.durasiDetik / 60) : null
                      return (
                        <div key={a._key || i} className="bg-card border border-border rounded-2xl p-3 flex justify-between items-center shadow-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                                a.hasil === 'Deal' 
                                  ? 'bg-emerald-500 text-white' 
                                  : a.hasil === 'Lihat' 
                                    ? 'bg-amber-500 text-white' 
                                    : 'bg-blue-500 text-white'
                              }`}>
                                {a.hasil || 'Proses'}
                              </span>
                              <span className="text-xs font-bold text-foreground">
                                {formatJam(a.waktuMulai || a.waktu)} - {a.waktuSelesai ? formatJam(a.waktuSelesai) : 'Berlangsung'}
                              </span>
                            </div>
                            {durasiMenit !== null && (
                              <p className="text-[10px] text-muted-foreground pl-0.5">
                                Durasi: <span className="font-semibold text-foreground">{durasiMenit} menit</span> ({a.durasiDetik} detik)
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
                            {a.tanggal}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* 3. Log Ibadah & Lainnya */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MosqueIcon className="w-4 h-4 text-amber-500" /> Log Ibadah & Keluar Antri
                </p>
                <div className="space-y-2">
                  {listIbadahSaya.length === 0 && listKeluarSaya.length === 0 ? (
                    <div className="text-center py-4 bg-card border border-dashed border-border rounded-2xl">
                      <p className="text-xs text-muted-foreground italic">Tidak ada catatan istirahat/ibadah</p>
                    </div>
                  ) : (
                    <>
                      {listIbadahSaya.map((a, i) => (
                        <div key={a._key || i} className="bg-card border border-border rounded-2xl p-3 flex justify-between items-center text-xs shadow-xs">
                          <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            {a.aksi === 'MulaiIbadah' ? 'Mulai Ibadah' : 'Selesai Ibadah'}
                          </span>
                          <span className="font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded-lg">{formatJam(a.waktu)}</span>
                        </div>
                      ))}
                      {listKeluarSaya.map((a, i) => (
                        <div key={a._key || i} className="bg-card border border-border rounded-2xl p-3 flex justify-between items-center text-xs shadow-xs">
                          <span className="font-bold text-rose-500 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            Keluar Antrian
                          </span>
                          <span className="font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded-lg">{formatJam(a.waktu)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* 4. Rekap Total Bulanan */}
              <div className="pt-3 border-t border-border/60 space-y-2.5">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-primary" /> Rekap Total Bulanan
                </p>
                <div className="space-y-2">
                  {listRekapBulanan.length === 0 ? (
                    <div className="text-center py-4 bg-card border border-dashed border-border rounded-2xl">
                      <p className="text-xs text-muted-foreground italic">Belum ada rekap bulanan</p>
                    </div>
                  ) : (
                    listRekapBulanan.map((rekap: any, idx: number) => (
                      <div key={idx} className="bg-card border border-border rounded-2xl p-3.5 flex justify-between items-center text-xs shadow-xs">
                        <span className="font-black text-foreground">{rekap.label}</span>
                        <div className="flex gap-2">
                          <span className="font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg">
                            Deal: {rekap.deal}
                          </span>
                          <span className="font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-lg">
                            Lihat: {rekap.lihat}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><LogOut className="w-4 h-4" /> Keluar Antrian</p>
                <div className="space-y-2">
                  {listKeluarSaya.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic px-1">Belum ada</p>
                  ) : (
                    listKeluarSaya.map((a, i) => (
                      <div key={a._key || i} className="bg-secondary rounded-xl p-3 text-sm flex justify-between items-center">
                        <span className="text-foreground font-bold">Keluar</span>
                        <span className="text-muted-foreground font-medium">{formatJam(a.waktu)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* REKAP TOTAL BULANAN */}
              <div className="pt-2 border-t border-border/60">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-1"><CalendarDays className="w-4 h-4" /> Rekap Total Bulanan</p>
                <div className="space-y-2">
                  {listRekapBulanan.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic px-1">Belum ada riwayat rekap bulanan</p>
                  ) : (
                    listRekapBulanan.map((rekap: any, idx: number) => (
                      <div key={idx} className="bg-secondary rounded-xl p-3 flex justify-between items-center text-sm">
                        <span className="font-bold text-foreground block">{rekap.label}</span>
                        <div className="flex gap-2">
                          <span className="text-xs font-bold bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded">Deal: {rekap.deal}</span>
                          <span className="text-xs font-bold bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">Lihat: {rekap.lihat}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* MODAL CLOSING */}
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