'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Calendar, TrendingUp, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'

const NAMA_BULAN = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
]

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
      const namaBln = NAMA_BULAN[parseInt(parts[1]) - 1]
      return { bulanKey, namaBln, tahun: parts[0], ...p }
    })
  }

  const dataBulanan = hitungTotalBulanan()
  const totalDeal = dataBulanan.reduce((s, b) => s + b.deal, 0)
  const totalLihat = dataBulanan.reduce((s, b) => s + b.lihat, 0)

  if (authLoading || loading || !mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex justify-center transition-colors duration-300 pb-28 sm:pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl space-y-5">

        {/* HEADER */}
        <div className="flex items-start sm:items-center gap-3">
          <Link href="/admin" className="p-2.5 bg-card border border-border rounded-2xl text-muted-foreground hover:text-foreground transition shadow-sm shrink-0 mt-0.5 sm:mt-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-black text-foreground uppercase tracking-tight leading-tight">Total Bulanan</h1>
            <p className="text-[11px] md:text-xs text-muted-foreground uppercase leading-snug mt-0.5">
              Rekap customer walk-in per bulan tahun {tahunIni}
            </p>
          </div>
          <button onClick={toggleTheme} className="p-2.5 rounded-full bg-card border border-border text-muted-foreground hover:text-primary transition-colors shadow-sm shrink-0 mt-0.5 sm:mt-0">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* DUA KARTU STATISTIK ATAS */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-card border border-border p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wide leading-tight whitespace-nowrap">
                Total Deal {tahunIni}
              </p>
            </div>
            <p className="text-4xl sm:text-5xl font-black text-emerald-500 tracking-tight leading-none">{totalDeal}</p>
          </div>

          <div className="bg-card border border-border p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wide leading-tight whitespace-nowrap">
                Total Lihat {tahunIni}
              </p>
            </div>
            <p className="text-4xl sm:text-5xl font-black text-amber-500 tracking-tight leading-none">{totalLihat}</p>
          </div>
        </div>

        {/* REKAP PER BULAN */}
        <div className="bg-card border border-border rounded-3xl p-4 sm:p-6 shadow-sm transition-colors">
          <h3 className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider">Rekap per Bulan</h3>

          <div className="w-full space-y-2.5">
            {/* Header kolom di layar sm ke atas */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-4 py-2.5 bg-secondary rounded-2xl text-xs font-bold text-muted-foreground uppercase">
              <div className="col-span-6">Bulan</div>
              <div className="col-span-3 text-center">Deal</div>
              <div className="col-span-3 text-center">Lihat</div>
            </div>

            <div className="space-y-2.5">
              {dataBulanan.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-6">Belum ada data tahun ini</p>
              ) : dataBulanan.map((b, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-4 sm:grid sm:grid-cols-12 sm:gap-2 px-4 py-3.5 bg-white dark:bg-secondary/50 rounded-2xl border border-slate-200 dark:border-border shadow-sm"
                >
                  <div className="sm:col-span-6 text-sm sm:text-base font-black text-slate-900 dark:text-foreground uppercase tracking-tight">
                    {b.namaBln} {b.tahun}
                  </div>

                  <div className="flex items-center gap-5 sm:contents shrink-0">
                    <div className="sm:col-span-3 flex flex-col items-center justify-center">
                      <span className="sm:hidden text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deal</span>
                      <span className="text-2xl sm:text-2xl font-black text-emerald-500 leading-tight">{b.deal}</span>
                    </div>

                    <div className="sm:col-span-3 flex flex-col items-center justify-center">
                      <span className="sm:hidden text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lihat</span>
                      <span className="text-2xl sm:text-2xl font-black text-amber-500 leading-tight">{b.lihat}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  )
}