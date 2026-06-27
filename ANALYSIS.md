# DermaScan — System Analysis Document

> **Purpose:** Full UML analysis of the DermaScan app to support production of all UML diagrams.
> App: React Native (Expo) + React (Vite/Web) — cross-platform AI dermatology tool.

---

## 1. SYSTEM OVERVIEW & ACTORS

### Primary Actors
| Actor | Description |
|-------|-------------|
| **Patient** | Registered user who submits skin scans, views history, reads tips, uses the chatbot |
| **Admin** | Privileged user (role = 'admin') who monitors epidemiological data and broadcasts tips |

### Secondary Actors (External Systems / APIs)
| Actor | Role |
|-------|------|
| **Supabase Auth** | Identity provider — sign-in, sign-up, session management, JWT tokens |
| **Supabase Database** | PostgreSQL — stores profiles, scans, daily_tips_broadcast |
| **Supabase Storage** | Object storage — skin-scan images and avatar images |
| **Google Gemini 2.0 Flash API** | AI vision model — analyses skin images on the web platform |
| **Python ML Backend** | Custom REST API (`/scan`) — runs a local CNN model for native (mobile) scan analysis |
| **OpenRouter API (Llama 3.3 70B)** | LLM gateway — powers the DermaBot chatbot responses |
| **expo-print / jsPDF** | PDF generation libraries — produce downloadable scan reports |
| **expo-sharing** | Native OS share sheet — shares PDF files on mobile |


---

## 2. USE CASE DIAGRAM (Textual Specification)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         DermaScan System Boundary                                │
│                                                                                  │
│  ┌─── PATIENT USE CASES ───────────────────────────────────────────────────────┐ │
│  │  UC-P01  Register / Create Account                                          │ │
│  │  UC-P02  Log In                                                             │ │
│  │  UC-P03  Log Out                                                            │ │
│  │  UC-P04  Submit Skin Scan (upload image / snap photo)                       │ │
│  │  UC-P05  View AI Diagnosis Result                                           │ │
│  │  UC-P06  Complete Post-Scan Symptom Questionnaire                           │ │
│  │  UC-P07  View Scan History                                                  │ │
│  │  UC-P08  Search Scan History                                                │ │
│  │  UC-P09  Download PDF Report of a Scan                                      │ │
│  │  UC-P10  Edit Scan (type, location, severity)                               │ │
│  │  UC-P11  Delete Scan                                                        │ │
│  │  UC-P12  View Dashboard (health index, last scan, daily tips)               │ │
│  │  UC-P13  Read Daily Care Tips                                               │ │
│  │  UC-P14  Receive Tip Notification (bell indicator)                          │ │
│  │  UC-P15  Chat with DermaBot                                                 │ │
│  │  UC-P16  View / Edit Profile                                                │ │
│  │  UC-P17  Upload Profile Avatar                                              │ │
│  │  UC-P18  Sync Profile from Server                                           │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌─── ADMIN USE CASES ─────────────────────────────────────────────────────────┐ │
│  │  UC-A01  Log In (shared with patient)                                       │ │
│  │  UC-A02  View Epidemiological Dashboard (KPIs)                              │ │
│  │  UC-A03  View Total Patients, Total Scans, Infected Count, Severe Count     │ │
│  │  UC-A04  View Infection Rate Bar                                            │ │
│  │  UC-A05  View Sex Breakdown                                                 │ │
│  │  UC-A06  View Top Affected Zones (geographic)                               │ │
│  │  UC-A07  Search Patient List                                                │ │
│  │  UC-A08  View Patient Profile Detail                                        │ │
│  │  UC-A09  Call Patient (tel: link)                                           │ │
│  │  UC-A10  Publish / Update Daily Tips Broadcast                              │ │
│  │  UC-A11  View / Edit Own Profile Settings                                   │ │
│  │  UC-A12  Log Out (shared with patient)                                      │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌─── SECONDARY ACTOR INTERACTIONS ───────────────────────────────────────────┐ │
│  │  Supabase Auth   ←→ UC-P01, UC-P02, UC-P03, UC-A01, UC-A12, UC-P18        │ │
│  │  Supabase DB     ←→ UC-P04, UC-P07, UC-A02..A10, UC-P13, UC-P16           │ │
│  │  Supabase Storage←→ UC-P04 (scan image), UC-P17 (avatar)                  │ │
│  │  Gemini API      ←→ UC-P04 (web platform AI analysis)                      │ │
│  │  Python ML API   ←→ UC-P04 (native platform AI analysis)                   │ │
│  │  OpenRouter API  ←→ UC-P15 (chatbot messages)                              │ │
│  │  jsPDF/expo-print←→ UC-P09 (PDF report generation)                         │ │
│  │  expo-sharing    ←→ UC-P09 (native share sheet)                            │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘

