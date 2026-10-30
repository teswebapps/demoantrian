'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, Users, Coffee, LogOut, ShieldAlert, Award, Calendar, X, Sun, Moon, History } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'

export default function AktivitasAdminPage() {
  const { user, loading: authLoading } = useAuth('ADMIN')
  const { isDark, toggleTheme, mounted } = useTheme()
  const [loading, setLoading] = useState(true)
  
  const [popupType, setPopupType] = useState<string | null>(null)
  const [statistikList, setStatistikList] = useState<any[]>([])
  const [hariIniIndo, setHariIniIndo] = useState('')

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    const d = new Date()
    const tglIndo = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
    setHariIniIndo(tglIndo)
    
    if (!TOKO_ID) return
    const unsub = onValue(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setStatistikList(list)
      setLoading(false)
    })
    return () => unsub()
  }, [TOKO_ID])

  // Filter Aktivitas Hari Ini
  const aktivitasHariIni = statistikList.filter(a => a.tanggal === hariIniIndo)
  const listBawa = aktivitasHariIni.filter(a => a.aksi === 'BawaCustomer')
  const listIbadah = aktivitasHariIni.filter(a => a.aksi === 'MulaiIbadah')
  const listKeluar = aktivitasHariIni.filter(a => a.aksi === 'KeluarAntrian')
  const listAutokick = aktivitasHariIni.filter(a => a.aksi === 'Autokick')

  // Logika Rekap Promotor Keseluruhan
  const rekapPromotorMap = statistikList
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

  if (authLoading || loading || !mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex justify-center transition-colors duration-300 pb-16">
      
      {/* MODAL POPUP DETAIL AKTIVITAS & REKAP */}
      <AnimatePresence>
        {popupType && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-card rounded-3xl w-full max-w-lg border border-border shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-border">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {popupType === 'bawa' && 'Bawa Customer Hari Ini'}
                  {popupType === 'ibadah' && 'Ibadah Hari Ini'}
                  {popupType === 'keluar' && 'Keluar Antrian Hari Ini'}
                  {popupType === 'autokick' && 'Autokick (Pelanggaran)'}
                  {popupType === 'rekapPromotor' && 'Rekap Bawa Customer per Promotor'}
                </h3>
                <button onClick={() => setPopupType(null)} className="p-1.5 text-muted-foreground hover:text-destructive bg-secondary rounded-full transition"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 max-h-[65vh] overflow-y-auto space-y-2.5">
                
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl space-y-5">
        
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2.5 bg-card border border-border rounded-2xl text-muted-foreground hover:text-foreground transition shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg md:text-2xl font-bold text-foreground uppercase tracking-tight">Aktivitas & Rekap</h1>
            <p className="text-[11px] md:text-xs text-muted-foreground uppercase">Monitoring operasional & kinerja</p>
          </div>
          <button onClick={toggleTheme} className="p-2.5 rounded-full bg-card border border-border text-muted-foreground hover:text-primary transition-colors shadow-sm">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* MENU KOTAK CARD AKTIVITAS & REKAP */}
        <div className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aktivitas & Live Antrian Hari Ini</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
              <LogOut className="w-4 h-4 text-rose-500 mt-1" />
              <span className="text-[11px] font-bold text-foreground uppercase">Keluar Antrian</span>
              <span className="absolute top-3 right-3 text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">{listKeluar.length}</span>
            </button>
            <button onClick={() => setPopupType('autokick')} className="bg-secondary/60 border border-border/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 relative hover:bg-secondary transition shadow-sm">
              <ShieldAlert className="w-4 h-4 text-destructive mt-1" />
              <span className="text-[11px] font-bold text-foreground uppercase">Autokick</span>
              <span className="absolute top-3 right-3 text-[9px] font-black bg-destructive text-white px-2 py-0.5 rounded-full">{listAutokick.length}</span>
            </button>
            <button onClick={() => setPopupType('rekapPromotor')} className="bg-secondary/60 border border-border/60 rounded-2xl p-4 flex items-center justify-center gap-2 hover:bg-secondary transition shadow-sm text-foreground">
              <Award className="w-4 h-4 text-emerald-500" />
              <span className="text-[11px] font-bold uppercase">Rekap Promotor</span>
            </button>
            <Link href="/admin/total-bulanan" className="bg-secondary/60 border border-border/60 rounded-2xl p-4 flex items-center justify-center gap-2 hover:bg-secondary transition shadow-sm text-foreground">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span className="text-[11px] font-bold uppercase">Total Bulanan</span>
            </Link>
          </div>
        </div>

      </motion.div>
    </div>
  )
}