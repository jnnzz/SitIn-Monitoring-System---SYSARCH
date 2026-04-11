# SitIn Monitoring System — Full Module Implementation Plan

## Project Overview

A Next.js frontend + Express/PostgreSQL backend system for the University of Cebu CCS to track student sit-in sessions across computer labs. This plan covers **all remaining modules** for both the Student and Admin dashboards.

---

## Current Status Assessment

### ✅ Already Implemented (Working)

| Module | Dashboard | Frontend | Backend | Notes |
|--------|-----------|----------|---------|-------|
| Edit Profile | Student | ✅ | ✅ | Full CRUD via `/api/auth/profile` |
| Avatar Upload | Student | ✅ | ✅ | Multer-based upload to `/uploads/` |
| Lab Rules & Regulations | Student | ✅ | N/A | Static content, no backend needed |
| View Announcements (UI only) | Student | ✅ | ⚠️ | Fetches from `/api/auth/announcements` but backend stores in-memory (lost on restart) |
| Search Student | Admin | ✅ | ✅ | `/api/sitin/students/search` |
| Start Sit-In Session | Admin | ✅ | ✅ | `/api/sitin/sessions/start` |
| Student Info List | Admin | ✅ | ✅ | `/api/auth/admin/users` |
| View Current Sit-In | Admin | ✅ | ✅ | `/api/sitin/sessions/active` |
| View Sit-In Records | Admin | ✅ | ✅ | `/api/sitin/sessions/records` |
| Create Announcement (UI only) | Admin | ✅ | ⚠️ | In-memory array, no DB persistence |
| Login / Register | Both | ✅ | ✅ | JWT auth with bcrypt |

### 🔴 Not Yet Implemented

| Module | Dashboard | Priority |
|--------|-----------|----------|
| View Remaining Sessions | Student | High |
| View Sit-In History / Feedback | Student | High |
| Announcement Backend Persistence | Both | High |
| Notification / Alert System | Student | Medium |
| Reservation System | Both | High |
| View Reward Points | Student | Medium |
| Generate Reports (CSV/PDF) | Admin | Medium |
| Analytics Dashboard | Admin | Medium |
| Add Reward Points | Admin | Medium |
| Leaderboard | Admin | Medium |

---

## Proposed Changes

### Phase 1 — Database Schema Additions

> [!IMPORTANT]
> All new tables & columns should be added via auto-migration in the backend startup (same pattern currently used in `sitin.js`).

#### [MODIFY] [database.sql](file:///c:/Download/SitIn-Monitoring/SitIn-Monitoring-System---SYSARCH/backend/database.sql)

Add the following new tables and columns:

```sql
-- 1. Announcements table (replace in-memory array)
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',       -- 'info' | 'important' | 'success'
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Feedback table (student rates their sit-in after session ends)
ALTER TABLE sit_in_records ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE sit_in_records ADD COLUMN IF NOT EXISTS rating INTEGER;  -- 1-5 stars

-- 3. Reservation system
CREATE TABLE IF NOT EXISTS labs (
  id SERIAL PRIMARY KEY,
  lab_name VARCHAR(100) UNIQUE NOT NULL,
  total_computers INTEGER DEFAULT 40
);

CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lab_id INTEGER NOT NULL REFERENCES labs(id),
  computer_number INTEGER NOT NULL,
  date DATE NOT NULL,
  time_slot VARCHAR(50) NOT NULL,        -- e.g. '08:00-10:00'
  status VARCHAR(20) DEFAULT 'reserved', -- 'reserved' | 'cancelled' | 'completed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lab_id, computer_number, date, time_slot)
);

-- 4. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'announcement', -- 'announcement' | 'session' | 'reward' | 'reservation'
  is_read BOOLEAN DEFAULT FALSE,
  reference_id INTEGER,                     -- optional link to announcement/session ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Reward points
ALTER TABLE users ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS reward_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason VARCHAR(255),
  awarded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Seed labs
INSERT INTO labs (lab_name, total_computers) VALUES
  ('Lab 524', 40), ('Lab 526', 40), ('Lab 530', 40),
  ('Lab 542', 40), ('Lab 544', 40)
ON CONFLICT (lab_name) DO NOTHING;
```

---

### Phase 2 — Backend API Routes

#### [NEW] [announcement.js](file:///c:/Download/SitIn-Monitoring/SitIn-Monitoring-System---SYSARCH/backend/routes/announcement.js)

Replace the in-memory announcement system with persistent DB storage:

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/announcements` | Student/Admin | List all announcements (newest first) |
| `POST` | `/api/announcements` | Admin only | Create announcement + auto-create notifications for all students |
| `DELETE` | `/api/announcements/:id` | Admin only | Delete an announcement |

---

#### [NEW] [notification.js](file:///c:/Download/SitIn-Monitoring/SitIn-Monitoring-System---SYSARCH/backend/routes/notification.js)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/notifications` | Authenticated | Get user's notifications (newest first, limit 50) |
| `GET` | `/api/notifications/unread-count` | Authenticated | Get count of unread notifications |
| `PUT` | `/api/notifications/:id/read` | Authenticated | Mark a single notification as read |
| `PUT` | `/api/notifications/read-all` | Authenticated | Mark all notifications as read |

