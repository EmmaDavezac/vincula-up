import { __decorate } from "tslib";
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { avisoClase, avisoError, avisoExito, coincideBusqueda, } from '../../core/models/admin';
import { ApiService } from '../../core/services/api.service';
import { MatListModule } from '@angular/material/list';
import { VuConfirm } from '../../shared/confirm/confirm';
import { VuIcon } from '../../shared/icon/icon';
import { VuSkeletonList } from '../../shared/skeleton-list/skeleton-list';
/**
 * Catálogo de categorías (especialidades): alta, renombre y baja. La baja falla con
 * un mensaje del backend cuando la especialidad está asignada a un profesional.
 */
let AdminCategories = class AdminCategories {
    api = inject(ApiService);
    router = inject(Router);
    categories = signal([]);
    loading = signal(true);
    busy = signal(false);
    busqueda = signal('');
    consulta = computed(() => this.busqueda().trim());
    categoriasFiltradas = computed(() => {
        const query = this.consulta();
        return this.categories().filter((category) => coincideBusqueda(query, category.nombre));
    });
    hayBusqueda() {
        return this.consulta().length > 0;
    }
    limpiarBusqueda() {
        this.busqueda.set('');
    }
    /** Aviso de la última acción: ahora distingue éxito de error. */
    aviso = signal({ texto: '', tipo: 'info' });
    avisoClase = avisoClase;
    /**
     * Renombrar y eliminar pasan por el diálogo: antes el borrado usaba el
     * `window.confirm` del navegador y el renombrado no preguntaba nada.
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
    constructor() {
        this.leerAvisoDeAlta();
        this.cargar();
    }
    /** Mensaje que deja la pantalla de alta al volver con `navigate(..., { state })`. */
    leerAvisoDeAlta() {
        const state = this.router.getCurrentNavigation()?.extras.state;
        const mensaje = state?.['mensaje'];
        if (!mensaje)
            return;
        this.aviso.set(avisoExito(mensaje));
    }
    renamingId = signal(null);
    renameValue = '';
    /*
     * El alta de una categoría se hace en otra pantalla (`/admin/categorias/nueva`),
     * así que el catálogo ya no lleva el formulario encima. Quedan el renombre y la
     * baja, que se operan sobre cada tarjeta.
     */
    cargar() {
        this.loading.set(true);
        this.api.getSpecialties().pipe(map((items) => (items ?? [])), catchError((error) => {
            this.aviso.set(avisoError(this.api.describeError(error, 'No se pudieron cargar las categorías.')));
            return of([]);
        })).subscribe((items) => {
            this.categories.set(items);
            this.loading.set(false);
        });
    }
    startRename(category) {
        this.aviso.set({ texto: '', tipo: 'info' });
        this.renamingId.set(category.id);
        this.renameValue = category.nombre;
    }
    cancelRename() {
        this.renamingId.set(null);
    }
    /** Renombrar: primero valida, después pide confirmación con el nombre nuevo. */
    saveRename(category) {
        const nombre = this.renameValue.trim();
        if (!nombre) {
            this.aviso.set(avisoError('El nombre de la categoría no puede quedar vacío.'));
            return;
        }
        if (nombre === category.nombre) {
            this.cancelRename();
            return;
        }
        this.confirmacion.set({
            titulo: 'Renombrar la categoría',
            mensaje: `¿Cambiás "${category.nombre}" por "${nombre}"?`,
            detalle: 'La especialidad queda con el nombre nuevo para los profesionales que la tengan asignada.',
            confirmar: 'Renombrar',
            icono: 'pencil',
            ejecutar: () => this.ejecutarRenombrado(category, nombre),
        });
    }
    ejecutarRenombrado(category, nombre) {
        this.busy.set(true);
        this.api.saveSpecialty(category.id, nombre).pipe(catchError((error) => {
            this.busy.set(false);
            this.aviso.set(avisoError(this.api.describeError(error, 'No se pudo renombrar la categoría.')));
            return of(null);
        })).subscribe((result) => {
            this.busy.set(false);
            if (result) {
                this.renamingId.set(null);
                this.aviso.set(avisoExito(`La categoría ahora se llama "${nombre}".`));
                this.cargar();
            }
        });
    }
    /** Borrado real del catálogo: pide confirmación y avisa que no se puede deshacer. */
    deleteCategory(category) {
        this.confirmacion.set({
            titulo: 'Eliminar la categoría',
            mensaje: `¿Eliminar "${category.nombre}" del catálogo?`,
            detalle: 'Es un borrado real: la especialidad desaparece de la lista y no se puede recuperar. Si hay profesionales con esta especialidad asignada, la operación se rechaza.',
            confirmar: 'Eliminar',
            peligro: true,
            icono: 'tag',
            ejecutar: () => this.ejecutarBorrado(category),
        });
    }
    ejecutarBorrado(category) {
        this.busy.set(true);
        this.api.deleteSpecialty(category.id).pipe(map(() => true), catchError((error) => {
            this.busy.set(false);
            this.aviso.set(avisoError(this.api.describeError(error, 'No se pudo eliminar la categoría.')));
            return of(false);
        })).subscribe((deleted) => {
            this.busy.set(false);
            if (deleted) {
                this.aviso.set(avisoExito(`"${category.nombre}" se eliminó del catálogo.`));
                this.cargar();
            }
        });
    }
};
AdminCategories = __decorate([
    Component({
        selector: 'app-admin-categories',
        imports: [FormsModule, RouterLink, MatListModule, VuConfirm, VuIcon, VuSkeletonList],
        templateUrl: './admin-categories.html',
        styleUrl: './admin-categories.css',
    })
], AdminCategories);
export { AdminCategories };
