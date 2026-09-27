'use client'

import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail, UserRound, Wrench } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function IngresarPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    router.push('/mis-solicitudes')
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-5 py-6 text-[var(--ink)] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[460px]">
        <a href="/" className="mb-8 inline-flex items-center gap-2 font-sans text-xs font-bold text-[var(--muted)] transition-colors hover:text-[var(--ink)]">
          <ArrowLeft size={15} aria-hidden="true" /> Volver a inicio
        </a>

        <section className="rounded-[16px] border border-[var(--line)] bg-[var(--surface-card)] p-6 shadow-[0_8px_30px_rgba(30,41,38,0.06)] sm:p-9">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--coral)] font-serif text-2xl text-white">V</span>
            <span className="font-serif text-[23px] tracking-[-0.03em]">Vincula<span className="text-[var(--coral)]">-UP</span></span>
          </div>

          <p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--coral)]">Acceso a tu cuenta</p>
          <h1 className="mt-3 font-serif text-[clamp(2.25rem,8vw,3.2rem)] leading-[1] tracking-[-0.055em]">Qué bueno verte de nuevo.</h1>
          <p className="mt-4 font-sans text-[15px] leading-6 text-[var(--muted)]">Ingresá para gestionar tus solicitudes y contactos de la red.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block font-sans text-sm font-bold">Correo electrónico</label>
              <div className="relative">
                <Mail size={17} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input id="email" name="email" type="email" autoComplete="email" defaultValue="cliente@vincula-up.com" placeholder="tu@email.com" required className="h-12 w-full rounded-[8px] border border-[var(--line)] bg-white pl-11 pr-4 font-sans text-sm outline-none transition-colors placeholder:text-[var(--muted)]/70 focus:border-[var(--coral)] focus:ring-2 focus:ring-[var(--coral)]/15" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="password" className="font-sans text-sm font-bold">Contraseña</label>
                <a href="#recuperar" className="font-sans text-xs font-bold text-[var(--coral)] hover:underline">¿La olvidaste?</a>
              </div>
              <div className="relative">
                <LockKeyhole size={17} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" defaultValue="Vincula2026!" placeholder="Ingresá tu contraseña" required className="h-12 w-full rounded-[8px] border border-[var(--line)] bg-white pl-11 pr-12 font-sans text-sm outline-none transition-colors placeholder:text-[var(--muted)]/70 focus:border-[var(--coral)] focus:ring-2 focus:ring-[var(--coral)]/15" />
                <button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted)] hover:text-[var(--ink)]">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 font-sans text-sm text-[var(--muted)]">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="peer sr-only" />
              <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border transition-colors ${rememberMe ? 'border-[var(--coral)] bg-[var(--coral)] text-white' : 'border-[var(--line)] bg-white'}`} aria-hidden="true">{rememberMe && <Check size={13} strokeWidth={3} />}</span>
              Mantener la sesión iniciada
            </label>

            <button type="submit" className="flex h-12 w-full items-center justify-center rounded-[8px] bg-[var(--coral)] px-5 font-sans text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-[#c34f3d] focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/30 focus:ring-offset-2">Ingresar a Vincula-UP</button>
          </form>

          <div className="my-7 flex items-center gap-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]"><span className="h-px flex-1 bg-[var(--line)]" /> o continuá con <span className="h-px flex-1 bg-[var(--line)]" /></div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a href="/activar-perfil" className="flex min-h-14 items-center gap-3 rounded-[8px] border border-[var(--line)] bg-white px-4 py-3 text-left transition-colors hover:border-[var(--coral)] hover:bg-[var(--paper)]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--coral)]/10 text-[var(--coral)]"><Wrench size={17} aria-hidden="true" /></span>
              <span className="font-sans text-sm font-bold leading-tight">Ingresar como profesional</span>
            </a>
            <a href="/admin" className="flex min-h-14 items-center gap-3 rounded-[8px] border border-[var(--line)] bg-white px-4 py-3 text-left transition-colors hover:border-[var(--ink)] hover:bg-[var(--paper)]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ink)]/10 text-[var(--ink)]"><UserRound size={17} aria-hidden="true" /></span>
              <span className="font-sans text-sm font-bold leading-tight">Ingresar como administrador</span>
            </a>
          </div>

          <div className="mt-7 flex items-center justify-center gap-2 border-t border-[var(--line)] pt-6 font-sans text-xs font-bold text-[var(--muted)]"><LockKeyhole size={14} className="text-[var(--emerald)]" aria-hidden="true" /> Tus datos están protegidos</div>
        </section>

        <p className="mt-6 text-center font-sans text-sm text-[var(--muted)]">¿Todavía no tenés una cuenta? <a href="/registro" className="font-bold text-[var(--coral)] hover:underline">Registrate</a></p>
      </div>
    </main>
  )
}
