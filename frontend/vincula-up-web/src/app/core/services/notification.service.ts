import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { Subscription, catchError, forkJoin, map, of, switchMap, timer } from 'rxjs';
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
type MessageSnapshot = Record<string, string[]>;

interface ChatMessage {
	id: string;
	emisorId: string;
	texto: string;
	fechaEnvio?: string;
}

const NOTIFICATION_KEY = 'vincula-up-notifications';
const SNAPSHOT_KEY = 'vincula-up-request-statuses';
const MESSAGE_SNAPSHOT_KEY = 'vincula-up-chat-messages';
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
	private readonly activeChatId = signal<string | null>(null);

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
			const messageSnapshotKey = `${MESSAGE_SNAPSHOT_KEY}:${user.id}`;
			this.notifications.set(this.readJson<AppNotification[]>(storageKey, []));
			let knownSnapshot = this.readJson<StatusSnapshot | null>(snapshotKey, null);
		let messageSubscription: Subscription | undefined;
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

				messageSubscription?.unsubscribe();
				const chats = items.filter((request) => request.status === 'ACEPTADA');
				if (!chats.length) return;
				const messagesByRequest = forkJoin(chats.map((request) =>
					this.api.getMessages(String(request.id), user.id).pipe(
						catchError(() => of([])),
						map((messages) => ({ request, messages: messages as ChatMessage[] })),
					),
				));
				messageSubscription = messagesByRequest.subscribe((results) => {
					const snapshots = this.readJson<MessageSnapshot>(messageSnapshotKey, {});
					const ownIds = new Set([user.id, alias].filter((id): id is string => !!id));
					for (const { request, messages } of results) {
						const requestId = String(request.id);
						const messageIds = messages.map((message) => String(message.id));
						const knownIds = snapshots[requestId];
						if (knownIds && this.activeChatId() !== requestId) {
							const known = new Set(knownIds);
							for (const message of messages) {
								if (!known.has(String(message.id)) && !ownIds.has(message.emisorId)) {
									this.addMessageNotification(request, message);
								}
							}
						}
						snapshots[requestId] = messageIds.slice(-200);
					}
					this.writeJson(messageSnapshotKey, snapshots);
				});
			});

			onCleanup(() => {
				pollSubscription.unsubscribe();
				messageSubscription?.unsubscribe();
			});
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

	markRead(notificationId: string): void {
		this.notifications.update((items) => items.map((item) =>
			item.id === notificationId ? { ...item, read: true } : item,
		));
		this.persistNotifications();
	}

	clear(): void {
		this.notifications.set([]);
		this.persistNotifications();
	}

	openChat(requestId: string): void {
		this.activeChatId.set(requestId);
	}

	closeChat(requestId: string, userId: string): void {
		if (!userId) {
			if (this.activeChatId() === requestId) this.activeChatId.set(null);
			return;
		}
		this.api.getMessages(requestId, userId).pipe(catchError(() => of(null))).subscribe((messages) => {
			if (messages) this.rememberMessages(requestId, messages as ChatMessage[], userId);
			if (this.activeChatId() === requestId) this.activeChatId.set(null);
		});
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

	private addMessageNotification(request: ServiceRequest, message: ChatMessage): void {
		const preview = message.texto.trim();
		const user = this.auth.currentUser();
		const senderLookup = user?.role === 'PROFESIONAL'
			? request.clienteId
				? this.api.getUserById(request.clienteId).pipe(
					map((sender) => `${sender?.nombre ?? ''} ${sender?.apellido ?? ''}`.trim() || null),
				)
				: of(null)
			: this.api.getProfessionalById(request.professionalId).pipe(
				map((sender) => {
					const nombre = `${sender?.nombre ?? ''} ${sender?.apellido ?? ''}`.trim();
					return nombre || sender?.name || null;
				}),
			);

		senderLookup.pipe(catchError(() => of(null))).subscribe((senderName) => {
			const fallback = user?.role === 'PROFESIONAL' ? 'tu cliente' : 'tu profesional';
			const notification: AppNotification = {
				id: `mensaje:${request.id}:${message.id}`,
				requestId: String(request.id),
				title: `Mensaje de ${senderName || fallback}`,
				body: preview ? preview.slice(0, 140) : 'Tenés un mensaje nuevo en la conversación.',
				createdAt: message.fechaEnvio ?? new Date().toISOString(),
				read: false,
			};
			this.notifications.update((items) => [notification, ...items].slice(0, MAX_NOTIFICATIONS));
			this.persistNotifications();
			void this.showBrowserNotification(notification, true);
		});
	}

	private rememberMessages(requestId: string, messages: ChatMessage[], userId: string): void {
		const key = `${MESSAGE_SNAPSHOT_KEY}:${userId}`;
		const snapshots = this.readJson<MessageSnapshot>(key, {});
		snapshots[requestId] = messages.map((message) => String(message.id)).slice(-200);
		this.writeJson(key, snapshots);
	}

	private async showBrowserNotification(item: AppNotification, showInForeground = false): Promise<void> {
		if (this.permission() !== 'granted'
			|| (!showInForeground && document.visibilityState === 'visible' && document.hasFocus())) return;
		const url = this.urlDeNotificacion(item);
		try {
			const registration = await this.registerWorker();
			if (registration) {
				await registration.showNotification(item.title, {
					body: item.body,
					icon: '/logo-cuadrado.png',
					badge: '/favicon.ico',
					tag: item.id,
					data: { url },
				});
			} else if (typeof Notification !== 'undefined') {
				const browserNotification = new Notification(item.title, {
					body: item.body,
					icon: '/logo-cuadrado.png',
					tag: `solicitud-${item.requestId}`,
				});
				browserNotification.onclick = () => window.location.assign(url);
			}
		} catch {
			// La bandeja Angular permanece disponible aunque el navegador bloquee notificaciones.
		}
	}

	private urlDeNotificacion(item: AppNotification): string {
		const query = new URLSearchParams({ solicitudId: item.requestId });
		if (item.id.startsWith('mensaje:')) query.set('abrirChat', 'true');
		return `/solicitudes?${query.toString()}`;
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