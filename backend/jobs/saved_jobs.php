<?php
header('Content-Type: application/json; charset=UTF-8');
session_start();

function savedJobsRespond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if (empty($_SESSION['authenticated']) || empty($_SESSION['user_id'])) {
    savedJobsRespond(401, ['status' => 'error', 'message' => 'Sign in to save jobs.']);
}

require_once __DIR__ . '/../config/database.php';
$userId = (int) $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $statement = $pdo->prepare(
        'SELECT j.id, j.title, j.company, j.location, j.job_type, j.description, j.salary, sj.saved_at
         FROM saved_jobs sj JOIN jobs j ON j.id = sj.job_id
         WHERE sj.user_id = ? ORDER BY sj.saved_at DESC'
    );
    $statement->execute([$userId]);
    savedJobsRespond(200, ['status' => 'success', 'data' => $statement->fetchAll()]);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$jobId = filter_var($input['job_id'] ?? null, FILTER_VALIDATE_INT);
if (!$jobId || $jobId < 1) {
    savedJobsRespond(400, ['status' => 'error', 'message' => 'Choose a valid job.']);
}

if ($method === 'POST') {
    $statement = $pdo->prepare('INSERT IGNORE INTO saved_jobs (user_id, job_id) SELECT ?, id FROM jobs WHERE id = ?');
    $statement->execute([$userId, $jobId]);
    if ($statement->rowCount() === 0) {
        $exists = $pdo->prepare('SELECT id FROM jobs WHERE id = ?');
        $exists->execute([$jobId]);
        if (!$exists->fetch()) savedJobsRespond(404, ['status' => 'error', 'message' => 'Job not found.']);
    }
    savedJobsRespond(200, ['status' => 'success', 'message' => 'Job saved.']);
}

if ($method === 'DELETE') {
    $statement = $pdo->prepare('DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?');
    $statement->execute([$userId, $jobId]);
    savedJobsRespond(200, ['status' => 'success', 'message' => 'Job removed from saved jobs.']);
}

header('Allow: GET, POST, DELETE');
savedJobsRespond(405, ['status' => 'error', 'message' => 'Method not allowed.']);