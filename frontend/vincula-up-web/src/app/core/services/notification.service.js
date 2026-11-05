import { __decorate } from "tslib";
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { catchError, of, switchMap, timer } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { RequestService } from './request.service';
const NOTIFICATION_KEY = 'vincula-up-notifications';
const SNAPSHOT_KEY = 'vincula-up-request-statuses';
const POLL_INTERVAL_MS = 30_000;
const MAX_NOTIFICATIONS = 40;
let NotificationService = class NotificationService {
    auth = inject(AuthService);
    api = inject(ApiService);
    requests = inject(RequestService);
    destroyRef = inject(DestroyRef);
    notifications = signal([]);
    permission = signal(this.readPermission());
    unreadCount = computed(() => this.notifications().filter((item) => !item.read).length);
    workerRegistration = null;
    localStatusChanges = new Map();
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
            this.notifications.set(this.readJson(storageKey, []));
            let knownSnapshot = this.readJson(snapshotKey, null);
            const alias = this.auth.getKeycloakId();
            const requestOptions = {
                rol: user.role,
                tipo: user.role === 'PROFESIONAL' ? 'RECIBIDAS' : 'ENVIADAS',
                aliasIds: alias && alias !== user.id ? [alias] : [],
            };
            const pollSubscription = timer(0, POLL_INTERVAL_MS).pipe(switchMap(() => this.api.getMyRequests(user.id, requestOptions).pipe(catchError(() => of(null))))).subscribe((items) => {
                if (!items)
                    return;
                const previous = this.readJson(snapshotKey, knownSnapshot);
                const current = {};
                for (const request of items) {
                    const id = String(request.id);
                    const localStatus = this.localStatusChanges.get(id);
                    if (localStatus && request.status !== localStatus) {
                        current[id] = localStatus;
                        continue;
                    }
                    if (localStatus === request.status)
                        this.localStatusChanges.delete(id);
                    current[id] = request.status;
                    const oldStatus = previous?.[id];
                    if (oldStatus && oldStatus !== request.status) {
                        this.requests.updateStatus(request.id, request.status);
                        this.addStatusNotification(request);
                    }
                    else if (!oldStatus && previous && user.role === 'PROFESIONAL' && request.status === 'PENDIENTE') {
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
    async enableBrowserNotifications() {
        if (typeof Notification === 'undefined') {
            this.permission.set('unsupported');
            return;
        }
        try {
            this.permission.set(await Notification.requestPermission());
            if (this.permission() === 'granted')
                await this.registerWorker();
        }
        catch {
            this.permission.set(Notification.permission);
        }
    }
    markAllRead() {
        this.notifications.update((items) => items.map((item) => ({ ...item, read: true })));
        this.persistNotifications();
    }
    clear() {
        this.notifications.set([]);
        this.persistNotifications();
    }
    markStatusHandledLocally(requestId, status) {
        const user = this.auth.currentUser();
        if (!user)
            return;
        const key = `${SNAPSHOT_KEY}:${user.id}`;
        const snapshot = this.readJson(key, {});
        snapshot[String(requestId)] = status;
        this.localStatusChanges.set(String(requestId), status);
        this.writeJson(key, snapshot);
    }
    addStatusNotification(request) {
        const statusCopy = {
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
        const notification = {
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
    async showBrowserNotification(item) {
        if (this.permission() !== 'granted' || (document.visibilityState === 'visible' && document.hasFocus()))
            return;
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
            }
            else if (typeof Notification !== 'undefined') {
                new Notification(item.title, { body: item.body, icon: '/logo-cuadrado.png', tag: `solicitud-${item.requestId}` });
            }
        }
        catch {
            // La bandeja Angular permanece disponible aunque el navegador bloquee notificaciones.
        }
    }
    async registerWorker() {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator))
            return null;
        this.workerRegistration ??= navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .catch(() => null);
        return this.workerRegistration;
    }
    readPermission() {
        return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
    }
    persistNotifications() {
        const user = this.auth.currentUser();
        if (user)
            this.writeJson(`${NOTIFICATION_KEY}:${user.id}`, this.notifications());
    }
    readJson(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        }
        catch {
            return fallback;
        }
    }
    writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        }
        catch {
            // El estado sigue vigente mientras la página permanezca abierta.
        }
    }
};
NotificationService = __decorate([
    Injectable({ providedIn: 'root' })
], NotificationService);
export { NotificationService };
