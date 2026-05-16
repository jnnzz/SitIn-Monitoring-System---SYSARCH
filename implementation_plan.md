# SitIn Monitoring System — Full Module Implementation Plan

## Project Overview

A Next.js frontend + Express/PostgreSQL backend system for the University of Cebu CCS to track student sit-in sessions across computer labs. This plan covers **all remaining modules** for both the Student and Admin dashboards.

---

## Current Status Assessment

### ✅ Already Implemented (Working)

| Module | Dashboard | Frontend | Backend | Notes |
|--------|-----------|----------|---------|-------|
| Login / Register | Both | ✅ | ✅ | JWT auth with bcrypt, `/api/auth/register` + `/api/auth/login` |
| Edit Profile | Student | ✅ | ✅ | Full CRUD via `/api/auth/profile` |
| Avatar Upload | Student | ✅ | ✅ | Multer-based upload to `/uploads/` |
| Lab Rules & Regulations | Student | ✅ | N/A | Static content on dashboard tab |
| View Announcements | Student | ✅ | ✅ | Fetches from `/api/auth/announcements` |
| Notification System | Student | ✅ | ✅ | Bell icon, unread count, mark-read, poll every 30s. Backend: `routes/notification.js` with full CRUD + DB table |
| Remaining Sessions Counter | Student | ✅ | ✅ | Circular ring widget on dashboard, reads `user.remaining_sessions` |
| Sit-In History + Feedback | Student | ✅ | ✅ | History tab with table, feedback modal (1-5 star + text), `/api/sitin/my/history` + `/api/sitin/my/feedback/:recordId` |
| Search Student | Admin | ✅ | ✅ | `/api/sitin/students/search` |
| Start Sit-In Session | Admin | ✅ | ✅ | `/api/sitin/sessions/start` with lab/purpose form |
| End Sit-In Session | Admin | ✅ | ✅ | `/api/sitin/sessions/end/:id` with duration calc |
| Student Info List | Admin | ✅ | ✅ | `/api/auth/admin/users` with delete |
| View Current Sit-In | Admin | ✅ | ✅ | `/api/sitin/sessions/active` |
| View Sit-In Records | Admin | ✅ | ✅ | `/api/sitin/sessions/records` |
| Create/Delete Announcements | Admin | ✅ | ✅ | `/api/auth/admin/announcements` CRUD |
| Admin Dashboard Stats | Admin | ✅ | ✅ | Charts (bar + donut), stat cards, recent registrations |
| Admin Settings / Profile Edit | Admin | ✅ | ✅ | Settings tab with profile form |

### 🟡 Partially Implemented (Backend Only)

| Module | Dashboard | Frontend | Backend | Notes |
|--------|-----------|----------|---------|-------|
| Generate Reports (CSV/PDF) | Admin | ❌ | ✅ | CSV export routes implemented; PDF pending |
| Analytics Dashboard | Admin | ❌ | ✅ | Analytics endpoints implemented |
| View Reward Points | Student | ❌ | ✅ | Rewards summary endpoints implemented |
| Add Reward Points / Leaderboard | Admin | ❌ | ✅ | Rewards admin endpoints implemented |

### 🔴 Not Yet Implemented

| Module | Dashboard | Priority |
|--------|-----------|----------|
| **Reservation System (Student)** | Student | 🔴 High |
| **Testimonials (Student)** | Student | 🔴 High |
| **Reservation Management (Admin)** | Admin | 🔴 High |
| **Testimonials View (Admin)** | Admin | 🔴 High |

---  

## Proposed Changes — New Features

### Feature 1: Student Reservation System

> Students can enable/disable their reservation capability. When enabled, they can browse labs, pick available PCs, and submit reservation requests. When disabled, the reservation tab shows a CTA to enable it.

---

### Feature 2: Student Testimonials

> Students can submit testimonials about their sit-in experience. These are public-facing reviews visible to admin and optionally on a landing page.

---

### Feature 3: Admin Reservation Management

> Admin can view all reservation requests, see logs of past reservations, control which PCs are available/unavailable per lab, and accept or decline student reservation requests.

---

### Feature 4: Admin Testimonials View

> Admin can view all student testimonials, approve/reject them for public display, and delete inappropriate ones.

---

### Feature 5: Reports (Admin)

> Admin can generate CSV/PDF exports for sit-in sessions, reservations, testimonials, and users with date-range and lab/status filters.

---

### Feature 6: Analytics Dashboard (Admin)

> Admin can view trend charts and KPIs for usage, lab utilization, reservation conversion, and peak hours.

---

### Feature 7: Reward Points (Student + Admin)

> Students can view their points and history; admins can adjust points and view a leaderboard.

---

### Feature 8: Laboratory Software Availability Management (Admin)

