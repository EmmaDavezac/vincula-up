"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Check, Clock3, MapPin, MessageCircle, Plus, Star } from "lucide-react"
import UserMenu from "@/components/user-menu"

const requests = [
  { id: 1, category: "Electricidad domiciliaria", professional: "Martín Sosa", photo: "https://i.pravatar.cc/160?img=12", status: "En revisión", address: "25 de Mayo 742, Concepción del Uruguay", date: "26 de septiembre", time: "08:00 a 12:00 hs", detail: "Revisión y reparación de instalación eléctrica domiciliaria.", rating: null },
  { id: 2, category: "Plomería y gas", professional: "Diego Acosta", photo: "https://i.pravatar.cc/160?img=11", status: "Aceptada", address: "Urquiza 1180, Concepción del Uruguay", date: "27 de septiembre", time: "12:00 a 16:00 hs", detail: "Revisión y reparación de pérdidas en cocina y baño.", rating: null },
  { id: 3, category: "Pintura", professional: "Lucía Benítez", photo: "https://i.pravatar.cc/160?img=47", status: "Completada", address: "Galarza 536, Concepción del Uruguay", date: "23 de septiembre", time: "16:00 a 20:00 hs", detail: "Pintura interior de living y pasillo.", rating: 5 },
  { id: 4, category: "Carpintería", professional: "Martín Sosa", photo: "https://i.pravatar.cc/160?img=12", status: "Completada", address: "Leguizamón 215, Concepción del Uruguay", date: "24 de septiembre", time: "A coordinar", detail: "Fabricación y colocación de un mueble a medida para el living.", rating: null },
  { id: 5, category: "Jardinería", professional: null, photo: null, status: "Rechazada", address: "Suipacha 328, Concepción del Uruguay", date: "25 de septiembre", time: "A coordinar", detail: "Mantenimiento general y poda del jardín.", rating: null },
]

const professionals = [
  { name: "Martín Sosa", category: "Electricista", photo: "https://i.pravatar.cc/160?img=12", distance: "0,8 km", rating: 4.9 },
  { name: "Diego Acosta", category: "Electricista", photo: "https://i.pravatar.cc/160?img=11", distance: "1,4 km", rating: 4.8 },
  { name: "Lucía Benítez", category: "Electricista", photo: "https://i.pravatar.cc/160?img=47", distance: "2,1 km", rating: 4.7 },
]

const statusStyles: Record<string, string> = { "En revisión": "bg-amber-100 text-amber-800", Aceptada: "bg-emerald-100 text-emerald-800", Completada: "bg-blue-100 text-blue-800", Rechazada: "bg-rose-100 text-rose-800" }

