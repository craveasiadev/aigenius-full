<?php
// ============================================================
// RAW FIUU CALLBACK (Server-to-Server Webhook)
// Fiuu POSTs here AFTER payment. Must respond "RECEIVEOK".
// Access: https://your-domain/fiuu-callback.php
// Update $fields['callbackurl'] in fiuu-test.php to point here.
// ============================================================

// ---- 1. Load .env ----
$envPath = __DIR__ . '/../.env';
$env = [];
if (file_exists($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (strpos(trim($line), '#') === 0 || !strpos($line, '=')) continue;
        list($k, $v) = explode('=', $line, 2);
        $env[trim($k)] = trim($v, " \t\n\r\0\x0B\"'");
    }
}

$secretKey = $env['FIUU_SECRET_KEY'] ?? '';

// ---- 2. Grab POST data from Fiuu ----
$tranID   = $_POST['tranID']   ?? '';
$orderId  = $_POST['orderid']  ?? '';
$status   = $_POST['status']   ?? '';   // 00 = success, 11 = failed, 22 = pending
$domain   = $_POST['domain']   ?? '';
$amount   = $_POST['amount']   ?? '';
$currency = $_POST['currency'] ?? '';
$appcode  = $_POST['appcode']  ?? '';
$paydate  = $_POST['paydate']  ?? '';
$skey     = $_POST['skey']     ?? '';
$errDesc  = $_POST['error_desc'] ?? '';

// ---- 3. Log every hit (for debugging) ----
$logFile = __DIR__ . '/../storage/logs/fiuu-callback.log';
$logLine = "[" . date('Y-m-d H:i:s') . "] POST: " . json_encode($_POST) . PHP_EOL;
@file_put_contents($logFile, $logLine, FILE_APPEND);

// ---- 4. Verify signature (skey) ----
// Formula: md5(tranID + orderid + status + domain + amount + currency + appcode + paydate + secretKey)
$string      = $tranID . $orderId . $status . $domain . $amount . $currency . $appcode . $paydate . $secretKey;
$expectedKey = md5($string);

if ($skey !== $expectedKey) {
    @file_put_contents($logFile, "  -> INVALID SIGNATURE (got: $skey, expected: $expectedKey)" . PHP_EOL, FILE_APPEND);
    http_response_code(400);
    echo 'INVALID SIGNATURE';
    exit;
}

// ---- 5. Handle status ----
// 00 = success | 11 = failed | 22 = pending
$statusText = [
    '00' => 'SUCCESS',
    '11' => 'FAILED',
    '22' => 'PENDING',
][$status] ?? 'UNKNOWN';

@file_put_contents(
    $logFile,
    "  -> VALID | Order: $orderId | Status: $status ($statusText) | TranID: $tranID | Amount: $amount $currency" . PHP_EOL,
    FILE_APPEND
);

// ---- 6. TODO: Update your DB here ----
// Example (plug in PDO / your own DB call):
//
// $pdo = new PDO("mysql:host=localhost;dbname=yourdb", $user, $pass);
// $stmt = $pdo->prepare("UPDATE payment_transactions SET status=?, transaction_id=?, paid_at=NOW() WHERE order_id=?");
// $stmt->execute([$statusText, $tranID, $orderId]);

// ---- 7. Reply REQUIRED by Fiuu ----
// Fiuu will retry if it doesn't receive "RECEIVEOK"
http_response_code(200);
echo 'RECEIVEOK';
