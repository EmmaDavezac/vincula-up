<#import "field.ftl" as field>
<#import "footer.ftl" as loginFooter>
<#--
    ENVOLTURA DE TODAS LAS PANTALLAS DE ACCESO DE VINCULA-UP.

    Por qué se sobreescribe: la original de `keycloak.v2` pone en el `<head>` un
    `<title>` con el nombre técnico del realm ("Inicia sesión en vincula-up") y
    en el header el mismo nombre con la clase de fábrica. Eso es lo único de la
    página que dice de qué servidor viene, y en un formulario de ingreso tiene
    que verse la marca de la aplicación, no la de Keycloak.

    Qué se cambió respecto del original, y solo esto:

      1. El `<title>` y el favicon (en el `<head>`).
      2. El bloque `<header id="kc-header">`, que ahora lleva el logo y el
         nombre de la marca.
      3. Una clase `kc-page-title` en el `<h1>`, para que el CSS de la marca lo
         pueda alcanzar sin depender del texto que cada pantalla pone ahí.

    Todo lo demás es copia LITERAL de `theme/keycloak.v2/login/template.ftl` de
    Keycloak 26.3.3. A propósito: es el punto de extensión único que hay para
    cambiar el chrome de la página, y las macros `username` y
    `registrationLayout` las invocan todos los .ftl del flujo (login, registro,
    recuperación, verificación, cambio de clave y logout), así que lo demás se
    deja igual salvo que se entienda muy bien por qué.

    ── OJO al actualizar Keycloak ────────────────────────────────────────────
    Este archivo es una copia de una versión concreta del tema de fábrica. Si se
    actualiza Keycloak hay que volver a compararlo contra
    `theme/keycloak.v2/login/template.ftl` del JAR nuevo y portar los cambios de
    la plantilla original. El resto del tema (CSS, messages, footer) no depende
    de la versión y se actualiza solo.

    ── Nada de ?html ni ?no_esc acá ───────────────────────────────────────────
    Keycloak 26 compila las plantillas con el auto-escape de FreeMarker prendido.
    Ver la nota del tema de correo: escribir `${algo?html}` corta TODO el render.
-->
<#macro username>
  <#assign label>
    <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
  </#assign>
  <@field.group name="username" label=label>
    <div class="${properties.kcInputGroup}">
      <div class="${properties.kcInputGroupItemClass} ${properties.kcFill}">
        <span class="${properties.kcInputClass} ${properties.kcFormReadOnlyClass}">
          <input id="kc-attempted-username" value="${auth.attemptedUsername}" readonly>
        </span>
      </div>
      <div class="${properties.kcInputGroupItemClass}">
        <button id="reset-login" class="${properties.kcFormPasswordVisibilityButtonClass} kc-login-tooltip" type="button" 
              aria-label="${msg('restartLoginTooltip')}" onclick="location.href='${url.loginRestartFlowUrl}'">
            <i class="fa-sync-alt fas" aria-hidden="true"></i>
            <span class="kc-tooltip-text">${msg("restartLoginTooltip")}</span>
        </button>
      </div>
    </div>
  </@field.group>
</#macro>