Patient ──► UC-P01..P18
Admin   ──► UC-A01..A12
```

### Use Case Relationships
- **include:** UC-P04 includes UC-P06 (questionnaire shown after every scan)
- **include:** UC-P04 includes cloud sync attempt (Supabase Storage + DB)
- **extend:** UC-P04 extends with fallback to local-only when offline
- **extend:** UC-P09 extends with native share sheet (expo-sharing) on mobile
- **generalize:** Admin and Patient both generalize from "Authenticated User" for login/logout/settings


---

## 3. CLASS DIAGRAM

### Class Definitions

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLASS DIAGRAM                            │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐
│           UserProfile           │
├─────────────────────────────────┤
│ + id: string                    │
│ + firstName: string             │
│ + lastName: string              │
│ + email: string                 │
│ + sex: 'male'|'female'|'other'  │
│ + location: string              │
│ + contact: string               │
│ + role: 'patient'|'admin'       │
│ + biometricEnabled: boolean     │
│ + avatarUrl?: string            │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│           ScanRecord            │
├─────────────────────────────────┤
│ + id?: number | string          │
│ + type: string                  │
│ + location: string              │
│ + confidence: number            │
│ + summary: string               │
│ + imageData?: string            │
│ + timestamp: Date | string      │
│ + isSynced: boolean | number    │
│ + severity: 'low'|'medium'|'high'│
│ + patientId?: string            │
│ + questionnaireAnswers?: string │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│       QuestionnaireAnswer       │
├─────────────────────────────────┤
│ + questionId: string            │
│ + questionText: string          │
│ + answer: string|string[]|number│
└─────────────────────────────────┘

┌─────────────────────────────────┐
│        DailyTipsBroadcast       │
├─────────────────────────────────┤
│ + id: number                    │
│ + tip1_title: string | null     │
│ + tip1_body: string | null      │
│ + tip2_title: string | null     │
│ + tip2_body: string | null      │
│ + updated_at: string | null     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│          AppContext             │
├─────────────────────────────────┤
│ + user: UserProfile | null      │
│ + activeScreen: string          │
│ + isOnline: boolean             │
│ + isBooting: boolean            │
├─────────────────────────────────┤
│ + setUser()                     │
│ + setActiveScreen()             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│            Message              │  (DermaBot)
├─────────────────────────────────┤
│ + role: 'bot' | 'user'          │
│ + text: string                  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│           Question              │
├─────────────────────────────────┤
│ + id: string                    │
│ + text: string                  │
│ + type: 'single'|'multi'|       │
│         'text'|'scale'          │
│ + options?: string[]            │
│ + scaleMin?: number             │
│ + scaleMax?: number             │
│ + scaleLabels?: [string,string] │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│    AdminStats (ValueObject)     │
├─────────────────────────────────┤
│ + totalScans: number            │
│ + totalPatients: number         │
│ + infected: number              │
│ + severelyInfected: number      │
│ + zoneMap: Record<string,number>│
│ + sexMap: Record<string,number> │
│ + profiles: Profile[]           │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│         DermaDB (Web)           │  Dexie / IndexedDB
├─────────────────────────────────┤
│ + scans: Table<ScanRecord>      │
│ + users: Table<UserProfile>     │
├─────────────────────────────────┤
│ + add(record): Promise<number>  │
│ + update(id, changes): void     │
│ + delete(id): void              │
│ + toArray(): ScanRecord[]       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│       DermaDB (Native)          │  expo-sqlite / SQLite
├─────────────────────────────────┤
│ + scans: SQLiteTable            │
│ + users: SQLiteTable            │
├─────────────────────────────────┤
│ + add(record): Promise<number>  │
│ + update(id, changes): void     │
│ + delete(id): void              │
│ + toArray(): ScanRecord[]       │
└─────────────────────────────────┘
```

