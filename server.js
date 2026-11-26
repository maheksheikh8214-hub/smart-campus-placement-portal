// ============================================================
// SMART CAMPUS - BACKEND SERVER
// Node.js + Express + MySQL
// ============================================================

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// 1. MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// 2. DATABASE CONNECTION
// ============================================================

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "smart_campus",
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;

async function connectDatabase() {

    // Connect directly to Railway MySQL database
    pool = mysql.createPool(dbConfig);

    // Check database connection
    await pool.query("SELECT 1");

    // Create users table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            email VARCHAR(190) NOT NULL UNIQUE,
            phone VARCHAR(20) NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('student', 'company', 'admin') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create student profiles table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS student_profiles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL UNIQUE,
            qualification VARCHAR(255) DEFAULT '',
            skills TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Create company profiles table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS company_profiles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company_id INT NOT NULL UNIQUE,
            description TEXT,
            website VARCHAR(255),
            FOREIGN KEY (company_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Create jobs table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS jobs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company_id INT NOT NULL,
            title VARCHAR(180) NOT NULL,
            job_type VARCHAR(80) NOT NULL,
            salary VARCHAR(120) NOT NULL,
            skills TEXT NOT NULL,
            description TEXT NOT NULL,
            status ENUM('Active', 'Inactive') DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Create applications table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS applications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            job_id INT NOT NULL,
            status ENUM('Pending', 'Shortlisted', 'Selected', 'Rejected') DEFAULT 'Pending',
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_student_job (student_id, job_id),
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        )
    `);

    // Create resumes table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS resumes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL UNIQUE,
            file_name VARCHAR(255) NOT NULL,
            mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
            file_data LONGTEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Create admin account if it does not exist
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {

        const [existing] = await pool.execute(
            "SELECT id FROM users WHERE email = ?",
            [adminEmail.trim().toLowerCase()]
        );

        if (existing.length === 0) {

            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            await pool.execute(
                `INSERT INTO users (name, email, phone, password, role)
                 VALUES (?, ?, ?, ?, 'admin')`,
                [
                    "Smart Campus Admin",
                    adminEmail.trim().toLowerCase(),
                    "0000000000",
                    hashedPassword
                ]
            );

            console.log("Admin account created successfully.");
        }
    }

    console.log("MySQL Database Connected Successfully!");
}

// ============================================================
// 3. COMMON FUNCTIONS
// ============================================================

function asyncHandler(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

function publicUser(row) {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        role: row.role
    };
}

function isValidRole(role) {
    return ["student", "company", "admin"].includes(role);
}

// ============================================================
// 4. HOME AND SERVER CHECK
// ============================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Smart Campus Backend is Running!"
    });
});

app.get("/health", asyncHandler(async (req, res) => {
    await pool.query("SELECT 1");

    res.json({
        success: true,
        database: "connected"
    });
}));

// ============================================================
// 5. STUDENT AND COMPANY REGISTRATION
// ============================================================

app.post("/register", asyncHandler(async (req, res) => {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !phone || !password || !role) {
        return res.status(400).json({
            message: "Please fill all required fields."
        });
    }

    if (!["student", "company"].includes(role)) {
        return res.status(400).json({
            message: "Invalid registration role."
        });
    }

    if (!/^[0-9]{10}$/.test(String(phone))) {
        return res.status(400).json({
            message: "Please enter a valid 10-digit mobile number."
        });
    }

    if (String(password).length < 6) {
        return res.status(400).json({
            message: "Password must contain at least 6 characters."
        });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const [existing] = await pool.execute(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [normalizedEmail]
    );

    if (existing.length > 0) {
        return res.status(409).json({
            message: "This email is already registered."
        });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const [result] = await pool.execute(
        `INSERT INTO users (name, email, phone, password, role)
         VALUES (?, ?, ?, ?, ?)`,
        [
            String(name).trim(),
            normalizedEmail,
            String(phone),
            hashedPassword,
            role
        ]
    );

    if (role === "student") {
        await pool.execute(
            `INSERT INTO student_profiles (student_id, qualification, skills)
             VALUES (?, '', '')`,
            [result.insertId]
        );
    } else {
        await pool.execute(
            `INSERT INTO company_profiles (company_id, description, website)
             VALUES (?, '', '')`,
            [result.insertId]
        );
    }

    res.status(201).json({
        success: true,
        message: "Registration successful.",
        user: {
            id: result.insertId,
            name: String(name).trim(),
            email: normalizedEmail,
            phone: String(phone),
            role
        }
    });
}));

// ============================================================
// 6. LOGIN
// ============================================================

app.post("/login", asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role || !isValidRole(role)) {
        return res.status(400).json({
            message: "Email, password and valid role are required."
        });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const [rows] = await pool.execute(
        "SELECT * FROM users WHERE email = ? AND role = ? LIMIT 1",
        [normalizedEmail, role]
    );

    if (rows.length === 0) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }

    const user = rows[0];

    const passwordMatch = await bcrypt.compare(
        String(password),
        user.password
    );

    if (!passwordMatch) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }

    res.json({
        success: true,
        message: "Login successful.",
        user: publicUser(user)
    });
}));

// ============================================================
// 7. JOB MANAGEMENT
// ============================================================

// Get all active jobs
app.get("/jobs", asyncHandler(async (req, res) => {
    const [jobs] = await pool.query(`
        SELECT j.*, u.name AS company_name
        FROM jobs j
        JOIN users u ON u.id = j.company_id
        WHERE j.status = 'Active'
        ORDER BY j.created_at DESC
    `);

    res.json({
        success: true,
        jobs
    });
}));

// Company posts a new job
app.post("/jobs", asyncHandler(async (req, res) => {
    const {
        company_id,
        title,
        job_type,
        salary,
        skills,
        description
    } = req.body;

    if (!company_id || !title || !job_type || !salary || !skills || !description) {
        return res.status(400).json({
            message: "Please fill all job details."
        });
    }

    const [companies] = await pool.execute(
        "SELECT id FROM users WHERE id = ? AND role = 'company'",
        [company_id]
    );

    if (companies.length === 0) {
        return res.status(403).json({
            message: "Valid company account not found."
        });
    }

    const [result] = await pool.execute(
        `INSERT INTO jobs
        (company_id, title, job_type, salary, skills, description)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            company_id,
            title.trim(),
            job_type,
            salary.trim(),
            skills.trim(),
            description.trim()
        ]
    );

    res.status(201).json({
        success: true,
        message: "Job posted successfully.",
        jobId: result.insertId
    });
}));

