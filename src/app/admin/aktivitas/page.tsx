'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Users, Coffee, LogOut, ShieldAlert, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function AktivitasPage() {
  const { user, loading: authLoading } = useAuth('ADMIN')
  const [loading, setLoading] = useState(true)
  const [aktivitas, setAktivitas] = useState<any[]>([])
  const [masterSales, setMasterSales] = useState<string[]>([])
  const [checkinHarian, setCheckinHarian] = useState<any>({})
  const [riwayatBulanan, setRiwayatBulanan] = useState<any>({})
  
  const [hariIniIndo, setHariIniIndo] = useState('')
  const [bulanIni, setBulanIni] = useState('')

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    const d = new Date()
    setHariIniIndo(`${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`)
    setBulanIni(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)

    if (!TOKO_ID) return

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

    const unsubAktivitas = onValue(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setAktivitas(list)
    })

    const unsubCheckin = onValue(ref(db, `toko/${TOKO_ID}/checkinHarian`), (snap) => {
      if (snap.exists()) setCheckinHarian(snap.val())
    })

    const unsubRiwayat = onValue(ref(db, `toko/${TOKO_ID}/riwayatBulanan`), (snap) => {
      if (snap.exists()) setRiwayatBulanan(snap.val())
    })

    setTimeout(() => setLoading(false), 500)
    return () => { unsubMaster(); unsubAktivitas(); unsubCheckin(); unsubRiwayat(); }
  }, [TOKO_ID])

  const hitungRekap = () => {
    if (!bulanIni) return []
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

    if (riwayatBulanan[bulanIni]) {
      Object.keys(riwayatBulanan[bulanIni]).forEach(clean => {
        const data = riwayatBulanan[bulanIni][clean]
        if (!perPromotor[clean]) perPromotor[clean] = { nama: data.nama, deal: 0, lihat: 0, noSale: 0, hari: 0 }
        perPromotor[clean].noSale = data.noSale || 0
      })
    }

    Object.keys(perPromotor).forEach(clean => {
      const dataCheckin = checkinHarian[clean]
      if (!dataCheckin) return
      const hariSet = new Set<string>()
      Object.keys(dataCheckin).forEach(k => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && k.startsWith(bulanIni)) hariSet.add(k)
      })
      if (dataCheckin.tanggalKey && dataCheckin.tanggalKey.startsWith(bulanIni)) hariSet.add(dataCheckin.tanggalKey)
      perPromotor[clean].hari = hariSet.size
    })

    return Object.values(perPromotor)
      .filter((p: any) => p.hari > 0 || p.deal > 0 || p.lihat > 0 || p.noSale > 0)
      .sort((a: any, b: any) => b.deal - a.deal || b.lihat - a.lihat)
  }

  const aktivitasHariIni = hariIniIndo ? aktivitas.filter(a => a.tanggal === hariIniIndo) : []
  const listBawa = aktivitasHariIni.filter(a => a.aksi === 'BawaCustomer').sort((a,b) => (b.waktuMulai||0) - (a.waktuMulai||0))
  const listIbadah = aktivitasHariIni.filter(a => a.aksi === 'MulaiIbadah').sort((a,b) => (b.waktu||0) - (a.waktu||0))
  const listKeluar = aktivitasHariIni.filter(a => a.aksi === 'KeluarAntrian').sort((a,b) => (b.waktu||0) - (a.waktu||0))
  const listAutokick = aktivitasHariIni.filter(a => a.aksi === 'Autokick').sort((a,b) => (b.waktu||0) - (a.waktu||0))

  const formatJam = (ts: number) => {
    if (!ts) return '-'
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2,'0')}.${String(d.getMinutes()).padStart(2,'0')}`
  }

  const rekap = hitungRekap()
  const totalDeal = rekap.reduce((s: number, p: any) => s + p.deal, 0)
  const totalLihat = rekap.reduce((s: number, p: any) => s + p.lihat, 0)
  const totalNoSale = rekap.reduce((s: number, p: any) => s + p.noSale, 0)

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8 flex justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
        
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Aktivitas & Rekap</h1>
            <p className="text-sm text-slate-400">Laporan lengkap hari ini & bulan ini</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Deal</p>
            <p className="text-3xl font-black text-emerald-400">{totalDeal}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Lihat</p>
            <p className="text-3xl font-black text-amber-400">{totalLihat}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total No Sale</p>
            <p className="text-3xl font-black text-red-400">{totalNoSale}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-500" /> Rekap Bulanan per Promotor</h3>
          <div className="overflow-x-auto">
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
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h4 className="text-sm font-bold text-cyan-400 mb-4 flex items-center gap-2"><Users className="w-4 h-4" /> Bawa Customer Hari Ini</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {listBawa.length === 0 ? <p className="text-xs text-slate-500 italic">Belum ada</p> : listBawa.map((a, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950/50 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{a.nama}</span>
                    {a.hasil === 'Deal' && <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">DEAL</span>}
                    {a.hasil === 'Lihat' && <span className="text-[9px] font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">LIHAT</span>}
                    {!a.waktuSelesai && <span className="text-[9px] font-black bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded animate-pulse">PROSES</span>}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">({formatJam(a.waktuMulai)} - {a.waktuSelesai ? formatJam(a.waktuSelesai) : '...'})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h4 className="text-sm font-bold text-purple-400 mb-4 flex items-center gap-2"><Coffee className="w-4 h-4" /> Ibadah Hari Ini</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {listIbadah.length === 0 ? <p className="text-xs text-slate-500 italic">Belum ada</p> : listIbadah.map((a, idx) => {
                const selesai = aktivitasHariIni.find(b => b.aksi === 'SelesaiIbadah' && b.nama === a.nama && b.waktu > a.waktu)
                return (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950/50 rounded-lg border border-slate-800">
                    <span className="text-xs font-bold text-white">{a.nama}</span>
                    <span className="text-[10px] text-slate-400 font-medium">({formatJam(a.waktu)} - {selesai ? formatJam(selesai.waktu) : '...'})</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h4 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2"><LogOut className="w-4 h-4" /> Keluar Antrian Hari Ini</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {listKeluar.length === 0 ? <p className="text-xs text-slate-500 italic">Belum ada</p> : listKeluar.map((a, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950/50 rounded-lg border border-slate-800">
                  <span className="text-xs font-bold text-white">{a.nama}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{formatJam(a.waktu)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h4 className="text-sm font-bold text-red-400 mb-4 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Autokick (Pelanggaran)</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {listAutokick.length === 0 ? <p className="text-xs text-slate-500 italic">Tidak ada pelanggaran 👍</p> : listAutokick.map((a, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950/50 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white block">{a.nama}</span>
                    <span className="text-[10px] text-red-400 font-medium">{a.hasil || a.kategori}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{formatJam(a.waktu)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </motion.div>
    </div>
  )
}