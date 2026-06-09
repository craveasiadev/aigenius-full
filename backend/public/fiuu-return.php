<?php
// ============================================================
// RAW FIUU RETURN URL (Browser redirect after payment)
// Fiuu redirects user's BROWSER here after they pay.
// This is for the user, not server-to-server logic.
// Update $fields['returnurl'] in fiuu-test.php to point here.
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

// Fiuu may send via GET or POST
$data = array_merge($_GET, $_POST);

$tranID   = $data['tranID']   ?? '';
$orderId  = $data['orderid']  ?? '';
$status   = $data['status']   ?? '';
$domain   = $data['domain']   ?? '';
$amount   = $data['amount']   ?? '';
$currency = $data['currency'] ?? '';
$appcode  = $data['appcode']  ?? '';
$paydate  = $data['paydate']  ?? '';
$skey     = $data['skey']     ?? '';
$errDesc  = $data['error_desc'] ?? '';

// ---- 2. Verify skey ----
$expectedKey = md5($tranID . $orderId . $status . $domain . $amount . $currency . $appcode . $paydate . $secretKey);
$valid       = ($skey === $expectedKey);

$statusText = [
    '00' => 'SUCCESS',
    '11' => 'FAILED',
    '22' => 'PENDING',
][$status] ?? 'UNKNOWN';

$color = $status === '00' ? '#16a34a' : ($status === '22' ? '#f59e0b' : '#dc2626');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Payment Result</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 600px; margin: 60px auto; padding: 20px; }
        .status { color: <?php echo $color; ?>; font-size: 28px; font-weight: bold; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        td:first-child { font-weight: 600; width: 150px; color: #555; }
        .warn { background: #fee; color: #900; padding: 10px; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="status">Payment <?php echo $statusText; ?></div>

    <?php if (!$valid): ?>
        <div class="warn">WARNING: Signature verification failed. Do not trust this result.</div>
    <?php endif; ?>

    <table>
        <tr><td>Order ID</td><td><?php echo htmlspecialchars($orderId); ?></td></tr>
        <tr><td>Transaction ID</td><td><?php echo htmlspecialchars($tranID); ?></td></tr>
        <tr><td>Amount</td><td><?php echo htmlspecialchars($amount . ' ' . $currency); ?></td></tr>
        <tr><td>Status Code</td><td><?php echo htmlspecialchars($status); ?> (<?php echo $statusText; ?>)</td></tr>
        <tr><td>Pay Date</td><td><?php echo htmlspecialchars($paydate); ?></td></tr>
        <tr><td>Approval Code</td><td><?php echo htmlspecialchars($appcode); ?></td></tr>
        <?php if ($errDesc): ?>
        <tr><td>Error</td><td><?php echo htmlspecialchars($errDesc); ?></td></tr>
        <?php endif; ?>
        <tr><td>Signature</td><td><?php echo $valid ? 'VALID' : 'INVALID'; ?></td></tr>
    </table>

    <p><a href="/fiuu-test.php">Try another payment</a></p>
</body>
</html>
