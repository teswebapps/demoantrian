import type { Metadata } from 'next'
import { LoginBrand } from '@/components/login/login-brand'
import { LoginPanel } from '@/components/login/login-panel'

export const metadata: Metadata = {
  title: 'Login - Sistem Antrian UFO Elektronika',
  description: 'Masuk ke sistem antrian promotor UFO Elektronika Kebonsari.',
}

export default function LoginPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background flex flex-col">
      {/* Background Gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(6,182,212,0.15),transparent_70%),radial-gradient(50%_35%_at_100%_100%,rgba(59,130,246,0.1),transparent_70%)]"
      />
      
      <main className="relative flex-1 flex flex-col items-center justify-center px-5 py-6 w-full max-w-md mx-auto">
        {/* Logo & Judul */}
        <LoginBrand />

        {/* Card Login dengan sedikit jarak atas */}
        <div className="w-full mt-8">
          <LoginPanel />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-muted-foreground/80 mb-4">
          {'Butuh bantuan? '}
          <a href="#" className="font-semibold text-cyan-500 underline-offset-4 hover:underline">
            Hubungi admin
          </a>
        </p>
      </main>
    </div>
  )
}