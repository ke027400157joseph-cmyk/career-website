<?php
header('Content-Type: application/json; charset=UTF-8');
session_start();

function adminRespond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if (empty($_SESSION['authenticated']) || ($_SESSION['user_role'] ?? 'user') !== 'admin') {
    adminRespond(403, ['status' => 'error', 'message' => 'Administrator access is required.']);
}

require_once __DIR__ . '/../config/database.php';
$entities = [
    'careers' => ['table' => 'careers', 'fields' => ['title', 'description', 'average_salary', 'required_skills', 'category', 'image_url']],
    'jobs' => ['table' => 'jobs', 'fields' => ['career_id', 'title', 'company', 'location', 'job_type', 'description', 'salary']],
    'courses' => ['table' => 'courses', 'fields' => ['career_id', 'title', 'provider', 'url', 'price']]
];

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $view = $_GET['view'] ?? '';
        if ($view === 'overview') {
            $counts = [];
            foreach ($entities as $entity => $definition) {
                $counts[$entity] = (int) $pdo->query('SELECT COUNT(*) FROM ' . $definition['table'])->fetchColumn();
            }
            $counts['applications'] = (int) $pdo->query('SELECT COUNT(*) FROM job_applications')->fetchColumn();
            adminRespond(200, ['status' => 'success', 'data' => $counts]);
        }
        if ($view === 'applications') {
            $applications = $pdo->query(
                'SELECT a.id, a.applicant_name, a.applicant_email, a.applicant_phone, a.cover_letter, a.status, a.submitted_at,
                        j.title AS job_title, j.company
                 FROM job_applications a JOIN jobs j ON j.id = a.job_id
                 ORDER BY a.submitted_at DESC LIMIT 200'
            )->fetchAll();
            adminRespond(200, ['status' => 'success', 'data' => $applications]);
        }
        if (!isset($entities[$view])) adminRespond(400, ['status' => 'error', 'message' => 'Choose a valid content type.']);

        if ($view === 'jobs') {
            $rows = $pdo->query('SELECT j.*, c.title AS career_title FROM jobs j LEFT JOIN careers c ON c.id = j.career_id ORDER BY j.id DESC')->fetchAll();
        } elseif ($view === 'courses') {
            $rows = $pdo->query('SELECT c.*, cr.title AS career_title FROM courses c LEFT JOIN careers cr ON cr.id = c.career_id ORDER BY c.id DESC')->fetchAll();
        } else {
            $rows = $pdo->query('SELECT * FROM careers ORDER BY id DESC')->fetchAll();
        }
        adminRespond(200, ['status' => 'success', 'data' => $rows]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: GET, POST');
        adminRespond(405, ['status' => 'error', 'message' => 'Method not allowed.']);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $entity = $input['entity'] ?? '';
    $action = $input['action'] ?? '';
    $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
    if (!isset($entities[$entity]) || !in_array($action, ['create', 'update', 'delete'], true)) {
        adminRespond(400, ['status' => 'error', 'message' => 'Invalid admin action.']);
    }

    $table = $entities[$entity]['table'];
    if ($action === 'delete') {
        if (!$id || $id < 1) adminRespond(400, ['status' => 'error', 'message' => 'Choose a valid record.']);
        $statement = $pdo->prepare("DELETE FROM {$table} WHERE id = ?");
        $statement->execute([$id]);
        adminRespond(200, ['status' => 'success', 'message' => 'Record deleted.']);
    }

    $fields = $input['fields'] ?? [];
    $values = [];
    foreach ($entities[$entity]['fields'] as $field) {
        $value = $fields[$field] ?? null;
        if ($field === 'career_id') {
            $value = ($value === '' || $value === null) ? null : filter_var($value, FILTER_VALIDATE_INT);
            if ($value !== null && $value === false) adminRespond(400, ['status' => 'error', 'message' => 'Career ID must be a number.']);
        } elseif ($field === 'price') {
            $value = filter_var($value ?? 0, FILTER_VALIDATE_FLOAT);
            if ($value === false || $value < 0) adminRespond(400, ['status' => 'error', 'message' => 'Course price must be zero or greater.']);
        } else {
            $value = trim((string) ($value ?? ''));
        }
        $values[$field] = $value;
    }

    if (trim((string) ($values['title'] ?? '')) === '') adminRespond(400, ['status' => 'error', 'message' => 'Title is required.']);
    if ($entity === 'jobs' && trim((string) $values['company']) === '') adminRespond(400, ['status' => 'error', 'message' => 'Company is required.']);
    if ($entity === 'jobs' && !in_array($values['job_type'], ['Full-time', 'Part-time', 'Contract', 'Remote'], true)) {
        adminRespond(400, ['status' => 'error', 'message' => 'Choose a valid job type.']);
    }
    if ($entity === 'courses' && $values['url'] !== '' && !filter_var($values['url'], FILTER_VALIDATE_URL)) {
        adminRespond(400, ['status' => 'error', 'message' => 'Course link must be a valid URL.']);
    }

    $columns = array_keys($values);
    if ($action === 'create') {
        $sql = "INSERT INTO {$table} (" . implode(', ', $columns) . ') VALUES (' . implode(', ', array_fill(0, count($columns), '?')) . ')';
        $pdo->prepare($sql)->execute(array_values($values));
        adminRespond(201, ['status' => 'success', 'message' => 'Record created.', 'id' => (int) $pdo->lastInsertId()]);
    }

    if (!$id || $id < 1) adminRespond(400, ['status' => 'error', 'message' => 'Choose a valid record to update.']);
    $assignments = array_map(static fn(string $column): string => $column . ' = ?', $columns);
    $pdo->prepare("UPDATE {$table} SET " . implode(', ', $assignments) . ' WHERE id = ?')->execute([...array_values($values), $id]);
    adminRespond(200, ['status' => 'success', 'message' => 'Record updated.']);
} catch (Throwable $error) {
    error_log('Admin content operation failed: ' . $error->getMessage());
    adminRespond(500, ['status' => 'error', 'message' => 'The content change could not be completed.']);
}