const historyContainer = document.getElementById('quiz-history');

function escapeQuizHistory(value) {
	return String(value ?? '').replace(/[&<>"']/g, character => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
	})[character]);
}

async function loadQuizHistory() {
	try {
		const response = await fetch('../backend/users/quiz-results.php', { credentials: 'same-origin' });
		const result = await response.json();
		if (response.status === 401) {
			window.location.replace('login.html');
			return;
		}
		if (!response.ok) throw new Error(result.message || 'Quiz history could not be loaded.');
		if (!result.data.length) {
			historyContainer.innerHTML = '<div class="account-empty">No saved quiz results yet. <a href="quiz.html">Take the career quiz</a> to get started.</div>';
			return;
		}
		historyContainer.innerHTML = result.data.map(item => {
			const date = new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
			const scores = Object.entries(item.scores).sort((a, b) => b[1] - a[1]);
			return `<article class="account-item"><div><h2>Career assessment</h2><p>${escapeQuizHistory(date)} · Strongest areas: ${item.top_categories.map(escapeQuizHistory).join(', ') || 'Not available'}</p><div class="result-score-list">${scores.map(([category, score]) => `<span class="result-score">${escapeQuizHistory(category)} · ${Number(score)}</span>`).join('')}</div></div></article>`;
		}).join('');
	} catch (error) {
		historyContainer.innerHTML = `<div class="account-empty">${escapeQuizHistory(error.message)}</div>`;
	}
}

loadQuizHistory();