<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}" lang="${lang}"<#if realm.internationalizationEnabled> dir="${(locale.rtl)?then('rtl','ltr')}"</#if>>

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow">
    <meta name="color-scheme" content="light${darkMode?then(' dark', '')}">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>
    <#--
        Título y favicon con la marca.

        El original era `${msg("loginTitle", realm.displayName)}`, que con el
        realm `vincula-up` daba "Inicia sesión en vincula-up": el nombre técnico
        del realm, en minúsculas y sin decir de qué aplicación es la pantalla.
        Se reemplaza por un texto fijo con el nombre de la marca, que es lo que
        corresponde en un formulario de acceso de la app.

        El favicon sale de `resources/img/` del propio tema (misma geometría que
        `frontend/vincula-up-web/public/favicon.svg`). Va como SVG: el original
        pedía un `.ico` y el navegador caería en el favicon de Keycloak.

        Este comentario usa la sintaxis de FreeMarker y no la de HTML a
        propósito: el de FreeMarker no se emite al navegador, el otro viaja en
        cada respuesta que se le sirve a quien intenta ingresar.
    -->
    <title>${msg("vinculaUpLoginTitle")}</title>
    <link rel="icon" type="image/svg+xml" href="${url.resourcesPath}/img/favicon.svg" />
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <script type="importmap">
        {
            "imports": {
                "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
            }
        }
    </script>
    <#if darkMode>
      <script type="module" async blocking="render">
          const DARK_MODE_CLASS = "${properties.kcDarkModeClass}";
          const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

          updateDarkMode(mediaQuery.matches);
          mediaQuery.addEventListener("change", (event) => updateDarkMode(event.matches));

          function updateDarkMode(isEnabled) {
            const { classList } = document.documentElement;

            if (isEnabled) {
              classList.add(DARK_MODE_CLASS);
            } else {
              classList.remove(DARK_MODE_CLASS);
            }
          }
      </script>
    </#if>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
    <script type="module">
        import { startSessionPolling } from "${url.resourcesPath}/js/authChecker.js";

        startSessionPolling(
            "${url.ssoLoginInOtherTabsUrl?no_esc}"
        );
    </script>
    <script type="module">
        document.addEventListener("click", (event) => {
            const link = event.target.closest("a[data-once-link]");

            if (!link) {
                return;
            }

            if (link.getAttribute("aria-disabled") === "true") {
                event.preventDefault();
                return;
            }

            const { disabledClass } = link.dataset;

            if (disabledClass) {
                link.classList.add(...disabledClass.trim().split(/\s+/));
            }

            link.setAttribute("role", "link");
            link.setAttribute("aria-disabled", "true");
        });
    </script>
    <#if authenticationSession??>
        <script type="module">
            import { checkAuthSession } from "${url.resourcesPath}/js/authChecker.js";

            checkAuthSession(
                "${authenticationSession.authSessionIdHash}"
            );
        </script>
    </#if>
    <script>
      // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1404468
      const isFirefox = true;
    </script>
</head>

