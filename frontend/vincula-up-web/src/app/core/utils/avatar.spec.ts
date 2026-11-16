import { describe, expect, it } from 'vitest';

import { inicialesDe } from './avatar';

describe('inicialesDe', () => {
	it('usa las iniciales de las dos primeras palabras', () => {
		expect(inicialesDe('Luciano Davezac')).toBe('LD');
	});

	it('ignora espacios adicionales entre palabras', () => {
		expect(inicialesDe('  Agustín   Vergara Morales ')).toBe('AV');
	});

	it('devuelve una inicial cuando hay un solo nombre', () => {
		expect(inicialesDe('Nicolás')).toBe('N');
	});

	it('usa la inicial por defecto cuando no hay nombre', () => {
		expect(inicialesDe(null)).toBe('P');
		expect(inicialesDe(undefined)).toBe('P');
		expect(inicialesDe('   ')).toBe('P');
	});
});
