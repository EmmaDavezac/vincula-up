'use client'

import { useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'

const neighborSteps = ['Buscá por oficio y zona.', 'Elegí un horario disponible.', 'Esperá la confirmación del profesional.', 'Coordiná por el chat interno.', 'Calificá el servicio al finalizar.']
const guardrails = ['Nadie se autopublica: cada profesional proviene del padrón de egresados.', 'Tu dirección exacta solo se comparte cuando el profesional confirma el turno.', 'Todo el ida y vuelta queda registrado dentro de la app.']

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-5 lg:px-10">
          <a href="#inicio" className="flex items-center gap-3" aria-label="Vincula-UP inicio">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--coral)] font-serif text-2xl text-white">V</span>
            <span className="font-serif text-[23px] tracking-[-0.03em]">Vincula<span className="text-[var(--coral)]">-UP</span></span>
          </a>
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="/ingresar" className="hidden font-sans text-sm font-bold text-[var(--ink)] sm:block">Ingresar</a>
            <a href="/registro" className="hidden whitespace-nowrap rounded-[8px] bg-[var(--ink)] px-3 py-2.5 text-center font-sans text-xs font-bold text-white transition-colors hover:bg-[#263834] sm:px-4 sm:text-sm lg:block">Crear cuenta</a>
            <button className="rounded-[8px] p-2 text-[var(--ink)] hover:bg-[var(--surface-highlight)] lg:hidden" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} type="button" onClick={() => setMenuOpen((open) => !open)}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-[var(--line)] px-6 py-4 lg:hidden" aria-label="Menú principal">
            <a href="/ingresar" className="block rounded-[8px] px-3 py-3 font-sans text-sm font-bold text-[var(--ink)] hover:bg-[var(--surface-highlight)]">Ingresar</a>
            <a href="/registro" className="mt-1 block rounded-[8px] px-3 py-3 font-sans text-sm font-bold text-[var(--ink)] hover:bg-[var(--surface-highlight)]">Crear cuenta</a>
          </nav>
        )}
      </header>

      <section id="inicio" className="mx-auto grid max-w-[1240px] gap-14 px-6 pb-20 pt-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-28">
        <div>
          <p className="mb-7 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--coral)]">Universidad Popular de Concepción del Uruguay</p>
          <h1 className="max-w-[680px] font-serif text-[clamp(3rem,6vw,5rem)] leading-[0.98] tracking-[-0.055em]">Antes de que entre a tu casa, ya lo conocemos nosotros.</h1>
          <p className="mt-7 max-w-[570px] font-sans text-[16px] leading-[1.65] text-[var(--muted)]">Vincula-UP conecta a los egresados técnicos de la Universidad Popular con vecinos que necesitan un electricista, gasista o plomero — sin depender del boca a boca.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="/mis-solicitudes" className="inline-flex items-center gap-3 rounded-[8px] bg-[var(--ink)] px-5 py-3.5 font-sans text-sm font-bold text-white transition-transform hover:-translate-y-0.5">Buscar un técnico <ArrowRight size={16} /></a>
            <a href="/registro" className="rounded-[8px] border border-[var(--line)] bg-transparent px-5 py-3.5 font-sans text-sm font-bold text-[var(--ink)] transition-colors hover:bg-white">Soy egresado técnico</a>
          </div>
        </div>

      </section>

      <section className="border-y border-[var(--line)] bg-[var(--surface-highlight)]" aria-label="El problema"><div className="mx-auto max-w-[1240px] px-6 py-16 lg:px-10 lg:py-20"><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--coral)]">El problema</p><h2 className="mt-3 max-w-3xl font-serif text-4xl leading-tight tracking-[-0.04em]">Contratar un técnico hoy es un acto de fe</h2><p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">Preguntás en el grupo de WhatsApp del barrio. Alguien te pasa un número sin apellido. Mientras tanto, dejás entrar a tu casa a alguien de quien no sabés nada.</p></div></section>

      <section id="como-funciona" className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--coral)]">Para vecinos</p><h2 className="mt-3 font-serif text-4xl leading-tight tracking-[-0.04em]">De la búsqueda al servicio, sin salir de la app</h2></div><ol className="space-y-4">{neighborSteps.map((step, index) => <li key={step} className="flex gap-4 border-b border-[var(--line)] pb-4"><span className="font-serif text-2xl text-[var(--coral)]">0{index + 1}</span><span className="pt-1 text-base font-bold">{step}</span></li>)}</ol></div></section>

      <section className="bg-[var(--ink)] text-white"><div className="mx-auto grid max-w-[1240px] gap-12 px-6 py-20 lg:grid-cols-2 lg:px-10"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#f39a7d]">Para egresados</p><h2 className="mt-3 font-serif text-4xl leading-tight">Tu perfil no lo armás de cero: lo respalda la universidad</h2></div><p className="max-w-xl self-end text-base leading-7 text-white/70">Sos egresado técnico de la Universidad Popular. La propia universidad te suma a la plataforma — vos solo activás tu cuenta, definís en qué zona trabajás y cuándo atendés, y empezás a aparecer ante gente que busca justo lo que sabés hacer.</p></div></section>

      <section className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--coral)]">Por qué confiar</p><h2 className="mt-3 font-serif text-4xl leading-tight tracking-[-0.04em]">No es un marketplace abierto a cualquiera</h2></div><div className="space-y-4">{guardrails.map((point) => <div key={point} className="border-b border-[var(--line)] pb-4 text-base leading-7">{point}</div>)}</div></div></section>

      <section className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10"><div className="grid gap-6 lg:grid-cols-2"><article className="rounded-2xl bg-[var(--surface-highlight)] p-8"><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--coral)]">Respaldo institucional</p><h2 className="mt-3 font-serif text-3xl">Un desarrollo junto a la Universidad Popular</h2><p className="mt-4 leading-7 text-[var(--muted)]">Vincula-UP nace para que la formación técnica de sus egresados no se pierda apenas terminan de cursar — y para que esa formación tenga un lugar visible cuando la comunidad la necesita.</p></article><div className="grid gap-4 sm:grid-cols-2"><a href="/mis-solicitudes" className="flex min-h-40 flex-col justify-between rounded-2xl bg-[var(--coral)] p-7 text-white"><span className="font-serif text-2xl">¿Necesitás un técnico?</span><span className="font-bold">Buscar ahora <ArrowRight className="inline" size={16}/></span></a><a href="/activar-perfil" className="flex min-h-40 flex-col justify-between rounded-2xl border border-[var(--line)] p-7"><span className="font-serif text-2xl">¿Sos egresado técnico?</span><span className="font-bold">Quiero sumarme <ArrowRight className="inline" size={16}/></span></a></div></div></section>

