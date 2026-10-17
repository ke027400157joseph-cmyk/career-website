<?php
header('Content-Type: application/json; charset=UTF-8');
session_start();

if (empty($_SESSION['authenticated']) || empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Please sign in to view your dashboard.']);
    exit;
}

require_once __DIR__ . '/../config/database.php';
$userId = (int) $_SESSION['user_id'];

try {
    $userStatement = $pdo->prepare(
        'SELECT u.id, u.name, u.email, p.phone, p.location, p.bio
         FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = ?'
    );
    $userStatement->execute([$userId]);
    $user = $userStatement->fetch();

    $savedCount = $pdo->prepare('SELECT COUNT(*) FROM saved_jobs WHERE user_id = ?');
    $savedCount->execute([$userId]);
    $progressCount = $pdo->prepare("SELECT COUNT(*) FROM user_course_progress WHERE user_id = ? AND status = 'in_progress'");
    $progressCount->execute([$userId]);
    $completedCount = $pdo->prepare("SELECT COUNT(*) FROM user_course_progress WHERE user_id = ? AND status = 'completed'");
    $completedCount->execute([$userId]);
    $quizCount = $pdo->prepare('SELECT COUNT(*) FROM quiz_results WHERE user_id = ?');
    $quizCount->execute([$userId]);

    $savedJobs = $pdo->prepare(
        'SELECT j.id, j.title, j.company, j.location, j.job_type, j.salary, sj.saved_at
         FROM saved_jobs sj JOIN jobs j ON j.id = sj.job_id
         WHERE sj.user_id = ? ORDER BY sj.saved_at DESC LIMIT 5'
    );
    $savedJobs->execute([$userId]);

    $learningCourses = $pdo->prepare(
        'SELECT c.id, c.title, c.provider, ucp.status, ucp.progress, ucp.updated_at
         FROM user_course_progress ucp JOIN courses c ON c.id = ucp.course_id
         WHERE ucp.user_id = ? ORDER BY ucp.updated_at DESC LIMIT 5'
    );
    $learningCourses->execute([$userId]);

    $recommendations = $pdo->query('SELECT id, title, description, average_salary, category FROM careers ORDER BY id DESC LIMIT 3')->fetchAll();

    echo json_encode([
        'status' => 'success',
        'user' => $user,
        'stats' => [
            'saved_jobs' => (int) $savedCount->fetchColumn(),
            'courses_in_progress' => (int) $progressCount->fetchColumn(),
            'courses_completed' => (int) $completedCount->fetchColumn(),
            'quiz_attempts' => (int) $quizCount->fetchColumn()
        ],
        'saved_jobs' => $savedJobs->fetchAll(),
        'learning_courses' => $learningCourses->fetchAll(),
        'recommendations' => $recommendations
    ]);
} catch (Throwable $error) {
    error_log('Dashboard load failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Dashboard data could not be loaded.']);
}