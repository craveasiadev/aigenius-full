<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - Wonderstar</title>
</head>

<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); overflow: hidden;">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: 0.5px;">
                                🔐 Password Reset
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <!-- Greeting -->
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 18px; line-height: 1.6;">
                                Hi <strong style="color: #667eea;">{{ $userName }}</strong>,
                            </p>

                            <!-- Main Message -->
                            <p style="margin: 0 0 25px 0; color: #555555; font-size: 16px; line-height: 1.7;">
                                We received a request to reset your password for your <strong>Wonderstar App</strong> account. Click the button below to set a new password:
                            </p>

                            <!-- Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ $resetUrl }}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                            Reset My Password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Alternative Link -->
                            <p style="margin: 25px 0 10px 0; color: #777777; font-size: 14px; line-height: 1.6;">
                                If the button above doesn't work, copy and paste this link into your browser:
                            </p>
                            <p style="margin: 0 0 30px 0; background-color: #f8f9fa; padding: 15px; border-radius: 6px; word-break: break-all; font-size: 13px; color: #667eea; border-left: 4px solid #667eea;">
                                {{ $resetUrl }}
                            </p>

                            <!-- Security Notice -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fff8e6; border-radius: 8px; border-left: 4px solid #f5a623;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0; color: #8a6d3b; font-size: 14px; line-height: 1.6;">
                                            <strong>⚠️ Security Notice:</strong><br>
                                            If you didn't request this password reset, please ignore this email. Your password will remain unchanged and your account is still secure.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eaeaea;">
                            <p style="margin: 0 0 10px 0; color: #667eea; font-size: 16px; font-weight: 600;">
                                With Love ❤️
                            </p>
                            <p style="margin: 0; color: #888888; font-size: 14px;">
                                Team Wonderpark
                            </p>
                            <p style="margin: 20px 0 0 0; color: #aaaaaa; font-size: 12px;">
                                © {{ date('Y') }} Wonderstar. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>