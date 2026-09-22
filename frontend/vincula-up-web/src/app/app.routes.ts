import { Routes } from '@angular/router';
import { redirectToKeycloak, requireActivationAccess, requireAnyRole, requireRequestsAccess, requireRole } from './core/guards/role.guard';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./home/home').then((module) => module.Home),
		title: 'Vincula-UP | Inicio',
	},
	{
		path: 'directorio',
		canActivate: [requireRole('ADMIN')],
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
		canActivate: [redirectToKeycloak],
		loadComponent: () => import('./sign-in/sign-in').then((module) => module.SignIn),
		title: 'Vincula-UP | Ingresar',
	},
	{
		path: 'solicitudes',
		canActivate: [requireRequestsAccess],
		loadComponent: () => import('./my-requests/my-requests').then((module) => module.MyRequests),
		title: 'Vincula-UP | Solicitudes',
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
		loadComponent: () => import('./admin/admin').then((module) => module.Admin),
		title: 'Vincula-UP | Administracion',
	},
	{
		path: 'activar-perfil',
		canActivate: [requireActivationAccess],
		loadComponent: () => import('./activation/activation').then((module) => module.Activation),
		title: 'Vincula-UP | Activar perfil',
	},
	{
		path: 'mi-cuenta',
		canActivate: [requireAnyRole(['CLIENTE', 'PROFESIONAL', 'ADMIN'])],
		loadComponent: () => import('./account/account').then((module) => module.Account),
		title: 'Vincula-UP | Mi cuenta',
	},
	{
		path: 'no-autorizado',
		loadComponent: () => import('./access-page').then((module) => module.AccessPage),
		data: {
			title: 'No tenes permiso para entrar aca',
			message: 'Inicia sesión con tu cuenta Keycloak o volve al inicio para continuar.',
		},
		title: 'Vincula-UP | Acceso restringido',
	},
	{ path: '**', redirectTo: '' },
];
