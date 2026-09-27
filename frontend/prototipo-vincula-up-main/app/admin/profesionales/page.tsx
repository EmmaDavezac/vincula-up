'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Check, Edit3, Eye, Pause, Play, Plus, X } from 'lucide-react'
import UserMenu from '@/components/user-menu'
import AdminNavigation from '@/components/admin-navigation'

type Professional = {
  name: string
  email: string
  specialties: string[]
  status: 'ACTIVO' | 'SUSPENDIDO' | 'PREREGISTRO'
  photo: string
}

const initialProfessionals: Professional[] = [
  { name: 'Luciano Benítez', email: 'luciano@vincula-up.local', specialties: ['Electricidad', 'Instalaciones'], status: 'ACTIVO', photo: 'https://i.pravatar.cc/160?img=12' },
  { name: 'Mariana Acosta', email: 'mariana@vincula-up.local', specialties: ['Plomería', 'Gas'], status: 'SUSPENDIDO', photo: 'https://i.pravatar.cc/160?img=47' },
  { name: 'Jorge Sosa', email: 'jorge@vincula-up.local', specialties: ['Refrigeración'], status: 'PREREGISTRO', photo: 'https://i.pravatar.cc/160?img=68' },
]

const specialtyOptions = ['Electricidad', 'Instalaciones', 'Plomería', 'Gas', 'Refrigeración', 'Pintura', 'Climatización']

const getInitials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

