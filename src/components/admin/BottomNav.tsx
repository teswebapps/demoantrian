'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Activity, ShieldAlert, Settings, LogOut, Loader2, Smartphone } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { motion, AnimatePresence } from 'framer-motion'

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [showLogout, setShowLogout] = useState(false)
  const [loading, setLoading] = useState(false)

  const menus = [
    { name: 'Beranda', href: '/admin', icon: Home },
    { name: 'Aktivitas', href: '/admin/aktivitas', icon: Activity },
    { name: 'Antrian', href: '/admin/manajemen', icon: ShieldAlert },
    { name: 'Pengaturan', href: '/admin/pengaturan', icon: Settings },
    { name: 'Bantu', href: '/admin/bantu-promotor', icon: Smartphone },
  ]

  const handleLogout = async () => {
    setLoading(true)
    try {
      localStorage.removeItem('ufo_user_session')
      await signOut(auth)
      router.push('/')
    } catch (error) {
      console.error('Gagal logout:', error)
      setLoading(false)
      setShowLogout(false)
    }
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border flex justify-around items-center py-2.5 px-1.5 md:hidden shadow-2xl transition-colors duration-300">
        {menus.map((menu) => {
          const isActive = pathname === menu.href || (menu.href !== '/admin' && pathname.startsWith(menu.href))
          const Icon = menu.icon
          return (
            <Link
              key={menu.name}
              href={menu.href}
              className={`min-w-0 flex flex-col items-center justify-center gap-1 flex-1 py-1 px-0.5 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-primary font-extrabold scale-105'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-primary/15 text-primary' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight truncate max-w-full">{menu.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* MODAL POP-UP SESUAI TEMA */}
      <AnimatePresence>
        {showLogout && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:hidden">
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
                  disabled={loading}
                  className="flex-1 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-2xl text-xs font-bold uppercase tracking-wider transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loading}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ya, Keluar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}