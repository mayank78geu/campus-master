-- V4__add_student_profile_and_attendance.sql
-- Add student profile completion fields and QR-based attendance system

-- 1. Extend users table for student profile completion
ALTER TABLE users ADD COLUMN student_id VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN course VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN section VARCHAR(50) NULL;
ALTER TABLE users ADD COLUMN class_roll_no VARCHAR(50) NULL;
ALTER TABLE users ADD COLUMN phone_number VARCHAR(30) NULL;
ALTER TABLE users ADD COLUMN is_profile_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing faculty do not require student profile completion
UPDATE users SET is_profile_completed = TRUE WHERE role = 'FACULTY';

CREATE UNIQUE INDEX idx_users_student_id ON users (student_id);
CREATE INDEX idx_users_course_sec_roll ON users (course, section, class_roll_no);

-- 2. Create attendance_sessions table
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    course_id BIGINT NOT NULL,
    created_by_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    session_code VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    current_qr_token VARCHAR(255) NOT NULL,
    token_generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INT NOT NULL DEFAULT 10,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME NULL,
    CONSTRAINT fk_att_sess_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_att_sess_user FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_att_sess_course_status ON attendance_sessions (course_id, status);
CREATE INDEX idx_att_sess_code ON attendance_sessions (session_code);

-- 3. Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    section VARCHAR(50) NOT NULL,
    class_roll_no VARCHAR(50) NOT NULL,
    student_id_code VARCHAR(100) NOT NULL,
    marked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_att_rec_session FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_att_rec_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX idx_att_rec_student ON attendance_records (student_id);
CREATE INDEX idx_att_rec_session ON attendance_records (session_id);
