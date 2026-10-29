import { LogOut, Store, Sun } from 'lucide-react'

type AppHeaderProps = {
  storeName: string
  isOpen: boolean
  onLogout?: () => void
  onToggleTheme?: () => void // <-- Tambahan untuk fungsi ganti tema
}

export function AppHeader({ storeName, isOpen, onLogout, onToggleTheme }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-[1000] bg-background/80 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Store className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Toko</p>
          <h1 className="truncate text-base font-semibold leading-tight text-foreground">
            {storeName}
          </h1>
        </div>
        
        {/* TOMBOL GANTI TEMA */}
        <button
          type="button"
          onClick={onToggleTheme} // <--- Fungsi dipasang di sini
          aria-label="Ganti tema"
          className="flex size-11 items-center justify-center rounded-full bg-secondary text-amber-300 transition-colors hover:bg-secondary/70 active:scale-95"
        >
          <Sun className="size-5" aria-hidden="true" />
        </button>

        {/* TOMBOL LOGOUT */}
        <button
          type="button"
          onClick={onLogout} // <--- Fungsi logout dipasang di sini
          aria-label="Keluar"
          className="flex size-11 items-center justify-center rounded-full bg-destructive/15 text-destructive transition-colors hover:bg-destructive/25 active:scale-95"
        >
          <LogOut className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl bg-card px-4 py-3">
        <span className="text-sm text-muted-foreground">Status antrian</span>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
            isOpen ? 'bg-accent/15 text-accent' : 'bg-destructive/15 text-destructive'
          }`}
        >
          <span className="relative flex size-2">
            {isOpen && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
            )}
            <span
              className={`relative inline-flex size-2 rounded-full ${isOpen ? 'bg-accent' : 'bg-destructive'}`}
            />
          </span>
          {isOpen ? 'Buka' : 'Tutup'}
        </span>
      </div>
    </header>
  )
}