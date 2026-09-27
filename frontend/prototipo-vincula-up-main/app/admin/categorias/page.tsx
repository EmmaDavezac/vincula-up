'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import UserMenu from '@/components/user-menu'
import AdminNavigation from '@/components/admin-navigation'

type Category = { id: number; name: string; active: boolean }

const initialCategories: Category[] = [
  { id: 1, name: 'Electricidad domiciliaria', active: true },
  { id: 2, name: 'Plomería y gas', active: true },
  { id: 3, name: 'Refrigeración', active: true },
  { id: 4, name: 'Reparación de electrodomésticos', active: false },
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState(initialCategories)
  const [name, setName] = useState('')

  const createCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || categories.some((category) => category.name.toLowerCase() === trimmedName.toLowerCase())) return
    setCategories((current) => [...current, { id: Date.now(), name: trimmedName, active: true }])
    setName('')
  }

  return <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]"><header className="border-b border-[var(--line)] bg-[var(--surface-card)]"><div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:px-10"><Link href="/admin" className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--coral)] font-serif text-xl text-white">V</span><span className="font-serif text-xl">Vincula-UP</span></Link><UserMenu name="Lucía Benítez" role="Administrador" profileHref="/admin" /></div></header><div className="mx-auto flex flex-col gap-8 lg:flex-row max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-10"><AdminNavigation/><div className="min-w-0 flex-1"><Link href="/admin" className="text-sm font-bold text-[var(--muted)]">← Dashboard</Link><div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-serif text-4xl">Categorías</h1><p className="mt-2 text-sm text-[var(--muted)]">Administrá las especialidades disponibles para los profesionales.</p></div></div><form onSubmit={createCategory} className="mt-8 flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-card)] p-5 sm:flex-row"><label htmlFor="category-name" className="sr-only">Nueva categoría</label><input id="category-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de la nueva categoría" className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--coral)]" /><button type="submit" className="rounded-xl bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white">Crear categoría</button></form><div className="mt-6 grid gap-3 sm:grid-cols-2">{categories.map((category) => <article key={category.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-card)] p-5"><div className="min-w-0"><p className="break-words font-bold">{category.name}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-[.08em] ${category.active ? 'bg-[#e6f1e9] text-[#315244]' : 'bg-[#f2e8e4] text-[#8b493b]'}`}>{category.active ? 'ACTIVA' : 'INACTIVA'}</span></div><button type="button" onClick={() => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, active: !item.active } : item))} className="shrink-0 rounded-full border border-[var(--line)] flex h-9 min-w-[100px] items-center justify-center rounded-xl px-3 text-xs font-bold">{category.active ? 'Desactivar' : 'Activar'}</button></article>)}</div></div></div></main>
}