### Associations
```
UserProfile      "1" ──< "0..*"  ScanRecord           (one patient, many scans)
ScanRecord       "1" ──< "0..*"  QuestionnaireAnswer  (one scan, many answers)
AppContext       "1" ──── "0..1" UserProfile          (holds current user)
DermaDB          "1" ──< "0..*"  ScanRecord           (stores scans)
DermaDB          "1" ──< "0..*"  UserProfile          (stores users)
AdminStats       "1" ──< "0..*"  Profile              (aggregate of patient profiles)
DermaBotWidget   "1" ──< "0..*"  Message              (conversation history)
PostScanQuestionnaire "1" ──< "0..*" Question         (question set)
PostScanQuestionnaire "1" ──< "0..*" QuestionnaireAnswer (collected answers)
```


---

## 4. OBJECT DIAGRAM (Snapshot — Patient performing a scan)

```
:AppContext
  user = patientObj
  activeScreen = "scan"
  isOnline = true
  isBooting = false

patientObj : UserProfile
  id = "uuid-a1b2c3"
  firstName = "Alice"
  lastName = "Mensah"
  email = "alice@example.com"
  sex = "female"
  location = "Accra"
  contact = "+233201234567"
  role = "patient"
  biometricEnabled = false
  avatarUrl = "https://storage.supabase.co/avatars/uuid-a1b2c3/avatar.jpg"

scanResult : ScanRecord
  id = 42
  type = "Dermatitis"
  location = "Accra"
  confidence = 87.4
  severity = "low"
  summary = "Mild inflammatory dermatosis..."
  imageData = "data:image/jpeg;base64,/9j/4AAQ..."
  timestamp = 2026-06-18T10:32:00Z
  isSynced = false
  patientId = "uuid-a1b2c3"
  questionnaireAnswers = "[{\"questionId\":\"duration\",\"answer\":\"1–4 weeks\"},...]"

answer1 : QuestionnaireAnswer
  questionId = "duration"
  questionText = "How long have you had this skin condition?"
  answer = "1–4 weeks"

answer2 : QuestionnaireAnswer
  questionId = "pain_level"
  questionText = "How would you rate any pain or discomfort?"
  answer = 3

:DermaDB
  scans = [scanResult]
  users = [patientObj]

msg1 : Message
  role = "bot"
  text = "Hi Alice 👋 I'm DermaBot..."

msg2 : Message
  role = "user"
  text = "What is eczema?"

:DermaBotWidget
  open = true
  busy = false
  messages = [msg1, msg2]
```


---

## 5. STATE MACHINE DIAGRAMS

### 5.1 Authentication State Machine

