<?php
/**
 * install_db.php — Browser-based PostgreSQL Schema Installer
 *
 * Visit this page ONCE after first deployment to create all tables and seed data.
 * ⚠️  DELETE or RESTRICT this file after use — it drops and recreates all tables!
 *
 * Access: https://YOUR-APP.onrender.com/install_db.php?secret=INSTALL_SECRET
 * Set INSTALL_SECRET as an env var in Render for protection.
 */
session_start();

// ── Simple secret-key protection ─────────────────────────────────────────────
$installSecret = getenv('INSTALL_SECRET') ?: 'changeme123';
$provided      = $_GET['secret'] ?? $_POST['secret'] ?? '';

if ($provided !== $installSecret) {
    http_response_code(403);
    die(renderPage('Access Denied', '
        <div class="card error">
            <h2>🔒 Access Denied</h2>
            <p>Set <code>INSTALL_SECRET</code> as an environment variable in Render,
               then visit:<br>
               <code>/install_db.php?secret=YOUR_SECRET</code></p>
        </div>'));
}

// ── Load DB connection ────────────────────────────────────────────────────────
require_once __DIR__ . '/db_connect.php';

// ── Read the PostgreSQL schema file ──────────────────────────────────────────
$schemaFile = __DIR__ . '/schema_pg.sql';
if (!file_exists($schemaFile)) {
    die(renderPage('Error', '<div class="card error"><h2>❌ schema_pg.sql not found</h2></div>'));
}

$results = [];
$success = true;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'run') {

    $sql = file_get_contents($schemaFile);

    // Split on statement terminators (semicolons)
    $statements = array_filter(
        array_map('trim', explode(';', $sql)),
        fn($s) => $s !== '' && !preg_match('/^--/', $s)
    );

    foreach ($statements as $stmt) {
        $preview = substr($stmt, 0, 80);
        try {
            $conn->exec($stmt);
            $results[] = ['ok' => true,  'sql' => $preview];
        } catch (PDOException $e) {
            $results[] = ['ok' => false, 'sql' => $preview, 'err' => $e->getMessage()];
            // Don't stop — continue with remaining statements
        }
    }

    // Check table status
    $tables = $conn->query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
                   ->fetchAll(PDO::FETCH_COLUMN);
} else {
    $tables = [];
    try {
        $tables = $conn->query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
                       ->fetchAll(PDO::FETCH_COLUMN);
    } catch (PDOException $e) { /* ignore */ }
}

// ── Output ────────────────────────────────────────────────────────────────────
$tableList = $tables
    ? '<ul>' . implode('', array_map(fn($t) => "<li>✅ <code>$t</code></li>", $tables)) . '</ul>'
    : '<p style="color:#ef4444;">No tables found yet.</p>';

$resultHtml = '';
if ($results) {
    $ok  = count(array_filter($results, fn($r) => $r['ok']));
    $bad = count($results) - $ok;
    $resultHtml = "<div class='card " . ($bad ? 'warn' : 'success') . "'>
        <h3>Executed " . count($results) . " statements — $ok ok / $bad errors</h3>
        <ul style='font-family:monospace;font-size:12px;'>";
    foreach ($results as $r) {
        $icon   = $r['ok'] ? '✅' : '❌';
        $err    = isset($r['err']) ? " <em style='color:#f87171'>— " . htmlspecialchars($r['err']) . "</em>" : '';
        $resultHtml .= "<li>$icon " . htmlspecialchars($r['sql']) . "...$err</li>";
    }
    $resultHtml .= '</ul></div>';
}

echo renderPage('Install Database', "
    <div class='card'>
        <h2>🗄️ StudyShare — Database Installer</h2>
        <p>This will run <code>schema_pg.sql</code> against your Supabase PostgreSQL database.
           It uses <code>DROP TABLE ... CASCADE</code> before recreating — existing data will be lost.</p>

        <h3>Current Tables in Database</h3>
        $tableList

        $resultHtml

        <form method='POST'>
            <input type='hidden' name='action' value='run'>
            <input type='hidden' name='secret' value='" . htmlspecialchars($provided) . "'>
            <button type='submit' onclick=\"return confirm('⚠️ This will DROP all tables and re-seed. Continue?')\">
                🚀 Run Schema &amp; Seed Data
            </button>
        </form>

        <p style='margin-top:2rem;color:#ef4444;font-size:13px;'>
            ⚠️ <strong>Security:</strong> Delete or rename this file after running it, or add
            <code>INSTALL_SECRET</code> to a random string in your Render env vars.
        </p>
    </div>
");

// ── HTML wrapper ──────────────────────────────────────────────────────────────
function renderPage(string $title, string $body): string {
    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>StudyShare | $title</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0d0d0d;color:#e5e7eb;font-family:'Segoe UI',Arial,sans-serif;padding:40px 20px;min-height:100vh}
  h1{font-size:24px;margin-bottom:24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  h2{font-size:18px;margin-bottom:12px;color:#f9fafb}
  h3{font-size:15px;margin:16px 0 8px;color:#d1d5db}
  .card{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:28px;max-width:720px;margin:0 auto 20px}
  .error{border-color:#ef4444}
  .warn{border-color:#f59e0b}
  .success{border-color:#10b981}
  code{background:#1f2937;padding:2px 6px;border-radius:4px;font-size:13px;color:#818cf8}
  ul{list-style:none;padding-left:0;margin-top:8px}
  ul li{padding:4px 0;font-size:13px;color:#9ca3af;border-bottom:1px solid #1f2937}
  button{margin-top:16px;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
         border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
  button:hover{opacity:0.9}
  p{font-size:14px;color:#9ca3af;line-height:1.6;margin-top:8px}
</style>
</head>
<body>
<h1>StudyShare DB Installer</h1>
$body
</body>
</html>
HTML;
}
?>
