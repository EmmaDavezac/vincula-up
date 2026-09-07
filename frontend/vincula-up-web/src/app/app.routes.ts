import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./home/home').then((module) => module.Home),
		title: 'Vincula-UP | Inicio',
	},
	{
		path: 'directorio',
		loadComponent: () => import('./directory/directory').then((module) => module.Directory),
		title: 'Vincula-UP | Directorio',
	},
	{
		path: 'como-funciona',
		loadComponent: () => import('./simple-page').then((module) => module.SimplePage),
		data: {
			title: 'Una forma mas clara de pedir ayuda',
			message: 'Explorá profesionales, elegí un horario y seguí tu solicitud desde un solo lugar.',
		},
		title: 'Vincula-UP | Como funciona',
	},
	{
		path: 'ingresar',
		loadComponent: () => import('./simple-page').then((module) => module.SimplePage),
		data: {
			title: 'Ingresar a Vincula-UP',
			message: 'El acceso seguro con Keycloak se habilitará en el próximo bloque del MVP.',
		},
		title: 'Vincula-UP | Ingresar',
	},
	{ path: '**', redirectTo: '' },
];
