# Campus Master

> **Upload once, teach every batch.**  
> A lightweight, course-centric academic platform designed specifically for faculty and students.

---

## 📖 Overview

Campus Master eliminates the repetitive cycle of re-uploading and re-sharing lecture notes, slides, assignments, and sample papers semester after semester. 

### Core Product Principle
> **"Resources belong to the Course, not the Batch. Enrolment, deadlines, submissions, and attendance belong to a Batch inside the Course."**

- **Permanent Resource Space:** When a new batch joins an existing course, students immediately gain access to all previously uploaded course notes, slides, and references.
- **Batch-Scoped Coursework:** Deadlines, assignments, submissions, marks, and private feedback are scoped to specific batches.
- **Self-Service:** Faculty manage their courses, batches, and student enrolment with clean 6-character join codes without requiring central administrator intervention.

---

## 🛠️ Tech Stack

- **Frontend:** React JS, React Router, Vite, Axios, Lucide React
- **Backend:** Java 17+, Spring Boot, Spring Security (JWT), Spring Data JPA, WebSocket
- **Database:** MySQL 8.x
- **Storage:** Cloud Storage abstraction for documents and attachments

---

## 📂 Project Structure

```
campus-master/
├── Backend/                 # Spring Boot REST API
│   ├── src/
│   ├── pom.xml
│   └── mvnw
├── Frontend/                # React application
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 Getting Started

### Backend Setup
1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Configure MySQL connection parameters in `src/main/resources/application.properties`.
3. Run the Spring Boot application:
   ```bash
   ./mvnw spring-boot:run
   ```

### Frontend Setup
1. Navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

## 📄 License
This project is developed as part of the MCA Curriculum at Graphic Era (Deemed to be University).
