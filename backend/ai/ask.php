<?php
header('Content-Type: application/json; charset=UTF-8');
session_start();

function respond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function text_length(string $text): int
{
    return function_exists('mb_strlen') ? mb_strlen($text, 'UTF-8') : strlen($text);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['status' => 'error', 'message' => 'Only POST requests are allowed.']);
}

if (empty($_SESSION['authenticated']) || empty($_SESSION['user_id'])) {
    respond(401, ['status' => 'error', 'message' => 'Please sign in to use the AI guide.']);
}

$apiKey = getenv('GEMINI_API_KEY');
if (!$apiKey) {
    respond(503, ['status' => 'error', 'message' => 'The AI guide is not configured yet. Set the GEMINI_API_KEY environment variable on the PHP server.']);
}

if (!function_exists('curl_init')) {
    respond(503, ['status' => 'error', 'message' => 'The AI service needs the PHP cURL extension enabled.']);
}

if (!isset($_SESSION['ai_window_started']) || time() - $_SESSION['ai_window_started'] >= 3600) {
    $_SESSION['ai_window_started'] = time();
    $_SESSION['ai_request_count'] = 0;
}

if (($_SESSION['ai_request_count'] ?? 0) >= 30) {
    respond(429, ['status' => 'error', 'message' => 'You have reached the hourly question limit. Please try again later.']);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$question = trim($input['question'] ?? '');
$history = $input['history'] ?? [];

if ($question === '' || text_length($question) > 4000) {
    respond(400, ['status' => 'error', 'message' => 'Enter a question of 1 to 4,000 characters.']);
}

$contents = [];
if (is_array($history)) {
    foreach (array_slice($history, -10) as $turn) {
        if (!is_array($turn) || !in_array($turn['role'] ?? '', ['user', 'model'], true)) {
            continue;
        }
        $text = trim((string) ($turn['text'] ?? ''));
        if ($text !== '' && text_length($text) <= 4000) {
            $contents[] = ['role' => $turn['role'], 'parts' => [['text' => $text]]];
        }
    }
}
$contents[] = ['role' => 'user', 'parts' => [['text' => $question]]];

$payload = [
    'system_instruction' => [
        'parts' => [[
            'text' => 'You are CareerPath Guide, a thoughtful career and education assistant. Answer career planning, job search, workplace, learning, school subject, study skills, and general educational questions clearly and practically. Explain difficult topics step by step when useful, give examples, and adapt to the learner’s level. Be honest about uncertainty, never invent specific salaries, admission rules, or current job facts, and recommend checking authoritative local sources for decisions that depend on location or current policy. Do not claim to guarantee a job, grade, or outcome. If a question is unrelated to careers or education, still give a concise helpful answer when appropriate.'
        ]]
    ],
    'contents' => $contents,
    'generationConfig' => [
        'temperature' => 0.65,
        'maxOutputTokens' => 1800
    ]
];

$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
$curl = curl_init($url);
$_SESSION['ai_request_count']++;
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . $apiKey],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 45
]);
$responseBody = curl_exec($curl);
$curlError = curl_errno($curl);
$httpStatus = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

if ($responseBody === false || $curlError !== 0) {
    respond(502, ['status' => 'error', 'message' => 'The AI service could not be reached. Please try again.']);
}

$providerResponse = json_decode($responseBody, true);
if ($httpStatus < 200 || $httpStatus >= 300) {
    error_log('Gemini API request failed with HTTP status ' . $httpStatus);
    respond(502, ['status' => 'error', 'message' => 'The AI service could not answer right now. Please try again shortly.']);
}

$answerParts = $providerResponse['candidates'][0]['content']['parts'] ?? [];
$answer = trim(implode("\n", array_filter(array_map(
    static fn(array $part): string => $part['text'] ?? '',
    $answerParts
))));

if ($answer === '') {
    respond(502, ['status' => 'error', 'message' => 'The AI returned an empty answer. Please rephrase your question and try again.']);
}

respond(200, ['status' => 'success', 'answer' => $answer]);