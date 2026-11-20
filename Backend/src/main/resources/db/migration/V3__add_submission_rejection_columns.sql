-- V3__add_submission_rejection_columns.sql
-- Add status and rejection fields to submissions table for instructor rejection workflow

ALTER TABLE submissions
    ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
    ADD COLUMN rejection_reason TEXT NULL,
    ADD COLUMN rejected_at DATETIME NULL;
