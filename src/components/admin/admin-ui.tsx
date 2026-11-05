import type { ReactNode } from 'react'

/* ===== KARTU BAGIAN (gaya sama dengan kartu di halaman promotor) ===== */
export function SectionCard({
  icon,
  tone = 'primary',
  title,
  subtitle,
  children,
}: {
  icon: ReactNode
  tone?: 'primary' | 'emerald' | 'amber' | 'cyan' | 'rose' | 'purple'
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const tones: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    amber: 'bg-amber-500/10 text-amber-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
    rose: 'bg-rose-500/10 text-rose-500',
    purple: 'bg-purple-500/10 text-purple-500',
  }
  return (
    <div className="bg-card border border-border p-5 rounded-3xl shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>{icon}</div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-foreground">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
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
    cyan: 'text-cyan-500',
    purple: 'text-purple-500',
    blue: 'text-blue-500',
    amber: 'text-amber-500',
  }
  return (
    <div className="bg-card border border-border rounded-3xl p-4 text-center shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-4xl font-black tracking-tighter mt-1 ${tones[tone]}`}>{value}</p>
    </div>
  )
}

/* ===== INPUT ===== */
export const inputCls =
  'w-full bg-secondary/50 border border-border rounded-xl py-3 px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50'

/* ===== TOMBOL (persis gaya tombol di halaman promotor) ===== */
const base =
  'w-full py-4 font-black rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50 text-sm'

export const btn = {
  cyan: `${base} bg-cyan-500 text-slate-950 shadow-cyan-500/30 hover:bg-cyan-400`,
  emerald: `${base} bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-400`,
  amber: `${base} bg-amber-500 text-white shadow-amber-500/30 hover:bg-amber-400`,
  rose: `${base} bg-rose-600 text-white shadow-rose-500/30 hover:bg-rose-500`,
  purple: `${base} bg-purple-600 text-white shadow-purple-500/30 hover:bg-purple-500`,
  primary: `${base} bg-primary text-primary-foreground shadow-primary/30 hover:opacity-95`,
}