> Admin can add software applications and configure availability per laboratory room so each lab clearly shows which software is installed/usable.

---

## Phase 1 — Database Schema Additions

All new tables & columns should be added via auto-migration in the backend startup (same pattern currently used in `sitin.js` and `notification.js`).

### New Tables

```sql
-- 1. Labs table
CREATE TABLE IF NOT EXISTS labs (
  id SERIAL PRIMARY KEY,
  lab_name VARCHAR(100) UNIQUE NOT NULL,
  total_computers INTEGER DEFAULT 40,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Lab Computers — individual PC availability control
CREATE TABLE IF NOT EXISTS lab_computers (
  id SERIAL PRIMARY KEY,
  lab_id INTEGER NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  computer_number INTEGER NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,           -- admin can toggle on/off
  status VARCHAR(20) DEFAULT 'available',      -- 'available' | 'reserved' | 'in-use' | 'maintenance'
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lab_id, computer_number)
);

-- 3. Reservations — student booking requests
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lab_id INTEGER NOT NULL REFERENCES labs(id),
  computer_id INTEGER NOT NULL REFERENCES lab_computers(id),
  date DATE NOT NULL,
  time_slot VARCHAR(50) NOT NULL,              -- e.g. '08:00-10:00'
  purpose VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',        -- 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'
  admin_notes TEXT,                             -- reason for decline, etc.
  reviewed_by INTEGER REFERENCES users(id),    -- admin who reviewed
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lab_id, computer_id, date, time_slot) -- prevent double-booking
);

-- 4. Reservation Logs — audit trail for all reservation actions
CREATE TABLE IF NOT EXISTS reservation_logs (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,                 -- 'created' | 'approved' | 'declined' | 'cancelled' | 'completed'
  performed_by INTEGER NOT NULL REFERENCES users(id),
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Student reservation toggle
ALTER TABLE users ADD COLUMN IF NOT EXISTS reservation_enabled BOOLEAN DEFAULT FALSE;

-- 6. Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status VARCHAR(20) DEFAULT 'pending',        -- 'pending' | 'approved' | 'rejected'
  reviewed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Seed labs
INSERT INTO labs (lab_name, total_computers) VALUES
  ('Lab 524', 40), ('Lab 526', 40), ('Lab 530', 40),
  ('Lab 542', 40), ('Lab 544', 40)
ON CONFLICT (lab_name) DO NOTHING;

-- 8. Seed computers for each lab (1-40) — done programmatically in migration code

-- 9. Master list of software applications
CREATE TABLE IF NOT EXISTS software_applications (
  id SERIAL PRIMARY KEY,
  app_name VARCHAR(120) UNIQUE NOT NULL,
  app_version VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Lab-software mapping and availability
CREATE TABLE IF NOT EXISTS lab_software_availability (
  id SERIAL PRIMARY KEY,
  lab_id INTEGER NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  software_id INTEGER NOT NULL REFERENCES software_applications(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT TRUE,
  notes TEXT,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (lab_id, software_id)
);
```

---

## Phase 2 — Backend API Routes

### Reservation Routes (NEW: `backend/routes/reservation.js`)

**Student endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/reservations/labs` | Authenticated | List all labs with computer counts |
| `GET` | `/api/reservations/lab/:labId/computers?date=&time_slot=` | Authenticated | Get availability grid — each computer's status |
| `POST` | `/api/reservations` | Student | Submit a reservation request (status = `pending`) |
| `DELETE` | `/api/reservations/:id` | Student | Cancel own reservation (pending/approved only) |
| `GET` | `/api/reservations/my` | Student | Get student's own reservations |
| `PUT` | `/api/reservations/toggle` | Student | Enable/disable own reservation capability |

**Admin endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/reservations/all` | Admin | Get all reservations with filters (status, date, lab) |
| `PUT` | `/api/reservations/:id/approve` | Admin | Approve a pending reservation |
| `PUT` | `/api/reservations/:id/decline` | Admin | Decline a reservation (with optional `admin_notes`) |
| `GET` | `/api/reservations/logs` | Admin | Get reservation audit logs (all actions) |
| `PUT` | `/api/reservations/computer/:computerId/toggle` | Admin | Toggle a specific PC available/unavailable |
| `PUT` | `/api/reservations/computer/:computerId/status` | Admin | Set PC status (available/maintenance/in-use) |
| `GET` | `/api/reservations/lab/:labId/manage` | Admin | Get full PC grid with admin controls |

---

### Testimonial Routes (NEW: `backend/routes/testimonial.js`)

