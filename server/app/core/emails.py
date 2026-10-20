import logging
from email.message import EmailMessage
from email.utils import formataddr
from html import escape

import aiosmtplib

from app.core.config import settings
from app.models.enums import OtpPurpose

logger = logging.getLogger(__name__)

# Email clients ignore <style> blocks and web fonts unevenly, so the layout is
# tables with inline styles, and every font has a common fallback. Colours are
# the app's light theme.
OTP_EMAIL_HTML = """\
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>{heading}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#faf8f6;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Your Rehearse {label} code is {code}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf8f6;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
            <tr>
              <td style="padding:0 4px 20px;font-family:'IBM Plex Serif',Georgia,serif;font-size:22px;font-weight:500;color:#92400e;">
                Rehearse
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;border:1px solid #e3dbd4;border-radius:12px;padding:36px 32px;font-family:'IBM Plex Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1412;">
                <h1 style="margin:0 0 16px;font-family:'IBM Plex Serif',Georgia,serif;font-size:24px;font-weight:500;line-height:1.3;color:#1c1412;">
                  {heading}
                </h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#1c1412;">
                  Hi {name}, {intro}
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="background-color:#f2eee9;border-radius:8px;padding:20px 12px;font-family:'IBM Plex Mono',Menlo,Consolas,monospace;font-size:34px;font-weight:500;letter-spacing:10px;color:#92400e;">
                      {code}
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#7a706a;">
                  The code expires in {minutes} minutes. Don't share it with
                  anyone; Rehearse will never ask you for it.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 4px 0;font-family:'IBM Plex Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#7a706a;">
                {ignore_note}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""

OTP_EMAIL_TEXT = """\
Hi {name},

Your Rehearse {label} code is {code}

The code expires in {minutes} minutes. Don't share it with anyone; Rehearse
will never ask you for it.

{ignore_note}
"""


async def send_email(to: str, subject: str, text: str, html: str):
    message = EmailMessage()
    message["From"] = formataddr((settings.email_from_name, settings.smtp_username))
    message["To"] = to
    message["Subject"] = subject
    # Plain text first, then HTML: clients show the last part they can render.
    message.set_content(text)
    message.add_alternative(html, subtype="html")

    # This runs as a background task after the response has gone out, so a
    # failure can't reach the client. Log it rather than let it vanish.
    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username,
            password=settings.smtp_password.get_secret_value(),
            # 465 is TLS from the first byte; 587 upgrades with STARTTLS.
            use_tls=settings.smtp_port == 465,
            start_tls=settings.smtp_port != 465,
        )
    except Exception:
        logger.exception("Failed to send email %r to %s", subject, to)


# The parts of the code email that change with what the code is for.
OTP_EMAIL_COPY = {
    OtpPurpose.EMAIL_VERIFICATION: {
        "label": "verification",
        "heading": "Verify your email",
        "intro": "enter this code in Rehearse to verify your email and start "
        "practising.",
        "ignore_note": "If you didn't create a Rehearse account, you can ignore "
        "this email.",
    },
    OtpPurpose.PASSWORD_RESET: {
        "label": "password reset",
        "heading": "Reset your password",
        "intro": "enter this code in Rehearse to choose a new password.",
        "ignore_note": "If you didn't ask to reset your password, you can ignore "
        "this email. Your password stays the same.",
    },
}


async def send_otp_email(
    to: str,
    name: str,
    code: str,
    purpose: OtpPurpose = OtpPurpose.EMAIL_VERIFICATION,
):
    copy = OTP_EMAIL_COPY[purpose]
    minutes = settings.otp_expire_minutes
    await send_email(
        to,
        subject=f"{code} is your Rehearse {copy['label']} code",
        text=OTP_EMAIL_TEXT.format(name=name, code=code, minutes=minutes, **copy),
        # The name is user input, so it's escaped before going into the HTML.
        html=OTP_EMAIL_HTML.format(
            name=escape(name), code=code, minutes=minutes, **copy
        ),
    )
