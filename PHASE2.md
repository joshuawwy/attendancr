# Phase 2: Google Sheets Integration

## Overview
Sync student data from a private Google Sheet to Attendancr using Service Account authentication.

## Prerequisites
- Google Cloud account
- Google Sheet with student data

## Google Sheet Structure

### Required Columns (Row 1 headers)
| Column | Description | Example |
|--------|-------------|---------|
| Student ID | Unique identifier | S001, S002 |
| Student Name | Full name | Emma Tan |
| Primary Parent Name | Parent/guardian name | David Tan |
| Primary Parent Phone | Contact number | +6591234567 |

### Optional Columns
| Column | Description |
|--------|-------------|
| School | Student's school |
| Date of Birth | YYYY-MM-DD format |
| Emergency Contact | Alternative contact |
| Notes | Any additional notes |
| Primary Parent Telegram | Telegram username |
| Secondary Parent Name | Second parent name |
| Secondary Parent Phone | Second parent phone |
| Secondary Parent Telegram | Second parent Telegram |

## Setup Instructions

### 1. Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create a new project (e.g., "attendancr")
3. Note the Project ID

### 2. Enable Google Sheets API
1. Go to "APIs & Services" > "Library"
2. Search for "Google Sheets API"
3. Click "Enable"

### 3. Create Service Account
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Name: `attendancr-sheets`
4. Click "Create and Continue"
5. Skip role assignment (click "Continue")
6. Click "Done"

### 4. Generate Service Account Key
1. Click on the service account you created
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Download and save securely

### 5. Share Google Sheet
1. Open the service account details
2. Copy the email (e.g., `attendancr-sheets@project-id.iam.gserviceaccount.com`)
3. Open your Google Sheet
4. Click "Share"
5. Paste the service account email
6. Set permission to "Viewer"
7. Uncheck "Notify people"
8. Click "Share"

### 6. Get Sheet ID
From your Google Sheet URL:
```
https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
```
Copy the `[SHEET_ID]` portion.

## Environment Variables

Add to Vercel:
```
GOOGLE_SHEET_ID=your-sheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=attendancr-sheets@project-id.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

Note: The private key is in the downloaded JSON file under `private_key`. Replace actual newlines with `\n`.

## Code Changes Required

Update `/src/app/api/sheets/sync/route.ts` to use service account authentication:
- Replace simple fetch with Google APIs client
- Use JWT authentication with service account credentials
- Handle token refresh automatically

## Sync Behavior
- **New students**: Added to database
- **Existing students**: Updated with new data
- **Removed students**: Soft-deleted (marked inactive)
- **Parents**: Created/updated based on phone number (unique key)

## API Endpoint
```
POST /api/sheets/sync
```

Response:
```json
{
  "success": true,
  "students_added": 5,
  "students_updated": 2,
  "students_deleted": 0,
  "errors": []
}
```

## Admin Dashboard Integration
- Add "Sync from Google Sheets" button
- Show last sync timestamp
- Display sync results/errors

## Security Notes
- Never commit the service account JSON file
- Store private key securely in environment variables
- Service account has read-only access to the sheet
- Sheet remains private (not publicly accessible)
