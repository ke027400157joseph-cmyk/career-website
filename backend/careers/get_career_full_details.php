<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid career ID.'
    ]);
    exit;
}

$careerId = (int) $_GET['id'];

try {
    $careerStmt = $pdo->prepare('SELECT * FROM careers WHERE id = :id LIMIT 1');
    $careerStmt->execute([':id' => $careerId]);
    $career = $careerStmt->fetch();

    if (!$career) {
        http_response_code(404);
        echo json_encode([
            'status' => 'error',
            'message' => 'Career not found.'
        ]);
        exit;
    }

    $jobsStmt = $pdo->prepare('SELECT * FROM jobs WHERE career_id = :career_id ORDER BY created_at DESC LIMIT 5');
    $jobsStmt->execute([':career_id' => $careerId]);
    $jobs = $jobsStmt->fetchAll();

    $coursesStmt = $pdo->prepare('SELECT * FROM courses WHERE career_id = :career_id ORDER BY id DESC LIMIT 5');
    $coursesStmt->execute([':career_id' => $careerId]);
    $courses = $coursesStmt->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'career' => $career,
            'jobs' => $jobs,
            'courses' => $courses
        ]
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to load the career details from the database.'
    ]);
}
