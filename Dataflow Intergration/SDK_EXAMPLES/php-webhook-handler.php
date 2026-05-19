<?php
/**
 * DataPulseFlow webhook starter (plain PHP)
 * Usage: place in route/controller that receives POST requests.
 */

$webhookSecret = getenv('DPF_WEBHOOK_SECRET') ?: 'dpfwhsec_replace_me';
$timestamp = $_SERVER['HTTP_X_DPF_TIMESTAMP'] ?? '';
$signature = $_SERVER['HTTP_X_DPF_SIGNATURE'] ?? '';
$rawBody = file_get_contents('php://input');

function fail($code, $message) {
  http_response_code($code);
  header('Content-Type: application/json');
  echo json_encode(['error' => $message]);
  exit;
}

if (!$timestamp || !$signature || !$rawBody) {
  fail(400, 'missing headers or body');
}

if (abs(time() - intval($timestamp)) > 300) {
  fail(401, 'stale timestamp');
}

$signedPayload = $timestamp . "." . $rawBody;
$expected = hash_hmac('sha256', $signedPayload, $webhookSecret);

if (!hash_equals($expected, $signature)) {
  fail(401, 'invalid signature');
}

$event = json_decode($rawBody, true);
if (!$event || !isset($event['event_id']) || !isset($event['event_type'])) {
  fail(400, 'invalid event envelope');
}

// TODO: Persist event_id for idempotency checks in storage.
$eventType = $event['event_type'];

if ($eventType === 'property.updated') {
  error_log('property.updated: ' . ($event['data']['property_id'] ?? 'unknown'));
} elseif ($eventType === 'lead.created') {
  error_log('lead.created: ' . ($event['data']['lead_id'] ?? 'unknown'));
} else {
  error_log('unhandled event: ' . $eventType);
}

http_response_code(202);
header('Content-Type: application/json');
echo json_encode(['status' => 'accepted']);

