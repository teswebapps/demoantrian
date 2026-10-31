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
  // 1. Ambil langsung dari localStorage tanpa syarat
  const [user, setUser] = useState<UserData | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ufo_user_session')
        if (cached) return JSON.parse(cached)
      } catch (e) {
        console.error('Gagal baca cache:', e)
      }
    }
    return null
  })

  // 2. Jika sudah ada user di cache, loading langsung false! (Tidak ada jeda kedip/login)
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('ufo_user_session')) {
      return false
    }
    return true
  })

  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {})

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      // Jika firebaseUser null (misal baru buka aplikasi atau habis dari recent apps),
      // tapi kita PUNYA cache di localStorage, JANGAN KELUARKAN USER! Tetap pertahankan.
      const cachedData = localStorage.getItem('ufo_user_session')
      
      if (!firebaseUser) {
        if (cachedData) {
          // Abaikan sinyal null dari firebase, gunakan cache lokal yang ada
          setLoading(false)
          return
        }
        setUser(null)
        setLoading(false)
        if (requireRole) router.push('/')
        return
      }

      try {
        const email = firebaseUser.email
        if (!email) {
          if (!cachedData) {
            await signOut(auth)
            setUser(null)
          }
          setLoading(false)
          return
        }

        const emailKey = email.replace(/\./g, ',')
        const snap = await get(ref(db, 'users/whitelist/' + emailKey))

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
        } else if (cachedData) {
          // Kalau database gagal/offline tapi ada cache, pakai cache lama yang aman
          userData = JSON.parse(cachedData)
        } else {
          await signOut(auth)
          localStorage.removeItem('ufo_user_session')
          setError(`Email ${email} belum didaftarkan.`)
          setLoading(false)
          if (requireRole) router.push('/')
          return
        }

        if (requireRole && userData.role !== requireRole) {
          setError(`Akses ditolak (butuh role: ${requireRole}).`)
          setLoading(false)
          if (userData.role === 'ADMIN') router.push('/admin')
          else router.push('/promotor')
          return
        }

        setUser(userData)
        localStorage.setItem('ufo_user_session', JSON.stringify(userData))
        setError(null)
      } catch (err) {
        console.error('Auth sync error:', err)
        // Jika error jaringan saat buka ulang, dan ada cache, tetap biarkan login
        if (!localStorage.getItem('ufo_user_session')) {
          setError('Gagal memverifikasi sesi.')
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