'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function TotalBulananPage() {
  const { user, loading: authLoading } = useAuth('ADMIN')
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

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8 flex justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl">
        
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Total Bulanan</h1>
            <p className="text-sm text-slate-400">Rekap customer walk-in per bulan tahun {tahunIni}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2"><TrendingUp className="w-5 h-5 text-emerald-400" /><p className="text-xs font-bold text-slate-400 uppercase">Total Deal Tahun Ini</p></div>
            <p className="text-4xl font-black text-emerald-400">{totalDeal}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2"><Calendar className="w-5 h-5 text-amber-400" /><p className="text-xs font-bold text-slate-400 uppercase">Total Lihat Tahun Ini</p></div>
            <p className="text-4xl font-black text-amber-400">{totalLihat}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4">Rekap per Bulan</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Bulan</th>
                  <th className="px-4 py-3 text-center">Deal</th>
                  <th className="px-4 py-3 text-center rounded-r-lg">Lihat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {dataBulanan.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Belum ada data tahun ini</td></tr>
                ) : dataBulanan.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 font-semibold text-white">{b.namaBln} {b.tahun}</td>
                    <td className="px-4 py-3 text-center font-black text-emerald-400">{b.deal}</td>
                    <td className="px-4 py-3 text-center font-black text-amber-400">{b.lihat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </motion.div>
    </div>
  )
}