import { __decorate } from "tslib";
import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
let VuToasts = class VuToasts {
    toast = inject(ToastService);
};
VuToasts = __decorate([
    Component({
        selector: 'vu-toasts',
        template: `
    <div class="toasts">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast toast--' + t.kind" [attr.role]="t.kind === 'error' ? 'alert' : 'status'">
          <span class="toast__msg">{{ t.message }}</span>
          <button type="button" class="toast__close" aria-label="Cerrar aviso" (click)="toast.dismiss(t.id)">×</button>
        </div>
      }
    </div>
  `,
        styleUrl: './toasts.css',
    })
], VuToasts);
export { VuToasts };
