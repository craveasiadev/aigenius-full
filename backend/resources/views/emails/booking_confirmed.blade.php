<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin:0; padding:0; background:#0b0d17; font-family:Arial, sans-serif; color:#111;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#0b0d17; padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellspacing="0" cellpadding="0" style="background:#ffffff; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(120deg,#5b5bff,#8a6bff); padding:24px; color:#fff;">
              <h1 style="margin:0; font-size:24px;">Your class booking is {{ $status }}!</h1>
              <p style="margin:8px 0 0; font-size:14px; opacity:0.85;">AIpreneur Workshops</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <h2 style="margin:0 0 12px; font-size:18px;">{{ $slot->course?->title ?? 'AIpreneur Class' }}</h2>
              <p style="margin:0 0 16px; color:#555; font-size:14px;">
                Thanks for booking! Here are your details:
              </p>

              <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px; color:#333;">
                <tr>
                  <td style="padding:8px 0;">Order ID</td>
                  <td style="padding:8px 0; text-align:right; font-weight:bold;">{{ $booking->order_id }}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">Date</td>
                  <td style="padding:8px 0; text-align:right; font-weight:bold;">
                    {{ optional($slot->start_time)->format('M j, Y g:i A') }}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">Location</td>
                  <td style="padding:8px 0; text-align:right; font-weight:bold;">{{ $slot->location ?? 'Online' }}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">Amount</td>
                  <td style="padding:8px 0; text-align:right; font-weight:bold;">RM {{ number_format($booking->amount, 2) }}</td>
                </tr>
              </table>

              <div style="margin-top:20px; padding:16px; background:#f3f4ff; border-radius:12px;">
                <p style="margin:0; font-size:14px; color:#333;">
                  Need help? Reply to this email and our team will assist you.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px; text-align:center; font-size:12px; color:#777;">
              AI Genius · Powered by Wonderstar
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
