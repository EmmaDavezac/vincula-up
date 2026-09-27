'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Camera, Check, ChevronLeft, ChevronRight, MapPin, Upload } from 'lucide-react'
import UserMenu from '@/components/user-menu'

const steps = ['Foto', 'Zona y GPS', 'Disponibilidad']
const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default function ActivarPerfilPage() {
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [radius, setRadius] = useState(25)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState(false)
  const [location, setLocation] = useState('')
  const [locationDetected, setLocationDetected] = useState(false)
  const [locationError, setLocationError] = useState(false)
  const [availabilityError, setAvailabilityError] = useState(false)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
  const photoUrl = URL.createObjectURL(file)
  setPhotoPreview(photoUrl)
  sessionStorage.setItem('vincula-professional-photo', photoUrl)
  setPhotoError(false)
  }

  if (done) return <SuccessState />

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">Vincula<span className="text-[var(--coral)]">.</span>UP</Link>
        <UserMenu name="Martín Sosa" role="Profesional" profileHref="/activar-perfil" photo={photoPreview ?? undefined} />
      </header>
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-10">
        <div className="mb-14 flex items-center justify-between">
          {steps.map((label, index) => {
            const number = index + 1
            const active = number === step
            const complete = number < step
            return <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className={`flex items-center gap-3 ${active ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold ${active ? 'border-[var(--ink)] bg-[var(--ink)] text-white' : complete ? 'border-[var(--emerald)] bg-[var(--emerald)] text-white' : 'border-[var(--line)] bg-white'}`}>{complete ? <Check size={16} /> : number}</span>
                <span className="hidden text-sm font-semibold sm:inline">{label}</span>
              </div>
              {number < 3 && <div className={`mx-3 h-px flex-1 ${complete ? 'bg-[var(--emerald)]' : 'bg-[var(--line)]'}`} />}
            </div>
          })}
        </div>
        <div className="mb-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--coral)]">Paso {step} de 3</p>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">{step === 1 ? 'Tu imagen profesional' : step === 2 ? 'Tu zona de cobertura' : 'Tu disponibilidad semanal'}</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">{step === 1 ? 'Una foto clara ayuda a que los clientes reconozcan tu perfil en la comunidad.' : step === 2 ? 'Indicá dónde trabajás para que podamos acercarte oportunidades de tu zona.' : 'Contanos en qué momentos de la semana estás disponible para trabajar.'}</p>
        </div>
        {step === 1 && <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--line)] bg-[var(--surface-card)] p-8 text-center"><input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handlePhotoChange} className="sr-only" />{photoPreview ? <img src={photoPreview} alt="Vista previa de tu foto de perfil" className="mb-4 h-24 w-24 rounded-full object-cover ring-4 ring-[var(--surface-highlight)]" /> : <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-highlight)] text-[var(--ink)]"><Camera size={28} /></div>}<h2 className="font-semibold">{photoPreview ? 'Foto lista para tu perfil' : 'Subí una foto de perfil'}</h2><p className="mt-2 text-sm text-[var(--muted)]">JPG o PNG. Máximo 5 MB.</p>{photoError && <p role="alert" className="mt-3 text-sm font-semibold text-[var(--coral)]">Necesitás cargar una foto para continuar.</p>}<button type="button" onClick={() => fileInputRef.current?.click()} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white"><Upload size={16} />{photoPreview ? 'Cambiar foto' : 'Elegir archivo'}</button></div>}
        {step === 2 && <div className="space-y-6 rounded-2xl border border-[var(--line)] bg-[var(--surface-card)] p-4 sm:p-8"><label className="block text-sm font-semibold">Domicilio o ubicación<input required value={location} onChange={(event) => { setLocation(event.target.value); setLocationDetected(false) }} className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 font-normal outline-none focus:border-[var(--ink)]" placeholder="Ingresá tu domicilio o ubicación" /></label><div className="relative h-52 overflow-hidden rounded-xl border border-[var(--line)] bg-[#dfe8df]" aria-label="Mapa de zona de cobertura" role="img"><div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(25deg, transparent 42%, #fff 43%, #fff 48%, transparent 49%), linear-gradient(115deg, transparent 44%, #fff 45%, #fff 49%, transparent 50%), linear-gradient(#c6d7c6 1px, transparent 1px), linear-gradient(90deg, #c6d7c6 1px, transparent 1px)', backgroundSize: '100% 100%, 100% 100%, 32px 32px, 32px 32px' }} /><div className="absolute left-[47%] top-[42%] flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[var(--coral)] text-white shadow-lg"><MapPin size={19} fill="currentColor" /></div><div className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-[var(--muted)] shadow-sm">Zona de cobertura</div></div>{locationError && <p role="alert" className="text-sm font-semibold text-[var(--coral)]">Ingresá tu domicilio o ubicación para continuar.</p>}<button type="button" onClick={() => { setLocation('UTN Facultad Regional Concepción del Uruguay · Ing. Pereira 676'); setLocationDetected(true); setLocationError(false) }} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-highlight)]"><MapPin size={16} />Usar mi ubicación</button><div><div className="flex justify-between text-sm font-semibold"><span>Radio de cobertura</span><span>{radius} km</span></div><input aria-label="Radio de cobertura" type="range" min="1" max="50" value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="mt-5 w-full accent-[var(--ink)]" /><div className="mt-2 flex justify-between text-xs text-[var(--muted)]"><span>1 km</span><span>50 km</span></div></div>{locationDetected && <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-highlight)] p-4 text-sm text-[var(--emerald)]"><MapPin size={18} />Ubicación lista para tu perfil</div>}</div>}
        {step === 3 && <div className="space-y-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-card)] p-6 sm:p-8"><fieldset><legend className="text-sm font-semibold">Días disponibles</legend><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"><p className="sr-only">Seleccioná uno o más días</p>{availabilityError && <p role="alert" className="mb-3 text-sm font-semibold text-[var(--coral)]">Seleccioná al menos un día y completá tu horario.</p>}{days.map((day) => { const selected = selectedDays.includes(day); return <button key={day} type="button" aria-pressed={selected} onClick={() => setSelectedDays((current) => selected ? current.filter((item) => item !== day) : [...current, day])} className={`rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${selected ? 'border-[var(--emerald)] bg-[var(--emerald)] text-white' : 'border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--emerald)]'}`}>{day}</button> })}</div></fieldset><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Desde<input type="time" defaultValue="08:00" className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 font-normal" /></label><label className="text-sm font-semibold">Hasta<input type="time" defaultValue="18:00" className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 font-normal" /></label></div></div>}
        <div className="mt-8 flex justify-between"><button onClick={() => setStep(Math.max(1, step - 1))} className={`inline-flex h-11 w-[140px] shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--line)] px-4 text-sm font-semibold ${step === 1 ? 'invisible' : ''}`}><ChevronLeft size={16} />Atrás</button><button onClick={() => { if (step === 1 && !photoPreview) { setPhotoError(true); return }; if (step === 2 && !location.trim()) { setLocationError(true); return }; if (step === 3 && selectedDays.length === 0) { setAvailabilityError(true); return }; step === 3 ? setDone(true) : setStep(step + 1) }} className="inline-flex h-11 w-[140px] shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--ink)] px-4 text-sm font-semibold text-white">{step === 3 ? 'Activar' : 'Continuar'}<ChevronRight size={16} /></button></div>
      </section>
    </main>
  )
}

function SuccessState() { return <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-6 text-center text-[var(--ink)]"><div className="max-w-lg"><div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--emerald)] text-white"><Check size={36} /></div><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--coral)]">Perfil activado</p><h1 className="font-serif text-5xl leading-tight">Ya estás dentro de la red.</h1><p className="mt-5 leading-7 text-[var(--muted)]">Tu perfil quedó preparado para aparecer en el directorio.</p><Link href="/solicitudes-recibidas" className="mt-8 inline-flex rounded-lg bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white">Comenzar</Link></div></main> }
