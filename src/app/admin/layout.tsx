import { BottomNav } from '@/components/admin/BottomNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen pb-20 md:pb-0 bg-slate-950 text-white">
      {children}
      <BottomNav />
    </div>
  )
}