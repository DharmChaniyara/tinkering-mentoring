<?php
/**
 * DB Connect - Robust Version
 * Safely parses the DATABASE_URL and establishes a PDO PostgreSQL connection.
 */

// 1. Get the connection string from environment variables
$dbUrl = getenv("DATABASE_URL");

if ($dbUrl) {
    // 2. Parse the URL
    $dbopts = parse_url($dbUrl);

    // 3. Robustly extract components with fallbacks to avoid "Undefined array key" warnings
    $host     = $dbopts["host"] ?? null;
    $port     = $dbopts["port"] ?? "5432";
    $user     = isset($dbopts["user"]) ? urldecode($dbopts["user"]) : null;
    $pass     = isset($dbopts["pass"]) ? urldecode($dbopts["pass"]) : null;
    $path     = $dbopts["path"] ?? null;
    $dbname   = $path ? ltrim($path, '/') : null;

    // 4. DETECT COMMON ERROR: REST API URL vs. Database URI
    // If it's a Supabase REST URL, it usually doesn't have a 'user' and ends in 'rest/v1/'
    if (strpos($dbUrl, 'rest/v1') !== false || ($host && strpos($host, 'supabase.co') !== false && !$user)) {
        die("<strong>Deployment Error:</strong> You have used the <u>Supabase REST API URL</u> instead of the <u>PostgreSQL Connection URI</u>.<br><br>" .
            "<strong>Fix:</strong> Go to Supabase -> Project Settings -> Database -> Connection String -> URI. <br>" .
            "Copy the link starting with <code>postgresql://</code> and use that in your Render environment variables.");
    }

    // 5. Build the DSN
    if (!$host || !$dbname || !$user) {
        die("<strong>Configuration Error:</strong> The DATABASE_URL environment variable is present but malformed.");
    }

    // SSL is required for the Supabase pooler to correctly identify the tenant.
    // Bake user and pass into DSN, enforce SSL
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;user=$user;password=$pass;sslmode=require";
    $username = null;
    $password = null;

} else {
    // Local fallback for development (ensure these are set in your local .env or system)
    $host     = getenv("DB_HOST") ?: "127.0.0.1";
    $port     = getenv("DB_PORT") ?: "5432";
    $dbname   = getenv("DB_NAME") ?: "gsfc_resources";
    $username = getenv("DB_USER") ?: "root";
    $password = getenv("DB_PASS") ?: "";

    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;user=$username;password=$password";
    $username = null;
    $password = null;
}

try {
    // 6. Establish Connection
    $conn = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    // Detailed error only for debugging; in production, you might want a generic message
    die("<strong>Database Connection failed:</strong> " . $e->getMessage());
}
?>
