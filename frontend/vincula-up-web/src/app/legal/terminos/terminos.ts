import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LegalDoc } from '../legal-doc';
import { LegalPage } from '../legal-page';

/**
 * Términos y condiciones, con la política de datos y cookies adentro.
 *
 * <p>La política de cookies va integrada y no como documento aparte: en esta
 * aplicación no hay cookies publicitarias, de analítica ni de terceros, así que
 * un archivo propio prometería una privacidad que el usuario tendría que ir a
 * buscar. Acá está todo junto y el pie del sitio lleva directo a esta sección.
 *
 * <p><b>La versión importa:</b> se compara contra la aceptación guardada en la
 * cuenta. Si cambia el contenido, hay que subir la versión para que la
 * aplicación vuelva a pedir la aceptación.
 */
export const VERSION_TERMINOS = '1.0 · 30 de septiembre de 2026';

const DOC: LegalDoc = {
	eyebrow: 'Vincula-UP',
	titulo: 'Términos y condiciones',
	bajada:
		'Cómo funciona la red técnica de la Universidad Popular de Concepción del Uruguay, qué datos guardamos y qué puede ver cada persona.',
	version: `Versión ${VERSION_TERMINOS}`,
	ruta: '/terminos',
	secciones: [
		{
			id: 'que-es',
			titulo: 'Qué es Vincula-UP',
			parrafos: [
				'Vincula-UP es una red técnica de la Universidad Popular de Concepción del Uruguay. Conectamos a vecinos que necesitan resolver un trabajo técnico con egresados y integrantes de oficios de la zona.',
				'Es un proyecto educativo y un espacio de coordinación, no un mercado abierto: el padrón de profesionales lo arma y mantiene el administrador de la red, y no cualquiera puede darse de alta.',
				'Usar la plataforma no crea una relación laboral ni contractual entre la persona que pide el trabajo y quien lo realiza. La Universidad Popular acompaña y coordina, pero no es parte del trabajo que se contrata.',
			],
		},
		{
			id: 'roles',
			titulo: 'Qué hace cada rol',
			parrafos: ['La plataforma tiene tres roles, y lo que cada uno puede ver está dado por su rol:'],
			lista: [
				'Cliente o vecino: busca profesionales, pide turnos, chatea con ellos, califica el trabajo terminado y administra sus datos de contacto.',
				'Profesional: completa su perfil en el padrón, ve las solicitudes que le llegan, acepta o rechaza con un motivo, coordina el turno por chat y termina el trabajo.',
				'Administrador institucional: da de alta y da de baja profesionales del padrón, administra las especialidades, desactiva cuentas y ve las métricas de la plataforma.',
			],
		},
	{
			id: 'datos',
			titulo: 'Tus datos y el almacenamiento en tu navegador',
			parrafos: [
				'Esta sección reúne lo que guardamos y por qué, incluida la parte de cookies y almacenamiento local del navegador.',
				'Responsable: la Universidad Popular de Concepción del Uruguay. Podés pedir acceso, rectificación o eliminación de tus datos escribiendo a vinculaup@gmail.com.',
			],
			lista: [
				'No usamos cookies de seguimiento, publicitarias, de analítica ni de terceros. Por eso no hay un cartel de cookies: no hay nada que consentir. Si algún día se agrega alguna, se avisa y se pasa a pedir consentimiento.',
				'Las únicas cookies que existen son las de sesión de autenticación, que pone el servidor de identidad cuando iniciás sesión. Sin ellas la cuenta no funciona, y no se usan para seguirte.',
				'El token de sesión queda guardado en el almacenamiento local del navegador (localStorage), no en una cookie: es lo que permite mantener la sesión abierta al pasar de pantalla. Como consecuencia, una brecha de seguridad en el navegador podría exponer ese token. Es una limitación conocida, y la solución robusta sería una cookie de sesión que no se pueda leer desde el navegador; queda pendiente para una versión futura.',
				'Guardamos: nombre, correo electrónico, teléfono, foto de perfil, los mensajes del chat, el historial de solicitudes y tu zona de cobertura. La zona de cobertura se guarda cifrada.',
				'La dirección exacta del domicilio no se le muestra al profesional mientras la solicitud está pendiente: solo ve la zona aproximada. Cuando acepta el turno, ahí sí se le revela.',
				'Las fotos de perfil son privadas y no se pueden ver entre personas del mismo rol: un cliente ve las de los profesionales, un profesional ve las de los clientes y el administrador ve las de ambos. Nadie ve la foto de otro administrador. Cada persona siempre ve la suya.',
				'No usamos tus datos con fines publicitarios ni los cedemos a terceros.',
			],
		},
		{
			id: 'padron',
			titulo: 'Cómo entra un profesional al padrón',
			parrafos: [
				'El padrón lo arma el administrador de la red, no se abre solo. Cuando se da de alta a un profesional se le manda un correo con los pasos para completar su perfil.',
				'Para activar el perfil necesita una foto, su zona de cobertura y los horarios en los que puede trabajar. Hasta que no completa esos pasos, el perfil todavía no aparece en el directorio.',
				'El administrador puede desactivar una cuenta del padrón: el perfil sale del directorio y deja de recibir solicitudes, pero no se borra ni se pierde el historial, y se puede reactivar cuando corresponda.',
			],
		},
		{
			id: 'responsabilidad',
			titulo: 'Responsabilidad y alcance',
			parrafos: [
				'El trabajo lo contratas vos con el profesional. Vincula-UP coordina el contacto y deja registro de lo que acordaste en el chat, pero no supervisa la ejecución ni garantiza el resultado.',
				'El profesional responde por el trabajo que performs y por los materiales que usa. El administrador del padrón revisa los datos que carga y puede dar de baja el perfil.',
				'Si un profesional causa un daño, la reclamación se dirige a esa persona. La Universidad Popular acompaña el caso, pero no responde por el trabajo realizado.',
			],
		},
		{
			id: 'cancelaciones',
			titulo: 'Cancelaciones y calificación',
			parrafos: [
				'Cualquiera de las dos partes puede cancelar un turno desde la aplicación, y queda registrado quién lo hizo y con qué motivo.',
				'Cuando el trabajo termina lo marcás como completado. Una vez completado, se puede calificar con puntaje y comentario. Las calificaciones se promedian y forman la reputación del profesional, que se muestra en su perfil.',
			],
		},
		{
			id: 'fotos',
			titulo: 'Fotos de perfil',
			parrafos: [
				'La foto que subís es tuya: la Universidad Popular no la usa para ningún otro fin y podés quitarla cuando quieras desde "Mi cuenta".',
				'Conviene subir una foto donde se te reconozca, porque es parte de cómo te identifican los vecinos y los profesionales de la zona.',
			],
		},
		{
			id: 'cambios',
			titulo: 'Cambios en estos términos',
			parrafos: [
				'Estos términos pueden actualizarse. Cuando cambie el contenido vas a ver la versión nueva arriba y la aplicación te va a pedir que los aceptes de nuevo antes de seguir usándola.',
			],
		},
	],
};

@Component({
	selector: 'app-terminos',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [LegalPage],
	template: '<app-legal-page [doc]="doc" />',
})
export class Terminos {
	readonly doc = DOC;
}