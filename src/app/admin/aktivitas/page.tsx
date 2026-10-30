'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Calendar, TrendingUp, Sun, Moon, History, Users, ShieldCheck, Coffee, LogOut, Award } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export default function AktivitasAdminPage() {
  const { user, loading: authLoading } = useAuth('ADMIN')
  const { isDark, toggleTheme, mounted } = useTheme()
  const [loading, setLoading] = useState(true)
  
  const [statistikList, setStatistikList] = useState<any[]>([])
  const [checkinList, setCheckinList] = useState<any[]>([])
  const [whitelistUsers, setWhitelistUsers] = useState<any[]>([])
  
  const [hariIniIndo, setHariIniIndo] = useState('')
  const [todayKey, setTodayKey] = useState('')

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    const d = new Date()
    const tglIndo = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
    const tglKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    
    setHariIniIndo(tglIndo)
    setTodayKey(tglKey)

    if (!TOKO_ID) return

    // 1. Ambil Statistik Aktivitas
    const unsubStat = onValue(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setStatistikList(list)
    })

    // 2. Ambil Checkin Harian All Promotor
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

    // 3. Ambil Data Whitelist (Daftar Promotor)
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

  const formatJam = (ts: number) => ts ? `${String(new Date(ts).getHours()).padStart(2,'0')}.${String(new Date(ts).getMinutes()).padStart(2,'0')}` : '-'

  // Filter Data Hari Ini
  const checkinHariIni = checkinList.filter(c => c.tanggalKey === todayKey)
  const aktivitasHariIni = statistikList.filter(a => a.tanggal === hariIniIndo)

  const listBawaHariIni = aktivitasHariIni.filter(a => a.aksi === 'BawaCustomer')
  const listIbadahHariIni = aktivitasHariIni.filter(a => a.aksi === 'MulaiIbadah' || a.aksi === 'SelesaiIbadah')
  const listKeluarHariIni = aktivitasHariIni.filter(a => a.aksi === 'KeluarAntrian')

  // Rekap Performa Harian per Promotor (Deal, Lihat, No Sale)
  const rekapHarianPromotor = whitelistUsers.map(p => {
    const namaPromotor = p.nama
    const sudahCheckin = checkinHariIni.find(c => c.nama.toLowerCase() === namaPromotor.toLowerCase())
    
    const aktivitasPromotor = listBawaHariIni.filter(a => a.nama.toLowerCase() === namaPromotor.toLowerCase())
    const dealCount = aktivitasPromotor.filter(a => a.hasil === 'Deal').length
    const lihatCount = aktivitasPromotor.filter(a => a.hasil === 'Lihat').length
    
    // Aturan No Sale: Checkin hari ini, tapi total bawa customer 0
    const isNoSale = !!sudahCheckin && aktivitasPromotor.length === 0

    return {
      nama: namaPromotor,
      jamCheckin: sudahCheckin ? formatJam(sudahCheckin.waktu) : null,
      deal: dealCount,
      lihat: lihatCount,
      noSale: isNoSale,
      sudahCheckin: !!sudahCheckin
    }
  })

  // Total Bulanan Keseluruhan All Promotor
  const hitungTotalBulananAll = () => {
    const perBulan: any = {}
    statistikList.forEach(a => {
      if (a.aksi !== 'BawaCustomer' || !a.waktuSelesai || !a.tanggal) return
      const parts = String(a.tanggal).split('-')
      if (parts.length !== 3) return
      const bulanKey = `${parts[2]}-${parts[1]}` // YYYY-MM
      
      if (!perBulan[bulanKey]) perBulan[bulanKey] = { deal: 0, lihat: 0 }
      if (a.hasil === 'Deal') perBulan[bulanKey].deal++
      else if (a.hasil === 'Lihat') perBulan[bulanKey].lihat++
    })

    return Object.keys(perBulan).sort().reverse().map(bulanKey => {
      const p = perBulan[bulanKey]
      const [tahun, bulanIdx] = bulanKey.split('-')
      const namaBln = NAMA_BULAN[parseInt(bulanIdx) - 1]
      return { bulanKey, namaBln, tahun, ...p }
    })
  }

  const dataBulananAll = hitungTotalBulananAll()
  const totalDealAll = dataBulananAll.reduce((s, b) => s + b.deal, 0)
  const totalLihatAll = dataBulananAll.reduce((s, b) => s + b.lihat, 0)

  if (authLoading || loading || !mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 flex justify-center transition-colors duration-300">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl space-y-5">
        
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-white uppercase">Aktivitas & Rekap</h1>
            <p className="text-[11px] md:text-sm text-slate-500 dark:text-slate-400 uppercase">Monitoring operasional & kinerja</p>
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors shadow-sm">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* 1. JAM CHECK-IN ALL PROMOTOR HARI INI */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm">
          <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-white mb-3 uppercase flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Jam Check-in Hari Ini ({hariIniIndo})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {whitelistUsers.map((p, idx) => {
              const checkinData = checkinHariIni.find(c => c.nama.toLowerCase() === p.nama.toLowerCase())
              return (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate pr-1 text-[11px]">{p.nama}</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${checkinData ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                    {checkinData ? formatJam(checkinData.waktu) : 'Belum'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 2. REKAP HARIAN PROMOTOR (DEAL, LIHAT, NO SALE) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm">
          <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-white mb-3 uppercase flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-500" /> Rekap Performa Harian Promotor
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm min-w-[450px]">
              <thead className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-950/50">
                <tr>
                  <th className="px-3 py-2.5 rounded-l-lg">Nama Promotor</th>
                  <th className="px-3 py-2.5 text-center">Check-in</th>
                  <th className="px-3 py-2.5 text-center">Deal</th>
                  <th className="px-3 py-2.5 text-center">Lihat</th>
                  <th className="px-3 py-2.5 text-center rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rekapHarianPromotor.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-white uppercase text-[11px] md:text-xs">{r.nama}</td>
                    <td className="px-3 py-2.5 text-center font-medium text-slate-600 dark:text-slate-300 text-[11px]">{r.jamCheckin || '-'}</td>
                    <td className="px-3 py-2.5 text-center font-black text-emerald-500 text-[11px]">{r.deal}</td>
                    <td className="px-3 py-2.5 text-center font-black text-amber-500 text-[11px]">{r.lihat}</td>
                    <td className="px-3 py-2.5 text-center">
                      {r.noSale ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">No Sale</span>
                      ) : r.sudahCheckin ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500">Aktif</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Belum Masuk</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. AKTIVITAS SEMUA PROMOTOR HARI INI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Bawa Customer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2.5 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-sky-500" /> Bawa Customer ({listBawaHariIni.length})</h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {listBawaHariIni.length === 0 ? <p className="text-[11px] text-slate-400 italic">Belum ada aktivitas</p> : listBawaHariIni.map((a, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-white uppercase truncate pr-1">{a.nama}</span>
                  <span className={`font-black uppercase px-1.5 py-0.5 rounded text-[9px] shrink-0 ${a.hasil === 'Deal' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{a.hasil || 'Proses'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ibadah */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2.5 flex items-center gap-1.5"><Coffee className="w-3.5 h-3.5 text-amber-500" /> Ibadah ({listIbadahHariIni.length})</h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {listIbadahHariIni.length === 0 ? <p className="text-[11px] text-slate-400 italic">Belum ada aktivitas</p> : listIbadahHariIni.map((a, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-white uppercase truncate pr-1">{a.nama}</span>
                  <span className="text-slate-400 text-[10px] shrink-0">{formatJam(a.waktu)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Keluar Antrian */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
            <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2.5 flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5 text-rose-500" /> Keluar Antrian ({listKeluarHariIni.length})</h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {listKeluarHariIni.length === 0 ? <p className="text-[11px] text-slate-400 italic">Belum ada aktivitas</p> : listKeluarHariIni.map((a, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-white uppercase truncate pr-1">{a.nama}</span>
                  <span className="text-slate-400 text-[10px] shrink-0">{formatJam(a.waktu)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* 4. TOTAL BULANAN KESELURUHAN ALL PROMOTOR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-white uppercase">Total Bulanan Keseluruhan</h3>
              <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 uppercase">Akumulasi performa toko</p>
            </div>
            <div className="flex gap-2.5">
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Deal All</p>
                <p className="text-base md:text-xl font-black text-emerald-500">{totalDealAll}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Lihat All</p>
                <p className="text-base md:text-xl font-black text-amber-500">{totalLihatAll}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm min-w-[350px]">
              <thead className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-950/50">
                <tr>
                  <th className="px-3 py-2.5 rounded-l-lg">Bulan</th>
                  <th className="px-3 py-2.5 text-center">Deal All</th>
                  <th className="px-3 py-2.5 text-center rounded-r-lg">Lihat All</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dataBulananAll.length === 0 ? (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-400 text-xs">Belum ada data rekap bulanan</td></tr>
                ) : dataBulananAll.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-white uppercase text-[11px] md:text-xs">{b.namaBln} {b.tahun}</td>
                    <td className="px-3 py-2.5 text-center font-black text-emerald-500 text-[11px]">{b.deal}</td>
                    <td className="px-3 py-2.5 text-center font-black text-amber-500 text-[11px]">{b.lihat}</td>
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