const savedJobsList = document.getElementById('saved-jobs-list');

function escapeSavedJob(value) {
	return String(value ?? '').replace(/[&<>"']/g, character => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
	})[character]);
}

async function loadSavedJobs() {
	try {
		const response = await fetch('../backend/jobs/saved_jobs.php', { credentials: 'same-origin' });
		const result = await response.json();
		if (response.status === 401) {
			window.location.replace('login.html');
			return;
		}
		if (!response.ok) throw new Error(result.message || 'Saved jobs could not be loaded.');
		if (!result.data.length) {
			savedJobsList.innerHTML = '<div class="account-empty">No saved jobs yet. <a href="jobs.html">Explore open roles</a> and save the ones you like.</div>';
			return;
		}
		savedJobsList.innerHTML = result.data.map(job => `<article class="account-item">
			<div><h2>${escapeSavedJob(job.title)}</h2><p>${escapeSavedJob(job.company)} · ${escapeSavedJob(job.location || 'Location not listed')} · ${escapeSavedJob(job.job_type || 'Role')}</p><p>${escapeSavedJob(job.salary || 'Salary not listed')}</p></div>
			<div class="item-actions"><a class="btn-outline" href="jobs.html?search=${encodeURIComponent(job.title)}">View job</a><button class="btn-secondary" type="button" data-remove-job="${Number(job.id)}">Remove</button></div>
		</article>`).join('');
	} catch (error) {
		savedJobsList.innerHTML = `<div class="account-empty">${escapeSavedJob(error.message)}</div>`;
	}
}

savedJobsList.addEventListener('click', async event => {
	const button = event.target.closest('[data-remove-job]');
	if (!button) return;
	button.disabled = true;
	try {
		const response = await fetch('../backend/jobs/saved_jobs.php', {
			method: 'DELETE',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ job_id: Number(button.dataset.removeJob) })
		});
		const result = await response.json();
		if (response.status === 401) {
			window.location.replace('login.html');
			return;
		}
		if (!response.ok) throw new Error(result.message || 'Job could not be removed.');
		await loadSavedJobs();
	} catch (error) {
		button.disabled = false;
		button.textContent = error.message;
	}
});

loadSavedJobs();