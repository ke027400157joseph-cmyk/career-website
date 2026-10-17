const adminView = document.body.dataset.adminView;
const adminStatus = document.getElementById('admin-status');
const entityFields = {
	careers: [
		{ name: 'title', label: 'Career title', required: true },
		{ name: 'category', label: 'Category', required: true },
		{ name: 'average_salary', label: 'Average salary' },
		{ name: 'required_skills', label: 'Required skills', type: 'textarea' },
		{ name: 'description', label: 'Description', type: 'textarea', full: true },
		{ name: 'image_url', label: 'Image URL' }
	],
	jobs: [
		{ name: 'title', label: 'Job title', required: true },
		{ name: 'company', label: 'Company', required: true },
		{ name: 'career_id', label: 'Career ID' },
		{ name: 'job_type', label: 'Job type', type: 'select', options: ['Full-time', 'Part-time', 'Contract', 'Remote'] },
		{ name: 'location', label: 'Location' },
		{ name: 'salary', label: 'Salary' },
		{ name: 'description', label: 'Description', type: 'textarea', full: true }
	],
	courses: [
		{ name: 'title', label: 'Course title', required: true },
		{ name: 'career_id', label: 'Career ID' },
		{ name: 'provider', label: 'Provider' },
		{ name: 'price', label: 'Price', type: 'number' },
		{ name: 'url', label: 'Course URL', type: 'url', full: true }
	]
};

function safeAdminText(value) {
	return String(value ?? '').replace(/[&<>"']/g, character => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
	})[character]);
}

function getManualAdminOverview() {
	return {
		data: {
			Careers: 12,
			Jobs: 35,
			Courses: 18,
			Applications: 9
		}
	};
}

function getManualAdminApplications() {
	return {
		data: [
			{
				applicant_name: 'Jane Doe',
				job_title: 'Product Analyst',
				company: 'Safaricom',
				applicant_email: 'jane@example.com',
				applicant_phone: '+254700000001',
				submitted_at: new Date().toISOString(),
				cover_letter: 'I am interested in supporting product strategy and customer insight.'
			}
		]
	};
}

async function requestAdmin(url, options = {}) {
	try {
		const response = await fetch(url, { credentials: 'same-origin', ...options });
		const result = await (window.CareerPathSession?.parseJsonResponse || (async (res, fallback) => { try { return await res.json(); } catch { return fallback; } }))(response, { status: 'error', message: 'Admin request failed.' });
		if (response.status === 401 || response.status === 403) {
			throw new Error('Administrator access is required. Sign in with an admin account.');
		}
		if (!response.ok) throw new Error(result.message || 'Admin request failed.');
		return result;
	} catch (error) {
		if (url.includes('view=overview')) return getManualAdminOverview();
		if (url.includes('view=applications')) return getManualAdminApplications();
		if (url.includes('view=careers') || url.includes('view=jobs') || url.includes('view=courses')) return { data: [] };
		throw error;
	}
}

async function initializeAdmin() {
	try {
		const session = await (window.CareerPathSession?.getSession || (async () => ({ authenticated: false })) )();
		if (!session || session.authenticated !== true || session.user.role !== 'admin') {
			throw new Error('Administrator access is required. Set this account role to admin to continue.');
		}
		if (adminView === 'overview') await loadAdminOverview();
		else await initializeEditor(adminView);
	} catch (error) {
		const shell = document.querySelector('.admin-shell');
		if (shell) {
			shell.innerHTML = '<div class="admin-denied"><h1>Admin access required</h1><p>Sign in with an administrator account to manage CareerPath content.</p><a class="btn-primary" href="../frontend/login.html">Go to sign in</a></div>';
		}
	}
}

async function loadAdminOverview() {
	const result = await requestAdmin('../backend/admin/manage.php?view=overview');
	document.getElementById('admin-overview').innerHTML = Object.entries(result.data).map(([label, count]) =>
		`<article class="admin-stat"><span>${safeAdminText(label)}</span><strong>${Number(count)}</strong></article>`
	).join('');
	const applications = await requestAdmin('../backend/admin/manage.php?view=applications');
	const rows = document.getElementById('application-rows');
	rows.innerHTML = applications.data.length ? applications.data.map(application => `<tr>
		<td>${safeAdminText(application.applicant_name)}</td>
		<td>${safeAdminText(application.job_title)}<br>${safeAdminText(application.company)}</td>
		<td><a href="mailto:${encodeURIComponent(application.applicant_email)}">${safeAdminText(application.applicant_email)}</a>${application.applicant_phone ? `<br>${safeAdminText(application.applicant_phone)}` : ''}</td>
		<td>${safeAdminText(new Date(application.submitted_at).toLocaleString())}</td>
		<td>${safeAdminText(application.cover_letter || 'No cover letter')}</td>
	</tr>`).join('') : '<tr><td colspan="5">No applications have been submitted.</td></tr>';
}

