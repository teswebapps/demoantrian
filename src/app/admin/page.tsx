'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, update, remove, onValue, push } from 'firebase/database'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2, LogOut, Users, LayoutDashboard, 
  ListOrdered, Settings, UserCheck, Unlock, Lock, 
  Trash2, X, Sun, Moon,
  History, BarChart3, Calendar, Coffee, LogOut as LogOutIcon, ShieldAlert
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAntrian } from '@/hooks/useAntrian'

export default function AdminPage() {
  const { user, loading: authLoading, error, logout } = useAuth('ADMIN')
  const { antrian, setting, loading: dataLoading } = useAntrian(user?.tokoId || 'ufo-kebonsari')
  const { isDark, toggleTheme, mounted } = useTheme()
  
  const [isUpdating, setIsUpdating] = useState(false)
  const [hariIniIndo, setHariIniIndo] = useState('')

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    const d = new Date()
    setHariIniIndo(`${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`)
  }, [])

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

  return (
    <div className="min-h-screen bg-background flex relative font-sans text-foreground transition-colors duration-300 pb-16">
      
      {/* SIDEBAR (Desktop) */}
      <aside className="w-64 bg-card border-r border-border flex-col hidden md:flex">
        <div className="p-5 flex items-center gap-3 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-md overflow-hidden border border-border p-1">
            <img src="/logo-ufo.png" alt="UFO Logo" className="w-full h-full object-contain" />
          </div>
          <div><h1 className="text-xs font-bold text-foreground uppercase">UFO Malang</h1><p className="text-[9px] text-muted-foreground uppercase">Kebonsari</p></div>
        </div>
        <nav className="flex-1 p-3 space-y-1.5">
          <Link href="/admin" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-xs"><LayoutDashboard className="w-4 h-4" /> Dashboard</Link>
          <Link href="/admin/aktivitas" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><History className="w-4 h-4" /> Aktivitas & Rekap</Link>
          <Link href="/admin/manajemen" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><ShieldAlert className="w-4 h-4" /> Darurat</Link>
          <Link href="/admin/pengaturan" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><Settings className="w-4 h-4" /> Pengaturan</Link>
        </nav>
        <div className="p-3 border-t border-border">
         <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition text-xs font-semibold shadow-sm">
  <LogOut className="w-3.5 h-3.5" /> Keluar
</button>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-5xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Total Antri" value={totalStandby} icon={<Users />} color="text-sky-500" bg="bg-sky-500/10" />
          <StatCard title="Sedang Dilayani" value={totalMelayani} icon={<UserCheck />} color="text-cyan-500" bg="bg-cyan-500/10" />
          <StatCard title="Kategori HA" value={totalHA} icon={<ListOrdered />} color="text-amber-500" bg="bg-amber-500/10" />
          <StatCard title="Kategori AV" value={totalAV} icon={<ListOrdered />} color="text-purple-500" bg="bg-purple-500/10" />
        </div>

        {/* LIVE URUTAN ANTRIAN HA & AV (PERSIS SEPERTI HALAMAN PROMOTOR DI HALAMAN UTAMA) */}
        <div className="space-y-4">
          {['HA', 'AV'].map((kat) => {
            const list = kat === 'HA' ? listHA : listAV;
            const listStandby = list.filter(a => a.status === 'Standby');
            
            return (
              <div key={kat} className="bg-card border border-border p-5 rounded-3xl shadow-sm">
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
                      const isGiliranUtama = item.status === 'Standby' && listStandby.findIndex(a => a.nama === item.nama) === 0;
                      
                      return (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-xl transition-colors bg-white dark:bg-secondary/50 text-slate-900 dark:text-foreground border border-slate-200 dark:border-border/60 shadow-sm">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black ${isGiliranUtama ? 'bg-rose-500 text-white' : 'bg-secondary text-muted-foreground'}`}>
                              {item.status === 'Melayani' ? '-' : (idx + 1)}
                            </span>
                            <span className="text-xs font-bold uppercase text-slate-900 dark:text-foreground">
                              {item.nama}
                            </span>
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
                            <button onClick={() => hapusAntrian(item.nama)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition">
                              <Trash2 className="w-4 h-4" />
                            </button>
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