<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Only POST requests are allowed.']);
    exit;
}

$request = json_decode(file_get_contents('php://input'), true) ?? [];
$remember = !empty($request['remember']);

session_set_cookie_params([
    'lifetime' => $remember ? 60 * 60 * 24 * 30 : 0,
    'httponly' => true,
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Lax'
]);
session_start();

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

$email = strtolower(trim($request['email'] ?? ''));
$password = $request['password'] ?? '';

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    respond(400, ['status' => 'error', 'message' => 'Enter a valid email and password.']);
}

$attempts = $_SESSION['login_attempts'] ?? [];
$attempts = array_values(array_filter($attempts, static fn($time) => $time > time() - 900));
if (count($attempts) >= 8) {
    respond(429, ['status' => 'error', 'message' => 'Too many sign-in attempts. Please wait 15 minutes and try again.']);
}

require_once __DIR__ . '/../config/database.php';
$statement = $pdo->prepare('SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1');
$statement->execute([$email]);
$user = $statement->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    $attempts[] = time();
    $_SESSION['login_attempts'] = $attempts;
    respond(401, ['status' => 'error', 'message' => 'Email or password is incorrect.']);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['user_email'] = $user['email'];
$_SESSION['user_name'] = $user['name'];
$_SESSION['user_role'] = $user['role'];
$_SESSION['authenticated'] = true;
unset($_SESSION['login_attempts']);

respond(200, ['status' => 'success', 'message' => 'Signed in successfully.']);