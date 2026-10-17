<?php
header('Content-Type: application/json; charset=UTF-8');
session_start();

function quizResultsRespond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if (empty($_SESSION['authenticated']) || empty($_SESSION['user_id'])) {
    quizResultsRespond(401, ['status' => 'error', 'message' => 'Sign in to save and view quiz results.']);
}
require_once __DIR__ . '/../config/database.php';
$userId = (int) $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $statement = $pdo->prepare('SELECT id, scores_json, top_categories_json, created_at FROM quiz_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 20');
    $statement->execute([$userId]);
    $results = array_map(static function (array $row): array {
        $row['scores'] = json_decode($row['scores_json'], true) ?? [];
        $row['top_categories'] = json_decode($row['top_categories_json'], true) ?? [];
        unset($row['scores_json'], $row['top_categories_json']);
        return $row;
    }, $statement->fetchAll());
    quizResultsRespond(200, ['status' => 'success', 'data' => $results]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    quizResultsRespond(405, ['status' => 'error', 'message' => 'Use GET or POST for quiz results.']);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$scores = $input['scores'] ?? null;
$categories = $input['top_categories'] ?? null;
if (!is_array($scores) || !is_array($categories) || count($categories) > 3 || count($scores) > 20) {
    quizResultsRespond(400, ['status' => 'error', 'message' => 'Quiz result data is invalid.']);
}
foreach ($scores as $category => $score) {
    if (!is_string($category) || !is_numeric($score) || $score < 0 || $score > 100) {
        quizResultsRespond(400, ['status' => 'error', 'message' => 'Quiz result data is invalid.']);
    }
}

$statement = $pdo->prepare('INSERT INTO quiz_results (user_id, scores_json, top_categories_json) VALUES (?, ?, ?)');
$statement->execute([$userId, json_encode($scores), json_encode(array_values($categories))]);
quizResultsRespond(201, ['status' => 'success', 'id' => (int) $pdo->lastInsertId()]);