```
                        ┌───────────────┐
                        │   [Initial]   │
                        └──────┬────────┘
                               │ App launches
                               ▼
                        ┌───────────────┐
                        │   Booting     │◄── getSession() pending
                        └──────┬────────┘
              ┌────────────────┼─────────────────┐
              │ No session     │ Session found    │ Supabase not configured
              ▼                ▼                  ▼
        ┌──────────┐   ┌────────────────┐  ┌──────────┐
        │ AuthScreen│   │ Loading Profile│  │ AuthScreen│
        │ (Login/  │   └───────┬────────┘  └──────────┘
        │  Register)│          │ profile fetched
        └─────┬────┘          ▼
              │         ┌─────────────┐
              │         │  role check │
              │         └──────┬──────┘
              │       admin    │   patient
              │         ┌──────┴──────┐
              │         ▼             ▼
              │   ┌──────────┐  ┌──────────┐
              │   │ AdminHome│  │Dashboard │
              │   └──────────┘  └──────────┘
              │
    ┌─────────┴──────────┐
    │ Sign In submitted   │
    ▼                     ▼
┌─────────────┐    ┌──────────────┐
│ Authenticating│  │ Registering  │
└──────┬──────┘    └──────┬───────┘
  fail │                  │ success (no session = email confirm)
       ▼                  ▼
  ┌─────────┐       ┌───────────────────┐
  │  Error  │       │ AwaitEmailConfirm │
  └─────────┘       └───────────────────┘
                          │ success (session available)
                          ▼
                    ┌──────────┐
                    │Dashboard │
                    └──────────┘
                          │ logout
                          ▼
                    ┌──────────┐
                    │AuthScreen│
                    └──────────┘
```

### 5.2 Scan Submission State Machine

```
         ┌──────────┐
         │  Idle    │◄────────────────────────────────────────┐
         └────┬─────┘                                         │
              │ User selects image / snaps photo               │
              ▼                                                │
       ┌─────────────┐                                        │
       │ ImageSelected│                                       │
       └──────┬───────┘                                       │
              │ Tap "Scan Now" / "Run Diagnostic"             │
              ▼                                                │
       ┌───────────────┐                                      │
       │  Processing   │                                      │
       │  (Analyzing)  │                                      │
       └──────┬────────┘                                      │
       ┌──────┴──────────────────────────────┐                │
       │ Web path                            │ Native path     │
       ▼                                     ▼                 │
┌──────────────┐                   ┌──────────────────┐       │
│ Gemini API   │                   │ Python ML Backend│       │
│ call         │                   │ POST /scan       │       │
└──────┬───────┘                   └────────┬─────────┘       │
       │ fail                               │ fail             │
       ▼                                    ▼                  │
┌─────────────┐                   ┌──────────────────┐        │
│ LocalFallback│                  │ MockFallback      │        │
└──────┬───────┘                  └────────┬─────────┘        │
       └──────────────┬───────────────────┘                    │
                      │ result ready                           │
                      ▼                                        │
               ┌────────────┐                                  │
               │ SaveToLocal│ (IndexedDB / SQLite)             │
               └─────┬──────┘                                  │
                     │                                         │
                     ▼                                         │
              ┌─────────────┐                                  │
              │ CloudSync?  │                                  │
              └─────┬───────┘                                  │
         online/    │    offline / no Supabase                 │
         configured │                                          │
              ┌─────┘                                          │
              ▼                                                 │
       ┌───────────────┐                                       │
       │ UploadToCloud │ (Supabase Storage + DB)              │
       └──────┬────────┘                                       │
              │ success or fail (kept local)                   │
              ▼                                                 │
       ┌──────────────────────┐                                │
       │ ShowQuestionnaire    │                                │
       └──────┬───────────────┘                                │
              │ Complete / Skip                                 │
              ▼                                                 │
       ┌──────────────┐                                        │
       │  HistoryScreen│──────────────────────────────────────┘
       └──────────────┘
```

### 5.3 DermaBot Chat State Machine

```
   ┌──────────┐
   │  Closed  │◄─────────── User taps X
   └────┬─────┘
        │ FAB tapped
        ▼
   ┌──────────┐
   │   Open   │
   │ (idle)   │
   └────┬─────┘
        │ User types + sends
        ▼
   ┌──────────────┐
   │   Sending    │ (message appended to list)
   └──────┬───────┘
          │
          ▼
   ┌─────────────────┐
   │ AwaitingResponse│ (typing indicator shown)
   └──────┬──────────┘
     ┌────┴──────┐
     │ success   │ fail
     ▼           ▼
  ┌──────┐  ┌─────────┐
  │ Reply│  │ ErrorMsg│
  └──┬───┘  └────┬────┘
     └──────┬────┘
            ▼
       ┌──────────┐
       │ Open/idle│ (back to waiting for next message)
       └──────────┘
```


