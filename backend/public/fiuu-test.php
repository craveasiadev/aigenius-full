<?php
// ============================================================
// RAW FIUU PAYMENT TRIGGER - NO CLASSES, NO FRAMEWORK
// Access: https://your-domain/fiuu-test.php
// ============================================================

// ---- 1. Load .env manually (no Laravel) ----
$envPath = __DIR__ . '/../.env';
$env = [];
if (file_exists($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (strpos(trim($line), '#') === 0 || !strpos($line, '=')) continue;
        list($k, $v) = explode('=', $line, 2);
        $env[trim($k)] = trim($v, " \t\n\r\0\x0B\"'");
    }
}

// ---- 2. Keys from .env ----
$merchantId = $env['FIUU_MERCHANT_ID'] ?? 'craveasia';
$verifyKey  = $env['FIUU_VERIFY_KEY']  ?? '';
$appUrl     = $env['APP_URL']          ?? 'http://localhost';

// ---- 3. Test payment data (edit as needed) ----
$orderId     = 'TEST' . time();
$amount      = number_format(1.00, 2, '.', ''); // RM 1.00
$name        = 'Test User';
$email       = 'test@example.com';
$phone       = '0123456789';
$description = 'Fiuu Test Payment';
$country     = 'MY';
$currency    = 'MYR';

// Payment method: index.php(card) | fpx.php | GrabPay.php | TNG-EWALLET.php | BOOST.php
$methodPath  = 'index.php';

// ---- 4. Generate vcode (md5 signature) ----
// Formula: md5(amount + merchantId + orderId + verifyKey)
$vcode = md5($amount . $merchantId . $orderId . $verifyKey);

// ---- 5. Build the gateway URL ----
$paymentUrl = "https://pay.fiuu.com/RMS/pay/{$merchantId}/{$methodPath}";

// ---- 6. Form fields Fiuu expects ----
$fields = [
    'MerchantCode' => $merchantId,
    'amount'       => $amount,
    'orderid'      => $orderId,
    'bill_name'    => $name,
    'bill_email'   => $email,
    'bill_mobile'  => $phone,
    'bill_desc'    => $description,
    'country'      => $country,
    'currency'     => $currency,
    'vcode'        => $vcode,
    'returnurl'    => rtrim($appUrl, '/') . '/fiuu-return.php',
    'callbackurl'  => rtrim($appUrl, '/') . '/fiuu-callback.php',
];

// ---- 7. Debug view: ?debug=1 to inspect before submitting ----
if (isset($_GET['debug'])) {
    echo "<pre>";
    echo "Payment URL: $paymentUrl\n\n";
    echo "Fields:\n";
    print_r($fields);
    echo "\nvcode string: {$amount}{$merchantId}{$orderId}{$verifyKey}\n";
    echo "vcode md5   : {$vcode}\n";
    exit;
}
?>
<!DOCTYPE html>
<html>
<head><title>Fiuu Payment Redirect...</title></head>
<body onload="document.forms[0].submit()">
    <p>Redirecting to Fiuu payment gateway... If not redirected,
       <button type="submit" form="fiuuForm">click here</button>.</p>

    <form id="fiuuForm" method="POST" action="<?php echo htmlspecialchars($paymentUrl); ?>">
        <?php foreach ($fields as $key => $value): ?>
            <input type="hidden" name="<?php echo htmlspecialchars($key); ?>"
                   value="<?php echo htmlspecialchars($value); ?>">
        <?php endforeach; ?>
    </form>
</body>
</html>
