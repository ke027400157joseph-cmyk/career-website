// js/main.js

window.CareerPathSession = (() => {
    const STORAGE_KEY = 'careerpath_session';
    const USER_STORAGE_KEY = 'careerpath_users';
    const DEMO_USERS = {
        'admin@example.com': { id: 1, name: 'Admin User', email: 'admin@example.com', password: 'admin123', role: 'admin', location: 'Nairobi, Kenya' },
        'user@example.com': { id: 2, name: 'Jane Doe', email: 'user@example.com', password: 'password123', role: 'user', location: 'Kisumu, Kenya' },
        'demo@careerpath.com': { id: 3, name: 'Demo User', email: 'demo@careerpath.com', password: 'demo123', role: 'user', location: 'Nakuru, Kenya' }
    };

    function normalizeEmail(email) {
        return String(email || '').trim().toLowerCase();
    }

    function ensureDemoUsers() {
        try {
            const existing = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || 'null');
            if (!existing || typeof existing !== 'object') {
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(DEMO_USERS));
            }
        } catch (error) {
            console.warn('Unable to initialize demo users:', error);
        }
    }

    function parseJsonResponse(response, fallbackValue) {
        if (!response) return fallbackValue;
        return response.text().then(text => {
            const trimmed = (text || '').trim();
            if (!trimmed) return fallbackValue;
            if (trimmed.startsWith('<') || trimmed.startsWith('<?') || trimmed.startsWith('php')) {
                return {
                    ...fallbackValue,
                    serverUnavailable: true,
                    message: 'This app must be served through a local PHP server before you can log in.'
                };
            }
            try {
                return JSON.parse(trimmed);
            } catch (error) {
                console.error('Failed to parse JSON response:', error, trimmed);
                return {
                    ...fallbackValue,
                    serverUnavailable: true,
                    message: 'The server returned unexpected data. Please try again from the app server.'
                };
            }
        }).catch(() => fallbackValue);
    }

    function setSession(session) {
        if (!session || !session.authenticated) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        return session;
    }

    function getStoredSession() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { authenticated: false, status: 'error', user: null };
            const session = JSON.parse(raw);
            if (session && session.authenticated === true) return session;
        } catch (error) {
            console.warn('Unable to read local session:', error);
        }
        return { authenticated: false, status: 'error', user: null };
    }

    async function getSession() {
        try {
            const response = await fetch('../backend/auth/session.php', { credentials: 'same-origin' });
            const session = await parseJsonResponse(response, { authenticated: false, status: 'error', user: null });
            if (response.ok && session && session.authenticated === true) {
                return setSession(session);
            }
            if (session && session.serverUnavailable) {
                return getStoredSession();
            }
            return session && session.authenticated === true ? session : getStoredSession();
        } catch (error) {
            console.warn('Session check fell back to the local demo session.', error);
            return getStoredSession();
        }
    }

    function loginManual(email, password, remember = false) {
        ensureDemoUsers();
        const normalizedEmail = normalizeEmail(email);
        const availableUsers = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || '{}');
        const user = availableUsers[normalizedEmail] || DEMO_USERS[normalizedEmail];
        if (!user || String(password) !== String(user.password)) {
            return { status: 'error', authenticated: false, message: 'Email or password is incorrect.' };
        }

        const session = {
            status: 'success',
            authenticated: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location || 'Nairobi, Kenya'
            }
        };

        if (remember) {
            localStorage.setItem('careerpath_remember_me', 'true');
        } else {
            localStorage.removeItem('careerpath_remember_me');
        }

        setSession(session);
        return session;
    }

    function logoutManual() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('careerpath_remember_me');
        return true;
    }

    function getFallbackDashboard(user = null) {
        const profile = user || getStoredSession().user || { name: 'Demo User', location: 'Nairobi, Kenya', email: 'demo@careerpath.com', role: 'user' };
        return {
            status: 'success',
            user: {
                name: profile.name || 'Demo User',
                email: profile.email || 'demo@careerpath.com',
                location: profile.location || 'Nairobi, Kenya',
                role: profile.role || 'user'
            },
            stats: {
                saved_jobs: 3,
                courses_in_progress: 4,
                quiz_attempts: 2
            },
            saved_jobs: [
                { company: 'Safaricom', title: 'Product Analyst', location: 'Nairobi', job_type: 'Full-time' },
                { company: 'M-KOPA', title: 'Data Specialist', location: 'Remote', job_type: 'Full-time' },
                { company: 'Airtel', title: 'Customer Insights Lead', location: 'Nairobi', job_type: 'Contract' }
            ],
            recommendations: [
                { id: 1, title: 'Software Engineer', category: 'Technology', description: 'Design and build digital solutions for modern businesses.' },
                { id: 2, title: 'Data Scientist', category: 'Analytics', description: 'Turn complex data into actionable insights and strategy.' },
                { id: 3, title: 'UX/UI Designer', category: 'Design', description: 'Create human-centered digital experiences that are clear and engaging.' }
            ],
            learning_courses: [
                { title: 'UX Foundations', provider: 'Coursera', status: 'in_progress', progress: 72 },
                { title: 'Data Analysis with SQL', provider: 'edX', status: 'in_progress', progress: 56 },
                { title: 'Career Strategy Fundamentals', provider: 'LinkedIn Learning', status: 'not_started', progress: 12 }
            ]
        };
    }

    return {
        STORAGE_KEY,
        DEMO_USERS,
        parseJsonResponse,
        ensureDemoUsers,
        getStoredSession,
        getSession,
        loginManual,
        logoutManual,
        getFallbackDashboard
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    renderSiteLogo();
    renderSiteFooter();
    loadCareers();
    initMobileMenu();
    initMessageForms();
    initJobApplicationForm();
});

