import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
let FooterComponent = class FooterComponent {
    currentYear = new Date().getFullYear();
};
FooterComponent = __decorate([
    Component({
        selector: 'app-footer',
        standalone: true,
        imports: [RouterLink],
        templateUrl: './footer.html',
        styleUrl: './footer.css',
    })
], FooterComponent);
export { FooterComponent };
