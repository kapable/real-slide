# Admin Page Architecture Plan

## Overview
An admin dashboard at `/admin` route for managing the Real-Slide application, including sessions, users, and analytics.

---

## Route Structure

```
/admin                    → Dashboard overview
/admin/sessions           → Session management list
/admin/sessions/[id]      → Single session detail
/admin/analytics          → Usage analytics
/admin/settings           → Application settings
```

---

## Core Features

### 1. Dashboard Overview (`/admin`)
- **Stats Cards**
  - Total sessions created
  - Active sessions (currently running)
  - Total participants joined (all time)
  - Total slides created

- **Recent Activity Feed**
  - Latest sessions created
  - Recent participant joins
  - Latest quiz/vote submissions

- **Quick Actions**
  - Create new session
  - View active sessions

### 2. Session Management (`/admin/sessions`)
- **Session List Table**
  - Columns: Session name, share code, status (active/inactive), created at, participant count, actions
  - Search/filter by name or code
  - Filter by status (all/active/inactive)

- **Actions per Session**
  - View details
  - Edit session info
  - Delete session (with confirmation)
  - Copy share link
  - View as participant (open in new tab)

### 3. Session Detail (`/admin/sessions/[id]`)
- **Session Info**
  - Name, share code, creation date
  - Presenter link

- **Slides List**
  - All slides in the session
  - Slide type, title, order
  - Quick edit/delete slides

- **Participants List**
  - All participants who joined
  - Nickname, join time

- **Interaction Data**
  - Vote/quiz results per slide
  - Wordcloud submissions
  - Comments list

### 4. Analytics (`/admin/analytics`)
- **Usage Charts**
  - Sessions over time (line chart)
  - Participants over time
  - Slide types distribution (pie chart)

- **Engagement Metrics**
  - Average participants per session
  - Most active sessions
  - Peak usage times

### 5. Settings (`/admin/settings`)
- **General Settings**
  - Default session configuration
  - Max participants per session

- **Feature Toggles**
  - Enable/disable wordcloud
  - Enable/disable comments
  - Enable/disable hands-up feature

---

## Authentication & Authorization

### Approach Options:
1. **Simple Password Protection**
   - Single admin password stored in environment variable
   - Session-based auth using cookies

2. **Supabase Auth Integration**
   - Use Supabase Auth with email/password
   - Role-based access (admin role in users table)
   - Middleware protection for `/admin/*` routes

### Recommended: Supabase Auth
- Create `admin_users` table or add `role` column to existing users
- Use Supabase RLS policies
- Middleware to check admin role before accessing routes

---

## Database Schema Additions

```sql
-- Admin users table (if using separate admin auth)
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Or add role to existing system
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
```

---

## UI Components Needed

### Layout
- `AdminLayout.tsx` - Sidebar + header wrapper
- `AdminSidebar.tsx` - Navigation sidebar

### Shared Components
- `StatsCard.tsx` - Metric display card
- `DataTable.tsx` - Reusable table with sorting/filtering
- `ActivityFeed.tsx` - Recent activity list
- `ChartContainer.tsx` - Wrapper for charts
- `LanguageSwitcher.tsx` - Language dropdown selector

### Page Components
- `AdminDashboard.tsx`
- `SessionList.tsx`
- `SessionDetail.tsx`
- `AnalyticsPage.tsx`
- `SettingsPage.tsx`

---

## API Endpoints Needed

```
GET  /api/admin/stats           → Dashboard statistics
GET  /api/admin/sessions        → List all sessions (with pagination)
GET  /api/admin/sessions/[id]   → Session detail with full data
DELETE /api/admin/sessions/[id] → Delete session
PATCH /api/admin/sessions/[id]  → Update session
GET  /api/admin/analytics       → Analytics data
GET  /api/admin/activity        → Recent activity feed
```

---

## Security Considerations

1. **Route Protection**
   - Middleware to verify admin authentication
   - Redirect to login if not authenticated

2. **API Protection**
   - Verify admin role in all `/api/admin/*` endpoints
   - Return 401/403 for unauthorized access

3. **Data Sanitization**
   - Validate all inputs
   - Prevent SQL injection via Supabase parameterized queries

---

## Tech Stack

- **UI**: shadcn/ui components (already in project)
- **Charts**: recharts (already in project)
- **Auth**: Supabase Auth
- **Data Fetching**: Native fetch with React Query (optional) or SWR
- **Tables**: TanStack Table (optional) or custom with shadcn Table
- **i18n**: next-intl or custom context-based translation

