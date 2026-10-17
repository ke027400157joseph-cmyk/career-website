document.addEventListener('DOMContentLoaded', async () => {
	try {
		const { getSession, getFallbackDashboard, parseJsonResponse } = window.CareerPathSession || {};
		const session = await getSession();
		if (!session || session.authenticated !== true) {
			window.location.replace('login.html');
			return;
		}
		if (session.user && session.user.role === 'admin') {
			const adminLink = document.getElementById('admin-link');
			if (adminLink) adminLink.hidden = false;
		}

		let result = null;
		try {
			const response = await fetch('../backend/users/dashboard.php', { credentials: 'same-origin' });
			result = await parseJsonResponse(response, { status: 'error', message: 'Dashboard is unavailable.' });
			if (!response.ok || result.status !== 'success') {
				result = getFallbackDashboard(session.user || null);
			}
		} catch (error) {
			result = getFallbackDashboard(session.user || null);
		}

		document.getElementById('dashboard-name').textContent = (result.user.name || 'User').split(/\s+/)[0];
		document.getElementById('saved-jobs-count').textContent = result.stats.saved_jobs;
		document.getElementById('courses-count').textContent = result.stats.courses_in_progress;
		document.getElementById('quiz-count').textContent = result.stats.quiz_attempts;
		document.getElementById('dashboard-location').textContent = result.user.location || 'Not set';
		renderSavedJobs(result.saved_jobs || []);
		renderRecommendations(result.recommendations || []);
		renderLearningCourses(result.learning_courses || []);
	} catch (error) {
		console.error('Dashboard load failed:', error);
		document.getElementById('dashboard-saved-jobs').innerHTML = '<p class="loading-state">Dashboard data is temporarily unavailable.</p>';
		document.getElementById('career-recommendations').innerHTML = '<p class="loading-state">Career recommendations are temporarily unavailable.</p>';
	}
});

function escapeDashboardText(value) {
	return String(value ?? '').replace(/[&<>"']/g, character => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
	})[character]);
}

function renderSavedJobs(jobs) {
	const list = document.getElementById('dashboard-saved-jobs');
	if (!jobs.length) {
		list.innerHTML = '<p class="loading-state">No saved jobs yet. Browse openings and save roles to revisit them here.</p>';
		return;
	}
	list.innerHTML = jobs.map(job => `<div class="saved-item">
		<div class="saved-company">${escapeDashboardText(job.company)}</div>
		<strong>${escapeDashboardText(job.title)}</strong>
		<span>${escapeDashboardText(job.location || 'Location not listed')} · ${escapeDashboardText(job.job_type || 'Role')}</span>
	</div>`).join('');
}

function renderRecommendations(careers) {
	const list = document.getElementById('career-recommendations');
	if (!careers.length) {
		list.innerHTML = '<p class="loading-state">No career paths are available yet.</p>';
		return;
	}
	list.innerHTML = careers.map(career => `<div class="recommendation-item">
		<div><strong>${escapeDashboardText(career.title)}</strong><p>${escapeDashboardText(career.description || career.category || 'Explore this career path.')}</p></div>
		<a class="score-pill" href="career-details.html?id=${Number(career.id)}">Explore</a>
	</div>`).join('');
}

function renderLearningCourses(courses) {
	const timeline = document.querySelector('.timeline');
	if (!courses.length) {
		timeline.innerHTML = '<li><span class="time-dot"></span><div><strong>Your learning plan is ready</strong><p><a href="courses.html">Add a course</a> to set your next milestone.</p></div></li>';
		return;
	}
	timeline.innerHTML = courses.map(course => `<li>
		<span class="time-dot${course.status === 'in_progress' ? ' active' : ''}"></span>
		<div><strong>${escapeDashboardText(course.title)}</strong><p>${escapeDashboardText(course.provider || 'Course')} · ${escapeDashboardText(course.status.replace('_', ' '))} · ${Number(course.progress)}% complete</p></div>
	</li>`).join('');
}
