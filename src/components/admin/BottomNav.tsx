'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Activity, ShieldAlert, Settings } from 'lucide-react'

export function BottomNav() {
  const pathname = usePathname()

  const menus = [
    { name: 'Beranda', href: '/admin', icon: Home },
    { name: 'Aktivitas', href: '/admin/aktivitas', icon: Activity },
    { name: 'Darurat', href: '/admin/manajemen', icon: ShieldAlert },
    { name: 'Pengaturan', href: '/admin/pengaturan', icon: Settings },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex justify-around items-center pb-safe pt-2 md:hidden shadow-lg transition-colors duration-300">
      {menus.map((menu) => {
        const isActive = pathname === menu.href
        const Icon = menu.icon
        return (
          <Link key={menu.name} href={menu.href} className={`flex flex-col items-center gap-1 w-full py-2 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon className={`w-5 h-5 ${isActive ? 'fill-primary/20' : ''}`} />
            <span className="text-[10px] font-bold">{menu.name}</span>
          </Link>
        )
      })}
    </div>
  )
}