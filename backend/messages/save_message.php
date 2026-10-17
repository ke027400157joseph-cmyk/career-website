<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Only POST requests are allowed.']);
    exit;
}

require_once __DIR__ . '/../config/database.php';

$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$subject = trim($_POST['subject'] ?? 'General enquiry');
$message = trim($_POST['message'] ?? '');
$source = trim($_POST['source'] ?? 'website');

if ($name === '' || $email === '' || $message === '') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Name, email, and message are required.'
    ]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Please enter a valid email address.'
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare(
        'INSERT INTO contact_messages (name, email, subject, message, source) VALUES (?, ?, ?, ?, ?)'
    );

    $stmt->execute([$name, $email, $subject, $message, $source]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Message saved successfully.'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to save the message: ' . $e->getMessage()
    ]);
}
