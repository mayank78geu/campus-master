# Campus Master

> **Upload once, teach every batch.**  
> A lightweight, course-centric academic platform designed specifically for faculty and students.

---

## 📖 Overview

Campus Master eliminates the repetitive cycle of re-uploading and re-sharing lecture notes, slides, assignments, and sample papers semester after semester.

### Core Product Principle
> **"Resources belong to the Course, not the Batch. Enrolment, deadlines, submissions, and grading belong to a Batch inside the Course."**

- **Permanent Resource Space:** When a new batch joins an existing course, students immediately gain access to all published course notes, slides, and references.
- **Batch-Scoped Coursework:** Deadlines, assignments, submissions, marks, and private feedback are strictly scoped to specific batches.
- **Self-Service:** Faculty manage their courses, batches, and student enrolment with clean join codes (with auto-approve or faculty approval) without requiring central administrator intervention.
- **Audit Receipts & Integrity:** Submissions produce cryptographically secure, random 128-bit receipt tokens. Grade publication ensures student grades are only visible once officially published.

---

## 🛠️ Prerequisites & Tech Stack

### Prerequisites
- **Java:** OpenJDK 17 or higher
- **Node.js:** Node.js 20 LTS or higher (`npm` 10+)
- **Database:** MySQL 8.0+ (or in-memory H2 for tests)

### Tech Stack
- **Frontend:** React 19, React Router 7, Vite 8, Vitest, React Testing Library, Axios, Lucide React
- **Backend:** Java 17, Spring Boot 4, Spring Security 6 (JWT Authentication + HMAC-SHA256 Signed URLs), Spring Data JPA, Flyway Database Migration
- **Database:** MySQL 8.x (production/local), H2 (test profile)
- **Storage:** Pluggable storage abstraction supporting local containment-checked file storage or Cloudinary CDN

---

## 📂 Project Structure

```
campus-master/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI workflow (Backend verify + Frontend test/build/lint)
├── Backend/                   # Spring Boot 4 REST API
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/          # Application controllers, services, security, entities
│   │   │   └── resources/
│   │   │       ├── db/migration/ # Flyway baseline schema (V1__baseline_schema.sql)
│   │   │       ├── application.properties
│   │   │       ├── application-local.properties
│   │   │       └── application-prod.properties
│   │   └── test/              # Integration and unit tests (H2 test profile)
│   ├── pom.xml
│   ├── mvnw / mvnw.cmd
│   └── .env.example
├── Frontend/                  # React 19 SPA
│   ├── src/
│   │   ├── components/        # React components (Navbar, Modals, Desks)
│   │   ├── context/           # AuthContext provider
│   │   ├── pages/             # Landing, Student & Faculty Dashboards, CourseSpace
│   │   └── services/          # API client with interceptors, file download helpers
│   ├── package.json
│   ├── vite.config.js
│   ├── vitest.config.js
│   └── .env.example
├── .env.example               # Root configuration template
└── README.md
```

---

## ⚙️ Environment Variables

Campus Master enforces externalization of all secrets and sensitive infrastructure settings. Configure these via system environment variables or a `.env` file (see `Backend/.env.example` and `Frontend/.env.example`):

| Variable | Description | Required | Default |
|---|---|---|---|
| `APP_JWT_SECRET` | 256-bit (>= 32 bytes) HMAC-SHA256 signing key | **Yes** (fails fast if omitted) | *None* |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile (`local`, `prod`, `test`) | No | `local` |
| `SPRING_DATASOURCE_URL` | JDBC URL for MySQL 8 | Local: optional / Prod: **Yes** | `jdbc:mysql://localhost:3306/campusmaster...` |
| `SPRING_DATASOURCE_USERNAME` | MySQL username | No | `root` |
| `SPRING_DATASOURCE_PASSWORD` | MySQL password | **Yes** | *None* |
| `APP_CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins | No | `http://localhost:5173,http://localhost:3000` |
| `CAMPUSMASTER_STORAGE_PROVIDER` | Active storage provider: `local` or `cloudinary` | No | `local` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | If provider=cloudinary | *None* |
| `CLOUDINARY_API_KEY` | Cloudinary API key | If provider=cloudinary | *None* |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | If provider=cloudinary | *None* |
| `VITE_API_URL` | Frontend API base URL | No | `http://localhost:8081/api/v1` |

> [!WARNING]
> **JWT Secret Security:** Generate a fresh 256-bit cryptographically random secret with `openssl rand -base64 32`. Never commit credentials to version control.

---

## 🚀 Getting Started

### 1. Database Setup
Create a MySQL 8 database for local development:
```sql
CREATE DATABASE IF NOT EXISTS campusmaster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Flyway will automatically execute `V1__baseline_schema.sql` on startup to initialize all tables, foreign keys, and indexes.

### 2. Backend Setup
1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Set the required environment variables:
   ```bash
   # Linux / macOS
   export APP_JWT_SECRET="$(openssl rand -base64 32)"
   export SPRING_DATASOURCE_PASSWORD="your_mysql_password"

   # Windows (PowerShell)
   $env:APP_JWT_SECRET = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
   $env:SPRING_DATASOURCE_PASSWORD = "your_mysql_password"
   ```
3. Run the application:
   ```bash
   ./mvnw spring-boot:run
   ```
   The backend API starts on `http://localhost:8081`.

### 3. Frontend Setup
1. Navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm ci
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🧪 Testing

### Backend Tests
The backend test suite uses Spring Boot test slicing with an in-memory H2 database (in MySQL mode) and does not require local MySQL to be running:
```bash
cd Backend
./mvnw clean verify
```
This runs the full suite of unit and integration tests:
- **Authorization Matrix:** Tests 6 caller roles across all protected endpoints.
- **Service Policy Tests:** Tests late submission policies, enrollment join & rejection workflows, grade boundaries, regrading constraints, and receipt token masking.
- **Security Tests:** Path traversal containment checks, HMAC signed URL verification, and CSV formula injection neutralization.

### Frontend Tests
Frontend unit and component tests run using Vitest and React Testing Library:
```bash
cd Frontend
npm run test
```
To run the linter and production build:
```bash
npm run lint
npm run build
```

---

## 🔒 Security Architecture Highlights

- **Signed File URLs:** Local and Cloudinary file downloads require HMAC-SHA256 signatures with 5-minute expiry timestamps (`exp`, `sig`).
- **Authorization Guards:** Centralized `CourseAccessService` guarantees multi-tenant course and batch isolation across faculty and students.
- **File Upload Protection:** Strict MIME and file extension allow-lists (`pdf`, `docx`, `pptx`, `xlsx`, `txt`, `md`, `zip`, `png`, `jpg`, `jpeg`, `gif`, `webp`), 25MB file size limits, and sanitization of stored filenames.
- **CSV Injection Defense:** Grade and roster CSV exports neutralize spreadsheet formula injection (`=`, `+`, `-`, `@`, `\t`, `\r`) by prepending a single quote.
- **Enrolment State Machine:** Supports `ACTIVE`, `PENDING`, `REJECTED`, and `DROPPED` statuses. Rejected students cannot self-rejoin with a join code.

---

## 📄 License
This project is developed as part of the MCA Curriculum at Graphic Era (Deemed to be University).
