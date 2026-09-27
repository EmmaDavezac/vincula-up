import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
* Contenedor del panel de administración.
*
* El panel ya no tiene shell propio: se navega con la barra superior del sitio
* (escritorio) o con la barra inferior compartida (móvil), igual que el resto de
* la aplicación. El footer del sitio sigue oculto acá, porque en un panel no
* aporta.
*/
@Component({
	selector: 'app-admin-layout',
	imports: [RouterOutlet],
	templateUrl: './admin-layout.html',
})
export class AdminLayout {}
