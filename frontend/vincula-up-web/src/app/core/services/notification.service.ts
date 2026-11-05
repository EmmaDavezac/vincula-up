import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { catchError, of, switchMap, timer } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { RequestService } from './request.service';
import { RequestStatus, ServiceRequest } from '../models/service-request';

export interface AppNotification {
	id: string;
	requestId: string;
	title: string;
	body: string;
	createdAt: string;
	read: boolean;
}

type BrowserPermission = NotificationPermission | 'unsupported';
type StatusSnapshot = Record<string, RequestStatus>;

const NOTIFICATION_KEY = 'vincula-up-notifications';
const SNAPSHOT_KEY = 'vincula-up-request-statuses';
const POLL_INTERVAL_MS = 30_000;
const MAX_NOTIFICATIONS = 40;

@Injectable({ providedIn: 'root' })
export class NotificationService {
	private readonly auth = inject(AuthService);
	private readonly api = inject(ApiService);
	private readonly requests = inject(RequestService);
	private readonly destroyRef = inject(DestroyRef);

	readonly notifications = signal<AppNotification[]>([]);
	readonly permission = signal<BrowserPermission>(this.readPermission());
	readonly unreadCount = computed(() => this.notifications().filter((item) => !item.read).length);
	private workerRegistration: Promise<ServiceWorkerRegistration | null> | null = null;
	private readonly localStatusChanges = new Map<string, RequestStatus>();

	constructor() {
		this.registerWorker();
		effect((onCleanup) => {
			const user = this.auth.currentUser();
			if (!user || (user.role !== 'CLIENTE' && user.role !== 'PROFESIONAL')) {
				this.notifications.set([]);
				return;
			}

			const storageKey = `${NOTIFICATION_KEY}:${user.id}`;
			const snapshotKey = `${SNAPSHOT_KEY}:${user.id}`;
			this.notifications.set(this.readJson<AppNotification[]>(storageKey, []));
			let knownSnapshot = this.readJson<StatusSnapshot | null>(snapshotKey, null);
			const alias = this.auth.getKeycloakId();
			const requestOptions = {
				rol: user.role,
				tipo: user.role === 'PROFESIONAL' ? 'RECIBIDAS' as const : 'ENVIADAS' as const,
				aliasIds: alias && alias !== user.id ? [alias] : [],
			};
			const pollSubscription = timer(0, POLL_INTERVAL_MS).pipe(
				switchMap(() => this.api.getMyRequests(user.id, requestOptions).pipe(catchError(() => of(null)))),
			).subscribe((items) => {
				if (!items) return;
				const previous = this.readJson<StatusSnapshot | null>(snapshotKey, knownSnapshot);
				const current: StatusSnapshot = {};
				for (const request of items) {
					const id = String(request.id);
					const localStatus = this.localStatusChanges.get(id);
					if (localStatus && request.status !== localStatus) {
						current[id] = localStatus;
						continue;
					}
					if (localStatus === request.status) this.localStatusChanges.delete(id);
					current[id] = request.status;
					const oldStatus = previous?.[id];
					if (oldStatus && oldStatus !== request.status) {
						this.requests.updateStatus(request.id, request.status);
						this.addStatusNotification(request);
					} else if (!oldStatus && previous && user.role === 'PROFESIONAL' && request.status === 'PENDIENTE') {
						this.addStatusNotification(request);
					}
				}
				knownSnapshot = current;
				this.writeJson(snapshotKey, current);
			});

			onCleanup(() => pollSubscription.unsubscribe());
		});
		this.destroyRef.onDestroy(() => this.notifications.set([]));
	}

	async enableBrowserNotifications(): Promise<void> {
		if (typeof Notification === 'undefined') {
			this.permission.set('unsupported');
			return;
		}
		try {
			this.permission.set(await Notification.requestPermission());
			if (this.permission() === 'granted') await this.registerWorker();
		} catch {
			this.permission.set(Notification.permission);
		}
	}

	markAllRead(): void {
		this.notifications.update((items) => items.map((item) => ({ ...item, read: true })));
		this.persistNotifications();
	}

	clear(): void {
		this.notifications.set([]);
		this.persistNotifications();
	}

	markStatusHandledLocally(requestId: string | number, status: RequestStatus): void {
		const user = this.auth.currentUser();
		if (!user) return;
		const key = `${SNAPSHOT_KEY}:${user.id}`;
		const snapshot = this.readJson<StatusSnapshot>(key, {});
		snapshot[String(requestId)] = status;
		this.localStatusChanges.set(String(requestId), status);
		this.writeJson(key, snapshot);
	}

	private addStatusNotification(request: ServiceRequest): void {
		const statusCopy: Record<RequestStatus, { title: string; verb: string }> = {
			PENDIENTE: { title: 'Nueva solicitud', verb: 'está pendiente de respuesta' },
			ACEPTADA: { title: 'Solicitud aceptada', verb: 'fue aceptada' },
			RECHAZADA: { title: 'Solicitud rechazada', verb: 'fue rechazada' },
			COMPLETADA: { title: 'Solicitud completada', verb: 'se marcó como completada' },
			CANCELADA: { title: 'Solicitud cancelada', verb: 'fue cancelada' },
			VENCIDA: { title: 'Solicitud vencida', verb: 'venció' },
		};
		const copy = statusCopy[request.status];
		const specialty = request.specialty?.trim() || 'Servicio técnico';
		const body = `${specialty}: ${copy.verb}.`;
		const notification: AppNotification = {
			id: `${request.id}:${request.status}:${request.fechaCambioEstado ?? Date.now()}`,
			requestId: String(request.id),
			title: copy.title,
			body,
			createdAt: new Date().toISOString(),
			read: false,
		};
		this.notifications.update((items) => [notification, ...items].slice(0, MAX_NOTIFICATIONS));
		this.persistNotifications();
		void this.showBrowserNotification(notification);
	}

	private async showBrowserNotification(item: AppNotification): Promise<void> {
		if (this.permission() !== 'granted' || (document.visibilityState === 'visible' && document.hasFocus())) return;
		try {
			const registration = await this.registerWorker();
			if (registration) {
				await registration.showNotification(item.title, {
					body: item.body,
					icon: '/logo-cuadrado.png',
					badge: '/favicon.ico',
					tag: `solicitud-${item.requestId}`,
					data: { url: '/solicitudes' },
				});
			} else if (typeof Notification !== 'undefined') {
				new Notification(item.title, { body: item.body, icon: '/logo-cuadrado.png', tag: `solicitud-${item.requestId}` });
			}
		} catch {
			// La bandeja Angular permanece disponible aunque el navegador bloquee notificaciones.
		}
	}

	private async registerWorker(): Promise<ServiceWorkerRegistration | null> {
		if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
		this.workerRegistration ??= navigator.serviceWorker.register('/sw.js', { scope: '/' })
			.catch(() => null);
		return this.workerRegistration;
	}

	private readPermission(): BrowserPermission {
		return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
	}

	private persistNotifications(): void {
		const user = this.auth.currentUser();
		if (user) this.writeJson(`${NOTIFICATION_KEY}:${user.id}`, this.notifications());
	}

	private readJson<T>(key: string, fallback: T): T {
		try {
			const value = localStorage.getItem(key);
			return value ? JSON.parse(value) as T : fallback;
		} catch {
			return fallback;
		}
	}

	private writeJson(key: string, value: unknown): void {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// El estado sigue vigente mientras la página permanezca abierta.
		}
	}
}