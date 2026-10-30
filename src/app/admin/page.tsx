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
  ShieldAlert, ChevronDown
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAntrian } from '@/hooks/useAntrian'

export default function AdminPage() {
  const { user, loading: authLoading, error, logout } = useAuth('ADMIN')
  const { antrian, setting, loading: dataLoading } = useAntrian(user?.tokoId || 'ufo-kebonsari')
  const { isDark, toggleTheme, mounted } = useTheme()
  
  const [isUpdating, setIsUpdating] = useState(false)
  const [isAktivitasOpen, setIsAktivitasOpen] = useState(false)
  const [popupType, setPopupType] = useState<string | null>(null)
  
  const [aktivitasHariIni, setAktivitasHariIni] = useState<any[]>([])
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

  // Filter List Kategori untuk Live Antrian Admin
  const listHA = antrian.filter(a => a.kategori === 'HA')
  const listAV = antrian.filter(a => a.kategori === 'AV')

  // Filter Aktivitas
  const listBawa = aktivitasHariIni.filter(a => a.aksi === 'BawaCustomer' && a.tanggal === hariIniIndo)
  const listIbadah = aktivitasHariIni.filter(a => a.aksi === 'MulaiIbadah' && a.tanggal === hariIniIndo)
  const listAutokick = aktivitasHariIni.filter(a => a.aksi === 'Autokick' && a.tanggal === hariIniIndo)
  const listKeluar = aktivitasHariIni.filter(a => a.aksi === 'KeluarAntrian' && a.tanggal === hariIniIndo)

  const formatJam = (ts: number) => ts ? `${String(new Date(ts).getHours()).padStart(2,'0')}.${String(new Date(ts).getMinutes()).padStart(2,'0')}` : '-'

  return (
    <div className="min-h-screen bg-slate-950 flex relative font-sans text-slate-200 transition-colors duration-300">
      
      {/* MODAL POPUP AKTIVITAS */}
      <AnimatePresence>
        {popupType && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-slate-900 rounded-3xl w-full max-w-sm border border-slate-800 shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white uppercase">
                  {popupType === 'bawa' && 'Bawa Customer Hari Ini'}
                  {popupType === 'ibadah' && 'Ibadah Hari Ini'}
                  {popupType === 'keluar' && 'Keluar Antrian Hari Ini'}
                  {popupType === 'autokick' && 'Autokick (Pelanggaran)'}
                </h3>
                <button onClick={() => setPopupType(null)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-800 rounded-full"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 max-h-[70vh] overflow-y-auto">
                {(popupType === 'bawa') && (
                  <div className="space-y-2">
                    {listBawa.length === 0 ? <p className="text-xs text-slate-400 italic text-center">Belum ada</p> : listBawa.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-800 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white uppercase">{a.nama}</span>
                          {a.hasil === 'Deal' && <span className="text-[9px] font-black bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded-md">DEAL</span>}
                          {a.hasil === 'Lihat' && <span className="text-[9px] font-black bg-amber-900/30 text-amber-400 px-2 py-1 rounded-md">LIHAT</span>}
                          {!a.waktuSelesai && <span className="text-[9px] font-black bg-blue-900/30 text-blue-400 px-2 py-1 rounded-md animate-pulse">PROSES</span>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">({formatJam(a.waktuMulai)} - {a.waktuSelesai ? formatJam(a.waktuSelesai) : '...'})</span>
                      </div>
                    ))}
                  </div>
                )}
                {(popupType === 'ibadah') && (
                  <div className="space-y-2">
                    {listIbadah.length === 0 ? <p className="text-xs text-slate-400 italic text-center">Belum ada</p> : listIbadah.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-800 rounded-xl">
                        <span className="text-xs font-bold text-white uppercase">{a.nama}</span>
                        <span className="text-[10px] text-slate-400">{formatJam(a.waktu)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(popupType === 'keluar') && (
                  <div className="space-y-2">
                    {listKeluar.length === 0 ? <p className="text-xs text-slate-400 italic text-center">Belum ada</p> : listKeluar.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-800 rounded-xl">
                        <span className="text-xs font-bold text-white uppercase">{a.nama}</span>
                        <span className="text-[10px] text-slate-400">{formatJam(a.waktu)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(popupType === 'autokick') && (
                  <div className="space-y-2">
                    {listAutokick.length === 0 ? <p className="text-xs text-slate-400 italic text-center">Tidak ada pelanggaran</p> : listAutokick.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-800 rounded-xl">
                        <div>
                          <span className="text-xs font-bold text-white uppercase block">{a.nama}</span>
                          <span className="text-[10px] text-red-500 font-bold">{a.hasil || a.kategori}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{formatJam(a.waktu)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR (Hanya Desktop) */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20"><Shield className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-sm font-bold text-white uppercase">UFO Admin</h1><p className="text-[10px] text-slate-400 uppercase">Kebonsari</p></div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-500/10 text-cyan-400 font-semibold text-sm"><LayoutDashboard className="w-5 h-5" /> Dashboard</Link>
          <Link href="/admin/aktivitas" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 transition text-sm"><History className="w-5 h-5" /> Aktivitas & Rekap</Link>
          <Link href="/admin/pengaturan" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 transition text-sm"><Settings className="w-5 h-5" /> Pengaturan</Link>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition text-sm font-semibold"><LogOut className="w-4 h-4" /> Keluar</button>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1 uppercase">Dashboard Admin</h2>
            <p className="text-sm text-slate-400">Selamat datang, <span className="text-cyan-400 font-bold uppercase">{user?.nama}</span></p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
            <button onClick={toggleTheme} className="p-2.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-500 transition-colors shadow-sm">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={toggleStatusAntrian} disabled={isUpdating} className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-wider transition-all border shadow-sm uppercase ${setting?.statusAntrian === 'BUKA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : setting?.statusAntrian === 'BUKA' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {setting?.statusAntrian === 'BUKA' ? 'DIBUKA' : 'DITUTUP'}
            </button>
            <button onClick={logout} className="md:hidden flex-1 justify-center flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition uppercase">
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </div>

        {/* STATISTIK KARTU */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          <StatCard title="Total Antri" value={totalStandby} icon={<Users />} color="text-sky-500" bg="bg-sky-500/10" />
          <StatCard title="Sedang Dilayani" value={totalMelayani} icon={<UserCheck />} color="text-cyan-500" bg="bg-cyan-500/10" />
          <StatCard title="Kategori HA" value={totalHA} icon={<ListOrdered />} color="text-amber-500" bg="bg-amber-500/10" />
          <StatCard title="Kategori AV" value={totalAV} icon={<ListOrdered />} color="text-purple-500" bg="bg-purple-500/10" />
        </div>

        {/* LIVE URUTAN ANTRIAN (Gaya Tampilan Promotor) */}
        <div className="space-y-4 mb-8">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Live Urutan Antrian Toko</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['HA', 'AV'].map((kat) => {
              const list = kat === 'HA' ? listHA : listAV;
              const listStandby = list.filter(a => a.status === 'Standby');
              
              return (
                <div key={kat} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase">
                      <span className={`w-2.5 h-2.5 rounded-full ${kat === 'HA' ? 'bg-cyan-500' : 'bg-purple-500'}`}></span>
                      Live Urutan {kat}
                    </h4>
                    <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md">
                      {listStandby.length} Antri
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {list.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-4">Belum ada antrian</p>
                    ) : (
                      list.map((item, idx) => {
                        const isGiliranUtama = item.status === 'Standby' && listStandby.findIndex(a => a.nama === item.nama) === 0;
                        
                        return (
                          <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                            <div className="flex items-center gap-3">
                              <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black ${isGiliranUtama ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                {item.status === 'Melayani' ? '-' : (idx + 1)}
                              </span>
                              <span className="text-xs font-bold uppercase text-white">
                                {item.nama}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {item.status === 'Melayani' ? (
                                <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-blue-500/20 text-blue-400">Melayani</span>
                              ) : item.status === 'Dipanggil CS' ? (
                                <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-purple-500/20 text-purple-400">CS</span>
                              ) : item.status === 'Ibadah' ? (
                                <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-amber-500/20 text-amber-400">Ibadah</span>
                              ) : isGiliranUtama ? (
                                <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-rose-500 text-white animate-pulse">Utama</span>
                              ) : (
                                <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-slate-800 text-slate-400">Standby</span>
                              )}
                              
                              <button onClick={() => hapusAntrian(item.nama)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Keluarkan"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* MENU AKTIVITAS (Bisa Diklik) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <button onClick={() => setIsAktivitasOpen(!isAktivitasOpen)} className="w-full flex justify-between items-center p-5 hover:bg-slate-800/50 transition">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase"><History className="w-5 h-5 text-slate-400" /> Aktivitas & Riwayat Hari Ini</h3>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isAktivitasOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {isAktivitasOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="p-4 md:p-5 grid grid-cols-2 md:grid-cols-3 gap-3 border-t border-slate-800">
                  <button onClick={() => setPopupType('bawa')} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-2 relative hover:bg-slate-700 transition">
                    <Users className="w-5 h-5 text-sky-500" />
                    <span className="text-[11px] font-bold text-slate-300 uppercase">Bawa Customer</span>
                    <span className="absolute top-2 right-2 text-[9px] font-black bg-sky-500 text-white px-1.5 py-0.5 rounded-full">{listBawa.length}</span>
                  </button>
                  <button onClick={() => setPopupType('ibadah')} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-2 relative hover:bg-slate-700 transition">
                    <Coffee className="w-5 h-5 text-amber-500" />
                    <span className="text-[11px] font-bold text-slate-300 uppercase">Ibadah</span>
                    <span className="absolute top-2 right-2 text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full">{listIbadah.length}</span>
                  </button>
                  <button onClick={() => setPopupType('keluar')} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-2 relative hover:bg-slate-700 transition">
                    <LogOutIcon className="w-5 h-5 text-rose-500" />
                    <span className="text-[11px] font-bold text-slate-300 uppercase">Keluar Antrian</span>
                    <span className="absolute top-2 right-2 text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full">{listKeluar.length}</span>
                  </button>
                  <button onClick={() => setPopupType('autokick')} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-2 relative hover:bg-slate-700 transition">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <span className="text-[11px] font-bold text-slate-300 uppercase">Autokick</span>
                    <span className="absolute top-2 right-2 text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">{listAutokick.length}</span>
                  </button>
                  <Link href="/admin/aktivitas" className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-2 hover:bg-slate-700 transition">
                    <BarChart3 className="w-5 h-5 text-cyan-500" />
                    <span className="text-[11px] font-bold text-slate-300 uppercase text-center">Rekap Promotor</span>
                  </Link>
                  <Link href="/admin/total-bulanan" className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center gap-2 hover:bg-slate-700 transition">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    <span className="text-[11px] font-bold text-slate-300 uppercase text-center">Total Bulanan</span>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>
    </div>
  )
}

function StatCard({ title, value, icon, color, bg }: { title: string, value: number, icon: React.ReactNode, color: string, bg: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
      <div className="flex justify-between items-start mb-3"><div className={`p-2 rounded-xl ${bg} ${color}`}>{icon}</div></div>
      <div><p className="text-2xl md:text-3xl font-black text-white">{value}</p><p className="text-[10px] md:text-xs text-slate-400 font-bold mt-1 uppercase">{title}</p></div>
    </div>
  )
}