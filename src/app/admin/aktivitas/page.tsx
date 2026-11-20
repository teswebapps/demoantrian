'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Users, LogOut, ShieldAlert, Award, Calendar, X, ShieldCheck, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'
import { useAutoReset } from '@/hooks/useAutoReset'
import { AdminShell } from '@/components/admin/admin-shell'
import { SectionCard, StatTile } from '@/components/admin/admin-ui'

const MosqueIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2.5v2" />
    <path d="M12 4.5c-3.6 2-5.5 4.2-5.5 6.5h11c0-2.3-1.9-4.5-5.5-6.5Z" />
    <path d="M4.5 11h15" />
    <path d="M5.5 11v10h13V11" />
    <path d="M19.5 8.5v12.5" />
    <path d="M19.5 6.5a1.5 1.5 0 0 1 0 3" />
    <path d="M10 21v-4.5a2 2 0 0 1 4 0V21" />
    <path d="M2.5 21h19" />
  </svg>
)

const NAMA_BULAN = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
]

const pad2 = (n: number) => String(n).padStart(2, '0')
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const toIndoDate = (d: Date) => `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`

/* Baris menu bergaya sama dengan baris "Aktivitas & Rekap" di halaman promotor */
function MenuRow({
  icon, tone, title, desc, count, countCls, onClick, href,
}: {
  icon: React.ReactNode
  tone: string
  title: string
  desc: string
  count?: number
  countCls?: string
  onClick?: () => void
  href?: string
}) {
  const inner = (
    <>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>{icon}</div>
        <div className="text-left">
          <h4 className="text-xs font-black uppercase tracking-wide text-foreground">{title}</h4>
          <p className="text-[11px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {count !== undefined && <span className={`text-xs font-black px-3 py-1 rounded-xl ${countCls}`}>{count}</span>}
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </>
  )
  const cls = 'w-full bg-secondary/50 border border-border/60 rounded-2xl p-4 flex items-center justify-between transition hover:bg-secondary'
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

export default function AktivitasAdminPage() {
  const { user, loading: authLoading, logout } = useAuth('ADMIN')
  const { isDark, toggleTheme, mounted } = useTheme()
  const [loading, setLoading] = useState(true)

  const [popupType, setPopupType] = useState<string | null>(null)
  const [statistikList, setStatistikList] = useState<any[]>([])
  const [checkinList, setCheckinList] = useState<any[]>([])
  const [whitelistUsers, setWhitelistUsers] = useState<any[]>([])
  const [lastResetTimestamp, setLastResetTimestamp] = useState<number>(0)

  const [hariIniIndo, setHariIniIndo] = useState('')
  const [todayKey, setTodayKey] = useState('')
  const [periodeBulanIni, setPeriodeBulanIni] = useState('')
  const [targetBulanIdx, setTargetBulanIdx] = useState(0)
  const [targetTahun, setTargetTahun] = useState(2026)

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'
  useAutoReset(user ? TOKO_ID : undefined)

  // Tanggal diperbarui tiap menit supaya ikut ganti hari/bulan/tahun
  useEffect(() => {
    const updateTanggal = () => {
      const d = new Date()
      setHariIniIndo(toIndoDate(d))
      setTodayKey(toDateKey(d))
      setPeriodeBulanIni(`${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`)
      setTargetBulanIdx(d.getMonth())
      setTargetTahun(d.getFullYear())
    }
    updateTanggal()
    const t = setInterval(updateTanggal, 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!TOKO_ID) return

    const unsubStat = onValue(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setStatistikList(list)
    })

    const unsubReset = onValue(ref(db, `toko/${TOKO_ID}/lastResetTimestamp`), (snap) => {
      if (snap.exists()) setLastResetTimestamp(snap.val())
      else setLastResetTimestamp(0)
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

    return () => { unsubStat(); unsubReset(); unsubCheckin(); unsubUser() }
  }, [TOKO_ID])

  const formatJam = (ts: number) => ts ? `${pad2(new Date(ts).getHours())}.${pad2(new Date(ts).getMinutes())}` : '-'

  // Samakan teks reset persis dengan yang muncul di halaman promotor
  const getKeteranganKeluar = (item: any) => {
    const kandidatKeys = ['keterangan', 'alasan', 'catatan', 'hasil', 'status', 'sumber', 'kategori', 'pesan', 'detail', 'label']
    for (const k of kandidatKeys) {
      const val = item?.[k]
      if (typeof val === 'string' && val.trim() && val.trim().toLowerCase() !== 'keluarantrian') {
        return val.trim()
      }
    }

    // Cari di semua nilai string pada objek log jika nama field-nya berbeda
    for (const [k, val] of Object.entries(item || {})) {
      if (['_key', 'nama', 'aksi', 'tanggal', 'tanggalKey', 'tokoId'].includes(k)) continue
      if (typeof val === 'string') {
        const clean = val.trim()
        if (/reset|istirahat/i.test(clean)) return clean
      }
    }

    const ts = Number(item?.waktu || item?.waktuMulai || 0)
    if (ts) {
      const jam = new Date(ts).getHours()
      if (jam >= 13 && jam < 16) return 'Reset Istirahat 13.00'
      if (jam >= 16) return 'Reset Istirahat 16.00'
    }
    return 'Keluar Antrian'
  }

  // Aktivitas hari ini: log KeluarAntrian hari ini tetap tampil meskipun lastResetTimestamp berdekatan saat tes
  const aktivitasHariIni = statistikList.filter(a => {
    const isHariIni = a.tanggal === hariIniIndo
    if (!isHariIni) return false
    if (a.aksi === 'KeluarAntrian') return true
    const waktuAktivitas = Number(a.waktu || a.waktuMulai || 0)
    return waktuAktivitas >= lastResetTimestamp
  })

  // Bawa Customer: waktu terbaru di paling atas
  const listBawa = aktivitasHariIni
    .filter(a => a.aksi === 'BawaCustomer')
    .sort((a, b) => Number(b.waktuMulai || b.waktu || 0) - Number(a.waktuMulai || a.waktu || 0))

  // Gabungkan sesi Ibadah lalu urutkan agar waktu terbaru berada di paling atas
  const sesiIbadahHariIni = (() => {
    const raw = aktivitasHariIni
      .filter(a => a.aksi === 'MulaiIbadah' || a.aksi === 'SelesaiIbadah' || a.aksi === 'Ibadah')
      .sort((a, b) => Number(a.waktuMulai || a.waktu || 0) - Number(b.waktuMulai || b.waktu || 0))

    const hasil: { nama: string; waktuMulai: number; waktuSelesai?: number }[] = []
    for (const item of raw) {
      const nama = String(item.nama || '').trim()
      const namaKey = nama.toLowerCase()
      const t = Number(item.waktuMulai || item.waktu || 0)

      if (item.waktuSelesai) {
        hasil.push({ nama, waktuMulai: t, waktuSelesai: Number(item.waktuSelesai) })
      } else if (item.aksi === 'MulaiIbadah' || item.aksi === 'Ibadah') {
        hasil.push({ nama, waktuMulai: t })
      } else if (item.aksi === 'SelesaiIbadah') {
        const openIdx = hasil.findIndex(s => s.nama.toLowerCase() === namaKey && !s.waktuSelesai)
        if (openIdx !== -1) hasil[openIdx].waktuSelesai = t
        else hasil.push({ nama, waktuMulai: t, waktuSelesai: t })
      }
    }
    return hasil.sort((a, b) => Number(b.waktuMulai || 0) - Number(a.waktuMulai || 0))
  })()

  // Keluar Antrian & Autokick: waktu terbaru di paling atas
  const listKeluar = aktivitasHariIni
    .filter(a => a.aksi === 'KeluarAntrian')
    .sort((a, b) => Number(b.waktu || b.waktuMulai || 0) - Number(a.waktu || a.waktuMulai || 0))

  const listAutokick = aktivitasHariIni
    .filter(a => a.aksi === 'Autokick' || a.aksi === 'AutoKick')
    .sort((a, b) => Number(b.waktu || b.waktuMulai || 0) - Number(a.waktu || a.waktuMulai || 0))

  const checkinHariIni = checkinList
    .filter(c => (c.dateKey || c.tanggalKey) === todayKey)
    .sort((a, b) => Number(b.waktu || 0) - Number(a.waktu || 0))

  // Check-in promotor: yang sudah check-in diurutkan dari jam terbaru di atas
  const whitelistCheckinTerurut = [...whitelistUsers].sort((a, b) => {
    const ca = checkinHariIni.find(c => String(c.nama || '').toLowerCase() === String(a.nama || '').toLowerCase())
    const cb = checkinHariIni.find(c => String(c.nama || '').toLowerCase() === String(b.nama || '').toLowerCase())
    const tsA = Number(ca?.waktu || 0)
    const tsB = Number(cb?.waktu || 0)
    if (tsA > 0 && tsB > 0) return tsB - tsA
    if (tsB > 0) return 1
    if (tsA > 0) return -1
    return String(a.nama || '').localeCompare(String(b.nama || ''))
  })

  const rekapPromotorMap = (() => {
    const acc: Record<string, { namaPromotor: string; deal: number; lihat: number; noSale: number; hariSet: Set<string> }> = {}

    const ensurePromotor = (namaRaw: string) => {
      const nama = String(namaRaw || '').replace(/_/g, ' ').trim().toUpperCase()
      if (!nama) return null
      if (!acc[nama]) {
        acc[nama] = { namaPromotor: nama, deal: 0, lihat: 0, noSale: 0, hariSet: new Set<string>() }
      }
      return acc[nama]
    }

    // No Sale berlaku hanya pada bulan terpilih (tidak masuk tahunan):
    // setiap hari promotor sudah masuk antrian tetapi 0 bawa customer = +1 hari tersebut
    const masukAntrianHari = new Set<string>()
    const bawaPerPromotorHari = new Map<string, number>()

    checkinList.forEach((c) => {
      const tglKey = String(c.dateKey || c.tanggalKey || '')
      if (!tglKey) return
      const parts = tglKey.split('-')
      if (parts.length !== 3) return
      const tahun = Number(parts[0])
      const bulanIdx = Number(parts[1]) - 1
      if (tahun !== targetTahun || bulanIdx !== targetBulanIdx) return

      const entry = ensurePromotor(c.nama || c.promotorKey)
      if (!entry) return
      masukAntrianHari.add(`${entry.namaPromotor}__${tglKey}`)
    })

    statistikList.forEach((a) => {
      if (!a?.nama) return
      const ts = Number(a.waktuSelesai || a.waktu || a.waktuMulai || 0)
      if (!ts) return
      const d = new Date(ts)
      if (d.getMonth() !== targetBulanIdx || d.getFullYear() !== targetTahun) return

      const entry = ensurePromotor(a.nama)
      if (!entry) return

      const tglKey = String(a.tanggalKey || toDateKey(d))
      const tglLabel = String(a.tanggal || toIndoDate(d))

      masukAntrianHari.add(`${entry.namaPromotor}__${tglKey}`)

      if (a.aksi === 'BawaCustomer') {
        entry.hariSet.add(tglLabel)
        const keyHari = `${entry.namaPromotor}__${tglKey}`
        bawaPerPromotorHari.set(keyHari, (bawaPerPromotorHari.get(keyHari) || 0) + 1)

        if (a.hasil === 'Deal') entry.deal += 1
        else if (a.hasil === 'Lihat') entry.lihat += 1
      }
    })

    masukAntrianHari.forEach((keyHari) => {
      const [namaPromotor] = keyHari.split('__')
      const entry = ensurePromotor(namaPromotor)
      if (!entry) return
      const jumlahBawa = bawaPerPromotorHari.get(keyHari) || 0
      if (jumlahBawa === 0) {
        entry.noSale += 1
      }
    })

    return acc
  })()

  const listRekapPromotor = Object.values(rekapPromotorMap)
    .map((item) => ({ ...item, hari: item.hariSet.size }))
    .sort((a, b) => b.deal - a.deal || b.lihat - a.lihat || a.noSale - a.noSale)

  if (authLoading || loading || !mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  }

  const rowCls = 'flex justify-between items-center p-3 bg-secondary/50 rounded-2xl text-xs border border-border/60 shadow-sm'
  const emptyCls = 'text-xs text-muted-foreground italic text-center py-4'

  return (
    <AdminShell isDark={isDark} onToggleTheme={toggleTheme} onLogout={logout} tokoId={TOKO_ID}>
      {/* RINGKASAN HARI INI */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Ringkasan hari ini · {hariIniIndo}</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Check-in" value={checkinHariIni.length} tone="cyan" />
          <StatTile label="Bawa Customer" value={listBawa.length} tone="blue" />
          <StatTile label="Ibadah" value={sesiIbadahHariIni.length} tone="amber" />
          <StatTile label="Keluar Antrian" value={listKeluar.length} tone="purple" />
        </div>
      </section>

      {/* MENU DETAIL */}
      <SectionCard icon={<ShieldCheck className="w-5 h-5" />} tone="emerald" title="Aktivitas & Rekap" subtitle="Ketuk untuk melihat rincian">
        <div className="space-y-3">
          <MenuRow icon={<ShieldCheck className="w-5 h-5" />} tone="bg-emerald-500/10 text-emerald-500" title="Check-in Promotor" desc="Kehadiran hari ini" count={checkinHariIni.length} countCls="bg-emerald-500 text-white" onClick={() => setPopupType('checkin')} />
          <MenuRow icon={<Users className="w-5 h-5" />} tone="bg-cyan-500/10 text-cyan-500" title="Bawa Customer" desc="Semua promotor hari ini" count={listBawa.length} countCls="bg-cyan-500 text-slate-950" onClick={() => setPopupType('bawa')} />
          <MenuRow icon={<MosqueIcon className="w-5 h-5" />} tone="bg-amber-500/10 text-amber-500" title="Ibadah" desc="Catatan ibadah" count={sesiIbadahHariIni.length} countCls="bg-amber-500 text-white" onClick={() => setPopupType('ibadah')} />
          <MenuRow icon={<LogOut className="w-5 h-5" />} tone="bg-rose-500/10 text-rose-500" title="Keluar Antrian" desc="Manual dan reset istirahat" count={listKeluar.length} countCls="bg-rose-500 text-white" onClick={() => setPopupType('keluar')} />
          <MenuRow icon={<ShieldAlert className="w-5 h-5" />} tone="bg-red-500/10 text-red-500" title="Autokick" desc="Pelanggaran sistem" count={listAutokick.length} countCls="bg-red-500 text-white" onClick={() => setPopupType('autokick')} />
        </div>
      </SectionCard>

      <SectionCard icon={<Award className="w-5 h-5" />} tone="purple" title="Rekap Kinerja" subtitle="Per bulan dan per tahun">
        <div className="space-y-3">
          <MenuRow icon={<Award className="w-5 h-5" />} tone="bg-purple-500/10 text-purple-500" title="Rekap Promotor" desc={`Deal & lihat ${periodeBulanIni}`} onClick={() => setPopupType('rekapPromotor')} />
          <MenuRow icon={<Calendar className="w-5 h-5" />} tone="bg-primary/10 text-primary" title="Total Bulanan" desc="Rekap tiap bulan tahun ini" href="/admin/total-bulanan" />
        </div>
      </SectionCard>

      {/* POPUP */}
      <AnimatePresence>
        {popupType && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPopupType(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="bg-card rounded-3xl w-full max-w-lg border border-border shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-border">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                  {popupType === 'checkin' && `Check-in Promotor (${hariIniIndo})`}
                  {popupType === 'bawa' && 'Bawa Customer Hari Ini'}
                  {popupType === 'ibadah' && 'Ibadah Hari Ini'}
                  {popupType === 'keluar' && 'Keluar Antrian Hari Ini'}
                  {popupType === 'autokick' && 'Autokick (Pelanggaran)'}
                  {popupType === 'rekapPromotor' && `Rekap Bawa Customer (${periodeBulanIni})`}
                </h3>
                <button onClick={() => setPopupType(null)} className="p-1.5 text-muted-foreground hover:text-destructive bg-secondary rounded-full transition"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 max-h-[65vh] overflow-y-auto space-y-2.5">

                {popupType === 'checkin' && (
                  <div className="space-y-2">
                    {whitelistCheckinTerurut.length === 0 ? <p className={emptyCls}>Belum ada promotor terdaftar</p> : whitelistCheckinTerurut.map((p, idx) => {
                      const checkinData = checkinHariIni.find(c => String(c.nama || '').toLowerCase() === String(p.nama || '').toLowerCase())
                      return (
                        <div key={idx} className={rowCls}>
                          <span className="text-xs sm:text-sm font-black text-foreground uppercase">{p.nama}</span>
                          <span className={`text-sm sm:text-base font-black px-3.5 py-1.5 rounded-xl ${checkinData ? 'bg-emerald-500/15 text-emerald-500' : 'bg-secondary text-muted-foreground'}`}>
                            {checkinData ? formatJam(checkinData.waktu) : 'Belum Check-in'}
                          </span>
                        </div>
                      )
                    })}
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
                    {listRekapPromotor.length === 0 ? <p className={emptyCls}>Belum ada data rekap bulan ini</p> : listRekapPromotor.map((row: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-12 gap-1 px-3 py-2.5 bg-secondary/50 rounded-2xl text-xs items-center border border-border/60 shadow-sm">
                        <div className="col-span-5 font-bold text-foreground uppercase truncate">{row.namaPromotor}</div>
                        <div className="col-span-2 text-center font-bold text-emerald-500">{row.deal}</div>
                        <div className="col-span-2 text-center font-bold text-amber-500">{row.lihat}</div>
                        <div className="col-span-1 text-center font-bold text-destructive">{row.noSale}</div>
                        <div className="col-span-2 text-center font-bold text-muted-foreground">{row.hari}</div>
                      </div>
                    ))}
                  </div>
                )}

                {popupType === 'bawa' && (
                  <div className="space-y-2.5">
                    {(() => {
                      const totalDealHariIni = listBawa.filter(a => a.hasil === 'Deal').length
                      const totalLihatHariIni = listBawa.filter(a => a.hasil === 'Lihat').length
                      return (
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Deal</p>
                            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{totalDealHariIni}</p>
                          </div>
                          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Total Lihat</p>
                            <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">{totalLihatHariIni}</p>
                          </div>
                        </div>
                      )
                    })()}
                    {listBawa.length === 0 ? <p className={emptyCls}>Belum ada aktivitas</p> : listBawa.map((a, i) => (
                      <div key={i} className={rowCls}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground uppercase">{a.nama}</span>
                          {a.hasil === 'Deal' && <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded">DEAL</span>}
                          {a.hasil === 'Lihat' && <span className="text-[10px] font-black bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">LIHAT</span>}
                          {!a.waktuSelesai && <span className="text-[10px] font-black bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded animate-pulse">PROSES</span>}
                        </div>
                        <span className="text-xs sm:text-sm text-foreground font-bold">{formatJam(a.waktuMulai)} {a.waktuSelesai ? `- ${formatJam(a.waktuSelesai)}` : '...'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {popupType === 'ibadah' && (
                  <div className="space-y-2">
                    {sesiIbadahHariIni.length === 0 ? <p className={emptyCls}>Belum ada</p> : sesiIbadahHariIni.map((s, i) => (
                      <div key={i} className={rowCls}>
                        <span className="font-bold text-foreground uppercase">{s.nama}</span>
                        <span className="text-xs sm:text-sm text-foreground font-bold">
                          {formatJam(s.waktuMulai)} - {s.waktuSelesai ? formatJam(s.waktuSelesai) : 'Berlangsung'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {popupType === 'keluar' && (
                  <div className="space-y-2">
                    {listKeluar.length === 0 ? <p className={emptyCls}>Belum ada</p> : listKeluar.map((a, i) => {
                      const keterangan = getKeteranganKeluar(a)
                      const isResetIstirahat = /reset|istirahat/i.test(keterangan)
                      return (
                        <div key={i} className={rowCls}>
                          <div>
                            <span className="font-bold text-foreground uppercase block">{a.nama}</span>
                            <span className={`text-[10px] font-bold ${isResetIstirahat ? 'text-amber-500' : 'text-muted-foreground'}`}>
                              {keterangan}
                            </span>
                          </div>
                          <span className="text-xs sm:text-sm text-foreground font-bold">{formatJam(a.waktu || a.waktuMulai)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {popupType === 'autokick' && (
                  <div className="space-y-2">
                    {listAutokick.length === 0 ? <p className={emptyCls}>Tidak ada pelanggaran</p> : listAutokick.map((a, i) => (
                      <div key={i} className={rowCls}>
                        <div>
                          <span className="font-bold text-foreground uppercase block">{a.nama}</span>
                          <span className="text-[10px] text-destructive font-bold">{a.hasil || a.kategori}</span>
                        </div>
                        <span className="text-xs sm:text-sm text-foreground font-bold">{formatJam(a.waktu)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminShell>
  )
}