const statusStyles = {
  ACTIVO: 'bg-[#e6f1e9] text-[#315244]',
  SUSPENDIDO: 'bg-[#fce8e8] text-[#a33b3b]',
  PREREGISTRO: 'bg-[#fff1d9] text-[#91621c]',
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState(initialProfessionals)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Professional | null>(null)
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])

  const toggleSpecialty = (specialty: string) => setSelectedSpecialties((current) => current.includes(specialty) ? current.filter((item) => item !== specialty) : [...current, specialty])

  const toggleStatus = (email: string) => setProfessionals((current) => current.map((person) => person.email === email ? { ...person, status: person.status === 'SUSPENDIDO' ? 'ACTIVO' : 'SUSPENDIDO' } : person))

  const addProfessional = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const specialties = selectedSpecialties
    setProfessionals((current) => [{ name: String(data.get('name')), email: String(data.get('email')), specialties, status: 'PREREGISTRO', photo: '' }, ...current])
    setShowForm(false)
    setSelectedSpecialties([])
    event.currentTarget.reset()
  }

  return <AdminShell title="Profesionales"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">Consultá profesionales, actualizá sus datos y gestioná el acceso a la plataforma. El preregistro queda pendiente hasta que cada profesional active su perfil.</p><p className="mt-2 text-xs font-bold text-[var(--coral)]">{professionals.length} profesionales registrados</p></div><button type="button" onClick={() => setShowForm((open) => !open)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--coral)] px-4 py-3 text-sm font-bold text-white"><Plus size={16}/>Nuevo preregistro</button></div>
    {showForm && <form onSubmit={addProfessional} className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface-card)] p-5"><div className="flex items-center justify-between"><h2 className="font-serif text-2xl">Preregistrar profesional</h2><button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar formulario"><X size={19}/></button></div><p className="mt-1 text-sm text-[var(--muted)]">El profesional recibirá la invitación y completará la activación de su perfil.</p><div className="mt-5 grid gap-4 md:grid-cols-3"><label className="text-sm font-bold">Nombre completo<input required name="name" className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 font-normal" placeholder="Nombre y apellido"/></label><label className="text-sm font-bold">Correo electrónico<input required type="email" name="email" className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 font-normal" placeholder="profesional@email.com"/></label><fieldset className="text-sm font-bold"><legend>Especialidades</legend><div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-[var(--line)] bg-white p-3">{specialtyOptions.map((specialty) => <label key={specialty} className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs font-bold transition-colors ${selectedSpecialties.includes(specialty) ? 'bg-[#e6f1e9] text-[#315244]' : 'hover:bg-[var(--surface-highlight)]'}`}><input type="checkbox" checked={selectedSpecialties.includes(specialty)} onChange={() => toggleSpecialty(specialty)} className="accent-[var(--coral)]" />{specialty}</label>)}</div><span className="mt-1 block text-xs font-normal text-[var(--muted)]">Podés elegir más de una especialidad.</span></fieldset></div><button type="submit" className="mt-5 rounded-full bg-[var(--ink)] px-4 py-2.5 text-sm font-bold text-white">Guardar preregistro</button></form>}
    <div className="mt-6 grid gap-4 lg:grid-cols-2">{professionals.map((person) => <article key={person.email} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-card)] p-5"><div className="flex min-w-0 items-start gap-4">{person.photo ? <img src={person.photo} alt={`Foto de ${person.name}`} className="h-16 w-16 shrink-0 rounded-full object-cover"/> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#e6f1e9] font-serif text-xl font-bold text-[#315244]" aria-label={`Iniciales de ${person.name}`}>{getInitials(person.name)}</div>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-serif text-xl">{person.name}</h2><p className="mt-1 break-all text-sm text-[var(--muted)]">{person.email}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyles[person.status]}`}>{person.status}</span></div><div className="mt-4 flex flex-wrap gap-2">{person.specialties.map((specialty) => <span key={specialty} className="rounded-full bg-[var(--surface-highlight)] px-2.5 py-1 text-xs font-bold">{specialty}</span>)}</div></div></div><div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4"><button type="button" onClick={() => setSelected(person)} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-2 text-xs font-bold"><Eye size={14}/>Consultar</button><button type="button" onClick={() => setSelected(person)} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-2 text-xs font-bold"><Edit3 size={14}/>Actualizar</button><button type="button" onClick={() => toggleStatus(person.email)} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-2 text-xs font-bold">{person.status === 'SUSPENDIDO' ? <><Play size={14}/>Reactivar</> : <><Pause size={14}/>Suspender</>}</button></div></article>)}</div>
    {selected && <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-2xl bg-[var(--surface-card)] p-6 shadow-xl"><div className="flex items-start justify-between"><div className="flex items-center gap-3">{selected.photo ? <img src={selected.photo} alt={`Foto de ${selected.name}`} className="h-12 w-12 rounded-full object-cover"/> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f1e9] font-serif font-bold text-[#315244]" aria-label={`Iniciales de ${selected.name}`}>{getInitials(selected.name)}</div>}<div><h2 className="font-serif text-2xl">{selected.name}</h2><p className="text-sm text-[var(--muted)]">{selected.email}</p></div></div><button type="button" onClick={() => setSelected(null)} aria-label="Cerrar detalle"><X size={19}/></button></div><p className="mt-6 text-sm font-bold">Especialidades</p><div className="mt-2 flex flex-wrap gap-2">{selected.specialties.map((specialty) => <span key={specialty} className="rounded-full bg-[var(--surface-highlight)] px-2.5 py-1 text-xs font-bold">{specialty}</span>)}</div><p className="mt-5 text-sm text-[var(--muted)]">Estado: <strong className="text-[var(--ink)]">{selected.status}</strong></p><button type="button" onClick={() => setSelected(null)} className="mt-6 w-full rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white">Cerrar</button></div></div>}
  </AdminShell>
}

function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  return <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]"><header className="border-b border-[var(--line)] bg-[var(--surface-card)]"><div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:px-10"><Link href="/admin" className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--coral)] font-serif text-xl text-white">V</span><span className="font-serif text-xl">Vincula-UP</span></Link><UserMenu name="Lucía Benítez" role="Administrador" profileHref="/admin" /></div></header><div className="mx-auto flex flex-col gap-8 lg:flex-row max-w-7xl px-4 py-8 sm:px-6 sm:py-12"><AdminNavigation/><div className="min-w-0 flex-1"><Link href="/admin" className="text-sm font-bold text-[var(--muted)]">← Dashboard</Link><h1 className="mt-5 font-serif text-4xl">{title}</h1><div className="mt-8">{children}</div></div></div></main>
}
