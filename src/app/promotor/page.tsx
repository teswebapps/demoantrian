'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth'
import { ref, get, set, remove, update, push, onValue } from 'firebase/database'
import { auth, db, googleProvider } from '@/lib/firebase'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { useThemeMode } from '@/hooks/useThemeMode'
import { 
  Loader2, LogOut, ShieldCheck, Lock, Play, Package, 
  ArrowRight, Users, ListOrdered, TrendingUp, AlertCircle, Sun, Moon,
  History, BarChart3, Calendar, ChevronDown, X, MapPin, LogOut as LogOutIcon
} from 'lucide-react'

// === ICON MASJID CUSTOM ===
const MosqueIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2c-1.5 2-4 3-4 6 0 1.5.5 2.5 1 3H5v10h14V11h-4c.5-.5 1-1.5 1-3 0-3-2.5-4-4-6z" />
    <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
    <path d="M3 21h18" />
  </svg>
);

const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="w-full h-40 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 text-xs">Memuat Peta...</div>
})

const getTanggalIndo = (d?: Date) => {
  const now = d ? new Date(d) : new Date()
  return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`
}

const getTanggalKey = (d?: Date) => {
  const now = d ? new Date(d) : new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function PromotorPage() {
  const { isDark, toggleTheme, mounted } = useThemeMode()
  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [antrian, setAntrian] = useState<any[]>([])
  const [setting, setSetting] = useState<any>(null)
  const [lockData, setLockData] = useState<any>(null)
  const [sisaWaktu, setSisaWaktu] = useState('')
  const [userLoc, setUserLoc] = useState<any>(null)
  const [jarak, setJarak] = useState<number | null>(null)
  const [showClosing, setShowClosing] = useState(false)
  
  const [sudahCheckinHariIni, setSudahCheckinHariIni] = useState(false)
  const [isLoadingCheckin, setIsLoadingCheckin] = useState(true)
  const [todayKey, setTodayKey] = useState('')
  
  const [aktivitasHariIni, setAktivitasHariIni] = useState<any[]>([])
  const [isAktivitasOpen, setIsAktivitasOpen] = useState(false)
  const [popupType, setPopupType] = useState<string | null>(null)
  
  const [hariIniIndo, setHariIniIndo] = useState('')
  const [bulanIni, setBulanIni] = useState('')
  const [tahunIni, setTahunIni] = useState('')

  const TOKO_ID = userData?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    const d = new Date()
    setHariIniIndo(getTanggalIndo())
    setTodayKey(getTanggalKey())
    setBulanIni(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setTahunIni(String(d.getFullYear()))
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

  const handleLoginGoogle = async () => {
    try { await signInWithPopup(auth, googleProvider) } catch (err) { toast.error('Login gagal.') }
  }

  const handleLogout = async () => { await signOut(auth); setUserData(null) }

  useEffect(() => {
    if (!userData || !todayKey) return
    const clean = userData.nama.trim().toLowerCase().replace(/\s+/g, '_')
    const unsub = onValue(ref(db, `toko/${TOKO_ID}/checkinHarian/${clean}/${todayKey}`), (snap) => {
      setSudahCheckinHariIni(snap.exists())
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
        const clean = userData.nama.trim().toLowerCase().replace(/\s+/g, '_')
        const lockSaya = data[clean]
        if (lockSaya && lockSaya.locked) {
          const now = Date.now()
          const mulai = Number(lockSaya.waktuMulaiLock) || 0
          const expired = Number(lockSaya.waktuSelesaiLock) || 0
          if ((mulai === 0 || now >= mulai) && (expired === 0 || now < expired)) {
            setLockData(lockSaya)
          } else setLockData(null)
        } else setLockData(null)
      }
    })
    const unsubAktivitas = onValue(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setAktivitasHariIni(list)
    })
    return () => { unsubAntrian(); unsubSetting(); unsubLock(); unsubAktivitas(); }
  }, [TOKO_ID, userData])

  useEffect(() => {
    if (!lockData || !userData) return
    const interval = setInterval(() => {
      const expired = Number(lockData.waktuSelesaiLock) || 0
      if (expired === 0) { setSisaWaktu('∞'); return }
      const sisa = expired - Date.now()
      if (sisa <= 0) {
        setSisaWaktu('00:00')
        const clean = userData.nama.trim().toLowerCase().replace(/\s+/g, '_')
        remove(ref(db, `toko/${TOKO_ID}/lockPromotor/` + clean))
      } else {
        const m = Math.floor(sisa / 60000); const s = Math.floor((sisa % 60000) / 1000)
        setSisaWaktu(`${m}:${s.toString().padStart(2, '0')}`)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockData, userData, TOKO_ID])

  const hitungJarak = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2)
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
  }

  useEffect(() => {
    if (!setting?.latToko || !setting?.lngToko || !userData) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setJarak(hitungJarak(pos.coords.latitude, pos.coords.longitude, setting.latToko, setting.lngToko)) },
      () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [setting, userData])

  const dataSaya = antrian.find(a => a.nama.toLowerCase() === userData?.nama.toLowerCase())
  const statusSaya = dataSaya ? dataSaya.status : 'Offline'
  const listHA = antrian.filter(a => a.kategori === 'HA')
  const listAV = antrian.filter(a => a.kategori === 'AV')
  const totalAntri = antrian.filter(a => a.status === 'Standby').length
  const totalMelayani = antrian.filter(a => a.status === 'Melayani').length
  const posisiSaya = listHA.filter(a => a.status === 'Standby').findIndex(a => a.nama.toLowerCase() === userData?.nama.toLowerCase()) + 1

  const handleAksi = async (aksi: string, hasil: string = '') => {
    if (!userData) return
    setIsProcessing(true)
    const clean = userData.nama.trim().toLowerCase().replace(/\s+/g, '_')
    const tglIndo = getTanggalIndo()
    const pathAntrian = `toko/${TOKO_ID}/antrian/${clean}`
    const pathStatistik = `toko/${TOKO_ID}/statistikAktivitas`
    
    try {
      if (aksi === 'CheckIn') {
        const lockSnap = await get(ref(db, `toko/${TOKO_ID}/lockPromotor/${clean}`))
        if (lockSnap.exists()) {
          const l = lockSnap.val()
          const now = Date.now()
          const mulai = Number(l.waktuMulaiLock) || 0
          const expired = Number(l.waktuSelesaiLock) || 0
          if (l.locked && (mulai === 0 || now >= mulai) && (expired === 0 || now < expired)) {
            toast.error(`🔒 Akun Anda dikunci. Alasan: ${l.alasan || '-'}`)
            setIsProcessing(false)
            return
          }
        }
        const kat = 'HA'
        await set(ref(db, pathAntrian), { nama: userData.nama, status: 'Standby', waktuStandby: Date.now(), kategori: kat, subkategori: kat, posisiTerkunci: 0 })
        await set(ref(db, `toko/${TOKO_ID}/checkinHarian/${clean}/${getTanggalKey()}`), { nama: userData.nama, tanggal: tglIndo, tanggalKey: getTanggalKey(), waktu: Date.now() })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'CheckIn', waktu: Date.now(), tanggal: tglIndo, hasil: kat })
        toast.success('Berhasil Check-in!')
      } else if (aksi === 'BawaCustomer') {
        await update(ref(db, pathAntrian), { status: 'Melayani', posisiTerkunci: 0, waktuMulaiMelayani: Date.now() })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'BawaCustomer', waktu: Date.now(), tanggal: tglIndo, waktuMulai: Date.now() })
        toast.success('Status: Melayani Customer')
      } else if (aksi === 'Selesai') {
        setShowClosing(true); setIsProcessing(false); return
      } else if (aksi === 'SimpanClosing') {
        const waktuMulai = dataSaya?.waktuMulaiMelayani || Date.now()
        const now = Date.now()
        
        // Cari data aktivitas "BawaCustomer" yang belum selesai
        const snapAkt = await get(ref(db, pathStatistik))
        const dataAkt = snapAkt.val() || {}
        const aktivitasBelumSelesai = Object.keys(dataAkt)
          .filter((key) => dataAkt[key].nama === userData.nama && dataAkt[key].aksi === 'BawaCustomer' && !dataAkt[key].waktuSelesai)
          .map((key) => ({ _key: key, ...dataAkt[key] }))
          .sort((a: any, b: any) => (b.waktu || 0) - (a.waktu || 0))
        
        const target = aktivitasBelumSelesai[0]
        
        await remove(ref(db, pathAntrian))
        
        if (target && target._key) {
          await update(ref(db, `${pathStatistik}/${target._key}`), { 
            waktuSelesai: now, 
            hasil: hasil, 
            durasiDetik: Math.floor((now - waktuMulai) / 1000) 
          })
        } else {
          await push(ref(db, pathStatistik), { 
            nama: userData.nama, aksi: 'BawaCustomer', 
            waktu: waktuMulai, waktuMulai: waktuMulai, 
            waktuSelesai: now, tanggal: tglIndo, 
            hasil: hasil, durasiDetik: Math.floor((now - waktuMulai) / 1000) 
          })
        }
        
        const bulanKey = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`
        const snapR = await get(ref(db, `toko/${TOKO_ID}/riwayatBulanan/${bulanKey}/${clean}`))
        const existing = snapR.exists() ? snapR.val() : { nama: userData.nama, lihat: 0, deal: 0, noSale: 0 }
        if (hasil === 'Deal') existing.deal = (existing.deal || 0) + 1
        else if (hasil === 'Lihat') existing.lihat = (existing.lihat || 0) + 1
        existing.nama = userData.nama
        existing.lastUpdate = now
        existing.bulanKey = bulanKey
        await update(ref(db, `toko/${TOKO_ID}/riwayatBulanan/${bulanKey}/${clean}`), existing)
        
        toast.success(`Berhasil disimpan: ${hasil}`)
        setShowClosing(false)
      } else if (aksi === 'Ibadah') {
        const kat = String(dataSaya?.kategori || 'HA').toUpperCase()
        const listStandby = antrian.filter(i => i.status === 'Standby' && String(i.kategori).toUpperCase() === kat).sort((a,b) => (a.waktuStandby||0) - (b.waktuStandby||0))
        const posisi = listStandby.findIndex(i => i.nama.toLowerCase() === userData.nama.toLowerCase()) + 1
        await update(ref(db, pathAntrian), { status: 'Ibadah', posisiTerkunci: posisi, waktuStandbySebelumIbadah: dataSaya?.waktuStandby || Date.now() })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'MulaiIbadah', waktu: Date.now(), tanggal: tglIndo, kategori: 'Ibadah', posisi: posisi })
        toast.info('Waktu Ibadah dimulai.')
      } else if (aksi === 'KembaliIbadah') {
        const posisiLama = dataSaya?.posisiTerkunci || 0
        const waktuStandbyKembali = dataSaya?.waktuStandbySebelumIbadah || dataSaya?.waktuStandby || Date.now()
        await update(ref(db, pathAntrian), { status: 'Standby', posisiTerkunci: 0, waktuStandby: waktuStandbyKembali })
        await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'SelesaiIbadah', waktu: Date.now(), tanggal: tglIndo, kategori: 'Ibadah', posisi: posisiLama })
        toast.success('Kembali ke antrian.')
      } else if (aksi === 'PanggilCS') {
        const kat = String(dataSaya?.kategori || 'HA').toUpperCase()
        const listStandby = antrian.filter(i => i.status === 'Standby' && String(i.kategori).toUpperCase() === kat).sort((a, b) => (a.waktuStandby || 0) - (b.waktuStandby || 0))
        const posisi = listStandby.findIndex(i => i.nama.toLowerCase() === userData.nama.toLowerCase()) + 1
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
    } finally { setIsProcessing(false) }
  }

  const aktivitasSaya = aktivitasHariIni.filter(a => a.nama.toLowerCase() === userData?.nama.toLowerCase())
  const listBawaSaya = aktivitasSaya.filter(a => a.aksi === 'BawaCustomer' && a.tanggal === hariIniIndo)
  const listIbadahSaya = aktivitasSaya.filter(a => a.aksi === 'MulaiIbadah' && a.tanggal === hariIniIndo)
  const listKeluarSaya = aktivitasSaya.filter(a => a.aksi === 'KeluarAntrian' && a.tanggal === hariIniIndo)
  const listAutokickSaya = aktivitasSaya.filter(a => a.aksi === 'Autokick' && a.tanggal === hariIniIndo)

  const hitungRekapSaya = () => {
    if (!bulanIni) return { deal: 0, lihat: 0, noSale: 0 }
    const aktivitasBulanIni = aktivitasSaya.filter(a => {
      const parts = String(a.tanggal || '').split('-')
      if (parts.length !== 3) return false
      const tglKey = `${parts[2]}-${parts[1]}-${parts[0]}`
      return tglKey.startsWith(bulanIni)
    })
    let deal = 0, lihat = 0
    aktivitasBulanIni.forEach(a => {
      if (a.aksi === 'BawaCustomer' && a.waktuSelesai) {
        if (a.hasil === 'Deal') deal++
        else if (a.hasil === 'Lihat') lihat++
      }
    })
    return { deal, lihat, noSale: 0 }
  }
  const rekapSaya = hitungRekapSaya()

  const hitungTotalBulananSaya = () => {
    if (!tahunIni) return []
    const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
    const perBulan: any = {}
    aktivitasSaya.forEach(a => {
      if (a.aksi !== 'BawaCustomer' || !a.waktuSelesai || !a.tanggal) return
      const parts = String(a.tanggal).split('-')
      if (parts.length !== 3) return
      const tglKey = `${parts[2]}-${parts[1]}-${parts[0]}`
      if (!tglKey.startsWith(tahunIni)) return
      const bulanKey = tglKey.substring(0, 7)
      if (!perBulan[bulanKey]) perBulan[bulanKey] = { deal: 0, lihat: 0 }
      if (a.hasil === 'Deal') perBulan[bulanKey].deal++
      else if (a.hasil === 'Lihat') perBulan[bulanKey].lihat++
    })
    return Object.keys(perBulan).sort().reverse().map(bulanKey => {
      const p = perBulan[bulanKey]
      const parts = bulanKey.split('-')
      const namaBln = namaBulan[parseInt(parts[1]) - 1]
      return { bulanKey, namaBln, tahun: parts[0], ...p }
    })
  }
  const totalBulananSaya = hitungTotalBulananSaya()

  const formatJam = (ts: number) => ts ? `${String(new Date(ts).getHours()).padStart(2,'0')}.${String(new Date(ts).getMinutes()).padStart(2,'0')}` : '-'

  if (isLoading || !mounted || isLoadingCheckin) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>

  if (!userData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Login Promotor</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-8">Gunakan email Google yang sudah didaftarkan admin.</p>
          <button onClick={handleLoginGoogle} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl shadow-lg flex justify-center items-center gap-3 hover:bg-slate-800 transition">
            <svg viewBox="0 0 48 48" width="20" height="20"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Lanjutkan dengan Google
          </button>
        </div>
      </div>
    )
  }

  if (lockData?.locked) {
    return (
      <div className="min-h-screen bg-red-50 dark:bg-red-950/20 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
          <Lock className="w-12 h-12 text-red-600 animate-pulse" />
        </div>
        <h1 className="text-3xl font-black mb-2 text-red-800 dark:text-red-400">Akun Dikunci</h1>
        <p className="text-lg font-semibold mb-6 text-red-600 dark:text-red-300">Alasan: {lockData.alasan || '-'}</p>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] w-full max-w-sm border border-red-100 dark:border-red-900/50 shadow-xl shadow-red-500/5">
          <p className="text-sm uppercase tracking-wider mb-2 text-slate-400 font-bold">Sisa Waktu</p>
          <div className="text-6xl font-black text-red-600 tracking-tighter">{sisaWaktu}</div>
        </div>
        <button onClick={handleLogout} className="mt-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3 px-8 rounded-xl hover:bg-slate-50 transition">Keluar</button>
      </div>
    )
  }

  const gpsAktif = !!(setting?.latToko && setting?.lngToko)
  const dalamRadius = !gpsAktif || (jarak !== null && jarak <= (setting?.radiusToko || 50))

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden flex justify-center transition-colors">
      
      <div className="w-full max-w-[420px] pt-6 pb-12 relative z-10 space-y-5 px-4">
        
        {/* HEADER */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl shadow-sm transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black shadow-md">
              {userData.nama.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 dark:text-white">{userData.nama}</h1>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold tracking-wider uppercase">Promotor</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STATISTIK MINI */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-xl"><Users className="w-5 h-5" /></div>
            <div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Antri</p><p className="text-xl font-black text-slate-800 dark:text-white">{totalAntri}</p></div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
            <div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Melayani</p><p className="text-xl font-black text-slate-800 dark:text-white">{totalMelayani}</p></div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {statusSaya === 'Offline' && (
            <motion.div key="offline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
              
              {sudahCheckinHariIni ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Sudah Check-in Hari Ini</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Anda sudah konfirmasi kehadiran hari ini. Silakan ambil antrian jika ingin mulai bekerja.</p>
                  <button onClick={() => handleAksi('CheckIn')} disabled={isProcessing || setting?.statusAntrian === 'TUTUP' || !dalamRadius} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/30 disabled:opacity-50 transition-all flex justify-center items-center gap-2">
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-white" />}
                    {isProcessing ? 'Memproses...' : 'MASUK ANTRIAN'}
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500" /> Konfirmasi Kehadiran</h2>
                  
                  {gpsAktif && setting?.latToko && setting?.lngToko ? (
                    <div className="mb-4">
                      <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative bg-slate-100">
                        <MapComponent 
                          tokoLat={Number(setting.latToko)} 
                          tokoLng={Number(setting.lngToko)} 
                          radius={Number(setting.radiusToko) || 50} 
                          userLat={userLoc?.lat} 
                          userLng={userLoc?.lng} 
                        />
                      </div>
                      <div className={`mt-2 p-2 rounded-lg text-center text-xs font-bold ${dalamRadius ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
                        {jarak !== null 
                          ? (dalamRadius ? `✓ Di dalam radius (${jarak.toFixed(0)}m)` : `⚠️ Di luar radius (${jarak.toFixed(0)}m / max ${setting?.radiusToko}m)`) 
                          : 'Mendeteksi lokasi...'}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-center text-xs text-slate-500">
                      GPS toko dinonaktifkan. Check-in dari mana saja.
                    </div>
                  )}

                  <button onClick={() => handleAksi('CheckIn')} disabled={isProcessing || setting?.statusAntrian === 'TUTUP' || !dalamRadius} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2">
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-white" />}
                    {isProcessing ? 'Memproses...' : !dalamRadius ? 'DI LUAR RADIUS' : 'KONFIRMASI KEHADIRAN & MASUK ANTRI'}
                  </button>
                </>
              )}
            </motion.div>
          )}

          {statusSaya === 'Standby' && (
            <motion.div key="standby" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 text-center shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/5 blur-3xl rounded-full"></div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] relative z-10">Nomor Antrian Anda</p>
              <div className="text-8xl font-black text-slate-800 dark:text-white my-2 relative z-10 tracking-tighter">{posisiSaya.toString().padStart(2, '0')}</div>
              <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-8 relative z-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">KATEGORI {dataSaya?.kategori}</div>
              <div className="space-y-3 relative z-10">
                <button onClick={() => handleAksi('BawaCustomer')} className="w-full py-4 bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition-transform flex justify-center items-center gap-2"><Play className="w-5 h-5 fill-white" /> SUDAH MEMBAWA CUSTOMER</button>
                <div className="grid grid-cols-2 gap-3">
                  {/* TOMBOL IBADAH - VERTIKAL */}
                  <button onClick={() => handleAksi('Ibadah')} className="py-3 px-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold rounded-xl text-[11px] flex flex-col justify-center items-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition border border-amber-200 dark:border-amber-800/50 leading-tight">
                    <MosqueIcon className="w-5 h-5" /> 
                    <span className="text-center">SEDANG IBADAH</span>
                  </button>
                  {/* TOMBOL CS - VERTIKAL */}
                  <button onClick={() => handleAksi('PanggilCS')} className="py-3 px-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-bold rounded-xl text-[11px] flex flex-col justify-center items-center gap-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition border border-purple-200 dark:border-purple-800/50 leading-tight">
                    <Package className="w-5 h-5" /> 
                    <span className="text-center">DIPANGGIL CS/GUDANG</span>
                  </button>
                </div>
                <button onClick={() => handleAksi('Keluar')} className="w-full py-3.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-xs flex justify-center items-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition border border-rose-200 dark:border-rose-800/50">
                  <LogOutIcon className="w-4 h-4" /> KELUAR ANTRIAN
                </button>
              </div>
            </motion.div>
          )}

          {statusSaya === 'Melayani' && (
            <motion.div key="melayani" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-blue-600 rounded-[2.5rem] p-8 text-center text-white shadow-xl shadow-blue-500/30">
              <h2 className="text-2xl font-black mb-2">Sedang Melayani</h2>
              <p className="text-xs text-blue-100 mb-8">Berikan pelayanan terbaik!</p>
              <button onClick={() => handleAksi('Selesai')} className="w-full py-4 bg-white text-blue-700 font-black rounded-xl shadow-lg flex justify-center items-center gap-2"><ArrowRight className="w-5 h-5" /> SELESAI MELAYANI</button>
            </motion.div>
          )}

          {statusSaya === 'Dipanggil CS' && (
            <motion.div key="cs" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-purple-600 rounded-[2.5rem] p-8 text-center text-white shadow-xl shadow-purple-500/30">
              <Package className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-2xl font-black mb-2">Dipanggil CS/Gudang</h2>
              <p className="text-xs text-purple-100 mb-8">Posisi #{dataSaya?.posisiTerkunci || '-'} Anda aman terkunci.</p>
              <button onClick={() => handleAksi('KembaliCS')} className="w-full py-4 bg-white text-purple-700 font-black rounded-xl shadow-lg">KEMBALI ANTRI DARI CS/GUDANG</button>
            </motion.div>
          )}

          {statusSaya === 'Ibadah' && (
            <motion.div key="ibadah" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-amber-500 rounded-[2.5rem] p-8 text-center text-white shadow-xl shadow-amber-500/30">
              <MosqueIcon className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-2xl font-black mb-2">Sedang Ibadah</h2>
              <p className="text-xs text-amber-100 mb-8">Posisi #{dataSaya?.posisiTerkunci || '-'} Anda aman terkunci.</p>
              <button onClick={() => handleAksi('KembaliIbadah')} className="w-full py-4 bg-white text-amber-700 font-black rounded-xl shadow-lg">SELESAI IBADAH</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LIST ANTRIAN */}
        <div className="space-y-4">
          {['HA', 'AV'].map((kat) => {
            const list = kat === 'HA' ? listHA : listAV
            const listStandby = list.filter(a => a.status === 'Standby')
            return (
              <div key={kat} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem] shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${kat === 'HA' ? 'bg-emerald-500' : 'bg-purple-500'}`}></span>
                    LIVE URUTAN KATEGORI {kat}
                  </h3>
                  <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-md">{listStandby.length} PROMOTOR</span>
                </div>
                <div className="space-y-2">
                  {list.length === 0 ? <p className="text-xs text-slate-400 italic text-center py-2">Belum ada antrian</p> : list.map((item, idx) => {
                    const isSaya = item.nama.toLowerCase() === userData?.nama.toLowerCase()
                    const isGiliranUtama = item.status === 'Standby' && listStandby.findIndex(a => a.nama === item.nama) === 0
                    return (
                      <div key={idx} className={`flex justify-between items-center p-3 rounded-xl transition-colors ${isSaya ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800/50 border border-transparent'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black shadow-sm ${isGiliranUtama ? 'bg-rose-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}>
                            {item.status === 'Melayani' ? '-' : (idx+1)}
                          </span>
                          <span className={`text-xs font-bold ${isSaya ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{item.nama} {isSaya && '(Anda)'}</span>
                        </div>
                        {item.status === 'Melayani' ? (
                          <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">MELAYANI</span>
                        ) : item.status === 'Dipanggil CS' ? (
                          <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">CS / GUDANG</span>
                        ) : item.status === 'Ibadah' ? (
                          <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">IBADAH</span>
                        ) : isGiliranUtama ? (
                          <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-rose-500 text-white animate-pulse">GILIRAN UTAMA</span>
                        ) : (
                          <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">STANDBY</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* MENU AKTIVITAS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] overflow-hidden shadow-sm">
          <button onClick={() => setIsAktivitasOpen(!isAktivitasOpen)} className="w-full flex justify-between items-center p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2"><History className="w-5 h-5 text-slate-400" /> Aktivitas & Riwayat</h3>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isAktivitasOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {isAktivitasOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="p-5 grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => setPopupType('bawa')} className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-2 relative hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                    <Users className="w-5 h-5 text-emerald-500" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Bawa Customer</span>
                    <span className="absolute top-2 right-2 text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">{listBawaSaya.length}</span>
                  </button>
                  <button onClick={() => setPopupType('ibadah')} className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-2 relative hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                    <MosqueIcon className="w-5 h-5 text-amber-500" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Ibadah</span>
                    <span className="absolute top-2 right-2 text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full">{listIbadahSaya.length}</span>
                  </button>
                  <button onClick={() => setPopupType('keluar')} className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-2 relative hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                    <LogOutIcon className="w-5 h-5 text-rose-500" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Keluar Antrian</span>
                    <span className="absolute top-2 right-2 text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full">{listKeluarSaya.length}</span>
                  </button>
                  <button onClick={() => setPopupType('autokick')} className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-2 relative hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Autokick</span>
                    <span className="absolute top-2 right-2 text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">{listAutokickSaya.length}</span>
                  </button>
                  <button onClick={() => setPopupType('rekap')} className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Rekap Saya</span>
                  </button>
                  <button onClick={() => setPopupType('bulanan')} className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Total Bulanan</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* MODAL POPUP AKTIVITAS */}
      <AnimatePresence>
        {popupType && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  {popupType === 'bawa' && 'Bawa Customer Saya'}
                  {popupType === 'ibadah' && 'Ibadah Saya'}
                  {popupType === 'keluar' && 'Keluar Antrian Saya'}
                  {popupType === 'autokick' && 'Autokick Saya'}
                  {popupType === 'rekap' && 'Rekap Saya Bulan Ini'}
                  {popupType === 'bulanan' && 'Total Bulanan Saya'}
                </h3>
                <button onClick={() => setPopupType(null)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-800 rounded-full"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 max-h-[70vh] overflow-y-auto">
                {(popupType === 'bawa') && (
                  <div className="space-y-2">
                    {listBawaSaya.length === 0 ? <p className="text-xs text-slate-400 italic text-center">Belum ada</p> : listBawaSaya.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div className="flex items-center gap-2">
                          {a.hasil === 'Deal' && <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-md">DEAL</span>}
                          {a.hasil === 'Lihat' && <span className="text-[9px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-md">LIHAT</span>}
                          {!a.waktuSelesai && <span className="text-[9px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md animate-pulse">PROSES</span>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">({formatJam(a.waktuMulai)} - {a.waktuSelesai ? formatJam(a.waktuSelesai) : '...'})</span>
                      </div>
                    ))}
                  </div>
                )}
                {(popupType === 'ibadah') && (
                  <div className="space-y-2">
                    {listIbadahSaya.length === 0 ? <p className="text-xs text-slate-400 italic text-center">Belum ada</p> : listIbadahSaya.map((a, i) => {
                      const selesai = aktivitasSaya.find(b => b.aksi === 'SelesaiIbadah' && b.waktu > a.waktu)
                      return (
                        <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                          <span className="text-[10px] text-slate-400">({formatJam(a.waktu)} - {selesai ? formatJam(selesai.waktu) : '...'})</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                {(popupType === 'keluar') && (
                  <div className="space-y-2">
                    {listKeluarSaya.length === 0 ? <p className="text-xs text-slate-400 italic text-center">Belum ada</p> : listKeluarSaya.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <span className="text-[10px] text-slate-400">{formatJam(a.waktu)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(popupType === 'autokick') && (
                  <div className="space-y-2">
                    {listAutokickSaya.length === 0 ? <p className="text-xs text-slate-400 italic text-center">Tidak ada pelanggaran</p> : listAutokickSaya.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <span className="text-[10px] text-red-500 font-bold">{a.hasil || a.kategori}</span>
                        <span className="text-[10px] text-slate-400">{formatJam(a.waktu)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(popupType === 'rekap') && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-3 rounded-xl text-center">
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-1">Deal</p>
                        <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{rekapSaya.deal}</p>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-3 rounded-xl text-center">
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase mb-1">Lihat</p>
                        <p className="text-xl font-black text-amber-700 dark:text-amber-300">{rekapSaya.lihat}</p>
                      </div>
                      <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 p-3 rounded-xl text-center">
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase mb-1">No Sale</p>
                        <p className="text-xl font-black text-rose-700 dark:text-rose-300">{rekapSaya.noSale}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center">Bulan {bulanIni}</p>
                  </div>
                )}
                {(popupType === 'bulanan') && (
                  <div className="space-y-2">
                    {totalBulananSaya.length === 0 ? <p className="text-xs text-slate-400 italic text-center">Belum ada data tahun ini</p> : totalBulananSaya.map((b, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{b.namaBln} {b.tahun}</span>
                        <div className="flex gap-3">
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">✓ {b.deal}</span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">👀 {b.lihat}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClosing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm text-center border border-slate-100 dark:border-slate-800 shadow-2xl">
              <h3 className="text-lg font-bold mb-5 text-slate-800 dark:text-white">Hasil Melayani Customer</h3>
              <div className="space-y-3">
                <button onClick={() => handleAksi('SimpanClosing', 'Deal')} className="w-full py-3.5 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20">✓ DEAL / CLOSING</button>
                <button onClick={() => handleAksi('SimpanClosing', 'Lihat')} className="w-full py-3.5 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20">👀 LIHAT-LIHAT SAJA</button>
                <button onClick={() => setShowClosing(false)} className="w-full py-2 text-slate-400 font-medium text-xs mt-2">Batal</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}