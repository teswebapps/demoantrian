'use client'

import { useState, useEffect } from 'react'
import { CircleAlert, Loader2, Rocket } from 'lucide-react'
import { GoogleIcon } from './google-icon'
import { signInWithPopup, signInWithRedirect, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'
import { ref, get, onValue } from 'firebase/database'
import { auth, db, googleProvider } from '@/lib/firebase'

const DEFAULT_NAMA_TOKO = process.env.NEXT_PUBLIC_NAMA_TOKO || 'TOKO'
const DEFAULT_NAMA_APLIKASI = process.env.NEXT_PUBLIC_NAMA_SISTEM || 'Antrian Walk-In Promotor'
const DEFAULT_TOKO_ID = process.env.NEXT_PUBLIC_TOKO_ID || 'ufo-kebonsari'

const formatTampilanJudul = (raw?: string | null) => {
  const cleaned = String(raw || '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return DEFAULT_NAMA_APLIKASI

  return cleaned
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (word === 'walk-in') return 'Walk-In'
      if (['gps', 'nfc', 'qr', 'pos', 'erp', 'id'].includes(word)) return word.toUpperCase()
      return word
        .split('-')
        .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
        .join('-')
    })
    .join(' ')
}

export function LoginPanel() {
  const [loading, setLoading] = useState(false)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [namaToko, setNamaToko] = useState(DEFAULT_NAMA_TOKO)
  const [namaAplikasi, setNamaAplikasi] = useState(DEFAULT_NAMA_APLIKASI)
  const [tokoId, setTokoId] = useState(DEFAULT_TOKO_ID)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser?.email) return
      try {
        const emailKey = currentUser.email.trim().toLowerCase().replace(/\./g, ',')
        const snap = await get(ref(db, 'users/whitelist/' + emailKey))
        if (snap.exists() && snap.val()?.tokoId) {
          setTokoId(String(snap.val().tokoId))
        }
      } catch {
        // Abaikan error baca awal saat belum login
      }
    })
    return () => unsubAuth()
  }, [])

  useEffect(() => {
    const unsubToko = onValue(
      ref(db, `toko/${tokoId}/setting/namaToko`),
      (snap) => {
        const val = snap.val()
        setNamaToko(typeof val === 'string' && val.trim() ? val.trim() : DEFAULT_NAMA_TOKO)
      },
      () => {}
    )
    const unsubSistem = onValue(
      ref(db, `toko/${tokoId}/setting/namaSistem`),
      (snap) => {
        setNamaAplikasi(formatTampilanJudul(snap.val()))
      },
      () => {}
    )
    return () => {
      unsubToko()
      unsubSistem()
    }
  }, [tokoId])

  async function handleLogin() {
    setError(null)
    setLoading(true)
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' })
      let result: any
      try {
        result = await signInWithPopup(auth, googleProvider)
      } catch (err: any) {
        if (
          err.code === 'auth/popup-blocked' ||
          err.code === 'auth/operation-not-supported-in-this-environment'
        ) {
          await signInWithRedirect(auth, googleProvider)
          return
        }
        throw err
      }

      const user = result?.user
      if (!user?.email) throw new Error('Akun Google tidak mengirimkan email.')

      const emailKey = user.email.trim().toLowerCase().replace(/\./g, ',')
      const snap = await get(ref(db, 'users/whitelist/' + emailKey))

      if (!snap.exists()) {
        await auth.signOut()
        throw new Error(`Email (${user.email}) belum didaftarkan oleh admin.`)
      }

      const data = snap.val()
      if (data?.tokoId) {
        setTokoId(String(data.tokoId))
      }

      if (data.role === 'ADMIN') {
        window.location.href = '/admin'
        return
      }
      if (data.role === 'PROMOTOR') {
        window.location.href = '/promotor'
        return
      }

      await auth.signOut()
      throw new Error('Role akun tidak valid.')
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setLoading(false)
        return
      }
      setError(err.message || 'Login gagal. Coba lagi.')
      setLoading(false)
    }
  }

  // ✅ FUNGSI BARU: Login otomatis sebagai akun demo
  async function handleDemoLogin() {
    setError(null)
    setLoadingDemo(true)
    try {
      // Login otomatis dengan akun demo yang sudah terdaftar di Firebase
      await signInWithEmailAndPassword(auth, 'demo@antrian.com', 'demo123456')
      // Arahkan ke halaman promotor
      window.location.href = '/promotor'
    } catch (err: any) {
      console.error(err)
      setError('Gagal masuk ke mode demo. Pastikan akun demo sudah dibuat di Firebase.')
      setLoadingDemo(false)
    }
  }

  return (
    <section
      aria-label={`${namaToko} - ${namaAplikasi}`}
      className="w-full max-w-[420px] rounded-[14px] bg-white border border-[#e5e7eb] px-6 py-7 sm:p-8 shadow-[0_4px_16px_rgba(15,23,42,0.05)] text-center"
    >
      <p className="m-0 mb-1.5 text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.06em] text-[#4b5563]">
        {namaToko}
      </p>
      <h1 className="m-0 mb-2 text-[20px] sm:text-[22px] font-bold leading-[1.25] tracking-[-0.02em] text-[#111827]">
        {namaAplikasi}
      </h1>
      <p className="m-0 mb-6 text-[13px] sm:text-[14px] leading-[1.5] text-[#6b7280]">
        Login dengan Google atau coba demo
      </p>

      {error && (
        <div
          role="alert"
          className="mb-[18px] flex items-start gap-2 rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-left text-[13px] leading-[1.45] text-[#dc2626]"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleLogin}
        disabled={loading || loadingDemo}
        className="flex h-[44px] w-full items-center justify-center gap-2.5 rounded-[8px] bg-[#111827] px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#1f2937] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin text-white" />
        ) : (
          <GoogleIcon className="size-[18px] shrink-0" />
        )}
        <span>{loading ? 'Menghubungkan...' : 'Sign in with Google'}</span>
      </button>

      {/* ✅ TOMBOL BARU: Coba Demo */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-gray-400">atau</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDemoLogin}
        disabled={loading || loadingDemo}
        className="flex h-[44px] w-full items-center justify-center gap-2.5 rounded-[8px] bg-emerald-600 px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loadingDemo ? (
          <Loader2 className="size-4 animate-spin text-white" />
        ) : (
          <Rocket className="size-[18px] shrink-0" />
        )}
        <span>{loadingDemo ? 'Menyiapkan Demo...' : 'Coba Demo Tanpa Login'}</span>
      </button>
    </section>
  )
}