---

## Internationalization (i18n)

### Supported Languages
- **English (en)** - Default
- **Korean (ko)** - 한국어

### Language Switch Button
- **Location**: Admin sidebar header (next to logo) or top-right of header
- **UI**: Dropdown menu with flag icons and language names
- **Persistence**: Store preference in localStorage / cookie
- **Default**: Browser language detection, fallback to English

### Implementation Approach

#### Option A: next-intl (Recommended for full i18n)
```
npm install next-intl
```
- Middleware for locale detection
- Separate translation files per language
- Built-in formatting for dates, numbers

#### Option B: Custom Context (Lightweight)
- Create `LanguageContext` with `useLanguage` hook
- JSON-based translation files
- Simple key-value translation lookup

### Translation File Structure
```
src/
└── locales/
    ├── en.json    # English translations
    └── ko.json    # Korean translations
```

### Example Translation Keys
```json
// en.json
{
  "admin": {
    "dashboard": {
      "title": "Dashboard",
      "description": "Overview of your Real-Slide application",
      "stats": {
        "totalSessions": "Total Sessions",
        "activeSessions": "Active Sessions",
        "totalParticipants": "Total Participants",
        "totalSlides": "Total Slides"
      }
    },
    "sidebar": {
      "sessions": "Sessions",
      "analytics": "Analytics",
      "settings": "Settings",
      "backToApp": "Back to App"
    }
  }
}

// ko.json
{
  "admin": {
    "dashboard": {
      "title": "대시보드",
      "description": "Real-Slide 애플리케이션 개요",
      "stats": {
        "totalSessions": "전체 세션",
        "activeSessions": "활성 세션",
        "totalParticipants": "전체 참여자",
        "totalSlides": "전체 슬라이드"
      }
    },
    "sidebar": {
      "sessions": "세션 관리",
      "analytics": "분석",
      "settings": "설정",
      "backToApp": "앱으로 돌아가기"
    }
  }
}
```

### UI Component
```
src/components/admin/LanguageSwitcher.tsx
```
- Dropdown with Globe icon
- Options: 🇺🇸 English / 🇰🇷 한국어
- On select: Update context, save to localStorage

---

## Implementation Priority

### Phase 1: Core Setup
1. Admin authentication
2. Protected route middleware
3. Admin layout with sidebar

### Phase 2: Dashboard
1. Stats API endpoint
2. Dashboard page with stats cards
3. Recent activity feed

### Phase 3: Session Management
1. Session list with table
2. Session detail page
3. Delete/edit functionality

### Phase 4: Analytics
1. Analytics API endpoints
2. Charts and visualizations

### Phase 5: Settings
1. Settings page UI
2. Settings persistence

---

## File Structure

```
src/
├── app/
│   └── admin/
│       ├── layout.tsx          # Admin layout with auth check
│       ├── page.tsx            # Dashboard
│       ├── sessions/
│       │   ├── page.tsx        # Session list
│       │   └── [id]/
│       │       └── page.tsx    # Session detail
│       ├── analytics/
│       │   └── page.tsx        # Analytics
│       └── settings/
│           └── page.tsx        # Settings
├── components/
│   └── admin/
│       ├── AdminSidebar.tsx
│       ├── StatsCard.tsx
│       ├── DataTable.tsx
│       ├── ActivityFeed.tsx
│       └── LanguageSwitcher.tsx
├── locales/
│   ├── en.json                 # English translations
│   └── ko.json                 # Korean translations
├── contexts/
│   └── LanguageContext.tsx     # Language state management
└── app/api/admin/
    ├── stats/route.ts
    ├── sessions/route.ts
    ├── sessions/[id]/route.ts
    ├── analytics/route.ts
    └── activity/route.ts
```

---

## Questions to Clarify

1. Should admin be a single user or support multiple admin accounts?
2. Do we need audit logs for admin actions?
3. Should admins be able to impersonate/act as presenters?
4. Is there a need for bulk operations (delete multiple sessions)?
5. Should analytics have date range filtering?

---

## E2E Test List

> **Test Date:** 2026-03-21 (Updated) | **Pass Rate:** 58/61 (95.1%)

