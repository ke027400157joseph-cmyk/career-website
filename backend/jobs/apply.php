<?php
header('Content-Type: application/json; charset=UTF-8');
session_start();

function applicationRespond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    applicationRespond(405, ['status' => 'error', 'message' => 'Only POST requests are allowed.']);
}

$request = json_decode(file_get_contents('php://input'), true) ?? [];
$jobId = filter_var($request['job_id'] ?? null, FILTER_VALIDATE_INT);
$name = trim($request['name'] ?? '');
$email = strtolower(trim($request['email'] ?? ''));
$phone = trim($request['phone'] ?? '');
$coverLetter = trim($request['cover_letter'] ?? '');

if (!$jobId || $jobId < 1) applicationRespond(400, ['status' => 'error', 'message' => 'Select a valid job.']);
if ($name === '' || strlen($name) > 100) applicationRespond(400, ['status' => 'error', 'message' => 'Enter your name (up to 100 characters).']);
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) applicationRespond(400, ['status' => 'error', 'message' => 'Enter a valid email address.']);
if (strlen($phone) > 40 || strlen($coverLetter) > 5000) applicationRespond(400, ['status' => 'error', 'message' => 'One or more application fields are too long.']);

$recentApplications = $_SESSION['application_timestamps'] ?? [];
$recentApplications = array_values(array_filter($recentApplications, static fn($time) => $time > time() - 3600));
if (count($recentApplications) >= 5) applicationRespond(429, ['status' => 'error', 'message' => 'Application limit reached. Please try again later.']);

require_once __DIR__ . '/../config/database.php';
try {
    $jobStatement = $pdo->prepare('SELECT id, title, company FROM jobs WHERE id = ? LIMIT 1');
    $jobStatement->execute([$jobId]);
    $job = $jobStatement->fetch();
    if (!$job) applicationRespond(404, ['status' => 'error', 'message' => 'This job is no longer available.']);

    $userId = !empty($_SESSION['authenticated']) ? (int) $_SESSION['user_id'] : null;
    $statement = $pdo->prepare(
        'INSERT INTO job_applications (job_id, user_id, applicant_name, applicant_email, applicant_phone, cover_letter) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $statement->execute([$jobId, $userId, $name, $email, $phone ?: null, $coverLetter ?: null]);
    $recentApplications[] = time();
    $_SESSION['application_timestamps'] = $recentApplications;

    applicationRespond(201, [
        'status' => 'success',
        'message' => 'Application submitted successfully.',
        'application_id' => (int) $pdo->lastInsertId(),
        'job' => ['title' => $job['title'], 'company' => $job['company']]
    ]);
} catch (Throwable $error) {
    error_log('Job application submission failed: ' . $error->getMessage());
    applicationRespond(500, ['status' => 'error', 'message' => 'We could not submit your application. Please try again.']);
}