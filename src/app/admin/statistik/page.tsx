'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, BarChart3, TrendingUp, Users } from 'lucide-react'
import Link from 'next/link'

export default function StatistikPage() {
  const { user, loading: authLoading } = useAuth('ADMIN')
  const [loading, setLoading] = useState(true)
  const [aktivitas, setAktivitas] = useState<any[]>([])
  const [masterSales, setMasterSales] = useState<string[]>([])
  const [checkinHarian, setCheckinHarian] = useState<any>({})

  // === LOAD DATA ===
  useEffect(() => {
    const unsubMaster = onValue(ref(db, 'mastersales'), (snap) => {
      if (snap.exists()) {
        const data = snap.val()
        const names: string[] = []
        Object.values(data).forEach((item: any) => {
          const rec = item.record ? item.record : item
          const n = rec.NAMA_PROMOTOR || rec.nama || rec.Nama_Sales
          if (n) names.push(String(n).trim())
        })
        setMasterSales([...new Set(names)].sort())
      }
    })

    const unsubAktivitas = onValue(ref(db, 'statistikAktivitas'), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setAktivitas(list)
    })

    const unsubCheckin = onValue(ref(db, 'checkinHarian'), (snap) => {
      if (snap.exists()) setCheckinHarian(snap.val())
    })

    setTimeout(() => setLoading(false), 500)
    return () => { unsubMaster(); unsubAktivitas(); unsubCheckin(); }
  }, [])

  // === LOGIKA REKAP (DARI HTML LAMA) ===
  const getBulanIni = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const hitungRekap = () => {
    const bulanIni = getBulanIni()
    const perPromotor: any = {}
    
    masterSales.forEach(nama => {
      const clean = nama.toLowerCase().replace(/\s+/g, '_')
      perPromotor[clean] = { nama, deal: 0, lihat: 0, noSale: 0, hari: 0 }
    })

    aktivitas.forEach(a => {
      const tgl = a.tanggal
      if (!tgl) return
      const parts = String(tgl).split('-')
      if (parts.length !== 3) return
      const tglKey = `${parts[2]}-${parts[1]}-${parts[0]}`
      if (!tglKey.startsWith(bulanIni)) return
      
      const clean = String(a.nama).trim().toLowerCase().replace(/\s+/g, '_')
      if (!perPromotor[clean]) return
      
      if (a.aksi === 'BawaCustomer' && a.waktuSelesai) {
        if (a.hasil === 'Deal') perPromotor[clean].deal++
        else if (a.hasil === 'Lihat') perPromotor[clean].lihat++
      }
    })

    // Hitung hari & no sale
    Object.keys(perPromotor).forEach(clean => {
      const dataCheckin = checkinHarian[clean]
      if (!dataCheckin) return
      
      const hariSet = new Set<string>()
      Object.keys(dataCheckin).forEach(k => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && k.startsWith(bulanIni)) hariSet.add(k)
      })
      if (dataCheckin.tanggalKey && dataCheckin.tanggalKey.startsWith(bulanIni)) {
        hariSet.add(dataCheckin.tanggalKey)
      }
      perPromotor[clean].hari = hariSet.size

      let noSale = 0
      hariSet.forEach(tglKeyHari => {
        const p = tglKeyHari.split('-')
        const tglIndo = `${p[2]}-${p[1]}-${p[0]}`
        const adaDeal = aktivitas.some(a => 
          String(a.nama).toLowerCase().replace(/\s+/g, '_') === clean &&
          a.tanggal === tglIndo && a.aksi === 'BawaCustomer' && a.hasil === 'Deal'
        )
        if (!adaDeal) noSale++
      })
      perPromotor[clean].noSale = noSale
    })

    return Object.values(perPromotor)
      .filter((p: any) => p.hari > 0 || p.deal > 0 || p.lihat > 0)
      .sort((a: any, b: any) => b.deal - a.deal || b.lihat - a.lihat)
  }

  const rekap = hitungRekap()
  const totalDeal = rekap.reduce((s: number, p: any) => s + p.deal, 0)
  const totalLihat = rekap.reduce((s: number, p: any) => s + p.lihat, 0)
  const totalNoSale = rekap.reduce((s: number, p: any) => s + p.noSale, 0)

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8 flex justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Statistik Bulanan</h1>
            <p className="text-sm text-slate-400">Rekap performa promotor bulan ini</p>
          </div>
        </div>

        {/* KARTU TOTAL */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <p className="text-xs font-bold text-slate-400 uppercase">Total Deal</p>
            </div>
            <p className="text-4xl font-black text-emerald-400">{totalDeal}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <p className="text-xs font-bold text-slate-400 uppercase">Total Lihat</p>
            </div>
            <p className="text-4xl font-black text-amber-400">{totalLihat}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-red-400" />
              <p className="text-xs font-bold text-slate-400 uppercase">Total No Sale</p>
            </div>
            <p className="text-4xl font-black text-red-400">{totalNoSale}</p>
          </div>
        </div>

        {/* TABEL REKAP */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
          <h3 className="text-lg font-bold text-white mb-4">Rekap per Promotor</h3>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Nama Promotor</th>
                <th className="px-4 py-3 text-center">Deal</th>
                <th className="px-4 py-3 text-center">Lihat</th>
                <th className="px-4 py-3 text-center">No Sale</th>
                <th className="px-4 py-3 text-center rounded-r-lg">Hari Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rekap.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Belum ada data bulan ini</td></tr>
              ) : rekap.map((p: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/50 transition">
                  <td className="px-4 py-3 font-semibold text-white">{p.nama}</td>
                  <td className="px-4 py-3 text-center font-black text-emerald-400">{p.deal}</td>
                  <td className="px-4 py-3 text-center font-black text-amber-400">{p.lihat}</td>
                  <td className="px-4 py-3 text-center font-black text-red-400">{p.noSale}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-300">{p.hari} hari</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </motion.div>
    </div>
  )
}