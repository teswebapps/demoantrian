'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, History, Settings, LogOut, ShieldAlert } from 'lucide-react'

type AdminSidebarProps = {
  activeMenu: 'dashboard' | 'aktivitas' | 'manajemen' | 'pengaturan'
  onLogout: () => void
}

export function AdminSidebar({ activeMenu, onLogout }: AdminSidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false)
    onLogout()
  }

  return (
    <>
      {/* SIDEBAR DESKTOP */}
      <aside className="w-64 bg-card border-r border-border flex-col hidden md:flex">
        <div className="p-5 flex items-center gap-3 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-md overflow-hidden border border-border p-1">
            <img src="/logo-ufo.png" alt="UFO Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-foreground uppercase">UFO Admin</h1>
            <p className="text-[9px] text-muted-foreground uppercase">Kebonsari</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1.5">
          <Link 
            href="/admin" 
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition text-xs ${activeMenu === 'dashboard' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          <Link 
            href="/admin/aktivitas" 
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition text-xs ${activeMenu === 'aktivitas' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <History className="w-4 h-4" /> Aktivitas & Rekap
          </Link>
          <Link 
            href="/admin/manajemen" 
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition text-xs ${activeMenu === 'manajemen' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <ShieldAlert className="w-4 h-4" /> Darurat
          </Link>
          <Link 
            href="/admin/pengaturan" 
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition text-xs ${activeMenu === 'pengaturan' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            <Settings className="w-4 h-4" /> Pengaturan
          </Link>
        </nav>

        <div className="p-3 border-t border-border">
          <button 
            onClick={() => setShowLogoutConfirm(true)} 
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition text-xs font-semibold shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </aside>

      {/* MODAL KONFIRMASI LOGOUT */}
      <AnimatePresence>
        {showLogoutConfirm && (
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
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-2xl text-xs font-bold uppercase tracking-wider transition"
                >
                  Batal
                </button>
                <button 
                  onClick={handleConfirmLogout}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md transition"
                >
                  Ya, Keluar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}