function renderSiteLogo() {
    document.querySelectorAll('.logo, .auth-brand').forEach(logo => {
        const image = document.createElement('img');
        image.className = 'career-matters-logo';
        image.src = 'assets/career-matters-logo-cropped.png';
        image.alt = 'Career Matters';
        logo.replaceChildren(image);
        logo.setAttribute('aria-label', 'Career Matters home');
    });
}

function renderSiteFooter() {
    const footer = document.createElement('footer');
    footer.className = 'career-footer';
    footer.innerHTML = `
        <div class="container">
            <div class="career-footer-top">
                <a href="index.html" class="career-footer-brand" aria-label="Career Matters home">
                    <img class="career-footer-logo" src="assets/career-matters-logo-cropped.png" alt="Career Matters">
                </a>
                <div class="career-footer-social">
                    <h2>Follow us on social media</h2>
                    <div class="career-social-links">
                        <a href="https://www.facebook.com/" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                        <a href="https://www.instagram.com/" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                        <a href="https://www.youtube.com/" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
                        <a href="https://www.linkedin.com/" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
                    </div>
                </div>
                <div class="career-footer-contact">
                    <a href="jobs.html"><i class="fas fa-briefcase" aria-hidden="true"></i> Explore job opportunities</a>
                    <a href="courses.html"><i class="fas fa-graduation-cap" aria-hidden="true"></i> Discover career courses</a>
                </div>
            </div>
            <a class="career-footer-cta" href="careers.html">Explore career paths and plan your next step</a>
            <div class="career-footer-links">
                <a href="index.html#security">Privacy &amp; Security</a>
                <nav aria-label="Footer navigation">
                    <a href="index.html">Home</a>
                    <a href="careers.html">Careers</a>
                    <a href="jobs.html">Jobs</a>
                    <a href="courses.html">Courses</a>
                    <a href="quiz.html">Career Quiz</a>
                    <a href="profile.html">My Profile</a>
                </nav>
            </div>
        </div>
        <div class="career-footer-bottom">
            <div class="container">
                <p>&copy; 2026 CareerPath. All rights reserved.</p>
                <a href="index.html#security">Privacy &amp; Security</a>
            </div>
        </div>`;

    const existingFooter = document.querySelector('body > footer');
    if (existingFooter) existingFooter.replaceWith(footer);
    else document.body.append(footer);
}

