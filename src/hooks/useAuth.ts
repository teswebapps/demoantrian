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
  // Langsung ambil dari localStorage sejak render pertama kali agar tidak pernah bernilai null sesaat
  const [user, setUser] = useState<UserData | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ufo_user_session')
        if (cached) return JSON.parse(cached)
      } catch (e) {
        console.error('Gagal baca cache session:', e)
      }
    }
    return null
  })

  // Jika sudah ada data di state awal, loading langsung false! Tidak ada jeda kedip.
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('ufo_user_session')) {
      return false
    }
    return true
  })

  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Pastikan persistensi terkunci di browser
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error('Gagal set persistence:', err)
    })

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        // Cek dulu: apakah kita punya cache valid? Kalau HP baru bangun tidur (sleep),
        // kadang onAuthStateChanged mendeteksi null sesaat sebelum Firebase merestorasi tokennya.
        const currentCache = localStorage.getItem('ufo_user_session')
        if (currentCache) {
          // Abaikan sinyal null sesaat akibat bangun dari sleep jika cache lokal masih ada
          setLoading(false)
          return
        }

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
          // Jika tidak terdaftar di whitelist
          const localData = localStorage.getItem('ufo_user_session')
          if (!localData) {
            await signOut(auth)
            localStorage.removeItem('ufo_user_session')
            setError(`Email ${email} belum didaftarkan. Hubungi admin toko.`)
            setLoading(false)
            if (requireRole) router.push('/')
            return
          }
        }

        let userData: UserData
        if (snap.exists()) {
          const data = snap.val()
          userData = {
            uid: firebaseUser.uid,
            email: email,
            nama: data.nama || firebaseUser.displayName || email,
            role: data.role || 'PROMOTOR',
            tokoId: data.tokoId || 'ufo-kebonsari',
          }
        } else {
          // Fallback aman jika database telat merespons saat bangun dari sleep
          const parsed = JSON.parse(localStorage.getItem('ufo_user_session') || '{}')
          userData = parsed.uid ? parsed : {
            uid: firebaseUser.uid,
            email: email,
            nama: firebaseUser.displayName || email,
            role: 'PROMOTOR',
            tokoId: 'ufo-kebonsari'
          }
        }

        if (requireRole && userData.role !== requireRole) {
          setError(`Anda tidak memiliki akses (butuh role: ${requireRole}).`)
          setLoading(false)
          if (userData.role === 'ADMIN') router.push('/admin')
          else router.push('/promotor')
          return
        }

        setUser(userData)
        localStorage.setItem('ufo_user_session', JSON.stringify(userData))
        setError(null)
      } catch (err: any) {
        console.error('Auth error saat wake up:', err)
        // Jika offline atau gangguan saat HP bangun dari sleep, tetap pertahankan user yang ada di cache
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