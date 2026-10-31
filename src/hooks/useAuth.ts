'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, User, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'

export interface UserData {
  uid: string
  email: string
  nama: string
  role: 'ADMIN' | 'PROMOTOR'
  tokoId: string
}

export function useAuth(requireRole?: 'ADMIN' | 'PROMOTOR') {
  // Ambil cache awal dari localStorage supaya tidak kedip/minta login saat baru buka aplikasi
  const [user, setUser] = useState<UserData | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('ufo_user_session')
      if (cached) {
        try { return JSON.parse(cached) } catch { return null }
      }
    }
    return null
  })
  
  const [loading, setLoading] = useState<boolean>(() => {
    // Jika sudah ada cache di localStorage, langsung set loading false agar tidak mutar-mutar
    if (typeof window !== 'undefined' && localStorage.getItem('ufo_user_session')) {
      return false
    }
    return true
  })

  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Pastikan persistensi login diatur ke LocalStorage agar tidak gampang logout sendiri
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error('Gagal set persistence:', err)
    })

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null)
        localStorage.removeItem('ufo_user_session')
        setLoading(false)
        if (requireRole) router.push('/')
        return
      }

      try {
        const email = firebaseUser.email
        if (!email) {
          await signOut(auth)
          localStorage.removeItem('ufo_user_session')
          setError('Email tidak ditemukan di akun Google.')
          setLoading(false)
          return
        }

        const emailKey = email.replace(/\./g, ',')
        const snap = await get(ref(db, 'users/whitelist/' + emailKey))

        if (!snap.exists()) {
          await signOut(auth)
          localStorage.removeItem('ufo_user_session')
          setError(`Email ${email} belum didaftarkan. Hubungi admin toko.`)
          setLoading(false)
          if (requireRole) router.push('/')
          return
        }

        const data = snap.val()
        const userData: UserData = {
          uid: firebaseUser.uid,
          email: email,
          nama: data.nama || firebaseUser.displayName || email,
          role: data.role || 'PROMOTOR',
          tokoId: data.tokoId || 'ufo-kebonsari',
        }

        if (requireRole && userData.role !== requireRole) {
          setError(`Anda tidak memiliki akses (butuh role: ${requireRole}).`)
          setLoading(false)
          if (userData.role === 'ADMIN') router.push('/admin')
          else router.push('/promotor')
          return
        }

        setUser(userData)
        // Simpan sesi ke localStorage agar awet meskipun ganti halaman atau minimize browser
        localStorage.setItem('ufo_user_session', JSON.stringify(userData))
        setError(null)
      } catch (err: any) {
        console.error('Auth error:', err)
        // Jika offline atau error jaringan sesaat, dan kita sudah punya cache user, biarkan tetap login
        if (!localStorage.getItem('ufo_user_session')) {
          setError(err.message || 'Terjadi kesalahan saat verifikasi akun.')
        }
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [requireRole, router])

  const logout = async () => {
    localStorage.removeItem('ufo_user_session')
    await signOut(auth)
    router.push('/')
  }

  return { user, loading, error, logout }
}