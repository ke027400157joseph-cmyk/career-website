const chatThread = document.getElementById('chat-thread');
const welcomeState = document.getElementById('welcome-state');
const questionForm = document.getElementById('question-form');
const questionInput = document.getElementById('question-input');
const composerStatus = document.getElementById('composer-status');
const characterCount = document.getElementById('character-count');
const sendButton = document.getElementById('send-question');
const conversation = [];
let isWaiting = false;

const { getSession } = window.CareerPathSession || {};
if (getSession) {
    getSession().then(session => {
        if (!session || session.authenticated !== true) window.location.replace('login.html');
    }).catch(() => window.location.replace('login.html'));
} else {
    window.location.replace('login.html');
}

function addMessage(role, text, isError = false) {
    welcomeState.hidden = true;

    const message = document.createElement('article');
    message.className = `chat-message ${role === 'user' ? 'user' : 'assistant'}`;

    const avatar = document.createElement('span');
    avatar.className = 'message-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-sparkles"></i>';

    const content = document.createElement('div');
    content.className = 'message-content';
    const author = document.createElement('p');
    author.className = 'message-author';
    author.textContent = role === 'user' ? 'You' : 'CareerPath Guide';

    const bubble = document.createElement('div');
    bubble.className = `message-bubble${isError ? ' error' : ''}`;
    bubble.textContent = text;
    content.append(author, bubble);
    message.append(avatar, content);
    chatThread.append(message);
    chatThread.scrollTop = chatThread.scrollHeight;
    return message;
}

function addTypingIndicator() {
    const message = document.createElement('article');
    message.className = 'chat-message assistant';
    message.setAttribute('aria-label', 'AI is thinking');
    message.innerHTML = '<span class="message-avatar" aria-hidden="true"><i class="fas fa-sparkles"></i></span><div class="message-content"><p class="message-author">CareerPath Guide</p><div class="message-bubble"><span class="typing-indicator" aria-hidden="true"><span></span><span></span><span></span></span></div></div>';
    chatThread.append(message);
    chatThread.scrollTop = chatThread.scrollHeight;
    return message;
}

async function askQuestion(rawQuestion) {
    const question = rawQuestion.trim();
    if (!question || isWaiting) return;

    addMessage('user', question);
    conversation.push({ role: 'user', text: question });
    questionInput.value = '';
    updateComposer();
    isWaiting = true;
    sendButton.disabled = true;
    composerStatus.textContent = 'Preparing your answer...';
    const typingMessage = addTypingIndicator();

    try {
        const response = await fetch('../backend/ai/ask.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, history: conversation.slice(0, -1) })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'The guide could not answer right now.');

        typingMessage.remove();
        addMessage('model', result.answer);
        conversation.push({ role: 'model', text: result.answer });
        composerStatus.textContent = 'Answers can be imperfect. Check important details.';
    } catch (error) {
        typingMessage.remove();
        addMessage('model', error.message || 'Something went wrong. Please try again.', true);
        conversation.pop();
        composerStatus.textContent = 'Check your connection or try again.';
    } finally {
        isWaiting = false;
        sendButton.disabled = false;
        questionInput.focus();
    }
}

function updateComposer() {
    characterCount.textContent = `${questionInput.value.length.toLocaleString()} / 4,000`;
    questionInput.style.height = 'auto';
    questionInput.style.height = `${Math.min(questionInput.scrollHeight, 140)}px`;
}

questionForm.addEventListener('submit', event => {
    event.preventDefault();
    askQuestion(questionInput.value);
});

questionInput.addEventListener('input', updateComposer);
questionInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        questionForm.requestSubmit();
    }
});

document.querySelectorAll('[data-prompt]').forEach(button => {
    button.addEventListener('click', () => askQuestion(button.dataset.prompt));
});

document.getElementById('new-chat').addEventListener('click', () => {
    conversation.length = 0;
    chatThread.querySelectorAll('.chat-message').forEach(message => message.remove());
    welcomeState.hidden = false;
    questionInput.value = '';
    composerStatus.textContent = 'Answers can be imperfect. Check important details.';
    updateComposer();
    questionInput.focus();
});