**Student endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/testimonials/my` | Student | Get own testimonials |
| `POST` | `/api/testimonials` | Student | Submit a new testimonial (content + rating) |
| `PUT` | `/api/testimonials/:id` | Student | Edit own testimonial (pending only) |
| `DELETE` | `/api/testimonials/:id` | Student | Delete own testimonial |

**Admin endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/testimonials/all` | Admin | Get all testimonials with filters |
| `PUT` | `/api/testimonials/:id/approve` | Admin | Approve a testimonial for public display |
| `PUT` | `/api/testimonials/:id/reject` | Admin | Reject a testimonial |
| `DELETE` | `/api/testimonials/:id` | Admin | Delete any testimonial |

---

### Software Availability Routes (NEW: `backend/routes/software.js`)

**Admin endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/software` | Admin | List all software applications |
| `POST` | `/api/software` | Admin | Add software application (`app_name`, version, description) |
| `PUT` | `/api/software/:id` | Admin | Update software details |
| `DELETE` | `/api/software/:id` | Admin | Deactivate/remove software |
| `GET` | `/api/software/labs/:labId` | Admin | Get software availability matrix for one lab |
| `PUT` | `/api/software/labs/:labId/:softwareId` | Admin | Set software availability per lab with optional notes |
| `GET` | `/api/software/labs/overview` | Admin | Get cross-lab software availability summary |

---

### Register in `backend/index.js`

```js
app.use('/api/reservations', require('./routes/reservation'));
app.use('/api/testimonials', require('./routes/testimonial'));
app.use('/api/software', require('./routes/software'));
```

---

## Phase 3 — Student Dashboard Frontend (`StudentDashboard.jsx`)

**Current tabs:** `dashboard` (Overview) | `history` (Sit-In History) | `settings`

**Updated tabs:** `dashboard` | `history` | `reservation` | `testimonials` | `settings`

### Tab: Reservation (new)

- **Enable/Disable toggle** at top
  - Disabled → card with feature description + "Enable Reservation" button
  - Enabled → full reservation UI
- **Lab selector** dropdown (Lab 524, 526, 530, 542, 544)
- **Date picker** + **time slot picker** (fixed: `08:00-10:00`, `10:00-12:00`, `13:00-15:00`, `15:00-17:00`)
- **Visual PC grid** (5×8 for 40 computers)
  - 🟢 Green = available → clickable to reserve
  - 🔴 Red = reserved by someone else
  - 🟡 Yellow = your pending reservation
  - ⚫ Gray = maintenance/unavailable
- **"My Reservations"** section: status badges, cancel button, admin notes on declined

### Tab: Testimonials (new)

- **Submit Testimonial** form (star rating + textarea + submit)
- **My Testimonials** list with status badges (Pending / Approved / Rejected), edit/delete for pending

---

## Phase 4 — Admin Dashboard Frontend (`Dashboard.jsx`)

**Current tabs:** `dashboard` | `users` | `sitin` | `announcements` | `settings`

**Updated tabs:** `dashboard` | `users` | `sitin` | `announcements` | `reservation` | `testimonials` | `software` | `settings`

### Tab: Reservation (new) — 4 sub-views

**Pending Requests:** Table of pending reservations with Approve/Decline buttons

**PC Management:** Lab selector + visual grid with admin controls (toggle available/maintenance)

**Reservation Logs:** Full audit trail table with filters (date, action type, lab)

**All Reservations:** Table with status filter tabs (All/Pending/Approved/Declined/Cancelled/Completed)

### Tab: Testimonials (new)

- **Pending Review** section (highlighted) with approve/reject buttons
- **All Testimonials** table with status filter + delete

### Tab: Software (new)

- **Software Master List** with add/edit/deactivate actions
- **Lab Availability Matrix** (rows: software, columns: labs) with per-cell available/unavailable toggle
- **Per-lab quick view** to list all available software for the selected laboratory room

---

## Phase 5 - Reports + Analytics + Rewards

**Status:** Backend schema + routes implemented in Express (CSV only). Frontend UI and PDF export are still pending.

### 5a. Database Schema Additions

```sql
-- 1. Reward points (if not already present)
ALTER TABLE users ADD COLUMN IF NOT EXISTS reward_points INTEGER DEFAULT 0;

