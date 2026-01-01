# Attendancr - Tuition Centre Attendance System

## Overview

A Progressive Web App (PWA) for tuition centres that enables staff to check students in and automatically notifies parents via Telegram. Built for simplicity and speed during rush hour operations.

## System Architecture

### Technology Stack
- **Frontend**: Next.js (React) - Progressive Web App
- **Backend**: Supabase Cloud
- **Student Data**: Google Sheets (source of truth)
- **Notifications**: Telegram Bot API
- **Hosting**: Vercel (frontend) + Supabase Cloud (backend)
- **Functions**: Supabase Edge Functions
- **Timezone**: Singapore Time (SGT/UTC+8) hardcoded

### Key Design Decisions
- **No photos**: Simplified privacy and implementation
- **No web portal in MVP**: Telegram notifications only
- **Single centre**: Multi-tenancy deferred to v2
- **Internet required**: No offline mode - block with error if no connection
- **Check-out optional**: Only track arrivals, check_out_time can be null
- **Auto check-out**: Previous session auto-closed if student checks in again

## User Flows

### Staff Check-in Flow

1. Staff opens PWA on tablet at centre entrance
2. Staff logs in with 6-digit PIN (8-hour session timeout)
3. Staff searches for student by name (autocomplete search)
4. Staff confirms student selection
5. System:
   - Auto check-out previous session if student already checked in
   - Creates new attendance record with check-in timestamp
   - Attempts to send Telegram notification to parent(s)
   - Logs notification failure to `failed_notifications` if Telegram fails
6. Brief success toast: "Sarah checked in ✓" (2 seconds)
7. Returns to search immediately for next student

### Parent Onboarding Flow

1. Admin generates unique Telegram link code via admin panel
2. Admin manually sends link to parent via WhatsApp/SMS
3. Parent clicks link (format: `t.me/yourbot?start=UNIQUECODE`)
4. Bot automatically links parent's Telegram account
5. Parent now receives check-in notifications

### Google Sheets Sync Flow

1. Admin maintains student roster in Google Sheet
2. Cron job syncs once daily at midnight (SGT)
3. Admin can trigger manual sync via admin panel button
4. Sync process:
   - Fetch all rows from Google Sheet
   - Add new students
   - Update existing students (if data changed)
   - Soft delete removed students (mark `is_active = false`)
5. If sync fails, error shown in admin panel with manual retry button

## Data Model

