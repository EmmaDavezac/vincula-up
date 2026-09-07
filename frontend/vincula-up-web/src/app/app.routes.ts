import { Routes } from '@angular/router';
import { requireRole } from './core/guards/role.guard';

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
		loadComponent: () => import('./sign-in/sign-in').then((module) => module.SignIn),
		title: 'Vincula-UP | Ingresar',
	},
	{
		path: 'mis-solicitudes',
		canActivate: [requireRole('CLIENTE')],
		loadComponent: () => import('./my-requests/my-requests').then((module) => module.MyRequests),
		title: 'Vincula-UP | Mis solicitudes',
	},
	{
		path: 'solicitar',
		canActivate: [requireRole('CLIENTE')],
		loadComponent: () => import('./request/request').then((module) => module.Request),
		title: 'Vincula-UP | Solicitar turno',
	},
	{
		path: 'admin',
		canActivate: [requireRole('ADMIN')],
		loadComponent: () => import('./access-page').then((module) => module.AccessPage),
		data: {
			title: 'Panel de administracion',
			message: 'Desde aca vas a cargar profesionales y hacer seguimiento de activaciones.',
		},
		title: 'Vincula-UP | Administracion',
	},
	{
		path: 'no-autorizado',
		loadComponent: () => import('./access-page').then((module) => module.AccessPage),
		data: {
			title: 'No tenes permiso para entrar aca',
			message: 'Cambia de usuario demo o volve al inicio para continuar.',
		},
		title: 'Vincula-UP | Acceso restringido',
	},
	{ path: '**', redirectTo: '' },
];
