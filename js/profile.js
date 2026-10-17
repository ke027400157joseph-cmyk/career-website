document.addEventListener('DOMContentLoaded', async () => {
	const form = document.getElementById('profile-form');
	const status = document.getElementById('profile-status');
	const submit = form.querySelector('button[type="submit"]');
	const fields = ['name', 'email', 'phone', 'location', 'bio'];

	try {
		const response = await fetch('../backend/users/profile.php', { credentials: 'same-origin' });
		const result = await response.json();
		if (response.status === 401) {
			window.location.replace('login.html');
			return;
		}
		if (!response.ok) throw new Error(result.message || 'Profile could not be loaded.');
		fields.forEach(field => {
			document.getElementById(`profile-${field}`).value = result.data[field] || '';
		});
	} catch (error) {
		status.textContent = error.message;
		status.className = 'account-status error';
	}

	form.addEventListener('submit', async event => {
		event.preventDefault();
		status.textContent = 'Saving changes...';
		status.className = 'account-status';
		submit.disabled = true;
		try {
			const data = Object.fromEntries(fields.map(field => [field, document.getElementById(`profile-${field}`).value.trim()]));
			const response = await fetch('../backend/users/profile.php', {
				method: 'PUT',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.message || 'Profile could not be saved.');
			status.textContent = result.message;
			status.className = 'account-status success';
		} catch (error) {
			status.textContent = error.message;
			status.className = 'account-status error';
		} finally {
			submit.disabled = false;
		}
	});
});