'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { Loader2 } from 'lucide-react'
import { auth, db } from '@/lib/firebase'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user?.email) {
        setChecking(false)
        return
      }
      try {
        const snap = await get(ref(db, 'users/whitelist/' + user.email.replace(/\./g, ',')))
        if (snap.exists()) {
          router.replace(snap.val().role === 'ADMIN' ? '/admin' : '/promotor')
          return // tetap tampilkan spinner sampai pindah halaman
        }
        await signOut(auth) // hanya logout kalau memang tidak terdaftar
      } catch (err) {
        console.error(err) // error jaringan: jangan logout, tampilkan form login
      }
      setChecking(false)
    })
    return () => unsub()
  }, [router])

  if (checking) {
    return (
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}