'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Calendar, TrendingUp, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'

export default function TotalBulananPage() {
  const { user, loading: authLoading } = useAuth('ADMIN')
  const { isDark, toggleTheme, mounted } = useTheme()
  const [loading, setLoading] = useState(true)
  const [aktivitas, setAktivitas] = useState<any[]>([])
  const [tahunIni, setTahunIni] = useState('')

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    const d = new Date()
    setTahunIni(String(d.getFullYear()))

    if (!TOKO_ID) return

    const unsub = onValue(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setAktivitas(list)
      setLoading(false)
    })
    return () => unsub()
  }, [TOKO_ID])

  const hitungTotalBulanan = () => {
    if (!tahunIni) return []
    
    const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
    const perBulan: any = {}

    aktivitas.forEach(a => {
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

  const dataBulanan = hitungTotalBulanan()
  const totalDeal = dataBulanan.reduce((s, b) => s + b.deal, 0)
  const totalLihat = dataBulanan.reduce((s, b) => s + b.lihat, 0)

  if (authLoading || loading || !mounted) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex justify-center transition-colors duration-300">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl">
        
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin" className="p-2.5 bg-card border border-border rounded-2xl text-muted-foreground hover:text-foreground transition shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-foreground uppercase tracking-tight">Total Bulanan</h1>
            <p className="text-xs text-muted-foreground uppercase">Rekap customer walk-in per bulan tahun {tahunIni}</p>
          </div>
          <button onClick={toggleTheme} className="p-2.5 rounded-full bg-card border border-border text-muted-foreground hover:text-primary transition-colors shadow-sm">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border border-border p-5 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-500" /><p className="text-[10px] font-bold text-muted-foreground uppercase">Total Deal Tahun Ini</p></div>
            <p className="text-3xl md:text-4xl font-black text-emerald-500">{totalDeal}</p>
          </div>
          <div className="bg-card border border-border p-5 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-amber-500" /><p className="text-[10px] font-bold text-muted-foreground uppercase">Total Lihat Tahun Ini</p></div>
            <p className="text-3xl md:text-4xl font-black text-amber-500">{totalLihat}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm transition-colors">
          <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Rekap per Bulan</h3>
          
          <div className="w-full space-y-2.5">
            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-secondary rounded-2xl text-xs font-bold text-muted-foreground uppercase">
              <div className="col-span-6">Bulan</div>
              <div className="col-span-3 text-center">Deal</div>
              <div className="col-span-3 text-center">Lihat</div>
            </div>

            <div className="space-y-2">
              {dataBulanan.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-6">Belum ada data tahun ini</p>
              ) : dataBulanan.map((b, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 bg-white dark:bg-secondary/50 rounded-2xl text-xs items-center border border-slate-200 dark:border-border shadow-sm">
                  <div className="col-span-6 font-bold text-slate-900 dark:text-foreground uppercase">{b.namaBln} {b.tahun}</div>
                  <div className="col-span-3 text-center font-black text-emerald-500">{b.deal}</div>
                  <div className="col-span-3 text-center font-black text-amber-500">{b.lihat}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  )
}