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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border flex justify-around items-center py-2.5 px-2 md:hidden shadow-2xl transition-colors duration-300">
      {menus.map((menu) => {
        const isActive = pathname === menu.href
        const Icon = menu.icon
        return (
          <Link 
            key={menu.name} 
            href={menu.href} 
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-2xl transition-all duration-200 ${
              isActive 
                ? 'text-primary font-extrabold scale-105' 
                : 'text-muted-foreground hover:text-foreground font-medium'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-primary/15 text-primary' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">{menu.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}