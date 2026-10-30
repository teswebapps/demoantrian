'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth'
import { ref, get, set, remove, update, push, onValue } from 'firebase/database'
import { auth, db, googleProvider } from '@/lib/firebase'
import { toast } from 'sonner'
import { useTheme } from '@/hooks/useTheme'
import dynamic from 'next/dynamic'
import { Loader2, ShieldCheck, Lock, Play, MapPin, Package, ArrowRight, LogOut, History, ChevronDown, Users, Coffee } from 'lucide-react'

import { AppHeader } from '@/components/queue/app-header'
import { PromoterCard } from '@/components/queue/promoter-card'
import { TurnCard } from '@/components/queue/turn-card'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false })

// IKON MASJID CUSTOM
const MosqueIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2c-1.5 2-4 3-4 6 0 1.5.5 2.5 1 3H5v10h14V11h-4c.5-.5 1-1.5 1-3 0-3-2.5-4-4-6z" />
    <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
    <path d="M3 21h18" />
  </svg>
)

const getTanggalIndo = (d?: Date) => {
  const now = d ? new Date(d) : new Date()
  return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`
}
const getTanggalKey = (d?: Date) => {
  const now = d ? new Date(d) : new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
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
  const [userLoc, setUserLoc] = useState<any>(null)
  const [jarak, setJarak] = useState<number | null>(null)
  const [showClosing, setShowClosing] = useState(false)
  
  const [sudahCheckinHariIni, setSudahCheckinHariIni] = useState(false)
  const [jamCheckin, setJamCheckin] = useState<number | null>(null)
  const [isLoadingCheckin, setIsLoadingCheckin] = useState(true)
  const [todayKey, setTodayKey] = useState('')
  const [kategoriPilih, setKategoriPilih] = useState<'HA' | 'AV'>('HA')
  
  const [aktivitasHariIni, setAktivitasHariIni] = useState<any[]>([])
  const [isAktivitasOpen, setIsAktivitasOpen] = useState(false)
  const [hariIniIndo, setHariIniIndo] = useState('')

  const TOKO_ID = userData?.tokoId || 'ufo-kebonsari'

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

  const handleLoginGoogle = async () => {
    try { await signInWithPopup(auth, googleProvider) } catch (err) { toast.error('Login gagal.') }
  }
  const handleLogout = async () => { await signOut(auth); setUserData(null) }

  useEffect(() => {
    if (!userData || !todayKey) return
    const clean = userData.nama.trim().toLowerCase().replace(/\s+/g, '_')
    const unsub = onValue(ref(db, `toko/${TOKO_ID}/checkinHarian/${clean}/${todayKey}`), (snap) => {
      setSudahCheckinHariIni(snap.exists())
      if (snap.exists()) setJamCheckin(snap.val().waktu)
      else setJamCheckin(null)
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
        const kat = kategoriPilih
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
        const snapAkt = await get(ref(db, pathStatistik))
        const dataAkt = snapAkt.val() || {}
        const aktivitasBelumSelesai = Object.keys(dataAkt)
          .filter((key) => dataAkt[key].nama === userData.nama && dataAkt[key].aksi === 'BawaCustomer' && !dataAkt[key].waktuSelesai)
          .map((key) => ({ _key: key, ...dataAkt[key] }))
          .sort((a: any, b: any) => (b.waktu || 0) - (a.waktu || 0))
        const target = aktivitasBelumSelesai[0]
        await remove(ref(db, pathAntrian))
        if (target && target._key) {
          await update(ref(db, `${pathStatistik}/${target._key}`), { waktuSelesai: now, hasil: hasil, durasiDetik: Math.floor((now - waktuMulai) / 1000) })
        } else {
          await push(ref(db, pathStatistik), { nama: userData.nama, aksi: 'BawaCustomer', waktu: waktuMulai, waktuMulai: waktuMulai, waktuSelesai: now, tanggal: tglIndo, hasil: hasil, durasiDetik: Math.floor((now - waktuMulai) / 1000) })
        }
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
  const totalDeal = listBawaSaya.filter(a => a.hasil === 'Deal').length
  const totalLihat = listBawaSaya.filter(a => a.hasil === 'Lihat').length
  const listIbadahSaya = aktivitasSaya.filter(a => (a.aksi === 'MulaiIbadah' || a.aksi === 'SelesaiIbadah') && a.tanggal === hariIniIndo)
  const listKeluarSaya = aktivitasSaya.filter(a => a.aksi === 'KeluarAntrian' && a.tanggal === hariIniIndo)

  const formatJam = (ts: number) => ts ? `${String(new Date(ts).getHours()).padStart(2,'0')}.${String(new Date(ts).getMinutes()).padStart(2,'0')}` : '-'

  if (isLoading || !mounted || isLoadingCheckin) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>

  if (!userData) {
    if (typeof window !== 'undefined') window.location.href = '/'
    return null
  }

  if (lockData?.locked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-destructive/15 flex items-center justify-center mb-6">
          <Lock className="w-12 h-12 text-destructive animate-pulse" />
        </div>
        <h1 className="text-3xl font-black mb-2 text-destructive uppercase">Akun Dikunci</h1>
        <p className="text-lg font-semibold mb-6 text-destructive/80">Alasan: {lockData.alasan || '-'}</p>
        <div className="bg-card p-8 rounded-[2rem] w-full max-w-sm border border-destructive/20 shadow-xl">
          <p className="text-sm uppercase tracking-wider mb-2 text-muted-foreground font-bold">Sisa Waktu</p>
          <div className="text-6xl font-black text-destructive tracking-tighter">{sisaWaktu}</div>
        </div>
        <button onClick={handleLogout} className="mt-8 bg-secondary text-secondary-foreground font-bold py-3 px-8 rounded-xl hover:bg-secondary/80 transition">Keluar</button>
      </div>
    )
  }

  const gpsAktif = !!(setting?.latToko && setting?.lngToko)
  const dalamRadius = !gpsAktif || (jarak !== null && jarak <= (setting?.radiusToko || 50))

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background relative">
      
      <AppHeader 
        storeName="UFO Malang Kebonsari" 
        isOpen={setting?.statusAntrian !== 'TUTUP'} 
        onLogout={handleLogout}
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
                
                <div className="mb-4 text-left">
                  <label className="text-xs font-bold text-muted-foreground mb-2 block uppercase">Pilih Kategori</label>
                  <div className="flex bg-secondary rounded-xl p-1.5 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setKategoriPilih('HA')}
                      className={`flex-1 py-3 px-2 rounded-lg text-sm font-bold transition-all ${
                        kategoriPilih === 'HA' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      HA
                    </button>
                    <button
                      type="button"
                      onClick={() => setKategoriPilih('AV')}
                      className={`flex-1 py-3 px-2 rounded-lg text-sm font-bold transition-all ${
                        kategoriPilih === 'AV' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      AV
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setKategoriPilih(kategoriPilih);
                    handleAksi('CheckIn');
                  }} 
                  disabled={isProcessing || setting?.statusAntrian === 'TUTUP' || !dalamRadius} 
                  className="w-full py-4 bg-primary text-primary-foreground font-black rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-primary-foreground" />}
                  {isProcessing ? 'Memproses...' : 'MASUK ANTRIAN'}
                </button>
              </div>
            ) : (
              <div className="relative z-10">
                <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 uppercase"><MapPin className="w-4 h-4 text-primary" /> Konfirmasi Kehadiran</h2>
                
                {gpsAktif && setting?.latToko && setting?.lngToko ? (
                  <div className="mb-4">
                    <div className="w-full h-40 rounded-2xl overflow-hidden border border-border relative bg-secondary">
                      <MapComponent tokoLat={Number(setting.latToko)} tokoLng={Number(setting.lngToko)} radius={Number(setting.radiusToko) || 50} userLat={userLoc?.lat} userLng={userLoc?.lng} />
                    </div>
                    <div className={`mt-2 p-2 rounded-lg text-center text-xs font-bold ${dalamRadius ? 'bg-accent/15 text-accent' : 'bg-destructive/15 text-destructive'}`}>
                      {jarak !== null ? (dalamRadius ? `✓ Di dalam radius (${jarak.toFixed(0)}m)` : `⚠️ Di luar radius (${jarak.toFixed(0)}m)`) : 'Mendeteksi lokasi...'}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-secondary rounded-xl text-center text-xs text-muted-foreground">GPS toko dinonaktifkan.</div>
                )}

                <div className="mb-4">
                  <label className="text-xs font-bold text-muted-foreground mb-2 block uppercase">Pilih Kategori</label>
                  <div className="flex bg-secondary rounded-xl p-1.5 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setKategoriPilih('HA')}
                      className={`flex-1 py-3 px-2 rounded-lg text-sm font-bold transition-all ${
                        kategoriPilih === 'HA' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      HA (Home Appliance)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKategoriPilih('AV')}
                      className={`flex-1 py-3 px-2 rounded-lg text-sm font-bold transition-all ${
                        kategoriPilih === 'AV' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      AV (Audio Video)
                    </button>
                  </div>
                </div>

                <button onClick={() => handleAksi('CheckIn')} disabled={isProcessing || setting?.statusAntrian === 'TUTUP' || !dalamRadius} className="w-full py-4 bg-primary text-primary-foreground font-black rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 transition-all flex justify-center items-center gap-2">
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-primary-foreground" />}
                  {isProcessing ? 'Memproses...' : !dalamRadius ? 'DI LUAR RADIUS' : 'KONFIRMASI KEHADIRAN'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* STATUS: STANDBY (Nomor Dinamis HA/AV) */}
        {statusSaya === 'Standby' && (
          <div className="bg-card rounded-3xl p-6 text-center shadow-xl border border-border relative overflow-hidden">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] relative z-10">Nomor Antrian Anda</p>
            <div className="text-8xl font-black text-foreground my-2 tracking-tighter relative z-10">
              {(() => {
                const listKategoriSaya = dataSaya?.kategori === 'AV' ? listAV : listHA;
                const posisi = listKategoriSaya
                  .filter(a => a.status === 'Standby' || a.status === 'Melayani')
                  .findIndex(a => a.nama.toLowerCase() === userData.nama.toLowerCase()) + 1;
                return posisi.toString().padStart(2, '0');
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
            <h2 className="text-2xl font-black mb-2 uppercase">Dipanggil CS</h2>
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

        {/* MENU AKTIVITAS HARI INI (FONT DIPERBESAR) */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden mt-6">
          <button onClick={() => setIsAktivitasOpen(!isAktivitasOpen)} className="w-full flex justify-between items-center p-5 hover:bg-secondary/50 transition">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase"><History className="w-5 h-5 text-muted-foreground" /> Aktivitas Hari Ini</h3>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isAktivitasOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isAktivitasOpen && (
            <div className="p-5 border-t border-border space-y-5">
              
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Check-in</p>
                <div className="bg-secondary rounded-xl p-3 text-sm flex justify-between items-center">
                  {jamCheckin ? (
                    <><span className="text-emerald-500 font-bold">✓ Sudah Check-in</span><span className="text-muted-foreground font-medium">Jam {formatJam(jamCheckin)}</span></>
                  ) : (
                    <span className="text-muted-foreground italic">Belum Check-in hari ini</span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1"><Users className="w-4 h-4" /> Bawa Customer</p>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded">Deal: {totalDeal}</span>
                    <span className="text-xs font-bold bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">Lihat: {totalLihat}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {listBawaSaya.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic px-1">Belum ada</p>
                  ) : (
                    listBawaSaya.map((a, i) => (
                      <div key={i} className="bg-secondary rounded-xl p-3 flex justify-between items-center text-sm">
                        <span className={`font-bold ${a.hasil === 'Deal' ? 'text-emerald-500' : a.hasil === 'Lihat' ? 'text-amber-500' : 'text-blue-500'}`}>{a.hasil || 'Proses'}</span>
                        <span className="text-muted-foreground font-medium">{formatJam(a.waktuMulai || a.waktu)} - {a.waktuSelesai ? formatJam(a.waktuSelesai) : '...'}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><MosqueIcon className="w-4 h-4" /> Ibadah</p>
                <div className="space-y-2">
                  {listIbadahSaya.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic px-1">Belum ada</p>
                  ) : (
                    listIbadahSaya.map((a, i) => (
                      <div key={i} className="bg-secondary rounded-xl p-3 text-sm flex justify-between items-center">
                        <span className="text-foreground font-bold">{a.aksi === 'MulaiIbadah' ? 'Mulai Ibadah' : 'Selesai Ibadah'}</span>
                        <span className="text-muted-foreground font-medium">{formatJam(a.waktu)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1"><LogOut className="w-4 h-4" /> Keluar Antrian</p>
                <div className="space-y-2">
                  {listKeluarSaya.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic px-1">Belum ada</p>
                  ) : (
                    listKeluarSaya.map((a, i) => (
                      <div key={i} className="bg-secondary rounded-xl p-3 text-sm flex justify-between items-center">
                        <span className="text-foreground font-bold">Keluar</span>
                        <span className="text-muted-foreground font-medium">{formatJam(a.waktu)}</span>
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
              <button onClick={() => handleAksi('SimpanClosing', 'Deal')} className="w-full py-3.5 bg-accent text-accent-foreground font-bold rounded-xl shadow-lg shadow-accent/20">✓ DEAL / CLOSING</button>
              <button onClick={() => handleAksi('SimpanClosing', 'Lihat')} className="w-full py-3.5 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20">👀 LIHAT-LIHAT SAJA</button>
              <button onClick={() => setShowClosing(false)} className="w-full py-2 text-muted-foreground font-medium text-xs mt-2">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}