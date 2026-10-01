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
		/*
		 * El alta va en su propia pantalla y no encima del listado: con la grilla
		 * cargada, el formulario se perdía entre las tarjetas. La ruta va después de
		 * `profesionales` para que no la capture ese path, que no tiene comodín.
		 */
		path: 'profesionales/nuevo',
		loadComponent: () =>
			import('./admin-professionals/admin-professional-new').then((module) => module.AdminProfessionalNew),
		title: 'Vincula-UP | Nuevo profesional',
	},
	{
		path: 'categorias',
		loadComponent: () => import('./admin-categories/admin-categories').then((module) => module.AdminCategories),
		title: 'Vincula-UP | Categorias',
	},
	{
		path: 'categorias/nueva',
		loadComponent: () => import('./admin-categories/admin-category-new').then((module) => module.AdminCategoryNew),
		title: 'Vincula-UP | Nueva categoría',
	},
	{
		path: 'clientes',
		loadComponent: () => import('./admin-clients/admin-clients').then((module) => module.AdminClients),
		title: 'Vincula-UP | Clientes',
	},
];
