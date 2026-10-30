<#import "template.ftl" as layout>
<#import "password-commons.ftl" as passwordCommons>
<#import "field.ftl" as field>
<#import "buttons.ftl" as buttons>
<#import "password-validation.ftl" as validator>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('password','password-confirm'); section>
<!-- template: login-update-password.ftl -->
    <#if section = "header">
        ${msg("updatePasswordTitle")}
    <#elseif section = "form">
        <form id="kc-passwd-update-form" class="${properties.kcFormClass!}" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post" novalidate="novalidate">
            <@field.password name="password-new" label=msg("passwordNew") fieldName="password" autocomplete="new-password" autofocus=true
                placeholder=msg("passwordNewPlaceholder") helperText=msg("passwordRegisterHelper") />
            <@field.password name="password-confirm" label=msg("passwordConfirm") autocomplete="new-password"
                placeholder=msg("passwordConfirmPlaceholder") helperText=msg("passwordConfirmHelper") />

            <div class="${properties.kcFormGroupClass!}">
                <@passwordCommons.logoutOtherSessions/>
            </div>

            <div class="pf-v5-c-form__group kc-form-actions-group">
                <div class="pf-v5-c-form__actions pf-v5-u-pt-xs kc-button-stack">
                    <button class="pf-v5-c-button pf-m-primary pf-m-block" id="kc-submit" name="login" type="submit">
                        ${msg("doSubmitNewPassword")}
                    </button>
                    <#if isAppInitiatedAction??>
                        <button class="pf-v5-c-button pf-m-secondary pf-m-block" id="kc-cancel" name="cancel-aia" type="submit">
                            ${msg("doCancel")}
                        </button>
                    </#if>
                </div>
            </div>
        </form>

        <@validator.templates/>
        <@validator.script field="password-new"/>
    </#if>
</@layout.registrationLayout>

