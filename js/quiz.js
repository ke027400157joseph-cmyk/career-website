// js/quiz.js

// ========== QUIZ DATA ==========
// Each answer maps to one or more career categories (RIASEC-inspired)
// Categories: technology, healthcare, business, design, engineering, creative, social, science
const quizData = [
    {
        question: "Which activity do you enjoy the most?",
        options: [
            { text: "Solving puzzles and analyzing data", categories: ["technology", "science"] },
            { text: "Helping people and listening to their problems", categories: ["healthcare", "social"] },
            { text: "Leading a team and making strategic decisions", categories: ["business"] },
            { text: "Designing, drawing, or creating something new", categories: ["design", "creative"] }
        ]
    },
    {
        question: "How do you prefer to work?",
        options: [
            { text: "Independently, with deep focus on complex problems", categories: ["technology", "science"] },
            { text: "In a team, collaborating and communicating often", categories: ["business", "social"] },
            { text: "Hands-on, building or fixing physical things", categories: ["engineering", "healthcare"] },
            { text: "Freely, with creative control and flexibility", categories: ["creative", "design"] }
        ]
    },
    {
        question: "What matters most to you in a career?",
        options: [
            { text: "High salary and financial stability", categories: ["business", "technology"] },
            { text: "Making a positive impact on people's lives", categories: ["healthcare", "social"] },
            { text: "Creative freedom and self-expression", categories: ["creative", "design"] },
            { text: "Solving challenging technical problems", categories: ["engineering", "science"] }
        ]
    },
    {
        question: "Which school subject did you excel in?",
        options: [
            { text: "Mathematics or Computer Science", categories: ["technology", "engineering"] },
            { text: "Biology or Chemistry", categories: ["healthcare", "science"] },
            { text: "Business Studies or Economics", categories: ["business"] },
            { text: "Art, Literature, or Design", categories: ["creative", "design"] }
        ]
    },
    {
        question: "How do you approach a difficult problem?",
        options: [
            { text: "Break it down logically and research solutions", categories: ["technology", "science"] },
            { text: "Talk it through with others and get different perspectives", categories: ["social", "business"] },
            { text: "Experiment with creative, out-of-the-box ideas", categories: ["creative", "design"] },
            { text: "Build a prototype and test it in the real world", categories: ["engineering"] }
        ]
    },
    {
        question: "What's your ideal work environment?",
        options: [
            { text: "A quiet office or remote setup with a powerful computer", categories: ["technology"] },
            { text: "A hospital, clinic, or care facility", categories: ["healthcare"] },
            { text: "A fast-paced corporate office or startup", categories: ["business"] },
            { text: "A creative studio, lab, or field site", categories: ["creative", "science", "engineering"] }
        ]
    },
    {
        question: "What type of project excites you most?",
        options: [
            { text: "Building a software app or analyzing big data", categories: ["technology"] },
            { text: "Developing a new medical treatment or therapy", categories: ["healthcare", "science"] },
            { text: "Launching a marketing campaign or business strategy", categories: ["business"] },
            { text: "Designing a product, building, or user experience", categories: ["design", "engineering"] }
        ]
    },
    {
        question: "How do you handle pressure and deadlines?",
        options: [
            { text: "I stay calm and methodically work through tasks", categories: ["technology", "science"] },
            { text: "I motivate my team and keep morale high", categories: ["business", "social"] },
            { text: "I thrive under pressure and get creative", categories: ["creative"] },
            { text: "I focus on precision and quality, no matter the rush", categories: ["engineering", "healthcare"] }
        ]
    }
];

// ========== STATE ==========
let currentQuestion = 0;
let answers = []; // Stores selected option index for each question

// ========== DOM ELEMENTS ==========
const introScreen = document.getElementById('quiz-intro');
const questionsScreen = document.getElementById('quiz-questions');
const resultsScreen = document.getElementById('quiz-results');

const startBtn = document.getElementById('start-quiz-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const retakeBtn = document.getElementById('retake-quiz-btn');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const progressText = document.getElementById('quiz-progress-text');
const progressPercent = document.getElementById('quiz-progress-percent');
const progressFill = document.getElementById('quiz-progress-fill');
const resultsGrid = document.getElementById('results-grid');

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    startBtn.addEventListener('click', startQuiz);
    prevBtn.addEventListener('click', goBack);
    nextBtn.addEventListener('click', goNext);
    retakeBtn.addEventListener('click', retakeQuiz);
});

function showScreen(screen) {
    [introScreen, questionsScreen, resultsScreen].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== QUIZ FLOW ==========
function startQuiz() {
    currentQuestion = 0;
    answers = new Array(quizData.length).fill(null);
    showScreen(questionsScreen);
    renderQuestion();
}

function renderQuestion() {
    const q = quizData[currentQuestion];
    questionText.textContent = q.question;
    
    // Progress
    const progress = ((currentQuestion) / quizData.length) * 100;
    progressText.textContent = `Question ${currentQuestion + 1} of ${quizData.length}`;
    progressPercent.textContent = `${Math.round(progress)}%`;
    progressFill.style.width = `${progress}%`;
    
    // Options
    optionsContainer.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        if (answers[currentQuestion] === idx) btn.classList.add('selected');
        btn.innerHTML = `<span class="option-letter">${letters[idx]}</span><span>${opt.text}</span>`;
        btn.addEventListener('click', () => selectOption(idx));
        optionsContainer.appendChild(btn);
    });
    
    // Nav buttons
    prevBtn.disabled = currentQuestion === 0;
    nextBtn.textContent = currentQuestion === quizData.length - 1 ? 'See Results' : 'Next';
    nextBtn.innerHTML = currentQuestion === quizData.length - 1 
        ? 'See Results <i class="fas fa-arrow-right"></i>' 
        : 'Next <i class="fas fa-arrow-right"></i>';
    nextBtn.disabled = answers[currentQuestion] === null;
}

