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
        const emailKey = user.email.trim().toLowerCase().replace(/\./g, ',')
        const snap = await get(ref(db, 'users/whitelist/' + emailKey))
        if (snap.exists()) {
          const role = snap.val()?.role
          if (role === 'ADMIN' || role === 'PROMOTOR') {
            router.replace(role === 'ADMIN' ? '/admin' : '/promotor')
            return
          }
        }
        await signOut(auth)
      } catch (err) {
        console.error(err)
      }
      setChecking(false)
    })
    return () => unsub()
  }, [router])

  if (checking) {
    return (
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#111827] animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}