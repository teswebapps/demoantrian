import type { Metadata } from 'next'
import { LoginBrand } from '@/components/login/login-brand'
import { LoginPanel } from '@/components/login/login-panel'

export const metadata: Metadata = {
  title: 'Login - Sistem Antrian UFO Elektronika',
  description: 'Masuk ke sistem antrian promotor UFO Elektronika Kebonsari.',
}

export default function LoginPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-slate-950 flex flex-col text-slate-100">
      
      {/* Background Gradient & Glow Modern yang Lebih Hidup */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Pendaran Cahaya Biru Cyan di Atas */}
        <div className="absolute -top-[40%] left-[20%] w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[120px]" />
        {/* Pendaran Cahaya Biru Royal di Kanan Bawah */}
        <div className="absolute -bottom-[30%] right-[10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[140px]" />
        
        {/* Pola Grid Halus Transparan */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>
      
      <main className="relative flex-1 flex flex-col items-center justify-center px-5 py-6 w-full max-w-md mx-auto z-10">
        {/* Logo & Judul */}
        <LoginBrand />

        {/* Card Login */}
        <div className="w-full mt-8">
          <LoginPanel />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-slate-400 mb-4">
          {'Butuh bantuan? '}
          <a href="#" className="font-semibold text-cyan-400 underline-offset-4 hover:underline">
            Hubungi admin
          </a>
        </p>
      </main>
    </div>
  )
}