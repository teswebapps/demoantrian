'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, User, signOut } from 'firebase/auth'
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
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        if (requireRole) router.push('/')
        return
      }

      try {
        const email = firebaseUser.email
        if (!email) {
          await signOut(auth)
          setError('Email tidak ditemukan di akun Google.')
          setLoading(false)
          return
        }

        const emailKey = email.replace(/\./g, ',')
        const snap = await get(ref(db, 'users/whitelist/' + emailKey))

        if (!snap.exists()) {
          await signOut(auth)
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
        setError(null)
      } catch (err: any) {
        console.error('Auth error:', err)
        setError(err.message || 'Terjadi kesalahan saat verifikasi akun.')
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [requireRole, router])

  const logout = async () => {
    await signOut(auth)
    router.push('/')
  }

  return { user, loading, error, logout }
}