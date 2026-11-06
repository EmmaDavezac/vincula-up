import { Injectable, signal } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';

export interface RealtimeChatMessage {
	id: string;
	solicitudId: string;
	emisorId: string;
	texto: string;
	fechaEnvio: string;
}

@Injectable({ providedIn: 'root' })
export class ChatRealtimeService {
	readonly connected = signal(false);
	readonly connectionFailed = signal(false);
	private client: Client | null = null;
	private subscription: StompSubscription | null = null;
	private currentRequestId: string | null = null;
	private onMessage: ((message: RealtimeChatMessage) => void) | null = null;

	connect(requestId: string, token: string, onMessage: (message: RealtimeChatMessage) => void): void {
		this.disconnect();
		this.currentRequestId = requestId;
		this.onMessage = onMessage;
		this.connectionFailed.set(false);
		const client = new Client({
			brokerURL: `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`,
			connectHeaders: { Authorization: `Bearer ${token}` },
			reconnectDelay: 2000,
			heartbeatIncoming: 10000,
			heartbeatOutgoing: 10000,
			debug: () => undefined,
		});
		client.onConnect = () => {
			if (this.client !== client || this.currentRequestId !== requestId) return;
			this.connected.set(true);
			this.connectionFailed.set(false);
			this.subscription = client.subscribe(`/topic/solicitudes/${requestId}`, (frame: IMessage) => {
				try {
					this.onMessage?.(JSON.parse(frame.body) as RealtimeChatMessage);
				} catch {
					// Se ignora un frame inválido sin interrumpir la sesión STOMP.
				}
			});
		};
		client.onWebSocketError = () => {
			this.connected.set(false);
			this.connectionFailed.set(true);
		};
		client.onWebSocketClose = () => {
			this.connected.set(false);
			if (client.active) this.connectionFailed.set(true);
		};
		client.onStompError = () => {
			this.connected.set(false);
			this.connectionFailed.set(true);
		};
		this.client = client;
		client.activate();
	}

	disconnect(): void {
		this.subscription?.unsubscribe();
		this.subscription = null;
		this.currentRequestId = null;
		this.onMessage = null;
		const client = this.client;
		this.client = null;
		this.connected.set(false);
		this.connectionFailed.set(false);
		if (client?.active) void client.deactivate();
	}
}