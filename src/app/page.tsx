'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { useRouter } from 'next/navigation'
import { Shield, AlertCircle, Loader2 } from 'lucide-react'
import { auth, db, googleProvider } from '@/lib/firebase'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  // Cek jika user sudah login sebelumnya, langsung lempar ke dashboard
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        try {
          const emailKey = user.email.replace(/\./g, ',')
          const snap = await get(ref(db, 'users/whitelist/' + emailKey))
          if (snap.exists()) {
            const data = snap.val()
            router.replace(data.role === 'ADMIN' ? '/admin' : '/promotor')
            return
          }
        } catch (e) {}
      }
      setCheckingSession(false)
    })
    return () => unsubscribe()
  }, [router])

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      if (!user.email) throw new Error('Akun Google tidak mengirimkan email.')

      const emailKey = user.email.replace(/\./g, ',')
      const snap = await get(ref(db, 'users/whitelist/' + emailKey))

      if (!snap.exists()) {
        await signOut(auth)
        throw new Error(`Email (${user.email}) belum didaftarkan. Hubungi atasan Anda.`)
      }

      const data = snap.val()
      if (data.role === 'ADMIN') router.push('/admin')
      else if (data.role === 'PROMOTOR') router.push('/promotor')
      else {
        await signOut(auth)
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

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 p-4">
      {/* Background Grid & Orbs */}
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: `linear-gradient(rgba(16,185,129,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.6) 1px, transparent 1px)`, backgroundSize: '50px 50px' }} />
      <div className="absolute w-96 h-96 bg-emerald-500 rounded-full blur-[120px] opacity-20 -top-20 -left-20" />
      <div className="absolute w-96 h-96 bg-sky-500 rounded-full blur-[120px] opacity-20 -bottom-20 -right-20" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-2xl">UFO</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Sistem Antrian</h1>
            <p className="text-sm text-slate-400">UFO Elektronika · Kebonsari</p>
          </div>

          <div className="mb-6 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-start gap-2">
            <Shield className="w-4 h-4 text-sky-400 mt-0.5" />
            <p className="text-xs text-slate-300">Login menggunakan akun Google yang <strong className="text-sky-400">sudah terdaftar</strong>.</p>
          </div>

          <motion.button onClick={handleLogin} disabled={loading} whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }} className="w-full py-4 px-5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center gap-3 font-bold text-sm shadow-lg disabled:opacity-60">
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> <span>Memproses...</span></>
            ) : (
              <>
                <svg viewBox="0 0 48 48" width="22" height="22">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>Lanjutkan dengan Google</span>
              </>
            )}
          </motion.button>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}