---

## 6. COMPONENT DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DermaScan Application                                │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       Presentation Layer                             │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │   │
│  │  │  AuthScreen  │  │  Dashboard   │  │      ScanScreen (web)    │   │   │
│  │  └──────────────┘  └──────────────┘  │      SkinScanner (native)│   │   │
│  │  ┌──────────────┐  ┌──────────────┐  └──────────────────────────┘   │   │
│  │  │HistoryScreen │  │ AdminScreen  │  ┌──────────────────────────┐   │   │
│  │  └──────────────┘  └──────────────┘  │  PostScanQuestionnaire   │   │   │
│  │  ┌──────────────┐  ┌──────────────┐  └──────────────────────────┘   │   │
│  │  │ProfileSettings│ │DermaBotWidget│  ┌──────────────────────────┐   │   │
│  │  └──────────────┘  └──────────────┘  │  TipsNotificationModal   │   │   │
│  │  ┌──────────────┐                    └──────────────────────────┘   │   │
│  │  │  Navigation  │                                                    │   │
│  │  └──────────────┘                                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                ▲ uses                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       State / Context Layer                          │   │
│  │                                                                      │   │
│  │  ┌──────────────────────┐   ┌──────────────────┐                   │   │
│  │  │     AppContext       │   │  useDailyTipsBell│                   │   │
│  │  │ (user, screen, net)  │   │  (polling hook)  │                   │   │
│  │  └──────────────────────┘   └──────────────────┘                   │   │
│  │  ┌──────────────────────┐                                           │   │
│  │  │  usePatientScans     │                                           │   │
│  │  │  (Dexie live query / │                                           │   │
│  │  │   SQLite + Supabase) │                                           │   │
│  │  └──────────────────────┘                                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                ▲ uses                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Data / Service Layer                          │   │
│  │                                                                      │   │
│  │  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │   │
│  │  │ supabase/auth │  │ supabaseScans.ts │  │ supabaseDailyTips.ts │  │   │
│  │  └───────────────┘  └──────────────────┘  └──────────────────────┘  │   │
│  │  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │   │
│  │  │  localScans   │  │  DermaDB (db.ts) │  │dailyTipsNotifications│  │   │
│  │  └───────────────┘  └──────────────────┘  └──────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                ▲ uses                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     External Services                                │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌────────────────┐  ┌─────────────────────────┐   │   │
│  │  │Supabase Auth│  │Supabase Postgres│  │ Supabase Storage        │   │   │
│  │  │   (JWT)     │  │(profiles,scans,│  │ (skin-scans, avatars)    │   │   │
│  │  └─────────────┘  │ daily_tips_    │  └─────────────────────────┘   │   │
│  │                   │ broadcast)     │                                  │   │
│  │                   └────────────────┘                                  │   │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐     │   │
│  │  │ Google Gemini   │  │ Python ML Backend│  │ OpenRouter API  │     │   │
│  │  │ 2.0 Flash (Web) │  │ /scan (Native)   │  │ (LLaMA 3.3 70B) │     │   │
│  │  └─────────────────┘  └──────────────────┘  └─────────────────┘     │   │
│  │  ┌─────────────────┐  ┌──────────────────┐                           │   │
│  │  │  jsPDF (Web)    │  │expo-print+sharing│                           │   │
│  │  │  PDF reports    │  │(Native PDF)      │                           │   │
│  │  └─────────────────┘  └──────────────────┘                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```


---

## 7. PACKAGE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  package: dermascan-app                                                      │
│                                                                             │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │  package: src                                                       │   │
│   │                                                                     │   │
│   │  ┌─────────────────────────────────────────────────────────────┐   │   │
│   │  │  package: components                                         │   │   │
│   │  │  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │   │   │
│   │  │  │ AuthScreen   │  │  Dashboard    │  │  ScanScreen      │  │   │   │
│   │  │  │              │  │               │  │  SkinScanner     │  │   │   │
│   │  │  └──────────────┘  └───────────────┘  └──────────────────┘  │   │   │
│   │  │  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │   │   │
│   │  │  │HistoryScreen │  │  AdminScreen  │  │  DermaBotWidget  │  │   │   │
│   │  │  └──────────────┘  └───────────────┘  └──────────────────┘  │   │   │
│   │  │  ┌──────────────────────┐  ┌──────────────────────────────┐  │   │   │
│   │  │  │ PostScanQuestionnaire│  │ ProfileSettingsScreen        │  │   │   │
│   │  │  └──────────────────────┘  └──────────────────────────────┘  │   │   │
│   │  │  ┌──────────────────────┐  ┌──────────────┐                  │   │   │
│   │  │  │TipsNotificationModal │  │  Navigation  │  Skeleton        │   │   │
│   │  │  └──────────────────────┘  └──────────────┘                  │   │   │
│   │  └─────────────────────────────────────────────────────────────┘   │   │
│   │              │ imports                                              │   │
│   │  ┌─────────────────────────────────────────────────────────────┐   │   │
│   │  │  package: hooks                                              │   │   │
│   │  │  ┌─────────────────────┐  ┌───────────────────────────────┐  │   │   │
│   │  │  │ usePatientScans.ts  │  │ useDailyTipsBell.ts           │  │   │   │
│   │  │  └─────────────────────┘  └───────────────────────────────┘  │   │   │
│   │  └─────────────────────────────────────────────────────────────┘   │   │
│   │              │ imports                                              │   │
│   │  ┌─────────────────────────────────────────────────────────────┐   │   │
│   │  │  package: lib                                                │   │   │
│   │  │                                                              │   │   │
│   │  │  ┌─────────────────────────────────────┐                    │   │   │
│   │  │  │  package: supabase                  │                    │   │   │
│   │  │  │  ┌──────────────┐  ┌─────────────┐  │                    │   │   │
│   │  │  │  │  client.ts   │  │   auth.ts   │  │                    │   │   │
│   │  │  │  └──────────────┘  └─────────────┘  │                    │   │   │
│   │  │  └─────────────────────────────────────┘                    │   │   │
│   │  │  ┌──────────────────┐  ┌──────────────────────────────────┐  │   │   │
│   │  │  │ supabaseScans.ts │  │  supabaseDailyTips.ts            │  │   │   │
│   │  │  └──────────────────┘  └──────────────────────────────────┘  │   │   │
│   │  │  ┌──────────────────┐  ┌──────────────────────────────────┐  │   │   │
│   │  │  │  localScans.ts   │  │  dailyTipsNotifications.ts       │  │   │   │
│   │  │  └──────────────────┘  └──────────────────────────────────┘  │   │   │
│   │  │  ┌──────────────────┐  ┌──────────────────────────────────┐  │   │   │
│   │  │  │   getEnv.ts      │  │         utils.ts                 │  │   │   │
│   │  │  └──────────────────┘  └──────────────────────────────────┘  │   │   │
│   │  └─────────────────────────────────────────────────────────────┘   │   │
│   │              │ imports                                              │   │
│   │  ┌─────────────────────────────────────────────────────────────┐   │   │
│   │  │  package: types                                              │   │   │
│   │  │  ┌──────────────────┐                                        │   │   │
│   │  │  │    user.ts       │  (UserProfile interface)               │   │   │
│   │  │  └──────────────────┘                                        │   │   │
│   │  └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                     │   │
│   │  ┌─────────────────────────────────────────────────────────────┐   │   │
│   │  │  Root files                                                  │   │   │
│   │  │  App.tsx   AppContext.tsx   db.ts   styles.ts   main.tsx     │   │   │
│   │  └─────────────────────────────────────────────────────────────┘   │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌───────────────────────┐  ┌────────────────────────────────────────┐   │
│   │  package: asserts     │  │  package: supabase                     │   │
│   │  (images, icons, PDF) │  │  (schema_daily_tips_and_avatar.sql)    │   │
│   └───────────────────────┘  └────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  package: external-dependencies                                      │  │
│   │  @supabase/supabase-js  │  @google/genai  │  dexie  │  expo-sqlite  │  │
│   │  expo-image-picker      │  expo-print     │  jspdf  │  react-native │  │
│   │  OpenRouter (HTTP)      │  Python Backend (HTTP)                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```


