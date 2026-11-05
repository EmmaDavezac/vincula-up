import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-admin-footer',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './admin-footer.html',
	styleUrl: './admin-footer.css',
})
export class AdminFooterComponent {
	readonly currentYear = new Date().getFullYear();
}