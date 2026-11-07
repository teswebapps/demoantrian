import type { Metadata } from 'next'
import { LoginBrand } from '@/components/login/login-brand'
import { LoginPanel } from '@/components/login/login-panel'
import { LoginShell } from '@/components/login/login-shell'

export const metadata: Metadata = {
  title: 'Login - Sistem Antrian UFO Elektronika',
  description: 'Masuk ke sistem antrian promotor UFO Elektronika Kebonsari.',
}

export default function LoginPage() {
  return (
    <LoginShell>
            <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-5 w-full max-w-md mx-auto">
        <LoginBrand />

        <div className="w-full mt-5">
          <LoginPanel />
        </div>

        <p className="mt-4 mb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[11px] text-muted-foreground">
          {'Butuh bantuan? '}
          <a href="#" className="font-semibold text-primary underline-offset-4 hover:underline">
            Hubungi admin
          </a>
        </p>
      </main>
    </LoginShell>
  )
}