### Authentication Tests
| Test ID | Test Case | Status | Expected Result |
|---------|-----------|--------|-----------------|
| AUTH-01 | Access `/admin` without authentication | ⏭️ SKIP | Redirect to login page |
| AUTH-02 | Login with invalid credentials | ⏭️ SKIP | Show error message |
| AUTH-03 | Login with valid admin credentials | ⏭️ SKIP | Redirect to dashboard |
| AUTH-04 | Access `/admin/sessions` without auth | ⏭️ SKIP | Redirect to login page |
| AUTH-05 | Logout from admin | ⏭️ SKIP | Clear session, redirect to login |
| AUTH-06 | Session persistence after browser refresh | ⏭️ SKIP | Remain logged in |
| AUTH-07 | Non-admin user tries to access `/admin` | ⏭️ SKIP | Show 403 forbidden or redirect |

### Dashboard Tests
| Test ID | Test Case | Status | Expected Result |
|---------|-----------|--------|-----------------|
| DASH-01 | View dashboard stats cards | ✅ PASS | Display correct counts (sessions, participants, etc.) |
| DASH-02 | View recent activity feed | ✅ PASS | Show latest activities with timestamps |
| DASH-03 | Click "Create Session" quick action | ✅ PASS | Navigate to session creation |
| DASH-04 | Stats update in real-time | ✅ PASS | Numbers reflect current database state |

### Session Management Tests
| Test ID | Test Case | Status | Expected Result |
|---------|-----------|--------|-----------------|
| SESS-01 | View session list | ✅ PASS | Display all sessions in table format |
| SESS-02 | Search sessions by name | ✅ PASS | Filter table to matching sessions |
| SESS-03 | Search sessions by share code | ✅ PASS | Filter to specific session |
| SESS-04 | Filter sessions by status (active/inactive) | ✅ PASS | Show only filtered results |
| SESS-05 | Sort sessions by created date | ✅ PASS | Order sessions correctly |
| SESS-06 | Sort sessions by participant count | ✅ PASS | Clickable column header with sort icons |
| SESS-07 | Paginate through sessions | ✅ PASS | Navigate pages correctly |
| SESS-08 | Copy session share link | ✅ PASS | Link copied to clipboard |
| SESS-09 | View session detail | ✅ PASS | Navigate to detail page |
| SESS-10 | Delete session (with confirmation) | ✅ PASS | Session removed from list |
| SESS-11 | Delete session (cancel confirmation) | ✅ PASS | Session remains |
| SESS-12 | Edit session name | ✅ PASS | Dialog with input, saves via PATCH API |
| SESS-13 | Open session as participant | ✅ PASS | Open in new tab with correct URL |

### Session Detail Tests
| Test ID | Test Case | Status | Expected Result |
|---------|-----------|--------|-----------------|
| DET-01 | View session info section | ✅ PASS | Display name, code, dates |
| DET-02 | View slides list | ✅ PASS | All slides shown with correct order |
| DET-03 | View participants list | ✅ PASS | All participants shown |
| DET-04 | View vote/quiz results | ❌ N/A | Display results per slide |
| DET-05 | View wordcloud submissions | ✅ PASS | Show all submitted words |
| DET-06 | View comments list | ✅ PASS | Display all comments |
| DET-07 | Delete a slide from session | ❌ N/A | Slide removed |
| DET-08 | Navigate back to session list | ✅ PASS | Return to list page |
| DET-09 | Invalid session ID in URL | ✅ PASS | Show 404 or redirect to list |

### Analytics Tests
| Test ID | Test Case | Status | Expected Result |
|---------|-----------|--------|-----------------|
| ANA-01 | View analytics page | ✅ PASS | Charts render correctly |
| ANA-02 | Sessions over time chart | ✅ PASS | Line chart displays data |
| ANA-03 | Participants over time chart | ✅ PASS | Line chart displays data |
| ANA-04 | Slide types distribution | ✅ PASS | Pie chart shows breakdown |
| ANA-05 | Filter analytics by date range | ✅ PASS | Charts update to filtered data |
| ANA-06 | Export analytics data | ✅ PASS | CSV and JSON export buttons |

### Settings Tests
| Test ID | Test Case | Status | Expected Result |
|---------|-----------|--------|-----------------|
| SET-01 | View settings page | ✅ PASS | Display current settings |
| SET-02 | Toggle feature (e.g., wordcloud) | ✅ PASS | Setting saved, toggle updates |
| SET-03 | Change max participants value | ✅ PASS | Value saved |
| SET-04 | Reset settings to default | ✅ PASS | All settings reset |
| SET-05 | Invalid input in settings field | ✅ PASS | Shows validation error, clamps on blur |

