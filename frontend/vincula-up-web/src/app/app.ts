import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar';
import { FooterComponent } from './shared/footer/footer';
import { VuTabbar } from './shared/tabbar/tabbar';
import { TerminosModal } from './legal/terminos-modal';
import { AuthLoading } from './shared/auth-loading/auth-loading';
import { VuToasts } from './shared/toasts/toasts';
import { OperationFeedback } from './shared/operation-feedback/operation-feedback';

@Component({
  imports: [RouterOutlet, NavbarComponent, FooterComponent, VuTabbar, TerminosModal, AuthLoading, VuToasts, OperationFeedback],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
}