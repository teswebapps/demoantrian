'use client'

import { useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { AuthGate } from './auth-gate'

export function LoginShell({ children }: { children: React.ReactNode }) {
  const { isDark, toggleTheme, mounted } = useTheme()

  // Kunci scroll halaman login (terang maupun gelap), dilepas saat pindah halaman
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
      className={`fixed inset-0 h-[100dvh] overflow-hidden bg-background text-foreground flex flex-col transition-opacity duration-200 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Latar: cahaya lembut + grid halus */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[40%] left-[20%] w-[600px] h-[600px] rounded-full bg-cyan-500/15 dark:bg-cyan-500/20 blur-[120px]" />
        <div className="absolute -bottom-[30%] right-[10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 dark:bg-blue-600/20 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(148_163_184/0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgb(148_163_184/0.12)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* Tombol tema */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Ganti tema"
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 flex size-11 items-center justify-center rounded-full bg-secondary text-amber-400 transition-colors hover:bg-secondary/70 active:scale-95"
      >
        {mounted && isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </button>

      <AuthGate>{children}</AuthGate>
    </div>
  )
}