<#--
    Envoltura de TODOS los correos de Vincula-UP.

    Por qué se sobreescribe la del tema `keycloak`: la original es
        <html><body><#nested></body></html>
    y nada más. Sin <head> no hay charset declarado (los clientes adivinan la
    codificación y los acentos salen mal), ni <meta viewport> (en el celular
    el correo se ve a 980 px de ancho), ni forma de escribir la regla de modo
    oscuro, que sí se puede poner acá porque este archivo NO pasa por
    kcSanitize: el sanitize solo envuelve el cuerpo que viene del bundle de
    mensajes.

    ── OJO: nada de ?html en este archivo ────────────────────────────────────
    Keycloak 26 compila las plantillas con el auto-escape de FreeMarker prendido
    y el formato de salida HTML. Escribir ${algo?html} hace fallar TODO el
    envío con un ParseException: "Using ?html (legacy escaping) is not allowed
    when auto-escaping is on". El escape ya lo hace el motor, así que se
    escribe ${algo} y nada más.

    ── Configuración ─────────────────────────────────────────────────────
    El contacto y la URL de la app salen de email/theme.properties, no de
    atributos del realm: ver el comentario de más abajo, donde se explica por
    qué. Si la URL queda vacía el correo NO pide el logo y se ve igual.
-->
<#macro emailLayout>
<!DOCTYPE html>
<html lang="${locale.language}" dir="${(ltr)?then('ltr','rtl')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Vincula-UP</title>
<style>
    /* Reglas de modo oscuro. Los clientes de correo que respetan
       prefers-color-scheme aplican esto; los que no, se quedan con el
       claro que traen los estilos en línea (que es el color por defecto
       explícito de la etiqueta). Por eso el color va SIEMPRE en línea:
       acá solo se pisa para el cliente que soporta modo oscuro. */
    @media (prefers-color-scheme: dark) {
        .vu-fondo     { background-color: #161d1f !important; }
        .vu-tarjeta   { background-color: #1d2422 !important; }
        .vu-texto     { color: #e8edea !important; }
        .vu-tenue     { color: #9aa8a2 !important; }
        .vu-borde     { border-color: #33403b !important; }
        .vu-banda     { background-color: #c34f3d !important; }
        .vu-dato      { background-color: #242b28 !important; }
    }
</style>
</head>
<body class="vu-fondo" style="margin:0; padding:0; background-color:#f3f5f1; -webkit-text-size-adjust:100%;">

<#assign contacto = 'vinculaup@gmail.com'>
<#assign appUrl   = ''>
<#--
    Contacto y URL de la app.

    Se leen de `properties`, que Keycloak arma con theme.properties. La primera
    versión usaba realm.attributes[...] y NO funcionaba: el contexto de las
    plantillas de CORREO de Keycloak no trae la variable `realm` (las del login
    sí), así que el atributo se ignoraba y la imagen del logo no aparecía.
    `properties` sí está siempre.

    Por eso los dos valores viven en email/theme.properties y se editan ahí.
-->
<#if properties??>
  <#if properties.vinculaUpContacto??>
    <#assign contacto = properties.vinculaUpContacto>
  </#if>
  <#if properties.vinculaUpAppUrl??>
    <#assign appUrl = properties.vinculaUpAppUrl>
  </#if>
</#if>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="vu-fondo" style="background-color:#f3f5f1;">
<tr><td align="center" style="padding:24px 12px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="vu-tarjeta" style="width:600px; max-width:600px; background-color:#fffdf8; border:1px solid #d8d8ce; border-radius:10px;">

    <!-- Cabecera: la banda coral con la marca -->
    <tr><td class="vu-banda" style="background-color:#e35f43; border-radius:10px 10px 0 0; padding:24px 32px;">
      <#if appUrl?has_content>
        <img src="${appUrl}/logo-cuadrado.png" width="40" height="40" alt="Vincula-UP" style="display:block; border:0; width:40px; height:40px; margin:0 auto 10px auto;">
      </#if>
      <div class="vu-texto" style="color:#ffffff; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:20px; font-weight:600; letter-spacing:0.2px; text-align:center; line-height:1.3;">
        Vincula-UP
      </div>
      <div style="color:#fbe6e0; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; text-align:center; line-height:1.5; margin-top:2px;">
        Red técnica con respaldo universitario
      </div>
    </td></tr>

    <!-- Cuerpo: lo que aporta el bundle de mensajes -->
    <tr><td class="vu-texto" style="color:#1e2926; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:1.65; padding:32px;">
      <#nested>
    </td></tr>

    <!-- Pie: quién escribe, por qué y a quién responder -->
    <tr><td class="vu-borde vu-dato" style="background-color:#f3f5f1; border-top:1px solid #d8d8ce; border-radius:0 0 10px 10px; padding:20px 32px;">
      <p class="vu-texto" style="color:#1e2926; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; margin:0;">
        <strong>Vincula-UP</strong> · Universidad Popular de Concepción del Uruguay
      </p>
      <p class="vu-tenue" style="color:#67716c; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; margin:4px 0 0 0;">
        Recibiste este mensaje porque tenés una cuenta en la plataforma.
        ¿Dudas o algún problema? Escribinos a
        <a href="mailto:${contacto}" style="color:#c34f3d; text-decoration:underline;">${contacto}</a>.
      </p>
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>
</#macro>