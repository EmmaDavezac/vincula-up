import { __decorate } from "tslib";
import { Injectable, signal } from '@angular/core';
let ToastService = class ToastService {
    toasts = signal([]);
    seq = 0;
    timers = new Map();
    error(message, duration = 8000) { return this.show('error', message, duration); }
    success(message, duration = 4000) { return this.show('success', message, duration); }
    info(message, duration = 5000) { return this.show('info', message, duration); }
    show(kind, message, duration) {
        if (!message?.trim())
            return -1;
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
    dismiss(id) {
        clearTimeout(this.timers.get(id));
        this.timers.delete(id);
        this.toasts.update((lista) => lista.filter((t) => t.id !== id));
    }
    clear() {
        this.timers.forEach((t) => clearTimeout(t));
        this.timers.clear();
        this.toasts.set([]);
    }
    programar(id, duration) {
        clearTimeout(this.timers.get(id));
        if (duration > 0) {
            this.timers.set(id, setTimeout(() => this.dismiss(id), duration));
        }
    }
};
ToastService = __decorate([
    Injectable({ providedIn: 'root' })
], ToastService);
export { ToastService };