-- 2. Reward transactions (audit trail)
CREATE TABLE IF NOT EXISTS reward_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason VARCHAR(255),
  source VARCHAR(50) DEFAULT 'admin',        -- 'sitin' | 'admin' | 'bonus' | 'adjustment'
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Report exports (optional audit log)
CREATE TABLE IF NOT EXISTS report_exports (
  id SERIAL PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL,          -- 'sitin' | 'reservations' | 'testimonials' | 'users' | 'labs'
  format VARCHAR(10) NOT NULL,               -- 'csv' | 'pdf'
  filters TEXT,
  file_path TEXT,
  requested_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5b. Backend API Routes

**Reports (NEW: `backend/routes/reports.js`)**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/reports/templates` | Admin | List available report types and filters |
| `POST` | `/api/reports/generate` | Admin | Generate CSV/PDF by type and filters |
| `GET` | `/api/reports/history` | Admin | List past exports (if stored) |
| `GET` | `/api/reports/:id/download` | Admin | Download a stored report file |

**Analytics (NEW: `backend/routes/analytics.js`)**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/analytics/summary` | Admin | KPIs (sessions, avg duration, reservations) |
| `GET` | `/api/analytics/sessions` | Admin | Time series of sit-in sessions |
| `GET` | `/api/analytics/labs` | Admin | Lab utilization and occupancy |
| `GET` | `/api/analytics/reservations` | Admin | Reservation funnel and status breakdown |
| `GET` | `/api/analytics/peak-hours` | Admin | Peak hours and day-of-week usage |

**Rewards (NEW: `backend/routes/rewards.js`)**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/rewards/me` | Student | Points summary and recent transactions |
| `GET` | `/api/rewards/leaderboard` | Authenticated | Top students by points |
| `POST` | `/api/rewards/adjust` | Admin | Add or remove points for a student |
| `GET` | `/api/rewards/history` | Admin | Rewards history with filters |

**Integration note:** When a sit-in session is completed in `routes/sitin.js`, add a points award and insert a `reward_transactions` record.

**Register in `backend/index.js`**

```js
app.use('/api/reports', require('./routes/reports'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/rewards', require('./routes/rewards'));
```

### 5c. Student Dashboard Frontend (`StudentDashboard.jsx`)

- **Rewards tab** (or rewards card on Dashboard)
  - Current points total
  - Recent transactions list
  - Leaderboard preview (top 10)

### 5d. Admin Dashboard Frontend (`Dashboard.jsx`)

- **Analytics tab** with charts (sessions by day, lab utilization, peak hours)
- **Reports tab** with filters and export buttons (CSV/PDF) and history list
- **Rewards tab** with student search, adjust points, and leaderboard

---

## Implementation Order

```
Phase 1: Database Schema (all new tables + migrations)
  ↓
Phase 2: Backend APIs:
  2a. Reservation routes (student + admin)
  2b. Testimonial routes (student + admin)
  ↓
Phase 3: Student Dashboard Frontend:
  3a. Reservation tab (enable/disable + PC grid + my reservations)
  3b. Testimonials tab (submit form + my testimonials)
  ↓
Phase 4: Admin Dashboard Frontend:
  4a. Reservation management tab (pending + PC mgmt + logs + all)
  4b. Testimonials management tab (pending review + all)
  ↓
Phase 5: Reports + Analytics + Rewards
  5a. Reward points + report schema additions
  5b. Reports + analytics + rewards APIs
  5c. Student rewards UI
  5d. Admin analytics/reports/rewards UI
```

---

## Open Questions

1. **Reservation Time Slots**: Fixed slots (e.g. `08:00-10:00`, `10:00-12:00`, `13:00-15:00`, `15:00-17:00`) or free-form?
2. **Computers Per Lab**: Is 40 per lab correct? Configurable?
3. **Auto-Approval**: Require admin approval or auto-approve if PC available?
4. **Testimonial Moderation**: Auto-publish or require admin approval?
5. **Reservation Limits**: Max active reservations per student?
6. **Notification Integration**: Notify students on reservation approve/decline?
7. **Reports Storage**: Generate on-demand only, or store files for download/history?
8. **Report Formats**: CSV only, or also PDF?
9. **Rewards Policy**: Points per completed sit-in, per day, or manual only?
10. **Leaderboard Scope**: All-time, monthly, or weekly?

---

## Verification Plan

### Automated Tests
- Test all API endpoints with `curl`
- Verify migrations run on startup
- Test double-booking prevention
- Test enable/disable reservation toggle
- Test approve/decline flow
- Verify audit logs created for every action
- Test report generation for CSV/PDF
- Test analytics aggregation endpoints
- Test points award and rewards transactions

### Manual Verification
1. Student: enable reservation → select lab → reserve PC → see pending status
2. Admin: view pending → approve → student sees "Approved"
3. Admin: decline with notes → student sees reason
4. Admin: toggle PC maintenance → student grid updates
5. Admin: check reservation logs
6. Student: submit testimonial → admin sees pending
7. Admin: approve testimonial → status changes
8. Admin: generate CSV/PDF report with filters
9. Admin: analytics charts load with date range
10. Student: points awarded after sit-in completion
11. Admin: adjust points and leaderboard updates

### Build Verification
- `npm run dev` — no frontend errors
- `node index.js` — no backend errors, migrations pass
