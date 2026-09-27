'use client'

import Link from 'next/link'
import { BarChart3, Users, Tag } from 'lucide-react'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/admin', label: 'Resumen', icon: BarChart3 },
  { href: '/admin/profesionales', label: 'Profesionales', icon: Users },
  { href: '/admin/categorias', label: 'Categorías', icon: Tag },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
]

export default function AdminNavigation() {
  const pathname = usePathname()
  const active = (href: string) => href === '/admin' ? pathname === href : pathname.startsWith(href)

  return <>
    <aside className="hidden w-60 shrink-0 lg:block">
      <nav className="sticky top-6 rounded-2xl border border-[var(--line)] bg-[var(--surface-card)] p-3" aria-label="Navegación de administración">
        <p className="px-3 pb-3 pt-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[var(--muted)]">Administración</p>
        {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-colors ${active(href) ? 'bg-[var(--ink)] text-white' : 'text-[var(--muted)] hover:bg-[var(--surface-highlight)] hover:text-[var(--ink)]'}`}><Icon size={17}/>{label}</Link>)}
      </nav>
    </aside>
    <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-[var(--line)] bg-[var(--paper)]/95 px-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_16px_rgba(30,41,38,0.08)] backdrop-blur lg:hidden" aria-label="Menú principal admin">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-bold ${active(href) ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}><Icon size={19} strokeWidth={active(href) ? 2.4 : 1.8}/><span className="truncate">{label}</span></Link>)}</nav>
  </>
}
