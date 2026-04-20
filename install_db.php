<?php
$servername = "localhost";
$username = "root";
$password = "";

// Create connection
$conn = new mysqli($servername, $username, $password);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Read the SQL file
$sqlFile = file_get_contents('schema.sql');

// Execute multi query
if ($conn->multi_query($sqlFile)) {
    do {
        // Store first result set
        if ($result = $conn->store_result()) {
            $result->free();
        }
    } while ($conn->more_results() && $conn->next_result());
    echo "<h1>Database Setup Successful!</h1><p>You can now go to <a href='index.php'>index.php</a> to use the app.</p>";
} else {
    echo "Error executing database setup script: " . $conn->error;
}

$conn->close();
?>