---

#### [NEW] [reservation.js](file:///c:/Download/SitIn-Monitoring/SitIn-Monitoring-System---SYSARCH/backend/routes/reservation.js)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/reservations/labs` | Authenticated | List all labs with computer counts |
| `GET` | `/api/reservations/lab/:labId/status?date=&time_slot=` | Authenticated | Get availability grid for a lab — returns each computer's status (🟢 available / 🔴 occupied) |
| `POST` | `/api/reservations` | Student | Reserve a specific computer in a lab/time slot |
| `DELETE` | `/api/reservations/:id` | Student/Admin | Cancel a reservation |
| `GET` | `/api/reservations/my` | Student | Get student's own reservations |
| `GET` | `/api/reservations/all` | Admin only | Get all reservations (with filters) |

---

#### [NEW] [reward.js](file:///c:/Download/SitIn-Monitoring/SitIn-Monitoring-System---SYSARCH/backend/routes/reward.js)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/rewards/my` | Student | Get own points total + history |
| `POST` | `/api/rewards/add` | Admin only | Award points to a student (body: `{user_id, points, reason}`) |
| `GET` | `/api/rewards/leaderboard` | Authenticated | Get top 20 students by reward points |

---

#### [NEW] [reports.js](file:///c:/Download/SitIn-Monitoring/SitIn-Monitoring-System---SYSARCH/backend/routes/reports.js)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/reports/sitin/csv` | Admin only | Export sit-in records as CSV download |
| `GET` | `/api/reports/sitin/pdf` | Admin only | Export sit-in records as PDF download |

> [!NOTE]
> CSV will use the `json2csv` npm package. PDF will use the `pdfkit` npm package. Both generate files on-the-fly and stream to the client.

---

#### [NEW] [analytics.js](file:///c:/Download/SitIn-Monitoring/SitIn-Monitoring-System---SYSARCH/backend/routes/analytics.js)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/analytics/summary` | Admin only | Total sit-ins, avg duration, busiest lab, busiest day, etc. |
| `GET` | `/api/analytics/daily?days=7` | Admin only | Sit-in counts per day for the last N days |
| `GET` | `/api/analytics/by-lab` | Admin only | Sit-in counts grouped by lab |
| `GET` | `/api/analytics/by-purpose` | Admin only | Sit-in counts grouped by purpose (language) |
| `GET` | `/api/analytics/peak-hours` | Admin only | Hourly distribution of sit-ins |

---

#### [MODIFY] [sitin.js](file:///c:/Download/SitIn-Monitoring/SitIn-Monitoring-System---SYSARCH/backend/routes/sitin.js)

