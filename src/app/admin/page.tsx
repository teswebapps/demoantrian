'use client'

import { useAuth } from '@/hooks/useAuth'
import { useAntrian } from '@/hooks/useAntrian'
import { motion, AnimatePresence } from 'framer-motion'
import { ref, update, remove, set, onValue, push, get } from 'firebase/database'
import { db } from '@/lib/firebase'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Loader2, LogOut, Shield, Users, Clock, LayoutDashboard, 
  ListOrdered, Settings, UserCheck, Unlock, Lock, 
  Trash2, UserPlus, X, Calendar,
  History, BarChart3, Coffee, LogOut as LogOutIcon,
  ShieldAlert, ChevronDown
} from 'lucide-react'

export default function AdminPage() {
  const { user, loading: authLoading, error, logout } = useAuth('ADMIN')
  const { antrian, setting, loading: dataLoading } = useAntrian(user?.tokoId || 'ufo-kebonsari')
  
  const [isUpdating, setIsUpdating] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLockModalOpen, setIsLockModalOpen] = useState(false)
  const [isAktivitasOpen, setIsAktivitasOpen] = useState(false)
  
  const [formNama, setFormNama] = useState('')
  const [formEmail, setFormEmail] = useState('')
  
  const [targetLock, setTargetLock] = useState('')
  const [alasanLock, setAlasanLock] = useState('Pulang tanpa izin')
  const [durasiJam, setDurasiJam] = useState('1')
  const [waktuMulaiLock, setWaktuMulaiLock] = useState<'SEKARANG' | 'JADWAL'>('SEKARANG')
  const [jadwalTanggal, setJadwalTanggal] = useState('')
  const [jadwalJam, setJadwalJam] = useState('')
  
  const [aktivitasHariIni, setAktivitasHariIni] = useState<any[]>([])
  const [hariIniIndo, setHariIniIndo] = useState('')

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    const d = new Date()
    setHariIniIndo(`${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`)
    
    if (!TOKO_ID) return
    const unsub = onValue(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setAktivitasHariIni(list)
    })
    return () => unsub()
  }, [TOKO_ID])

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-red-400">{error}</div>

  const toggleStatusAntrian = async () => {
    if (!TOKO_ID || isUpdating) return
    setIsUpdating(true)
    const statusBaru = setting?.statusAntrian === 'BUKA' ? 'TUTUP' : 'BUKA'
    try { await update(ref(db, `toko/${TOKO_ID}/setting`), { statusAntrian: statusBaru }) } 
    catch (err) { console.error(err) } finally { setIsUpdating(false) }
  }

  const hapusAntrian = async (nama: string) => {
    if (!window.confirm(`Keluarkan ${nama} dari antrian?`)) return
    try {
      const clean = nama.trim().toLowerCase().replace(/\s+/g, '_')
      await remove(ref(db, `toko/${TOKO_ID}/antrian/` + clean))
      await push(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), { nama, aksi: 'KeluarAntrian', waktu: Date.now(), tanggal: hariIniIndo, hasil: 'Admin' })
    } catch (err) { console.error(err) }
  }

  const openLockModal = (nama: string) => {
    setTargetLock(nama)
    setAlasanLock('Pulang tanpa izin')
    setDurasiJam('1')
    setWaktuMulaiLock('SEKARANG')
    setJadwalTanggal(new Date().toISOString().split('T')[0])
    setJadwalJam('08:00')
    setIsLockModalOpen(true)
  }

  const eksekusiLock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetLock) return
    try {
      const clean = targetLock.trim().toLowerCase().replace(/\s+/g, '_')
      let startTime = Date.now()

      if (waktuMulaiLock === 'JADWAL') {
        if (!jadwalTanggal || !jadwalJam) throw new Error("Isi tanggal & jam!")
        const dateStr = `${jadwalTanggal}T${jadwalJam}:00`
        startTime = new Date(dateStr).getTime()
        if (startTime < Date.now()) throw new Error("Waktu tidak boleh di masa lalu!")
      }

      const endTime = startTime + (parseInt(durasiJam) * 3600000)

      await set(ref(db, `toko/${TOKO_ID}/lockPromotor/` + clean), {
        locked: true,
        alasan: alasanLock,
        waktuMulaiLock: startTime,
        waktuSelesaiLock: endTime
      })

      if (waktuMulaiLock === 'SEKARANG') {
        await remove(ref(db, `toko/${TOKO_ID}/antrian/` + clean))
      }

      alert(`Hukuman untuk ${targetLock} berhasil dijadwalkan.`)
      setIsLockModalOpen(false)
    } catch (err: any) { alert(err.message) }
  }

  const unlockPromotor = async (nama: string) => {
    if (!window.confirm(`Buka kunci untuk ${nama}?`)) return
    try {
      const clean = nama.trim().toLowerCase().replace(/\s+/g, '_')
      await remove(ref(db, `toko/${TOKO_ID}/lockPromotor/` + clean))
      alert(`${nama} berhasil dibuka kuncinya.`)
    } catch (err) { console.error(err) }
  }

  const simpanPromotorBaru = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNama || !formEmail) return alert("Nama dan Email wajib diisi!")
    try {
      const emailKey = formEmail.trim().toLowerCase().replace(/\./g, ',')
      await set(ref(db, 'users/whitelist/' + emailKey), {
        nama: formNama.toUpperCase(), // <-- PAKSA UPPERCASE
        email: formEmail.trim().toLowerCase(),
        role: 'PROMOTOR',
        tokoId: TOKO_ID
      })
      alert(`Berhasil! Promotor ${formNama.toUpperCase()} sekarang bisa login.`)
      setIsModalOpen(false)
      setFormNama('')
      setFormEmail('')
    } catch (err) { console.error(err) }
  }

  const totalStandby = antrian.filter(a => a.status === 'Standby').length
  const totalMelayani = antrian.filter(a => a.status === 'Melayani').length
  const totalHA = antrian.filter(a => a.kategori === 'HA').length
  const totalAV = antrian.filter(a => a.kategori === 'AV').length

  const listBawa = aktivitasHariIni.filter(a => a.aksi === 'BawaCustomer' && a.tanggal === hariIniIndo)
  const listIbadah = aktivitasHariIni.filter(a => a.aksi === 'MulaiIbadah' && a.tanggal === hariIniIndo)
  const listAutokick = aktivitasHariIni.filter(a => a.aksi === 'Autokick' && a.tanggal === hariIniIndo)

  return (
    <div className="min-h-screen bg-slate-950 flex relative font-sans text-slate-200">
      
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus className="w-5 h-5 text-cyan-400" /> Tambah Promotor</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={simpanPromotorBaru} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Nama Lengkap</label>
                  <input type="text" value={formNama} onChange={e => setFormNama(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-white focus:border-cyan-500 uppercase" placeholder="NAMA" required />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Email Google</label>
                  <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-white focus:border-cyan-500 lowercase" placeholder="email@gmail.com" required />
                </div>
                <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition">Simpan Akses Login</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLockModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Lock className="w-5 h-5 text-red-400" /> Hukuman: {targetLock}</h3>
                <button onClick={() => setIsLockModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={eksekusiLock} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Alasan</label>
                  <select value={alasanLock} onChange={e => setAlasanLock(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-white focus:border-red-500 uppercase">
                    <option value="PULANG TANPA IZIN">PULANG TANPA IZIN</option>
                    <option value="ISTIRAHAT MELEBIHI BATAS">ISTIRAHAT MELEBIHI BATAS</option>
                    <option value="TIDAK MELAYANI CUSTOMER">TIDAK MELAYANI CUSTOMER</option>
                    <option value="PELANGGARAN LAIN">PELANGGARAN LAIN</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Waktu Mulai</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setWaktuMulaiLock('SEKARANG')} className={`py-2 rounded-xl text-xs font-bold border uppercase ${waktuMulaiLock === 'SEKARANG' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-slate-950 text-slate-400 border-slate-700'}`}>SEKARANG</button>
                    <button type="button" onClick={() => setWaktuMulaiLock('JADWAL')} className={`py-2 rounded-xl text-xs font-bold border uppercase ${waktuMulaiLock === 'JADWAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-slate-950 text-slate-400 border-slate-700'}`}>TERJADWAL</button>
                  </div>
                </div>
                {waktuMulaiLock === 'JADWAL' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] text-slate-400 mb-1 block uppercase">Tanggal</label><input type="date" value={jadwalTanggal} onChange={e => setJadwalTanggal(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white uppercase" required /></div>
                    <div><label className="text-[10px] text-slate-400 mb-1 block uppercase">Jam</label><input type="time" value={jadwalJam} onChange={e => setJadwalJam(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white uppercase" required /></div>
                  </div>
                )}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Durasi Hukuman (Jam)</label>
                  <input type="number" value={durasiJam} onChange={e => setDurasiJam(e.target.value)} min="1" max="168" className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-white focus:border-red-500 uppercase" required />
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition mt-2 uppercase">Terapkan Hukuman</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg"><Shield className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-sm font-bold text-white">UFO Admin</h1><p className="text-[10px] text-slate-400">Kebonsari</p></div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-500/10 text-cyan-400 font-semibold text-sm"><LayoutDashboard className="w-5 h-5" /> Dashboard</Link>
          <Link href="/admin/aktivitas" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition text-sm"><History className="w-5 h-5" /> Aktivitas & Rekap</Link>
          <Link href="/admin/pengaturan" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition text-sm"><Settings className="w-5 h-5" /> Pengaturan</Link>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition text-sm font-semibold"><LogOut className="w-4 h-4" /> Keluar</button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div><h2 className="text-2xl font-bold text-white mb-1 uppercase">Dashboard Admin</h2><p className="text-sm text-slate-400">Selamat datang, <span className="text-cyan-400 font-semibold uppercase">{user?.nama}</span></p></div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition uppercase"><UserPlus className="w-4 h-4" /> Tambah Promotor</button>
            <button onClick={toggleStatusAntrian} disabled={isUpdating} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-wider transition-all border shadow-lg uppercase ${setting?.statusAntrian === 'BUKA' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : setting?.statusAntrian === 'BUKA' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {setting?.statusAntrian === 'BUKA' ? 'DIBUKA' : 'DITUTUP'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Antri" value={totalStandby} icon={<Users />} color="text-cyan-400" bg="bg-cyan-500/10" />
          <StatCard title="Sedang Dilayani" value={totalMelayani} icon={<UserCheck />} color="text-emerald-400" bg="bg-emerald-500/10" />
          <StatCard title="Kategori HA" value={totalHA} icon={<ListOrdered />} color="text-amber-400" bg="bg-amber-500/10" />
          <StatCard title="Kategori AV" value={totalAV} icon={<ListOrdered />} color="text-purple-400" bg="bg-purple-500/10" />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6 uppercase"><Clock className="w-5 h-5 text-cyan-500" /> Live Antrian</h3>
          {dataLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-slate-500 animate-spin" /></div> : antrian.length === 0 ? (
            <div className="text-center py-12 text-slate-500"><Users className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="uppercase">Belum ada promotor yang antri.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">NO</th>
                    <th className="px-4 py-3">NAMA</th>
                    <th className="px-4 py-3">KATEGORI</th>
                    <th className="px-4 py-3">STATUS</th>
                    <th className="px-4 py-3 rounded-r-lg text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {antrian.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-white uppercase">{item.nama}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.kategori === 'HA' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>{item.kategori}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.status === 'Standby' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{item.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openLockModal(item.nama)} className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 border border-slate-700 uppercase" title="Kunci Akun"><Lock className="w-4 h-4" /></button>
                          <button onClick={() => unlockPromotor(item.nama)} className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-slate-700 uppercase" title="Buka Kunci"><Unlock className="w-4 h-4" /></button>
                          <button onClick={() => hapusAntrian(item.nama)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-700 uppercase" title="Keluarkan"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <button onClick={() => setIsAktivitasOpen(!isAktivitasOpen)} className="w-full flex justify-between items-center p-5 bg-slate-900 hover:bg-slate-800 transition">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase"><History className="w-5 h-5 text-cyan-400" /> Aktivitas & Riwayat Hari Ini</h3>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isAktivitasOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {isAktivitasOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="p-5 grid grid-cols-2 gap-3">
                  <MenuAktivitas icon={<Users />} title="Bawa Customer" count={listBawa.length} color="bg-cyan-500/10 text-cyan-400" />
                  <MenuAktivitas icon={<Coffee />} title="Ibadah" count={listIbadah.length} color="bg-purple-500/10 text-purple-400" />
                  <MenuAktivitas icon={<LogOutIcon />} title="Keluar Antrian" count={0} color="bg-amber-500/10 text-amber-400" />
                  <MenuAktivitas icon={<ShieldAlert />} title="Autokick" count={listAutokick.length} color="bg-red-500/10 text-red-400" />
                  <Link href="/admin/aktivitas" className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-slate-800 transition uppercase">
                    <BarChart3 className="w-6 h-6 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-300">Rekap Promotor</span>
                  </Link>
                  <Link href="/admin/total-bulanan" className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-slate-800 transition uppercase">
                    <Calendar className="w-6 h-6 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-300">Total Bulanan</span>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>
    </div>
  )
}

function StatCard({ title, value, icon, color, bg }: { title: string, value: number, icon: React.ReactNode, color: string, bg: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4"><div className={`p-2 rounded-lg ${bg} ${color}`}>{icon}</div></div>
      <div><p className="text-3xl font-black text-white">{value}</p><p className="text-xs text-slate-400 font-medium mt-1 uppercase">{title}</p></div>
    </div>
  )
}

function MenuAktivitas({ icon, title, count, color }: any) {
  return (
    <div className={`bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2 relative`}>
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <span className="text-xs font-bold text-slate-300 uppercase">{title}</span>
      <span className="absolute top-2 right-2 text-[10px] font-black bg-slate-800 text-white px-2 py-0.5 rounded-full">{count}</span>
    </div>
  )
}