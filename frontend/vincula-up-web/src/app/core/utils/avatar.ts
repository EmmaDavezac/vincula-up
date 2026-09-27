/**
 * Iniciales para el avatar cuando la persona todavía no cargó una foto.
 * Mismo criterio que el prototipo: las dos primeras palabras.
 */
export function inicialesDe(nombre: string | null | undefined): string {
	return (
		(nombre ?? '')
			.split(' ')
			.filter(Boolean)
			.slice(0, 2)
			.map((parte) => parte.charAt(0))
			.join('')
			.toUpperCase() || 'P'
	);
}
