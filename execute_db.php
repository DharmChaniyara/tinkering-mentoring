<?php
require 'db_connect.php';
$sql = file_get_contents('database_update.sql');
if ($conn->multi_query($sql)) {
    do {
        if ($res = $conn->store_result()) {
            $res->free();
        }
    } while ($conn->more_results() && $conn->next_result());
    echo "DB Updated successfully.\n";
} else {
    echo "Error: " . $conn->error;
}
?>
