'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth'
import { ref, get, set, remove, update, push, onValue } from 'firebase/database'
import { auth, db, googleProvider } from '@/lib/firebase'
import { toast } from 'sonner'
import { useTheme } from '@/hooks/useTheme'
import dynamic from 'next/dynamic'
import { Loader2, ShieldCheck, Lock, Play, Hand, MapPin, Package, ArrowRight, LogOut } from 'lucide-react'

// --- IMPORT KOMPONEN DARI V0.APP ---
import { AppHeader } from '@/components/queue/app-header'
import { PromoterCard } from '@/components/queue/promoter-card'
import { TurnCard } from '@/components/queue/turn-card'
import { ActionBar, type QueueType } from '@/components/queue/action-bar'

// --- KOMPONEN PETA (Dari kode asli Anda) ---
const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-secondary animate-pulse rounded-2xl flex items-center justify-center text-muted-foreground text-xs">Memuat Peta...</div>
})

// --- FUNGSI BANTU ---
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
  
  // --- STATE ASLI ANDA ---
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
  const [kategoriPilih, setKategoriPilih] = useState<'HA' | 'AV'>('HA')
  const [hariIniIndo, setHariIniIndo] = useState('')
  
  const TOKO_ID = userData?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    setHariIniIndo(getTanggalIndo())
    setTodayKey(getTanggalKey())
  }, [])

  // 1. AUTHENTICATION
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

  // 2. CHECK-IN HARIAN
  useEffect(() => {
    if (!userData || !todayKey) return
    const clean = userData.nama.trim().toLowerCase().replace(/\s+/g, '_')
    const unsub = onValue(ref(db, `toko/${TOKO_ID}/checkinHarian/${clean}/${todayKey}`), (snap) => {
      setSudahCheckinHariIni(snap.exists())
      setIsLoadingCheckin(false)
    })
    return () => unsub()
  }, [userData, todayKey, TOKO_ID])

  // 3. DATA ANTRIAN, SETTING, DAN LOCK
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
    return () => { unsubAntrian(); unsubSetting(); unsubLock(); }
  }, [TOKO_ID, userData])

  // 4. TIMER LOCK
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

  // 5. GPS / LOKASI
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

  // --- DATA TURUNAN ---
  const dataSaya = antrian.find(a => a.nama.toLowerCase() === userData?.nama.toLowerCase())
  const statusSaya = dataSaya ? dataSaya.status : 'Offline'
  const listHA = antrian.filter(a => a.kategori === 'HA')
  const listAV = antrian.filter(a => a.kategori === 'AV')
  const totalAntri = antrian.filter(a => a.status === 'Standby').length
  const totalMelayani = antrian.filter(a => a.status === 'Melayani').length
  
  const gpsAktif = !!(setting?.latToko && setting?.lngToko)
  const dalamRadius = !gpsAktif || (jarak !== null && jarak <= (setting?.radiusToko || 50))

  // --- FUNGSI AKSI FIREBASE ASLI ANDA ---
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

  // --- TAMPILAN ---
  if (isLoading || !mounted || isLoadingCheckin) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>

  if (!userData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-card p-8 rounded-3xl shadow-xl border border-border text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/15 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-black text-foreground mb-2">Login Promotor</h1>
          <p className="text-xs text-muted-foreground mb-8">Gunakan email Google yang sudah didaftarkan admin.</p>
          <button onClick={handleLoginGoogle} className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg flex justify-center items-center gap-3 hover:brightness-110 transition">
            Lanjutkan dengan Google
          </button>
        </div>
      </div>
    )
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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background relative">
      
      {/* HEADER V0.APP */}
      <AppHeader 
        storeName="UFO Malang Kebonsari" 
        isOpen={setting?.statusAntrian !== 'TUTUP'} 
        onLogout={handleLogout}
        onToggleTheme={toggleTheme}
      />

      <main className="flex flex-1 flex-col gap-4 px-4 pb-44 pt-2">
        
        {/* PROMOTOR CARD V0.APP */}
        <PromoterCard name={userData.nama} />

        {/* GILIRAN SAAT INI V0.APP */}
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Giliran saat ini</h2>
          <div className="grid grid-cols-2 gap-3">
            <TurnCard type="HA" label="Home Appliance" holder={listHA.length > 0 ? listHA[0].nama : null} />
            <TurnCard type="AV" label="Audio Video" holder={listAV.length > 0 ? listAV[0].nama : null} />
          </div>
        </section>

        {/* KONDISI STATUS ANDA (CheckIn, Standby, Melayani, dll) */}
        <div className="space-y-4 mt-2">
          {statusSaya === 'Offline' && (
            <div className="bg-card rounded-3xl p-6 shadow-sm border border-border">
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
                <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase">Pilih Kategori</label>
                <select value={kategoriPilih} onChange={(e) => setKategoriPilih(e.target.value as 'HA' | 'AV')} className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary appearance-none">
                  <option value="HA">HA (Home Appliance)</option>
                  <option value="AV">AV (Audio Video)</option>
                </select>
              </div>
              <button onClick={() => handleAksi('CheckIn')} disabled={isProcessing || setting?.statusAntrian === 'TUTUP' || !dalamRadius} className="w-full py-4 bg-primary text-primary-foreground font-black rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 transition-all flex justify-center items-center gap-2">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-primary-foreground" />}
                {isProcessing ? 'Memproses...' : !dalamRadius ? 'DI LUAR RADIUS' : 'KONFIRMASI KEHADIRAN'}
              </button>
            </div>
          )}

          {statusSaya === 'Standby' && (
            <div className="bg-card rounded-3xl p-6 text-center shadow-xl border border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Nomor Antrian Anda</p>
              <div className="text-8xl font-black text-foreground my-2 tracking-tighter">{listHA.findIndex(a => a.nama === userData.nama) + 1}</div>
              <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-8 bg-secondary text-primary uppercase">KATEGORI {dataSaya?.kategori}</div>
              <div className="space-y-3">
                <button onClick={() => handleAksi('BawaCustomer')} className="w-full py-4 bg-primary text-primary-foreground font-black rounded-xl shadow-lg shadow-primary/30 hover:scale-[1.02] transition-transform flex justify-center items-center gap-2"><Play className="w-5 h-5 fill-primary-foreground" /> SUDAH MEMBAWA CUSTOMER</button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleAksi('Ibadah')} className="py-3 px-2 bg-amber-500/10 text-amber-500 font-bold rounded-xl text-[11px] flex flex-col justify-center items-center gap-1.5 hover:bg-amber-500/20 transition border border-amber-500/20 leading-tight">
                    <span className="text-center">SEDANG IBADAH</span>
                  </button>
                  <button onClick={() => handleAksi('PanggilCS')} className="py-3 px-2 bg-purple-500/10 text-purple-500 font-bold rounded-xl text-[11px] flex flex-col justify-center items-center gap-1.5 hover:bg-purple-500/20 transition border border-purple-500/20 leading-tight">
                    <Package className="w-5 h-5" /> <span className="text-center">DIPANGGIL CS</span>
                  </button>
                </div>
                <button onClick={() => handleAksi('Keluar')} className="w-full py-3.5 bg-destructive/10 text-destructive font-bold rounded-xl text-xs flex justify-center items-center gap-2 hover:bg-destructive/20 transition border border-destructive/20">
                  <LogOut className="w-4 h-4" /> KELUAR ANTRIAN
                </button>
              </div>
            </div>
          )}

          {statusSaya === 'Melayani' && (
            <div className="bg-blue-600 rounded-3xl p-8 text-center text-white shadow-xl shadow-blue-500/20">
              <h2 className="text-2xl font-black mb-2 uppercase">Sedang Melayani</h2>
              <p className="text-xs text-blue-100 mb-8">Berikan pelayanan terbaik!</p>
              <button onClick={() => handleAksi('Selesai')} className="w-full py-4 bg-white text-blue-700 font-black rounded-xl shadow-lg flex justify-center items-center gap-2"><ArrowRight className="w-5 h-5" /> SELESAI MELAYANI</button>
            </div>
          )}

          {statusSaya === 'Dipanggil CS' && (
            <div className="bg-purple-600 rounded-3xl p-8 text-center text-white shadow-xl shadow-purple-500/20">
              <Package className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-2xl font-black mb-2 uppercase">Dipanggil CS</h2>
              <p className="text-xs text-purple-100 mb-8">Posisi #{dataSaya?.posisiTerkunci || '-'} Anda aman terkunci.</p>
              <button onClick={() => handleAksi('KembaliCS')} className="w-full py-4 bg-white text-purple-700 font-black rounded-xl shadow-lg">KEMBALI ANTRI</button>
            </div>
          )}

          {statusSaya === 'Ibadah' && (
            <div className="bg-amber-500 rounded-3xl p-8 text-center text-white shadow-xl shadow-amber-500/20">
              <h2 className="text-2xl font-black mb-2 uppercase">Sedang Ibadah</h2>
              <p className="text-xs text-amber-100 mb-8">Posisi #{dataSaya?.posisiTerkunci || '-'} Anda aman terkunci.</p>
              <button onClick={() => handleAksi('KembaliIbadah')} className="w-full py-4 bg-white text-amber-700 font-black rounded-xl shadow-lg">SELESAI IBADAH</button>
            </div>
          )}
        </div>

        {/* LIST ANTRIAN LENGKAP */}
        <div className="space-y-4 mt-4">
          {['HA', 'AV'].map((kat) => {
            const list = kat === 'HA' ? listHA : listAV
            const listStandby = list.filter(a => a.status === 'Standby')
            return (
              <div key={kat} className="bg-card border border-border p-5 rounded-3xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase">
                    <span className={`w-2 h-2 rounded-full ${kat === 'HA' ? 'bg-primary' : 'bg-purple-500'}`}></span>
                    LIVE {kat}
                  </h3>
                  <span className="text-[10px] font-bold bg-secondary text-muted-foreground px-2.5 py-1 rounded-md">{listStandby.length} PROMOTOR</span>
                </div>
                <div className="space-y-2">
                  {list.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-2">Belum ada antrian</p> : list.map((item, idx) => {
                    const isSaya = item.nama.toLowerCase() === userData?.nama.toLowerCase()
                    const isGiliranUtama = item.status === 'Standby' && listStandby.findIndex(a => a.nama === item.nama) === 0
                    return (
                      <div key={idx} className={`flex justify-between items-center p-3 rounded-xl transition-colors ${isSaya ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/50 border border-transparent'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black ${isGiliranUtama ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-muted-foreground'}`}>
                            {item.status === 'Melayani' ? '-' : (idx+1)}
                          </span>
                          <span className={`text-xs font-bold uppercase ${isSaya ? 'text-primary' : 'text-foreground'}`}>{item.nama} {isSaya && '(Anda)'}</span>
                        </div>
                        {item.status === 'Melayani' ? <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-blue-500/20 text-blue-500">MELAYANI</span> : 
                         item.status === 'Dipanggil CS' ? <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-purple-500/20 text-purple-500">CS</span> :
                         item.status === 'Ibadah' ? <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-amber-500/20 text-amber-500">IBADAH</span> :
                         isGiliranUtama ? <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-destructive text-destructive-foreground animate-pulse">UTAMA</span> :
                         <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-secondary text-muted-foreground">STANDBY</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

      </main>

      {/* ACTION BAR V0.APP */}
      <ActionBar 
        disabled={statusSaya !== 'Offline' || setting?.statusAntrian === 'TUTUP' || !dalamRadius} 
        onTakeTurn={(type: QueueType) => {
          setKategoriPilih(type);
          handleAksi('CheckIn');
        }} 
      />

      {/* MODAL CLOSING (Dari logika Firebase asli Anda) */}
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