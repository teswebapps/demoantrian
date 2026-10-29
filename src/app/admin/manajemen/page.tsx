'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue, update, get, remove, push, set } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, UserPlus, UserMinus, Trash2, Play, Lock, Unlock, RotateCcw, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

export default function ManajemenPage() {
  const { user, loading: authLoading } = useAuth('ADMIN')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [masterSales, setMasterSales] = useState<any[]>([])
  const [daftarAntrian, setDaftarAntrian] = useState<any[]>([])
  
  const [formNama, setFormNama] = useState('')
  const [formEmail, setFormEmail] = useState('')
  
  const [selectedSales, setSelectedSales] = useState('')
  const [selectedKategori, setSelectedKategori] = useState('HA')
  const [selectedPosisi, setSelectedPosisi] = useState('1')
  
  const [selectedLockSales, setSelectedLockSales] = useState('')
  const [lockAction, setLockAction] = useState('LOCK')
  const [lockReason, setLockReason] = useState('Pulang tanpa keluar antrian')
  const [lockDuration, setLockDuration] = useState('60')

  const TOKO_ID = user?.tokoId || 'ufo-kebonsari'

  useEffect(() => {
    if (!TOKO_ID) return
    const unsubMaster = onValue(ref(db, 'mastersales'), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) {
        Object.keys(data).forEach(k => {
          const item = data[k]
          const rec = item.record ? item.record : item
          const nama = rec.NAMA_PROMOTOR || rec.nama
          const email = rec.EMAIL || rec.email || ''
          if (nama) list.push({ _key: k, nama: String(nama).trim(), email })
        })
      }
      setMasterSales(list)
    })
    const unsubAntrian = onValue(ref(db, `toko/${TOKO_ID}/antrian`), (snap) => {
      const data = snap.val()
      const list: any[] = []
      if (data) Object.keys(data).forEach(k => { if (data[k].nama) list.push({ ...data[k], _key: k }) })
      setDaftarAntrian(list)
    })
    return () => { unsubMaster(); unsubAntrian(); }
  }, [TOKO_ID])

  const handleTambahPromotor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNama || !formEmail) return alert('Isi semua field!')
    setIsProcessing(true)
    try {
      const emailKey = formEmail.trim().toLowerCase().replace(/\./g, ',')
      await set(ref(db, 'users/whitelist/' + emailKey), {
        nama: formNama.toUpperCase(),
        email: formEmail.trim().toLowerCase(),
        role: 'PROMOTOR',
        tokoId: TOKO_ID
      })
      await push(ref(db, 'mastersales'), { record: { NAMA_PROMOTOR: formNama.toUpperCase(), EMAIL: formEmail.trim().toLowerCase() } })
      alert(`Berhasil! Promotor ${formNama.toUpperCase()} sudah bisa login.`)
      setFormNama('')
      setFormEmail('')
    } catch (err) { alert('Gagal menambah promotor.') } finally { setIsProcessing(false) }
  }

  const handlePaksaAntri = async () => {
    if (!selectedSales) return alert('Pilih promotor!')
    setIsProcessing(true)
    try {
      const clean = selectedSales.trim().toLowerCase().replace(/\s+/g, '_')
      const snap = await get(ref(db, `toko/${TOKO_ID}/antrian/${clean}`))
      if (snap.exists()) throw new Error('Promotor sudah ada di antrian.')
      await set(ref(db, `toko/${TOKO_ID}/antrian/${clean}`), {
        nama: selectedSales, status: 'Standby', waktuStandby: Date.now(),
        kategori: selectedKategori, subkategori: selectedKategori,
        posisiTerkunci: 0, timerMulai: 0, timerAksi: ''
      })
      alert('Berhasil dimasukkan ke antrian.')
      setSelectedSales('')
    } catch (err: any) { alert(err.message) } finally { setIsProcessing(false) }
  }

  const handlePaksaKeluar = async () => {
    if (!selectedSales) return alert('Pilih promotor!')
    setIsProcessing(true)
    try {
      const clean = selectedSales.trim().toLowerCase().replace(/\s+/g, '_')
      await remove(ref(db, `toko/${TOKO_ID}/antrian/${clean}`))
      alert('Berhasil dikeluarkan dari antrian.')
      setSelectedSales('')
    } catch (err) { alert('Gagal mengeluarkan.') } finally { setIsProcessing(false) }
  }

  const handleHapusPermanen = async () => {
    if (!selectedSales) return alert('Pilih promotor!')
    if (!window.confirm(`Hapus permanen ${selectedSales}?`)) return
    setIsProcessing(true)
    try {
      const target = masterSales.find(s => s.nama === selectedSales)
      if (target) {
        await remove(ref(db, 'mastersales/' + target._key))
        if (target.email) {
          const emailKey = target.email.toLowerCase().replace(/\./g, ',')
          await remove(ref(db, 'users/whitelist/' + emailKey))
        }
      }
      alert('Promotor dihapus permanen.')
      setSelectedSales('')
    } catch (err) { alert('Gagal menghapus.') } finally { setIsProcessing(false) }
  }

  const handlePaksaBawaCustomer = async () => {
    if (!selectedSales) return alert('Pilih promotor!')
    setIsProcessing(true)
    try {
      const clean = selectedSales.trim().toLowerCase().replace(/\s+/g, '_')
      await update(ref(db, `toko/${TOKO_ID}/antrian/${clean}`), {
        status: 'Melayani', waktuMulaiMelayani: Date.now(), posisiTerkunci: 0
      })
      await push(ref(db, `toko/${TOKO_ID}/statistikAktivitas`), {
        nama: selectedSales, aksi: 'BawaCustomer', waktu: Date.now(),
        tanggal: new Date().toLocaleDateString('id-ID').split('/').join('-'),
        waktuMulai: Date.now(), keterangan: 'Dipaksa Admin'
      })
      alert('Promotor dipaksa melayani.')
      setSelectedSales('')
    } catch (err) { alert('Gagal memproses.') } finally { setIsProcessing(false) }
  }

  const handleLockUnlock = async () => {
    if (!selectedLockSales) return alert('Pilih promotor!')
    setIsProcessing(true)
    try {
      const clean = selectedLockSales.trim().toLowerCase().replace(/\s+/g, '_')
      if (lockAction === 'LOCK') {
        await update(ref(db, `toko/${TOKO_ID}/lockPromotor/${clean}`), {
          nama: selectedLockSales, locked: true, alasan: lockReason,
          waktuMulaiLock: Date.now(), waktuSelesaiLock: Date.now() + (parseInt(lockDuration) * 60000)
        })
        await remove(ref(db, `toko/${TOKO_ID}/antrian/${clean}`))
        alert(`${selectedLockSales} dikunci selama ${lockDuration} menit.`)
      } else {
        await update(ref(db, `toko/${TOKO_ID}/lockPromotor/${clean}`), {
          locked: false, alasan: '', waktuSelesaiLock: 0, waktuMulaiLock: 0
        })
        alert(`${selectedLockSales} dibuka kuncinya.`)
      }
      setSelectedLockSales('')
    } catch (err) { alert('Gagal memproses lock.') } finally { setIsProcessing(false) }
  }

  const handleResetTotal = async () => {
    if (!window.confirm("⚠️ PERINGATAN: Hapus semua antrian aktif hari ini?")) return
    setIsProcessing(true)
    try {
      await remove(ref(db, `toko/${TOKO_ID}/antrian`))
      alert('Semua antrian berhasil direset.')
    } catch (err) { alert('Gagal reset.') } finally { setIsProcessing(false) }
  }

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>

  return (
    // TEMA BARU: Background Gelap
    <div className="min-h-screen bg-slate-950 p-6 md:p-8 flex justify-center pb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white uppercase">Manajemen & Darurat</h1>
            <p className="text-sm text-slate-400 uppercase">Kontrol Penuh Admin</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* TAMBAH PROMOTOR */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase"><UserPlus className="w-5 h-5 text-cyan-400" /> Tambah Promotor Baru</h3>
            <form onSubmit={handleTambahPromotor} className="space-y-3">
              <input type="text" value={formNama} onChange={e => setFormNama(e.target.value)} placeholder="NAMA LENGKAP" className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyan-500 uppercase" required />
              <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="EMAIL GOOGLE" className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyan-500" required />
              <button type="submit" disabled={isProcessing} className="w-full py-3 bg-cyan-500 text-slate-950 font-bold rounded-xl uppercase tracking-wider text-xs hover:bg-cyan-400 transition">Simpan Promotor</button>
            </form>
          </div>

          {/* MANAJEMEN ANTRIAN */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase"><UserMinus className="w-5 h-5 text-amber-400" /> Manajemen Urutan Antrian</h3>
            <div className="space-y-3">
              <select value={selectedSales} onChange={e => setSelectedSales(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyan-500">
                <option value="">-- Pilih Promotor --</option>
                {masterSales.map(s => <option key={s._key} value={s.nama}>{s.nama}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select value={selectedKategori} onChange={e => setSelectedKategori(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyan-500">
                  <option value="HA">Kategori HA</option>
                  <option value="AV">Kategori AV</option>
                </select>
                <input type="number" value={selectedPosisi} onChange={e => setSelectedPosisi(e.target.value)} placeholder="Posisi" className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyan-500" min="1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handlePaksaAntri} disabled={isProcessing} className="py-3 bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 font-bold rounded-xl text-xs uppercase hover:bg-emerald-900/50 transition">Paksa Masuk Antrian</button>
                <button onClick={handlePaksaKeluar} disabled={isProcessing} className="py-3 bg-amber-900/30 text-amber-400 border border-amber-800/50 font-bold rounded-xl text-xs uppercase hover:bg-amber-900/50 transition">Paksa Keluar</button>
              </div>
              <button onClick={handleHapusPermanen} disabled={isProcessing} className="w-full py-3 bg-rose-900/30 text-rose-400 border border-rose-800/50 font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-2 hover:bg-rose-900/50 transition"><Trash2 className="w-4 h-4" /> Hapus Promotor Permanen</button>
            </div>
          </div>

          {/* TINDAKAN DARURAT */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase"><ShieldAlert className="w-5 h-5 text-rose-500" /> Tindakan Darurat</h3>
            <div className="space-y-3">
              <button onClick={handlePaksaBawaCustomer} disabled={isProcessing || !selectedSales} className="w-full py-3 bg-blue-900/30 text-blue-400 border border-blue-800/50 font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-2 hover:bg-blue-900/50 transition"><Play className="w-4 h-4" /> Paksa Bawa Customer (Pilih atas)</button>
              
              <hr className="border-slate-800" />

              <select value={selectedLockSales} onChange={e => setSelectedLockSales(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyan-500">
                <option value="">-- Pilih Promotor untuk Lock --</option>
                {masterSales.map(s => <option key={s._key} value={s.nama}>{s.nama}</option>)}
              </select>
              <select value={lockAction} onChange={e => setLockAction(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyan-500">
                <option value="LOCK">🔒 Kunci Akun</option>
                <option value="UNLOCK">🔓 Buka Kunci</option>
              </select>
              {lockAction === 'LOCK' && (
                <>
                  <input type="text" value={lockReason} onChange={e => setLockReason(e.target.value)} placeholder="Alasan hukuman" className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyan-500" />
                  <input type="number" value={lockDuration} onChange={e => setLockDuration(e.target.value)} placeholder="Durasi (menit)" className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyan-500" />
                </>
              )}
              <button onClick={handleLockUnlock} disabled={isProcessing} className="w-full py-3 bg-rose-900/30 text-rose-400 border border-rose-800/50 font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-2 hover:bg-rose-900/50 transition">
                {lockAction === 'LOCK' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {lockAction === 'LOCK' ? 'Kunci Akun' : 'Buka Kunci'}
              </button>

              <hr className="border-slate-800" />
              
              <button onClick={handleResetTotal} disabled={isProcessing} className="w-full py-3 bg-rose-600 text-white font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 hover:bg-rose-500 transition"><RotateCcw className="w-4 h-4" /> RESET TOTAL ANTRIAN HARI INI</button>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  )
}