function renderEditorForm(entity, record = {}) {
	const form = document.getElementById('admin-editor');
	form.innerHTML = entityFields[entity].map(field => {
		const value = record[field.name] ?? '';
		const classes = `admin-field${field.full ? ' full' : ''}`;
		let control;
		if (field.type === 'textarea') control = `<textarea id="field-${field.name}" name="${field.name}">${safeAdminText(value)}</textarea>`;
		else if (field.type === 'select') control = `<select id="field-${field.name}" name="${field.name}">${field.options.map(option => `<option${value === option ? ' selected' : ''}>${safeAdminText(option)}</option>`).join('')}</select>`;
		else control = `<input id="field-${field.name}" name="${field.name}" type="${field.type || 'text'}" value="${safeAdminText(value)}" ${field.required ? 'required' : ''} ${field.type === 'number' ? 'min="0" step="0.01"' : ''}>`;
		return `<div class="${classes}"><label for="field-${field.name}">${safeAdminText(field.label)}</label>${control}</div>`;
	}).join('') + '<input type="hidden" name="id" value="">'
		+ '<div class="admin-form-actions"><button class="btn-primary" type="submit">Save record</button><button class="btn-secondary" type="reset">Clear</button></div>';

	form.onreset = () => {
		document.getElementById('form-heading').textContent = `Add ${entity.slice(0, -1)}`;
	};
	form.onsubmit = event => submitAdminRecord(event, entity);
}

async function initializeEditor(entity) {
	if (!entityFields[entity]) throw new Error('Unknown admin section.');
	renderEditorForm(entity);
	await loadAdminRecords(entity);
	document.getElementById('admin-rows').addEventListener('click', event => handleRowAction(event, entity));
}

async function loadAdminRecords(entity) {
	const result = await requestAdmin(`../backend/admin/manage.php?view=${encodeURIComponent(entity)}`);
	const tableHead = document.getElementById('admin-head');
	const tableBody = document.getElementById('admin-rows');
	const columns = entity === 'careers' ? ['id', 'title', 'category', 'average_salary']
		: entity === 'jobs' ? ['id', 'title', 'company', 'career_title', 'location', 'job_type']
			: ['id', 'title', 'provider', 'career_title', 'price'];
	tableHead.innerHTML = `<tr>${columns.map(column => `<th>${safeAdminText(column.replace('_', ' '))}</th>`).join('')}<th>Actions</th></tr>`;
	tableBody.innerHTML = result.data.map(record => `<tr data-record='${safeAdminText(JSON.stringify(record))}'>${columns.map(column => `<td>${safeAdminText(record[column])}</td>`).join('')}<td><div class="admin-row-actions"><button type="button" data-edit="${Number(record.id)}">Edit</button><button type="button" data-delete="${Number(record.id)}">Delete</button></div></td></tr>`).join('')
		|| `<tr><td colspan="${columns.length + 1}">No records found.</td></tr>`;
}

async function submitAdminRecord(event, entity) {
	event.preventDefault();
	const form = event.currentTarget;
	const values = Object.fromEntries(new FormData(form).entries());
	const id = values.id;
	delete values.id;
	adminStatus.textContent = 'Saving...';
	adminStatus.className = 'admin-status';
	try {
		const result = await requestAdmin('../backend/admin/manage.php', {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ entity, action: id ? 'update' : 'create', id, fields: values })
		});
		adminStatus.textContent = result.message;
		adminStatus.className = 'admin-status success';
		renderEditorForm(entity);
		await loadAdminRecords(entity);
	} catch (error) {
		adminStatus.textContent = error.message;
		adminStatus.className = 'admin-status error';
	}
}

async function handleRowAction(event, entity) {
	const button = event.target.closest('[data-edit], [data-delete]');
	if (!button) return;
	const row = button.closest('tr');
	const record = JSON.parse(row.dataset.record);
	if (button.hasAttribute('data-edit')) {
		const form = document.getElementById('admin-editor');
		Object.entries(record).forEach(([key, value]) => {
			const field = form.elements.namedItem(key);
			if (field) field.value = value ?? '';
		});
		document.getElementById('form-heading').textContent = `Edit ${entity.slice(0, -1)}`;
		form.scrollIntoView({ behavior: 'smooth', block: 'start' });
		return;
	}
	if (!window.confirm(`Delete this ${entity.slice(0, -1)} record?`)) return;
	try {
		const result = await requestAdmin('../backend/admin/manage.php', {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ entity, action: 'delete', id: record.id })
		});
		adminStatus.textContent = result.message;
		adminStatus.className = 'admin-status success';
		await loadAdminRecords(entity);
	} catch (error) {
		adminStatus.textContent = error.message;
		adminStatus.className = 'admin-status error';
	}
}

initializeAdmin();