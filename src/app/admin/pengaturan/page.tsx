'use client'

import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase'
import { ref, onValue, update, get, remove } from 'firebase/database'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Save, Store, Image as ImageIcon, Type, MapPin, Navigation, RotateCcw, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false })

export default function PengaturanPage() {
  const { user, loading: authLoading } = useAuth('ADMIN')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  
  const [formNamaToko, setFormNamaToko] = useState('')
  const [formNamaSistem, setFormNamaSistem] = useState('')
  const [formLogoUrl, setFormLogoUrl] = useState('')
  const [formLat, setFormLat] = useState('')
  const [formLng, setFormLng] = useState('')
  const [formRadius, setFormRadius] = useState('50')
  const [formStatus, setFormStatus] = useState<'BUKA' | 'TUTUP'>('BUKA')

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'setting'), (snap) => {
      if (snap.exists()) {
        const data = snap.val()
        setFormNamaToko(data.namaToko || '')
        setFormNamaSistem(data.namaSistem || '')
        setFormLogoUrl(data.logoUrl || '')
        setFormLat(data.latToko ? String(data.latToko) : '')
        setFormLng(data.lngToko ? String(data.lngToko) : '')
        setFormRadius(data.radiusToko ? String(data.radiusToko) : '50')
        setFormStatus(data.statusAntrian || 'BUKA')
      }
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const simpanPengaturan = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const latAda = formLat.trim() !== ''
      const lngAda = formLng.trim() !== ''
      
      await update(ref(db, 'setting'), {
        namaToko: formNamaToko.toUpperCase(),
        namaSistem: formNamaSistem.toUpperCase(),
        logoUrl: formLogoUrl,
        latToko: latAda ? parseFloat(formLat) : '',
        lngToko: lngAda ? parseFloat(formLng) : '',
        radiusToko: parseInt(formRadius) || 50,
        statusAntrian: formStatus
      })
      alert("Pengaturan berhasil disimpan!")
    } catch (err) {
      console.error(err)
      alert("Gagal menyimpan pengaturan.")
    } finally {
      setIsSaving(false)
    }
  }

  const isiLokasiSaya = () => {
    if (!navigator.geolocation) return alert("Browser tidak mendukung GPS")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormLat(pos.coords.latitude.toFixed(7))
        setFormLng(pos.coords.longitude.toFixed(7))
        alert("Lokasi berhasil diambil!")
      },
      () => alert("Gagal mengambil lokasi. Izinkan akses GPS.")
    )
  }

  const resetTotal = async () => {
    if (!window.confirm("⚠️ PERINGATAN:\n\nSemua antrian hari ini akan dihapus.\nNo Sale akan dicatat otomatis untuk promotor yang belum dapat Deal.\n\nLanjutkan?")) return
    
    setIsResetting(true)
    try {
      const hariIniKey = new Date().toISOString().split('T')[0]
      const hariIniIndo = `${String(new Date().getDate()).padStart(2,'0')}-${String(new Date().getMonth()+1).padStart(2,'0')}-${new Date().getFullYear()}`
      
      const checkinSnap = await get(ref(db, 'checkinHarian'))
      const dataCheckin = checkinSnap.val() || {}
      
      const aktSnap = await get(ref(db, 'statistikAktivitas'))
      const dataAkt = aktSnap.val() || {}
      const listHariIni = Object.values(dataAkt).filter((a: any) => a && a.tanggal === hariIniIndo)
      const promotorDeal = new Set(listHariIni.filter((a: any) => a.aksi === 'BawaCustomer' && a.hasil === 'Deal').map((a: any) => String(a.nama).toLowerCase().replace(/\s+/g, '_')))
      
      const masterSnap = await get(ref(db, 'mastersales'))
      const masterData = masterSnap.val() || {}
      const mapNama: any = {}
      Object.values(masterData).forEach((item: any) => {
        const rec = item.record ? item.record : item
        const n = rec.NAMA_PROMOTOR || rec.nama
        if (n) mapNama[String(n).trim().toLowerCase().replace(/\s+/g, '_')] = String(n).trim()
      })
      
      let noSaleCount = 0
      const bulanKey = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`
      
      for (const clean of Object.keys(dataCheckin)) {
        const dataPromotor = dataCheckin[clean]
        let sudahCheckinHariIni = false
        if (dataPromotor[hariIniKey] || dataPromotor.tanggalKey === hariIniKey) sudahCheckinHariIni = true
        
        if (sudahCheckinHariIni && !promotorDeal.has(clean)) {
          const namaAsli = mapNama[clean] || clean
          const pathRiwayat = `riwayatBulanan/${bulanKey}/${clean}`
          const snapR = await get(ref(db, pathRiwayat))
          const existing = snapR.exists() ? snapR.val() : { nama: namaAsli, lihat: 0, deal: 0, noSale: 0 }
          if (typeof existing.noSale !== 'number') existing.noSale = 0
          existing.noSale += 1
          existing.nama = namaAsli
          existing.lastUpdate = Date.now()
          existing.bulanKey = bulanKey
          await update(ref(db, pathRiwayat), existing)
          noSaleCount++
        }
      }
      
      await remove(ref(db, 'antrian'))
      await update(ref(db, 'setting'), { statusAntrian: 'BUKA' })
      
      alert(`Reset berhasil!\n✅ Antrian dikosongkan.\n⛔ ${noSaleCount} promotor tercatat No Sale.`)
      window.location.reload()
      
    } catch (err) {
      console.error(err)
      alert("Gagal reset total.")
    } finally {
      setIsResetting(false)
    }
  }

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8 flex justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white uppercase">Pengaturan Toko</h1>
            <p className="text-sm text-slate-400 uppercase">Identitas, Lokasi GPS, & Zona Bahaya</p>
          </div>
        </div>

        <form onSubmit={simpanPengaturan} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-2 block uppercase">Status Antrian Saat Ini</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setFormStatus('BUKA')} className={`py-3 rounded-xl font-bold text-sm transition-all border uppercase ${formStatus === 'BUKA' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>BUKA</button>
              <button type="button" onClick={() => setFormStatus('TUTUP')} className={`py-3 rounded-xl font-bold text-sm transition-all border uppercase ${formStatus === 'TUTUP' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>TUTUP</button>
            </div>
          </div>

          <hr className="border-slate-800" />

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-2 block uppercase">Nama Toko</label>
            <div className="relative">
              <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" value={formNamaToko} onChange={e => setFormNamaToko(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500 uppercase" placeholder="UFO KEBONSARI" required />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-2 block uppercase">Nama Sistem (Tampil di Login)</label>
            <div className="relative">
              <Type className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" value={formNamaSistem} onChange={e => setFormNamaSistem(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500 uppercase" placeholder="SISTEM ANTRIAN WALK-IN" required />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-2 block uppercase">URL Logo (Opsional)</label>
            <div className="relative">
              <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="url" value={formLogoUrl} onChange={e => setFormLogoUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500" placeholder="https://..." />
            </div>
          </div>

          <hr className="border-slate-800" />

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Koordinat Toko (GPS)</label>
              <button type="button" onClick={isiLokasiSaya} className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 uppercase">
                <Navigation className="w-3 h-3" /> Gunakan Lokasi Saya
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={formLat} onChange={e => setFormLat(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500 uppercase" placeholder="LATITUDE" />
              </div>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={formLng} onChange={e => setFormLng(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500 uppercase" placeholder="LONGITUDE" />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-slate-400 mb-1 block uppercase">Radius Maksimal (Meter)</label>
              <input type="number" value={formRadius} onChange={e => setFormRadius(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyan-500 uppercase" placeholder="50" min="10" max="1000" />
            </div>
            
            {formLat && formLng && (
              <div className="rounded-xl overflow-hidden border border-slate-700 mt-2">
                <MapComponent 
                  tokoLat={parseFloat(formLat) || 0} 
                  tokoLng={parseFloat(formLng) || 0} 
                  radius={parseInt(formRadius) || 50} 
                />
              </div>
            )}
            <p className="text-[10px] text-slate-500 mt-2 uppercase">Kosongkan Latitude & Longitude jika ingin mematikan GPS.</p>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button type="submit" disabled={isSaving} className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-cyan-500/20 uppercase">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>

        <div className="mt-8 bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <h3 className="text-lg font-bold text-red-400 uppercase">Zona Bahaya</h3>
          </div>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed uppercase">
            Tombol di bawah ini akan <strong>menghapus semua antrian hari ini</strong> dan mencatat <strong>No Sale otomatis</strong> untuk promotor yang sudah check-in tapi belum mendapatkan Deal. Tindakan ini tidak bisa dibatalkan.
          </p>
          <button 
            onClick={resetTotal}
            disabled={isResetting}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-red-500/20 disabled:opacity-50 uppercase"
          >
            {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
            {isResetting ? 'MEMPROSES RESET...' : 'RESET ANTRIAN (TUTUP BUKU HARI INI)'}
          </button>
        </div>

      </motion.div>
    </div>
  )
}