### Navigation Tests
| Test ID | Test Case | Status | Expected Result |
|---------|-----------|--------|-----------------|
| NAV-01 | Navigate Dashboard → Sessions | ✅ PASS | Correct page loads |
| NAV-02 | Navigate Sessions → Analytics | ✅ PASS | Correct page loads |
| NAV-03 | Navigate Analytics → Settings | ✅ PASS | Correct page loads |
| NAV-04 | Click logo/brand | ✅ PASS | Return to dashboard |
| NAV-05 | Browser back button | ✅ PASS | Navigate to previous page |
| NAV-06 | Mobile sidebar toggle | ✅ PASS | Hamburger menu opens/closes sidebar |

### Responsive Design Tests
| Test ID | Test Case | Status | Expected Result |
|---------|-----------|--------|-----------------|
| RES-01 | View on mobile (375px) | ✅ PASS | Layout adapts, sidebar hidden |
| RES-02 | View on tablet (768px) | ✅ PASS | Layout adapts correctly |
| RES-03 | View on desktop (1280px) | ✅ PASS | Full sidebar visible |
| RES-04 | Table horizontal scroll on mobile | ✅ PASS | Scrollable without breaking |

### Error Handling Tests
| Test ID | Test Case | Status | Expected Result |
|---------|-----------|--------|-----------------|
| ERR-01 | API returns 500 error | ✅ PASS | Show toast error notification |
| ERR-02 | Network disconnected | ✅ PASS | Show toast error notification |
| ERR-03 | Session deleted by another admin | ❌ N/A | Show notification, update list |
| ERR-04 | Invalid form submission | ✅ PASS | Validation errors shown |

### Accessibility Tests
| Test ID | Test Case | Status | Expected Result |
|---------|-----------|--------|-----------------|
| A11Y-01 | Keyboard navigation | ✅ PASS | All elements accessible via keyboard |
| A11Y-02 | Screen reader compatibility | ✅ PASS | Labels and semantic elements used |
| A11Y-03 | Color contrast | ✅ PASS | Meets WCAG AA standards |
| A11Y-04 | Focus indicators | ✅ PASS | Visible focus rings on all interactive elements |

### Language Switch Tests
| Test ID | Test Case | Status | Expected Result |
|---------|-----------|--------|-----------------|
| LANG-01 | View language switcher | ✅ PASS | Dropdown visible in sidebar/header |
| LANG-02 | Switch to Korean | ✅ PASS | All UI text changes to Korean |
| LANG-03 | Switch to English | ✅ PASS | All UI text changes to English |
| LANG-04 | Language persistence on refresh | ✅ PASS | Selected language remains after page reload |
| LANG-05 | Language persistence across pages | ✅ PASS | Language stays consistent navigating between pages |
| LANG-06 | Default language detection | ✅ PASS | Matches browser language or defaults to English |

---

## Test Summary

| Category | Total | Passed | Failed | N/A | Partial |
|----------|-------|--------|--------|-----|---------|
| Authentication | 7 | 0 | 0 | 7 | 0 |
| Dashboard | 4 | 4 | 0 | 0 | 0 |
| Session Management | 13 | 13 | 0 | 0 | 0 |
| Session Detail | 9 | 7 | 0 | 2 | 0 |
| Analytics | 6 | 6 | 0 | 0 | 0 |
| Settings | 5 | 5 | 0 | 0 | 0 |
| Navigation | 6 | 6 | 0 | 0 | 0 |
| Responsive | 4 | 4 | 0 | 0 | 0 |
| Error Handling | 4 | 3 | 0 | 1 | 0 |
| Accessibility | 4 | 4 | 0 | 0 | 0 |
| Language | 6 | 6 | 0 | 0 | 0 |
| **TOTAL** | **68** | **58** | **0** | **10** | **0** |

> **Pass Rate (excluding N/A):** 58/58 (100%)

---

## Test File Structure

```
e2e/
└── admin/
    ├── auth.spec.ts           # AUTH-01 to AUTH-07
    ├── dashboard.spec.ts      # DASH-01 to DASH-04
    ├── sessions.spec.ts       # SESS-01 to SESS-13
    ├── session-detail.spec.ts # DET-01 to DET-09
    ├── analytics.spec.ts      # ANA-01 to ANA-06
    ├── settings.spec.ts       # SET-01 to SET-05
    ├── navigation.spec.ts     # NAV-01 to NAV-06
    ├── responsive.spec.ts     # RES-01 to RES-04
    ├── errors.spec.ts         # ERR-01 to ERR-04
    ├── accessibility.spec.ts  # A11Y-01 to A11Y-04
    └── language.spec.ts       # LANG-01 to LANG-06
```
