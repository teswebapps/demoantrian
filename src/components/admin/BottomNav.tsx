'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Activity, ShieldAlert, Settings } from 'lucide-react' // Tambah ShieldAlert

export function BottomNav() {
  const pathname = usePathname()

  const menus = [
    { name: 'Beranda', href: '/admin', icon: Home },
    { name: 'Aktivitas', href: '/admin/aktivitas', icon: Activity },
    { name: 'Darurat', href: '/admin/manajemen', icon: ShieldAlert }, // <--- MENU BARU
    { name: 'Pengaturan', href: '/admin/pengaturan', icon: Settings },
  ]

  return (
    // Warna menu bawah disesuaikan dengan tema gelap
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 flex justify-around items-center pb-safe pt-2 md:hidden">
      {menus.map((menu) => {
        const isActive = pathname === menu.href
        const Icon = menu.icon
        return (
          <Link key={menu.name} href={menu.href} className={`flex flex-col items-center gap-1 w-full py-2 ${isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Icon className={`w-6 h-6 ${isActive ? 'fill-cyan-400/20' : ''}`} />
            <span className="text-[10px] font-bold">{menu.name}</span>
          </Link>
        )
      })}
    </div>
  )
}