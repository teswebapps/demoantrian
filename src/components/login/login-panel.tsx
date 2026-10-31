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
      className="w-full rounded-[32px] bg-white/10 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/15 dark:border-slate-800/80 p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
    >
      {/* Garis Aksen Gradasi di Atas Card */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-600"></div>

      <h2 id="login-title" className="text-xl font-black text-white text-center">
        Selamat Datang
      </h2>
      <p className="mt-1 text-xs text-slate-300 text-center mb-6">
        Silakan masuk menggunakan akun Google yang sudah terdaftar.
      </p>

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-400 border border-rose-500/20">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* TOMBOL GOOGLE DENGAN EFEK TIMBUL 3D NYATA */}
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="group relative flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-white via-white to-slate-100 text-sm font-extrabold text-slate-900 border-t border-white shadow-[0_10px_25px_-3px_rgba(0,0,0,0.5),0_4px_6px_-2px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,1)] transition-all duration-150 ease-out hover:from-white hover:to-slate-50 hover:translate-y-[-2px] hover:shadow-[0_14px_30px_-3px_rgba(14,165,233,0.4),0_6px_8px_-2px_rgba(0,0,0,0.3)] active:translate-y-[1px] active:shadow-[0_4px_10px_rgba(0,0,0,0.4)] disabled:opacity-70 disabled:hover:translate-y-0"
      >
        {loading ? <Loader2 className="size-5 animate-spin text-slate-900" /> : <GoogleIcon className="size-5 drop-shadow-sm" />}
        {loading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}
      </button>

      <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
        <ShieldCheck className="size-4 text-cyan-400" aria-hidden="true" />
        {'Login aman · data hanya untuk keperluan antrian'}
      </div>
    </section>
  )
}