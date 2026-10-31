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
  // Ambil data cache dari localStorage
  const [user, setUser] = useState<UserData | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ufo_persistent_session')
        if (cached) return JSON.parse(cached)
      } catch (e) {
        console.error('Gagal baca persistent session:', e)
      }
    }
    return null
  })

  const [loading, setLoading] = useState<boolean>(() => {
    // Jika ada cache, langsung matikan loading agar halaman langsung terbuka
    if (typeof window !== 'undefined' && localStorage.getItem('ufo_persistent_session')) {
      return false
    }
    return true
  })

  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {})

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      const savedSession = localStorage.getItem('ufo_persistent_session')

      if (!firebaseUser) {
        // Jika Firebase mendeteksi null (misal habis clear apps), 
        // TAPI kita punya data email tersimpan di localStorage, kita coba verifikasi data tersebut
        if (savedSession) {
          try {
            const parsedUser: UserData = JSON.parse(savedSession)
            // Validasi ulang kilat ke database menggunakan email yang tersimpan
            const emailKey = parsedUser.email.replace(/\./g, ',')
            const snap = await get(ref(db, 'users/whitelist/' + emailKey))
            
            if (snap.exists()) {
              // Whitelist masih sah! Auto-login kan kembali usernya secara diam-diam
              setUser(parsedUser)
              setLoading(false)
              return
            }
          } catch (e) {
            console.error('Gagal memulihkan sesi dari storage:', e)
          }
        }

        // Kalau benar-benar belum pernah login atau data tidak valid
        setUser(null)
        setLoading(false)
        if (requireRole) router.push('/')
        return
      }

      try {
        const email = firebaseUser.email
        if (!email) {
          setLoading(false)
          return
        }

        const emailKey = email.replace(/\./g, ',')
        const snap = await get(ref(db, 'users/whitelist/' + emailKey))

        if (!snap.exists()) {
          if (!savedSession) {
            await signOut(auth)
            setUser(null)
            setError(`Email ${email} belum didaftarkan.`)
            setLoading(false)
            if (requireRole) router.push('/')
            return
          }
        }

        const data = snap.exists() ? snap.val() : {}
        const userData: UserData = {
          uid: firebaseUser.uid,
          email: email,
          nama: data.nama || firebaseUser.displayName || email,
          role: data.role || 'PROMOTOR',
          tokoId: data.tokoId || 'ufo-kebonsari',
        }

        if (requireRole && userData.role !== requireRole) {
          setError(`Akses ditolak (butuh role: ${requireRole}).`)
          setLoading(false)
          if (userData.role === 'ADMIN') router.push('/admin')
          else router.push('/promotor')
          return
        }

        setUser(userData)
        // Simpan sesi secara permanen ke localStorage agar tahan clear apps
        localStorage.setItem('ufo_persistent_session', JSON.stringify(userData))
        setError(null)
      } catch (err) {
        console.error('Auth error:', err)
        if (!savedSession) {
          setError('Gagal memverifikasi sesi.')
        }
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [requireRole, router])

  const logout = async () => {
    localStorage.removeItem('ufo_persistent_session')
    await signOut(auth)
    router.push('/')
  }

  return { user, loading, error, logout }
}