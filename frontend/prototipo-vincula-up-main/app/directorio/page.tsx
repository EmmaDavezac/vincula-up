'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, Check, MapPin, Search, Star, UserRound } from 'lucide-react'

const professionals = [
  { initials: 'LB', name: 'Luciano Benitez', file: 'P-2001', specialty: 'Electricidad domiciliaria', location: 'Concepción del Uruguay', radius: '25 km', rating: '4.9', reviews: 28, status: 'ACTIVO', availability: 'Disponible esta semana' },
  { initials: 'MA', name: 'Mariela Acosta', file: 'P-1842', specialty: 'Plomería y gas', location: 'Concepción del Uruguay', radius: '18 km', rating: '4.8', reviews: 19, status: 'ACTIVO', availability: 'Disponible mañana' },
  { initials: 'RN', name: 'Raúl Nuñez', file: 'P-2098', specialty: 'Refrigeración', location: 'San Justo', radius: '30 km', rating: '4.7', reviews: 14, status: 'CARGADO', availability: 'Agenda limitada' },
]

export default function DirectorioPage() {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => professionals.filter((person) => `${person.name} ${person.specialty} ${person.location} ${person.file}`.toLowerCase().includes(query.toLowerCase())), [query])

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10"><a href="/" className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[var(--coral)] font-serif text-xl text-white">V</span><span className="font-serif text-[21px] tracking-[-0.03em]">Vincula<span className="text-[var(--coral)]">-UP</span></span></a><a href="/ingresar" className="font-sans text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)]">Ingresar</a></div>
      </header>
      <div className="mx-auto max-w-[1240px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <a href="/" className="mb-8 inline-flex items-center gap-2 font-sans text-xs font-bold text-[var(--muted)]"><ArrowLeft size={14} /> Volver a inicio</a>
        <div className="max-w-[720px]"><p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--coral)]">Red de profesionales</p><h1 className="mt-4 font-serif text-[clamp(2.35rem,7vw,4.25rem)] leading-[0.98] tracking-[-0.055em]">Directorio de Profesionales Técnicos</h1><p className="mt-5 font-sans text-[15px] leading-6 text-[var(--muted)]">Encontrá técnicos matriculados y validados por la Universidad Popular en tu zona.</p></div>
        <div className="mt-10 flex flex-col gap-4 border-y border-[var(--line)] py-5 sm:flex-row sm:items-center sm:justify-between"><label className="relative block flex-1"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><span className="sr-only">Buscar profesionales</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por oficio, legajo, nombre o zona..." className="w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface-card)] py-3.5 pl-11 pr-4 font-sans text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--emerald)]" /></label><p className="shrink-0 font-sans text-xs font-bold text-[var(--muted)]"><span className="text-[var(--ink)]">{filtered.length}</span> profesionales encontrados</p></div>
        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          {filtered.map((person) => <article key={person.file} className="flex flex-col rounded-[13px] border border-[var(--line)] bg-[var(--surface-card)] p-5 shadow-[0_2px_8px_rgba(30,41,38,0.035)]"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-highlight)] font-serif text-lg font-bold">{person.initials}</span><div><span className="inline-flex rounded-full bg-[#E7F0E9] px-2 py-1 font-sans text-[9px] font-extrabold tracking-[0.1em] text-[var(--emerald)]">{person.status}</span><span className="ml-2 inline-flex items-center gap-1 font-sans text-[10px] font-bold text-[var(--emerald)]"><Check size={12} /> Validado</span></div></div><UserRound size={16} className="text-[var(--muted)]" /></div><h2 className="mt-5 font-serif text-[25px] tracking-[-0.035em]">{person.name}</h2><span className="mt-2 self-start rounded-full bg-[var(--surface-highlight)] px-2.5 py-1 font-sans text-[10px] font-bold text-[var(--muted)]">Legajo: {person.file}</span><p className="mt-5 font-sans text-sm font-bold">{person.specialty}</p><div className="mt-3 flex items-start gap-2 font-sans text-xs leading-5 text-[var(--muted)]"><MapPin size={15} className="mt-0.5 shrink-0 text-[var(--coral)]" />{person.location} · Radio {person.radius}</div><div className="mt-5 flex items-center gap-2 font-sans text-xs font-bold"><span className="tracking-[0.1em] text-[#C38A25]">★★★★★</span><span>{person.rating}</span><span className="font-normal text-[var(--muted)]">({person.reviews} reseñas)</span></div><div className="mt-4 flex items-center gap-2 font-sans text-xs font-bold text-[var(--emerald)]"><span className="h-2 w-2 rounded-full bg-[var(--emerald)]" />{person.availability}</div><button type="button" className="mt-6 inline-flex items-center justify-center rounded-[8px] bg-[var(--ink)] px-4 py-3 font-sans text-sm font-bold text-white transition-transform hover:-translate-y-0.5">Solicitar servicio <span className="ml-2">→</span></button></article>)}
        </div>
        {filtered.length === 0 && <p className="py-16 text-center font-sans text-sm text-[var(--muted)]">No encontramos profesionales con esa búsqueda.</p>}
      </div>
    </main>
  )
}
