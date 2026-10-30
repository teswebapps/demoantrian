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
      // 1. Login Google via Firebase
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      if (!user.email) throw new Error('Akun Google tidak mengirimkan email.')

      // 2. Cek apakah email terdaftar sebagai ADMIN atau PROMOTOR
      const emailKey = user.email.replace(/\./g, ',')
      const snap = await get(ref(db, 'users/whitelist/' + emailKey))

      if (!snap.exists()) {
        await auth.signOut()
        throw new Error(`Email (${user.email}) belum didaftarkan oleh admin.`)
      }

      const data = snap.val()
      const role = data.role

      // 3. Arahkan ke halaman yang sesuai
      if (role === 'ADMIN') {
        router.push('/admin')
      } else if (role === 'PROMOTOR') {
        router.push('/promotor')
      } else {
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
      className="mt-8 rounded-[28px] bg-card border border-border p-6 shadow-2xl shadow-black/10 dark:shadow-black/40 backdrop-blur-xl relative overflow-hidden"
    >
      {/* Efek Gradien Tipis di Card */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-600"></div>

      <h2 id="login-title" className="text-xl font-black text-foreground text-center">
        Selamat Datang
      </h2>
      <p className="mt-2 text-sm text-muted-foreground text-center mb-6">
        Silakan masuk menggunakan akun Google yang sudah terdaftar.
      </p>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-2xl bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        aria-busy={loading}
        className="group relative flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white text-base font-bold text-slate-800 border border-slate-200 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-[0.98] disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin text-slate-800" />
        ) : (
          <GoogleIcon className="size-5" />
        )}
        {loading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}
      </button>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-cyan-500" aria-hidden="true" />
        {'Login aman · data hanya untuk keperluan antrian'}
      </div>
    </section>
  )
}