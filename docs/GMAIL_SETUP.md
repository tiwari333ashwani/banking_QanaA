# Gmail API v3 Setup Guide (Official & Free)

This utility application uses the official **Google Gmail API v3** to dispatch weekly progress reports. This guide walks you through acquiring free credentials from Google Cloud Console.

---

## 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Select a project** -> **New Project** and name it `Banking-Daily-QA`.
3. In the navigation menu, go to **APIs & Services** -> **Library**.
4. Search for **Gmail API** and click **Enable**.

---

## 2. Configure OAuth Consent Screen

1. In **APIs & Services**, click **OAuth consent screen**.
2. Select User Type: **External** and click **Create**.
3. Fill in the App Name (e.g. `Banking QA Utility`) and User Support Email.
4. Under Scopes, add:
   - `https://www.googleapis.com/auth/gmail.send`
5. Under Test Users, add your personal Gmail address.

---

## 3. Generate OAuth2 Client Credentials

1. Go to **APIs & Services** -> **Credentials**.
2. Click **Create Credentials** -> **OAuth client ID**.
3. Select Application type: **Web application**.
4. Set Authorized redirect URIs to: `https://developers.google.com/oauthplayground`.
5. Click **Create** and copy your `Client ID` and `Client Secret`.

---

## 4. Obtain Refresh Token via Google OAuth Playground

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Click the gear icon in the top right, check **Use your own OAuth credentials**, and enter your `Client ID` and `Client Secret`.
3. In the left panel, scroll down to **Gmail API v1**, select `https://www.googleapis.com/auth/gmail.send`, and click **Authorize APIs**.
4. Sign in with your Gmail account and allow access.
5. In Step 2, click **Exchange authorization code for tokens**.
6. Copy the generated **Refresh token**.

---

## 5. Add to `.env`

```env
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REFRESH_TOKEN=your_refresh_token_here
GMAIL_SENDER_EMAIL=your_email@gmail.com
WEEKLY_REPORT_RECIPIENT_EMAIL=your_email@gmail.com
MOCK_EMAIL_DISPATCH=false
```
