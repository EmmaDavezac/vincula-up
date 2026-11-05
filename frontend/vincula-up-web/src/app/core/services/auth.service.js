import { __decorate } from "tslib";
import { inject, Injectable, computed, effect, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { inicioDeSesion } from '../guards/role.guard';
import { FotoService } from './foto.service';
import { VERSION_TERMINOS } from '../../legal/terminos/terminos';
const TOKEN_KEY = 'vincula-up-token';
const REFRESH_TOKEN_KEY = 'vincula-up-refresh-token';
const ID_TOKEN_KEY = 'vincula-up-id-token';
const PROFILE_KEY = 'vincula-up-profile';
const KEYCLOAK_STATE_KEY = 'vincula-up-keycloak-state';
const KEYCLOAK_NONCE_KEY = 'vincula-up-keycloak-nonce';
const KEYCLOAK_PKCE_VERIFIER_KEY = 'vincula-up-pkce-verifier';
const PROF_ACTIVE_KEY = 'vincula-up-prof-active';
let AuthService = class AuthService {
    user = signal(this.restoreSession());
    http = inject(HttpClient);
    router = inject(Router);
    /**
     * Pide las fotos de perfil. No depende de AuthService (evitaría un ciclo), así
     * que el token se le pasa desde acá con `establecerToken`.
     */
    fotos = inject(FotoService);
    currentUser = this.user.asReadonly();
    isAuthenticated = computed(() => this.user() !== null);
    isProfessionalActive = signal(this.restoreProfActive());
    loginError = signal('');
    /** Evita reintentos en loop al refrescar el token tras una promoción de rol. */
    roleRefreshRequested = false;
    /** La foto propia y el estado legal se piden una sola vez por sesión. */
    photoRequested = false;
    /** Si el backend ya respondió sobre la cuenta. Antes de eso no se sabe. */
    cuentaConsultada = signal(false);
    errorConsultaCuenta = signal(false);
    verificandoCuenta = computed(() => this.user() !== null && !this.cuentaConsultada());
    cerrandoSesion = signal(false);
    loginRedirecting = signal(false);
    /** Si aceptó la versión vigente de los términos. */
    terminosAceptados = signal(false);
    /**
     * Estado de la animación de autenticación (verificación de credenciales / inicio de sesión).
     * Disimula las consultas iniciales y evita el renderizado prematuro del modal de términos.
     */
    estadoAuth = signal('inactivo');
    cargandoAuth = computed(() => this.estadoAuth() !== 'inactivo');
    mensajeCarga = signal('Iniciando sesión...');
    detalleCarga = signal('Preparando tu cuenta...');
    tiempoInicioCarga = 0;
    iniciarCargaAuth(estado, mensaje, detalle) {
        this.tiempoInicioCarga = Date.now();
        this.estadoAuth.set(estado);
        this.mensajeCarga.set(mensaje);
        this.detalleCarga.set(detalle);
    }
    finalizarCargaAuth() {
        if (this.estadoAuth() === 'inactivo') {
            return;
        }
        const minDuracion = 450;
        const transcurrido = Date.now() - this.tiempoInicioCarga;
        const restante = Math.max(0, minDuracion - transcurrido);
        setTimeout(() => {
            this.estadoAuth.set('inactivo');
        }, restante);
    }
    constructor() {
        this.fotos.establecerToken(this.getToken());
        const tieneCodeCallback = typeof window !== 'undefined' &&
            Boolean(window.location.search) &&
            window.location.search.includes('code=') &&
            window.location.search.includes('state=');
        if (tieneCodeCallback) {
            this.iniciarCargaAuth('verificando_credenciales', 'Verificando credenciales de acceso...', 'Validando tu cuenta con la Universidad Popular...');
        }
        else if (this.user()) {
            this.iniciarCargaAuth('iniciando_sesion', 'Iniciando sesión...', 'Verificando estado de la cuenta...');
        }
        this.handleCodeCallback();
        // La foto de perfil se pide sola cuando hay sesión con token: así el avatar
        // aparece con la foto real sin importar si la navbar estaba en pantalla antes
        // del login o después (login por callback de Keycloak).
        if (this.user()) {
            this.loadOwnPhoto();
        }
        effect(() => {
            const user = this.user();
            if (user) {
                this.loadOwnPhoto();
            }
        });
        if (this.user()?.role === 'PROFESIONAL') {
            this.checkProfessionalStatus();
        }
    }
    loginWithKeycloak() {
        this.loginError.set('');
        this.loginRedirecting.set(true);
        this.iniciarCargaAuth('verificando_credenciales', 'Redirigiendo a inicio de sesión...', 'Conectando con el servidor de autenticación...');
        const state = this.randomValue();
        const nonce = this.randomValue();
        sessionStorage.setItem(KEYCLOAK_STATE_KEY, state);
        sessionStorage.setItem(KEYCLOAK_NONCE_KEY, nonce);
        const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/` : environment.keycloakRedirectUri;
        // Generar PKCE code_verifier y code_challenge (S256) requerido por el realm
        this.generatePkce().then(({ verifier, challenge }) => {
            sessionStorage.setItem(KEYCLOAK_PKCE_VERIFIER_KEY, verifier);
            const params = new URLSearchParams({
                client_id: environment.keycloakClientId,
                response_type: 'code',
                redirect_uri: redirectUri,
                scope: 'openid profile email',
                state,
                nonce,
                response_mode: 'query',
                code_challenge: challenge,
                code_challenge_method: 'S256',
            });
            const authorizeUrl = `${this.getKeycloakUrl()}/realms/${environment.keycloakRealm}/protocol/openid-connect/auth?${params.toString()}`;
            window.location.href = authorizeUrl;
        }).catch(() => {
            this.loginRedirecting.set(false);
            this.loginError.set('No se pudo preparar el inicio de sesión. Intentá nuevamente.');
        });
        return of(true);
    }
    /**
     * Abre la página de registro del realm. Los clientes se auto-gestionan y un
     * profesional invitado crea acá su cuenta con el email que cargó el
     * administrador: al entrar por primera vez el sistema lo reconoce por email y
     * le otorga el rol PROFESIONAL.
     */
    registerWithKeycloak() {
        this.loginError.set('');
        const state = this.randomValue();
        const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/` : environment.keycloakRedirectUri;
        // Se reutiliza la misma clave de state que el login: el callback lo valida igual.
        sessionStorage.setItem(KEYCLOAK_STATE_KEY, state);
        // PKCE (S256) es obligatorio en el realm: la URL de registro debe
        // construirse DESPUÉS de generar el challenge, no antes.
        this.generatePkce().then(({ verifier, challenge }) => {
            sessionStorage.setItem(KEYCLOAK_PKCE_VERIFIER_KEY, verifier);
            const params = new URLSearchParams({
                client_id: environment.keycloakClientId,
                response_type: 'code',
                redirect_uri: redirectUri,
                scope: 'openid profile email',
                state,
                response_mode: 'query',
                code_challenge: challenge,
                code_challenge_method: 'S256',
            });
            window.location.href =
                `${this.getKeycloakUrl()}/realms/${environment.keycloakRealm}/protocol/openid-connect/registrations?${params.toString()}`;
        });
    }
    loginDirect(username, password = 'password') {
        this.loginError.set('');
        this.iniciarCargaAuth('verificando_credenciales', 'Verificando credenciales de acceso...', 'Validando credenciales con la Universidad Popular...');
        const body = new HttpParams()
            .set('grant_type', 'password')
            .set('client_id', environment.keycloakClientId)
            .set('username', username)
            .set('password', password)
            .set('scope', 'openid profile email');
        const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
        const tokenUrl = `${this.getKeycloakUrl()}/realms/${environment.keycloakRealm}/protocol/openid-connect/token`;
        return this.http.post(tokenUrl, body.toString(), { headers }).pipe(switchMap((token) => {
            this.iniciarCargaAuth('iniciando_sesion', 'Iniciando sesión...', 'Preparando tu cuenta y verificando el perfil...');
            return this.maybeUseToken(token);
        }), 
        // Igual que en el callback de Keycloak: al entrar se va a la sección del rol.
        tap((ok) => {
            if (ok) {
                void this.irASeccionDelRol();
            }
            else {
                this.finalizarCargaAuth();
            }
        }), catchError((error) => {
            this.loginError.set(this.describeError(error, 'No se pudo iniciar sesión con las credenciales indicadas.'));
            this.finalizarCargaAuth();
            return of(false);
        }));
    }
    logout() {
        this.cerrandoSesion.set(true);
        this.estadoAuth.set('inactivo');
        this.cuentaConsultada.set(false);
        this.terminosAceptados.set(false);
        const idToken = localStorage.getItem(ID_TOKEN_KEY);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(ID_TOKEN_KEY);
        localStorage.removeItem(PROFILE_KEY);
        localStorage.removeItem(PROF_ACTIVE_KEY);
        this.user.set(null);
        this.isProfessionalActive.set(false);
        // La próxima sesión vuelve a pedir la foto de la cuenta nueva.
        this.photoRequested = false;
        // Las fotos cacheadas eran de la sesión que termina: se liberan las URLs blob
        // para no dejarlas colgadas y para que la cuenta siguiente no las herede.
        this.fotos.limpiar();
        // Cerrar la sesión en Keycloak (RP-Initiated Logout)
        // Sin esto, Keycloak recuerda la sesión SSO y loguea automáticamente
        const postLogoutUri = typeof window !== 'undefined' ? `${window.location.origin}/` : environment.keycloakRedirectUri;
        const params = new URLSearchParams({
            client_id: environment.keycloakClientId,
            post_logout_redirect_uri: postLogoutUri,
        });
        if (idToken) {
            params.set('id_token_hint', idToken);
        }
        const logoutUrl = `${this.getKeycloakUrl()}/realms/${environment.keycloakRealm}/protocol/openid-connect/logout?${params.toString()}`;
        window.setTimeout(() => {
            window.location.href = logoutUrl;
        }, 120);
    }
    refreshSession() {
        const session = this.restoreSession();
        this.user.set(session);
        if (session?.role !== 'PROFESIONAL') {
            this.setProfessionalActive(false);
        }
    }
    hasRole(role) {
        return this.user()?.role === role;
    }
    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }
    getKeycloakId() {
        const token = this.getToken();
        if (!token)
            return null;
        const claims = this.decodeToken(token);
        return claims?.sub ?? null;
    }
    handleCodeCallback() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const returnedState = params.get('state');
        const storedState = sessionStorage.getItem(KEYCLOAK_STATE_KEY);
        if (!code || !returnedState || returnedState !== storedState) {
            if (this.estadoAuth() === 'verificando_credenciales') {
                this.finalizarCargaAuth();
            }
            return;
        }
        this.loginRedirecting.set(true);
        sessionStorage.removeItem(KEYCLOAK_STATE_KEY);
        sessionStorage.removeItem(KEYCLOAK_NONCE_KEY);
        // Recuperar el code_verifier PKCE generado en loginWithKeycloak()
        const codeVerifier = sessionStorage.getItem(KEYCLOAK_PKCE_VERIFIER_KEY) ?? '';
        sessionStorage.removeItem(KEYCLOAK_PKCE_VERIFIER_KEY);
        // Limpiar params de la URL para evitar re-ejecución al recargar
        if (typeof window !== 'undefined' && window.history) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        this.loginError.set('');
        this.iniciarCargaAuth('verificando_credenciales', 'Verificando credenciales de acceso...', 'Validando tu cuenta con la Universidad Popular...');
        const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/` : environment.keycloakRedirectUri;
        let body = new HttpParams()
            .set('grant_type', 'authorization_code')
            .set('client_id', environment.keycloakClientId)
            .set('code', code)
            .set('redirect_uri', redirectUri)
            .set('scope', 'openid profile email');
        // Incluir code_verifier (obligatorio cuando se usó PKCE)
        if (codeVerifier) {
            body = body.set('code_verifier', codeVerifier);
        }
        const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
        const tokenUrl = `${this.getKeycloakUrl()}/realms/${environment.keycloakRealm}/protocol/openid-connect/token`;
        this.http.post(tokenUrl, body.toString(), { headers })
            .pipe(switchMap((token) => {
            this.iniciarCargaAuth('iniciando_sesion', 'Iniciando sesión...', 'Preparando tu cuenta y verificando el perfil...');
            return this.maybeUseToken(token);
        }), catchError((error) => {
            this.loginRedirecting.set(false);
            this.loginError.set(this.describeError(error, 'No se pudo completar el inicio de sesión.'));
            this.finalizarCargaAuth();
            return of(false);
        }))
            .subscribe((ok) => {
            // El login se completa de forma asíncrona: cuando vuelve del proveedor el
            // router ya pasó por la landing (aún sin token), así que acá se entra
            // derecho a la sección del rol y la portada queda inaccesible.
            if (ok) {
                void this.irASeccionDelRol().finally(() => this.loginRedirecting.set(false));
            }
            else {
                this.loginRedirecting.set(false);
                this.finalizarCargaAuth();
            }
        });
    }
    /** Lleva a la sección que corresponde al rol con sesión (ver `inicioDeSesion`). */
    irASeccionDelRol() {
        return this.router.navigateByUrl(inicioDeSesion(this.user()?.role), { replaceUrl: true });
    }
    maybeUseToken(token) {
        try {
            const claims = this.decodeToken(token.access_token);
            if (!claims || !claims.sub || !claims.role) {
                this.loginError.set('La respuesta de autenticación no incluye el rol necesario para Vincula-UP.');
                return of(false);
            }
            const lookupParams = new HttpParams()
                .set('keycloakId', claims.sub)
                .set('email', claims.email ?? '')
                .set('nombre', claims.name ?? '')
                .set('rol', claims.role ?? '');
            const lookupHeaders = new HttpHeaders({ Authorization: `Bearer ${token.access_token}` });
            return this.http.get(`${environment.apiUrl}/usuarios/por-keycloak`, { params: lookupParams, headers: lookupHeaders }).pipe(map((usuario) => {
                const profile = {
                    id: usuario.id,
                    name: `${usuario.nombre} ${usuario.apellido}`.trim(),
                    role: usuario.rolNegocio,
                    roleLabel: this.roleLabel(usuario.rolNegocio),
                    // Se completa en `loadOwnPhoto`, que consulta la cuenta: acá todavía
                    // no se sabe si hay foto.
                    tieneFoto: Boolean(usuario.fotoUrl && usuario.fotoUrl.trim().length > 0),
                };
                this.persistSession(token, profile);
                return true;
            }), catchError(() => {
                const profile = {
                    id: claims.sub ?? '',
                    name: claims.name ?? 'Usuario Vincula-UP',
                    role: claims.role,
                    roleLabel: this.roleLabel(claims.role),
                    tieneFoto: false,
                };
                this.persistSession(token, profile);
                return of(true);
            }));
        }
        catch {
            this.loginError.set('No se pudo procesar la respuesta del servidor de autenticación.');
            return of(false);
        }
    }
    /**
     * Guarda la sesión (access + refresh token) y dispara las tareas posteriores
     * al login. Se usa tanto en el login exitoso como en el fallback cuando
     * ms-usuarios todavía no responde.
     */
    persistSession(token, profile) {
        localStorage.setItem(TOKEN_KEY, token.access_token);
        if (token.refresh_token)
            localStorage.setItem(REFRESH_TOKEN_KEY, token.refresh_token);
        if (token.id_token)
            localStorage.setItem(ID_TOKEN_KEY, token.id_token);
        this.persistProfile(profile);
        this.user.set(profile);
        // El token es nuevo (login o refresh): el FotoService lo necesita a mano
        // para poder pedir las fotos con el header de autorización.
        this.fotos.establecerToken(token.access_token);
        if (profile.role === 'PROFESIONAL') {
            this.checkProfessionalStatus();
        }
        this.loginError.set('');
        this.sincronizarRolConKeycloak(token.access_token, profile);
        // La foto se pide apenas hay token: al terminar el login el avatar ya muestra
        // la imagen real (o iniciales, si la cuenta todavía no tiene foto).
        this.loadOwnPhoto();
    }
    /**
     * Un profesional invitado se auto-registra con el rol CLIENTE por defecto: el
     * backend le otorga PROFESIONAL en Keycloak durante ese primer login, pero el
     * token ya emitido sigue diciendo CLIENTE. Acá pedimos un token nuevo para que
     * el rol viaje actualizado y pueda activar su perfil. Se intenta una sola vez.
     */
    sincronizarRolConKeycloak(accessToken, profile) {
        if (profile.role !== 'PROFESIONAL' || this.tokenRole(accessToken) === 'PROFESIONAL' || this.roleRefreshRequested) {
            return;
        }
        this.roleRefreshRequested = true;
        this.refreshAccessToken().subscribe(() => {
            this.roleRefreshRequested = false;
        });
    }
    /**
     * Canjea el refresh token por un access token nuevo. Keycloak re-evalúa los
     * roles al emitirlo, así el token refleja la promoción recién aplicada.
     */
    refreshAccessToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            return of(false);
        }
        const body = new HttpParams()
            .set('grant_type', 'refresh_token')
            .set('client_id', environment.keycloakClientId)
            .set('refresh_token', refreshToken);
        const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
        const tokenUrl = `${this.getKeycloakUrl()}/realms/${environment.keycloakRealm}/protocol/openid-connect/token`;
        return this.http.post(tokenUrl, body.toString(), { headers }).pipe(switchMap((token) => this.maybeUseToken(token)), catchError(() => of(false)));
    }
    getRefreshToken() {
        if (typeof localStorage === 'undefined')
            return null;
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    tokenRole(token) {
        return this.decodeToken(token)?.role;
    }
    restoreSession() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            localStorage.removeItem(PROFILE_KEY);
            return null;
        }
        const payload = this.decodeToken(token);
        if (!payload || !payload.role || !this.isValidRole(payload.role)) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(PROFILE_KEY);
            return null;
        }
        const savedProfile = localStorage.getItem(PROFILE_KEY);
        if (savedProfile) {
            try {
                const parsed = JSON.parse(savedProfile);
                if (parsed && parsed.id && parsed.role && this.isValidRole(parsed.role)) {
                    // Normaliza el campo: los perfiles guardados antes de que existiera
                    // `tieneFoto` (guardaban la URL de la foto) llegan sin él.
                    return { ...parsed, tieneFoto: parsed.tieneFoto === true };
                }
            }
            catch {
                localStorage.removeItem(PROFILE_KEY);
            }
        }
        return {
            id: payload.sub ?? '',
            name: payload.name ?? 'Usuario Vincula-UP',
            role: payload.role,
            roleLabel: this.roleLabel(payload.role),
            tieneFoto: false,
        };
    }
    restoreProfActive() {
        if (typeof localStorage === 'undefined')
            return false;
        return localStorage.getItem(PROF_ACTIVE_KEY) === 'true';
    }
    checkProfessionalStatus() {
        this.loadProfessionalStatus().subscribe();
    }
    /**
     * Datos de la cuenta con sesión: la foto de perfil y el estado legal.
     *
     * <p>Una sola llamada contra {@code /api/usuarios/yo} trae las dos cosas: si hay
     * foto para que la pida el {@link FotoService}, y si aceptó los términos
     * vigentes. Se consulta una vez por sesión. Si algo falla (servidor caído, cuenta
     * suspendida, sin permiso) el avatar cae a iniciales y la navegación sigue.
     *
     * <p>Ante un fallo no se da el estado legal por conocido: `terminosPendientes`
     * devuelve {@code true} y el modal se queda esperando, en vez de dejar pasar a
     * alguien que no aceptó.
     */
    loadOwnPhoto(force = false) {
        const current = this.user();
        if (!current) {
            this.finalizarCargaAuth();
            return;
        }
        // Sin token todavía (p. ej. la navbar se montó antes de completar el login):
        // no se marca como pedida para reintentar cuando la sesión esté lista.
        const token = this.getToken();
        if (!token) {
            this.finalizarCargaAuth();
            return;
        }
        if (!force && this.photoRequested) {
            return;
        }
        this.photoRequested = true;
        this.errorConsultaCuenta.set(false);
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        this.http
            .get(`${environment.apiUrl}/usuarios/yo`, { headers })
            .pipe(map((cuenta) => {
            const tieneFoto = Boolean(cuenta?.fotoUrl && cuenta.fotoUrl.trim().length > 0);
            this.refreshProfile({ tieneFoto });
            this.cuentaConsultada.set(true);
            this.errorConsultaCuenta.set(false);
            // La versión vigente la publica el frontend (es donde vive el texto):
            // si cambió lo que aceptó, hay que volver a pedirlo.
            this.terminosAceptados.set(cuenta?.terminosAceptado === true && cuenta.terminosVersion === VERSION_TERMINOS);
            if (tieneFoto) {
                this.fotos.cargar(cuenta.id);
            }
            return cuenta;
        }), catchError(() => {
            this.photoRequested = false;
            this.cuentaConsultada.set(true);
            this.errorConsultaCuenta.set(true);
            return of(null);
        }), finalize(() => {
            this.finalizarCargaAuth();
        }))
            .subscribe();
    }
    reintentarConsultaCuenta() {
        this.loadOwnPhoto(true);
    }
    /**
     * Si hay que pedir los términos y condiciones.
     *
     * <p>Es {@code true} con sesión abierta y habiendo verificado la cuenta
     * sin aceptación de la versión vigente. No se muestra antes de consultar la
     * cuenta: durante la consulta se muestra la animación de inicio de sesión.
     */
    terminosPendientes = computed(() => {
        if (!this.user()) {
            return false;
        }
        if (!this.cuentaConsultada()) {
            return false;
        }
        return !this.terminosAceptados();
    });
    /** Registra la aceptación. La versión viaja al backend para quede registrada. */
    registrarAceptacionTerminos() {
        const headers = new HttpHeaders({ Authorization: `Bearer ${this.getToken() ?? ''}` });
        return this.http
            .patch(`${environment.apiUrl}/terminos/aceptar`, { version: VERSION_TERMINOS }, { headers })
            .pipe(tap(() => this.terminosAceptados.set(true)));
    }
    /**
     * Refresca los datos visibles de la sesión (nombre/email) tras editar el perfil
     * en "Mi cuenta", sin obligar a un re-login.
     */
    refreshProfile(patch) {
        const current = this.user();
        if (!current)
            return;
        const updated = {
            ...current,
            id: patch.id ?? current.id,
            name: patch.name ?? current.name,
            tieneFoto: patch.tieneFoto ?? current.tieneFoto,
        };
        this.user.set(updated);
        try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
        }
        catch {
            /* almacenamiento no disponible: se mantiene la sesión en memoria */
        }
    }
    loadProfessionalStatus() {
        const currentUser = this.user();
        if (!currentUser || currentUser.role !== 'PROFESIONAL') {
            this.setProfessionalActive(false);
            return of(false);
        }
        const token = this.getToken();
        const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
        const keycloakId = this.getKeycloakId();
        let params = new HttpParams().set('usuarioId', currentUser.id);
        if (keycloakId) {
            params = params.set('keycloakId', keycloakId);
        }
        return this.http.get(`${environment.apiUrl}/profesionales/mi-perfil`, {
            params,
            headers,
        }).pipe(catchError(() => of(null)), map((perfil) => perfil?.estado === 'ACTIVO' && this.user()?.id === currentUser.id), tap((active) => this.setProfessionalActive(active)));
    }
    setProfessionalActive(active) {
        this.isProfessionalActive.set(active);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(PROF_ACTIVE_KEY, active ? 'true' : 'false');
        }
    }
    persistProfile(profile) {
        try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        }
        catch {
            // ignore storage errors
        }
    }
    decodeToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length < 2) {
                return null;
            }
            const payload = parts[1];
            const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
            const decoded = JSON.parse(atob(normalized));
            const realmRoles = [
                ...(Array.isArray(decoded.realm_access?.roles) ? decoded.realm_access.roles : []),
                ...(Array.isArray(decoded.roles) ? decoded.roles : []),
            ];
            const directRole = typeof decoded.role === 'string' ? decoded.role : undefined;
            const matchedRole = realmRoles.find((r) => this.isValidRole(r));
            const role = directRole && this.isValidRole(directRole) ? directRole : matchedRole;
            const name = decoded.name ?? `${decoded.given_name ?? ''} ${decoded.family_name ?? ''}`.trim() ?? decoded.preferred_username;
            return {
                sub: decoded.sub,
                name: name || 'Usuario Vincula-UP',
                email: decoded.email,
                role: role != null && this.isValidRole(role) ? role : undefined,
            };
        }
        catch {
            return null;
        }
    }
    describeError(error, fallback = 'No se pudo completar la operación.') {
        const status = typeof error === 'object' && error ? Number(error.status ?? 0) : 0;
        const message = typeof error === 'object' && error
            ? String(error.message ?? '')
            : '';
        const payload = typeof error === 'object' && error && 'error' in error
            ? error.error
            : undefined;
        const backendMessage = payload?.message ?? payload?.message ?? message;
        if (status === 401) {
            return 'Necesitás volver a iniciar sesión para continuar.';
        }
        if (status === 403 || /forbidden|denied|permiso/i.test(backendMessage)) {
            return 'No tenés permiso para realizar esta acción.';
        }
        if (status === 404) {
            return 'El recurso solicitado no está disponible en este momento.';
        }
        if (status === 409 || /conflict|estado/i.test(backendMessage)) {
            if (backendMessage) {
                return backendMessage.charAt(0).toUpperCase() + backendMessage.slice(1);
            }
            return 'La solicitud ya está en un estado distinto y no se puede mover ahora.';
        }
        if (backendMessage) {
            return backendMessage;
        }
        return fallback;
    }
    roleLabel(role) {
        return {
            CLIENTE: 'Cliente',
            PROFESIONAL: 'Profesional',
            ADMIN: 'Administrador',
        }[role] ?? role;
    }
    isValidRole(role) {
        return role === 'CLIENTE' || role === 'PROFESIONAL' || role === 'ADMIN';
    }
    randomValue() {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    async generatePkce() {
        // Generar un code_verifier aleatorio de 64 bytes (base64url)
        const verifierBytes = new Uint8Array(64);
        crypto.getRandomValues(verifierBytes);
        const verifier = btoa(String.fromCharCode(...verifierBytes))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        // Calcular code_challenge = BASE64URL(SHA256(verifier))
        const encoded = new TextEncoder().encode(verifier);
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
        const hashArray = new Uint8Array(hashBuffer);
        const challenge = btoa(String.fromCharCode(...hashArray))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        return { verifier, challenge };
    }
    getKeycloakUrl() {
        if (typeof window !== 'undefined') {
            const { hostname } = window.location;
            // En desarrollo la app corre en `ng serve` (puerto 4200) sin nada por delante,
            // así que se habla directo con Keycloak. En cualquier otro host la sirve nginx,
            // que hace de proxy de /realms/, /js/, /resources/ y /login-actions/ hacia
            // Keycloak: usar el mismo origen deja todo el flujo OIDC en el mismo sitio
            // (sin CORS ni mixed content) y hace que funcione en los túneles de
            // Cloudflare, cuyo hostname cambia cada vez que se levanta cloudflared.
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return `http://${hostname}:8080`;
            }
            return window.location.origin;
        }
        return environment.keycloakUrl;
    }
};
AuthService = __decorate([
    Injectable({ providedIn: 'root' })
], AuthService);
export { AuthService };
