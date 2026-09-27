'use client'

import { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LockKeyhole, UserRound } from 'lucide-react'

export default function RegistroPage() {
  const router = useRouter()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    router.push('/mis-solicitudes')
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-5 py-6 text-[var(--ink)] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[460px]">
        <a href="/" className="mb-8 inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]"><ArrowLeft size={15} /> Volver a inicio</a>
        <section className="rounded-[16px] border border-[var(--line)] bg-[var(--surface-card)] p-6 shadow-[0_8px_30px_rgba(30,41,38,0.06)] sm:p-9">
          <div className="mb-8 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--coral)] font-serif text-2xl text-white">V</span><span className="font-serif text-[23px]">Vincula<span className="text-[var(--coral)]">-UP</span></span></div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--coral)]">Crear cuenta</p>
          <h1 className="mt-3 font-serif text-[clamp(2.25rem,8vw,3.2rem)] leading-[1] tracking-[-0.055em]">Sumate a Vincula-UP.</h1>
          <p className="mt-4 text-[15px] leading-6 text-[var(--muted)]">Completá tus datos para comenzar a gestionar tus solicitudes.</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block text-sm font-bold">Nombre completo<input required name="name" className="mt-2 h-12 w-full rounded-[8px] border border-[var(--line)] bg-white px-4 text-sm font-normal outline-none focus:border-[var(--coral)]" placeholder="Tu nombre" /></label>
            <label className="block text-sm font-bold">Correo electrónico<input required type="email" name="email" className="mt-2 h-12 w-full rounded-[8px] border border-[var(--line)] bg-white px-4 text-sm font-normal outline-none focus:border-[var(--coral)]" placeholder="tu@email.com" /></label>
            <label className="block text-sm font-bold">Contraseña<input required type="password" name="password" className="mt-2 h-12 w-full rounded-[8px] border border-[var(--line)] bg-white px-4 text-sm font-normal outline-none focus:border-[var(--coral)]" placeholder="Elegí una contraseña" /></label>
            <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--coral)] px-5 text-sm font-extrabold text-white hover:bg-[#c34f3d]"><UserRound size={17} /> Crear mi cuenta</button>
          </form>
          <div className="mt-7 flex items-center justify-center gap-2 border-t border-[var(--line)] pt-6 text-xs font-bold text-[var(--muted)]"><LockKeyhole size={14} className="text-[var(--emerald)]" /> Tus datos están protegidos</div>
        </section>
      </div>
    </main>
  )
}
