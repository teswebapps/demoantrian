'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleAlert, ShieldCheck, Loader2 } from 'lucide-react'
import { GoogleIcon } from './google-icon'
import { signInWithPopup } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { auth, db, googleProvider } from '@/lib/firebase'

export function LoginPanel() {
  const router = useRouter()
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
      if (data.role === 'ADMIN') router.push('/admin')
      else if (data.role === 'PROMOTOR') router.push('/promotor')
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
    <section
      aria-labelledby="login-title"
      className="w-full rounded-[24px] bg-card border border-border p-5 shadow-2xl shadow-black/5 dark:shadow-black/40 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-600"></div>

      <h2 id="login-title" className="text-lg font-black text-foreground text-center">
        Selamat Datang
      </h2>
      <p className="mt-1 text-xs text-muted-foreground text-center mb-5">
        Silakan masuk menggunakan akun Google yang sudah terdaftar.
      </p>

      {error && (
        <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive border border-destructive/20">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* TOMBOL GOOGLE 3D EFFECT */}
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-slate-800 border border-slate-200 
        shadow-[0_4px_0_0_#e2e8f0] transition-all duration-150 ease-out
        hover:translate-y-[2px] hover:shadow-[0_2px_0_0_#e2e8f0]
        active:translate-y-[4px] active:shadow-none
        disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_0_0_#e2e8f0]"
      >
        {loading ? <Loader2 className="size-4 animate-spin text-slate-800" /> : <GoogleIcon className="size-4" />}
        {loading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}
      </button>

      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
        <ShieldCheck className="size-3.5 text-cyan-500" aria-hidden="true" />
        {'Login aman · data hanya untuk keperluan antrian'}
      </div>
    </section>
  )
}