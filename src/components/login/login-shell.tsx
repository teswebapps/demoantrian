'use client'

import { useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { AuthGate } from './auth-gate'

export function LoginShell({ children }: { children: React.ReactNode }) {
  const { isDark, toggleTheme, mounted } = useTheme()

  // Kunci scroll halaman login, dilepas saat pindah halaman
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])

  return (
    <div
      className={`fixed inset-0 h-[100dvh] overflow-hidden bg-slate-100 dark:bg-background text-foreground flex flex-col transition-opacity duration-200 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Ganti tema"
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 flex size-11 items-center justify-center rounded-full bg-card border border-border text-amber-500 shadow-sm transition active:scale-95"
      >
        {mounted && isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </button>

      <AuthGate>{children}</AuthGate>
    </div>
  )
}