function initJobApplicationForm() {
    const dialog = document.getElementById('job-application-dialog');
    const form = document.getElementById('job-application-form');
    const jobName = document.getElementById('application-job-name');
    const jobId = document.getElementById('application-job-id');
    const status = document.getElementById('application-status');
    const submitButton = document.getElementById('submit-application');
    const jobsList = document.getElementById('jobs-list');
    if (!dialog || !form || !jobsList) return;

    function closeDialog() {
        dialog.close();
        form.reset();
        status.textContent = '';
        status.className = 'application-status';
        submitButton.disabled = false;
    }

    document.getElementById('close-application').addEventListener('click', closeDialog);
    document.getElementById('cancel-application').addEventListener('click', closeDialog);
    dialog.addEventListener('click', event => {
        if (event.target === dialog) closeDialog();
    });

    jobsList.addEventListener('click', event => {
        const applyButton = event.target.closest('[data-apply-job]');
        if (!applyButton) return;
        jobId.value = applyButton.dataset.applyJob;
        jobName.textContent = `${applyButton.dataset.jobTitle} · ${applyButton.dataset.company}`;
        status.textContent = '';
        form.reset();
        jobId.value = applyButton.dataset.applyJob;
        jobName.textContent = `${applyButton.dataset.jobTitle} · ${applyButton.dataset.company}`;
        dialog.showModal();
        form.elements.name.focus();
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        submitButton.disabled = true;
        status.textContent = 'Submitting your application...';
        status.className = 'application-status';
        const application = Object.fromEntries(new FormData(form).entries());

        try {
            const response = await fetch('../backend/jobs/apply.php', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(application)
            });
            const result = await response.json().catch(() => null);
            if (!result) throw new Error('The application service is temporarily unavailable. Please try again later.');
            if (!response.ok || result.status !== 'success') throw new Error(result.message || 'Application could not be submitted.');
            form.reset();
            jobId.value = application.job_id;
            status.textContent = `${result.message} Reference #${result.application_id}.`;
            status.className = 'application-status success';
        } catch (error) {
            status.textContent = error.message || 'Application could not be submitted. Please try again.';
            status.className = 'application-status error';
        } finally {
            submitButton.disabled = false;
        }
    });
}

function initMessageForms() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const formData = new FormData(contactForm);
            const status = contactForm.querySelector('.form-status');
            const submitButton = contactForm.querySelector('.submit-btn');

            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';

            try {
                const response = await fetch('../backend/messages/save_message.php', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    status.textContent = 'Your message has been sent successfully.';
                    status.className = 'form-status success';
                    contactForm.reset();
                } else {
                    const message = result.message || 'There was a problem sending your message.';
                    status.textContent = message;
                    status.className = 'form-status error';
                }
            } catch (error) {
                console.error('Message submission error:', error);
                status.textContent = 'Unable to send message right now. Please try again later.';
                status.className = 'form-status error';
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Send message';
            }
        });
    }

    document.querySelectorAll('.newsletter-form').forEach(form => {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            const emailInput = form.querySelector('input[type="email"]');
            if (!emailInput || !emailInput.value.trim()) return;

            const payload = new FormData();
            payload.append('name', 'Newsletter subscriber');
            payload.append('email', emailInput.value.trim());
            payload.append('subject', 'Newsletter subscription');
            payload.append('message', 'Newsletter subscription request');

            try {
                const response = await fetch('../backend/messages/save_message.php', {
                    method: 'POST',
                    body: payload
                });

                const result = await response.json();
                if (response.ok && result.status === 'success') {
                    emailInput.value = '';
                    const status = form.querySelector('.form-status') || document.createElement('p');
                    status.className = 'form-status success';
                    status.textContent = 'You are subscribed.';
                    status.style.display = 'block';
                    form.appendChild(status);
                }
            } catch (error) {
                console.error('Newsletter submit error:', error);
            }
        });
    });
}

// Mobile Menu Toggle
function initMobileMenu() {
    const toggle = document.getElementById('mobile-toggle');
    const navLinks = document.getElementById('nav-links');
    const dropdowns = document.querySelectorAll('.nav-dropdown');

    if (toggle && navLinks) {
        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = toggle.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });
    }

    dropdowns.forEach(dropdown => {
        const button = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        if (!button || !menu) return;

        button.addEventListener('click', event => {
            if (window.innerWidth >= 992) return;
            event.preventDefault();
            const isOpen = dropdown.classList.toggle('open');
            button.setAttribute('aria-expanded', String(isOpen));
        });

        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                dropdown.classList.remove('open');
                button.setAttribute('aria-expanded', 'false');
            });
        });
    });

    document.addEventListener('click', event => {
        if (!event.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
                dropdown.classList.remove('open');
                const button = dropdown.querySelector('.dropdown-toggle');
                if (button) button.setAttribute('aria-expanded', 'false');
            });
        }
    });
}