---

## 8. APPLICATION FLOW (Navigation & Screen Transitions)

```
                ┌─────────────────────────────┐
                │         App Launch           │
                └──────────────┬──────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Booting (isBooting) │ ← getSession() from Supabase
                    └──────────┬──────────┘
                       ┌───────┴───────┐
                   no  │               │ yes
                session│               │session
                       ▼               ▼
               ┌──────────────┐  ┌────────────────┐
               │  AuthScreen  │  │ role === admin? │
               └──────┬───────┘  └───────┬────────┘
               ┌──────┴────┐        no   │   yes
               │ Sign Up   │ Sign In     ▼    ▼
               └─────┬─────┘  ┌──────────────────────┐
                     │        │ Dashboard  │AdminScreen│
                     │        └──────┬─────┴───────────┘
                     │               │
                     └───────────────┘
                                     │
            ┌────────────────────────┼────────────────────────────┐
            │                        │                            │
       (patient)                 (admin)                          │
            │                        │                            │
            ▼                        ▼                            │
     ┌────────────┐         ┌─────────────────┐                  │
     │  Dashboard │         │  AdminScreen    │                  │
     │            │         │  • KPI stats    │                  │
     │ • HealthIdx│         │  • Patient list │                  │
     │ • Last scan│         │  • Edit tips    │                  │
     │ • Tips     │         └────────┬────────┘                  │
     └─────┬──────┘                  │                           │
           │                   ┌─────┴──────┐                    │
    ┌──────┼────────────┐      │  Settings  │                    │
    │      │            │      └────────────┘                    │
    ▼      ▼            ▼                                         │
 ┌──────┐ ┌───────┐ ┌─────────┐                                  │
 │ Scan │ │History│ │Settings │◄─────────────────────────────────┘
 │Screen│ │Screen │ │(Profile)│
 └──┬───┘ └───┬───┘ └─────────┘
    │         │
    │         ▼
    │  ┌─────────────────────┐
    │  │  Scan Card Actions  │
    │  │  • Download PDF     │
    │  │  • Edit scan        │
    │  │  • Delete scan      │
    │  └─────────────────────┘
    │
    ▼
┌───────────────────────────┐
│  AI Analysis (Gemini/ML)  │
└──────────────┬────────────┘
               ▼
┌──────────────────────────────┐
│  PostScanQuestionnaire Modal │
└──────────────┬───────────────┘
               │ complete / skip
               ▼
        ┌──────────────┐
        │HistoryScreen │
        └──────────────┘

── Floating on all Patient screens ──

  ┌──────────────────┐    ┌──────────────────────────┐
  │ DermaBotWidget   │    │ Bell (Tips Notification)  │
  │ (FAB chatbot)    │    │ (header, polls every 60s) │
  └──────────────────┘    └──────────────────────────┘
```


