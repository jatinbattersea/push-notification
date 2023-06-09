<?php
require "includes/database.php";
header("Content-type: application/json");

$data = json_decode(file_get_contents('php://input'), true);

if (is_array($data) && isset($data['endpoint'])) {
  if (isset($_GET['subscribe'])) {
    $selectId = $con->query("SELECT `id` FROM `push_subscribers` WHERE `endpoint` = '{$data['endpoint']}'");
    if ($selectId->num_rows == 0) {
      // Subscribe
      $data['expirationTime'] = floor($data['expirationTime'] / 1000); // Miliseconds to seconds
      $query = $con->query("INSERT INTO `push_subscribers` (`endpoint`, `expirationTime`, `p256dh`, `authKey`) VALUES ('{$data['endpoint']}', '{$data['expirationTime']}', '{$data['keys']['p256dh']}', '{$data['keys']['auth']}')");

      if ($query) {
        echo json_encode(['status' => 'ok', 'message' => 'Subscribed']);
      } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to subscribe']);
      }
    } else {
      echo json_encode(['status' => 'error', 'message' => 'Already subscribed']);
    }
  } elseif (isset($_GET['unsubscribe'])) {
    // Unsubscribe
    $con->query("DELETE FROM `push_subscribers` WHERE `endpoint` = '{$data['endpoint']}'");
    echo json_encode(['status' => 'ok', 'message' => 'Unsubscribed']);
  } else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request']);
  }
} else {
  echo json_encode(['status' => 'error', 'message' => 'Invalid request']);
}