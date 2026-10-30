import type { Metadata } from 'next'
import { LoginBrand } from '@/components/login/login-brand'
import { LoginPanel } from '@/components/login/login-panel'

export const metadata: Metadata = {
  title: 'Login - Sistem Antrian UFO Elektronika',
  description: 'Masuk ke sistem antrian promotor UFO Elektronika Kebonsari.',
}

export default function LoginPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(6,182,212,0.15),transparent_70%),radial-gradient(50%_35%_at_100%_100%,rgba(59,130,246,0.1),transparent_70%)]"
      />
      
      <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
        <LoginBrand />
        <LoginPanel />
        <p className="mt-6 text-center text-xs text-muted-foreground/80">
          {'Butuh bantuan? '}
          <a
            href="#"
            className="font-semibold text-cyan-500 underline-offset-4 hover:underline"
          >
            Hubungi admin
          </a>
        </p>
      </main>
    </div>
  )
}