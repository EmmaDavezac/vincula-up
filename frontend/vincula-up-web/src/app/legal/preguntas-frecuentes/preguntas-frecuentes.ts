import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LegalDoc } from '../legal-doc';
import { LegalPage } from '../legal-page';

/**
 * Preguntas frecuentes.
 *
 * <p>Cada sección es una pregunta y su respuesta, y el componente las renderiza
 * como acordeón. Se ordenaron por momento de uso: entrar, pedir un turno,
 * trabajar en la red y temas de la cuenta y la privacidad.
 */
const DOC: LegalDoc = {
	eyebrow: 'Ayuda',
	titulo: 'Preguntas frecuentes',
	bajada: 'Lo que más se consulta. Si no está acá, escribinos y lo agregamos.',
	ruta: '/preguntas-frecuentes',
	secciones: [
		{
			id: 'cuenta',
			titulo: 'Tu cuenta',
			faq: {
				pregunta: '¿Cómo creo una cuenta?',
				respuesta: [
					'Entrá con "Crear cuenta" desde la pantalla de acceso y completá el formulario con tu nombre, correo y una contraseña. El correo es tu identidad: con ese mismo vas a entrar después y es con el que te identifican los profesionales.',
				],
			},
		},
		{
			id: 'contrasena',
			titulo: 'Contraseña',
			faq: {
				pregunta: '¿Olvidé mi contraseña, qué hago?',
				respuesta: [
					'En la pantalla de acceso, abajo del botón de ingreso, está "¿Olvidó su contraseña?". Te llega un correo con un enlace para poner una nueva.',
					'El enlace es de un solo uso y vence, así que si pasó mucho tiempo pedí uno nuevo.',
				],
			},
		},
		{
			id: 'datos',
			titulo: 'Tus datos',
			faq: {
				pregunta: '¿Quién ve mis datos?',
				respuesta: [
					'Un cliente ve los datos de los profesionales con los que tiene una solicitud. Un profesional ve los datos del cliente que le hizo el pedido. El administrador ve los de toda la plataforma para poder gestionarla.',
					'No usamos tus datos con fines publicitarios ni los cedemos a terceros. Para pedir acceso, rectificación o eliminación escribinos a vinculaup@gmail.com.',
				],
			},
		},
		{
			id: 'foto-privada',
			titulo: 'Fotos',
			faq: {
				pregunta: '¿Quién ve mi foto de perfil?',
				respuesta: [
					'Cada persona ve la suya y solo vos y los del otro rol: un cliente ve las fotos de los profesionales, un profesional ve las de los clientes y el administrador ve las de ambos. Entre personas del mismo rol no se ven, y la foto de un administrador no la ve nadie más.',
					'Para cambiarla o quitarla, entrá a "Mi cuenta".',
				],
			},
		},
		{
			id: 'direccion',
			titulo: 'Tu domicilio',
			faq: {
				pregunta: '¿El profesional ve mi dirección antes de aceptar?',
				respuesta: [
					'No. Mientras la solicitud está pendiente, el profesional solo ve la zona aproximada y un punto redondeado en el mapa. La dirección exacta se revela recién cuando acepta el turno.',
				],
			},
		},
		{
			id: 'pedir-turno',
			titulo: 'Pedir un turno',
			faq: {
				pregunta: '¿Cómo pido un servicio?',
				respuesta: [
					'Desde "Mis solicitudes" pedís uno. Elegís la especialidad, el profesional y la franja horaria que te sirva, escribís un resumen de lo que necesitás y lo enviás.',
					'El profesional recibe la solicitud y puede aceptarla o rechazarla con un motivo. Cuando acepta, el chat se abre y ahí coordinan los detalles.',
				],
			},
		},
		{
			id: 'cancelar',
			titulo: 'Cancelaciones',
			faq: {
				pregunta: '¿Puedo cancelar un turno?',
				respuesta: [
					'Sí, cualquiera de las dos partes puede cancelar desde la pantalla de la solicitud. Queda registrado quién lo hizo y con qué motivo, y ambos lo ven.',
					'Conviene avisar cuanto antes por el chat para que la otra persona pueda buscar otra fecha.',
				],
			},
		},
		{
			id: 'calificar',
			titulo: 'Reputación',
			faq: {
				pregunta: '¿Cómo funciona la calificación?',
				respuesta: [
					'Cuando el trabajo termina, lo marcás como completado. Ahí podés dejar un puntaje de 1 a 5 y un comentario.',
					'Las calificaciones se promedian y forman la reputación del profesional, que se muestra en su perfil. Los comentarios los puede leer cualquiera que vea el perfil.',
				],
			},
		},
		{
			id: 'ser-profesional',
			titulo: 'Trabajar en la red',
			faq: {
				pregunta: '¿Cómo entro al padrón de profesionales?',
				respuesta: [
					'El padrón no es abierto: lo arma el administrador de la red. Si querés trabajar en Vincula-UP, escribinos a vinculaup@gmail.com con tu nombre, oficio, teléfono y zona.',
					'Cuando te dan de alta te llega un correo con los pasos para activar tu perfil.',
				],
			},
		},
		{
			id: 'activar-perfil',
			titulo: 'Tu perfil profesional',
			faq: {
				pregunta: 'Estoy en la red, ¿qué falta para aparecer?',
				respuesta: [
					'Falta activar el perfil. Son tres pasos: una foto de perfil, tu zona de cobertura (donde hacés los trabajos) y los horarios semanales en los que podés trabajar.',
					'Hasta que no completes los tres, tu perfil todavía no aparece en el directorio ni te llegan solicitudes. Podés retomar donde lo dejaste.',
				],
			},
		},
		{
			id: 'zona',
			titulo: 'Cobertura y horarios',
			faq: {
				pregunta: '¿Qué pasa si estoy fuera de mi zona?',
				respuesta: [
					'El administrador ve el perfil y su zona, y es el que decide si lo acepta al padrón. Las solicitudes que llegan se generan a partir de la zona que cargaste.',
					'Si tu zona cambió, actualizala desde tu perfil: es la información que sirve para saber hasta dónde llegás.',
				],
			},
		},
		{
			id: 'cookies',
			titulo: 'Privacidad',
			faq: {
				pregunta: '¿Usan cookies o me rastrean?',
				respuesta: [
					'No usamos cookies de seguimiento, publicitarias, de analítica ni de terceros, y por eso no hay un cartel de cookies: no hay nada que consentir.',
					'Las únicas cookies son las de sesión de autenticación, sin las cuales no se puede entrar. Está explicado en detalle en los términos y condiciones.',
				],
			},
		},
		{
			id: 'contacto',
			titulo: 'Ayuda',
			faq: {
				pregunta: 'No encontré lo que buscaba, ¿a quién escribo?',
				respuesta: [
					'Escríbenos a vinculaup@gmail.com con tu consulta. Si es un problema con una cuenta o una solicitud, conviene decirnos tu correo para poder ubicarlo.',
				],
			},
		},
	],
};
@Component({
	selector: 'app-preguntas-frecuentes',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LegalPage],
	template: '<app-legal-page [doc]="doc" />',
})
export class PreguntasFrecuentes {
	readonly doc = DOC;
}