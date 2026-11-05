import { Injectable, signal } from '@angular/core';

export type ToastKind = 'error' | 'success' | 'info';
export interface Toast { id: number; kind: ToastKind; message: string; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  error(message: string, duration = 8000) { return this.show('error', message, duration); }
  success(message: string, duration = 4000) { return this.show('success', message, duration); }
  info(message: string, duration = 5000) { return this.show('info', message, duration); }

  show(kind: ToastKind, message: string, duration: number): number {
    if (!message?.trim()) return -1;
    // Mismo aviso ya visible: no se apila, solo se reinicia el temporizador.
    const repetido = this.toasts().find((t) => t.kind === kind && t.message === message);
    if (repetido) {
      this.programar(repetido.id, duration);
      return repetido.id;
    }
    const id = ++this.seq;
    this.toasts.update((lista) => [...lista.slice(-2), { id, kind, message }]);
    this.programar(id, duration);
    return id;
  }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.toasts.update((lista) => lista.filter((t) => t.id !== id));
  }

  clear(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.toasts.set([]);
  }

  private programar(id: number, duration: number): void {
    clearTimeout(this.timers.get(id));
    if (duration > 0) {
      this.timers.set(id, setTimeout(() => this.dismiss(id), duration));
    }
  }
}