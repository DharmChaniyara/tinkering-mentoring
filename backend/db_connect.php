<?php
/**
 * db_connect.php — Robust Supabase / PostgreSQL Connection
 *
 * Root cause of "Tenant or user not found" on Supabase pooler (port 6543):
 *   The username MUST be in the form  postgres.YOUR_PROJECT_REF
 *   e.g.  postgresql://postgres.abcdefghijkl:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
 *
 * Fix: Copy the full URI from Supabase → Project Settings → Database →
 *      Connection String → URI  and paste it into Render → Environment → DATABASE_URL
 */

// ── 1. Read connection string ───────────────────────────────────────────────
$dbUrl = getenv('DATABASE_URL');

if ($dbUrl) {

    // ── 2. Parse URL ────────────────────────────────────────────────────────
    $dbopts = parse_url($dbUrl);

    $host   = $dbopts['host']                                    ?? null;
    $port   = $dbopts['port']                                    ?? '5432';
    $user   = isset($dbopts['user']) ? urldecode($dbopts['user']) : null;
    $pass   = isset($dbopts['pass']) ? urldecode($dbopts['pass']) : null;
    $dbname = isset($dbopts['path']) ? ltrim($dbopts['path'], '/') : null;

    // ── 3. Guard: REST URL accidentally used instead of DB URI ───────────────
    if (!empty($dbopts['path']) && strpos($dbopts['path'], 'rest/v1') !== false) {
        die('<strong>Deployment Error:</strong> You pasted the Supabase <u>REST API URL</u> '
          . 'instead of the <u>PostgreSQL Connection URI</u>.<br><br>'
          . '<strong>Fix:</strong> Supabase → Project Settings → Database → '
          . 'Connection String → URI → copy the string starting with '
          . '<code>postgresql://</code>.');
    }

    // ── 4. Guard: missing components ────────────────────────────────────────
    if (!$host || !$dbname || !$user) {
        $diag = [
            'host'   => $host   ?: '(missing)',
            'port'   => $port,
            'dbname' => $dbname ?: '(missing)',
            'user'   => $user   ?: '(missing)',
            'pass'   => $pass   ? '(set)' : '(missing)',
        ];
        die('<strong>Configuration Error:</strong> DATABASE_URL is present but malformed.<br>'
          . '<pre>' . htmlspecialchars(json_encode($diag, JSON_PRETTY_PRINT)) . '</pre>'
          . 'Expected format:<br>'
          . '<code>postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres</code>');
    }

    // ── 5. Build DSN — credentials baked in + SSL required for pooler ───────
    //    sslmode=require is mandatory for Supabase; without it the pooler
    //    cannot match the tenant and returns "Tenant or user not found".
    $dsn      = "pgsql:host=$host;port=$port;dbname=$dbname;user=$user;password=$pass;sslmode=require";
    $pdoUser  = null;   // already in DSN
    $pdoPass  = null;

} else {

    // ── Local / dev fallback ─────────────────────────────────────────────────
    $host    = getenv('DB_HOST') ?: '127.0.0.1';
    $port    = getenv('DB_PORT') ?: '5432';
    $dbname  = getenv('DB_NAME') ?: 'gsfc_resources';
    $pdoUser = getenv('DB_USER') ?: 'postgres';
    $pdoPass = getenv('DB_PASS') ?: '';

    $dsn     = "pgsql:host=$host;port=$port;dbname=$dbname";
}

// ── 6. Connect ───────────────────────────────────────────────────────────────
try {
    $conn = new PDO($dsn, $pdoUser, $pdoPass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    // Surface the exact message so you can diagnose without SSH access
    $msg = $e->getMessage();

    // Hint for the most common Supabase pooler mistake
    if (strpos($msg, 'Tenant or user not found') !== false) {
        die('<strong>Database Connection Failed — Tenant or user not found</strong><br><br>'
          . '✅ <strong>Most likely fix:</strong><br>'
          . 'Your <code>DATABASE_URL</code> username must be <code>postgres.YOUR_PROJECT_REF</code><br>'
          . 'Go to <strong>Supabase → Project Settings → Database → Connection String → URI</strong><br>'
          . 'Copy the full URI and paste it into <strong>Render → Environment → DATABASE_URL</strong><br><br>'
          . '<small style="color:#888">Raw error: ' . htmlspecialchars($msg) . '</small>');
    }

    die('<strong>Database Connection Failed:</strong> ' . htmlspecialchars($msg));
}
?>
