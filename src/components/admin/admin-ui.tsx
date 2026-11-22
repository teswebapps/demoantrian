import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export const MosqueIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2.5v2" />
    <path d="M12 4.5c-3.6 2-5.5 4.2-5.5 6.5h11c0-2.3-1.9-4.5-5.5-6.5Z" />
    <path d="M4.5 11h15" />
    <path d="M5.5 11v10h13V11" />
    <path d="M19.5 8.5v12.5" />
    <path d="M19.5 6.5a1.5 1.5 0 0 1 0 3" />
    <path d="M10 21v-4.5a2 2 0 0 1 4 0V21" />
    <path d="M2.5 21h19" />
  </svg>
)

export type AdminTone = 'primary' | 'emerald' | 'amber' | 'cyan' | 'rose' | 'purple' | 'blue'

const SOLID_ICON_TONES: Record<AdminTone, string> = {
  primary: 'bg-blue-600 text-white dark:bg-primary/15 dark:text-primary',
  blue: 'bg-blue-600 text-white dark:bg-primary/15 dark:text-primary',
  emerald: 'bg-emerald-600 text-white dark:bg-emerald-500/15 dark:text-emerald-400',
  amber: 'bg-amber-500 text-white dark:bg-amber-500/15 dark:text-amber-400',
  cyan: 'bg-sky-600 text-white dark:bg-cyan-500/15 dark:text-cyan-400',
  rose: 'bg-rose-600 text-white dark:bg-rose-500/15 dark:text-rose-400',
  purple: 'bg-purple-600 text-white dark:bg-purple-500/15 dark:text-purple-400',
}

/* ===== KARTU BAGIAN (gaya sama dengan kartu di halaman promotor) ===== */
export function SectionCard({
  icon,
  tone = 'primary',
  title,
  subtitle,
  children,
}: {
  icon: ReactNode
  tone?: AdminTone
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="bg-card border border-border p-5 rounded-3xl shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${SOLID_ICON_TONES[tone]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-wide text-foreground truncate">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

/* ===== BARIS MENU DETAIL (background icon solid di mode terang) ===== */
export function MenuRow({
  icon,
  tone = 'primary',
  title,
  desc,
  onClick,
  href,
}: {
  icon: ReactNode
  tone?: AdminTone
  title: string
  desc: string
  onClick?: () => void
  href?: string
}) {
  const inner = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${SOLID_ICON_TONES[tone]}`}>
          {icon}
        </div>
        <div className="text-left min-w-0">
          <h4 className="text-xs font-black uppercase tracking-wide text-foreground truncate">{title}</h4>
          <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </>
  )
  const cls =
    'w-full bg-card border border-border/80 rounded-2xl p-4 flex items-center justify-between gap-2 shadow-sm transition hover:bg-secondary/60'
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

/* ===== KOTAK ANGKA BESAR ===== */
export function StatTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: 'cyan' | 'purple' | 'blue' | 'amber'
}) {
  const tones: Record<string, string> = {
    cyan: 'text-sky-600 dark:text-cyan-400',
    purple: 'text-purple-600 dark:text-purple-400',
    blue: 'text-blue-600 dark:text-blue-400',
    amber: 'text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="bg-card border border-border rounded-3xl p-4 text-center shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-4xl font-black tracking-tighter mt-1 tabular-nums ${tones[tone]}`}>{value}</p>
    </div>
  )
}

/* ===== INPUT ===== */
export const inputCls =
  'w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50'

/* ===== TOMBOL (font hitam seragam di mode terang) ===== */
const base =
  'w-full py-4 font-black rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50 text-sm'

export const btn = {
  cyan: `${base} bg-cyan-500 text-slate-950 dark:text-slate-950 shadow-cyan-500/30 hover:bg-cyan-400`,
  emerald: `${base} bg-emerald-500 text-slate-950 dark:text-white shadow-emerald-500/30 hover:bg-emerald-400`,
  amber: `${base} bg-amber-500 text-slate-950 dark:text-white shadow-amber-500/30 hover:bg-amber-400`,
  rose: `${base} bg-rose-600 text-slate-950 dark:text-white shadow-rose-500/30 hover:bg-rose-500`,
  purple: `${base} bg-purple-600 text-slate-950 dark:text-white shadow-purple-500/30 hover:bg-purple-500`,
  blue: `${base} bg-blue-600 text-slate-950 dark:text-white shadow-blue-600/30 hover:bg-blue-500`,
  primary: `${base} bg-primary text-slate-950 dark:text-primary-foreground shadow-primary/30 hover:opacity-95`,
}