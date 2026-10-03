"""
Leave Email Diagnostic & Test Utility
Run this script to test your SMTP configuration from .env or environment variables.

Usage:
    python test_email.py [recipient_email]
"""

import os
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load .env if present
def load_env_file():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        print(f"[OK] Found .env file at {env_path}")
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, val = line.split('=', 1)
                        os.environ[key.strip()] = val.strip().strip("'\"")
        except Exception as e:
            print(f"[ERROR] Error loading .env file: {e}")
    else:
        print("[WARNING] .env file NOT found in project root directory.")

def test_smtp():
    load_env_file()

    print("\n--- Current Environment Mail Settings ---")
    smtp_server = os.environ.get('MAIL_SERVER', '').strip()
    raw_port = os.environ.get('MAIL_PORT', '').strip()
    sender_email = os.environ.get('MAIL_USERNAME', '').strip()
    sender_password = os.environ.get('MAIL_PASSWORD', '').strip()
    use_tls = os.environ.get('MAIL_USE_TLS', 'true').lower() == 'true'
    use_ssl = os.environ.get('MAIL_USE_SSL', 'false').lower() == 'true'
    admin_email = os.environ.get('ADMIN_EMAIL', 'prashanth@iramediaconcepts.com').strip()

    recipient = sys.argv[1] if len(sys.argv) > 1 else admin_email

    print(f"  MAIL_SERVER   : '{smtp_server}'")
    print(f"  MAIL_PORT     : '{raw_port}'")
    print(f"  MAIL_USERNAME : '{sender_email}'")
    print(f"  MAIL_PASSWORD : '{'*****' if sender_password else 'NOT SET'}'")
    print(f"  MAIL_USE_TLS  : {use_tls}")
    print(f"  MAIL_USE_SSL  : {use_ssl}")
    print(f"  ADMIN_EMAIL   : '{admin_email}'")
    print(f"  TEST RECIPIENT: '{recipient}'\n")

    if not smtp_server or not sender_email or not sender_password:
        print("[ERROR] MAIL_SERVER, MAIL_USERNAME, or MAIL_PASSWORD is not configured!")
        print("  Please create a '.env' file in the project root with your SMTP credentials.")
        print("  See '.env.example' for reference.")
        return False

    try:
        smtp_port = int(raw_port) if raw_port else (465 if use_ssl else 587)
    except ValueError:
        smtp_port = 465 if use_ssl else 587

    print(f"Connecting to SMTP server {smtp_server}:{smtp_port} (SSL: {use_ssl}, TLS: {use_tls})...")

    try:
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = recipient
        msg['Subject'] = "Test Email - Work Report System Leave Notification"
        body = f"""Hello,

This is a test notification email sent from the Work Report System diagnostic tool.
If you receive this email, your SMTP configuration is working properly!

Configuration details:
• Server: {smtp_server}:{smtp_port}
• Sender: {sender_email}

Regards,
Work Report Management System
"""
        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        if use_ssl:
            print("Connecting using SMTP_SSL...")
            with smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=15) as server:
                print("Logging in...")
                server.login(sender_email, sender_password)
                print("Sending message...")
                server.send_message(msg)
        else:
            print("Connecting using standard SMTP...")
            with smtplib.SMTP(smtp_server, smtp_port, timeout=15) as server:
                if use_tls:
                    print("Starting TLS encryption...")
                    server.starttls()
                print("Logging in...")
                server.login(sender_email, sender_password)
                print("Sending message...")
                server.send_message(msg)

        print(f"\n[SUCCESS] Test email sent successfully to '{recipient}'!")
        return True

    except Exception as e:
        print(f"\n[FAILED] Failed to send email: {e}")
        return False

if __name__ == '__main__':
    test_smtp()
