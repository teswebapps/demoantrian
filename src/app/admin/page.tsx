'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, update, remove, push, onValue } from 'firebase/database'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2, LogOut, Shield, Users, ListOrdered, Settings, UserCheck, Unlock, Lock, 
  Trash2, X, Calendar, Sun, Moon,
  History, BarChart3, Coffee, LogOut as LogOutIcon,
  ShieldAlert, LayoutDashboard
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAntrian } from '@/hooks/useAntrian'

export default function AdminPage() {
  const { user, loading: authLoading, error, logout } = useAuth('ADMIN')
  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'
  const { antrian, setting, loading: dataLoading } = useAntrian(TOKO_ID)
  const { isDark, toggleTheme, mounted } = useTheme()
  
  const [isUpdating, setIsUpdating] = useState(false)
  const [popupType, setPopupType] = useState<string | null>(null)
  
  const [aktivitasHariIni, setAktivitasHariIni] = useState<any[]>([])
  const [hariIniIndo, setHariIniIndo] = useState('')

  useEffect(() => {
    const d = new Date()
    setHariIniIndo(`${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`)
    
    if (!TOKO_ID) return
    const unsub = onValue(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setAktivitasHariIni(list)
    })
    return () => unsub()
  }, [TOKO_ID])

  if (authLoading || !mounted) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-red-500">{error}</div>
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
  const listBawa = aktivitasHariIni.filter(a => a.aksi === 'BawaCustomer' && a.tanggal === hariIniIndo)
  const listIbadah = aktivitasHariIni.filter(a => a.aksi === 'MulaiIbadah' && a.tanggal === hariIniIndo)
  const listAutokick = aktivitasHariIni.filter(a => a.aksi === 'Autokick' && a.tanggal === hariIniIndo)
  const listKeluar = aktivitasHariIni.filter(a => a.aksi === 'KeluarAntrian' && a.tanggal === hariIniIndo)

  const formatJam = (ts: number) => ts ? `${String(new Date(ts).getHours()).padStart(2,'0')}.${String(new Date(ts).getMinutes()).padStart(2,'0')}` : '-'

  return (
    <div className="min-h-screen bg-slate-950 flex relative font-sans text-slate-200 transition-colors duration-300 pb-16">
      
      {/* MODAL POPUP AKTIVITAS & LIVE ANTRIAN */}
      <AnimatePresence>
        {popupType && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800 shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-slate-800">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  {popupType === 'liveHA' && 'Live Urutan Antrian HA'}
                  {popupType === 'liveAV' && 'Live Urutan Antrian AV'}
                  {popupType === 'bawa' && 'Bawa Customer Hari Ini'}
                  {popupType === 'ibadah' && 'Ibadah Hari Ini'}
                  {popupType === 'keluar' && 'Keluar Antrian Hari Ini'}
                  {popupType === 'autokick' && 'Autokick (Pelanggaran)'}
                </h3>
                <button onClick={() => setPopupType(null)} className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800/80 rounded-full transition"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 max-h-[65vh] overflow-y-auto space-y-2">
                
                {popupType === 'liveHA' && (
                  <div className="space-y-1.5">
                    {listHA.length === 0 ? <p className="text-xs text-slate-400 italic text-center py-4">Belum ada antrian HA</p> : listHA.map((item, idx) => {
                      const listStandby = listHA.filter(a => a.status === 'Standby');
                      const isGiliranUtama = item.status === 'Standby' && listStandby.findIndex(a => a.nama === item.nama) === 0;
                      return (
                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-800/60 border border-slate-800 rounded-xl text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black ${isGiliranUtama ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                              {item.status === 'Melayani' ? '-' : (idx + 1)}
                            </span>
                            <div>
                              <span className="font-bold text-white uppercase text-xs block">{item.nama}</span>
                              <span className="text-[10px] text-slate-400">Check-in: {formatJam(item.waktuStandby)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.status === 'Melayani' ? (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-blue-500/20 text-blue-400">Melayani</span>
                            ) : item.status === 'Dipanggil CS' ? (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-purple-500/20 text-purple-400">CS</span>
                            ) : item.status === 'Ibadah' ? (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-amber-500/20 text-amber-400">Ibadah</span>
                            ) : isGiliranUtama ? (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-rose-500 text-white animate-pulse">Utama</span>
                            ) : (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-slate-800 text-slate-400">Standby</span>
                            )}
                            <button onClick={() => hapusAntrian(item.nama)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {popupType === 'liveAV' && (
                  <div className="space-y-1.5">
                    {listAV.length === 0 ? <p className="text-xs text-slate-400 italic text-center py-4">Belum ada antrian AV</p> : listAV.map((item, idx) => {
                      const listStandby = listAV.filter(a => a.status === 'Standby');
                      const isGiliranUtama = item.status === 'Standby' && listStandby.findIndex(a => a.nama === item.nama) === 0;
                      return (
                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-800/60 border border-slate-800 rounded-xl text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black ${isGiliranUtama ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                              {item.status === 'Melayani' ? '-' : (idx + 1)}
                            </span>
                            <div>
                              <span className="font-bold text-white uppercase text-xs block">{item.nama}</span>
                              <span className="text-[10px] text-slate-400">Check-in: {formatJam(item.waktuStandby)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.status === 'Melayani' ? (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-blue-500/20 text-blue-400">Melayani</span>
                            ) : item.status === 'Dipanggil CS' ? (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-purple-500/20 text-purple-400">CS</span>
                            ) : item.status === 'Ibadah' ? (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-amber-500/20 text-amber-400">Ibadah</span>
                            ) : isGiliranUtama ? (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-rose-500 text-white animate-pulse">Utama</span>
                            ) : (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-slate-800 text-slate-400">Standby</span>
                            )}
                            <button onClick={() => hapusAntrian(item.nama)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {popupType === 'bawa' && (
                  <div className="space-y-1.5">
                    {listBawa.length === 0 ? <p className="text-xs text-slate-400 italic text-center py-4">Belum ada aktivitas</p> : listBawa.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-800/60 border border-slate-800 rounded-xl text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white uppercase text-xs">{a.nama}</span>
                          {a.hasil === 'Deal' && <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">DEAL</span>}
                          {a.hasil === 'Lihat' && <span className="text-[9px] font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">LIHAT</span>}
                          {!a.waktuSelesai && <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded animate-pulse">PROSES</span>}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">{formatJam(a.waktuMulai)} - {a.waktuSelesai ? formatJam(a.waktuSelesai) : '...'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {popupType === 'ibadah' && (
                  <div className="space-y-1.5">
                    {listIbadah.length === 0 ? <p className="text-xs text-slate-400 italic text-center py-4">Belum ada</p> : listIbadah.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-800/60 border border-slate-800 rounded-xl text-xs">
                        <span className="font-bold text-white uppercase text-xs">{a.nama}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{formatJam(a.waktu)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {popupType === 'keluar' && (
                  <div className="space-y-1.5">
                    {listKeluar.length === 0 ? <p className="text-xs text-slate-400 italic text-center py-4">Belum ada</p> : listKeluar.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-800/60 border border-slate-800 rounded-xl text-xs">
                        <span className="font-bold text-white uppercase text-xs">{a.nama}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{formatJam(a.waktu)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {popupType === 'autokick' && (
                  <div className="space-y-1.5">
                    {listAutokick.length === 0 ? <p className="text-xs text-slate-400 italic text-center py-4">Tidak ada pelanggaran</p> : listAutokick.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-800/60 border border-slate-800 rounded-xl text-xs">
                        <div>
                          <span className="font-bold text-white uppercase block text-xs">{a.nama}</span>
                          <span className="text-[10px] text-red-400 font-bold">{a.hasil || a.kategori}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">{formatJam(a.waktu)}</span>
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
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex-col hidden md:flex">
        <div className="p-5 flex items-center gap-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20"><Shield className="w-4 h-4 text-white" /></div>
          <div><h1 className="text-xs font-bold text-white uppercase">UFO Admin</h1><p className="text-[9px] text-slate-400 uppercase">Kebonsari</p></div>
        </div>
        <nav className="flex-1 p-3 space-y-1.5">
          <Link href="/admin" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 font-semibold text-xs"><LayoutDashboard className="w-4 h-4" /> Dashboard</Link>
          <Link href="/admin/aktivitas" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 transition text-xs"><History className="w-4 h-4" /> Aktivitas & Rekap</Link>
          <Link href="/admin/pengaturan" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 transition text-xs"><Settings className="w-4 h-4" /> Pengaturan</Link>
        </nav>
        <div className="p-3 border-t border-slate-800">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition text-xs font-semibold"><LogOut className="w-3.5 h-3.5" /> Keluar</button>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight">Dashboard Admin</h2>
            <p className="text-xs text-slate-400">Halo, <span className="text-cyan-400 font-bold uppercase">{user?.nama}</span></p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button onClick={toggleTheme} className="p-2.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors shadow-sm">
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button onClick={toggleStatusAntrian} disabled={isUpdating} className={`flex-1 md:flex-none justify-center flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-bold tracking-wide transition-all border shadow-sm uppercase ${setting?.statusAntrian === 'BUKA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : setting?.statusAntrian === 'BUKA' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {setting?.statusAntrian === 'BUKA' ? 'DIBUKA' : 'DITUTUP'}
            </button>
            <button onClick={logout} className="md:hidden p-2.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* STATISTIK KARTU KECIL */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard title="Total Antri" value={totalStandby} icon={<Users />} color="text-sky-400" bg="bg-sky-500/10" />
          <StatCard title="Sedang Dilayani" value={totalMelayani} icon={<UserCheck />} color="text-cyan-400" bg="bg-cyan-500/10" />
          <StatCard title="Kategori HA" value={totalHA} icon={<ListOrdered />} color="text-amber-400" bg="bg-amber-500/10" />
          <StatCard title="Kategori AV" value={totalAV} icon={<ListOrdered />} color="text-purple-400" bg="bg-purple-500/10" />
        </div>

        {/* MENU AKTIVITAS & LIVE ANTRIAN DI BAWAH */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aktivitas & Live Antrian Hari Ini</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button onClick={() => setPopupType('liveHA')} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 relative hover:bg-slate-800 transition shadow-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-400 absolute top-3 left-3"></span>
              <Users className="w-4 h-4 text-cyan-400 mt-1" />
              <span className="text-[11px] font-bold text-slate-200 uppercase">Live Antrian HA</span>
              <span className="text-[10px] text-slate-400 font-semibold">{listHA.filter(a => a.status === 'Standby').length} Antri</span>
            </button>

            <button onClick={() => setPopupType('liveAV')} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 relative hover:bg-slate-800 transition shadow-sm">
              <span className="w-2 h-2 rounded-full bg-purple-400 absolute top-3 left-3"></span>
              <Users className="w-4 h-4 text-purple-400 mt-1" />
              <span className="text-[11px] font-bold text-slate-200 uppercase">Live Antrian AV</span>
              <span className="text-[10px] text-slate-400 font-semibold">{listAV.filter(a => a.status === 'Standby').length} Antri</span>
            </button>

            <button onClick={() => setPopupType('bawa')} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 relative hover:bg-slate-800 transition shadow-sm">
              <Users className="w-4 h-4 text-sky-400 mt-1" />
              <span className="text-[11px] font-bold text-slate-200 uppercase">Bawa Customer</span>
              <span className="absolute top-2.5 right-2.5 text-[9px] font-black bg-sky-500 text-white px-2 py-0.5 rounded-full">{listBawa.length}</span>
            </button>
            <button onClick={() => setPopupType('ibadah')} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 relative hover:bg-slate-800 transition shadow-sm">
              <Coffee className="w-4 h-4 text-amber-400 mt-1" />
              <span className="text-[11px] font-bold text-slate-200 uppercase">Ibadah</span>
              <span className="absolute top-2.5 right-2.5 text-[9px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">{listIbadah.length}</span>
            </button>
            <button onClick={() => setPopupType('keluar')} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 relative hover:bg-slate-800 transition shadow-sm">
              <LogOutIcon className="w-4 h-4 text-rose-400 mt-1" />
              <span className="text-[11px] font-bold text-slate-200 uppercase">Keluar Antrian</span>
              <span className="absolute top-2.5 right-2.5 text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">{listKeluar.length}</span>
            </button>
            <button onClick={() => setPopupType('autokick')} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 relative hover:bg-slate-800 transition shadow-sm">
              <ShieldAlert className="w-4 h-4 text-red-400 mt-1" />
              <span className="text-[11px] font-bold text-slate-200 uppercase">Autokick</span>
              <span className="absolute top-2.5 right-2.5 text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full">{listAutokick.length}</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
            <Link href="/admin/aktivitas" className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl py-3 text-center text-[11px] font-bold uppercase hover:bg-cyan-500/20 transition flex items-center justify-center gap-2 shadow-sm">
              <BarChart3 className="w-4 h-4" /> Aktivitas & Rekap Promotor
            </Link>
            <Link href="/admin/total-bulanan" className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl py-3 text-center text-[11px] font-bold uppercase hover:bg-indigo-500/20 transition flex items-center justify-center gap-2 shadow-sm">
              <Calendar className="w-4 h-4" /> Total Bulanan
            </Link>
          </div>
        </div>

      </main>
    </div>
  )
}

function StatCard({ title, value, icon, color, bg }: { title: string, value: number, icon: React.ReactNode, color: string, bg: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm">
      <div className="flex justify-between items-start mb-3"><div className={`p-2 rounded-xl ${bg} ${color}`}>{icon}</div></div>
      <div><p className="text-xl md:text-2xl font-black text-white">{value}</p><p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">{title}</p></div>
    </div>
  )
}