<#import "template.ftl" as layout>
<#import "field.ftl" as field>
<#import "buttons.ftl" as buttons>
<@layout.registrationLayout displayInfo=true displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "header">
        ${msg("emailForgotTitle")}
    <#elseif section = "form">
        <form id="kc-reset-password-form" class="${properties.kcFormClass!}" action="${url.loginAction}" method="post">
            <#assign label>
                <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
            </#assign>
            <@field.input name="username" label=label value=auth.attemptedUsername!'' autofocus=true
                placeholder=msg("emailPlaceholder") helperText=msg("resetPasswordHelper") />

            <div class="pf-v5-c-form__group kc-form-actions-group">
                <div class="pf-v5-c-form__actions pf-v5-u-pt-xs kc-button-stack">
                    <button class="pf-v5-c-button pf-m-primary pf-m-block" name="" id="kc-form-buttons" type="submit">
                        ${msg("doSubmitResetPassword")}
                    </button>
                    <a id="kc-back-to-login" href="${url.loginUrl}" class="pf-v5-c-button pf-m-secondary pf-m-block">
                        ${msg("backToLogin")}
                    </a>
                </div>
            </div>
        </form>
    <#elseif section = "info" >
        <span class="${properties.kcLoginMainFooterHelperText!} kc-reset-instruction">
            <#if realm.duplicateEmailsAllowed>
                ${msg("emailInstructionUsername")}
            <#else>
                ${msg("emailInstruction")}
            </#if>
        </span>
    </#if>
</@layout.registrationLayout>