// Fetch and Render Careers
async function loadCareers() {
    const grid = document.getElementById('careers-grid');
    if (!grid) return;

    try {
        const response = await fetch('../backend/careers/get_careers.php');
        const text = await response.text();
        let result;

        try {
            result = JSON.parse(text);
        } catch {
            result = {
                status: 'error',
                data: [
                    { id: 1, title: 'Software Engineer', description: 'Build scalable applications and systems.', average_salary: '$110,000' },
                    { id: 2, title: 'Data Scientist', description: 'Analyze complex data to drive business decisions.', average_salary: '$120,000' },
                    { id: 3, title: 'UX/UI Designer', description: 'Create beautiful and intuitive user experiences.', average_salary: '$95,000' }
                ]
            };
        }

        if (result.status === 'success' && Array.isArray(result.data) && result.data.length > 0) {
            grid.innerHTML = '';
            const careersToShow = result.data.slice(0, 6);

            careersToShow.forEach(career => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h3>${career.title}</h3>
                    <p>${career.description ? career.description.substring(0, 90) + '...' : 'Explore this exciting career path and see what it takes to succeed.'}</p>
                    <div class="card-footer">
                        <span class="salary-tag">${career.average_salary || 'Competitive'}</span>
                        <a href="career-details.html?id=${career.id}" class="btn-outline" style="padding: 8px 16px; font-size: 0.85rem;">View Details</a>
                    </div>
                `;
                grid.appendChild(card);
            });
        } else if (Array.isArray(result.data) && result.data.length > 0) {
            grid.innerHTML = '';
            result.data.slice(0, 6).forEach(career => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <h3>${career.title}</h3>
                    <p>${career.description ? career.description.substring(0, 90) + '...' : 'Explore this exciting career path and see what it takes to succeed.'}</p>
                    <div class="card-footer">
                        <span class="salary-tag">${career.average_salary || 'Competitive'}</span>
                        <a href="career-details.html?id=${career.id}" class="btn-outline" style="padding: 8px 16px; font-size: 0.85rem;">View Details</a>
                    </div>
                `;
                grid.appendChild(card);
            });
        } else {
            grid.innerHTML = '<div class="loading-state">No careers found. Please check your database.</div>';
        }
    } catch (error) {
        console.error('Error fetching careers:', error);
        grid.innerHTML = `
            <div class="card"><h3>Software Engineer</h3><p>Build scalable applications and systems.</p><div class="card-footer"><span class="salary-tag">$110,000</span><a href="#" class="btn-outline" style="padding: 8px 16px; font-size: 0.85rem;">View Details</a></div></div>
            <div class="card"><h3>Data Scientist</h3><p>Analyze complex data to drive business decisions.</p><div class="card-footer"><span class="salary-tag">$120,000</span><a href="#" class="btn-outline" style="padding: 8px 16px; font-size: 0.85rem;">View Details</a></div></div>
            <div class="card"><h3>UX/UI Designer</h3><p>Create beautiful and intuitive user experiences.</p><div class="card-footer"><span class="salary-tag">$95,000</span><a href="#" class="btn-outline" style="padding: 8px 16px; font-size: 0.85rem;">View Details</a></div></div>
        `;
    }
}
// js/careers.js

