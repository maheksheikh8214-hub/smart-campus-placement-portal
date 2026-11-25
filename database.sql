-- =========================================
-- SMART CAMPUS - DATABASE
-- =========================================

CREATE DATABASE IF NOT EXISTS smart_campus;

USE smart_campus;


-- =========================================
-- 1. USERS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS users (

    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(150) NOT NULL UNIQUE,

    phone VARCHAR(15) NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    role ENUM('student', 'company', 'admin') NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB;


-- =========================================
-- 2. JOBS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS jobs (

    id INT AUTO_INCREMENT PRIMARY KEY,

    company_id INT NOT NULL,

    title VARCHAR(150) NOT NULL,

    job_type VARCHAR(50) NOT NULL,

    salary VARCHAR(100) NOT NULL,

    skills TEXT NOT NULL,

    description TEXT NOT NULL,

    status ENUM('Active', 'Inactive')
        NOT NULL DEFAULT 'Active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_jobs_company (company_id),

    INDEX idx_jobs_status (status),

    CONSTRAINT fk_jobs_company

        FOREIGN KEY (company_id)

        REFERENCES users(id)

        ON UPDATE CASCADE

        ON DELETE CASCADE

) ENGINE=InnoDB;


-- =========================================
-- 3. APPLICATIONS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS applications (

    id INT AUTO_INCREMENT PRIMARY KEY,

    student_id INT NOT NULL,

    job_id INT NOT NULL,

    status ENUM(
        'Pending',
        'Shortlisted',
        'Selected',
        'Rejected'
    ) NOT NULL DEFAULT 'Pending',

    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_student_job (
        student_id,
        job_id
    ),

    INDEX idx_applications_job (job_id),

    CONSTRAINT fk_applications_student

        FOREIGN KEY (student_id)

        REFERENCES users(id)

        ON UPDATE CASCADE

        ON DELETE CASCADE,

    CONSTRAINT fk_applications_job

        FOREIGN KEY (job_id)

        REFERENCES jobs(id)

        ON UPDATE CASCADE

        ON DELETE CASCADE

) ENGINE=InnoDB;


-- =========================================
-- 4. STUDENT PROFILES TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS student_profiles (

    student_id INT PRIMARY KEY,

    qualification VARCHAR(100) DEFAULT '',

    skills TEXT,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_profile_student

        FOREIGN KEY (student_id)

        REFERENCES users(id)

        ON UPDATE CASCADE

        ON DELETE CASCADE

) ENGINE=InnoDB;


-- =========================================
-- 5. STUDENT RESUMES TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS student_resumes (

    student_id INT PRIMARY KEY,

    file_name VARCHAR(255) NOT NULL,

    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',

    file_size INT NOT NULL,

    file_data LONGBLOB NOT NULL,

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_resume_student

        FOREIGN KEY (student_id)

        REFERENCES users(id)

        ON UPDATE CASCADE

        ON DELETE CASCADE

) ENGINE=InnoDB;


-- =========================================
-- DATABASE SETUP COMPLETE
-- =========================================

SELECT 'Smart Campus Database Ready!' AS Message;

SHOW TABLES;