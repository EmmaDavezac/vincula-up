<#--
    PIE DE LAS PANTALLAS DE ACCESO.

    Este es el punto de extensión que el tema base declara explícitamente: la
    macro `content` viene vacía en `keycloak.v2` y dice que se puede sobreescribir
    para declarar un pie propio. Se llama desde el final del `<main>` en
    `template.ftl`, así que el pie queda DENTRO de la tarjeta, abajo del
    formulario y del "¿Usuario nuevo? Regístrate".

    Qué se pone y por qué:

    · La cadena institucional, que es lo que hace falta para que cualquiera que
      llegue a esta pantalla sepa a qué proyecto está accediendo. Es el mismo
      texto que el pie del frontend (`shared/footer`) y que el de los correos.

    · La casilla de contacto, como enlace `mailto:`. Es el mismo dato que
     .Keycloak_CONTACTO y que el pie del correo.

    · El enlace a la app, montado con `properties.vinculaUpAppUrl`, que se
      lee de `theme.properties` (igual que hace el pie del tema de CORREO).

    ── Por qué NO se usa `url.realmUri` ───────────────────────────────────────
    La primera versión lo usaba y rompía TODAS las pantallas de acceso con un
    HTTP 500: `url.realmUri` no existe en el contexto de las plantillas del
    login (las de Keycloak 26 exponen `url.resourcesPath`, `url.loginAction`,
    `url.registrationUrl` y poco más). La URL pública de la app no viene por
    ahí, y menos en un despliegue donde el hostname cambia.
-->
<#macro content>
    <#--
        URL pública de la app. Viene de theme.properties y NO del realm: el
        contexto del login sí expone el realm, pero la URL depende del despliegue
        (el hostname cambia detrás de un túnel de Cloudflare), así que es un
        valor de configuración del tema, igual que en el tema de correo. Si
        quedara vacía, el bloque no se imprime.
    -->
    <#assign appUrl = ''>
    <#if properties??>
        <#if properties.vinculaUpAppUrl??>
            <#assign appUrl = properties.vinculaUpAppUrl>
        </#if>
    </#if>

    <div class="kc-footer">
        <p class="kc-footer__line">
            <strong>Vincula-UP</strong> · Universidad Popular de Concepción del Uruguay
        </p>
        <#if realm.attributes.vinculaUpContacto?? && realm.attributes.vinculaUpContacto?has_content>
        <p class="kc-footer__line kc-footer__line--muted">
            ¿Algún problema con tu cuenta?
            <a href="mailto:${realm.attributes.vinculaUpContacto}">${realm.attributes.vinculaUpContacto}</a>
        </p>
        </#if>
        <#if appUrl?has_content>
        <p class="kc-footer__line kc-footer__line--muted">
            <a href="${appUrl}">Ir a Vincula-UP</a>
        </p>
        </#if>
    </div>
</#macro>