<footer className="border-t border-[var(--line)] bg-[var(--surface-card)]" aria-label="Información y enlaces del sitio">
  <div className="mx-auto max-w-[1240px] px-6 py-10 lg:px-10">
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--coral)] font-serif text-lg text-white">V</span><span className="font-serif text-xl">Vincula-UP</span></div>
        <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--muted)]">Una red técnica con respaldo universitario para conectar necesidades reales con oficios confiables.</p>
      </div>
      <div>
        <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]">Ayuda</h2>
        <nav className="mt-4 flex flex-col items-start gap-3 text-sm text-[var(--muted)]" aria-label="Ayuda y contacto"><a href="mailto:hola@vincula-up.com" className="hover:text-[var(--coral)]">Contacto</a><a href="mailto:hola@vincula-up.com" className="hover:text-[var(--coral)]">Preguntas frecuentes</a><a href="/ingresar" className="hover:text-[var(--coral)]">Ingresar</a></nav>
      </div>
      <div>
        <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]">Información</h2>
        <nav className="mt-4 flex flex-col items-start gap-3 text-sm text-[var(--muted)]" aria-label="Información legal"><a href="/terminos-y-condiciones" className="hover:text-[var(--coral)]">Términos y condiciones</a><a href="/politica-de-privacidad" className="hover:text-[var(--coral)]">Política de privacidad</a><a href="mailto:hola@vincula-up.com" className="hover:text-[var(--coral)]">Reportar un problema</a></nav>
      </div>
    </div>
    <div className="mt-10 flex flex-col gap-2 border-t border-[var(--line)] pt-5 text-xs leading-5 text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between"><span>Vincula-UP · Universidad Popular de Concepción del Uruguay</span><span>© 2026 Todos los derechos reservados</span></div>
  </div>
</footer>
    </main>
  )
}