document.addEventListener('DOMContentLoaded', () => {
    let allCareersData = []; // Store data globally for filtering
    const grid = document.getElementById('all-careers-grid');
    const searchInput = document.getElementById('career-search');
    const filterTags = document.querySelectorAll('.filter-tag');
    const resultsCount = document.getElementById('results-count');
    const emptyState = document.getElementById('empty-state');

    if (!grid) return;

    showSkeleton();
    loadAllCareers();

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('input', () => filterAndRenderCareers());
    }

    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            // Update active class
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            filterAndRenderCareers();
        });
    });

    // Fetch Data
    function getMockCareerData() {
        return [
            { id: 1, title: 'Software Engineer', description: 'Build scalable applications and systems.', average_salary: '$110,000', category: 'technology' },
            { id: 2, title: 'Data Scientist', description: 'Analyze complex data to drive business decisions.', average_salary: '$120,000', category: 'technology' },
            { id: 3, title: 'Registered Nurse', description: 'Provide critical care and support to patients.', average_salary: '$75,000', category: 'healthcare' },
            { id: 4, title: 'UX/UI Designer', description: 'Create beautiful and intuitive user experiences.', average_salary: '$95,000', category: 'design' },
            { id: 5, title: 'Marketing Manager', description: 'Lead campaigns and drive brand awareness.', average_salary: '$85,000', category: 'business' },
            { id: 6, title: 'Civil Engineer', description: 'Design and oversee infrastructure projects.', average_salary: '$90,000', category: 'engineering' }
        ];
    }

    function showSkeleton() {
        if (!grid) return;

        grid.innerHTML = '';
        for (let i = 0; i < 6; i += 1) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-card';
            skeleton.innerHTML = `
                <span class="skeleton-line title"></span>
                <span class="skeleton-line long"></span>
                <span class="skeleton-line medium"></span>
                <span class="skeleton-line long"></span>
                <span class="skeleton-line short" style="margin-top: 20px;"></span>
            `;
            grid.appendChild(skeleton);
        }
    }

    async function loadAllCareers() {
        try {
            const response = await fetch('../backend/careers/get_careers.php');
            const text = await response.text();
            let result;

            try {
                result = JSON.parse(text);
            } catch {
                result = { status: 'error', data: [] };
            }

            if (result.status === 'success' && Array.isArray(result.data) && result.data.length > 0) {
                allCareersData = result.data;
                filterAndRenderCareers();
            } else {
                throw new Error('No careers data available');
            }
        } catch (error) {
            console.error('Error fetching careers:', error);
            allCareersData = getMockCareerData();
            filterAndRenderCareers();
        }
    }

    // Filter and Render Logic
    function filterAndRenderCareers() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const activeFilterElement = document.querySelector('.filter-tag.active');
        const activeFilter = activeFilterElement && activeFilterElement.dataset.filter ? activeFilterElement.dataset.filter : 'all';

        // 1. Filter the data
        const filteredData = allCareersData.filter(career => {
            const title = (career.title || '').toLowerCase();
            const description = (career.description || '').toLowerCase();
            const category = (career.category || '').toLowerCase();

            const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);
            const matchesCategory = activeFilter === 'all' || category === activeFilter;

            return matchesSearch && matchesCategory;
        });

        // 2. Render the UI
        renderCards(filteredData);
    }

    function renderCards(data) {
        if (!grid) return;

        // Update results count
        if (resultsCount) {
            resultsCount.textContent = `Showing ${data.length} career${data.length !== 1 ? 's' : ''}`;
        }

        if (data.length === 0) {
            grid.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        grid.innerHTML = ''; // Clear previous cards

        data.forEach(career => {
            const card = document.createElement('div');
            card.className = 'card career-list-card';
            card.style.animation = 'fadeInUp 0.45s ease both';
            
            // Fallback description
            const desc = career.description 
                ? career.description.substring(0, 100) + '...' 
                : 'Explore this exciting career path and see what it takes to succeed.';

            card.innerHTML = `
                <div class="career-card-top">
                    <div>
                        <span class="career-tag">${career.category || 'Career'}</span>
                        <h3>${career.title}</h3>
                    </div>
                    <span class="salary-tag">${career.average_salary || 'Competitive'}</span>
                </div>
                <p>${desc}</p>
                <ul class="career-points">
                    <li><i class="fas fa-check"></i> ${career.category ? career.category.charAt(0).toUpperCase() + career.category.slice(1) : 'Growth'} pathway</li>
                    <li><i class="fas fa-check"></i> Skills-based opportunities</li>
                </ul>
                <div class="card-footer">
                    <span>Career fit</span>
                    <a href="career-details.html?id=${career.id}" class="btn-outline" style="padding: 8px 16px; font-size: 0.85rem;">View Details</a>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    function showErrorState() {
        if(grid) grid.innerHTML = '<div class="loading-state">Failed to load careers. Please try again later.</div>';
    }
});
// js/career-details.js

const fallbackCareerDetails = {
    1: {
        career: {
            id: 1,
            title: 'Software Engineer',
            description: 'Software engineers design, develop, and maintain software systems. They write clean, scalable code, collaborate across teams, and translate user needs into reliable digital products that power modern businesses.',
            average_salary: '$110,000',
            required_skills: 'JavaScript, Python, Problem Solving, Git, System Design, Collaboration',
            category: 'Technology'
        },
        jobs: [
            { id: 1, title: 'Frontend Developer', company: 'Northstar Labs', location: 'Remote', job_type: 'Full-time' },
            { id: 2, title: 'Backend Engineer', company: 'BluePeak Studio', location: 'Austin, TX', job_type: 'Full-time' }
        ],
        courses: [
            { id: 1, title: 'Complete Web Development Bootcamp', provider: 'Udemy', price: '19.99', url: '#' },
            { id: 2, title: 'Python for Everybody', provider: 'Coursera', price: '0.00', url: '#' }
        ]
    },
    2: {
        career: {
            id: 2,
            title: 'Data Scientist',
            description: 'Data scientists transform raw data into business insights by building predictive models, analyzing trends, and turning complex information into clear recommendations that help teams make smarter decisions.',
            average_salary: '$120,000',
            required_skills: 'Python, SQL, Statistics, Machine Learning, Data Visualization, Communication',
            category: 'Technology'
        },
        jobs: [
            { id: 1, title: 'Data Analyst', company: 'Northstar Labs', location: 'Remote', job_type: 'Full-time' },
            { id: 2, title: 'Machine Learning Engineer', company: 'BluePeak Studio', location: 'Chicago, IL', job_type: 'Full-time' }
        ],
        courses: [
            { id: 1, title: 'Data Science Bootcamp', provider: 'Coursera', price: '29.99', url: '#' },
            { id: 2, title: 'Python for Data Analysis', provider: 'Udemy', price: '0.00', url: '#' }
        ]
    },
    3: {
        career: {
            id: 3,
            title: 'UX/UI Designer',
            description: 'UX/UI designers research user needs, design digital experiences, and create polished interfaces that are both intuitive and visually appealing.',
            average_salary: '$95,000',
            required_skills: 'Figma, User Research, Wireframing, Prototyping, Design Systems, Accessibility',
            category: 'Design'
        },
        jobs: [
            { id: 1, title: 'Product Designer', company: 'Northstar Labs', location: 'Remote', job_type: 'Full-time' },
            { id: 2, title: 'UI Designer', company: 'PixelForge', location: 'Boston, MA', job_type: 'Full-time' }
        ],
        courses: [
            { id: 1, title: 'UX Design Fundamentals', provider: 'Coursera', price: '0.00', url: '#' },
            { id: 2, title: 'Figma UI Design', provider: 'Udemy', price: '19.99', url: '#' }
        ]
    }
};

function normalizeCareerDetailsResult(data, fallbackId) {
    if (!data) {
        return fallbackCareerDetails[fallbackId] || fallbackCareerDetails[1];
    }

    if (data.career || data.jobs || data.courses) {
        return {
            career: data.career || fallbackCareerDetails[fallbackId]?.career || fallbackCareerDetails[1].career,
            jobs: Array.isArray(data.jobs) ? data.jobs : [],
            courses: Array.isArray(data.courses) ? data.courses : []
        };
    }

    if (data.title || data.id) {
        return {
            career: data,
            jobs: [],
            courses: []
        };
    }

    return fallbackCareerDetails[fallbackId] || fallbackCareerDetails[1];
}

document.addEventListener('DOMContentLoaded', () => {
    const breadcrumbTitle = document.getElementById('breadcrumb-title');
    if (!breadcrumbTitle) return;

    const urlParams = new URLSearchParams(window.location.search);
    const careerId = urlParams.get('id');

    if (!careerId) {
        renderCareerPage(fallbackCareerDetails[1]);
        return;
    }

    fetchCareerDetails(careerId);
});

async function fetchCareerDetails(id) {
    const fallbackData = fallbackCareerDetails[id] || fallbackCareerDetails[1];

    try {
        const response = await fetch(`../backend/careers/get_career_full_details.php?id=${id}`);
        const text = await response.text();
        let result;

        try {
            result = JSON.parse(text);
        } catch {
            result = { status: 'error', message: 'Unable to load career details.' };
        }

        if (result && result.status === 'success' && result.data) {
            renderCareerPage(normalizeCareerDetailsResult(result.data, id));
            return;
        }

        renderCareerPage(fallbackData);
    } catch (error) {
        console.error('Error fetching details:', error);
        renderCareerPage(fallbackData);
    }
}

function renderCareerPage(data) {
    const { career, jobs, courses } = data;
    const breadcrumbTitle = document.getElementById('breadcrumb-title');
    if (!breadcrumbTitle) return;

    // Update Page Title & Meta
    document.title = `${career.title} - CareerPath`;
    breadcrumbTitle.textContent = career.title;
    document.getElementById('career-title').textContent = career.title;
    document.getElementById('career-category').textContent = career.category || 'General';
    document.getElementById('career-salary').textContent = career.average_salary || 'Competitive';
    document.getElementById('career-description').textContent = career.description || 'No description available.';

    // Render Skills
    const skillsContainer = document.getElementById('career-skills');
    if (career.required_skills) {
        // Assuming skills are comma-separated in the DB
        const skillsArray = career.required_skills.split(',').map(s => s.trim());
        skillsContainer.innerHTML = skillsArray.map(skill => `<span class="skill-tag">${skill}</span>`).join('');
    } else {
        skillsContainer.innerHTML = '<p>No specific skills listed.</p>';
    }

    // Render Related Jobs
    const jobsContainer = document.getElementById('related-jobs');
    if (jobs && jobs.length > 0) {
        jobsContainer.innerHTML = jobs.map(job => `
            <div class="mini-card">
                <h4>${job.title}</h4>
                <p>${job.company} • ${job.location || 'Remote'}</p>
                <span class="mini-card-meta">${job.job_type}</span>
            </div>
        `).join('');
    } else {
        jobsContainer.innerHTML = '<p class="loading-text">No related jobs found right now.</p>';
    }

    // Render Related Courses
    const coursesContainer = document.getElementById('related-courses');
    if (courses && courses.length > 0) {
        coursesContainer.innerHTML = courses.map(course => `
            <a href="${course.url || '#'}" target="_blank" class="mini-card" style="text-decoration:none; display:block;">
                <h4>${course.title}</h4>
                <p>by ${course.provider || 'Unknown Provider'}</p>
                <span class="mini-card-meta">${parseFloat(course.price) === 0 ? 'Free' : '$' + course.price}</span>
            </a>
        `).join('');
    } else {
        coursesContainer.innerHTML = '<p class="loading-text">No recommended courses found right now.</p>';
    }
}

function showError(message) {
    document.body.innerHTML = `<div class="container" style="padding: 100px 20px; text-align: center;"><h2>Error</h2><p>${message}</p><a href="careers.html" class="btn-primary" style="margin-top:20px; display:inline-block;">Back to Careers</a></div>`;
}
// js/jobs.js

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('job-search');
    const locationInput = document.getElementById('job-location');
    const searchBtn = document.getElementById('search-btn');
    const clearBtn = document.getElementById('clear-filters');
    const jobsList = document.getElementById('jobs-list');
    const jobsCount = document.getElementById('jobs-count');
    const jobsEmpty = document.getElementById('jobs-empty');
    const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
    const filtersSidebar = document.querySelector('.jobs-filters');

    if (!jobsList) return;
    
    let debounceTimer;
    
    // Initial load
    loadJobs();
    
    // Event Listeners
    if (searchBtn) searchBtn.addEventListener('click', loadJobs);
    
    // Debounced search on typing
    [searchInput, locationInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(loadJobs, 400);
            });
        }
    });
    
    // Filter checkboxes
    const filterCheckboxes = document.querySelectorAll('.filter-checkbox input');
    filterCheckboxes.forEach(cb => {
        cb.addEventListener('change', loadJobs);
    });
    
    // Clear filters
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.querySelectorAll('.filter-checkbox input').forEach(cb => cb.checked = false);
            if (searchInput) searchInput.value = '';
            if (locationInput) locationInput.value = '';
            loadJobs();
        });
    }
    
    // Mobile filter toggle
    if (mobileFilterToggle && filtersSidebar) {
        mobileFilterToggle.addEventListener('click', () => {
            filtersSidebar.classList.toggle('active');
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!filtersSidebar.contains(e.target) && !mobileFilterToggle.contains(e.target)) {
                filtersSidebar.classList.remove('active');
            }
        });
    }

    jobsList.addEventListener('click', async event => {
        const saveButton = event.target.closest('[data-save-job]');
        if (!saveButton) return;
        const jobId = Number(saveButton.dataset.saveJob);
        const removeSavedJob = saveButton.dataset.saved === 'true';

        try {
            const response = await fetch('../backend/jobs/saved_jobs.php', {
                method: removeSavedJob ? 'DELETE' : 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_id: jobId })
            });
            const result = await response.json();
            if (response.status === 401) {
                window.location.href = 'login.html';
                return;
            }
            if (!response.ok) throw new Error(result.message || 'Could not update saved jobs.');
            saveButton.dataset.saved = String(!removeSavedJob);
            saveButton.innerHTML = removeSavedJob
                ? '<i class="far fa-bookmark" aria-hidden="true"></i> Save job'
                : '<i class="fas fa-bookmark" aria-hidden="true"></i> Saved';
            saveButton.setAttribute('aria-pressed', String(!removeSavedJob));
        } catch (error) {
            console.error('Saved job update failed:', error);
            saveButton.title = 'Could not update saved jobs. Try again.';
        }
    });
    
    // ========== LOAD JOBS ==========
    async function loadJobs() {
        const search = searchInput ? searchInput.value.trim() : '';
        const location = locationInput ? locationInput.value.trim() : '';
        
        // Get selected job types
        const jobTypes = Array.from(document.querySelectorAll('input[name="job_type"]:checked'))
            .map(cb => cb.value);
        
        // Get selected categories
        const categories = Array.from(document.querySelectorAll('input[name="category"]:checked'))
            .map(cb => cb.value);
        
        // Build query string
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (location) params.append('location', location);
        if (jobTypes.length > 0) params.append('job_type', jobTypes.join(','));
        if (categories.length > 0) params.append('category', categories.join(','));
        
        showLoading();
        
        try {
            const response = await fetch(`../backend/jobs/get_jobs.php?${params.toString()}`);
            const result = await response.json();
            
            if (result.status === 'success') {
                renderJobs(result.data);
            } else {
                showError('Failed to load jobs.');
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
            // Fallback mock data
            renderJobs(getMockJobs());
        }
    }
    
    // ========== RENDER JOBS ==========
    function renderJobs(jobs) {
        if (!jobsList) return;
        
        if (jobs.length === 0) {
            jobsList.innerHTML = '';
            if (jobsEmpty) jobsEmpty.style.display = 'block';
            if (jobsCount) jobsCount.textContent = '0 jobs found';
            return;
        }
        
        if (jobsEmpty) jobsEmpty.style.display = 'none';
        if (jobsCount) jobsCount.textContent = `Showing ${jobs.length} job${jobs.length !== 1 ? 's' : ''}`;
        
        jobsList.innerHTML = jobs.map(job => {
            const initials = getInitials(job.company);
            const badgeClass = getBadgeClass(job.job_type);
            const postedDate = job.created_at ? timeAgo(job.created_at) : 'Recently';
            const isSaved = job.is_saved === true || job.is_saved === 1 || job.is_saved === '1';
            
            return `
                <div class="job-card">
                    <div class="company-logo">${escapeJobText(initials)}</div>
                    <div class="job-info">
                        <h3>${escapeJobText(job.title)}</h3>
                        <p class="job-company">${escapeJobText(job.company)}</p>
                        <div class="job-meta">
                            <span class="job-meta-item">
                                <i class="fas fa-map-marker-alt"></i> ${escapeJobText(job.location || 'Remote')}
                            </span>
                            ${job.career_title ? `<span class="job-meta-item"><i class="fas fa-tag"></i> ${escapeJobText(job.career_title)}</span>` : ''}
                        </div>
                        <span class="job-type-badge ${badgeClass}">${escapeJobText(job.job_type || 'Full-time')}</span>
                    </div>
                    <div class="job-actions">
                        <span class="job-salary">${escapeJobText(job.salary || 'Competitive')}</span>
                        <span class="job-posted">${postedDate}</span>
                        <button type="button" class="btn-primary" data-apply-job="${Number(job.id)}" data-job-title="${escapeJobText(job.title)}" data-company="${escapeJobText(job.company)}">Apply</button>
                        <button type="button" class="btn-outline" data-save-job="${Number(job.id)}" data-saved="${isSaved}" aria-pressed="${isSaved}">${isSaved ? '<i class="fas fa-bookmark" aria-hidden="true"></i> Saved' : '<i class="far fa-bookmark" aria-hidden="true"></i> Save job'}</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function escapeJobText(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    }
    
    // ========== HELPERS ==========
    function getInitials(company) {
        if (!company) return '?';
        return company.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    }
    
    function getBadgeClass(type) {
        const map = {
            'Full-time': 'badge-fulltime',
            'Part-time': 'badge-parttime',
            'Contract': 'badge-contract',
            'Remote': 'badge-remote'
        };
        return map[type] || 'badge-fulltime';
    }
    
    function timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    }
    
    function showLoading() {
        if (jobsList) jobsList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Loading jobs...</div>';
        if (jobsEmpty) jobsEmpty.style.display = 'none';
    }
    
    function showError(msg) {
        if (jobsList) jobsList.innerHTML = `<div class="loading-state">${msg}</div>`;
    }
    
    // ========== MOCK DATA ==========
    function getMockJobs() {
        return [
            { id: 1, title: 'Senior Frontend Developer', company: 'TechCorp Inc', location: 'San Francisco, CA', job_type: 'Full-time', salary: '$130,000', career_title: 'Software Engineer', created_at: new Date().toISOString() },
            { id: 2, title: 'Data Scientist', company: 'DataFlow AI', location: 'Remote', job_type: 'Remote', salary: '$120,000', career_title: 'Data Scientist', created_at: new Date(Date.now() - 86400000).toISOString() },
            { id: 3, title: 'UX Designer', company: 'DesignHub', location: 'New York, NY', job_type: 'Full-time', salary: '$95,000', career_title: 'UX/UI Designer', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
            { id: 4, title: 'Marketing Manager', company: 'GrowthLabs', location: 'Austin, TX', job_type: 'Full-time', salary: '$85,000', career_title: 'Marketing Manager', created_at: new Date(Date.now() - 7 * 86400000).toISOString() },
            { id: 5, title: 'Registered Nurse', company: 'City Hospital', location: 'Chicago, IL', job_type: 'Part-time', salary: '$45/hr', career_title: 'Registered Nurse', created_at: new Date(Date.now() - 14 * 86400000).toISOString() },
            { id: 6, title: 'Backend Engineer', company: 'CloudScale', location: 'Remote', job_type: 'Contract', salary: '$110,000', career_title: 'Software Engineer', created_at: new Date(Date.now() - 2 * 86400000).toISOString() }
        ];
    }
});