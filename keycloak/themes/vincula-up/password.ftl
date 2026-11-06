<!DOCTYPE html>
<html lang="${localeLanguage}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${messages.password}</title>
    <style>
        @import url('/theme/css/style.css');
        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--surface-input);
            color: var(--ink);
            margin: 0; padding: 0;
        }
        .password-page {
            max-width: 400px; margin: 2rem auto; padding: 2rem;
            background: var(--surface-card); border: 1px solid var(--line);
            border-radius: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .password-header {
            background: linear-gradient(135deg, var(--coral) 0%, #e84343 100%);
            color: white; padding: 1.5rem; border-radius: 0.5rem 0.5rem 0 0;
            text-align: center; margin-bottom: 1.5rem;
        }
        .password-header h1 { font-size: 2rem; font-weight: 700; margin: 0; }
        .password-form { padding: 0 1rem 1rem; }
        .password-form h2 { color: var(--ink); font-size: 1.5rem; margin: 0 0 1.5rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); margin-bottom: 0.25rem; }
        .form-group input { width: 100%; box-sizing: border-box; border: 1px solid var(--line); border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; background-color: var(--surface-input); color: var(--ink); margin-bottom: 0.5rem; }
        .form-group input:focus { border-color: var(--coral); outline: none; box-shadow: 0 0 0 3px rgba(227, 95, 67, 0.15); }
        .password-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
        .password-actions a { color: var(--coral); text-decoration: underline; font-size: 0.875rem; }
        .global-error { background-color: var(--alert-error-bg); color: var(--alert-error-ink); border: 1px solid var(--alert-error-ink); border-radius: 0.375rem; padding: 0.75rem 1rem; margin-bottom: 1rem; }
        .global-success { background-color: var(--alert-success-bg); color: var(--alert-info-ink); border: 1px solid #c6e2b8; border-radius: 0.375rem; padding: 0.75rem 1rem; margin-bottom: 1rem; }
    </style>
</head>
<body>
<div class="password-page">
    <div class="password-header">
        <h1>${messages.password}</h1>
    </div>
    <div class="password-form">
        <form action="${postUrl}" method="POST">
            <input type="hidden" name="${_csrf.parameterName}" value="${_csrf.token}">
            <div class="form-group">
                <label for="code">${messages.code}</label>
                <input type="text" id="code" name="code" required>
            </div>
            <div class="form-group">
                <label for="newPassword">${messages.newPassword}</label>
                <input type="password" id="newPassword" name="newPassword" required>
            </div>
            <div class="password-actions">
                <button type="submit" class="kc-btn_primary">${messages.resetPassword}</button>
            </div>
        </form>
    </div>
    <div class="footer-brand">Vincula-UP</div>
</div>
</body>
</html>
