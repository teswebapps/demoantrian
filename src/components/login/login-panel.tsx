'use client'

import { useState } from 'react'
import { CircleAlert, ShieldCheck, Loader2 } from 'lucide-react'
import { GoogleIcon } from './google-icon'
import { signInWithPopup } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { auth, db, googleProvider } from '@/lib/firebase'

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
    <section
      aria-labelledby="login-title"
      className="relative w-full overflow-hidden rounded-3xl bg-card border border-border p-6 md:p-8 shadow-xl"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-600" />

      <h2 id="login-title" className="text-xl font-black text-foreground text-center">
        Selamat Datang
      </h2>
      <p className="mt-1 mb-6 text-xs text-muted-foreground text-center">
        Silakan masuk menggunakan akun Google yang sudah terdaftar.
      </p>

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-white text-sm font-extrabold text-slate-900 border border-slate-300 dark:border-transparent shadow-lg transition-all hover:shadow-xl active:scale-95 disabled:opacity-70"
      >
        {loading ? <Loader2 className="size-5 animate-spin text-slate-900" /> : <GoogleIcon className="size-5" />}
        {loading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}
      </button>

      <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="size-4 text-cyan-500" aria-hidden="true" />
        {'Login aman · data hanya untuk keperluan antrian'}
      </div>
    </section>
  )
}