'use client'

import { useState, useEffect, useRef } from 'react'
import { ref, get, set, remove, update, push, onValue } from 'firebase/database'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { toast } from 'sonner'
import { AdminShell } from '@/components/admin/admin-shell'
import { SectionCard } from '@/components/admin/admin-ui'
import { Loader2, Smartphone, ShieldCheck, Play, Package, ArrowRight, LogOut, UserCheck, Lock, Search } from 'lucide-react'

const MosqueIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2c-1.5 2-4 3-4 6 0 1.5.5 2.5 1 3H5v10h14V11h-4c.5-.5 1-1.5 1-3 0-3-2.5-4-4-6z" />
    <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
    <path d="M3 21h18" />
  </svg>
)

const pad = (n: number) => String(n).padStart(2, '0')
const getTanggalIndo = (d?: Date) => {
  const now = d ? new Date(d) : new Date()
  return `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`
}
const getTanggalKey = (d?: Date) => {
  const now = d ? new Date(d) : new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
const cleanNama = (nama: string) => nama.trim().toLowerCase().replace(/\s+/g, '_')
const normKategori = (kat: any): 'HA' | 'AV' =>
  String(kat || '').trim().toUpperCase() === 'AV' ? 'AV' : 'HA'

export default function BantuPromotorPage() {
  const { user, loading: authLoading, logout } = useAuth('ADMIN')
  const { isDark, toggleTheme, mounted } = useTheme()

  const [whitelistUsers, setWhitelistUsers] = useState<any[]>([])
  const [selectedNama, setSelectedNama] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)
  const pickerRef = useRef<HTMLDivElement | null>(null)

  const [antrian, setAntrian] = useState<any[]>([])
  const [setting, setSetting] = useState<any>(null)
  const [lockAll, setLockAll] = useState<any>({})
  const [checkinHarianAll, setCheckinHarianAll] = useState<any>({})
  const [statistikList, setStatistikList] = useState<any[]>([])
  const [lastResetTimestamp, setLastResetTimestamp] = useState<number>(0)

  const [kategoriPilih, setKategoriPilih] = useState<'HA' | 'AV'>('HA')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showClosing, setShowClosing] = useState(false)
  const [todayKey, setTodayKey] = useState('')
  const [hariIniIndo, setHariIniIndo] = useState('')

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    const updateTgl = () => {
      const now = new Date()
      setTodayKey(getTanggalKey(now))
      setHariIniIndo(getTanggalIndo(now))
    }
    updateTgl()
    const t = setInterval(updateTgl, 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!TOKO_ID) return

    const unsubUsers = onValue(ref(db, 'users/whitelist'), (snap) => {
      const data = snap.val() || {}
      const list = Object.keys(data)
        .map((k) => ({ ...data[k], _key: k }))
        .filter((u) => u.role !== 'ADMIN' && u.nama && (!u.tokoId || u.tokoId === TOKO_ID))
        .sort((a, b) => String(a.nama).localeCompare(String(b.nama)))
      setWhitelistUsers(list)
    })

    const unsubAntrian = onValue(ref(db, `toko/${TOKO_ID}/antrian`), (snap) => {
      const data = snap.val() || {}
      const list = Object.keys(data)
        .filter((k) => data[k]?.nama)
        .map((k) => ({ ...data[k], _key: k }))
        .sort((a, b) => (a.waktuStandby || 0) - (b.waktuStandby || 0))
      setAntrian(list)
    })

    const unsubSetting = onValue(ref(db, `toko/${TOKO_ID}/setting`), (snap) => {
      if (snap.exists()) setSetting(snap.val())
    })

    const unsubLock = onValue(ref(db, `toko/${TOKO_ID}/lockPromotor`), (snap) => {
      setLockAll(snap.exists() ? snap.val() : {})
    })

    const unsubCheckin = onValue(ref(db, `toko/${TOKO_ID}/checkinHarian`), (snap) => {
      setCheckinHarianAll(snap.exists() ? snap.val() : {})
    })

    const unsubStat = onValue(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), (snap) => {
      const data = snap.val() || {}
      const list = Object.keys(data)
        .filter((k) => data[k]?.nama)
        .map((k) => ({ ...data[k], _key: k }))
      setStatistikList(list)
    })

    const unsubReset = onValue(ref(db, `toko/${TOKO_ID}/lastResetTimestamp`), (snap) => {
      setLastResetTimestamp(snap.exists() ? Number(snap.val() || 0) : 0)
    })

    return () => {
      unsubUsers()
      unsubAntrian()
      unsubSetting()
      unsubLock()
      unsubCheckin()
      unsubStat()
      unsubReset()
    }
  }, [TOKO_ID])

  const filteredPromotors = whitelistUsers.filter((u) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    const statusLabel = (antrian.find((a) => a.nama.toLowerCase() === u.nama.toLowerCase())?.status || 'Offline').toLowerCase()
    return String(u.nama).toLowerCase().includes(q) || statusLabel.includes(q)
  })

  const promotorAktif = whitelistUsers.find((u) => u.nama === selectedNama) || null
  const cleanSelected = promotorAktif ? cleanNama(promotorAktif.nama) : ''

  const dataSaya = promotorAktif
    ? antrian.find((a) => a.nama.toLowerCase() === promotorAktif.nama.toLowerCase())
    : null
  const statusSaya = dataSaya ? dataSaya.status : 'Offline'

  const listHA = antrian.filter((a) => normKategori(a.kategori ?? a.subkategori) === 'HA')
  const listAV = antrian.filter((a) => normKategori(a.kategori ?? a.subkategori) === 'AV')

  const checkinRecord = cleanSelected && todayKey ? checkinHarianAll?.[cleanSelected]?.[todayKey] : null
  const sudahCheckinHariIni = Boolean(
    checkinRecord && (!lastResetTimestamp || Number(checkinRecord.waktu || 0) >= lastResetTimestamp)
  )

  const lockSaya = cleanSelected ? lockAll?.[cleanSelected] : null
  const sedangDikunci = Boolean(
    lockSaya?.locked &&
      (!lockSaya.lockStarted ||
        Number(lockSaya.waktuSelesaiLock || 0) === 0 ||
        Date.now() < Number(lockSaya.waktuSelesaiLock))
  )

  const posisiStandby = () => {
    if (!promotorAktif) return 0
    const kat = normKategori(dataSaya?.kategori ?? dataSaya?.subkategori)
    const listStandby = antrian
      .filter((i) => i.status === 'Standby' && normKategori(i.kategori ?? i.subkategori) === kat)
      .sort((a, b) => (a.waktuStandby || 0) - (b.waktuStandby || 0))
    return listStandby.findIndex((i) => i.nama.toLowerCase() === promotorAktif.nama.toLowerCase()) + 1
  }

  const handleAksi = async (aksi: string, hasil: string = '') => {
    if (!promotorAktif) return
    setIsProcessing(true)
    const namaPromotor = promotorAktif.nama
    const clean = cleanNama(namaPromotor)
    const tglIndo = getTanggalIndo()
    const tKeyAktif = todayKey || getTanggalKey()
    const pathAntrian = `toko/${TOKO_ID}/antrian/${clean}`
    const pathStatistik = `toko/${TOKO_ID}/statistikAktivitas`

    try {
      if (aksi === 'CheckIn') {
        if (setting?.statusAntrian === 'TUTUP') {
          toast.error('Antrian saat ini sedang DITUTUP.')
          return
        }
        if (sedangDikunci) {
          toast.error(`Akun ${namaPromotor} sedang dikunci (${lockSaya?.alasan || 'Sanksi'}).`)
          return
        }

        const checkinRef = ref(db, `toko/${TOKO_ID}/checkinHarian/${clean}/${tKeyAktif}`)
        const checkinSnap = await get(checkinRef)
        const nowTs = Date.now()
        const katDipilih = normKategori(kategoriPilih)

        const antrianSnap = await get(ref(db, `toko/${TOKO_ID}/antrian`))
        const antrianVal = antrianSnap.val() || {}
        const maxWaktuStandbyKategori = Object.keys(antrianVal)
          .filter((k) => {
            const item = antrianVal[k]
            return (
              item &&
              item.nama &&
              normKategori(item.kategori ?? item.subkategori) === katDipilih &&
              String(item.nama).trim().toLowerCase() !== String(namaPromotor).trim().toLowerCase()
            )
          })
          .reduce((max, k) => Math.max(max, Number(antrianVal[k].waktuStandby) || 0), 0)

        const waktuStandbyFinal = Math.max(nowTs, maxWaktuStandbyKategori + 1)

        if (!checkinSnap.exists()) {
          await set(checkinRef, {
            nama: namaPromotor,
            tanggal: tglIndo,
            tanggalKey: tKeyAktif,
            waktu: nowTs,
            inputOlehAdmin: true,
          })
        }

        await set(ref(db, pathAntrian), {
          nama: namaPromotor,
          status: 'Standby',
          waktuStandby: waktuStandbyFinal,
          waktuMasukAntrian: nowTs,
          kategori: katDipilih,
          subkategori: katDipilih,
          posisiTerkunci: 0,
        })
        toast.success(`${namaPromotor} berhasil masuk antrian (${katDipilih}).`)
      } else if (aksi === 'BawaCustomer') {
        const now = Date.now()
        await update(ref(db, pathAntrian), { status: 'Melayani', posisiTerkunci: 0, waktuMulaiMelayani: now })
        await push(ref(db, pathStatistik), {
          nama: namaPromotor,
          aksi: 'BawaCustomer',
          waktu: now,
          tanggal: tglIndo,
          tanggalKey: tKeyAktif,
          waktuMulai: now,
        })
        toast.success(`${namaPromotor}: Melayani Customer`)
      } else if (aksi === 'Selesai') {
        setShowClosing(true)
        return
      } else if (aksi === 'SimpanClosing') {
        const waktuMulai = dataSaya?.waktuMulaiMelayani || Date.now()
        const now = Date.now()
        const snapAkt = await get(ref(db, pathStatistik))
        const dataAkt = snapAkt.val() || {}
        const belumSelesai = Object.keys(dataAkt)
          .filter(
            (key) =>
              String(dataAkt[key].nama || '').trim().toLowerCase() === namaPromotor.trim().toLowerCase() &&
              dataAkt[key].aksi === 'BawaCustomer' &&
              !dataAkt[key].waktuSelesai
          )
          .map((key) => ({ _key: key, ...dataAkt[key] }))
          .sort((a: any, b: any) => (b.waktu || 0) - (a.waktu || 0))
        const target = belumSelesai[0]

        await remove(ref(db, pathAntrian))
        if (target && target._key) {
          await update(ref(db, `${pathStatistik}/${target._key}`), {
            waktuSelesai: now,
            hasil,
            durasiDetik: Math.max(0, Math.floor((now - waktuMulai) / 1000)),
          })
        } else {
          await push(ref(db, pathStatistik), {
            nama: namaPromotor,
            aksi: 'BawaCustomer',
            waktu: waktuMulai,
            tanggal: tglIndo,
            tanggalKey: tKeyAktif,
            waktuMulai,
            waktuSelesai: now,
            hasil,
            durasiDetik: Math.max(0, Math.floor((now - waktuMulai) / 1000)),
          })
        }
        toast.success(`${namaPromotor}: Selesai (${hasil})`)
        setShowClosing(false)
      } else if (aksi === 'Ibadah') {
        const posisi = posisiStandby()
        const now = Date.now()
        await update(ref(db, pathAntrian), {
          status: 'Ibadah',
          posisiTerkunci: posisi,
          waktuStandbySebelumIbadah: dataSaya?.waktuStandby || now,
          waktuMulaiIbadah: now,
        })
        await push(ref(db, pathStatistik), {
          nama: namaPromotor,
          aksi: 'MulaiIbadah',
          waktu: now,
          waktuMulai: now,
          tanggal: tglIndo,
          tanggalKey: tKeyAktif,
          kategori: 'Ibadah',
          posisi,
        })
        toast.info(`${namaPromotor}: Sedang Ibadah`)
      } else if (aksi === 'KembaliIbadah') {
        const posisiLama = dataSaya?.posisiTerkunci || 0
        const waktuStandbyKembali = dataSaya?.waktuStandbySebelumIbadah || dataSaya?.waktuStandby || Date.now()
        const now = Date.now()
        const snapAkt = await get(ref(db, pathStatistik))
        const dataAkt = snapAkt.val() || {}
        const ibadahBelumSelesai = Object.keys(dataAkt)
          .filter(
            (key) =>
              String(dataAkt[key].nama || '').trim().toLowerCase() === namaPromotor.trim().toLowerCase() &&
              (dataAkt[key].aksi === 'MulaiIbadah' || dataAkt[key].aksi === 'Ibadah') &&
              !dataAkt[key].waktuSelesai
          )
          .map((key) => ({ _key: key, ...dataAkt[key] }))
          .sort((a: any, b: any) => (b.waktu || 0) - (a.waktu || 0))
        const targetIbadah = ibadahBelumSelesai[0]
        const waktuMulaiIb = Number(targetIbadah?.waktuMulai || targetIbadah?.waktu || dataSaya?.waktuMulaiIbadah || now)

        await update(ref(db, pathAntrian), {
          status: 'Standby',
          posisiTerkunci: 0,
          waktuStandby: waktuStandbyKembali,
          waktuMulaiIbadah: null,
        })
        if (targetIbadah && targetIbadah._key) {
          await update(ref(db, `${pathStatistik}/${targetIbadah._key}`), {
            waktuSelesai: now,
            durasiDetik: Math.max(0, Math.floor((now - waktuMulaiIb) / 1000)),
            posisiSelesai: posisiLama,
          })
        }
        toast.success(`${namaPromotor}: Kembali antri dari Ibadah`)
      } else if (aksi === 'PanggilCS') {
        const posisi = posisiStandby()
        const now = Date.now()
        await update(ref(db, pathAntrian), {
          status: 'Dipanggil CS',
          posisiTerkunci: posisi,
          waktuStandbySebelumCS: dataSaya?.waktuStandby || now,
          waktuMulaiCS: now,
        })
        await push(ref(db, pathStatistik), {
          nama: namaPromotor,
          aksi: 'PanggilCS',
          waktu: now,
          waktuMulai: now,
          tanggal: tglIndo,
          tanggalKey: tKeyAktif,
          kategori: 'DipanggilCS',
          posisi,
        })
        toast.info(`${namaPromotor}: Dipanggil CS / Gudang`)
      } else if (aksi === 'KembaliCS') {
        const posisiLama = dataSaya?.posisiTerkunci || 0
        const waktuStandbyKembali = dataSaya?.waktuStandbySebelumCS || dataSaya?.waktuStandby || Date.now()
        const now = Date.now()
        const snapAkt = await get(ref(db, pathStatistik))
        const dataAkt = snapAkt.val() || {}
        const csBelumSelesai = Object.keys(dataAkt)
          .filter(
            (key) =>
              String(dataAkt[key].nama || '').trim().toLowerCase() === namaPromotor.trim().toLowerCase() &&
              dataAkt[key].aksi === 'PanggilCS' &&
              !dataAkt[key].waktuSelesai
          )
          .map((key) => ({ _key: key, ...dataAkt[key] }))
          .sort((a: any, b: any) => (b.waktu || 0) - (a.waktu || 0))
        const targetCS = csBelumSelesai[0]
        const waktuMulaiCS = Number(targetCS?.waktuMulai || targetCS?.waktu || dataSaya?.waktuMulaiCS || now)

        await update(ref(db, pathAntrian), {
          status: 'Standby',
          waktuStandby: waktuStandbyKembali,
          posisiTerkunci: 0,
          waktuMulaiCS: null,
        })
        if (targetCS && targetCS._key) {
          await update(ref(db, `${pathStatistik}/${targetCS._key}`), {
            waktuSelesai: now,
            durasiDetik: Math.max(0, Math.floor((now - waktuMulaiCS) / 1000)),
            posisiSelesai: posisiLama,
          })
        }
        toast.success(`${namaPromotor}: Kembali antri dari CS / Gudang`)
      } else if (aksi === 'Keluar') {
        await remove(ref(db, pathAntrian))
        await push(ref(db, pathStatistik), {
          nama: namaPromotor,
          aksi: 'KeluarAntrian',
          waktu: Date.now(),
          tanggal: tglIndo,
          tanggalKey: tKeyAktif,
          hasil: 'Manual (Bantu Admin)',
        })
        toast.success(`${namaPromotor} keluar dari antrian.`)
      }
    } catch {
      toast.error('Terjadi kesalahan saat memproses.')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatJam = (ts: number) => (ts ? `${pad(new Date(ts).getHours())}.${pad(new Date(ts).getMinutes())}` : '-')
  const formatJamDetik = (ts: number) => {
    if (!ts) return '-'
    const d = new Date(ts)
    return `${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`
  }

  const aktivitasPromotorHariIni = promotorAktif
    ? statistikList
        .filter((a) => {
          const samaNama = String(a.nama || '').trim().toLowerCase() === promotorAktif.nama.trim().toLowerCase()
          const samaHari = (a.tanggalKey && a.tanggalKey === todayKey) || a.tanggal === hariIniIndo
          const setelahReset = Number(a.waktu || a.waktuMulai || 0) >= lastResetTimestamp
          return samaNama && samaHari && setelahReset
        })
        .sort((a, b) => Number(b.waktuMulai || b.waktu || 0) - Number(a.waktuMulai || a.waktu || 0))
    : []

  if (authLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  const antrianTutup = setting?.statusAntrian === 'TUTUP'

  return (
    <AdminShell isDark={isDark} onToggleTheme={toggleTheme} onLogout={logout} tokoId={TOKO_ID}>
      <SectionCard
        icon={<Smartphone className="w-5 h-5" />}
        tone="purple"
        title="Bantu Promotor (Tanpa HP)"
        subtitle="Ketik nama promotor untuk check-in, antrian & closing"
      >
        <div className="space-y-2" ref={pickerRef}>
          <label className="text-xs font-bold uppercase text-muted-foreground block">
            Cari &amp; Pilih Nama Promotor
          </label>

          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setDropdownOpen(true)}
              onChange={(e) => {
                const val = e.target.value
                setSearchQuery(val)
                setDropdownOpen(true)
                if (!val.trim()) setSelectedNama('')
              }}
              placeholder="Ketik nama promotor"
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-secondary border border-border text-sm font-bold text-foreground uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {(searchQuery || selectedNama) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedNama('')
                  setDropdownOpen(true)
                }}
                aria-label="Bersihkan pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground text-xs font-black flex items-center justify-center border border-border"
              >
                ×
              </button>
            )}

            {dropdownOpen && (
              <div className="absolute z-40 mt-2 w-full max-h-60 overflow-y-auto rounded-2xl bg-card border border-border shadow-xl divide-y divide-border/60">
                {filteredPromotors.length === 0 ? (
                  <div className="p-3.5 text-xs text-muted-foreground italic text-center">
                    Promotor &ldquo;{searchQuery}&rdquo; tidak ditemukan
                  </div>
                ) : (
                  filteredPromotors.map((u) => {
                    const aktif = antrian.find((a) => a.nama.toLowerCase() === u.nama.toLowerCase())
                    const statusLabel = aktif ? aktif.status : 'Offline'
                    const isSelected = selectedNama.toLowerCase() === u.nama.toLowerCase()

                    return (
                      <button
                        key={u._key}
                        type="button"
                        onClick={() => {
                          setSelectedNama(u.nama)
                          setSearchQuery(u.nama)
                          setDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center justify-between gap-2 text-xs transition ${
                          isSelected
                            ? 'bg-primary/15 text-primary font-black'
                            : 'hover:bg-secondary text-foreground font-bold'
                        }`}
                      >
                        <span className="uppercase truncate">{u.nama}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-secondary text-muted-foreground shrink-0">
                          {statusLabel}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {promotorAktif && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-3xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mode Kontrol Admin Untuk</p>
              <h2 className="text-base font-black uppercase text-foreground mt-0.5">{promotorAktif.nama}</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {checkinRecord ? `Check-in: ${formatJamDetik(Number(checkinRecord.waktu))}` : 'Belum check-in hari ini'}
              </p>
            </div>
            <span
              className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase ${
                statusSaya === 'Melayani'
                  ? 'bg-emerald-500 text-white'
                  : statusSaya === 'Dipanggil CS'
                    ? 'bg-purple-600 text-white'
                    : statusSaya === 'Ibadah'
                      ? 'bg-amber-500 text-white'
                      : statusSaya === 'Standby'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-secondary text-muted-foreground'
              }`}
            >
              {statusSaya}
            </span>
          </div>

          {sedangDikunci && (
            <div className="bg-rose-600 text-white rounded-3xl p-5 flex items-center gap-3 shadow-lg">
              <Lock className="w-7 h-7 shrink-0" />
              <div>
                <p className="text-xs font-black uppercase">Akun Promotor Sedang Dikunci</p>
                <p className="text-[11px] text-rose-100">Alasan: {lockSaya?.alasan || 'Pelanggaran Disiplin Toko'}</p>
              </div>
            </div>
          )}

          {statusSaya === 'Offline' && (
            <div className="bg-card rounded-3xl p-6 shadow-sm border border-border text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                {sudahCheckinHariIni ? (
                  <ShieldCheck className="w-7 h-7 text-emerald-500" />
                ) : (
                  <UserCheck className="w-7 h-7 text-primary" />
                )}
              </div>
              <h3 className="text-sm font-black uppercase text-foreground mb-1">
                {sudahCheckinHariIni ? 'Sudah Check-in Hari Ini' : 'Check-in & Masuk Antrian (Mode Admin)'}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Validasi GPS dilewati otomatis karena diinput langsung oleh Admin.
              </p>

              <div className="mb-4 text-left">
                <label className="text-xs font-bold text-muted-foreground mb-2 block uppercase">Pilih Kategori</label>
                <div className="flex bg-secondary rounded-xl p-1.5 gap-1.5">
                  {[
                    { id: 'HA' as const, label: 'Home Appliance' },
                    { id: 'AV' as const, label: 'Audio Video' },
                  ].map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => setKategoriPilih(it.id)}
                      className={`flex-1 py-2 px-1 rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 ${
                        kategoriPilih === it.id
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="text-sm font-bold">{it.id}</span>
                      <span className="text-[10px] font-medium opacity-80">{it.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleAksi('CheckIn')}
                disabled={isProcessing || antrianTutup || sedangDikunci}
                className="w-full py-4 bg-primary text-primary-foreground font-black rounded-xl shadow-lg disabled:opacity-50 transition-all flex justify-center items-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-primary-foreground" />}
                {antrianTutup ? 'ANTRIAN DITUTUP' : 'MASUKKAN KE ANTRIAN'}
              </button>
            </div>
          )}

          {statusSaya === 'Standby' && (
            <div className="bg-card rounded-3xl p-6 text-center shadow-sm border border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Nomor Antrian</p>
              <div className="text-7xl font-black text-foreground my-2 tracking-tighter">
                {(() => {
                  const listKat = normKategori(dataSaya?.kategori ?? dataSaya?.subkategori) === 'AV' ? listAV : listHA
                  const pos = listKat
                    .filter((a) => a.status === 'Standby')
                    .findIndex((a) => a.nama.toLowerCase() === promotorAktif.nama.toLowerCase()) + 1
                  return pos.toString().padStart(2, '0')
                })()}
              </div>
              <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-6 bg-primary/10 text-primary border border-primary/20 uppercase">
                KATEGORI {normKategori(dataSaya?.kategori ?? dataSaya?.subkategori)}
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleAksi('BawaCustomer')}
                  disabled={isProcessing}
                  className="w-full py-4 bg-cyan-500 text-slate-950 font-black rounded-xl shadow-md hover:bg-cyan-400 transition-all flex justify-center items-center gap-2"
                >
                  <Play className="w-5 h-5 fill-slate-950" /> SUDAH MEMBAWA CUSTOMER
                </button>
                <button
                  onClick={() => handleAksi('Ibadah')}
                  disabled={isProcessing}
                  className="w-full py-4 bg-amber-500 text-white font-bold rounded-xl shadow-md hover:bg-amber-400 transition-all flex justify-center items-center gap-2"
                >
                  <MosqueIcon className="w-5 h-5" /> SEDANG IBADAH
                </button>
                <button
                  onClick={() => handleAksi('PanggilCS')}
                  disabled={isProcessing}
                  className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl shadow-md hover:bg-purple-500 transition-all flex justify-center items-center gap-2"
                >
                  <Package className="w-5 h-5" /> DIPANGGIL CS / GUDANG
                </button>
                <button
                  onClick={() => handleAksi('Keluar')}
                  disabled={isProcessing}
                  className="w-full py-4 bg-rose-600 text-white font-bold rounded-xl shadow-md hover:bg-rose-500 transition-all flex justify-center items-center gap-2"
                >
                  <LogOut className="w-5 h-5" /> KELUAR ANTRIAN
                </button>
              </div>
            </div>
          )}

          {statusSaya === 'Melayani' && (
            <div className="bg-blue-600 rounded-3xl p-8 text-center text-white shadow-xl">
              <h3 className="text-2xl font-black mb-2 uppercase">Sedang Melayani</h3>
              <p className="text-xs text-blue-100 mb-6">
                Klik tombol di bawah saat {promotorAktif.nama} selesai melayani customer untuk mencatat hasil Deal / Lihat.
              </p>
              <button
                onClick={() => handleAksi('Selesai')}
                disabled={isProcessing}
                className="w-full py-4 bg-white text-blue-700 font-black rounded-xl shadow-lg flex justify-center items-center gap-2"
              >
                <ArrowRight className="w-5 h-5" /> SELESAI MELAYANI
              </button>
            </div>
          )}

          {statusSaya === 'Dipanggil CS' && (
            <div className="bg-purple-600 rounded-3xl p-8 text-center text-white shadow-xl">
              <Package className="w-12 h-12 mx-auto mb-3" />
              <h3 className="text-2xl font-black mb-2 uppercase">Dipanggil CS / Gudang</h3>
              <p className="text-xs text-purple-100 mb-6">Posisi #{dataSaya?.posisiTerkunci || '-'} aman terkunci.</p>
              <button
                onClick={() => handleAksi('KembaliCS')}
                disabled={isProcessing}
                className="w-full py-4 bg-white text-purple-700 font-black rounded-xl shadow-lg"
              >
                KEMBALI ANTRI
              </button>
            </div>
          )}

          {statusSaya === 'Ibadah' && (
            <div className="bg-amber-500 rounded-3xl p-8 text-center text-white shadow-xl">
              <MosqueIcon className="w-12 h-12 mx-auto mb-3" />
              <h3 className="text-2xl font-black mb-2 uppercase">Sedang Ibadah</h3>
              <p className="text-xs text-amber-100 mb-6">Posisi #{dataSaya?.posisiTerkunci || '-'} aman terkunci.</p>
              <button
                onClick={() => handleAksi('KembaliIbadah')}
                disabled={isProcessing}
                className="w-full py-4 bg-white text-amber-700 font-black rounded-xl shadow-lg"
              >
                SELESAI IBADAH
              </button>
            </div>
          )}

          <div className="bg-card border border-border rounded-3xl p-5 space-y-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
              Riwayat Hari Ini · {promotorAktif.nama}
            </h3>
            {aktivitasPromotorHariIni.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">Belum ada aktivitas tercatat hari ini.</p>
            ) : (
              <div className="space-y-2">
                {aktivitasPromotorHariIni.map((a, idx) => (
                  <div
                    key={a._key || idx}
                    className="flex justify-between items-center p-3 rounded-2xl bg-secondary/60 border border-border text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground uppercase block">{a.aksi}</span>
                      {a.hasil && <span className="text-[10px] font-bold text-primary uppercase">{a.hasil}</span>}
                    </div>
                    <span className="font-bold text-foreground tabular-nums">
                      {formatJam(a.waktuMulai || a.waktu)}
                      {a.waktuSelesai ? ` - ${formatJam(a.waktuSelesai)}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showClosing && promotorAktif && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-3xl p-6 w-full max-w-sm text-center border border-border shadow-2xl">
            <h3 className="text-base font-black mb-1 text-foreground uppercase">Hasil Melayani Customer</h3>
            <p className="text-xs text-muted-foreground mb-5 uppercase font-bold">{promotorAktif.nama}</p>
            <div className="space-y-3">
              <button
                onClick={() => handleAksi('SimpanClosing', 'Deal')}
                disabled={isProcessing}
                className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50"
              >
                ✓ DEAL / CLOSING
              </button>
              <button
                onClick={() => handleAksi('SimpanClosing', 'Lihat')}
                disabled={isProcessing}
                className="w-full py-3.5 bg-amber-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50"
              >
                👀 LIHAT-LIHAT SAJA
              </button>
              <button
                onClick={() => setShowClosing(false)}
                className="w-full py-2 text-muted-foreground font-medium text-xs mt-2"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}