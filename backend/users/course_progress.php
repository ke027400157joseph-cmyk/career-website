<?php
header('Content-Type: application/json; charset=UTF-8');
session_start();

if (empty($_SESSION['authenticated']) || empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Sign in to add courses to your learning plan.']);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Only POST requests are allowed.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$courseId = filter_var($input['course_id'] ?? null, FILTER_VALIDATE_INT);
if (!$courseId || $courseId < 1) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Choose a valid course.']);
    exit;
}

require_once __DIR__ . '/../config/database.php';
$statement = $pdo->prepare(
    "INSERT INTO user_course_progress (user_id, course_id, status, progress) VALUES (?, ?, 'planned', 0)
     ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP"
);
$statement->execute([(int) $_SESSION['user_id'], $courseId]);
echo json_encode(['status' => 'success', 'message' => 'Course added to your learning plan.']);