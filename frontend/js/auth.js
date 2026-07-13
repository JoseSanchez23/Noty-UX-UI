// ============================================================
//  MEJORAS UX IMPLEMENTADAS (Integrante 2)
//  1. Mensajes de error claros y específicos por campo
//  2. Feedback visual al enviar (spinner + botón deshabilitado)
//  3. Validación en tiempo real (email y contraseña)
//  4. Redirecciones con mensajes de éxito personalizados
// ============================================================

// ===== UTILIDADES ============================================

function showFieldError(fieldId, message) {
    const el = document.getElementById(fieldId + '-error');
    if (el) {
        el.textContent = message;
        el.style.display = message ? 'block' : 'none';
    }
}

function clearFieldErrors() {
    document.querySelectorAll('.error-message').forEach((el) => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showMessage(message, type = 'info', redirectUrl = null, delay = 2000) {
    const el = document.getElementById('message');
    if (el) {
        el.textContent = message;
        el.className = `message ${type}`;
        el.style.display = 'block';
        if (redirectUrl) {
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, delay);
        }
    }
}

function setLoading(isLoading) {
    const btn = document.getElementById('submit-btn');
    const text = document.getElementById('btn-text');
    const spinner = document.getElementById('btn-spinner');
    if (btn) {
        btn.disabled = isLoading;
        text.style.display = isLoading ? 'none' : 'inline';
        spinner.style.display = isLoading ? 'inline-block' : 'none';
    }
}

// ===== API ===================================================

async function apiRequest(endpoint, data) {
    const res = await fetch(`http://localhost:3000/api${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
        throw new Error(json.message || 'Error en la solicitud');
    }
    return json;
}

// ===== TOKENS ================================================

function saveToken(token) {
    localStorage.setItem('token', token);
}

function saveUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// ===== VALIDACIÓN EN TIEMPO REAL =============================

const emailInput = document.getElementById('email');
if (emailInput) {
    emailInput.addEventListener('blur', function () {
        const val = this.value.trim();
        if (val && !isValidEmail(val)) {
            showFieldError('email', 'Ingresa un correo válido (ej: usuario@dominio.com)');
        } else {
            showFieldError('email', '');
        }
    });
}

const passwordInput = document.getElementById('password');
if (passwordInput) {
    passwordInput.addEventListener('input', function () {
        const val = this.value;
        if (val.length > 0 && val.length < 6) {
            showFieldError('password', 'La contraseña debe tener al menos 6 caracteres');
        } else {
            showFieldError('password', '');
        }
    });
}

// ===== LOGIN =================================================

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);
        clearFieldErrors();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email) {
            showFieldError('email', 'El correo es obligatorio');
            setLoading(false);
            return;
        }
        if (!isValidEmail(email)) {
            showFieldError('email', 'Ingresa un correo válido');
            setLoading(false);
            return;
        }
        if (!password) {
            showFieldError('password', 'La contraseña es obligatoria');
            setLoading(false);
            return;
        }
        if (password.length < 6) {
            showFieldError('password', 'La contraseña debe tener al menos 6 caracteres');
            setLoading(false);
            return;
        }

        try {
            const data = await apiRequest('/auth/login', { email, password });
            saveToken(data.token);
            saveUser(data.user);
            showMessage(
                `¡Bienvenido ${data.user.name || 'Usuario'}!`,
                'success',
                'dashboard.html',
                1500
            );
        } catch (error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('email') || msg.includes('usuario')) {
                showFieldError('email', error.message);
            } else if (msg.includes('contraseña') || msg.includes('password')) {
                showFieldError('password', error.message);
            } else {
                showMessage(error.message, 'error');
            }
            setLoading(false);
        }
    });
}

// ===== REGISTRO ==============================================

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);
        clearFieldErrors();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!name) {
            showFieldError('name', 'El nombre es obligatorio');
            setLoading(false);
            return;
        }
        if (name.length < 2) {
            showFieldError('name', 'El nombre debe tener al menos 2 caracteres');
            setLoading(false);
            return;
        }
        if (!email) {
            showFieldError('email', 'El correo es obligatorio');
            setLoading(false);
            return;
        }
        if (!isValidEmail(email)) {
            showFieldError('email', 'Ingresa un correo válido');
            setLoading(false);
            return;
        }
        if (!password) {
            showFieldError('password', 'La contraseña es obligatoria');
            setLoading(false);
            return;
        }
        if (password.length < 6) {
            showFieldError('password', 'La contraseña debe tener al menos 6 caracteres');
            setLoading(false);
            return;
        }

        try {
            await apiRequest('/auth/register', { name, email, password });
            showMessage(
                '¡Cuenta creada con éxito! Redirigiendo al login...',
                'success',
                'login.html',
                2000
            );
            document.getElementById('submit-btn').disabled = true;
        } catch (error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('email') || msg.includes('correo')) {
                showFieldError('email', error.message);
            } else if (msg.includes('nombre') || msg.includes('name')) {
                showFieldError('name', error.message);
            } else {
                showMessage(error.message, 'error');
            }
            setLoading(false);
        }
    });
}
