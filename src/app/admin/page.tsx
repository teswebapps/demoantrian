'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, update } from 'firebase/database'
import { useState, useEffect } from 'react'
import { Loader2, Unlock, Lock } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAntrian } from '@/hooks/useAntrian'
import { useAutoReset } from '@/hooks/useAutoReset'
import { toast } from 'sonner'
import { AdminShell } from '@/components/admin/admin-shell'
import { SectionCard, StatTile } from '@/components/admin/admin-ui'

const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

const formatTanggalPanjang = (d?: Date | number | string) => {
  const now = d ? new Date(d) : new Date()
  if (Number.isNaN(now.getTime())) return '-'
  return `${now.getDate()} ${NAMA_BULAN[now.getMonth()]} ${now.getFullYear()}`
}

const DEFAULT_TOKO_ID = process.env.NEXT_PUBLIC_TOKO_ID || 'default-toko'

export default function AdminPage() {
  const { user, loading: authLoading, error, logout } = useAuth('ADMIN')
  const { antrian, setting, loading: dataLoading } = useAntrian(user?.tokoId || DEFAULT_TOKO_ID)
  const { isDark, toggleTheme, mounted } = useTheme()

  const [isUpdating, setIsUpdating] = useState(false)
  const [tanggalPanjang, setTanggalPanjang] = useState('')

  const TOKO_ID = user?.tokoId || DEFAULT_TOKO_ID
  useAutoReset(user ? TOKO_ID : undefined)

  // Tanggal diperbarui tiap menit supaya ikut ganti hari
  useEffect(() => {
    const update = () => {
      setTanggalPanjang(formatTanggalPanjang(new Date()))
    }
    update()
    const t = setInterval(update, 60_000)
    return () => clearInterval(t)
  }, [])

  if (authLoading || !mounted) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center bg-background text-destructive">{error}</div>
  if (!user) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return null
  }

  const ubahStatusAntrian = async (statusBaru: 'BUKA' | 'TUTUP') => {
    if (!TOKO_ID || isUpdating || setting?.statusAntrian === statusBaru) return
    setIsUpdating(true)
    try {
      await update(ref(db, `toko/${TOKO_ID}/setting`), { statusAntrian: statusBaru })
      toast.success(`Antrian berhasil diubah menjadi ${statusBaru}`)
    } catch (err) {
      console.error(err)
      toast.error('Gagal mengubah status antrian')
    } finally {
      setIsUpdating(false)
    }
  }

  const antrianTerurut = [...antrian].sort((a, b) => (Number(a.waktuStandby) || 0) - (Number(b.waktuStandby) || 0))
  const totalStandby = antrianTerurut.filter(a => a.status === 'Standby').length
  const totalMelayani = antrianTerurut.filter(a => a.status === 'Melayani').length
  const listHA = antrianTerurut.filter(a => String(a.kategori).toUpperCase() === 'HA')
  const listAV = antrianTerurut.filter(a => String(a.kategori).toUpperCase() === 'AV')

  const isBuka = setting?.statusAntrian !== 'TUTUP'
  const statusLoading = !!dataLoading // jangan tampilkan Buka/Tutup sebelum data selesai dimuat

  const btnBase = 'flex-1 py-4 font-black rounded-xl transition-all flex justify-center items-center gap-2 text-sm'
  const btnBukaCls = `${btnBase} ${statusLoading ? 'bg-secondary text-muted-foreground cursor-default' : isBuka
    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 cursor-default'
    : 'bg-secondary text-muted-foreground hover:bg-emerald-500 hover:text-white active:scale-95'}`
  const btnTutupCls = `${btnBase} ${statusLoading ? 'bg-secondary text-muted-foreground cursor-default' : !isBuka
    ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30 cursor-default'
    : 'bg-secondary text-muted-foreground hover:bg-rose-600 hover:text-white active:scale-95'}`

  return (
    <AdminShell isDark={isDark} onToggleTheme={toggleTheme} onLogout={logout} tokoId={TOKO_ID}>
      <p className="px-1 text-xs text-muted-foreground">
        Halo, <span className="text-primary font-bold uppercase">{user?.nama}</span> • <span className="font-semibold text-foreground">{tanggalPanjang}</span>
      </p>

      {/* KONTROL BUKA / TUTUP */}
      <SectionCard
        icon={isBuka ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
        tone={statusLoading ? 'primary' : isBuka ? 'emerald' : 'rose'}
        title="Status Antrian"
        subtitle={statusLoading ? 'Memuat status...' : isBuka ? 'Antrian sedang dibuka' : 'Antrian sedang ditutup'}
      >
        <div className="flex gap-3">
          <button type="button" onClick={() => ubahStatusAntrian('BUKA')} disabled={isUpdating || statusLoading || isBuka} className={btnBukaCls}>
            {isUpdating && !isBuka ? <Loader2 className="w-5 h-5 animate-spin" /> : <Unlock className="w-5 h-5" />}
            BUKA
          </button>
          <button type="button" onClick={() => ubahStatusAntrian('TUTUP')} disabled={isUpdating || statusLoading || !isBuka} className={btnTutupCls}>
            {isUpdating && isBuka ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
            TUTUP
          </button>
        </div>
      </SectionCard>

      {/* STATISTIK */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Live antrian saat ini</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Total Antri" value={totalStandby} tone="cyan" />
          <StatTile label="Sedang Melayani" value={totalMelayani} tone="blue" />
          <StatTile label="Kategori HA" value={listHA.length} tone="amber" />
          <StatTile label="Kategori AV" value={listAV.length} tone="purple" />
        </div>
      </section>

      {/* LIVE URUTAN HA & AV */}
      <div className="space-y-4">
        {(['HA', 'AV'] as const).map((kat) => {
          const list = kat === 'HA' ? listHA : listAV
          const listStandby = list.filter(a => a.status === 'Standby')
          const listAktifNomor = list.filter(a => a.status !== 'Melayani')

          return (
            <div key={kat} className="bg-card border border-border p-5 rounded-3xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase">
                  <span className={`w-2 h-2 rounded-full ${kat === 'HA' ? 'bg-cyan-500' : 'bg-purple-500'}`}></span>
                  Live Urutan {kat}
                </h3>
                <span className="text-[10px] font-bold bg-secondary text-muted-foreground px-2.5 py-1 rounded-md">{listStandby.length} Antri</span>
              </div>

              <div className="space-y-2">
                {list.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-2">Belum ada antrian</p>
                ) : (
                  list.map((item, idx) => {
                    const isGiliranUtama = item.status === 'Standby' && listStandby.findIndex(a => a.nama === item.nama) === 0
                    const nomorAktif = listAktifNomor.findIndex(a => a.nama === item.nama) + 1
                    return (
                      <div key={item._key || idx} className="flex justify-between items-center p-3 rounded-xl bg-secondary/50 border border-border/60 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black ${isGiliranUtama ? 'bg-rose-500 text-white' : 'bg-white text-slate-900 border border-slate-200'}`}>
                            {item.status === 'Melayani' ? '-' : (nomorAktif > 0 ? nomorAktif : (idx + 1))}
                          </span>
                          <span className="text-xs font-bold uppercase text-foreground">{item.nama}</span>
                        </div>

                        {item.status === 'Melayani' ? (
                          <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-emerald-500 text-white">Melayani</span>
                        ) : item.status === 'Dipanggil CS' ? (
                          <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-blue-600 text-white">CS / Gudang</span>
                        ) : item.status === 'Ibadah' ? (
                          <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-purple-600 text-white">Ibadah</span>
                        ) : isGiliranUtama ? (
                          <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-rose-500 text-white animate-pulse">Giliran Utama</span>
                        ) : (
                          <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-amber-400 text-slate-950">Standby</span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </AdminShell>
  )
}