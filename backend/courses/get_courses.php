<?php
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Only GET requests are allowed.']);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $statement = $pdo->query(
        'SELECT c.id, c.career_id, c.title, c.provider, c.url, c.price, c.created_at,
                cr.title AS career_title, cr.category
         FROM courses c
         LEFT JOIN careers cr ON cr.id = c.career_id
         ORDER BY c.created_at DESC, c.id DESC'
    );
    $courses = $statement->fetchAll();
    echo json_encode(['status' => 'success', 'data' => $courses, 'count' => count($courses)]);
} catch (Throwable $error) {
    error_log('Course listing failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Courses could not be loaded right now.']);
}