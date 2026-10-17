<?php
header('Content-Type: application/json; charset=UTF-8');

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['status' => 'error', 'message' => 'Only POST requests are allowed.']);
}

$request = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $request['action'] ?? 'request';
require_once __DIR__ . '/../config/database.php';

if ($action === 'request') {
    $email = strtolower(trim($request['email'] ?? ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(400, ['status' => 'error', 'message' => 'Enter a valid email address.']);
    }

    $from = getenv('CAREERPATH_FROM_EMAIL');
    $appUrl = rtrim(getenv('CAREERPATH_APP_URL') ?: '', '/');
    if (!$from || !filter_var($from, FILTER_VALIDATE_EMAIL) || !$appUrl || !filter_var($appUrl, FILTER_VALIDATE_URL)) {
        respond(503, ['status' => 'error', 'message' => 'Password recovery is temporarily unavailable.']);
    }

    $statement = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $statement->execute([$email]);
    $user = $statement->fetch();

    if ($user) {
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $pdo->prepare('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL')
            ->execute([$user['id']]);
        $pdo->prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))')
            ->execute([$user['id'], $tokenHash]);

        $resetUrl = $appUrl . '/frontend/forgot-password.html?email=' . rawurlencode($email) . '&token=' . rawurlencode($token);
        $message = "We received a request to reset your CareerPath password.\n\nUse this one-time link within one hour:\n{$resetUrl}\n\nIf you did not request a reset, you can ignore this email.";
        $headers = "From: CareerPath <{$from}>\r\nContent-Type: text/plain; charset=UTF-8";

        if (!mail($email, 'Reset your CareerPath password', $message, $headers)) {
            $pdo->prepare('UPDATE password_resets SET used_at = NOW() WHERE token_hash = ?')->execute([$tokenHash]);
            error_log('CareerPath password reset email delivery failed.');
            respond(503, ['status' => 'error', 'message' => 'Password recovery is temporarily unavailable.']);
        }
    }

    respond(200, ['status' => 'success', 'message' => 'If that email belongs to an account, a reset link has been sent.']);
}

if ($action === 'reset') {
    $email = strtolower(trim($request['email'] ?? ''));
    $token = trim($request['token'] ?? '');
    $password = $request['password'] ?? '';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[a-f0-9]{64}$/i', $token)) {
        respond(400, ['status' => 'error', 'message' => 'This reset link is invalid or expired.']);
    }
    if (strlen($password) < 8) {
        respond(400, ['status' => 'error', 'message' => 'Use a password with at least 8 characters.']);
    }

    $statement = $pdo->prepare(
        'SELECT pr.id, u.id AS user_id FROM password_resets pr JOIN users u ON u.id = pr.user_id WHERE u.email = ? AND pr.token_hash = ? AND pr.used_at IS NULL AND pr.expires_at > NOW() LIMIT 1'
    );
    $statement->execute([$email, hash('sha256', $token)]);
    $reset = $statement->fetch();
    if (!$reset) {
        respond(400, ['status' => 'error', 'message' => 'This reset link is invalid or expired.']);
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE users SET password = ? WHERE id = ?')
            ->execute([password_hash($password, PASSWORD_DEFAULT), $reset['user_id']]);
        $pdo->prepare('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL')
            ->execute([$reset['user_id']]);
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }

    respond(200, ['status' => 'success', 'message' => 'Password updated. You can now sign in.']);
}

respond(400, ['status' => 'error', 'message' => 'Invalid recovery action.']);