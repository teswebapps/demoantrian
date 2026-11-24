'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, get, set, remove, update, push, onValue } from 'firebase/database'
import { auth, db } from '@/lib/firebase'
import { toast } from 'sonner'
import { useTheme } from '@/hooks/useTheme'
import { useAutoReset } from '@/hooks/useAutoReset'
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
const normKategori = (kat: any): 'HA' | 'AV' =>
  String(kat || '').trim().toUpperCase() === 'AV' ? 'AV' : 'HA'

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

const DEFAULT_TOKO_ID = process.env.NEXT_PUBLIC_TOKO_ID || 'default-toko'
const DEFAULT_NAMA_TOKO = process.env.NEXT_PUBLIC_NAMA_TOKO || 'TOKO'

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
  const [tahunIni, setTahunIni] = useState<number>(0)
  const [isAktivitasOpen, setIsAktivitasOpen] = useState(true)
  const [nowTick, setNowTick] = useState<number>(0)

  const [openCollapse, setOpenCollapse] = useState<{ [key: string]: boolean }>({
    checkin: false,
    bawa: false,
    ibadah: false,
    cs: false,
    keluar: false,
    autokick: false,
    rekap: false,
    bulanan: false,
  })

  const toggleCollapse = (menu: string) => {
    setOpenCollapse((prev) => ({ ...prev, [menu]: !prev[menu] }))
  }

  const TOKO_ID = userData?.tokoId || DEFAULT_TOKO_ID
  useAutoReset(userData ? TOKO_ID : undefined)

  const namaTokoAktif =
    typeof setting?.namaToko === 'string' && setting.namaToko.trim()
      ? setting.namaToko.trim()
      : DEFAULT_NAMA_TOKO
  const latTokoFinal = Number(setting?.latToko || setting?.lat || 0)
  const lngTokoFinal = Number(setting?.lngToko || setting?.lng || 0)
  const radiusFinal = Number(setting?.radiusToko || setting?.radiusMaks || 50) || 50

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setHariIniIndo(getTanggalIndo(now))
      setTodayKey(getTanggalKey(now))
      setTahunIni(now.getFullYear())
      setNowTick(Date.now())
    }
    update()
    const t = setInterval(update, 30_000)
    return () => clearInterval(t)
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
          setUserData({ nama: data.nama, email: user.email, tokoId: data.tokoId || DEFAULT_TOKO_ID })
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

  const dataSaya = antrian.find(a => a.nama.toLowerCase() === userData?.nama.toLowerCase())
  const statusSaya = dataSaya ? dataSaya.status : 'Offline'
  const listHA = antrian.filter(a => normKategori(a.kategori ?? a.subkategori) === 'HA')
  const listAV = antrian.filter(a => normKategori(a.kategori ?? a.subkategori) === 'AV')
  const giliranHA = listHA.find(a => a.status === 'Standby') || null
  const giliranAV = listAV.find(a => a.status === 'Standby') || null

  const posisiStandby = () => {
    const kat = normKategori(dataSaya?.kategori ?? dataSaya?.subkategori)
    const listStandby = antrian
      .filter(i => i.status === 'Standby' && normKategori(i.kategori ?? i.subkategori) === kat)
      .sort((a, b) => (a.waktuStandby || 0) - (b.waktuStandby || 0))
    return listStandby.findIndex(i => i.nama.toLowerCase() === userData.nama.toLowerCase()) + 1
  }

  const handleAksi = async (aksi: string, hasil: string = '') => {
    if (!userData) return
    setIsProcessing(true)
    const clean = cleanNama(userData.nama)
    const tglIndo = getTanggalIndo()
    const tKeyAktif = todayKey || getTanggalKey()
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
              toast.error(`🔒 Akun Anda dikunci. Hubungi Admin. Alasan: ${l.alasan || '-'}`)
              return
            }

            const now = Date.now()
            const expired = Number(l.waktuSelesaiLock) || 0
            if (expired === 0 || now < expired) {
              setLockData(l)
              toast.error(`🔒 Akun Anda dikunci. Hubungi Admin. Alasan: ${l.alasan || '-'}`)
              return
            }
            await remove(lockRef)
          }
        }

        const checkinRef = ref(db, `toko/${TOKO_ID}/checkinHarian/${clean}/${tKeyAktif}`)
        const checkinSnap = await get(checkinRef)
        const nowTs = Date.now()
        const katDipilih = normKategori(kategoriPilih)

        const antrianSnap = await get(ref(db, `toko/${TOKO_ID}/antrian`))
        const antrianVal = antrianSnap.val() || {}
        const maxWaktuStandbyKategori = Object.keys(antrianVal)
          .filter((k) => {
            const item = antrianVal[k]
            return item && item.nama && normKategori(item.kategori ?? item.subkategori) === katDipilih && String(item.nama).trim().toLowerCase() !== String(userData.nama).trim().toLowerCase()
          })
          .reduce((max, k) => Math.max(max, Number(antrianVal[k].waktuStandby) || 0), 0)

        const waktuStandbyFinal = Math.max(nowTs, maxWaktuStandbyKategori + 1)

        if (!checkinSnap.exists()) {
          await set(checkinRef, {
            nama: userData.nama,
            tanggal: tglIndo,
            tanggalKey: tKeyAktif,
            waktu: nowTs,
            kategoriAwal: katDipilih,
          })
        } else if (!checkinSnap.val()?.kategoriAwal) {
          await update(checkinRef, {
            kategoriAwal: katDipilih,
          })
        }

        await set(ref(db, pathAntrian), {
          nama: userData.nama,
          status: 'Standby',
          waktuStandby: waktuStandbyFinal,
          waktuMasukAntrian: nowTs,
          kategori: katDipilih,
          subkategori: katDipilih,
          posisiTerkunci: 0,
        })
        toast.success('Berhasil Masuk Antrian!')
      } else if (aksi === 'BawaCustomer') {
        await update(ref(db, pathAntrian), { status: 'Melayani', posisiTerkunci: 0, waktuMulaiMelayani: Date.now() })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'BawaCustomer', waktu: Date.now(), tanggal: tglIndo, tanggalKey: tKeyAktif, waktuMulai: Date.now() })
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
          await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'BawaCustomer', waktu: waktuMulai, tanggal: tglIndo, tanggalKey: tKeyAktif, waktuMulai, waktuSelesai: now, hasil, durasiDetik: Math.floor((now - waktuMulai) / 1000) })
        }
        toast.success(`Berhasil disimpan: ${hasil}`)
        setShowClosing(false)
      } else if (aksi === 'Ibadah') {
        const posisi = posisiStandby()
        const now = Date.now()
        await update(ref(db, pathAntrian), { status: 'Ibadah', posisiTerkunci: posisi, waktuStandbySebelumIbadah: dataSaya?.waktuStandby || now, waktuMulaiIbadah: now })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'MulaiIbadah', waktu: now, waktuMulai: now, tanggal: tglIndo, tanggalKey: tKeyAktif, kategori: 'Ibadah', posisi })
        toast.info('Waktu Ibadah dimulai.')
      } else if (aksi === 'KembaliIbadah') {
        const posisiLama = dataSaya?.posisiTerkunci || 0
        const waktuStandbyKembali = dataSaya?.waktuStandbySebelumIbadah || dataSaya?.waktuStandby || Date.now()
        const now = Date.now()
        const snapAkt = await get(ref(db, pathStatistik))
        const dataAkt = snapAkt.val() || {}
        const ibadahBelumSelesai = Object.keys(dataAkt)
          .filter((key) => String(dataAkt[key].nama || '').trim().toLowerCase() === userData.nama.trim().toLowerCase() && (dataAkt[key].aksi === 'MulaiIbadah' || dataAkt[key].aksi === 'Ibadah') && !dataAkt[key].waktuSelesai)
          .map((key) => ({ _key: key, ...dataAkt[key] }))
          .sort((a: any, b: any) => (b.waktu || 0) - (a.waktu || 0))
        const targetIbadah = ibadahBelumSelesai[0]
        const waktuMulaiIb = Number(targetIbadah?.waktuMulai || targetIbadah?.waktu || dataSaya?.waktuMulaiIbadah || now)

        await update(ref(db, pathAntrian), { status: 'Standby', posisiTerkunci: 0, waktuStandby: waktuStandbyKembali, waktuMulaiIbadah: null })
        if (targetIbadah && targetIbadah._key) {
          await update(ref(db, `${pathStatistik}/${targetIbadah._key}`), {
            waktuSelesai: now,
            durasiDetik: Math.max(0, Math.floor((now - waktuMulaiIb) / 1000)),
            posisiSelesai: posisiLama,
          })
        } else {
          await push(ref(db, pathStatistik), {
            nama: userData.nama,
            aksi: 'MulaiIbadah',
            waktu: waktuMulaiIb,
            waktuMulai: waktuMulaiIb,
            waktuSelesai: now,
            durasiDetik: Math.max(0, Math.floor((now - waktuMulaiIb) / 1000)),
            tanggal: tglIndo,
            tanggalKey: tKeyAktif,
            kategori: 'Ibadah',
            posisi: posisiLama,
          })
        }
        toast.success('Kembali ke antrian.')
      } else if (aksi === 'PanggilCS') {
        const posisi = posisiStandby()
        const now = Date.now()
        await update(ref(db, pathAntrian), {
          status: 'Dipanggil CS',
          posisiTerkunci: posisi,
          waktuStandbySebelumCS: dataSaya?.waktuStandby || now,
          waktuMulaiCS: now,
        })
        await push(ref(db, pathStatistik), {
          nama: userData.nama,
          aksi: 'PanggilCS',
          waktu: now,
          waktuMulai: now,
          tanggal: tglIndo,
          tanggalKey: tKeyAktif,
          kategori: 'DipanggilCS',
          posisi,
        })
        toast.info('Dipanggil ke CS/Gudang.')
      } else if (aksi === 'KembaliCS') {
        const posisiLama = dataSaya?.posisiTerkunci || 0
        const waktuStandbyKembali = dataSaya?.waktuStandbySebelumCS || dataSaya?.waktuStandby || Date.now()
        const now = Date.now()
        const snapAkt = await get(ref(db, pathStatistik))
        const dataAkt = snapAkt.val() || {}
        const csBelumSelesai = Object.keys(dataAkt)
          .filter(
            (key) =>
              String(dataAkt[key].nama || '').trim().toLowerCase() === userData.nama.trim().toLowerCase() &&
              dataAkt[key].aksi === 'PanggilCS' &&
              !dataAkt[key].waktuSelesai
          )
          .map((key) => ({ _key: key, ...dataAkt[key] }))
          .sort((a: any, b: any) => (b.waktu || 0) - (a.waktu || 0))
        const targetCS = csBelumSelesai[0]
        const waktuMulaiCS = Number(targetCS?.waktuMulai || targetCS?.waktu || dataSaya?.waktuMulaiCS || now)

        await update(ref(db, pathAntrian), {
          status: 'Standby',
          waktuStandby: waktuStandbyKembali,
          posisiTerkunci: 0,
          waktuMulaiCS: null,
        })
        if (targetCS && targetCS._key) {
          await update(ref(db, `${pathStatistik}/${targetCS._key}`), {
            waktuSelesai: now,
            durasiDetik: Math.max(0, Math.floor((now - waktuMulaiCS) / 1000)),
            posisiSelesai: posisiLama,
          })
        } else {
          await push(ref(db, pathStatistik), {
            nama: userData.nama,
            aksi: 'PanggilCS',
            waktu: waktuMulaiCS,
            waktuMulai: waktuMulaiCS,
            waktuSelesai: now,
            durasiDetik: Math.max(0, Math.floor((now - waktuMulaiCS) / 1000)),
            tanggal: tglIndo,
            tanggalKey: tKeyAktif,
            kategori: 'DipanggilCS',
            posisi: posisiLama,
          })
        }
        toast.success('Kembali ke antrian.')
      } else if (aksi === 'Keluar') {
        await remove(ref(db, pathAntrian))
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'KeluarAntrian', waktu: Date.now(), tanggal: tglIndo, tanggalKey: tKeyAktif, hasil: 'Manual' })
        toast.success('Anda keluar dari antrian.')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan.')
    } finally {
      setIsProcessing(false)
    }
  }

  const aktivitasHariIni = statistikList.filter(a => {
    const isPromotorSama = String(a.nama || '').trim().toLowerCase() === String(userData?.nama || '').trim().toLowerCase()
    const isHariIni = (a.tanggalKey && a.tanggalKey === todayKey) || (a.tanggal && a.tanggal === hariIniIndo)
    return isPromotorSama && isHariIni
  })

  const riwayatCheckinSaya = aktivitasHariIni
    .filter(a => a.aksi === 'CheckIn')
    .map(a => Number(a.waktu || a.waktuMulai || 0))
    .filter(ts => ts > 0)
    .concat(jamCheckin ? [Number(jamCheckin)] : [])
    .filter((ts, idx, arr) => arr.indexOf(ts) === idx)
    .sort((a, b) => b - a)

  const listBawaSaya = aktivitasHariIni
    .filter(a => a.aksi === 'BawaCustomer')
    .sort((a, b) => Number(b.waktuMulai || b.waktu || 0) - Number(a.waktuMulai || a.waktu || 0))
  const totalDeal = listBawaSaya.filter(a => a.hasil === 'Deal').length
  const totalLihat = listBawaSaya.filter(a => a.hasil === 'Lihat').length

  const sesiIbadahSaya = (() => {
    const raw = aktivitasHariIni
      .filter(a => a.aksi === 'MulaiIbadah' || a.aksi === 'SelesaiIbadah' || a.aksi === 'Ibadah')
      .sort((a, b) => Number(a.waktuMulai || a.waktu || 0) - Number(b.waktuMulai || b.waktu || 0))
    const hasil: { waktuMulai: number; waktuSelesai?: number }[] = []
    for (const item of raw) {
      const t = Number(item.waktuMulai || item.waktu || 0)
      if (item.waktuSelesai) {
        hasil.push({ waktuMulai: t, waktuSelesai: Number(item.waktuSelesai) })
      } else if (item.aksi === 'MulaiIbadah' || item.aksi === 'Ibadah') {
        hasil.push({ waktuMulai: t })
      } else if (item.aksi === 'SelesaiIbadah') {
        const openIdx = hasil.findIndex(s => !s.waktuSelesai)
        if (openIdx !== -1) hasil[openIdx].waktuSelesai = t
        else hasil.push({ waktuMulai: t, waktuSelesai: t })
      }
    }
    return hasil.sort((a, b) => Number(b.waktuMulai || 0) - Number(a.waktuMulai || 0))
  })()

  const sesiCSSaya = (() => {
    const raw = aktivitasHariIni
      .filter(a => a.aksi === 'PanggilCS' || a.aksi === 'KembaliAntriDariCS')
      .sort((a, b) => Number(a.waktuMulai || a.waktu || 0) - Number(b.waktuMulai || b.waktu || 0))
    const hasil: { waktuMulai: number; waktuSelesai?: number }[] = []
    for (const item of raw) {
      const t = Number(item.waktuMulai || item.waktu || 0)
      if (item.waktuSelesai) {
        hasil.push({ waktuMulai: t, waktuSelesai: Number(item.waktuSelesai) })
      } else if (item.aksi === 'PanggilCS') {
        hasil.push({ waktuMulai: t })
      } else if (item.aksi === 'KembaliAntriDariCS') {
        const openIdx = hasil.findIndex(s => !s.waktuSelesai)
        if (openIdx !== -1) hasil[openIdx].waktuSelesai = t
        else hasil.push({ waktuMulai: t, waktuSelesai: t })
      }
    }
    return hasil.sort((a, b) => Number(b.waktuMulai || 0) - Number(a.waktuMulai || 0))
  })()

  const listKeluarSaya = aktivitasHariIni
    .filter(a => a.aksi === 'KeluarAntrian')
    .sort((a, b) => Number(b.waktu || b.waktuMulai || 0) - Number(a.waktu || a.waktuMulai || 0))

  const listAutokickSaya = aktivitasHariIni
    .filter(a => a.aksi === 'Autokick' || a.aksi === 'AutoKick')
    .sort((a, b) => Number(b.waktu || b.waktuMulai || 0) - Number(a.waktu || a.waktuMulai || 0))

  const rekapBulananMap = statistikList
    .filter(a => {
      if (!tahunIni) return false
      if (a.aksi !== 'BawaCustomer' || !a.waktu) return false
      const d = new Date(a.waktu)
      if (d.getFullYear() !== tahunIni) return false
      return String(a.nama || '').trim().toLowerCase() === String(userData?.nama || '').trim().toLowerCase()
    })
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

  const formatJam = (ts: number) => {
    if (!ts) return '-'
    const d = new Date(ts)
    return `${pad(d.getHours())}.${pad(d.getMinutes())}`
  }

  const formatJamDetik = (ts: number) => {
    if (!ts) return '-'
    const d = new Date(ts)
    return `${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`
  }

  if (isLoading || !mounted || isLoadingCheckin) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  }

  if (!userData) {
    if (typeof window !== 'undefined') window.location.href = '/'
    return null
  }

  if (lockData?.locked) {
    const expired = Number(lockData.waktuSelesaiLock) || 0
    const acuanWaktu = nowTick || expired
    const sisa = expired - acuanWaktu
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
              <p className="text-xs text-rose-100 font-medium mt-3">
                Silakan hubungi Admin untuk membuka kunci akun Anda.
              </p>
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
      <AppHeader storeName={namaTokoAktif} isOpen={!antrianTutup} onLogout={() => setShowLogoutConfirm(true)} onToggleTheme={toggleTheme} isDark={isDark} />

      <main className="flex-1 px-4 pt-4 pb-28 space-y-6">
        <PromoterCard name={userData.nama} />

        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Giliran saat ini</h2>
          <div className="grid grid-cols-2 gap-3">
            <TurnCard type="HA" label="Home Appliance" holder={giliranHA ? giliranHA.nama : null} />
            <TurnCard type="AV" label="Audio Video" holder={giliranAV ? giliranAV.nama : null} />
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
                const listKategoriSaya = normKategori(dataSaya?.kategori ?? dataSaya?.subkategori) === 'AV' ? listAV : listHA
                const posisi = listKategoriSaya.filter(a => a.status === 'Standby').findIndex(a => a.nama.toLowerCase() === userData.nama.toLowerCase()) + 1
                return posisi.toString().padStart(2, '0')
              })()}
            </div>
            <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-8 bg-primary/10 text-primary border border-primary/20 uppercase relative z-10">KATEGORI {normKategori(dataSaya?.kategori ?? dataSaya?.subkategori)}</div>
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
            const listAktifNomor = list.filter(a => a.status !== 'Melayani')

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
                      const nomorAktif = listAktifNomor.findIndex(a => a.nama === item.nama) + 1
                      return (
                        <div key={item._key || idx} className={`flex justify-between items-center p-3 rounded-xl transition-colors ${isSaya ? 'bg-white dark:bg-primary/20 text-slate-900 dark:text-primary border border-slate-200 dark:border-primary/30 shadow-sm' : 'bg-white dark:bg-secondary/50 text-slate-900 dark:text-foreground border border-slate-200 dark:border-border/60 shadow-sm'}`}>
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black ${isGiliranUtama ? 'bg-rose-500 text-white' : 'bg-white text-slate-900 border border-slate-200'}`}>
                              {item.status === 'Melayani' ? '-' : (nomorAktif > 0 ? nomorAktif : (idx + 1))}
                            </span>
                            <span className={`text-xs font-bold uppercase ${isSaya ? 'text-slate-900 dark:text-primary' : 'text-slate-900 dark:text-foreground'}`}>{item.nama} {isSaya && '(Anda)'}</span>
                          </div>
                          {item.status === 'Melayani' ? (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-emerald-500 text-white">Melayani</span>
                          ) : item.status === 'Dipanggil CS' ? (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-purple-600 text-white">Dipanggil CS / Gudang</span>
                          ) : item.status === 'Ibadah' ? (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-amber-500 text-white">Ibadah</span>
                          ) : isGiliranUtama ? (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-rose-500 text-white animate-pulse">Giliran Utama</span>
                          ) : (
                            <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-amber-500 text-white">Standby</span>
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
                      <p className="text-[11px] text-muted-foreground">{riwayatCheckinSaya.length > 0 ? `Jam ${formatJamDetik(riwayatCheckinSaya[0])}` : 'Belum check-in'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-emerald-500 text-white">{riwayatCheckinSaya.length > 0 ? '1' : '0'}</span>
                    {openCollapse.checkin ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {openCollapse.checkin && (
                  <div className="p-3 bg-secondary/80 border-t border-border text-xs space-y-1.5 mx-3 mb-3 rounded-xl">
                    {riwayatCheckinSaya.length === 0 ? (
                      <p className="text-muted-foreground">Anda belum melakukan check-in hari ini.</p>
                    ) : (
                      <div className="space-y-1">
                        {riwayatCheckinSaya.map((ts, idx) => (
                          <div key={idx} className="bg-background border border-border rounded-lg p-2 flex justify-between items-center">
                            <span className="font-medium text-emerald-600">Check-in</span>
                            <span className="font-bold text-foreground">Jam {formatJamDetik(ts)}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
                    {listBawaSaya.length === 0 ? (
                      <p className="text-muted-foreground italic">Belum ada riwayat membawa customer hari ini.</p>
                    ) : (
                      <div className="space-y-2">
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
                      <p className="text-[11px] text-muted-foreground">Catatan ibadah</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-amber-500 text-white">{sesiIbadahSaya.length}</span>
                    {openCollapse.ibadah ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {openCollapse.ibadah && (
                  <div className="p-3 bg-secondary/80 border-t border-border text-xs space-y-2 mx-3 mb-3 rounded-xl">
                    {sesiIbadahSaya.length === 0 ? (
                      <p className="text-muted-foreground italic">Belum ada catatan ibadah hari ini.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {sesiIbadahSaya.map((s, i) => (
                          <div key={i} className="bg-background border border-border rounded-lg p-2.5 flex justify-between items-center">
                            <span className="font-medium text-amber-600">Ibadah {sesiIbadahSaya.length > 1 ? `#${sesiIbadahSaya.length - i}` : ''}</span>
                            <span className="font-bold text-foreground">
                              {formatJam(s.waktuMulai)} - {s.waktuSelesai ? formatJam(s.waktuSelesai) : 'Berlangsung'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-secondary/50 border border-border/60 rounded-2xl overflow-hidden">
                <div onClick={() => toggleCollapse('cs')} className="p-4 flex justify-between items-center transition cursor-pointer hover:bg-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center"><Package className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide text-foreground">DIPANGGIL CS / GUDANG</h4>
                      <p className="text-[11px] text-muted-foreground">Catatan panggilan CS / Gudang</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-purple-600 text-white">{sesiCSSaya.length}</span>
                    {openCollapse.cs ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {openCollapse.cs && (
                  <div className="p-3 bg-secondary/80 border-t border-border text-xs space-y-2 mx-3 mb-3 rounded-xl">
                    {sesiCSSaya.length === 0 ? (
                      <p className="text-muted-foreground italic">Belum ada catatan dipanggil CS / Gudang hari ini.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {sesiCSSaya.map((s, i) => (
                          <div key={i} className="bg-background border border-border rounded-lg p-2.5 flex justify-between items-center">
                            <span className="font-medium text-purple-600">CS / Gudang {sesiCSSaya.length > 1 ? `#${sesiCSSaya.length - i}` : ''}</span>
                            <span className="font-bold text-foreground">
                              {formatJam(s.waktuMulai)} - {s.waktuSelesai ? formatJam(s.waktuSelesai) : 'Berlangsung'}
                            </span>
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
                      <p className="text-[11px] text-muted-foreground">Riwayat keluar manual & reset istirahat</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-rose-500 text-white">{listKeluarSaya.length}</span>
                    {openCollapse.keluar ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {openCollapse.keluar && (
                  <div className="p-3 bg-secondary/80 border-t border-border text-xs space-y-2 mx-3 mb-3 rounded-xl">
                    {listKeluarSaya.length === 0 ? (
                      <p className="text-muted-foreground italic">Tidak ada riwayat keluar antrian hari ini.</p>
                    ) : (
                      <div className="space-y-1">
                        {listKeluarSaya.map((a, i) => (
                          <div key={i} className="bg-background border border-border rounded-lg p-2.5 flex justify-between items-center">
                            <span className="font-medium text-rose-600">{a.hasil && a.hasil !== 'Manual' ? a.hasil : 'Keluar Antrian'}</span>
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
                    {listAutokickSaya.length === 0 ? (
                      <p className="text-muted-foreground italic">Tidak ada catatan autokick hari ini.</p>
                    ) : (
                      <div className="space-y-1">
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
                      <p className="text-[11px] text-muted-foreground">Akumulasi Deal & Lihat harian</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-purple-500 text-white">{listBawaSaya.length}</span>
                    {openCollapse.rekap ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {openCollapse.rekap && (
                  <div className="p-3 bg-secondary/80 border-t border-border text-xs space-y-2 mx-3 mb-3 rounded-xl">
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
                    {listRekapBulanan.length === 0 ? (
                      <p className="text-muted-foreground italic">Belum ada data rekap bulanan.</p>
                    ) : (
                      <div className="space-y-2">
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