### students
```sql
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text UNIQUE NOT NULL,  -- From Google Sheet
  name text NOT NULL,
  school text,
  date_of_birth date,
  emergency_contact text,
  notes text,
  primary_parent_id uuid REFERENCES parents(id),
  secondary_parent_id uuid REFERENCES parents(id),  -- nullable
  is_active boolean DEFAULT true,  -- soft delete flag
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### parents
```sql
CREATE TABLE parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  telegram_chat_id text,  -- nullable until parent links account
  created_at timestamptz DEFAULT now()
);
```

### attendance
```sql
CREATE TABLE attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) NOT NULL,
  check_in_time timestamptz NOT NULL,
  check_out_time timestamptz,  -- nullable, optional
  checked_in_by uuid REFERENCES staff(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### staff
```sql
CREATE TABLE staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pin_hash text NOT NULL,  -- bcrypt hash of 6-digit PIN
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### admins
```sql
CREATE TABLE admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);
-- Note: Single super admin account for MVP
```

### failed_notifications
```sql
CREATE TABLE failed_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id),
  parent_id uuid REFERENCES parents(id),
  error_message text,
  attempted_at timestamptz DEFAULT now()
);
-- Auto-delete after 7 days via cron job
```

### google_sheets_sync_log
```sql
CREATE TABLE google_sheets_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_started_at timestamptz DEFAULT now(),
  sync_completed_at timestamptz,
  status text,  -- 'success', 'failed'
  error_message text,
  students_added int DEFAULT 0,
  students_updated int DEFAULT 0,
  students_deleted int DEFAULT 0
);
```

## Google Sheets Integration

### Required Sheet Columns
The source Google Sheet must have these columns (exact names):

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| Student ID | Text | Yes | Unique identifier |
| Student Name | Text | Yes | Full name |
| School | Text | No | |
| Date of Birth | Date | No | Format: YYYY-MM-DD |
| Emergency Contact | Text | No | Phone number |
| Notes | Text | No | Any additional info |
| Primary Parent Name | Text | Yes | |
| Primary Parent Phone | Text | Yes | |
| Primary Parent Telegram | Text | No | Will be populated after linking |
| Secondary Parent Name | Text | No | |
| Secondary Parent Phone | Text | No | |
| Secondary Parent Telegram | Text | No | |

### Sync Behavior
- **New rows**: Create new student + parent records
- **Updated rows**: Update existing records (match on Student ID)
- **Deleted rows**: Soft delete (set `is_active = false`, preserve attendance history)
- **Duplicates**: Student ID must be unique, reject row if duplicate
- **Missing required fields**: Log error, skip row

## Features

### MVP Features (Phase 1)

#### Staff Check-in Interface (PWA)
- [x] PIN-based authentication (6-digit, 8-hour session)
- [x] Student name search with autocomplete
- [x] One-tap check-in
- [x] Success toast with auto-return to search
- [x] Auto check-out previous session if duplicate
- [x] Error handling: no internet, Telegram API down
- [x] Responsive design for tablets (iPad, Android tablets)

#### Admin Panel (Web)
- [x] Email/password login (single super admin account)
- [x] Staff management (add staff, assign 6-digit PIN)
- [x] Generate parent Telegram link codes
- [x] View attendance reports (daily, weekly, monthly)
- [x] View failed notifications log
- [x] Manual Google Sheets sync trigger
- [x] Sync error display with retry button
- [x] Manual student data override (if Sheet sync fails)

#### Telegram Bot
- [x] `/start` command with unique code for parent linking
- [x] Minimal notifications: "Sarah checked in at ABC Centre at 3:45 PM"
- [x] Support for 2 parents per student (both get notified)

#### Google Sheets Sync
- [x] Daily auto-sync at midnight (SGT)
- [x] On-demand manual sync via admin panel
- [x] Sync status logging
- [x] Error handling with manual retry

### Future Enhancements (Phase 2+)
- [ ] QR code scanning for rapid check-in
- [ ] Check-out tracking (currently optional)
- [ ] Parent web portal for attendance history
- [ ] Multi-centre support with RLS
- [ ] Export attendance to CSV
- [ ] Dashboard with analytics (daily trends, late arrivals)
- [ ] WhatsApp Business API integration
- [ ] Push notifications (PWA)
- [ ] Geolocation verification (check-in only at centre)

## API Endpoints

### Supabase Edge Functions

**POST /api/attendance/check-in**
```typescript
Request:
{
  student_id: string,
  staff_id: string,
  check_in_time: string  // ISO 8601 in SGT
}

Response:
{
  success: boolean,
  attendance_id: string,
  notification_sent: boolean,
  notification_errors?: string[]
}
```

**GET /api/attendance/history**
```typescript
Query params:
  ?student_id=uuid
  &from=2024-01-01
  &to=2024-01-31

Response:
{
  attendance: [
    {
      id: string,
      student_name: string,
      check_in_time: string,
      check_out_time: string | null,
      checked_in_by_name: string
    }
  ]
}
```

**POST /api/telegram/generate-link**
```typescript
Request:
{
  parent_id: string
}

Response:
{
  link: string  // "t.me/yourbot?start=ABC123XYZ"
}
```

**POST /api/sheets/sync**
```typescript
Request: {}  // Triggered by admin or cron

Response:
{
  success: boolean,
  students_added: number,
  students_updated: number,
  students_deleted: number,
  errors?: string[]
}
```

## Security & Permissions

### Row Level Security (RLS) Policies

**students table**
- Staff (authenticated with PIN): SELECT where is_active = true
- Admin: SELECT, INSERT, UPDATE, DELETE all

**attendance table**
- Staff: INSERT (with their own staff_id), SELECT all
- Admin: SELECT, INSERT, UPDATE, DELETE all

**staff table**
- Staff: SELECT own record only
- Admin: SELECT, INSERT, UPDATE all

**parents table**
- Staff: SELECT (to search students)
- Admin: SELECT, INSERT, UPDATE all

**failed_notifications table**
- Admin only: SELECT all

### Authentication
- **Staff**: PIN-based (6-digit, bcrypt hashed), session expires after 8 hours
- **Admin**: Email + password (bcrypt hashed)
- **Parents**: No authentication in MVP (Telegram-only interface)

### API Keys & Secrets
```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=  # For Edge Functions only

