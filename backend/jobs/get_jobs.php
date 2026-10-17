<?php
header('Content-Type: application/json; charset=UTF-8');
session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Only GET requests are allowed.']);
    exit;
}

require_once __DIR__ . '/../config/database.php';
$search = trim($_GET['search'] ?? '');
$location = trim($_GET['location'] ?? '');
$jobTypes = array_filter(array_map('trim', explode(',', $_GET['job_type'] ?? '')));
$categories = array_filter(array_map('trim', explode(',', $_GET['category'] ?? '')));
$userId = !empty($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : 0;

try {
    $sql = 'SELECT j.*, c.title AS career_title, c.category, (sj.id IS NOT NULL) AS is_saved
            FROM jobs j
            LEFT JOIN careers c ON c.id = j.career_id
            LEFT JOIN saved_jobs sj ON sj.job_id = j.id AND sj.user_id = ?
            WHERE 1 = 1';
    $parameters = [$userId];

    if ($search !== '') {
        $sql .= ' AND (j.title LIKE ? OR j.company LIKE ? OR j.description LIKE ?)';
        $term = '%' . $search . '%';
        array_push($parameters, $term, $term, $term);
    }
    if ($location !== '') {
        $sql .= ' AND (j.location LIKE ? OR j.job_type = ?)';
        array_push($parameters, '%' . $location . '%', $location);
    }
    if ($jobTypes) {
        $sql .= ' AND j.job_type IN (' . implode(',', array_fill(0, count($jobTypes), '?')) . ')';
        array_push($parameters, ...$jobTypes);
    }
    if ($categories) {
        $sql .= ' AND c.category IN (' . implode(',', array_fill(0, count($categories), '?')) . ')';
        array_push($parameters, ...$categories);
    }
    $sql .= ' ORDER BY j.created_at DESC, j.id DESC LIMIT 100';

    $statement = $pdo->prepare($sql);
    $statement->execute($parameters);
    $jobs = $statement->fetchAll();
    echo json_encode(['status' => 'success', 'data' => $jobs, 'count' => count($jobs)]);
} catch (Throwable $error) {
    error_log('Job listing failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Jobs could not be loaded right now.']);
}