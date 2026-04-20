<?php
// Retrieve database configuration from environment variable (or `.env` file simulation)
$dbUrl = getenv("DATABASE_URL");

if ($dbUrl) {
    // Render/Supabase provides a complete URL: postgresql://[user]:[password]@[host]:[port]/[postgres]
    $dbopts = parse_url($dbUrl);
    $servername = $dbopts["host"];
    $port = $dbopts["port"];
    $username = $dbopts["user"];
    $password = $dbopts["pass"];
    $dbname = ltrim($dbopts["path"], '/');
    
    $dsn = "pgsql:host=$servername;port=$port;dbname=$dbname";
} else {
    // Local fallback if no DATABASE_URL is provided
    $servername = getenv("DB_HOST") ?: "127.0.0.1";
    $username = getenv("DB_USER") ?: "root";
    $password = getenv("DB_PASS") ?: ""; 
    $dbname = getenv("DB_NAME") ?: "gsfc_resources";
    $port = getenv("DB_PORT") ?: "5432";
    
    $dsn = "pgsql:host=$servername;port=$port;dbname=$dbname";
}

try {
    // Create PDO connection for PostgreSQL
    $conn = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        // Since the rest of the codebase uses fetch_assoc(), we set the default fetch mode
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    die("Database Connection failed: " . $e->getMessage());
}
?>
