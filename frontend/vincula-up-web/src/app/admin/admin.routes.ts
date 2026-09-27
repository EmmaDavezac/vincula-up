import { Routes } from '@angular/router';

/**
 * Pantallas del panel de administración, en el mismo orden que la navegación del
 * prototipo. El guard de rol vive en la ruta padre (`app.routes.ts`).
 */
export const adminRoutes: Routes = [
	{
		path: '',
		loadComponent: () => import('./admin-dashboard/admin-dashboard').then((module) => module.AdminDashboard),
		title: 'Vincula-UP | Dashboard de administracion',
	},
	{
		path: 'profesionales',
		loadComponent: () => import('./admin-professionals/admin-professionals').then((module) => module.AdminProfessionals),
		title: 'Vincula-UP | Profesionales',
	},
	{
		path: 'categorias',
		loadComponent: () => import('./admin-categories/admin-categories').then((module) => module.AdminCategories),
		title: 'Vincula-UP | Categorias',
	},
	{
		path: 'clientes',
		loadComponent: () => import('./admin-clients/admin-clients').then((module) => module.AdminClients),
		title: 'Vincula-UP | Clientes',
	},
];
