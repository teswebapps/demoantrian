'use client'

import { useState, useEffect } from 'react'
import { CircleAlert, Loader2 } from 'lucide-react'
import { GoogleIcon } from './google-icon'
import { signInWithPopup, signInWithRedirect, onAuthStateChanged } from 'firebase/auth'
import { ref, get, onValue } from 'firebase/database'
import { auth, db, googleProvider } from '@/lib/firebase'

const DEFAULT_NAMA_TOKO = process.env.NEXT_PUBLIC_NAMA_TOKO || 'TOKO'
const DEFAULT_NAMA_APLIKASI = process.env.NEXT_PUBLIC_NAMA_SISTEM || 'Antrian Promotor'
const DEFAULT_TOKO_ID = process.env.NEXT_PUBLIC_TOKO_ID || 'ufo-kebonsari'

export function LoginPanel() {
  const [loading, setLoading] = useState(false)
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
        const val = snap.val()
        setNamaAplikasi(typeof val === 'string' && val.trim() ? val.trim() : DEFAULT_NAMA_APLIKASI)
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
        Login dengan email Google untuk akses Antrian
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
        disabled={loading}
        className="flex h-[44px] w-full items-center justify-center gap-2.5 rounded-[8px] bg-[#111827] px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#1f2937] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin text-white" />
        ) : (
          <GoogleIcon className="size-[18px] shrink-0" />
        )}
        <span>{loading ? 'Menghubungkan...' : 'Sign in with Google'}</span>
      </button>
    </section>
  )
}