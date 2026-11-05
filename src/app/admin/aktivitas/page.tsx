'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Users, Coffee, LogOut, ShieldAlert, Award, Calendar, X, ShieldCheck, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'
import { useAutoReset } from '@/hooks/useAutoReset'
import { AdminShell } from '@/components/admin/admin-shell'
import { SectionCard, StatTile } from '@/components/admin/admin-ui'

const NAMA_BULAN = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
]

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
      const pad = (n: number) => String(n).padStart(2, '0')
      setHariIniIndo(`${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`)
      setTodayKey(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
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

  const formatJam = (ts: number) => ts ? `${String(new Date(ts).getHours()).padStart(2, '0')}.${String(new Date(ts).getMinutes()).padStart(2, '0')}` : '-'

  // Aktivitas hari ini: hanya yang dibuat SETELAH reset terakhir
  const aktivitasHariIni = statistikList.filter(a => {
    const isHariIni = a.tanggal === hariIniIndo
    const waktuAktivitas = Number(a.waktu || a.waktuMulai || 0)
    return isHariIni && waktuAktivitas > lastResetTimestamp
  })

  const listBawa = aktivitasHariIni.filter(a => a.aksi === 'BawaCustomer')
  const listIbadah = aktivitasHariIni.filter(a => a.aksi === 'MulaiIbadah' || a.aksi === 'SelesaiIbadah' || a.aksi === 'Ibadah')
  const listKeluar = aktivitasHariIni.filter(a => a.aksi === 'KeluarAntrian')
  const listAutokick = aktivitasHariIni.filter(a => a.aksi === 'Autokick' || a.aksi === 'AutoKick')
  const checkinHariIni = checkinList.filter(c => (c.dateKey || c.tanggalKey) === todayKey)

  const rekapPromotorMap = statistikList
    .filter(a => {
      if (a.aksi !== 'BawaCustomer' || !a.nama) return false
      const ts = Number(a.waktuSelesai || a.waktu || 0)
      if (!ts) return false
      const d = new Date(ts)
      return d.getMonth() === targetBulanIdx && d.getFullYear() === targetTahun
    })
    .reduce((acc: any, curr: any) => {
      const nama = curr.nama.toUpperCase()
      if (!acc[nama]) acc[nama] = { namaPromotor: nama, deal: 0, lihat: 0, noSale: 0, hariSet: new Set() }
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
          <StatTile label="Ibadah" value={listIbadah.length} tone="amber" />
          <StatTile label="Keluar Antrian" value={listKeluar.length} tone="purple" />
        </div>
      </section>

      {/* MENU DETAIL */}
      <SectionCard icon={<ShieldCheck className="w-5 h-5" />} tone="emerald" title="Aktivitas & Rekap" subtitle="Ketuk untuk melihat rincian">
        <div className="space-y-3">
          <MenuRow icon={<ShieldCheck className="w-5 h-5" />} tone="bg-emerald-500/10 text-emerald-500" title="Check-in Promotor" desc="Kehadiran hari ini" count={checkinHariIni.length} countCls="bg-emerald-500 text-white" onClick={() => setPopupType('checkin')} />
          <MenuRow icon={<Users className="w-5 h-5" />} tone="bg-cyan-500/10 text-cyan-500" title="Bawa Customer" desc="Semua promotor hari ini" count={listBawa.length} countCls="bg-cyan-500 text-slate-950" onClick={() => setPopupType('bawa')} />
          <MenuRow icon={<Coffee className="w-5 h-5" />} tone="bg-amber-500/10 text-amber-500" title="Ibadah" desc="Catatan istirahat / ibadah" count={listIbadah.length} countCls="bg-amber-500 text-white" onClick={() => setPopupType('ibadah')} />
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
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
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
                    {whitelistUsers.length === 0 ? <p className={emptyCls}>Belum ada promotor terdaftar</p> : whitelistUsers.map((p, idx) => {
                      const checkinData = checkinHariIni.find(c => String(c.nama || '').toLowerCase() === String(p.nama || '').toLowerCase())
                      return (
                        <div key={idx} className={rowCls}>
                          <span className="font-bold text-foreground uppercase">{p.nama}</span>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-md ${checkinData ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'}`}>
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
                  <div className="space-y-2">
                    {listBawa.length === 0 ? <p className={emptyCls}>Belum ada aktivitas</p> : listBawa.map((a, i) => (
                      <div key={i} className={rowCls}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground uppercase">{a.nama}</span>
                          {a.hasil === 'Deal' && <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded">DEAL</span>}
                          {a.hasil === 'Lihat' && <span className="text-[9px] font-black bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">LIHAT</span>}
                          {!a.waktuSelesai && <span className="text-[9px] font-black bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded animate-pulse">PROSES</span>}
                        </div>
                        <span className="text-muted-foreground font-medium">{formatJam(a.waktuMulai)} {a.waktuSelesai ? `- ${formatJam(a.waktuSelesai)}` : '...'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {popupType === 'ibadah' && (
                  <div className="space-y-2">
                    {listIbadah.length === 0 ? <p className={emptyCls}>Belum ada</p> : listIbadah.map((a, i) => (
                      <div key={i} className={rowCls}>
                        <span className="font-bold text-foreground uppercase">{a.nama}</span>
                        <span className="text-muted-foreground font-medium">{formatJam(a.waktuMulai || a.waktu)} {a.waktuSelesai ? `- ${formatJam(a.waktuSelesai)}` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}

                {popupType === 'keluar' && (
                  <div className="space-y-2">
                    {listKeluar.length === 0 ? <p className={emptyCls}>Belum ada</p> : listKeluar.map((a, i) => (
                      <div key={i} className={rowCls}>
                        <span className="font-bold text-foreground uppercase">{a.nama}</span>
                        <span className="text-muted-foreground font-medium">{formatJam(a.waktu)}</span>
                      </div>
                    ))}
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
                        <span className="text-muted-foreground font-medium">{formatJam(a.waktu)}</span>
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
