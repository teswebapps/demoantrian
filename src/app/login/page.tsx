import type { Metadata } from 'next'
import { LoginShell } from '@/components/login/login-shell'
import { LoginPanel } from '@/components/login/login-panel'

export const metadata: Metadata = {
  title: 'Login - Antrian Promotor',
  description: 'Masuk ke sistem antrian promotor.',
}

export default function LoginPage() {
  return (
    <LoginShell>
      <main className="flex flex-1 items-center justify-center px-5">
        <LoginPanel />
      </main>
    </LoginShell>
  )
}