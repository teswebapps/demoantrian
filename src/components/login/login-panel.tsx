'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CircleAlert, Loader2 } from 'lucide-react'
import { GoogleIcon } from './google-icon'
import { signInWithPopup } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { auth, db, googleProvider } from '@/lib/firebase'

/* ===== GANTI NAMA DI SINI ===== */
const NAMA_TOKO = 'UFO KEBONSARI'
const NAMA_APLIKASI = 'Antrian Promotor'
/* ============================== */

export function LoginPanel() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    setError(null)
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user
      if (!user.email) throw new Error('Akun Google tidak mengirimkan email.')

      const emailKey = user.email.replace(/\./g, ',')
      const snap = await get(ref(db, 'users/whitelist/' + emailKey))

      if (!snap.exists()) {
        await auth.signOut()
        throw new Error(`Email (${user.email}) belum didaftarkan oleh admin.`)
      }

      const data = snap.val()

      // Hard redirect agar session Firebase siap sebelum pindah halaman
      if (data.role === 'ADMIN') window.location.href = '/admin'
      else if (data.role === 'PROMOTOR') window.location.href = '/promotor'
      else {
        await auth.signOut()
        throw new Error('Role akun tidak valid.')
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setLoading(false)
        return
      }
      setError(err.message || 'Login gagal. Coba lagi.')
      setLoading(false)
    }
  }

  return (
    <section className="w-full max-w-sm rounded-[28px] bg-card border border-border p-8 shadow-xl text-center">
      <div className="mx-auto size-[120px] overflow-hidden rounded-2xl shadow-md">
        <Image
          src="/logo-ufo.png"
          alt="UFO Elektronika"
          width={120}
          height={120}
          className="size-full object-cover"
          priority
        />
      </div>

      <p className="mt-5 text-xs font-extrabold tracking-[0.2em] text-muted-foreground uppercase">
        {NAMA_TOKO}
      </p>
      <p className="mt-1 text-base font-bold text-sky-500">{NAMA_APLIKASI}</p>

      <h1 className="mt-7 text-2xl font-black text-foreground">Selamat Datang</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Silakan login dengan akun Google Anda untuk mengakses antrian.
      </p>

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-left text-xs text-destructive border border-destructive/20">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-blue-700 to-cyan-600 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:brightness-110 active:scale-95 disabled:opacity-70"
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : <GoogleIcon className="size-5" />}
        {loading ? 'Menghubungkan...' : 'Login with Google'}
      </button>
    </section>
  )
}