---

## 9. DATABASE SCHEMA (Supabase PostgreSQL)

```
Table: public.profiles
────────────────────────────────────────────────────────────────
  id          UUID  PK  (matches auth.users.id)
  first_name  TEXT
  last_name   TEXT
  sex         TEXT  ('male' | 'female' | 'other')
  location    TEXT
  contact     TEXT
  role        TEXT  ('patient' | 'admin')   default: 'patient'
  avatar_url  TEXT  (URL to Supabase Storage avatars bucket)

Table: public.scans
────────────────────────────────────────────────────────────────
  id               UUID / SERIAL  PK
  user_id          UUID  FK → profiles.id
  image_url        TEXT  (Supabase Storage public URL)
  infection_type   TEXT  (condition name, e.g. "Dermatitis")
  severity_level   TEXT  ('low' | 'medium' | 'high')
  confidence_score FLOAT
  recommendations  TEXT  (clinical summary)
  scanned_at       TIMESTAMPTZ  default: now()

Table: public.daily_tips_broadcast
────────────────────────────────────────────────────────────────
  id          INTEGER  PK  (always row id=1, singleton row)
  tip1_title  TEXT
  tip1_body   TEXT
  tip2_title  TEXT
  tip2_body   TEXT
  updated_at  TIMESTAMPTZ

Storage Buckets:
  skin-scans  — stores scan images per user: {userId}/{timestamp}.jpg
  avatars     — stores profile avatars: {userId}/avatar.jpg

Local Storage (Web — IndexedDB via Dexie):
  DermaDB.scans   — mirrors ScanRecord, reactive via useLiveQuery
  DermaDB.users   — mirrors UserProfile

Local Storage (Native — SQLite via expo-sqlite):
  DermaDB.db / scans table  — same columns as ScanRecord
  DermaDB.db / users table  — stores raw_data JSON
```