# Telegram
TELEGRAM_BOT_TOKEN=

# Google Sheets
GOOGLE_SHEETS_API_KEY=
GOOGLE_SHEET_ID=

# Admin
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=  # Set during initial setup
```

## Error Handling

### Network Errors
- **No internet during check-in**: Block with error modal "No internet connection. Please check WiFi."
- **Supabase API timeout**: Show error, allow retry
- **Google Sheets API timeout**: Log error, show in admin panel

### Telegram Notification Failures
- **Parent telegram_chat_id is null**: Silent fail, log to `failed_notifications`
- **Telegram API rate limit**: Retry once after 1 second, log if still fails
- **Telegram API down**: Silent fail, log to `failed_notifications`

### Google Sheets Sync Failures
- **Sheet not found**: Show error in admin panel, disable auto-sync
- **Permission denied**: Show error in admin panel with instructions
- **Malformed data**: Skip row, log error with row number
- **API quota exceeded**: Show error, suggest manual retry later

### Duplicate Check-ins
- **Student already checked in**: Auto check-out previous session, create new check-in
- **Parent gets duplicate notifications**: Expected behavior, no special handling

## Development Priorities (Build Order)

### Phase 1: Backend Foundation (Week 1)
1. Set up Supabase project
2. Create database schema (tables + RLS policies)
3. Set up Google Sheets API integration
4. Build Google Sheets sync logic (cron job + manual trigger)
5. Test sync with sample data

### Phase 2: Telegram Integration (Week 2)
1. Set up Telegram bot
2. Implement `/start` command with unique code linking
3. Build parent linking logic
4. Implement minimal notification function
5. Test end-to-end notification flow

### Phase 3: Staff Check-in UI (Week 3)
1. Next.js project setup with PWA config
2. Build PIN authentication flow
3. Build student search with autocomplete
4. Implement check-in logic + API integration
5. Add success toast and error handling
6. PWA manifest and install prompt

### Phase 4: Admin Panel (Week 4)
1. Admin authentication (email/password)
2. Staff management interface
3. Telegram link code generator
4. Attendance reports view
5. Failed notifications log view
6. Manual Google Sheets sync button

### Phase 5: Polish & Testing (Week 5)
1. End-to-end testing with real data
2. Performance optimization (search latency)
3. Mobile responsiveness testing on tablets
4. Deploy to Vercel + Supabase production
5. Admin training and documentation

## Deployment

### Production Environment
- **Frontend**: Vercel (auto-deploy from main branch)
- **Backend**: Supabase Cloud (production project)
- **Cron Jobs**: Supabase pg_cron or Vercel Cron Jobs
- **Domain**: TBD (custom domain on Vercel)

### Environment Variables (Vercel)
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=  # Server-side only
TELEGRAM_BOT_TOKEN=
GOOGLE_SHEETS_API_KEY=
GOOGLE_SHEET_ID=
```

### CI/CD
- **Git workflow**: main branch = production
- **Preview deploys**: Automatic on PRs
- **Database migrations**: Manual via Supabase dashboard (MVP)

## Success Metrics

### MVP Success Criteria
- [ ] Staff can check in 20 students in under 2 minutes (rush hour test)
- [ ] 95%+ Telegram notification delivery rate
- [ ] Google Sheets sync runs successfully daily with <5% error rate
- [ ] Zero data loss during sync operations
- [ ] PWA installable on iPad and Android tablets
- [ ] Admin can generate parent link codes in <30 seconds

### Performance Targets
- Student search autocomplete: <200ms response time
- Check-in submission: <500ms end-to-end
- Telegram notification: <3 seconds from check-in to parent receives
- PWA first load: <2 seconds on 4G
- Admin panel page load: <1 second

## Open Questions / Future Considerations

1. **Data retention**: How long to keep historical attendance records? (Currently unlimited)
2. **Backup strategy**: Auto-backup attendance data to Google Sheets weekly?
3. **Parent communication**: Future: two-way communication via Telegram?
4. **Reporting**: What analytics do admins need? (currently basic attendance history)
5. **Scalability**: When to add multi-centre support? (deferred to v2)
6. **Compliance**: Any local regulations on storing minor's data in Singapore?
