<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'path' => '/']);
    session_start();
}

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $message): never { respond($status, ['error' => $message]); }
function ok(mixed $data, int $status = 200): never { respond($status, ['data' => $data]); }
function inputJson(): array
{
    $decoded = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($decoded) ? $decoded : [];
}
function textLength(string $value): int
{
    $count = preg_match_all('/./us', $value, $matches);
    return $count === false ? strlen($value) : $count;
}
function currentUser(mysqli $conn): array
{
    if (empty($_SESSION['user_id'])) fail(401, 'Please log in to continue.');
    $id = (int) $_SESSION['user_id'];
    $stmt = $conn->prepare('SELECT name, email FROM users WHERE id = ?');
    $stmt->bind_param('i', $id); $stmt->execute(); $row = $stmt->get_result()->fetch_assoc();
    if (!$row) fail(401, 'Please log in to continue.');
    $_SESSION['user_name'] = $row['name']; $_SESSION['user_email'] = $row['email'];
    return ['id' => $id, 'name' => $row['name'], 'email' => $row['email']];
}
function propertyRow(array $row): array
{
    $row['id'] = (int) $row['id'];
    $row['seller_id'] = (int) $row['seller_id'];
    $row['buyer_id'] = $row['buyer_id'] === null ? null : (int) $row['buyer_id'];
    $row['bedrooms'] = $row['bedrooms'] === null ? null : (int) $row['bedrooms'];
    $row['bathrooms'] = $row['bathrooms'] === null ? null : (int) $row['bathrooms'];
    $row['image_url'] = '/uploads/' . rawurlencode((string) $row['image']);
    return $row;
}
function fetchProperty(mysqli $conn, int $id): ?array
{
    $stmt = $conn->prepare('SELECT p.*, s.name AS seller_name, b.name AS buyer_name FROM properties p JOIN users s ON p.seller_id = s.id LEFT JOIN users b ON p.buyer_id = b.id WHERE p.id = ?');
    $stmt->bind_param('i', $id); $stmt->execute(); $row = $stmt->get_result()->fetch_assoc();
    return $row ? propertyRow($row) : null;
}

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$apiOffset = strpos($requestPath, '/api');
$apiPath = $apiOffset === false ? '/' : '/' . trim(substr($requestPath, $apiOffset + 4), '/');
if ($apiPath === '//') $apiPath = '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $dbHost = getenv('DB_HOST') ?: '127.0.0.1';
    $dbPort = (int) (getenv('DB_PORT') ?: 3307);
    $dbUser = getenv('DB_USER') ?: 'root';
    $dbPassword = getenv('DB_PASSWORD') ?: '';
    $dbName = getenv('DB_NAME') ?: 'property_listing_app';
    $conn = new mysqli($dbHost, $dbUser, $dbPassword, $dbName, $dbPort);
    $conn->set_charset('utf8mb4');

    if ($apiPath === '/auth/session' && $method === 'GET') {
        if (empty($_SESSION['user_id'])) ok(null);
        ok(currentUser($conn));
    }
    if ($apiPath === '/auth/register' && $method === 'POST') {
        $input = inputJson(); $name = trim((string) ($input['name'] ?? '')); $email = strtolower(trim((string) ($input['email'] ?? ''))); $password = (string) ($input['password'] ?? '');
        if ($name === '' || textLength($name) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150 || strlen($password) < 8) fail(422, 'Enter your name, a valid email, and a password with at least 8 characters.');
        $hash = password_hash($password, PASSWORD_DEFAULT);
        try { $stmt = $conn->prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)'); $stmt->bind_param('sss', $name, $email, $hash); $stmt->execute(); }
        catch (mysqli_sql_exception $e) { if ((int) $e->getCode() === 1062) fail(409, 'An account with that email already exists.'); throw $e; }
        session_regenerate_id(true); $_SESSION['user_id'] = $stmt->insert_id; $_SESSION['user_name'] = $name; $_SESSION['user_email'] = $email;
        ok(['id' => (int) $stmt->insert_id, 'name' => $name, 'email' => $email], 201);
    }
    if ($apiPath === '/auth/login' && $method === 'POST') {
        $input = inputJson(); $email = strtolower(trim((string) ($input['email'] ?? ''))); $password = (string) ($input['password'] ?? '');
        $stmt = $conn->prepare('SELECT id, name, email, password FROM users WHERE email = ?'); $stmt->bind_param('s', $email); $stmt->execute(); $user = $stmt->get_result()->fetch_assoc();
        if (!$user || !password_verify($password, $user['password'])) fail(401, 'The email or password was not recognized.');
        session_regenerate_id(true); $_SESSION['user_id'] = (int) $user['id']; $_SESSION['user_name'] = $user['name']; $_SESSION['user_email'] = $user['email'];
        ok(['id' => (int) $user['id'], 'name' => $user['name'], 'email' => $user['email']]);
    }
    if ($apiPath === '/auth/logout' && $method === 'POST') {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) { $params = session_get_cookie_params(); setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']); }
        session_destroy(); ok(['logged_out' => true]);
    }
    if ($apiPath === '/properties' && $method === 'GET') {
        $result = $conn->query("SELECT p.*, s.name AS seller_name FROM properties p JOIN users s ON p.seller_id = s.id WHERE p.status = 'Available' ORDER BY p.created_at DESC");
        $rows = array_map('propertyRow', $result->fetch_all(MYSQLI_ASSOC)); ok($rows);
    }
    if (preg_match('#^/properties/(\d+)$#', $apiPath, $match) && $method === 'GET') {
        $property = fetchProperty($conn, (int) $match[1]); if (!$property) fail(404, 'Property not found.'); ok($property);
    }
    if ($apiPath === '/my-listings' && $method === 'GET') {
        $user = currentUser($conn);
        $stmt = $conn->prepare('SELECT p.*, s.name AS seller_name, b.name AS buyer_name FROM properties p JOIN users s ON p.seller_id = s.id LEFT JOIN users b ON p.buyer_id = b.id WHERE p.seller_id = ? ORDER BY p.created_at DESC');
        $stmt->bind_param('i', $user['id']); $stmt->execute(); ok(array_map('propertyRow', $stmt->get_result()->fetch_all(MYSQLI_ASSOC)));
    }
    if ($apiPath === '/properties' && $method === 'POST') {
        $user = currentUser($conn);
        $title = trim((string) ($_POST['title'] ?? '')); $type = (string) ($_POST['property_type'] ?? ''); $price = $_POST['price'] ?? ''; $location = trim((string) ($_POST['location'] ?? '')); $description = trim((string) ($_POST['description'] ?? ''));
        $bedrooms = $_POST['bedrooms'] ?? ''; $bathrooms = $_POST['bathrooms'] ?? ''; $types = ['House', 'Condo', 'Land', 'Townhouse', 'Other'];
        if ($title === '' || textLength($title) > 150 || !in_array($type, $types, true) || !is_numeric($price) || (float) $price <= 0 || $location === '' || textLength($location) > 150 || $description === '') fail(422, 'Please complete the required fields and enter a price greater than zero.');
        foreach ([$bedrooms, $bathrooms] as $count) if ($count !== '' && (!ctype_digit((string) $count) || (int) $count > 50)) fail(422, 'Bedroom and bathroom counts must be whole numbers from 0 to 50.');
        if (!isset($_FILES['image'])) fail(422, 'Please choose one photo to upload.');
        if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            if ($_FILES['image']['error'] === UPLOAD_ERR_INI_SIZE || $_FILES['image']['error'] === UPLOAD_ERR_FORM_SIZE) fail(422, 'The photo must be 2 MB or smaller.');
            fail(422, 'Please choose one photo to upload.');
        }
        $photo = $_FILES['image']; if ((int) $photo['size'] > 2 * 1024 * 1024) fail(422, 'The photo must be 2 MB or smaller.');
        $imageInfo = getimagesize($photo['tmp_name']);
        $mime = $imageInfo['mime'] ?? '';
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($extensions[$mime])) fail(422, 'Choose a JPG, PNG, or WEBP image.');
        $name = 'property_' . bin2hex(random_bytes(16)) . '.' . $extensions[$mime]; $folder = dirname(__DIR__) . '/uploads/';
        if (!is_dir($folder) && !mkdir($folder, 0755, true)) fail(500, 'The photo could not be saved. Check that uploads/ is writable.');
        if (!move_uploaded_file($photo['tmp_name'], $folder . $name)) fail(500, 'The photo could not be saved. Check that uploads/ is writable.');
        $bed = $bedrooms === '' ? null : (int) $bedrooms; $bath = $bathrooms === '' ? null : (int) $bathrooms; $numericPrice = (float) $price;
        try { $stmt = $conn->prepare('INSERT INTO properties (seller_id, title, property_type, price, location, description, bedrooms, bathrooms, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'); $stmt->bind_param('issdssiis', $user['id'], $title, $type, $numericPrice, $location, $description, $bed, $bath, $name); $stmt->execute(); }
        catch (Throwable $e) { @unlink($folder . $name); throw $e; }
        $created = fetchProperty($conn, (int) $stmt->insert_id); ok($created, 201);
    }
    if (preg_match('#^/properties/(\d+)/purchase$#', $apiPath, $match) && $method === 'POST') {
        $user = currentUser($conn); $id = (int) $match[1]; $property = fetchProperty($conn, $id);
        if (!$property) fail(404, 'This property could not be found.');
        if ($property['seller_id'] === $user['id']) fail(403, 'You cannot buy your own property.');
        if ($property['status'] !== 'Available') fail(409, 'This property is no longer available.');
        $stmt = $conn->prepare("UPDATE properties SET status = 'Sold', buyer_id = ?, sold_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'Available' AND seller_id <> ?");
        $stmt->bind_param('iii', $user['id'], $id, $user['id']); $stmt->execute();
        if ($stmt->affected_rows !== 1) fail(409, 'This property is no longer available. Please return to the listings.');
        ok(fetchProperty($conn, $id));
    }
    fail(404, 'API route not found.');
} catch (Throwable $e) {
    error_log('Home Haven API error: ' . $e->getMessage());
    fail(500, 'The request could not be completed. Please try again.');
}