// Get jobs posted by a particular company
app.get("/company/:id/jobs", asyncHandler(async (req, res) => {
    const companyId = Number(req.params.id);

    if (!Number.isInteger(companyId) || companyId <= 0) {
        return res.status(400).json({
            message: "Invalid company ID."
        });
    }

    const [jobs] = await pool.execute(`
        SELECT j.*, u.name AS company_name
        FROM jobs j
        JOIN users u ON u.id = j.company_id
        WHERE j.company_id = ?
        ORDER BY j.created_at DESC
    `, [companyId]);

    res.json({
        success: true,
        jobs
    });
}));

// ============================================================
// 8. STUDENT JOB APPLICATIONS
// ============================================================

// Student applies for a job
app.post("/applications", asyncHandler(async (req, res) => {
    const { student_id, job_id } = req.body;

    if (!student_id || !job_id) {
        return res.status(400).json({
            message: "Student and job are required."
        });
    }

    const [students] = await pool.execute(
        "SELECT id FROM users WHERE id = ? AND role = 'student'",
        [student_id]
    );

    if (students.length === 0) {
        return res.status(403).json({
            message: "Valid student account not found."
        });
    }

    const [jobs] = await pool.execute(
        "SELECT id FROM jobs WHERE id = ? AND status = 'Active'",
        [job_id]
    );

    if (jobs.length === 0) {
        return res.status(404).json({
            message: "This job is no longer available."
        });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO applications (student_id, job_id)
             VALUES (?, ?)`,
            [student_id, job_id]
        );

        res.status(201).json({
            success: true,
            message: "Application submitted successfully.",
            applicationId: result.insertId
        });

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "You have already applied for this job."
            });
        }

        throw error;
    }
}));

// Get applications submitted by a student
app.get("/student/:id/applications", asyncHandler(async (req, res) => {
    const studentId = Number(req.params.id);

    const [applications] = await pool.execute(`
        SELECT
            a.id,
            a.student_id,
            a.job_id,
            a.status,
            a.applied_at,
            DATE_FORMAT(a.applied_at, '%d-%m-%Y') AS date,
            j.title AS title,
            j.title AS job_title,
            j.title AS jobTitle,
            u.name AS company_name,
            u.name AS companyName
        FROM applications a
        JOIN jobs j ON j.id = a.job_id
        JOIN users u ON u.id = j.company_id
        WHERE a.student_id = ?
        ORDER BY a.applied_at DESC
    `, [studentId]);

    res.json({
        success: true,
        applications
    });
}));

// ============================================================
// 9. STUDENT PROFILE
// ============================================================

// Get student profile
app.get("/student/:id/profile", asyncHandler(async (req, res) => {
    const studentId = Number(req.params.id);

    const [rows] = await pool.execute(`
        SELECT
            u.id,
            u.name,
            u.email,
            u.phone,
            p.qualification,
            p.skills
        FROM users u
        LEFT JOIN student_profiles p ON p.student_id = u.id
        WHERE u.id = ? AND u.role = 'student'
    `, [studentId]);

    if (rows.length === 0) {
        return res.status(404).json({
            message: "Student profile not found."
        });
    }

    res.json({
        success: true,
        profile: rows[0]
    });
}));

// Update student profile
app.put("/student/:id/profile", asyncHandler(async (req, res) => {
    const studentId = Number(req.params.id);
    const { qualification, skills } = req.body;

    const [students] = await pool.execute(
        "SELECT id FROM users WHERE id = ? AND role = 'student'",
        [studentId]
    );

    if (students.length === 0) {
        return res.status(404).json({
            message: "Student not found."
        });
    }

    await pool.execute(`
        INSERT INTO student_profiles (student_id, qualification, skills)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
        qualification = VALUES(qualification),
        skills = VALUES(skills)
    `, [
        studentId,
        qualification || "",
        skills || ""
    ]);

    res.json({
        success: true,
        message: "Student profile updated successfully."
    });
}));

// ============================================================
// 10. STUDENT RESUME
// ============================================================

// Get student's own resume
app.get("/student/:id/resume", asyncHandler(async (req, res) => {
    const studentId = Number(req.params.id);

    const [rows] = await pool.execute(`
        SELECT file_name, mime_type, file_data
        FROM resumes
        WHERE student_id = ?
    `, [studentId]);

    if (rows.length === 0) {
        return res.status(404).json({
            message: "Resume not uploaded yet."
        });
    }

    res.json({
        success: true,
        fileName: rows[0].file_name,
        mimeType: rows[0].mime_type,
        fileData: rows[0].file_data
    });
}));

// Upload or replace student resume
app.post("/student/:id/resume", asyncHandler(async (req, res) => {
    const studentId = Number(req.params.id);
    const { file_name, mime_type, file_data } = req.body;

    if (!file_name || !file_data) {
        return res.status(400).json({
            message: "Please select a resume file."
        });
    }

    if (Buffer.byteLength(String(file_data), "utf8") > 5 * 1024 * 1024) {
        return res.status(413).json({
            message: "Resume file is too large."
        });
    }

    const [students] = await pool.execute(
        "SELECT id FROM users WHERE id = ? AND role = 'student'",
        [studentId]
    );

    if (students.length === 0) {
        return res.status(404).json({
            message: "Student not found."
        });
    }

    await pool.execute(`
        INSERT INTO resumes
        (student_id, file_name, mime_type, file_data)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        file_name = VALUES(file_name),
        mime_type = VALUES(mime_type),
        file_data = VALUES(file_data)
    `, [
        studentId,
        file_name,
        mime_type || "application/pdf",
        file_data
    ]);

    res.json({
        success: true,
        message: "Resume uploaded successfully."
    });
}));

// ============================================================
// 11. COMPANY VIEW AND DOWNLOAD STUDENT RESUME
// ============================================================

app.get(
    "/company/:companyId/student/:studentId/resume",
    asyncHandler(async (req, res) => {
        const companyId = Number(req.params.companyId);
        const studentId = Number(req.params.studentId);

        const [applications] = await pool.execute(`
            SELECT a.id
            FROM applications a
            JOIN jobs j ON j.id = a.job_id
            WHERE j.company_id = ?
              AND a.student_id = ?
            LIMIT 1
        `, [companyId, studentId]);

        if (applications.length === 0) {
            return res.status(403).json({
                message: "You cannot access this student's resume."
            });
        }

        const [rows] = await pool.execute(`
            SELECT file_name, mime_type, file_data
            FROM resumes
            WHERE student_id = ?
        `, [studentId]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Student has not uploaded a resume."
            });
        }

        res.json({
            success: true,
            fileName: rows[0].file_name,
            mimeType: rows[0].mime_type,
            fileData: rows[0].file_data
        });
    })
);

// ============================================================
// 12. COMPANY VIEW APPLICATIONS
// ============================================================

app.get("/company/:id/applications", asyncHandler(async (req, res) => {
    const companyId = Number(req.params.id);

    const [applications] = await pool.execute(`
        SELECT
            a.id,
            a.student_id,
            a.job_id,
            a.status,
            a.applied_at,
            DATE_FORMAT(a.applied_at, '%d-%m-%Y') AS date,
            s.name AS student_name,
            s.name AS studentName,
            s.email AS student_email,
            s.email AS studentEmail,
            j.title AS job_title,
            j.title AS jobTitle
        FROM applications a
        JOIN users s ON s.id = a.student_id
        JOIN jobs j ON j.id = a.job_id
        WHERE j.company_id = ?
        ORDER BY a.applied_at DESC
    `, [companyId]);

    res.json({
        success: true,
        applications
    });
}));

// ============================================================
// 13. UPDATE APPLICATION STATUS
// ============================================================

app.patch("/applications/:id/status", asyncHandler(async (req, res) => {
    const applicationId = Number(req.params.id);
    const { status } = req.body;

    const allowedStatuses = [
        "Pending",
        "Shortlisted",
        "Selected",
        "Rejected"
    ];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            message: "Invalid application status."
        });
    }

    const [result] = await pool.execute(
        "UPDATE applications SET status = ? WHERE id = ?",
        [status, applicationId]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({
            message: "Application not found."
        });
    }

    res.json({
        success: true,
        message: "Application status updated successfully."
    });
}));

// ============================================================
// 14. ADMIN DASHBOARD STATISTICS
// ============================================================

app.get("/admin/dashboard", asyncHandler(async (req, res) => {
    const [[students]] = await pool.query(
        "SELECT COUNT(*) AS total FROM users WHERE role = 'student'"
    );

    const [[companies]] = await pool.query(
        "SELECT COUNT(*) AS total FROM users WHERE role = 'company'"
    );

    const [[jobs]] = await pool.query(
        "SELECT COUNT(*) AS total FROM jobs"
    );

    const [[applications]] = await pool.query(
        "SELECT COUNT(*) AS total FROM applications"
    );

    const [[selected]] = await pool.query(
        "SELECT COUNT(*) AS total FROM applications WHERE status = 'Selected'"
    );

    const totalStudents = Number(students.total);
    const selectedStudents = Number(selected.total);

    const placementRate = totalStudents > 0
        ? ((selectedStudents / totalStudents) * 100).toFixed(1) + "%"
        : "0%";

    res.json({
        success: true,
        totalStudents,
        totalCompanies: Number(companies.total),
        totalJobs: Number(jobs.total),
        totalApplications: Number(applications.total),
        selectedStudents,
        placedStudents: selectedStudents,
        placementRate
    });
}));

// ============================================================
// 15. ADMIN - STUDENT RECORDS
// ============================================================

app.get("/admin/students", asyncHandler(async (req, res) => {
    const [students] = await pool.query(`
        SELECT
            u.id,
            u.name,
            u.email,
            u.phone,
            COALESCE(p.qualification, 'Not Updated') AS qualification,
            COALESCE(p.skills, '') AS skills,
            u.created_at
        FROM users u
        LEFT JOIN student_profiles p ON p.student_id = u.id
        WHERE u.role = 'student'
        ORDER BY u.created_at DESC
    `);

    res.json({
        success: true,
        students
    });
}));

// ============================================================
// 16. ADMIN - COMPANY RECORDS
// ============================================================

app.get("/admin/companies", asyncHandler(async (req, res) => {
    const [companies] = await pool.query(`
        SELECT
            u.id,
            u.name,
            u.email,
            u.phone,
            COALESCE(cp.description, 'Not Updated') AS description,
            cp.website,
            u.created_at
        FROM users u
        LEFT JOIN company_profiles cp ON cp.company_id = u.id
        WHERE u.role = 'company'
        ORDER BY u.created_at DESC
    `);

    res.json({
        success: true,
        companies
    });
}));

// ============================================================
// 17. ADMIN - ALL JOB OPPORTUNITIES
// ============================================================

app.get("/admin/jobs", asyncHandler(async (req, res) => {
    const [jobs] = await pool.query(`
        SELECT
            j.id,
            j.title,
            j.job_type,
            j.salary,
            j.skills,
            j.description,
            j.status,
            j.created_at,
            u.name AS company_name
        FROM jobs j
        JOIN users u ON u.id = j.company_id
        ORDER BY j.created_at DESC
    `);

    res.json({
        success: true,
        jobs
    });
}));

// ============================================================
// 18. ADMIN - ALL APPLICATIONS
// ============================================================

app.get("/admin/applications", asyncHandler(async (req, res) => {
    const [applications] = await pool.query(`
        SELECT
            a.id,
            a.student_id,
            a.job_id,
            a.status,
            a.applied_at,
            s.name AS student_name,
            j.title AS job_title,
            c.name AS company_name
        FROM applications a
        JOIN users s ON s.id = a.student_id
        JOIN jobs j ON j.id = a.job_id
        JOIN users c ON c.id = j.company_id
        ORDER BY a.applied_at DESC
    `);

    res.json({
        success: true,
        applications
    });
}));

// ============================================================
// 19. 404 ROUTE
// ============================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found."
    });
});

// ============================================================
// 20. GLOBAL ERROR HANDLER
// ============================================================

app.use((error, req, res, next) => {
    console.error("SERVER ERROR:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        success: false,
        message: "Internal server error.",
        error: process.env.NODE_ENV === "development"
            ? error.message
            : undefined
    });
});

// ============================================================
// 21. START SERVER
// ============================================================

async function startServer() {
    try {
        await connectDatabase();

        app.listen(PORT, () => {
            console.log("------------------------------------");
            console.log("SMART CAMPUS SERVER STARTED");
            console.log(`Server is running on port ${PORT}`);
            console.log("------------------------------------");
        });

    } catch (error) {
        console.error("Unable to start server:", error.message);
        process.exit(1);
    }
}

startServer();
