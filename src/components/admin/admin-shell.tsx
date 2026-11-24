'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, History, ShieldAlert, Settings, LogOut, Smartphone } from 'lucide-react'
import { ref, onValue } from 'firebase/database'
import { db } from '@/lib/firebase'
import { AppHeader } from '@/components/queue/app-header'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/aktivitas', label: 'Aktivitas', icon: History },
  { href: '/admin/manajemen', label: 'Antrian', icon: ShieldAlert },
  { href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
  { href: '/admin/bantu-promotor', label: 'Bantu', icon: Smartphone },
]

interface AdminShellProps {
  children: React.ReactNode
  isDark: boolean
  onToggleTheme: () => void
  onLogout: () => void | Promise<void>
  tokoId?: string
}

export function AdminShell({ children, isDark, onToggleTheme, onLogout, tokoId = 'ufo-kebonsari' }: AdminShellProps) {
  const pathname = usePathname()
  const [showLogout, setShowLogout] = useState(false)
  const [isOpen, setIsOpen] = useState<boolean | null>(null) // null = belum selesai dimuat

  // Status buka/tutup antrian diambil dari pengaturan toko
  useEffect(() => {
    const unsub = onValue(
      ref(db, `toko/${tokoId}/setting/statusAntrian`),
      (snap) => {
        setIsOpen(snap.val() !== 'TUTUP')
      },
      () => setIsOpen(true)
    )
    return () => unsub()
  }, [tokoId])

  // Samakan class "dark" di <html> dengan tema (sama seperti halaman promotor)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col bg-background relative overflow-x-clip">
      <AppHeader
        storeName="demo toko"
        isOpen={isOpen !== false}
        statusLoading={isOpen === null}
        onLogout={() => setShowLogout(true)}
        showLogout={true}
        onToggleTheme={onToggleTheme}
        isDark={isDark}
      />

      <main className="flex-1 px-4 pt-4 pb-28 space-y-6">{children}</main>

      {/* BOTTOM NAV */}
      <nav aria-label="Navigasi Admin" className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-2xl grid grid-cols-5 gap-0.5 sm:gap-1 px-1.5 sm:px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(href) || (href === '/admin/aktivitas' && pathname.startsWith('/admin/total-bulanan'))
            return (
              <Link
                key={href}
                href={href}
                className={`min-w-0 flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2 px-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight sm:tracking-wide transition ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="truncate max-w-full">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* KONFIRMASI KELUAR */}
      <AnimatePresence>
        {showLogout && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card text-foreground border border-border w-full max-w-sm p-6 rounded-3xl shadow-2xl text-center space-y-5"
            >
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <LogOut className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">KELUAR APLIKASI</h3>
                <p className="text-xs text-muted-foreground">Apakah Anda yakin ingin keluar dari sesi admin?</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogout(false)}
                  className="flex-1 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-2xl text-xs font-bold uppercase tracking-wider transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowLogout(false)
                    await onLogout()
                  }}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md transition"
                >
                  Ya, Keluar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}