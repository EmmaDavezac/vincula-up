import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
let AdminFooterComponent = class AdminFooterComponent {
    currentYear = new Date().getFullYear();
};
AdminFooterComponent = __decorate([
    Component({
        selector: 'app-admin-footer',
        standalone: true,
        imports: [RouterLink],
        templateUrl: './admin-footer.html',
        styleUrl: './admin-footer.css',
    })
], AdminFooterComponent);
export { AdminFooterComponent };
