'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'

type UserMenuProps = {
  name: string
  role: 'Cliente' | 'Profesional' | 'Administrador'
  profileHref: string
  photo?: string
}

const fallbackProfilePhoto = 'https://i.pravatar.cc/160?img=12'
const getInitials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

export function UserMenu({ name, role, profileHref, photo }: UserMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface-card)] px-3 py-2 text-left shadow-sm transition hover:border-[var(--coral)]">
        <img src={photo || fallbackProfilePhoto} alt={`Foto de perfil de ${name}`} className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
        <span className="hidden min-w-0 sm:block"><span className="block max-w-[150px] truncate text-sm font-bold">{name}</span><span className="block text-[10px] font-extrabold uppercase tracking-[.1em] text-[var(--muted)]">{role}</span></span>
        <ChevronDown size={16} className={`text-[var(--muted)] transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div role="menu" className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--line)] bg-[var(--surface-card)] p-2 shadow-lg">
        <Link href={profileHref} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold hover:bg-[var(--surface-highlight)]"><UserRound size={17} /> Actualizar perfil</Link>
        <Link href="/" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-[var(--coral)] hover:bg-[#FBEBEE]"><LogOut size={17} /> Cerrar sesión</Link>
      </div>}
    </div>
  )
}

export default UserMenu