<body id="keycloak-bg" class="${properties.kcBodyClass!}" data-page-id="login-${pageId}">
<div class="${properties.kcLogin!}">
  <div class="${properties.kcLoginContainer!}">
    <#--
        CABECERA CON LA MARCA.

        El original ponía el nombre del realm con la clase de fábrica
        (`pf-v5-c-brand`), que lo deja en mayúsculas y con el tracking de la
        marca de Keycloak. Se reemplaza por el bloque de marca de la app: el
        cuadro coral con la V y el nombre al lado, igual que el `.vu-brand-mark`
        y el `.vu-brand-name` del frontend. Las clases `vu-*` son las mismas que
        usa `styles.css`, así que la cabecera se ve igual que la barra de la app.

        El nombre va escrito, no solo como imagen: si el SVG no cargara o
        alguien lo bloqueara, el texto sigue diciendo qué plataforma es.

        El subtítulo va aparte porque es el que dice qué es la plataforma.

        El logo no se descarga como imagen a propósito: el cuadro coral con la V
        se dibuja con CSS (`.vu-brand-mark`), igual que en el frontend. Así se
        ve nítido en cualquier densidad de píxeles y la marca queda descrita en
        un solo lugar, el CSS. El único recurso gráfico del tema es el favicon.
    -->
    <header id="kc-header" class="pf-v5-c-login__header vu-header">
      <div class="vu-brand">
        <span class="vu-brand-mark" aria-hidden="true">V</span>
        <span class="vu-brand-name">Vincula<em>-UP</em></span>
      </div>
      <p class="vu-header__tagline">${msg("vinculaUpTagline")}</p>
    </header>
    <main class="${properties.kcLoginMain!}">
      <div class="${properties.kcLoginMainHeader!}">
        <h1 class="${properties.kcLoginMainTitle!} kc-page-title" id="kc-page-title"><#nested "header"></h1>
        <#if realm.internationalizationEnabled  && locale.supported?size gt 1>
        <div class="${properties.kcLoginMainHeaderUtilities!}">
          <div class="${properties.kcInputClass!}">
            <select
              aria-label="${msg("languages")}"
              id="login-select-toggle"
              onchange="if (this.value) window.location.href=this.value"
            >
              <#list locale.supported?sort_by("label") as l>
                <option
                  value="${l.url}"
                  ${(l.languageTag == locale.currentLanguageTag)?then('selected','')}
                >
                  ${l.label}
                </option>
              </#list>
            </select>
            <span class="${properties.kcFormControlUtilClass}">
              <span class="${properties.kcFormControlToggleIcon!}">
                <svg
                  class="pf-v5-svg"
                  viewBox="0 0 320 512"
                  fill="currentColor"
                  aria-hidden="true"
                  role="img"
                  width="1em"
                  height="1em"
                >
                  <path
                    d="M31.3 192h257.3c17.8 0 26.7 21.5 14.1 34.1L174.1 354.8c-7.8 7.8-20.5 7.8-28.3 0L17.2 226.1C4.6 213.5 13.5 192 31.3 192z"
                  >
                  </path>
                </svg>
              </span>
            </span>
          </div>
        </div>
        </#if>
      </div>
      <div class="${properties.kcLoginMainBody!}">
        <#if !(auth?has_content && auth.showUsername() && !auth.showResetCredentials())>
            <#if displayRequiredFields>
                <div class="${properties.kcContentWrapperClass!}">
                    <div class="${properties.kcLabelWrapperClass!} subtitle">
                        <span class="${properties.kcInputHelperTextItemTextClass!}">
                          <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
                        </span>
                    </div>
                </div>
            </#if>
        <#else>
            <#if displayRequiredFields>
                <div class="${properties.kcContentWrapperClass!}">
                    <div class="${properties.kcLabelWrapperClass!} subtitle">
                        <span class="${properties.kcInputHelperTextItemTextClass!}">
                          <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
                        </span>
                    </div>
                    <div class="${properties.kcFormClass} ${properties.kcContentWrapperClass}">
                        <#nested "show-username">
                        <@username />
                    </div>
                </div>
            <#else>
                <div class="${properties.kcFormClass} ${properties.kcContentWrapperClass}">
                  <#nested "show-username">
                  <@username />
                </div>
            </#if>
        </#if>

        <#-- App-initiated actions should not see warning messages about the need to complete the action -->
        <#-- during login.                                                                               -->
        <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
            <div class="${properties.kcAlertClass!} pf-m-${(message.type = 'error')?then('danger', message.type)}">
                <div class="${properties.kcAlertIconClass!}">
                    <#if message.type = 'success'><span class="${properties.kcFeedbackSuccessIcon!}"></span></#if>
                    <#if message.type = 'warning'><span class="${properties.kcFeedbackWarningIcon!}"></span></#if>
                    <#if message.type = 'error'><span class="${properties.kcFeedbackErrorIcon!}"></span></#if>
                    <#if message.type = 'info'><span class="${properties.kcFeedbackInfoIcon!}"></span></#if>
                </div>
                <span class="${properties.kcAlertTitleClass!} kc-feedback-text">${kcSanitize(message.summary)?no_esc}</span>
            </div>
        </#if>

        <#nested "form">

        <#if auth?has_content && auth.showTryAnotherWayLink()>
          <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post" novalidate="novalidate">
              <input type="hidden" name="tryAnotherWay" value="on"/>
              <a id="try-another-way" href="javascript:document.forms['kc-select-try-another-way-form'].requestSubmit()"
                  class="${properties.kcButtonSecondaryClass} ${properties.kcButtonBlockClass} ${properties.kcMarginTopClass}">
                    ${kcSanitize(msg("doTryAnotherWay"))?no_esc}
              </a>
          </form>
        </#if>

          <div class="${properties.kcLoginMainFooter!}">
              <#nested "socialProviders">

              <#if displayInfo>
                  <div id="kc-info" class="${properties.kcLoginMainFooterBand!} ${properties.kcFormClass}">
                      <div id="kc-info-wrapper" class="${properties.kcLoginMainFooterBandItem!}">
                          <#nested "info">
                      </div>
                  </div>
              </#if>
          </div>
      </div>

        <div class="${properties.kcLoginMainFooter!}">
            <@loginFooter.content/>
        </div>
    </main>
  </div>
</div>
</body>
</html>
</#macro>
