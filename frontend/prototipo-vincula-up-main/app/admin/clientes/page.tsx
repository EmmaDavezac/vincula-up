'use client'

import { useState } from 'react'
import Link from 'next/link'
import UserMenu from '@/components/user-menu'
import AdminNavigation from '@/components/admin-navigation'

type Client = { name: string; email: string; requests: number; status: 'ACTIVO' | 'INACTIVO'; photo: string }

const initialClients: Client[] = [
  { name: 'Sofía Martínez', email: 'sofia@vincula-up.local', requests: 8, status: 'ACTIVO', photo: 'https://i.pravatar.cc/160?img=32' },
  { name: 'Tomás Romero', email: 'tomas@vincula-up.local', requests: 3, status: 'ACTIVO', photo: 'https://i.pravatar.cc/160?img=11' },
  { name: 'Ana López', email: 'ana@vincula-up.local', requests: 1, status: 'INACTIVO', photo: 'https://i.pravatar.cc/160?img=47' },
]

const getInitials = (name: string) => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()

export default function ClientsPage() {
  const [clients, setClients] = useState(initialClients)
  const toggleStatus = (email: string) => setClients((current) => current.map((client) => client.email === email ? { ...client, status: client.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } : client))

  return <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]"><header className="border-b border-[var(--line)] bg-[var(--surface-card)]"><div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:px-10"><Link href="/admin" className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--coral)] font-serif text-xl text-white">V</span><span className="font-serif text-xl">Vincula-UP</span></Link><UserMenu name="Lucía Benítez" role="Administrador" profileHref="/admin" /></div></header><div className="mx-auto flex flex-col gap-8 lg:flex-row max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-10"><AdminNavigation/><div className="min-w-0 flex-1"><Link href="/admin" className="text-sm font-bold text-[var(--muted)]">← Dashboard</Link><div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-serif text-4xl">Clientes</h1><p className="mt-2 text-[var(--muted)]">Consultá y administrá el acceso de cada cliente.</p></div><span className="rounded-full bg-[#e6f1e9] px-3 py-1.5 text-sm font-bold text-[#315244]">{clients.length} clientes</span></div><div className="mt-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-card)]"><div className="hidden grid-cols-[minmax(240px,1.5fr)_1fr_140px_150px] gap-4 border-b border-[var(--line)] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[var(--muted)] md:grid"><span>Cliente</span><span>Actividad</span><span>Estado</span><span>Acciones</span></div>{clients.map((client) => <article key={client.email} className="grid gap-4 border-b border-[var(--line)] p-5 last:border-b-0 md:grid-cols-[minmax(240px,1.5fr)_1fr_140px_150px] md:items-center"><div className="flex min-w-0 items-center gap-3"><img src={client.photo} alt={`Foto de ${client.name}`} className="h-12 w-12 shrink-0 rounded-full object-cover"/><div className="min-w-0"><h2 className="font-bold">{client.name}</h2><p className="truncate text-sm text-[var(--muted)]">{client.email}</p></div></div><p className="text-sm text-[var(--muted)]"><span className="font-bold text-[var(--ink)]">{client.requests}</span> solicitudes realizadas</p><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${client.status === 'ACTIVO' ? 'bg-[#e6f1e9] text-[#315244]' : 'bg-[#f2e8e4] text-[#8d4b3d]'}`}>{client.status}</span><button type="button" onClick={() => toggleStatus(client.email)} className="w-fit rounded-full border border-[var(--line)] px-4 py-2 text-sm font-bold hover:border-[var(--coral)]">{client.status === 'ACTIVO' ? 'Desactivar' : 'Activar'}</button></article>)}</div></div></div></main>
}
