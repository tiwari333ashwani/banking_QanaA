# Email Dispatch & Gmail Setup Guide

The **Daily Q&A Banking Platform** supports two distinct email delivery methods, plus an offline local mock fallback:

1. **Direct Gmail SMTP via App Password** (Recommended, 2-minute setup, active by default in `.env`)
2. **Official Google Cloud OAuth2 API (Gmail API v3)** (Enterprise OAuth token exchange)
3. **Offline Mock Mode** (`MOCK_EMAIL_DISPATCH=true`, writes to local filesystem without sending network packets)

---

## Method 1: Direct Gmail SMTP via App Password (Fastest & Recommended)

This method connects directly to Google's authenticated SMTP relay (`smtp.gmail.com:587`) via `nodemailer` using a dedicated Google App Password.

### Step 1: Generate a Google App Password
1. Ensure **2-Step Verification** is turned ON for your Google account: [Google Account Security](https://myaccount.google.com/security).
2. Go directly to [Google App Passwords](https://myaccount.google.com/apppasswords).
3. Under **App name**, enter `Banking QA Platform` and click **Create**.
4. Google will generate a 16-character password (e.g., `abcd efgh ijkl mnop`).

### Step 2: Configure `.env`
Open `.env` and set:
```env
# Direct Gmail App Password Mailing
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_APP_PASSWORD=abcd efgh ijkl mnop
GMAIL_SENDER_EMAIL=your_email@gmail.com
WEEKLY_REPORT_RECIPIENT_EMAIL=primary@gmail.com,secondary@gmail.com

# Enable live email delivery
MOCK_EMAIL_DISPATCH=false
```

Multiple recipients can be supplied as a comma-separated list.

---

## Method 2: Official Google Cloud OAuth2 Client (Gmail API v3)

For enterprise or token-based integration using Google Cloud Console:

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Select a project** -> **New Project** and name it `Banking-Daily-QA`.
3. In the navigation menu, go to **APIs & Services** -> **Library**.
4. Search for **Gmail API** and click **Enable**.

### Step 2: Configure OAuth Consent Screen
1. In **APIs & Services**, click **OAuth consent screen**.
2. Select User Type: **External** and click **Create**.
3. Fill in the App Name (e.g. `Banking QA Utility`) and User Support Email.
4. Under Scopes, add:
   - `https://www.googleapis.com/auth/gmail.send`
5. Under Test Users, add your personal Gmail address.

### Step 3: Generate OAuth2 Client Credentials
1. Go to **APIs & Services** -> **Credentials**.
2. Click **Create Credentials** -> **OAuth client ID**.
3. Select Application type: **Web application**.
4. Set Authorized redirect URIs to: `https://developers.google.com/oauthplayground`.
5. Click **Create** and copy your `Client ID` and `Client Secret`.

### Step 4: Obtain Refresh Token via Google OAuth Playground
1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Click the gear icon in the top right, check **Use your own OAuth credentials**, and enter your `Client ID` and `Client Secret`.
3. In the left panel, scroll down to **Gmail API v1**, select `https://www.googleapis.com/auth/gmail.send`, and click **Authorize APIs**.
4. Sign in with your Gmail account and allow access.
5. In Step 2, click **Exchange authorization code for tokens**.
6. Copy the generated **Refresh token**.

### Step 5: Configure `.env` for OAuth2
```env
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REFRESH_TOKEN=your_refresh_token_here
GMAIL_SENDER_EMAIL=your_email@gmail.com
WEEKLY_REPORT_RECIPIENT_EMAIL=your_email@gmail.com
MOCK_EMAIL_DISPATCH=false
```

---

## Method 3: Offline Mock Mode (Zero Configuration)

If you don't wish to send external emails:
1. In `.env`, set:
   ```env
   MOCK_EMAIL_DISPATCH=true
   ```
2. Any triggered report (via `POST /api/reports/dispatch-gmail` or `node scripts/send-weekly-report.js`) will save full HTML and JSON report artifacts locally inside `local_storage/reports/weekly/`.

