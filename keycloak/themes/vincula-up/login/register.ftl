<#import "template.ftl" as layout>
<#import "field.ftl" as field>
<#import "user-profile-commons.ftl" as userProfileCommons>
<#import "register-commons.ftl" as registerCommons>
<#import "password-validation.ftl" as validator>
<@layout.registrationLayout displayMessage=messagesPerField.exists('global') displayRequiredFields=true; section>
<!-- template: register.ftl -->

    <#if section = "header">
        <#if messageHeader??>
            ${kcSanitize(msg("${messageHeader}"))?no_esc}
        <#else>
            ${msg("registerTitle")}
        </#if>
    <#elseif section = "form">
        <form id="kc-register-form" class="${properties.kcFormClass!}" action="${url.registrationAction}" method="post" novalidate="novalidate">
            <@userProfileCommons.userProfileFormFields; callback, attribute>
                <#if callback = "afterField">
                    <#if passwordRequired?? && (attribute.name == 'username' || (attribute.name == 'email' && realm.registrationEmailAsUsername))>
                        <@field.password name="password" required=true label=msg("password") autocomplete="new-password"
                            placeholder=msg("passwordNewPlaceholder") helperText=msg("passwordRegisterHelper") />
                        <@field.password name="password-confirm" required=true label=msg("passwordConfirm") autocomplete="new-password"
                            placeholder=msg("passwordConfirmPlaceholder") helperText=msg("passwordConfirmHelper") />
                    </#if>
                </#if>
            </@userProfileCommons.userProfileFormFields>

            <@registerCommons.termsAcceptance/>

            <#if recaptchaRequired?? && (recaptchaVisible!false)>
                <div class="form-group">
                    <div class="${properties.kcInputWrapperClass!}">
                        <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}" data-action="${recaptchaAction}"></div>
                    </div>
                </div>
            </#if>

            <div class="pf-v5-c-form__group kc-form-actions-group">
                <div class="pf-v5-c-form__actions pf-v5-u-pt-xs kc-button-stack">
                    <#if recaptchaRequired?? && !(recaptchaVisible!false)>
                        <script>
                            function onSubmitRecaptcha(token) {
                                document.getElementById("kc-register-form").requestSubmit();
                            }
                        </script>
                        <button class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} g-recaptcha"
                                data-sitekey="${recaptchaSiteKey}" data-callback="onSubmitRecaptcha" data-action="${recaptchaAction}" type="submit" id="kc-submit">
                            ${msg("doRegisterSubmit")}
                        </button>
                    <#else>
                        <button class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!}" type="submit" id="kc-submit">
                            ${msg("doRegisterSubmit")}
                        </button>
                    </#if>
                    <a href="${url.loginUrl}" class="pf-v5-c-button pf-m-secondary pf-m-block">
                        ${msg("alreadyHaveAccountBack")}
                    </a>
                </div>
            </div>

        </form>

        <@validator.templates/>
        <@validator.script field="password"/>
    </#if>
</@layout.registrationLayout>
