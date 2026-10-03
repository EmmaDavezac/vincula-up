import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AdminSpecialty } from '../../core/models/admin';
import { ApiService } from '../../core/services/api.service';
import { VuIcon } from '../../shared/icon/icon';

/**
 * Alta de un profesional, en su propia pantalla.
 *
 * <p>Antes el formulario se abría encima del listado, en la misma pantalla: había
 * que apretar "Nuevo preregistro" y el panel aparecía arriba de la grilla, que
 * seguía scrolleando detrás. Con la lista ya llena, el formulario se perdía entre
 * las tarjetas. Acá es una pantalla aparte con su propio encabezado y un "Volver"
 * al padrón, y el listado queda para consultar y modificar.
 */
@Component({
	selector: 'app-admin-professional-new',
	imports: [FormsModule, RouterLink, VuIcon],
	templateUrl: './admin-professional-new.html',
	styleUrl: './admin-professional-new.css',
})
export class AdminProfessionalNew {
	private readonly api = inject(ApiService);
	private readonly router = inject(Router);

	readonly specialties = signal<AdminSpecialty[]>([]);
	readonly loadingSpecialties = signal(true);
	readonly submitting = signal(false);
	readonly error = signal('');

	/**
	 * Datos del alta. El `especialidadIds` va aparte porque las casillas se
	 * controlan a mano (el `[(ngModel)]` sobre un checkbox no es confiable).
	 */
	readonly form = {
		nombre: '',
		apellido: '',
		email: '',
		telefono: '',
		legajo: '',
		especialidadIds: [] as string[],
	};

	constructor() {
		this.cargarEspecialidades();
	}

	private cargarEspecialidades(): void {
		this.loadingSpecialties.set(true);
		this.api.getSpecialties().pipe(
			map((items) => (items ?? []) as AdminSpecialty[]),
			catchError((error) => {
				this.error.set(this.api.describeError(error, 'No se pudieron cargar las especialidades.'));
				return of([] as AdminSpecialty[]);
			}),
		).subscribe((items) => {
			this.specialties.set(items);
			this.loadingSpecialties.set(false);
		});
	}

	toggleSpecialty(id: string): void {
		this.form.especialidadIds = this.form.especialidadIds.includes(id)
			? this.form.especialidadIds.filter((item) => item !== id)
			: [...this.form.especialidadIds, id];
	}

	/**
	 * Valida antes de llamar al backend. El email se chequea con una expresión
	 * simple a propósito: la regla que importa es "es un email con forma de email",
	 * y no vale la pena arrastrar un parser entero por un formulario de un campo.
	 */
	private validar(): string {
		if (!this.form.nombre.trim()) return 'Escribí el nombre del profesional.';
		if (!this.form.apellido.trim()) return 'Escribí el apellido del profesional.';
		const email = this.form.email.trim();
		if (!email) return 'Escribí el correo electrónico del profesional.';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'El correo electrónico no tiene un formato válido.';
		if (!this.form.legajo.trim()) return 'Escribí el legajo del profesional.';
		if (this.form.especialidadIds.length === 0) return 'Elegí al menos una especialidad.';
		return '';
	}

	send(): void {
		if (this.submitting()) return;
		const problema = this.validar();
		if (problema) {
			this.error.set(problema);
			return;
		}
		this.error.set('');
		this.submitting.set(true);

		const email = this.form.email.trim();

		// Un solo endpoint: el backend crea la cuenta con contraseña temporal, el
		// perfil pendiente de activación y manda el acceso; devuelve si el correo salió.
		this.api.createProfessionalInvite({
			nombre: this.form.nombre.trim(),
			apellido: this.form.apellido.trim(),
			email,
			telefono: this.form.telefono.trim(),
			legajo: this.form.legajo.trim(),
			especialidadIds: [...this.form.especialidadIds],
		}).pipe(
			catchError((err) => {
				this.submitting.set(false);
				this.error.set(this.api.describeError(err, 'No se pudo registrar el profesional.'));
				return of(null);
			}),
		).subscribe((resultado) => {
			this.submitting.set(false);
			if (!resultado) return;
			// El mensaje lo redacta `mensajeDeAlta`: hay que distinguir "quedó
			// guardado" de "quedó guardado y avisado", porque si el correo no sale el
			// administrador tiene que enterarse por otro medio.
			this.router.navigate(['/admin/profesionales'], {
				state: { mensaje: this.mensajeDeAlta(resultado, email) },
			});
		});
	}

	/**
	 * Aviso del alta, en términos del servicio.
	 *
	 * <p>No nombra con qué sistema se guarda la cuenta ni cómo se vincula: el
	 * administrador necesita saber si quedó dada de alta y si el profesional fue
	 * avisado, nada más. El caso importante es el segundo: si el correo no salió,
	 * el panel le muestra la contraseña temporal para que se la pase por otra vía.
	 */
	private mensajeDeAlta(result: { correoEnviado?: boolean; passwordTemporal?: string } | null, email: string): string {
		const base = `Profesional ${email} dado de alta`;
		if (result?.correoEnviado) {
			return `${base}. Le enviamos por correo su contraseña temporal y los pasos para activar su perfil.`;
		}
		const clave = result?.passwordTemporal
			? ` Pasale esta contraseña temporal: ${result.passwordTemporal} (debe cambiarla al entrar).`
			: ' Avisale por otra vía.';
		return `${base}, pero no se pudo enviar el correo.${clave}`;
	}
}