function selectOption(idx) {
    answers[currentQuestion] = idx;
    document.querySelectorAll('.option-btn').forEach((btn, i) => {
        btn.classList.toggle('selected', i === idx);
    });
    nextBtn.disabled = false;
}

function goBack() {
    if (currentQuestion > 0) {
        currentQuestion--;
        renderQuestion();
    }
}

function goNext() {
    if (answers[currentQuestion] === null) return;
    
    if (currentQuestion === quizData.length - 1) {
        calculateResults();
    } else {
        currentQuestion++;
        renderQuestion();
    }
}

function retakeQuiz() {
    showScreen(introScreen);
}

// ========== SCORING ==========
function calculateResults() {
    // Tally category scores
    const scores = {};
    answers.forEach((ansIdx, qIdx) => {
        if (ansIdx === null) return;
        const cats = quizData[qIdx].options[ansIdx].categories;
        cats.forEach(cat => {
            scores[cat] = (scores[cat] || 0) + 1;
        });
    });
    
    // Sort categories by score
    const sortedCategories = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);

    fetch('../backend/users/quiz-results.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores, top_categories: sortedCategories })
    }).catch(() => {});
    
    showScreen(resultsScreen);
    fetchMatchingCareers(sortedCategories, scores);
}

// ========== FETCH & RENDER RESULTS ==========
async function fetchMatchingCareers(topCategories, scores) {
    resultsGrid.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Finding your best matches...</div>';
    
    let careers = [];
    
    try {
        const response = await fetch('../backend/careers/get_careers.php');
        const result = await response.json();
        if (result.status === 'success') {
            careers = result.data;
        }
    } catch (error) {
        console.error('Error fetching careers:', error);
        // Fallback mock data
        careers = [
            { id: 1, title: 'Software Engineer', description: 'Build scalable applications and systems.', average_salary: '$110,000', category: 'technology' },
            { id: 2, title: 'Data Scientist', description: 'Analyze complex data to drive business decisions.', average_salary: '$120,000', category: 'technology' },
            { id: 3, title: 'Registered Nurse', description: 'Provide critical care and support to patients.', average_salary: '$75,000', category: 'healthcare' },
            { id: 4, title: 'UX/UI Designer', description: 'Create beautiful and intuitive user experiences.', average_salary: '$95,000', category: 'design' },
            { id: 5, title: 'Marketing Manager', description: 'Lead campaigns and drive brand awareness.', average_salary: '$85,000', category: 'business' },
            { id: 6, title: 'Civil Engineer', description: 'Design and oversee infrastructure projects.', average_salary: '$90,000', category: 'engineering' },
            { id: 7, title: 'Graphic Designer', description: 'Create visual concepts and brand identities.', average_salary: '$55,000', category: 'creative' },
            { id: 8, title: 'Social Worker', description: 'Help individuals and communities overcome challenges.', average_salary: '$50,000', category: 'social' }
        ];
    }
    
    // Filter careers matching top categories
    const matchedCareers = topCategories
        .map(cat => careers.filter(c => c.category === cat))
        .flat()
        .slice(0, 6); // Limit to 6 results
    
    // If no matches (category column not populated), show top careers from DB
    const finalCareers = matchedCareers.length > 0 ? matchedCareers : careers.slice(0, 6);
    
    renderResults(finalCareers, scores, topCategories);
}

function renderResults(careers, scores, topCategories) {
    if (careers.length === 0) {
        resultsGrid.innerHTML = '<div class="loading-state">No matching careers found. Try exploring all careers!</div>';
        return;
    }
    
    // Calculate max score for percentage display
    const maxScore = Math.max(...Object.values(scores));
    
    resultsGrid.innerHTML = careers.map((career, idx) => {
        // Match percentage based on category score
        const categoryScore = scores[career.category] || 1;
        const matchPercent = Math.round((categoryScore / maxScore) * 100);
        const rank = idx + 1;
        
        const desc = career.description 
            ? career.description.substring(0, 120) + (career.description.length > 120 ? '...' : '')
            : 'Explore this exciting career path and see what it takes to succeed.';
        
        return `
            <div class="result-card">
                <div class="result-rank">#${rank}</div>
                <h3>${career.title}</h3>
                <span class="result-match">${matchPercent}% Match</span>
                <p>${desc}</p>
                <p style="font-weight:600; color:var(--primary); margin-bottom:15px;">
                    ${career.average_salary ? '💰 ' + career.average_salary : '💰 Competitive Salary'}
                </p>
                <a href="career-details.html?id=${career.id}" class="btn-outline">View Full Details</a>
            </div>
        `;
    }).join('');
}