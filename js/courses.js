const courseGrid = document.getElementById('course-grid');
const courseSearch = document.getElementById('course-search');
const courseFilters = document.querySelectorAll('[data-course-category]');
const courseResultCount = document.getElementById('course-result-count');
const courseCards = Array.from(courseGrid.querySelectorAll('.course-card'));
let selectedCourseCategory = 'all';
let emptyState;

function getCourseCategory(card) {
    const label = card.querySelector('.course-tag')?.textContent.trim().toLowerCase() || '';
    if (label.includes('design')) return 'design';
    if (label.includes('business') || label.includes('marketing')) return 'business';
    if (label.includes('health')) return 'healthcare';
    if (label.includes('engineering')) return 'engineering';
    return 'technology';
}

function renderCourses() {
    const searchTerm = courseSearch.value.trim().toLowerCase();
    let matchCount = 0;

    courseCards.forEach(card => {
        const matches = (selectedCourseCategory === 'all' || getCourseCategory(card) === selectedCourseCategory)
            && card.textContent.toLowerCase().includes(searchTerm);
        card.hidden = !matches;
        if (matches) matchCount += 1;
    });

    courseResultCount.textContent = `${matchCount} course${matchCount === 1 ? '' : 's'}`;
    if (!matchCount && !emptyState) {
        emptyState = document.createElement('p');
        emptyState.className = 'loading-state';
        emptyState.textContent = 'No courses match those filters. Try another search.';
        courseGrid.append(emptyState);
    } else if (matchCount && emptyState) {
        emptyState.remove();
        emptyState = null;
    }
}

courseSearch.addEventListener('input', renderCourses);
courseFilters.forEach(button => {
    button.addEventListener('click', () => {
        selectedCourseCategory = button.dataset.courseCategory;
        courseFilters.forEach(filter => filter.classList.toggle('active', filter === button));
        renderCourses();
    });
});

renderCourses();
