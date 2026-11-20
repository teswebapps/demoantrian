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

const SESSION_KEY = 'ufo_user_session'

function readCachedSession(): UserData | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(SESSION_KEY)
    if (!cached) return null
    return JSON.parse(cached) as UserData
  } catch (e) {
    console.error('Gagal baca cache session:', e)
    return null
  }
}

export function useAuth(requireRole?: 'ADMIN' | 'PROMOTOR') {
  // 1. Ambil session langsung dari localStorage agar langsung dikenali sejak milidetik pertama
  const [user, setUser] = useState<UserData | null>(() => readCachedSession())

  // 2. Jika ada cache tersimpan, matikan status loading seketika (tidak ada jeda kedip/login)
  const [loading, setLoading] = useState<boolean>(() => readCachedSession() === null)

  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let active = true
    setPersistence(auth, browserLocalPersistence).catch(() => {})

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!active) return
      const cachedData = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null

      // Jika karena minimize lama lalu Firebase sempat mengirim sinyal null sesaat,
      // tapi kita PUNYA data di cache lokal, JANGAN TENDANG USER! Pertahankan sesinya.
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
            if (active) setUser(null)
          }
          if (active) setLoading(false)
          return
        }

        const emailKey = email.replace(/\./g, ',')
        const snap = await get(ref(db, 'users/whitelist/' + emailKey))
        if (!active) return

        let userData: UserData
        if (snap.exists()) {
          const data = snap.val()
          userData = {
            uid: firebaseUser.uid,
            email,
            nama: data.nama || firebaseUser.displayName || email,
            role: data.role === 'ADMIN' ? 'ADMIN' : 'PROMOTOR',
            tokoId: data.tokoId || 'ufo-kebonsari',
          }

          if (requireRole && userData.role !== requireRole) {
            setError(`Akses ditolak untuk role ${userData.role}.`)
            setUser(userData)
            localStorage.setItem(SESSION_KEY, JSON.stringify(userData))
            setLoading(false)
            return
          }
        } else if (cachedData) {
          // Fallback darurat jika koneksi lambat saat dibuka dari minimize
          userData = JSON.parse(cachedData) as UserData
        } else {
          await signOut(auth)
          if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY)
          if (!active) return
          setError(`Email ${email} belum didaftarkan.`)
          setLoading(false)
          if (requireRole) router.push('/')
          return
        }

        setUser(userData)
        if (typeof window !== 'undefined') {
          localStorage.setItem(SESSION_KEY, JSON.stringify(userData))
        }
        setError(null)
      } catch (err) {
        console.error('Auth error saat wake up:', err)
        if (active && !(typeof window !== 'undefined' && localStorage.getItem(SESSION_KEY))) {
          setError('Gagal memverifikasi sesi.')
        }
      } finally {
        if (active) setLoading(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [requireRole, router])

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY)
    }
    await signOut(auth)
    router.push('/')
  }

  return { user, loading, error, logout }
}