Add a student-facing endpoint:

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/sitin/my/history` | Student | Get the logged-in student's sit-in history from `sit_in_records` |
| `PUT` | `/api/sitin/my/feedback/:recordId` | Student | Submit feedback/rating for a past session |

---

#### [MODIFY] [index.js](file:///c:/Download/SitIn-Monitoring/SitIn-Monitoring-System---SYSARCH/backend/index.js)

Register all new route files:

```js
app.use('/api/announcements', require('./routes/announcement'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/reservations', require('./routes/reservation'));
app.use('/api/rewards', require('./routes/reward'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/analytics', require('./routes/analytics'));
```

---

### Phase 3 — Student Dashboard Frontend

#### [MODIFY] [StudentDashboard.jsx](file:///c:/Download/SitIn-Monitoring/SitIn-Monitoring-System---SYSARCH/app/landing/StudentDashboard.jsx)

Add new tabs to the student navigation and implement the following views:

**New Tabs:** `dashboard` (existing) | `history` | `reservation` | `rewards` | `settings` (existing)

##### Tab: Dashboard (enhanced)
- Show **remaining sessions** counter card (already available via `user.remaining_sessions`)
- Show **reward points** summary card
- Show **recent notifications** indicator (bell icon with unread count badge)
- Connect announcements to DB-backed API (`/api/announcements`)

##### Tab: History
- Table showing student's sit-in history from `/api/sitin/my/history`
- Columns: Lab, Purpose, Date, Duration, Rating, Feedback
- Each row has a "Leave Feedback" button → opens a modal to submit a 1-5 star rating + text feedback
- Filter by date range

##### Tab: Reservation
- Lab selector dropdown (Lab 524, 526, 530, 542, 544)
- Date picker + time slot picker
- **Visual grid** of computers (e.g. 5×8 grid for 40 computers)
  - 🟢 Green = available → clickable to reserve
  - 🔴 Red = occupied/reserved → shows who reserved (tooltip)
- "My Reservations" section below showing active reservations with cancel option

##### Tab: Rewards
- Large point counter display
- History timeline showing point awards and reasons
- Mini leaderboard widget showing top 5

##### Notification Bell (Nav Bar)
- Bell icon with unread count badge in the nav bar
- Dropdown panel showing recent notifications
- "Mark all as read" button
- Notification types: new announcement, session reminder, points awarded

---

### Phase 4 — Admin Dashboard Frontend

#### [MODIFY] [Dashboard.jsx](file:///c:/Download/SitIn-Monitoring/SitIn-Monitoring-System---SYSARCH/app/landing/Dashboard.jsx)

Add new tabs to the admin navigation and implement the following views:

**Updated Tabs:** `dashboard` | `users` | `sitin` | `announcements` | `reservation` | `reports` | `analytics` | `rewards` | `settings`

##### Tab: Announcements (enhanced)
- Keep existing UI but switch from in-memory to DB-backed API (`/api/announcements`)
- When creating an announcement, backend automatically pushes notifications to all students

##### Tab: Reports (new)
- Two export buttons: "Export CSV" and "Export PDF"
- Date range filter (from/to date)
- Optional lab filter
- Preview table of records before export
- Downloads trigger file download via anchor tag or `window.open()`

##### Tab: Reservation (new)
- Same visual grid as student but with admin powers:
  - View all labs' occupancy at a glance
  - Cancel any student's reservation
  - See full reservation list in table view below the grid

##### Tab: Analytics (new)
- Summary stat cards: Total Sit-Ins, Avg Duration, Most Popular Lab, Most Popular Purpose
- Bar chart: Sit-ins per day (last 7/30 days toggle)
- Donut chart: Distribution by lab
- Bar chart: Distribution by purpose/language
- Line chart: Peak hours heatmap
- Uses existing SVG `BarChart` and `DonutChart` components already in the file

##### Tab: Rewards (new)
- Search student → award points form (student search, points amount, reason input)
- **Leaderboard table**: Rank, Student Name, ID, Course, Points
  - Top 3 highlighted with gold/silver/bronze styling
- Award history log

---

### Phase 5 — NPM Dependencies

#### [MODIFY] [package.json](file:///c:/Download/SitIn-Monitoring/SitIn-Monitoring-System---SYSARCH/backend/package.json)

New backend dependencies:
```
npm install json2csv pdfkit
```

No new frontend dependencies needed — everything will be built with existing tools (React, Lucide icons, existing SVG chart components).

---

## Implementation Order

> [!TIP]
> Dependencies are sequential per phase, but phases can partially overlap.

```
Phase 1: Database Schema (all tables)
  ↓
Phase 2: Backend APIs (in this order):
  2a. Announcements (DB persistence) + Notification routes
  2b. Student sit-in history + feedback
  2c. Reservation routes
  2d. Rewards + Leaderboard routes
  2e. Reports (CSV/PDF) routes
  2f. Analytics routes
  ↓
Phase 3: Student Dashboard Frontend
  3a. Remaining sessions + announcement connection
  3b. Notification bell + dropdown
  3c. Sit-in history + feedback tab
  3d. Reservation tab (visual grid)
  3e. Rewards tab
  ↓
Phase 4: Admin Dashboard Frontend
  4a. Announcements → DB migration
  4b. Reports tab (CSV/PDF export)
  4c. Reservation management tab
  4d. Analytics tab
  4e. Rewards + Leaderboard tab
```

---

## Open Questions

> [!IMPORTANT]
> Please review and answer these before implementation begins:

1. **Reservation Time Slots**: What are the available time slots? Should they be:
   - Fixed slots (e.g. `08:00-10:00`, `10:00-12:00`, `13:00-15:00`, `15:00-17:00`)?
   - Or free-form (student picks start/end time)?

2. **Computers Per Lab**: Is 40 computers per lab correct, or does it vary? Should we make it configurable per lab?

3. **Reward Points Logic**: Should points be awarded **only manually** by admin, or also automatically (e.g. +5 points per completed sit-in session)?

4. **Report Filters**: For CSV/PDF export, should reports include filters like date range, specific lab, or specific student?

5. **Announcement Notifications**: Should notifications be **real-time** (WebSocket/SSE push) or **poll-based** (student dashboard polls every 30s)? Poll-based is simpler to implement.

6. **Leaderboard Visibility**: Should students also see the full leaderboard, or only the top 5 in their rewards tab?

---

## Verification Plan

### Automated Tests
- Start backend server and test all new API endpoints with `curl` commands
- Verify database migrations run successfully on startup
- Test CSV/PDF download endpoints return valid file content
- Verify reservation conflict detection (double-booking same computer/slot)

### Manual Verification
- Use the browser tool to:
  1. Log in as admin → create announcement → verify it persists after server restart
  2. Log in as student → verify announcement appears with notification badge
  3. Test reservation flow: select lab → see green/red grid → reserve → see it turn red
  4. Test sit-in history with feedback submission
  5. Test report download (CSV opens in spreadsheet, PDF renders correctly)
  6. Award reward points as admin → verify student sees updated points
  7. Check leaderboard ordering

### Build Verification
- `npm run dev` on frontend (Next.js) — no build errors
- `node index.js` on backend — no startup errors, all migrations pass
