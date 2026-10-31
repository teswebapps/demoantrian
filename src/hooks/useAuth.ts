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
  // 1. Ambil langsung dari localStorage saat pertama kali render (Anti Kedip / Anti Minta Login)
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

  // 2. Jika ada cache, loading langsung false! Tidak ada jeda mutar-mutar.
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
      const cachedData = localStorage.getItem('ufo_user_session')

      // Jika firebaseUser sempat bernilai null (biasanya terjadi saat habis minimize lama / wake up),
      // TAPI kita punya cache lokal yang sah, ABAIKAN null tersebut agar user tidak tertendang!
      if (!firebaseUser) {
        if (cachedData) {
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
          // Fallback aman jika database telat merespons saat bangun dari minimize
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
        console.error('Auth error saat wake up:', err)
        // Jika offline atau jaringan lambat saat dibuka dari minimize, tetap pakai cache lama yang aman
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