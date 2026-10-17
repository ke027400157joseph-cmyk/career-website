const requestView = document.getElementById('request-view');
const passwordView = document.getElementById('password-view');
const requestForm = document.getElementById('request-reset-form');
const passwordForm = document.getElementById('new-password-form');
const statusMessage = document.getElementById('reset-status');
const params = new URLSearchParams(window.location.search);
const resetToken = params.get('token');
const resetEmail = params.get('email');

if (resetToken && resetEmail) {
    requestView.hidden = true;
    passwordView.hidden = false;
}

async function postReset(payload) {
    const response = await fetch('../backend/auth/forgot-password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Password recovery failed.');
    return result;
}

requestForm.addEventListener('submit', async event => {
    event.preventDefault();
    statusMessage.textContent = 'Sending reset link...';
    try {
        const result = await postReset({ action: 'request', email: document.getElementById('reset-email').value.trim() });
        statusMessage.textContent = result.message;
    } catch (error) {
        statusMessage.textContent = error.message;
    }
});

passwordForm.addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('new-password').value;
    const confirmation = document.getElementById('confirm-password').value;
    if (password.length < 8) {
        statusMessage.textContent = 'Use a password with at least 8 characters.';
        return;
    }
    if (password !== confirmation) {
        statusMessage.textContent = 'The passwords do not match.';
        return;
    }

    statusMessage.textContent = 'Updating password...';
    try {
        const result = await postReset({ action: 'reset', email: resetEmail, token: resetToken, password });
        statusMessage.textContent = result.message;
        passwordForm.reset();
    } catch (error) {
        statusMessage.textContent = error.message;
    }
});