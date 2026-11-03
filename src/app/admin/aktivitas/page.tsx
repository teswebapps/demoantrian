'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Users, Coffee, LogOut, ShieldAlert, Award, Calendar, X, Sun, Moon, ShieldCheck, LayoutDashboard, History, Settings } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'

const NAMA_BULAN = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
]

export default function AktivitasAdminPage() {
  const { user, loading: authLoading, logout } = useAuth('ADMIN')
  const { isDark, toggleTheme, mounted } = useTheme()
  const [loading, setLoading] = useState(true)
  
  const [popupType, setPopupType] = useState<string | null>(null)
  const [statistikList, setStatistikList] = useState<any[]>([])
  const [checkinList, setCheckinList] = useState<any[]>([])
  const [whitelistUsers, setWhitelistUsers] = useState<any[]>([])
  
  const [hariIniIndo, setHariIniIndo] = useState('')
  const [todayKey, setTodayKey] = useState('')
  const [periodeBulanIni, setPeriodeBulanIni] = useState('')

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    const d = new Date()
    const tglIndo = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
    const tglKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    
    setHariIniIndo(tglIndo)
    setTodayKey(tglKey)
    setPeriodeBulanIni(`${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`)
    
    if (!TOKO_ID) return

    const unsubStat = onValue(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setStatistikList(list)
    })

    const unsubCheckin = onValue(ref(db, `toko/${TOKO_ID}/checkinHarian`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) {
        Object.keys(data).forEach(promotorKey => {
          const tglData = data[promotorKey]
          if (tglData && typeof tglData === 'object') {
            Object.keys(tglData).forEach(dateKey => {
              list.push({ ...tglData[dateKey], promotorKey, dateKey })
            })
          }
        })
      }
      setCheckinList(list)
    })

    const unsubUser = onValue(ref(db, 'users/whitelist'), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) {
        Object.keys(data).forEach(k => {
          if (data[k].role !== 'ADMIN') list.push({ ...data[k], _key: k })
        })
      }
      setWhitelistUsers(list)
      setLoading(false)
    })

    return () => {
      unsubStat()
      unsubCheckin()
      unsubUser()
    }
  }, [TOKO_ID])

  useEffect(() => {
    if (mounted) {
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [isDark, mounted])

  const formatJam = (ts: number) => ts ? `${String(new Date(ts).getHours()).padStart(2,'0')}.${String(new Date(ts).getMinutes()).padStart(2,'0')}` : '-'

  const aktivitasHariIni = statistikList.filter(a => a.tanggal === hariIniIndo)
  const listBawa = aktivitasHariIni.filter(a => a.aksi === 'BawaCustomer')
  const listIbadah = aktivitasHariIni.filter(a => a.aksi === 'MulaiIbadah' || a.aksi === 'SelesaiIbadah' || a.aksi === 'Ibadah')
  const listKeluar = aktivitasHariIni.filter(a => a.aksi === 'KeluarAntrian')
  const listAutokick = aktivitasHariIni.filter(a => a.aksi === 'Autokick')
  const checkinHariIni = checkinList.filter(c => c.tanggalKey === todayKey)

  const rekapPromotorMap = statistikList
    .filter(a => a.aksi === 'BawaCustomer' && a.nama && a.tanggal)
    .reduce((acc: any, curr: any) => {
      const parts = String(curr.tanggal).split('-')
      if (parts.length === 3) {
        const blnThn = `${NAMA_BULAN[parseInt(parts[1]) - 1]} ${parts[2]}`
        if (blnThn !== periodeBulanIni) return acc
      }

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

  if (authLoading || loading || !mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex relative font-sans transition-colors duration-300 pb-16 md:pb-6">
      
      {/* SIDEBAR (Desktop) */}
      <aside className="w-64 bg-card border-r border-border flex-col hidden md:flex">
        <div className="p-5 flex items-center gap-3 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-md overflow-hidden border border-border p-1">
            <img src="/logo-ufo.png" alt="UFO Logo" className="w-full h-full object-contain" />
          </div>
          <div><h1 className="text-xs font-bold text-foreground uppercase">UFO Admin</h1><p className="text-[9px] text-muted-foreground uppercase">Kebonsari</p></div>
        </div>
        <nav className="flex-1 p-3 space-y-1.5">
          <Link href="/admin" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><LayoutDashboard className="w-4 h-4" /> Dashboard</Link>
          <Link href="/admin/aktivitas" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-xs"><History className="w-4 h-4" /> Aktivitas & Rekap</Link>
          <Link href="/admin/manajemen" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><ShieldAlert className="w-4 h-4" /> Darurat</Link>
          <Link href="/admin/pengaturan" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition text-xs"><Settings className="w-4 h-4" /> Pengaturan</Link>
        </nav>
        <div className="p-3 border-t border-border">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition text-xs font-semibold shadow-sm">
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {popupType && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-card rounded-3xl w-full max-w-lg border border-border shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-border">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {popupType === 'checkin' && `Check-in Promotor Hari Ini (${hariIniIndo})`}
                  {popupType === 'bawa' && 'Bawa Customer Hari Ini (All Promotor)'}
                  {popupType === 'ibadah' && 'Ibadah Hari Ini (All Promotor)'}
                  {popupType === 'keluar' && 'Keluar Antrian Hari Ini (All Promotor)'}
                  {popupType === 'autokick' && 'Autokick (Pelanggaran)'}
                  {popupType === 'rekapPromotor' && `Rekap Bawa Customer (${periodeBulanIni})`}
                </h3>
                <button onClick={() => setPopupType(null)} className="p-1.5 text-muted-foreground hover:text-destructive bg-secondary rounded-full transition"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 max-h-[65vh] overflow-y-auto space-y-2.5">
                
                {popupType === 'checkin' && (
                  <div className="space-y-2">
                    {whitelistUsers.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Belum ada promotor terdaftar</p>
                    ) : (
                      whitelistUsers.map((p, idx) => {
                        const checkinData = checkinHariIni.find(c => c.nama.toLowerCase() === p.nama.toLowerCase())
                        return (
                          <div key={idx} className="flex justify-between items-center p-3 bg-secondary/50 rounded-2xl text-xs border border-border/60 shadow-sm">
                            <span className="font-bold text-foreground uppercase text-xs">{p.nama}</span>
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md ${checkinData ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'}`}>
                              {checkinData ? formatJam(checkinData.waktu) : 'Belum Check-in'}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}

                {popupType === 'rekapPromotor' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-secondary rounded-xl text-[11px] font-bold text-muted-foreground uppercase">
                      <div className="col-span-5">Nama Promotor</div>
                      <div className="col-span-2 text-center">Deal</div>
                      <div className="col-span-2 text-center">Lihat</div>
                      <div className="col-span-1 text-center">No Sale</div>
                      <div className="col-span-2 text-center">Hari</div>
                    </div>
                    {listRekapPromotor.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Belum ada data rekap bulan ini</p>
                    ) : (
                      listRekapPromotor.map((row: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-12 gap-1 px-3 py-2.5 bg-secondary/50 rounded-2xl text-xs items-center border border-border/60 shadow-sm">
                          <div className="col-span-5 font-bold text-foreground uppercase truncate">{row.namaPromotor}</div>
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
                      <div key={i} className="flex justify-between items-center p-3 bg-secondary/50 rounded-2xl text-xs border border-border/60 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground uppercase text-xs">{a.nama}</span>
                          {a.hasil === 'Deal' && <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded">DEAL</span>}
                          {a.hasil === 'Lihat' && <span className="text-[9px] font-black bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">LIHAT</span>}
                          {!a.waktuSelesai && <span className="text-[9px] font-black bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded animate-pulse">PROSES</span>}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          {formatJam(a.waktuMulai)} {a.waktuSelesai ? `- ${formatJam(a.waktuSelesai)}` : '...'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {popupType === 'ibadah' && (
                  <div className="space-y-2">
                    {listIbadah.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-4">Belum ada</p> : listIbadah.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-secondary/50 rounded-2xl text-xs border border-border/60 shadow-sm">
                        <span className="font-bold text-foreground uppercase text-xs">{a.nama}</span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {formatJam(a.waktuMulai || a.waktu)} {a.waktuSelesai ? `- ${formatJam(a.waktuSelesai)}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {popupType === 'keluar' && (
                  <div className="space-y-2">
                    {listKeluar.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-4">Belum ada</p> : listKeluar.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-secondary/50 rounded-2xl text-xs border border-border/60 shadow-sm">
                        <span className="font-bold text-foreground uppercase text-xs">{a.nama}</span>
                        <span className="text-xs text-muted-foreground font-medium">{formatJam(a.waktu)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {popupType === 'autokick' && (
                  <div className="space-y-2">
                    {listAutokick.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-4">Tidak ada pelanggaran</p> : listAutokick.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-secondary/50 rounded-2xl text-xs border border-border/60 shadow-sm">
                        <div>
                          <span className="font-bold text-foreground uppercase block text-xs">{a.nama}</span>
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 p-4 md:p-6 overflow-y-auto max-w-5xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-foreground uppercase tracking-tight">Aktivitas & Rekap</h1>
            <p className="text-xs text-muted-foreground uppercase">Monitoring operasional & kinerja</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2.5 rounded-full bg-card border border-border text-muted-foreground hover:text-primary transition-colors shadow-sm">
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aktivitas & Live Antrian Hari Ini</h3>
          
          {/* Diubah dari grid-cols-2 / grid-cols-3 menjadi grid-cols-1 agar tersusun menurun 1 kolom */}
          <div className="grid grid-cols-1 gap-3">
            <button onClick={() => setPopupType('checkin')} className="w-full bg-secondary/60 border border-border/60 rounded-2xl p-4 flex items-center justify-between relative hover:bg-secondary transition shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-bold text-foreground uppercase">Check-in Promotor</span>
              </div>
              <span className="text-xs font-black bg-emerald-500 text-white px-3 py-1 rounded-full">{checkinHariIni.length}</span>
            </button>

            <button onClick={() => setPopupType('bawa')} className="w-full bg-secondary/60 border border-border/60 rounded-2xl p-4 flex items-center justify-between relative hover:bg-secondary transition shadow-sm">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-sky-500" />
                <span className="text-xs font-bold text-foreground uppercase">Bawa Customer</span>
              </div>
              <span className="text-xs font-black bg-sky-500 text-white px-3 py-1 rounded-full">{listBawa.length}</span>
            </button>

            <button onClick={() => setPopupType('ibadah')} className="w-full bg-secondary/60 border border-border/60 rounded-2xl p-4 flex items-center justify-between relative hover:bg-secondary transition shadow-sm">
              <div className="flex items-center gap-3">
                <Coffee className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-bold text-foreground uppercase">Ibadah</span>
              </div>
              <span className="text-xs font-black bg-amber-500 text-white px-3 py-1 rounded-full">{listIbadah.length}</span>
            </button>

            <button onClick={() => setPopupType('keluar')} className="w-full bg-secondary/60 border border-border/60 rounded-2xl p-4 flex items-center justify-between relative hover:bg-secondary transition shadow-sm">
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5 text-rose-500" />
                <span className="text-xs font-bold text-foreground uppercase">Keluar Antrian</span>
              </div>
              <span className="text-xs font-black bg-rose-500 text-white px-3 py-1 rounded-full">{listKeluar.length}</span>
            </button>

            <button onClick={() => setPopupType('autokick')} className="w-full bg-secondary/60 border border-border/60 rounded-2xl p-4 flex items-center justify-between relative hover:bg-secondary transition shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-destructive" />
                <span className="text-xs font-bold text-foreground uppercase">Autokick</span>
              </div>
              <span className="text-xs font-black bg-destructive text-white px-3 py-1 rounded-full">{listAutokick.length}</span>
            </button>

            <button onClick={() => setPopupType('rekapPromotor')} className="w-full bg-secondary/60 border border-border/60 rounded-2xl p-4 flex items-center justify-between relative hover:bg-secondary transition shadow-sm text-foreground">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-bold uppercase">Rekap Promotor</span>
              </div>
            </button>

            <Link href="/admin/total-bulanan" className="w-full bg-secondary/60 border border-border/60 rounded-2xl p-4 flex items-center justify-between relative hover:bg-secondary transition shadow-sm text-foreground">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <span className="text-xs font-bold uppercase">Total Bulanan</span>
              </div>
            </Link>
          </div>
        </div>

      </motion.div>
    </div>
  )
}