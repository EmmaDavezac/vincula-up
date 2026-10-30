<#macro actionGroup horizontal=false>
  <div class="${properties.kcFormGroupClass!} kc-form-actions-group">
    <div class="${properties.kcFormActionGroupClass!} <#if horizontal>pf-v5-u-flex-nowrap<#else>pf-v5-u-flex-wrap</#if> kc-button-stack">
      <#nested>
    </div>
  </div>
</#macro>

<#macro button label id="" name="" class=["kcButtonPrimaryClass"] extra...>
  <button class="<#list class as c>${properties[c]!c} </#list>" name="${name}" id="${id}"
          type="submit" <#list extra as attrName, attrVal>${attrName}="${attrVal}"</#list>>
  ${kcSanitize(msg(label))?no_esc}
  </button>
</#macro>

<#macro buttonLink href label id="" class=["kcButtonSecondaryClass"]>
  <a id="${id}" href="${href}" class="<#list class as c>${properties[c]!c} </#list>">${kcSanitize(msg(label))?no_esc}</a>
</#macro>

<#macro loginButton>
  <div class="pf-v5-c-form__group kc-form-actions-group">
    <div class="pf-v5-c-form__actions pf-v5-u-pt-xs kc-button-stack">
      <button class="pf-v5-c-button pf-m-primary pf-m-block" name="login" id="kc-login" type="submit">
        ${msg("doLogIn")}
      </button>
    </div>
  </div>
</#macro>

