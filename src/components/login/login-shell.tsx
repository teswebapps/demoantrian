'use client'

import { useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { AuthGate } from './auth-gate'

export function LoginShell({ children }: { children: React.ReactNode }) {
  const { isDark, toggleTheme, mounted } = useTheme()

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
    <div className="fixed inset-0 h-[100dvh] overflow-hidden bg-[#fafafa] dark:bg-background text-foreground flex items-center justify-center p-5 font-sans">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Ganti tema"
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 flex size-10 items-center justify-center rounded-full bg-white dark:bg-card border border-[#e5e7eb] dark:border-border text-slate-700 dark:text-amber-400 shadow-sm transition active:scale-95"
      >
        {mounted && isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>

      <AuthGate>{children}</AuthGate>
    </div>
  )
}