function MiniMap({ address }: { address: string }) {
  return <div className="relative mt-5 h-36 overflow-hidden rounded-[6px] border border-[#C9D5CF] bg-[#DCE8E1]" aria-label={`Mapa de ubicación de ${address}`}><div className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(24deg, transparent 46%, #fff 47%, #fff 50%, transparent 51%), linear-gradient(112deg, transparent 42%, #fff 43%, #fff 46%, transparent 47%)" }} /><span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--coral)] shadow" /></div>
}

function MisSolicitudesPageContent() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState(0)
  const [location, setLocation] = useState("")
  const [category, setCategory] = useState("")
  const [day, setDay] = useState("")
  const [time, setTime] = useState("")
  const [professional, setProfessional] = useState("")
  const [sort, setSort] = useState<"distance" | "rating">("distance")
  const [created, setCreated] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'Todas' | 'En revisión' | 'Aceptada' | 'Completada' | 'Rechazada'>('Todas')
  const createdRequest = searchParams.get("created") === "1" ? {
    id: 99,
    category: searchParams.get("category") || "Servicio técnico",
    professional: searchParams.get("professional") || "Martín Sosa",
    photo: professionals.find((item) => item.name === searchParams.get("professional"))?.photo || "https://i.pravatar.cc/160?img=12",
    status: "En revisión",
    address: searchParams.get("address") || "25 de Mayo 742, Concepción del Uruguay",
    date: searchParams.get("day") || "Día elegido",
    time: searchParams.get("time") || "Horario a coordinar",
    detail: `Solicitud de ${searchParams.get("category") || "servicio técnico"} para realizar en el domicilio indicado.`,
    rating: null,
  } : null
  const displayedRequests = createdRequest ? [createdRequest, ...requests] : requests
  const filteredRequests = statusFilter === 'Todas' ? displayedRequests : displayedRequests.filter((request) => request.status === statusFilter)

  const orderedProfessionals = useMemo(() => [...professionals].sort((a, b) => sort === "distance" ? Number.parseFloat(a.distance) - Number.parseFloat(b.distance) : b.rating - a.rating), [sort])
  const canContinue = step === 1 ? Boolean(location) : step === 2 ? Boolean(category) : step === 3 ? Boolean(day && time) : Boolean(professional)

  return <main className="sent-requests min-h-screen overflow-x-hidden bg-[var(--paper)] text-[var(--ink)]">
    <header className="border-b border-[var(--line)]"><div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:px-10"><Link href="/" className="flex min-w-0 items-center gap-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--coral)] font-serif text-xl text-white">V</span><span className="truncate font-serif text-xl">Vincula-UP</span></Link><UserMenu name="Sofía Martínez" role="Cliente" profileHref="/mis-solicitudes" /></div></header>
    <section className="mx-auto max-w-[1180px] px-4 pb-16 pt-10 sm:px-6 lg:px-10 lg:pt-16"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-serif text-[clamp(2.5rem,5vw,4.4rem)] leading-[.98] tracking-[-.05em]">Mis solicitudes</h1><p className="mt-5 font-sans text-[16px] leading-7 text-[var(--muted)]">Revisá tus pedidos, seguí cada servicio y contactá a tus profesionales.</p></div><Link href="/crear-solicitud" className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--coral)] bg-[var(--coral)] px-5 py-3 text-sm font-bold text-white sm:w-auto"><Plus size={17}/>Crear nueva solicitud</Link></div>
      {created && <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><Check size={18}/>Solicitud enviada correctamente a {professional}.</div>}
      {step > 0 && <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-6"><div className="mb-6 flex items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--coral)]">Paso {step} de 4</p><h2 className="mt-1 font-serif text-2xl">{step === 1 ? "¿Dónde necesitás el servicio?" : step === 2 ? "¿Qué necesitás resolver?" : step === 3 ? "¿Cuándo te viene bien?" : "Elegí un profesional."}</h2></div><button onClick={() => setStep(0)} className="text-sm text-[var(--muted)]">Cancelar</button></div>
        {step === 1 && <div className="space-y-4"><button onClick={() => setLocation("25 de Mayo 742, Concepción del Uruguay")} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left ${location ? "border-[var(--coral)] bg-orange-50" : "border-[var(--line)]"}`}><MapPin className="mt-0.5 shrink-0 text-[var(--coral)]" size={20}/><span><b>Usar mi ubicación</b><span className="mt-1 block text-sm text-[var(--muted)]">{location || "Detectar mi ubicación en Concepción del Uruguay"}</span></span></button><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="O ingresá una dirección" className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm outline-none focus:border-[var(--coral)]" /></div>}
        {step === 2 && <div className="grid gap-3 sm:grid-cols-2">{["Electricidad domiciliaria", "Plomería y gas", "Pintura", "Carpintería"].map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-xl border p-4 text-left text-sm font-bold ${category === item ? "border-[var(--coral)] bg-orange-50" : "border-[var(--line)]"}`}>{item}</button>)}</div>}
        {step === 3 && <div className="space-y-5"><div><p className="mb-3 text-sm font-bold">Día</p><div className="grid grid-cols-3 gap-2 sm:grid-cols-7">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((item) => <button key={item} onClick={() => setDay(item)} className={`h-11 rounded-lg border text-sm font-bold ${day === item ? "border-[var(--coral)] bg-[var(--coral)] text-white" : "border-[var(--line)]"}`}>{item}</button>)}</div></div><label className="block text-sm font-bold">Horario<select value={time} onChange={(e) => setTime(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 font-normal"><option value="">Elegí un horario</option><option>08:00 a 12:00 hs</option><option>12:00 a 16:00 hs</option><option>16:00 a 20:00 hs</option></select></label></div>}
        {step === 4 && <div><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[var(--muted)]">Profesionales disponibles para ese día y horario.</p><div className="flex shrink-0 gap-2"><button onClick={() => setSort("distance")} className={`rounded-full border px-3 py-2 text-xs font-bold ${sort === "distance" ? "border-[var(--coral)] bg-orange-50 text-[var(--coral)]" : "border-[var(--line)]"}`}>Proximidad</button><button onClick={() => setSort("rating")} className={`rounded-full border px-3 py-2 text-xs font-bold ${sort === "rating" ? "border-[var(--coral)] bg-orange-50 text-[var(--coral)]" : "border-[var(--line)]"}`}>Reputación</button></div></div><div className="grid gap-3">{orderedProfessionals.map((item) => <button key={item.name} onClick={() => setProfessional(item.name)} className={`flex w-full min-w-0 items-center gap-3 rounded-xl border p-3 text-left ${professional === item.name ? "border-[var(--coral)] bg-orange-50" : "border-[var(--line)]"}`}><img src={item.photo} alt={`Foto de ${item.name}`} className="h-14 w-14 shrink-0 rounded-full object-cover"/><span className="min-w-0 flex-1"><b className="block truncate">{item.name}</b><span className="block text-xs text-[var(--muted)]">{item.category} · {item.distance}</span><span className="mt-1 flex items-center gap-1 text-xs font-bold"><Star size={13} className="fill-amber-400 text-amber-400"/>{item.rating}</span></span><span className="shrink-0 text-xs font-bold text-[var(--coral)]">{professional === item.name ? "Elegido" : "Elegir"}</span></button>)}</div></div>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button onClick={() => setStep(Math.max(1, step - 1))} className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] px-5 py-3 text-sm font-bold"><ArrowLeft size={16}/>Atrás</button>{step < 4 ? <button disabled={!canContinue} onClick={() => setStep(step + 1)} className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Continuar</button> : <button disabled={!canContinue} onClick={() => { setCreated(true); setStep(0) }} className="rounded-full bg-[var(--coral)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Enviar solicitud</button>}
      </div>
      </div>}
      <div className="mt-8 flex flex-col gap-4 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-sans text-xs font-extrabold uppercase tracking-[.14em] text-[var(--muted)]">{displayedRequests.filter((request) => request.status === 'En revisión').length} solicitudes en revisión</p><span className="font-sans text-sm text-[var(--muted)]">{displayedRequests.length} en total</span></div><label className="flex items-center gap-2 self-start font-sans text-sm font-semibold"><span>Filtrar por estado</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-md border border-[var(--line)] bg-[var(--surface-card)] px-3 py-2 text-sm"><option value="Todas">Todas</option><option value="En revisión">En revisión</option><option value="Aceptada">Aceptadas</option><option value="Completada">Completadas</option><option value="Rechazada">Rechazadas</option></select></label></div><div className="mt-6 grid gap-4 lg:grid-cols-2">{filteredRequests.map((request) => <article key={request.id} className="min-w-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_2px_10px_rgb(30_41_38_/_0.04)]"><div className="flex min-w-0 items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="shrink-0">{request.photo ? <img src={request.photo} alt={`Foto de ${request.professional || 'profesional'}`} className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white"/> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] font-serif text-xl text-white">S</div>}</div><div className="min-w-0"><h2 className="break-words font-serif text-xl leading-tight">{request.professional || "Sin asignar"}</h2><p className="truncate font-sans text-sm text-[var(--muted)]">{request.category}</p></div></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold ${statusStyles[request.status]}`}>{request.status}</span></div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-sans text-sm text-[var(--muted)]"><span><Clock3 size={15} className="mr-1 inline" />{request.date} · {request.time}</span></div><p className="mt-4 font-sans text-sm leading-6 text-[var(--muted)]">{request.detail}</p><MiniMap address={request.address} />{request.status === "Completada" && !request.rating && <button type="button" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[var(--coral)] px-5 py-3 text-sm font-bold text-white">Calificar</button>}{request.rating && <p className="mt-4 font-sans text-sm font-semibold text-[#A56C19]">Calificación del profesional: {'★'.repeat(request.rating)} <span className="text-[var(--muted)]">({request.rating}/5)</span></p>}<div className="request-actions mt-5 flex flex-nowrap gap-2">{request.status === "Aceptada" && <button type="button" className="flex items-center gap-2 rounded-md border border-[var(--line)] px-4 py-2.5 text-sm font-bold"><MessageCircle size={16}/>Ir al chat</button>}{request.status === "Rechazada" && <button type="button" className="flex items-center gap-2 rounded-md border border-[var(--coral)] px-4 py-2.5 text-sm font-bold text-[var(--coral)]" onClick={() => { setStep(1); setCreated(false) }}>Buscar otro profesional</button>}</div>{request.status === "Visitada" && <button type="button" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--coral)] bg-[var(--coral)] px-4 py-3 text-sm font-bold text-white"><Star size={16}/>Calificar</button>}</article>)}</div>
    </section>
  </main>
}

function getDistance(value: string) { return Number.parseFloat(value) }

export default function MisSolicitudesPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[var(--paper)]" />}><MisSolicitudesPageContent /></Suspense>
}