---

## 10. KEY DESIGN PATTERNS

| Pattern | Where Used |
|---------|-----------|
| **Context / Provider** | AppContext — global state (user, screen, network) |
| **Repository** | db.ts — unified interface for IndexedDB (web) and SQLite (native) |
| **Strategy** | ScanScreen vs SkinScanner — different AI scan strategy per platform |
| **Facade** | supabaseScans.ts, supabaseAuth.ts — hide Supabase complexity |
| **Observer** | useLiveQuery (Dexie), onAuthStateChange (Supabase) |
| **Singleton** | Supabase client (supabase/client.ts), DermaDB instance |
| **Factory** | buildAppUser() — creates UserProfile from raw Supabase data |
| **Fallback Chain** | Gemini → local mock (web); Python ML → mock simulation (native) |
| **Polling** | useDailyTipsBell — setInterval every 60s to check for new tips |
| **Optimistic UI** | Scan saved locally first, synced to cloud in background |

---

## 11. SEQUENCE: Patient Submits a Scan (Web)

```
Patient     ScanScreen    GeminiAPI    DermaDB(IndexedDB)   SupabaseStorage   SupabaseDB
   │             │             │               │                  │               │
   │──selectFile►│             │               │                  │               │
   │──tapScan───►│             │               │                  │               │
   │             │──analyze───►│               │                  │               │
   │             │◄──result────│               │                  │               │
   │             │──saveLocal─────────────────►│                  │               │
   │             │◄──localId──────────────────-│                  │               │
   │             │──uploadImage─────────────────────────────────►│               │
   │             │◄──imageUrl──────────────────────────────────── │               │
   │             │──insertRow──────────────────────────────────────────────────►│
   │             │◄──success──────────────────────────────────────────────────── │
   │             │──updateSynced───────────────►│                │               │
   │             │──navigate(history)           │                │               │
   │◄─HistoryScreen shown                       │                │               │
   │             │──[modal] PostScanQuestionnaire shown          │               │
```

---

## 12. SEQUENCE: Admin Publishes Daily Tips

```
Admin       AdminScreen    SupabaseDB         Patient     useDailyTipsBell
  │              │              │                │               │
  │──fillTips───►│              │                │               │
  │──tapPublish─►│              │                │               │
  │              │──upsert(id=1)►│              │               │
  │              │◄──success────│                │               │
  │              │              │                │◄──poll(60s)───│
  │              │              │                │──fetch tips──►│
  │              │              │◄───────────────│               │
  │              │              │────tips data──►│               │
  │              │              │                │─bell unread──►│
  │              │              │                │ (bellDot shown)│
  │              │              │                │──tapBell──────►│
  │              │              │                │ TipsModal shown│
```

