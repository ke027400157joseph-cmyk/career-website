<?php
// backend/config/database.php
$host = '127.0.0.1';
$db   = 'career_website';
$user = 'root'; // Change to your DB username
$pass = '';     // Change to your DB password
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    die(json_encode(["error" => "Database connection failed"]));
}
?>
<?php
// backend/careers/get_careers.php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); // Allow frontend to access

require_once '../config/database.php';

try {
    $stmt = $pdo->query("SELECT * FROM careers");
    $careers = $stmt->fetchAll();
    
    echo json_encode(["status" => "success", "data" => $careers]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
<?php
// backend/careers/get_career_full_details.php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once '../config/database.php';

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid Career ID"]);
    exit;
}

$career_id = (int)$_GET['id'];

try {
    // 1. Get Career Details
    $stmt = $pdo->prepare("SELECT * FROM careers WHERE id = ?");
    $stmt->execute([$career_id]);
    $career = $stmt->fetch();

    if (!$career) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Career not found"]);
        exit;
    }

    // 2. Get Related Jobs
    $stmt = $pdo->prepare("SELECT * FROM jobs WHERE career_id = ? ORDER BY id DESC LIMIT 5");
    $stmt->execute([$career_id]);
    $jobs = $stmt->fetchAll();

    // 3. Get Related Courses
    $stmt = $pdo->prepare("SELECT * FROM courses WHERE career_id = ? ORDER BY id DESC LIMIT 5");
    $stmt->execute([$career_id]);
    $courses = $stmt->fetchAll();

    // Combine and send
    echo json_encode([
        "status" => "success",
        "data" => [
            "career" => $career,
            "jobs" => $jobs,
            "courses" => $courses
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
<?php
// backend/jobs/get_jobs.php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once '../config/database.php';

// Get filter parameters
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$job_type = isset($_GET['job_type']) ? trim($_GET['job_type']) : '';
$category = isset($_GET['category']) ? trim($_GET['category']) : '';
$location = isset($_GET['location']) ? trim($_GET['location']) : '';
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;

try {
    $sql = "SELECT j.*, c.title AS career_title, c.category 
            FROM jobs j 
            LEFT JOIN careers c ON j.career_id = c.id 
            WHERE 1=1";
    $params = [];
    
    // Search filter (title, company, description)
    if (!empty($search)) {
        $sql .= " AND (j.title LIKE ? OR j.company LIKE ? OR j.description LIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    // Job type filter
    if (!empty($job_type)) {
        $sql .= " AND j.job_type = ?";
        $params[] = $job_type;
    }
    
    // Category filter
    if (!empty($category)) {
        $sql .= " AND c.category = ?";
        $params[] = $category;
    }
    
    // Location filter
    if (!empty($location)) {
        $sql .= " AND j.location LIKE ?";
        $params[] = "%$location%";
    }
    
    $sql .= " ORDER BY j.id DESC LIMIT ?";
    $params[] = $limit;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $jobs = $stmt->fetchAll();
    
    echo json_encode(["status" => "success", "data" => $jobs, "count" => count($jobs)]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>