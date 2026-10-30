'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, update, remove, set, onValue, push, get } from 'firebase/database'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2, LogOut, Shield, Users, Clock, LayoutDashboard, 
  ListOrdered, Settings, UserCheck, Unlock, Lock, 
  Trash2, X, Calendar, Sun, Moon,
  History, BarChart3, Coffee, LogOut as LogOutIcon,
  ShieldAlert, Award
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAntrian } from '@/hooks/useAntrian'

export default function AdminPage() {
  const { user, loading: authLoading, error, logout } = useAuth('ADMIN')
  const { antrian, setting, loading: dataLoading } = useAntrian(user?.tokoId || 'ufo-kebonsari')
  const { isDark, toggleTheme, mounted } = useTheme()
  
  const [isUpdating, setIsUpdating] = useState(false)
  const [popupType, setPopupType] = useState<string | null>(null)
  
  const [aktivitasHariIni, setAktivitasHariIni] = useState<any[]>([])
  const [semuaAktivitas, setSemuaAktivitas] = useState<any[]>([])
  const [hariIniIndo, setHariIniIndo] = useState('')

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    const d = new Date()
    setHariIniIndo(`${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`)
    
    if (!TOKO_ID) return
    const unsub = onValue(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setSemuaAktivitas(list)
      setAktivitasHariIni(list.filter(a => a.tanggal === hariIniIndo))
    })
    return () => unsub()
  }, [TOKO_ID, hariIniIndo])

  if (authLoading || !mounted) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center bg-background text-destructive">{error}</div>
  if (!user) { 
    if (typeof window !== 'undefined') window.location.href = '/login'
    return null 
  }

  const toggleStatusAntrian = async () => {
    if (!TOKO_ID || isUpdating) return
    setIsUpdating(true)
    const statusBaru = setting?.statusAntrian === 'BUKA' ? 'TUTUP' : 'BUKA'
    try { await update(ref(db, `toko/${TOKO_ID}/setting`), { statusAntrian: statusBaru }) } 
    catch (err) { console.error(err) } finally { setIsUpdating(false) }
  }

  const hapusAntrian = async (nama: string) => {
    if (!window.confirm(`Keluarkan ${nama} dari antrian?`)) return
    try {
      const clean = nama.trim().toLowerCase().replace(/\s+/g, '_')
      await remove(ref(db, `toko/${TOKO_ID}/antrian/` + clean))
      await push(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), { nama, aksi: 'KeluarAntrian', waktu: Date.now(), tanggal: hariIniIndo, hasil: 'Admin' })
    } catch (err) { console.error(err) }
  }

  // Hitung Statistik
  const totalStandby = antrian.filter(a => a.status === 'Standby').length
  const totalMelayani = antrian.filter(a => a.status === 'Melayani').length
  const totalHA = antrian.filter(a => a.kategori === 'HA').length
  const totalAV = antrian.filter(a => a.kategori === 'AV').length

  // Filter List Kategori untuk Live Antrian
  const listHA = antrian.filter(a => a.kategori === 'HA')
  const listAV = antrian.filter(a => a.kategori === 'AV')

  // Filter Aktivitas Hari Ini
  const listBawa = aktivitasHariIni.filter(a => a.aksi === 'BawaCustomer')
  const listIbadah = aktivitasHariIni.filter(a => a.aksi === 'MulaiIbadah')
  const listAutokick = aktivitasHariIni.filter(a => a.aksi === 'Autokick')
  const listKeluar = aktivitasHariIni.filter(a => a.aksi === 'KeluarAntrian')

  // Logika Rekap Promotor (Berdasarkan Gambar Contoh)
  const rekapPromotorMap = semuaAktivitas
    .filter(a => a.aksi === 'BawaCustomer' && a.nama)
    .reduce((acc: any, curr: any) => {
      const nama = curr.nama.toUpperCase()
      if (!acc[nama]) {
        acc[nama] = { namaPromotor: nama, deal: 0, lihat: 0, noSale: 0, hariSet: new Set() }
      }
      if (curr.hasil === 'Deal') acc[nama].deal += 1
      else if (curr.hasil === 'Lihat') acc[nama].lihat += 1
      else if (curr.hasil === 'No Sale' || curr.hasil === 'Tidak Deal') acc[nama].noSale += 1
      
      if (curr.tanggal) acc[nama].hariSet.add(curr.tanggal)
      return acc
    }, {})

  const listRekapPromotor = Object.values(rekapPromotorMap)
    .map((item: any) => ({ ...item, hari: item.hariSet.size }))
    .sort((a: any, b: any) => b.deal - a.deal)

  const formatJam = (ts: number) => ts ? `${String(new Date(ts).getHours()).padStart(2,'0')}.${String(new Date(ts).getMinutes()).padStart(2,'0')}` : '-'

  return (
    <div className="min-h-screen bg-background flex relative font-sans text-foreground transition-colors duration-300 pb-16">
      
      {/* MODAL POPUP AKTIVITAS & LIVE ANTRIAN / REKAP */}
      <AnimatePresence>
        {popupType && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-card rounded-3xl w-full max-w-lg border border-border shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-border">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {popupType === 'liveHA' && 'Live Urutan Antrian HA'}
                  {popupType === 'liveAV' && 'Live Urutan Antrian AV'}
                  {popupType === 'bawa' && 'Bawa Customer Hari Ini'}
                  {popupType === 'ibadah' && 'Ibadah Hari Ini'}
                  {popupType === 'keluar' && 'Keluar Antrian Hari Ini'}
                  {popupType === 'autokick' && 'Autokick (Pelanggaran)'}
                  {popupType === 'rekapPromotor' && 'Rekap Bawa Customer per Promotor'}
                </h3>
                <button onClick={() => setPopupType(null)} className="p-1.5 text-muted-foreground hover:text-destructive bg-secondary rounded-full transition"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 max-h-[65vh] overflow-y-auto space-y-2.5">
                
                {popupType === 'liveHA' && (
                  <div className="space-y-2">
                    {listHA.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-4">Belum ada antrian HA</p> : listHA.map((item, idx) => {
                      const listStandby = listHA.filter(a => a.status === 'Standby');
                      const isGiliranUtama = item.status === 'Standby' && listStandby.findIndex(a => a.nama === item.nama) === 0;
                      return (
                        <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-secondary/50 rounded-2xl text-xs border border-slate-200 dark:border-border shadow-sm">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black ${isGiliranUtama ? 'bg-rose-500 text-white' : 'bg-secondary text-muted-foreground'}`}>
                              {item.status === 'Melayani' ? '-' : (idx + 1)}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-foreground uppercase text-xs">{item.nama}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.status === 'Melayani' ? (
                              <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-blue-600 dark:bg-blue-500/20 text-white dark:text-blue-400">Melayani</span>
                            ) : item.status === 'Dipanggil CS' ? (
                              <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-purple-600 dark:bg-purple-500/20 text-white dark:text-purple-400">CS / GUDANG</span>
                            ) : item.status === 'Ibadah' ? (
                              <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-amber-500 dark:bg-amber-500/20 text-white dark:text-amber-400">Ibadah</span>
                            ) : isGiliranUtama ? (
                              <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-rose-500 text-white animate-pulse">Utama</span>
                            ) : (
                              <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-slate-200 dark:bg-secondary text-slate-800 dark:text-muted-foreground">Standby</span>
                            )}
                            <button onClick={() => hapusAntrian(item.nama)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {popupType === 'liveAV' && (
                  <div className="space-y-2">
                    {listAV.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-4">Belum ada antrian AV</p> : listAV.map((item, idx) => {
                      const listStandby = listAV.filter(a => a.status === 'Standby');
                      const isGiliranUtama = item.status === 'Standby' && listStandby.findIndex(a => a.nama === item.nama) === 0;
                      return (
                        <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-secondary/50 rounded-2xl text-xs border border-slate-200 dark:border-border shadow-sm">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black ${isGiliranUtama ? 'bg-rose-500 text-white' : 'bg-secondary text-muted-foreground'}`}>
                              {item.status === 'Melayani' ? '-' : (idx + 1)}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-foreground uppercase text-xs">{item.nama}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.status === 'Melayani' ? (
                              <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-blue-600 dark:bg-blue-500/20 text-white dark:text-blue-400">Melayani</span>
                            ) : item.status === 'Dipanggil CS' ? (
                              <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-purple-600 dark:bg-purple-500/20 text-white dark:text-purple-400">CS / GUDANG</span>
                            ) : item.status === 'Ibadah' ? (
                              <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-amber-500 dark:bg-amber-500/20 text-white dark:text-amber-400">Ibadah</span>
                            ) : isGiliranUtama ? (
                              <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-rose-500 text-white animate-pulse">Utama</span>
                            ) : (
                              <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-slate-200 dark:bg-secondary text-slate-800 dark:text-muted-foreground">Standby</span>
                            )}
                            <button onClick={() => hapusAntrian(item.nama)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {popupType === 'rekapPromotor' && (
                  <div className="space-y-2">
                    <div className="bg-secondary/50 p-2.5 rounded-xl text-center text-[11px] font-bold text-muted-foreground uppercase mb-3">
                      Periode Keseluruhan Aktivitas
                    </div>
                    <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-secondary rounded-xl text-[11px] font-bold text-muted-foreground uppercase">
                      <div className="col-span-5">Nama Promotor</div>
                      <div className="col-span-2 text-center">Deal</div>
                      <div className="col-span-2 text-center">Lihat</div>
                      <div className="col-span-1 text-center">No Sale</div>
                      <div className="col-span-2 text-center">Hari</div>
                    </div>
                    {listRekapPromotor.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Belum ada data rekap</p>
                    ) : (
                      listRekapPromotor.map((row: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-12 gap-1 px-3 py-2.5 bg-white dark:bg-secondary/50 rounded-xl text-xs items-center border border-slate-200 dark:border-border shadow-sm">
                          <div className="col-span-5 font-bold text-slate-900 dark:text-foreground uppercase truncate">{row.namaPromotor}</div>
                          <div className="col-span-2 text-center font-bold text-emerald-500">{row.deal}</div>
                          <div className="col-span-2 text-center font-bold text-amber-500">{row.lihat}</div>
                          <div className="col-span-1 text-center font-bold text-destructive">{row.noSale}</div>
                          <div className="col-span-2 text-center font-bold text-muted-foreground">{row.hari}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {popupType === 'bawa' && (
                  <div className="space-y-2">
                    {listBawa.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-4">Belum ada aktivitas</p> : listBawa.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-secondary/50 rounded-2xl text-xs border border-slate-200 dark:border-border shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-foreground uppercase text-xs">{a.nama}</span>
                          {a.hasil === 'Deal' && <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded">DEAL</span>}
                          {a.hasil === 'Lihat' && <span className="text-[9px] font-black bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">LIHAT</span>}
                          {!a.waktuSelesai && <span className="text-[9px] font-black bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded animate-pulse">PROSES</span>}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">{formatJam(a.waktuMulai)} - {a.waktuSelesai ? formatJam(a.waktuSelesai) : '...'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {popupType === 'ibadah' && (
                  <div className="space-y-2">
                    {listIbadah.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-4">Belum ada</p> : listIbadah.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-secondary/50 rounded-2xl text-xs border border-slate-200 dark:border-border shadow-sm">
                        <span className="font-bold text-slate-900 dark:text-foreground uppercase text-xs">{a.nama}</span>
                        <span className="text-xs text-muted-foreground font-medium">{formatJam(a.waktu)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {popupType === 'keluar' && (
                  <div className="space-y-2">
                    {listKeluar.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-4">Belum ada</p> : listKeluar.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-secondary/50 rounded-2xl text-xs border border-slate-200 dark:border-border shadow-sm">
                        <span className="font-bold text-slate-900 dark:text-foreground uppercase text-xs">{a.nama}</span>
                        <span className="text-xs text-muted-foreground font-medium">{formatJam(a.waktu)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {popupType === 'autokick' && (
                  <div className="space-y-2">
                    {listAutokick.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-4">Tidak ada pelanggaran</p> : listAutokick.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-secondary/50 rounded-2xl text-xs border border-slate-200 dark:border-border shadow-sm">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-foreground uppercase block text-xs">{a.nama}</span>
                          <span className="text-[10px] text-destructive font-bold">{a.hasil || a.kategori}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">{formatJam(a.waktu)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR (Desktop) */}
      <aside className="w-64 bg-card border-r border-border flex-col hidden md:flex">
        <div className="p-5 flex items-center gap-3 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20"><Shield className="w-4 h-4 text-white" /></div>
          <div><h1 className="text-xs font-bold text-foreground uppercase">UFO Admin</h1><p className="text-[9px] text-muted-foreground uppercase">Kebonsari</p></div>
        </div>
        <nav className="flex-1 p-3 space-y-1.5">
          <Link href="/admin" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-xs"><LayoutDashboard className="w-4 h-4" /> Dashboard</Link>
          <Link href="/admin/aktivitas" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><History className="w-4 h-4" /> Aktivitas & Rekap</Link>
          <Link href="/admin/pengaturan" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><Settings className="w-4 h-4" /> Pengaturan</Link>
        </nav>
        <div className="p-3 border-t border-border">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition text-xs font-semibold"><LogOut className="w-3.5 h-3.5" /> Keluar</button>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-tight">Dashboard Admin</h2>
            <p className="text-xs text-muted-foreground">Halo, <span className="text-primary font-bold uppercase">{user?.nama}</span></p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button onClick={toggleTheme} className="p-2.5 rounded-full bg-card border border-border text-muted-foreground hover:text-primary transition-colors shadow-sm">
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button onClick={toggleStatusAntrian} disabled={isUpdating} className={`flex-1 md:flex-none justify-center flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold tracking-wide transition-all border shadow-sm uppercase ${setting?.statusAntrian === 'BUKA' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : setting?.statusAntrian === 'BUKA' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {setting?.statusAntrian === 'BUKA' ? 'DIBUKA' : 'DITUTUP'}
            </button>
            <button onClick={logout} className="md:hidden p-2.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* STATISTIK KARTU KECIL */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard title="Total Antri" value={totalStandby} icon={<Users />} color="text-sky-500" bg="bg-sky-500/10" />
          <StatCard title="Sedang Dilayani" value={totalMelayani} icon={<UserCheck />} color="text-cyan-500" bg="bg-cyan-500/10" />
          <StatCard title="Kategori HA" value={totalHA} icon={<ListOrdered />} color="text-amber-500" bg="bg-amber-500/10" />
          <StatCard title="Kategori AV" value={totalAV} icon={<ListOrdered />} color="text-purple-500" bg="bg-purple-500/10" />
        </div>

        {/* MENU AKTIVITAS & LIVE ANTRIAN DI BAWAH (Gaya Kotak Card Sesuai Gambar Referensi) */}
        <div className="bg-card border border-border rounded-3xl p-4 md:p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aktivitas & Live Antrian Hari Ini</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button onClick={() => setPopupType('liveHA')} className="bg-secondary/60 border border-border/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 relative hover:bg-secondary transition shadow-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-500 absolute top-3 left-3"></span>
              <Users className="w-4 h-4 text-cyan-500 mt-1" />
              <span className="text-[11px] font-bold text-foreground uppercase">Live Antrian HA</span>
              <span className="text-[10px] text-muted-foreground font-semibold">{listHA.filter(a => a.status === 'Standby').length} Antri</span>
            </button>

            <button onClick={() => setPopupType('liveAV')} className="bg-secondary/60 border border-border/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 relative hover:bg-secondary transition shadow-sm">
              <span className="w-2 h-2 rounded-full bg-purple-500 absolute top-3 left-3"></span>
              <Users className="w-4 h-4 text-purple-500 mt-1" />
              <span className="text-[11px] font-bold text-foreground uppercase">Live Antrian AV</span>
              <span className="text-[10px] text-muted-foreground font-semibold">{listAV.filter(a => a.status === 'Standby').length} Antri</span>
            </button>

            <button onClick={() => setPopupType('bawa')} className="bg-secondary/60 border border-border/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 relative hover:bg-secondary transition shadow-sm">
              <Users className="w-4 h-4 text-sky-500 mt-1" />
              <span className="text-[11px] font-bold text-foreground uppercase">Bawa Customer</span>
              <span className="absolute top-3 right-3 text-[9px] font-black bg-sky-500 text-white px-2 py-0.5 rounded-full">{listBawa.length}</span>
            </button>
            <button onClick={() => setPopupType('ibadah')} className="bg-secondary/60 border border-border/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 relative hover:bg-secondary transition shadow-sm">
              <Coffee className="w-4 h-4 text-amber-500 mt-1" />
              <span className="text-[11px] font-bold text-foreground uppercase">Ibadah</span>
              <span className="absolute top-3 right-3 text-[9px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">{listIbadah.length}</span>
            </button>
            <button onClick={() => setPopupType('keluar')} className="bg-secondary/60 border border-border/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 relative hover:bg-secondary transition shadow-sm">
              <LogOutIcon className="w-4 h-4 text-rose-500 mt-1" />
              <span className="text-[11px] font-bold text-foreground uppercase">Keluar Antrian</span>
              <span className="absolute top-3 right-3 text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">{listKeluar.length}</span>
            </button>
            <button onClick={() => setPopupType('autokick')} className="bg-secondary/60 border border-border/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 relative hover:bg-secondary transition shadow-sm">
              <ShieldAlert className="w-4 h-4 text-destructive mt-1" />
              <span className="text-[11px] font-bold text-foreground uppercase">Autokick</span>
              <span className="absolute top-3 right-3 text-[9px] font-black bg-destructive text-white px-2 py-0.5 rounded-full">{listAutokick.length}</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <button onClick={() => setPopupType('rekapPromotor')} className="bg-secondary/60 border border-border/60 rounded-2xl p-4 flex items-center justify-center gap-2.5 hover:bg-secondary transition shadow-sm text-foreground">
              <Award className="w-5 h-5 text-emerald-500" />
              <span className="text-xs font-bold uppercase">Rekap Promotor</span>
            </button>
            <Link href="/admin/total-bulanan" className="bg-secondary/60 border border-border/60 rounded-2xl p-4 flex items-center justify-center gap-2.5 hover:bg-secondary transition shadow-sm text-foreground">
              <Calendar className="w-5 h-5 text-indigo-500" />
              <span className="text-xs font-bold uppercase">Total Bulanan</span>
            </Link>
          </div>
        </div>

      </main>
    </div>
  )
}

function StatCard({ title, value, icon, color, bg }: { title: string, value: number, icon: React.ReactNode, color: string, bg: string }) {
  return (
    <div className="bg-card border border-border p-3.5 rounded-3xl flex flex-col justify-between shadow-sm">
      <div className="flex justify-between items-start mb-3"><div className={`p-2 rounded-2xl ${bg} ${color}`}>{icon}</div></div>
      <div><p className="text-xl md:text-2xl font-black text-foreground">{value}</p><p className="text-[10px] text-muted-foreground font-bold mt-0.5 uppercase tracking-wide">{title}</p></div>
    </div>
  )
}