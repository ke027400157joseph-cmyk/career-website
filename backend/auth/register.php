<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Only POST requests are allowed.']);
    exit;
}

$request = json_decode(file_get_contents('php://input'), true) ?? [];
$name = trim($request['name'] ?? '');
$email = strtolower(trim($request['email'] ?? ''));
$password = $request['password'] ?? '';

if ($name === '' || strlen($name) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 100) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Enter a valid name and email address.']);
    exit;
}

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Password must be at least 8 characters long.']);
    exit;
}

require_once __DIR__ . '/../config/database.php';

try {
    $statement = $pdo->prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
    $statement->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
    echo json_encode(['status' => 'success', 'message' => 'Account created. You can now sign in.']);
} catch (PDOException $exception) {
    if ($exception->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(['status' => 'error', 'message' => 'An account with this email already exists.']);
        exit;
    }

    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Could not create your account. Please try again later.']);
}