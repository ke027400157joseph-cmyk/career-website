<?php
header('Content-Type: application/json; charset=UTF-8');
session_start();

function profileRespond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if (empty($_SESSION['authenticated']) || empty($_SESSION['user_id'])) {
    profileRespond(401, ['status' => 'error', 'message' => 'Please sign in to manage your profile.']);
}

require_once __DIR__ . '/../config/database.php';
$userId = (int) $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $statement = $pdo->prepare(
        'SELECT u.name, u.email, p.phone, p.location, p.bio
         FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = ?'
    );
    $statement->execute([$userId]);
    profileRespond(200, ['status' => 'success', 'data' => $statement->fetch()]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    profileRespond(405, ['status' => 'error', 'message' => 'Use GET or PUT for profile data.']);
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$name = trim($input['name'] ?? '');
$email = strtolower(trim($input['email'] ?? ''));
$phone = trim($input['phone'] ?? '');
$location = trim($input['location'] ?? '');
$bio = trim($input['bio'] ?? '');

if ($name === '' || strlen($name) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 100) {
    profileRespond(400, ['status' => 'error', 'message' => 'Enter a valid name and email address.']);
}
if (strlen($phone) > 40 || strlen($location) > 120 || strlen($bio) > 500) {
    profileRespond(400, ['status' => 'error', 'message' => 'One or more profile fields are too long.']);
}

try {
    $pdo->beginTransaction();
    $pdo->prepare('UPDATE users SET name = ?, email = ? WHERE id = ?')->execute([$name, $email, $userId]);
    $pdo->prepare(
        'INSERT INTO user_profiles (user_id, phone, location, bio) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE phone = VALUES(phone), location = VALUES(location), bio = VALUES(bio)'
    )->execute([$userId, $phone ?: null, $location ?: null, $bio ?: null]);
    $pdo->commit();

    $_SESSION['user_name'] = $name;
    $_SESSION['user_email'] = $email;
    profileRespond(200, ['status' => 'success', 'message' => 'Profile updated.']);
} catch (PDOException $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if ($error->getCode() === '23000') {
        profileRespond(409, ['status' => 'error', 'message' => 'That email address is already in use.']);
    }
    error_log('Profile update failed: ' . $error->getMessage());
    profileRespond(500, ['status' => 'error', 'message' => 'Profile could not be updated.']);
}