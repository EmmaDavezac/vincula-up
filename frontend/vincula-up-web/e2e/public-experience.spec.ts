import { expect, test } from '@playwright/test';

test('public landing and legal pages navigate and disclose location privacy', async ({ page }) => {
	await page.goto('/');
	await expect(
		page.getByRole('heading', { name: 'Antes de que entre a tu casa, ya lo conocemos nosotros.' }),
	).toBeVisible();

	await page.goto('/preguntas-frecuentes');
	await expect(page.getByRole('heading', { name: 'Preguntas frecuentes' })).toBeVisible();
	const privacyQuestion = page.getByText('¿El profesional ve mi dirección antes de aceptar?');
	await privacyQuestion.click();
	await expect(
		page.getByText('No. Mientras la solicitud está pendiente, el profesional solo ve la zona aproximada'),
	).toBeVisible();

	await page.getByRole('link', { name: 'Ver términos y condiciones' }).click();
	await expect(page.getByRole('heading', { name: 'Términos y condiciones' })).toBeVisible();
	await expect(page.getByText('La dirección exacta del domicilio no se le muestra')).toBeVisible();
});
