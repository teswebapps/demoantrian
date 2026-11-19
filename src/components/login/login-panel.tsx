'use client'

import { useState, useEffect } from 'react'
import { CircleAlert, Loader2 } from 'lucide-react'
import { GoogleIcon } from './google-icon'
import { signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { ref, get, onValue } from 'firebase/database'
import { auth, db, googleProvider } from '@/lib/firebase'

const DEFAULT_NAMA_TOKO = 'UFO KEBONSARI'
const DEFAULT_NAMA_APLIKASI = 'Antrian Promotor'
const TOKO_ID = 'ufo-kebonsari'

export function LoginPanel() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [namaToko, setNamaToko] = useState(DEFAULT_NAMA_TOKO)
  const [namaAplikasi, setNamaAplikasi] = useState(DEFAULT_NAMA_APLIKASI)

  useEffect(() => {
    const unsubToko = onValue(
      ref(db, `toko/${TOKO_ID}/setting/namaToko`),
      (snap) => setNamaToko(snap.val() || DEFAULT_NAMA_TOKO),
      () => {}
    )
    const unsubSistem = onValue(
      ref(db, `toko/${TOKO_ID}/setting/namaSistem`),
      (snap) => setNamaAplikasi(snap.val() || DEFAULT_NAMA_APLIKASI),
      () => {}
    )
    return () => {
      unsubToko()
      unsubSistem()
    }
  }, [])

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

  return (
    <section
      aria-label={`${namaToko} - ${namaAplikasi}`}
      className="w-full max-w-[430px] rounded-[12px] bg-white border border-[#e5e7eb] p-8 shadow-[0_4px_16px_rgba(15,23,42,0.05)] text-left"
    >
      <h1 className="m-0 mb-1.5 text-[24px] font-bold tracking-[-0.02em] text-[#111827]">
        Dashboard Promotor
      </h1>
      <p className="m-0 mb-6 text-[14px] leading-normal text-[#6b7280] sm:whitespace-nowrap">
        Login dengan email Google untuk akses Dashboard
      </p>

      {error && (
        <div
          role="alert"
          className="mb-[18px] flex items-start gap-2 rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-[13px] leading-[1.45] text-[#dc2626]"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="flex h-[42px] w-full items-center justify-center gap-2.5 rounded-[8px] bg-[#111827] text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#1f2937] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin text-white" />
        ) : (
          <GoogleIcon className="size-[18px]" />
        )}
        <span>{loading ? 'Menghubungkan...' : 'Sign in with Google'}</span>
      </button>
    </section>
  )
}