import { __decorate } from "tslib";
import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { avisoClase, avisoError, avisoExito, coincideBusqueda, estadoClase, estadoLabel, inicialesDe, nombreCompleto, } from '../../core/models/admin';
import { ApiService } from '../../core/services/api.service';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { VuAvatar } from '../../shared/avatar/avatar';
import { VuConfirm } from '../../shared/confirm/confirm';
import { VuIcon } from '../../shared/icon/icon';
import { VuSkeletonList } from '../../shared/skeleton-list/skeleton-list';
/**
 * Clientes registrados: actividad (solicitudes realizadas), estado de la cuenta y
 * suspensión/reactivación. Los clientes se registran solos desde "Crear cuenta", así
 * que el panel sólo gestiona el acceso.
 */
let AdminClients = class AdminClients {
    api = inject(ApiService);
    dialog = inject(MatDialog);
    clientDetailDialog;
    detailDialogRef;
    clients = signal([]);
    loading = signal(true);
    /** Aviso de la última acción: ahora distingue éxito de error. */
    aviso = signal({ texto: '', tipo: 'info' });
    avisoClase = avisoClase;
    /**
     * Activar o desactivar una cuenta cambia lo que la persona puede hacer, así que
     * ambas pasan por confirmación antes de ejecutarse.
     */
    confirmacion = signal(null);
    confirmarAccion() {
        const pendiente = this.confirmacion();
        if (!pendiente) {
            return;
        }
        this.confirmacion.set(null);
        pendiente.ejecutar();
    }
    cancelarAccion() {
        this.confirmacion.set(null);
    }
    busyId = signal(null);
    /** Solicitudes por cliente, para la columna de actividad. */
    solicitudesPorCliente = signal(new Map());
    // ── Buscador ────────────────────────────────────────────────────────
    busqueda = signal('');
    /** Texto de la búsqueda ya recortado. */
    consulta = computed(() => this.busqueda().trim());
    /** Nombre, email y teléfono: los textos por los que se puede buscar. */
    textoBuscable(client) {
        return [nombreCompleto(client), client.email, client.telefono];
    }
    /**
     * Clientes que se muestran, con su actividad y ordenados de mayor a menor uso.
     * Filtra por la búsqueda (nombre, email o teléfono, sin distinguir mayúsculas ni
     * acentos). El filtrado es local: la pantalla ya carga la lista completa, y con
     * el campo vacío devuelve todo.
     */
    clientesOrdenados = computed(() => {
        const conteo = this.solicitudesPorCliente();
        const q = this.consulta();
        return [...this.clients()]
            .map((client) => ({ client, solicitudes: conteo.get(client.id) ?? 0 }))
            .filter((item) => coincideBusqueda(q, ...this.textoBuscable(item.client)))
            .sort((a, b) => b.solicitudes - a.solicitudes);
    });
    hayBusqueda() {
        return this.consulta().length > 0;
    }
    limpiarBusqueda() {
        this.busqueda.set('');
    }
    activos = computed(() => this.clients().filter((client) => this.estaActivo(client)).length);
    constructor() {
        this.cargar();
    }
    cargar() {
        this.loading.set(true);
        forkJoin({
            clientes: this.api.getUsers('CLIENTE').pipe(map((items) => (items ?? [])), catchError((error) => {
                this.aviso.set(avisoError(this.api.describeError(error, 'No se pudo cargar la lista de clientes.')));
                return of([]);
            })),
            solicitudes: this.api.getAdminRequests().pipe(map((items) => this.contarPorCliente(items ?? [])), catchError(() => of(new Map()))),
        }).subscribe(({ clientes, solicitudes }) => {
            this.clients.set(clientes);
            this.solicitudesPorCliente.set(solicitudes);
            this.loading.set(false);
        });
    }
    contarPorCliente(solicitudes) {
        const conteo = new Map();
        for (const solicitud of solicitudes) {
            conteo.set(solicitud.clienteId, (conteo.get(solicitud.clienteId) ?? 0) + 1);
        }
        return conteo;
    }
    /**
     * Detalle del cliente. Es de solo lectura: muestra los datos de la cuenta y
     * permite activar o desactivar el acceso. Los datos de contacto no se editan
     * desde acá, los edita la persona desde "Mi cuenta".
     *
     * <p>La suspensión y la reactivación salen de acá y no de la fila: en una
     * lista, un botón rojo junto a cada nombre invita a apretarlo sin querer.
     */
    modal = signal(null);
    abrirDetalle(client) {
        this.aviso.set({ texto: '', tipo: 'info' });
        this.modal.set(client);
        this.detailDialogRef = this.dialog.open(this.clientDetailDialog, {
            ariaLabel: 'Detalle del cliente',
            ariaModal: true,
            maxWidth: 'min(38rem, calc(100vw - 2rem))',
            panelClass: 'vu-details-dialog',
        });
        this.detailDialogRef.afterClosed().subscribe(() => this.modal.set(null));
    }
    cerrarDetalle() {
        this.detailDialogRef?.close();
        this.modal.set(null);
    }
    // ── Acceso ─────────────────────────────────────────────────────────
    /** Desactivar o reactivar la cuenta: siempre con confirmación previa. */
    toggleAccess(client) {
        const suspendiendo = this.estaActivo(client);
        this.confirmacion.set({
            titulo: suspendiendo ? 'Desactivar la cuenta' : 'Reactivar la cuenta',
            mensaje: suspendiendo
                ? `¿Desactivás la cuenta de ${this.nombre(client)}?`
                : `¿Reactivás la cuenta de ${this.nombre(client)}?`,
            detalle: suspendiendo
                ? 'No podrá entrar al panel ni hacer pedidos hasta que se reactive. Sus solicitudes y calificaciones se conservan.'
                : 'Vuelve a poder entrar al panel y hacer pedidos.',
            confirmar: suspendiendo ? 'Desactivar' : 'Reactivar',
            peligro: suspendiendo,
            icono: suspendiendo ? 'pause' : 'play',
            ejecutar: () => this.ejecutarCambioDeAcceso(client, suspendiendo),
        });
    }
    ejecutarCambioDeAcceso(client, suspendiendo) {
        this.busyId.set(client.id);
        const peticion = suspendiendo ? this.api.suspendUser(client.id) : this.api.reactivateUser(client.id);
        peticion.pipe(map(() => true), catchError((error) => {
            this.busyId.set(null);
            this.aviso.set(avisoError(this.api.describeError(error, suspendiendo ? 'No se pudo desactivar la cuenta.' : 'No se pudo reactivar la cuenta.')));
            return of(false);
        })).subscribe((ok) => {
            this.busyId.set(null);
            if (!ok) {
                return;
            }
            // Sólo se actualiza el estado en pantalla: recargar todo pisaba el cambio
            // con la foto vieja del backend.
            const estado = suspendiendo ? 'SUSPENDIDO' : 'ACTIVO';
            this.clients.update((items) => items.map((item) => (item.id === client.id ? { ...item, estado } : item)));
            // Si el detalle está abierto sobre esta misma cuenta, se lo actualiza para
            // que el botón no quede ofreciendo la acción que ya no corresponde.
            this.modal.update((abierto) => (abierto && abierto.id === client.id ? { ...abierto, estado } : abierto));
            this.aviso.set(avisoExito(suspendiendo
                ? `${this.nombre(client)} quedó desactivado y no puede entrar al panel.`
                : `La cuenta de ${this.nombre(client)} quedó reactivada.`));
        });
    }
    // ── Presentación ──────────────────────────────────────────────────────
    estadoLabel = estadoLabel;
    estadoClase = estadoClase;
    nombreCompleto = nombreCompleto;
    nombre(client) {
        return nombreCompleto(client);
    }
    iniciales(client) {
        return inicialesDe(this.nombre(client));
    }
    estaActivo(client) {
        return (client.estado ?? 'ACTIVO').toUpperCase() === 'ACTIVO';
    }
};
__decorate([
    ViewChild('clientDetailDialog')
], AdminClients.prototype, "clientDetailDialog", void 0);
AdminClients = __decorate([
    Component({
        selector: 'app-admin-clients',
        imports: [DatePipe, FormsModule, RouterLink, MatButtonModule, MatListModule, VuAvatar, VuConfirm, VuIcon, VuSkeletonList],
        templateUrl: './admin-clients.html',
        styleUrl: './admin-clients.css',
    })
], AdminClients);
export { AdminClients };
