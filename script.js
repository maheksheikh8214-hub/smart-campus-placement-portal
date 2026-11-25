// ==================================================
// SMART CAMPUS - MAIN JAVASCRIPT
// Registration, Login, Student, Company, Admin
// ==================================================

const API_URL = window.SMART_CAMPUS_API_URL || "http://127.0.0.1:5000";

// ==================================================
// 1. COMMON FUNCTIONS
// ==================================================

function getLoggedInUser() {
    try {
        return JSON.parse(localStorage.getItem("loggedInUser"));
    } catch (error) {
        return null;
    }
}

function setLoggedInUser(user) {
    localStorage.setItem("loggedInUser", JSON.stringify(user));
}

function logout() {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("rememberedUser");
    window.location.href = "index.html";
}

function getCurrentPage() {
    return window.location.pathname.split("/").pop().toLowerCase();
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value ?? "";
}

function showMessage(element, message, type = "error") {
    if (!element) {
        alert(message);
        return;
    }

    element.textContent = message;
    element.style.display = "block";
    element.style.color = type === "success" ? "green" : "red";
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function getArray(data, key) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data[key])) return data[key];
    return [];
}

async function apiRequest(endpoint, options = {}) {
    let response;

    try {
        response = await fetch(API_URL + endpoint, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });
    } catch (error) {
        console.error("Fetch error:", error);
        throw new Error(
            "Server se connection nahi ho pa raha. Backend start karo."
        );
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.message || "Something went wrong.");
    }

    return result;
}

function redirectToDashboard(role) {
    const pages = {
        student: "student-dashboard.html",
        company: "company-dashboard.html",
        admin: "admin-dashboard.html"
    };

    window.location.href = pages[role] || "index.html";
}

function checkDashboardAccess(requiredRole) {
    const user = getLoggedInUser();

    if (!user || user.role !== requiredRole) {
        alert("Please login to access this dashboard.");

        const loginPages = {
            student: "student-login.html",
            company: "company-login.html",
            admin: "admin-login.html"
        };

        window.location.href = loginPages[requiredRole] || "index.html";
        return false;
    }

    return true;
}


// ==================================================
// 2. REGISTRATION
// ==================================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async event => {

        event.preventDefault();

        const role = document.getElementById("registerRole")?.value;
        const name = document.getElementById("registerName")?.value.trim();
        const email = document.getElementById("registerEmail")?.value.trim();
        const phone = document.getElementById("registerPhone")?.value.trim();
        const password = document.getElementById("registerPassword")?.value;
        const confirmPassword =
            document.getElementById("confirmPassword")?.value;

        if (!role || !name || !email || !phone || !password) {
            alert("Please fill all required fields.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Password and Confirm Password do not match.");
            return;
        }

        if (password.length < 6) {
            alert("Password must contain at least 6 characters.");
            return;
        }

        if (!/^[0-9]{10}$/.test(phone)) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }

        const button = registerForm.querySelector("button[type='submit']");

        if (button) {
            button.disabled = true;
            button.textContent = "Creating Account...";
        }

        try {

            await apiRequest("/register", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    password,
                    role
                })
            });

            alert("Registration successful! Please login.");

            window.location.href =
                role === "company"
                    ? "company-login.html"
                    : "student-login.html";

        } catch (error) {

            alert(error.message);

        } finally {

            if (button) {
                button.disabled = false;
                button.textContent = "Register";
            }
        }
    });
}


// ==================================================
// 3. LOGIN
// ==================================================

function handleLogin(formId, role) {

    const form = document.getElementById(formId);

    if (!form) return;

    form.addEventListener("submit", async event => {

        event.preventDefault();

        const email =
            document.getElementById(role + "Email")?.value.trim();

        const password =
            document.getElementById(role + "Password")?.value;

        if (!email || !password) {
            alert("Please enter email and password.");
            return;
        }

        const button = form.querySelector("button[type='submit']");

        if (button) {
            button.disabled = true;
            button.textContent = "Please wait...";
        }

        try {

            const result = await apiRequest("/login", {
                method: "POST",
                body: JSON.stringify({
                    email,
                    password,
                    role
                })
            });

            const user = result.user || result;

            if (!user.id || user.role !== role) {
                throw new Error("Invalid login response.");
            }

            setLoggedInUser(user);

            const rememberCheckbox = document.getElementById(
                role === "student"
                    ? "rememberStudent"
                    : "rememberCompany"
            );

            if (rememberCheckbox?.checked) {
                localStorage.setItem("rememberedUser", user.email);
            } else {
                localStorage.removeItem("rememberedUser");
            }

            redirectToDashboard(role);

        } catch (error) {

            alert(error.message || "Login failed.");

        } finally {

            if (button) {
                button.disabled = false;
                button.textContent = "Login";
            }
        }
    });
}

handleLogin("studentLoginForm", "student");
handleLogin("companyLoginForm", "company");
handleLogin("adminLoginForm", "admin");


// ==================================================
// 4. HOME PAGE ROLE BUTTONS
// ==================================================

document.querySelectorAll(".role-btn").forEach(button => {

    button.addEventListener("click", () => {

        const pages = {
            student: "student-login.html",
            company: "company-login.html",
            admin: "admin-login.html"
        };

        const role = button.dataset.role;

        if (pages[role]) {
            window.location.href = pages[role];
        }
    });
});


// ==================================================
// 5. STUDENT DASHBOARD
// ==================================================

function showStudentInformation() {

    const user = getLoggedInUser();

    if (!user) return;

    setText("studentName", user.name || "Student");
    setText("studentEmail", user.email || "");
    setText("studentWelcomeName", user.name || "Student");
    setText("studentId", user.id || "");

    setText("profileName", user.name || "Student");
    setText("profileEmail", user.email || "");
}


// ---------------- LOAD AVAILABLE JOBS ----------------

async function displayStudentJobs() {

    // Correct selector according to student-dashboard.html
    const jobsContainer = document.querySelector("#jobs .jobs-grid");

    if (!jobsContainer) {
        console.error("Student jobs container not found.");
        return;
    }

    jobsContainer.innerHTML = "<p>Loading available jobs...</p>";

    try {

        const jobsResult = await apiRequest("/jobs");

        const jobs = getArray(jobsResult, "jobs");

        // Update Available Jobs counter
        setText("availableJobsCount", jobs.length);

        if (jobs.length === 0) {

            jobsContainer.innerHTML =
                "<p>No active jobs available right now.</p>";

            return;
        }

        jobsContainer.innerHTML = jobs.map(job => `

            <div class="job-card">

                <span class="job-type">
                    ${escapeHTML(job.job_type || "Job")}
                </span>

                <h3>
                    ${escapeHTML(job.title || "Job Opportunity")}
                </h3>

                <p>
                    <strong>Company:</strong>
                    ${escapeHTML(job.company_name || "Company")}
                </p>

                <p>
                    <strong>Salary:</strong>
                    ${escapeHTML(job.salary || "Not specified")}
                </p>

                <p>
                    <strong>Skills:</strong>
                    ${escapeHTML(job.skills || "Not specified")}
                </p>

                <p>
                    ${escapeHTML(job.description || "")}
                </p>

                <button
                    type="button"
                    onclick="applyForJob(${Number(job.id)})">

                    Apply Now

                </button>

            </div>

        `).join("");

    } catch (error) {

        console.error("Jobs loading error:", error);

        setText("availableJobsCount", 0);

        jobsContainer.innerHTML = `
            <p>${escapeHTML(error.message)}</p>
        `;
    }
}


// ---------------- APPLY FOR JOB ----------------

async function applyForJob(jobId) {

    const user = getLoggedInUser();

    if (!user || user.role !== "student") {
        alert("Please login as a student.");
        return;
    }

    if (!confirm("Are you sure you want to apply for this job?")) {
        return;
    }

    try {

        const result = await apiRequest("/applications", {
            method: "POST",
            body: JSON.stringify({
                student_id: user.id,
                job_id: jobId
            })
        });

        alert(result.message || "Application submitted successfully!");

        await displayStudentJobs();
        await updateStudentDashboard();

    } catch (error) {

        alert(error.message || "Unable to submit application.");
    }
}


// ---------------- STUDENT APPLICATIONS ----------------

async function updateStudentDashboard() {

    const user = getLoggedInUser();

    if (!user || user.role !== "student") return;

    // Correct table ID from student-dashboard.html
    const tableBody = document.getElementById("applicationTableBody");

    try {

        const result = await apiRequest(
            `/student/${user.id}/applications`
        );

        const applications = getArray(result, "applications");

        // Calculate statistics
        const pending = applications.filter(application =>
            String(application.status || "Pending").toLowerCase() === "pending"
        ).length;

        const selected = applications.filter(application =>
            String(application.status || "").toLowerCase() === "selected"
        ).length;

        // Update dashboard counters
        setText("totalApplications", applications.length);
        setText("pendingApplications", pending);
        setText("selectedApplications", selected);

        // Update application table
        if (tableBody) {

            if (applications.length === 0) {

                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4">
                            You have not applied for any jobs yet.
                        </td>
                    </tr>
                `;

            } else {

                tableBody.innerHTML = applications.map(application => {

                    const jobTitle =
                        application.title ||
                        application.job_title ||
                        "Job";

                    const companyName =
                        application.company_name ||
                        "Company";

                    const appliedDate = application.applied_at
                        ? new Date(application.applied_at).toLocaleDateString("en-IN")
                        : "Not available";

                    const status = application.status || "Pending";

                    return `
                        <tr>

                            <td>
                                ${escapeHTML(jobTitle)}
                            </td>

                            <td>
                                ${escapeHTML(companyName)}
                            </td>

                            <td>
                                ${escapeHTML(appliedDate)}
                            </td>

                            <td>
                                <span class="status-badge">
                                    ${escapeHTML(status)}
                                </span>
                            </td>

                        </tr>
                    `;

                }).join("");
            }
        }

        // Placement message
        const placementMessage =
            document.getElementById("placementMessage");

        if (placementMessage) {

            if (selected > 0) {

                placementMessage.textContent =
                    "Congratulations! You have been selected for a job.";

            } else if (pending > 0) {

                placementMessage.textContent =
                    "Your application is pending. Keep checking your placement status.";

            } else if (applications.length > 0) {

                placementMessage.textContent =
                    "Your application status has been updated. Keep exploring opportunities.";

            } else {

                placementMessage.textContent =
                    "Your placement journey starts here!";
            }
        }

        // Update placement progress
        const progressFill =
            document.querySelector(".progress-fill");

        if (progressFill) {

            const progress = applications.length > 0
                ? Math.min(100, (selected / applications.length) * 100)
                : 0;

            progressFill.style.width = progress + "%";
        }

    } catch (error) {

        console.error("Student dashboard error:", error);

        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4">
                        Unable to load applications.
                    </td>
                </tr>
            `;
        }
    }
}


// ==================================================
// 6. STUDENT PROFILE AND RESUME
// ==================================================

async function fileToBase64(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {
            const result = reader.result;
            resolve(String(result).split(",")[1]);
        };

        reader.onerror = () => {
            reject(new Error("Unable to read file."));
        };

        reader.readAsDataURL(file);
    });
}


async function loadStudentProfile() {

    const user = getLoggedInUser();

    if (!user) return;

    try {

        const result = await apiRequest(
            `/student/${user.id}/profile`
        );

        const profile = result.profile || result;

        const qualification =
            document.getElementById("qualification");

        const skills =
            document.getElementById("skills");

        if (qualification) {
            qualification.value = profile.qualification || "";
        }

        if (skills) {
            skills.value = profile.skills || "";
        }

        setText("profileName", user.name);
        setText("profileEmail", user.email);

    } catch (error) {

        console.error("Profile loading error:", error);
    }
}


// ---------------- SAVE STUDENT PROFILE ----------------

const studentProfileForm =
    document.getElementById("studentProfileForm");

if (studentProfileForm) {

    studentProfileForm.addEventListener("submit", async event => {

        event.preventDefault();

        const user = getLoggedInUser();

        if (!user) return;

        const qualification =
            document.getElementById("qualification")?.value.trim() || "";

        const skills =
            document.getElementById("skills")?.value.trim() || "";

        try {

            const result = await apiRequest(
                `/student/${user.id}/profile`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        qualification,
                        skills
                    })
                }
            );

            alert(result.message || "Profile updated successfully!");

        } catch (error) {

            alert(error.message);
        }
    });
}


// ---------------- RESUME UPLOAD ----------------

const resumeForm = document.getElementById("resumeForm");

if (resumeForm) {

    resumeForm.addEventListener("submit", async event => {

        event.preventDefault();

        const user = getLoggedInUser();

        if (!user) return;

        const resumeInput =
            document.getElementById("resumeFile") ||
            document.getElementById("resume");

        const file = resumeInput?.files?.[0];

        if (!file) {
            alert("Please select your resume first.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Resume size should be less than 5 MB.");
            return;
        }

        try {

            const base64Data = await fileToBase64(file);

            const result = await apiRequest(
                `/student/${user.id}/resume`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        file_name: file.name,
                        mime_type: file.type || "application/octet-stream",
                        file_data: base64Data
                    })
                }
            );

            alert(result.message || "Resume uploaded successfully!");

        } catch (error) {

            alert(error.message);
        }
    });
}


// ==================================================
// 7. COMPANY DASHBOARD
// ==================================================

function showCompanyInformation() {

    const user = getLoggedInUser();

    if (!user || user.role !== "company") return;

    setText("companyName", user.name || "Company");
    setText("companyProfileName", user.name || "Company");
    setText("companyProfileEmail", user.email || "");
}


// ---------------- POST JOB ----------------

const postJobForm = document.getElementById("postJobForm");

if (postJobForm) {

    postJobForm.addEventListener("submit", async event => {

        event.preventDefault();

        const user = getLoggedInUser();

        if (!user || user.role !== "company") {
            alert("Please login as a company.");
            return;
        }

        const jobTitle =
            document.getElementById("jobTitle")?.value.trim();

        const jobType =
            document.getElementById("jobType")?.value;

        const jobSalary =
            document.getElementById("jobSalary")?.value.trim();

        const jobSkills =
            document.getElementById("jobSkills")?.value.trim();

        const jobDescription =
            document.getElementById("jobDescription")?.value.trim();

        if (!jobTitle || !jobType || !jobSalary ||
            !jobSkills || !jobDescription) {

            alert("Please fill all job details.");
            return;
        }

        const button =
            postJobForm.querySelector("button[type='submit']");

        if (button) {
            button.disabled = true;
            button.textContent = "Posting...";
        }

        try {

            await apiRequest("/jobs", {
                method: "POST",
                body: JSON.stringify({
                    company_id: user.id,
                    title: jobTitle,
                    job_type: jobType,
                    salary: jobSalary,
                    skills: jobSkills,
                    description: jobDescription
                })
            });

            alert("Job posted successfully!");

            postJobForm.reset();

            await displayCompanyJobs();
            await updateCompanyDashboard();

        } catch (error) {

            alert(error.message || "Unable to post job.");

        } finally {

            if (button) {
                button.disabled = false;
                button.textContent = "+ Post Job";
            }
        }
    });
}


// ---------------- DISPLAY COMPANY JOBS ----------------

async function displayCompanyJobs() {

    const user = getLoggedInUser();

    const container =
        document.querySelector("#jobs .jobs-grid");

    if (!user || user.role !== "company" || !container) return;

    try {

        const result = await apiRequest(
            `/company/${user.id}/jobs`
        );

        const jobs = getArray(result, "jobs");

        if (!jobs.length) {

            container.innerHTML =
                "<p>You have not posted any jobs yet.</p>";

            return;
        }

        container.innerHTML = jobs.map(job => `

            <div class="job-card">

                <span class="job-type">
                    ${escapeHTML(job.job_type || "Job")}
                </span>

                <h3>
                    ${escapeHTML(job.title)}
                </h3>

                <p>
                    Skills: ${escapeHTML(job.skills || "-")}
                </p>

                <p>
                    Salary: ${escapeHTML(job.salary || "-")}
                </p>

                <p>
                    ${escapeHTML(job.description || "")}
                </p>

                <span class="status-badge selected">
                    ${escapeHTML(job.status || "Active")}
                </span>

            </div>

        `).join("");

    } catch (error) {

        console.error("Company jobs error:", error);

        container.innerHTML =
            "<p>Unable to load your jobs.</p>";
    }
}


// ---------------- COMPANY DASHBOARD STATS ----------------

async function updateCompanyDashboard() {

    const user = getLoggedInUser();

    if (!user || user.role !== "company") return;

    try {

        const jobsResult = await apiRequest(
            `/company/${user.id}/jobs`
        );

        const jobs = getArray(jobsResult, "jobs");

        const applicationsResult = await apiRequest(
            `/company/${user.id}/applications`
        );

        const applications =
            getArray(applicationsResult, "applications");

        setText("companyTotalJobs", jobs.length);
        setText("companyTotalApplicants", applications.length);

        setText(
            "companyPendingApplications",
            applications.filter(a =>
                (a.status || "Pending").toLowerCase() === "pending"
            ).length
        );

        setText(
            "companySelectedStudents",
            applications.filter(a =>
                (a.status || "").toLowerCase() === "selected"
            ).length
        );

        await displayCompanyApplicants();

    } catch (error) {

        console.error("Company dashboard error:", error);
    }
}


// ---------------- RESUME FUNCTIONS ----------------

async function fetchResume(studentId, companyId = null) {

    const endpoint = companyId
        ? `/company/${companyId}/student/${studentId}/resume`
        : `/student/${studentId}/resume`;

    return apiRequest(endpoint);
}


function openResumeInBrowser(resume, download = false) {

    const binary = atob(resume.fileData);

    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], {
        type: resume.mimeType || "application/pdf"
    });

    const url = URL.createObjectURL(blob);

    if (download) {

        const link = document.createElement("a");

        link.href = url;
        link.download = resume.fileName || "Student-Resume.pdf";

        document.body.appendChild(link);
        link.click();
        link.remove();

    } else {

        const newWindow = window.open(url, "_blank");

        if (!newWindow) {
            alert("Please allow pop-ups to view the resume.");
        }
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000);
}


async function viewStudentResume(studentId, companyId) {

    try {

        const resume = await fetchResume(studentId, companyId);

        openResumeInBrowser(resume, false);

    } catch (error) {

        alert(error.message || "Unable to open resume.");
    }
}


async function downloadStudentResume(studentId, companyId) {

    try {

        const resume = await fetchResume(studentId, companyId);

        openResumeInBrowser(resume, true);

    } catch (error) {

        alert(error.message || "Unable to download resume.");
    }
}


// ---------------- COMPANY APPLICANTS ----------------

async function displayCompanyApplicants() {

    const user = getLoggedInUser();

    if (!user || user.role !== "company") return;

    const tableBody =
        document.getElementById("companyApplicantsTableBody") ||
        document.querySelector("#applicants tbody");

    if (!tableBody) return;

    try {

        const result = await apiRequest(
            `/company/${user.id}/applications`
        );

        const applications = getArray(result, "applications");

        if (!applications.length) {

            const columnCount =
                document.querySelector("#applicants thead tr")
                    ?.children.length || 5;

            tableBody.innerHTML = `
                <tr>
                    <td colspan="${columnCount}">
                        No applications available yet.
                    </td>
                </tr>
            `;

            return;
        }

        const headers = Array.from(
            document.querySelectorAll("#applicants thead th")
        ).map(th => th.textContent.trim().toLowerCase());

        const hasResumeColumn =
            headers.some(header => header.includes("resume"));

        tableBody.innerHTML = "";

        applications.forEach(application => {

            const row = document.createElement("tr");

            const studentId = application.student_id;

            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        application.studentName ||
                        application.student_name ||
                        "Student"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        application.studentEmail ||
                        application.student_email ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        application.jobTitle ||
                        application.job_title ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        application.date ||
                        application.applied_at ||
                        "-"
                    )}
                </td>

                ${hasResumeColumn ? `

                    <td>
                        <div class="resume-actions">

                            <button type="button"
                                class="resume-btn view-resume-btn">
                                View
                            </button>

                            <button type="button"
                                class="resume-btn download-resume-btn">
                                Download
                            </button>

                        </div>
                    </td>

                ` : ""}

                <td>

                    <select class="status-select">

                        <option value="Pending">Pending</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Selected">Selected</option>
                        <option value="Rejected">Rejected</option>

                    </select>

                </td>
            `;

            const statusSelect =
                row.querySelector(".status-select");

            statusSelect.value =
                application.status || "Pending";

            statusSelect.addEventListener("change", async () => {

                const previousStatus =
                    application.status || "Pending";

                try {

                    await apiRequest(
                        `/applications/${application.id}/status`,
                        {
                            method: "PATCH",
                            body: JSON.stringify({
                                status: statusSelect.value
                            })
                        }
                    );

                    alert("Application status updated successfully!");

                    await updateCompanyDashboard();

                } catch (error) {

                    alert(error.message || "Unable to update status.");

                    statusSelect.value = previousStatus;
                }
            });

            const viewButton =
                row.querySelector(".view-resume-btn");

            const downloadButton =
                row.querySelector(".download-resume-btn");

            if (viewButton) {

                viewButton.addEventListener("click", () => {
                    viewStudentResume(studentId, user.id);
                });
            }

            if (downloadButton) {

                downloadButton.addEventListener("click", () => {
                    downloadStudentResume(studentId, user.id);
                });
            }

            tableBody.appendChild(row);
        });

    } catch (error) {

        console.error("Applicants loading error:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    Unable to load applications.
                </td>
            </tr>
        `;
    }
}


// ==================================================
// 8. ADMIN DASHBOARD
// ==================================================

function setAdminTableMessage(tableBody, message, columnCount) {

    if (tableBody) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="${columnCount}">
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;
    }
}


// ---------------- ADMIN STUDENTS ----------------

async function loadAdminStudents() {

    const tableBody =
        document.getElementById("adminStudentsTable");

    if (!tableBody) return;

    try {

        const result = await apiRequest("/admin/students");

        const students = getArray(result, "students");

        if (!students.length) {

            setAdminTableMessage(
                tableBody,
                "No student records found.",
                5
            );

            return;
        }

        tableBody.innerHTML = students.map(student => `

            <tr>

                <td>${escapeHTML(student.id)}</td>

                <td>${escapeHTML(student.name)}</td>

                <td>
                    ${escapeHTML(student.qualification || "Not Updated")}
                </td>

                <td>${escapeHTML(student.email)}</td>

                <td>
                    <span class="status-badge">Registered</span>
                </td>

            </tr>

        `).join("");

    } catch (error) {

        console.error("Admin students error:", error);

        setAdminTableMessage(
            tableBody,
            "Unable to load student records.",
            5
        );
    }
}


// ---------------- ADMIN COMPANIES ----------------

async function loadAdminCompanies() {

    const tableBody =
        document.getElementById("adminCompaniesTable");

    if (!tableBody) return;

    try {

        const result = await apiRequest("/admin/companies");

        const companies = getArray(result, "companies");

        if (!companies.length) {

            setAdminTableMessage(
                tableBody,
                "No company records found.",
                5
            );

            return;
        }

        tableBody.innerHTML = companies.map(company => `

            <tr>

                <td>${escapeHTML(company.id)}</td>

                <td>${escapeHTML(company.name)}</td>

                <td>${escapeHTML(company.email)}</td>

                <td>
                    ${escapeHTML(company.description || "Not Updated")}
                </td>

                <td>
                    <span class="status-badge">Registered</span>
                </td>

            </tr>

        `).join("");

    } catch (error) {

        console.error("Admin companies error:", error);

        setAdminTableMessage(
            tableBody,
            "Unable to load company records.",
            5
        );
    }
}


// ---------------- ADMIN JOBS ----------------

async function loadAdminJobs() {

    const container =
        document.getElementById("adminJobsGrid");

    if (!container) return;

    try {

        const result = await apiRequest("/admin/jobs");

        const jobs = getArray(result, "jobs");

        if (!jobs.length) {

            container.innerHTML =
                "<p>No job opportunities found.</p>";

            return;
        }

        container.innerHTML = jobs.map(job => `

            <div class="job-card">

                <span class="job-type">
                    ${escapeHTML(job.job_type || "Job")}
                </span>

                <h3>${escapeHTML(job.title)}</h3>

                <p class="company-name">
                    ${escapeHTML(job.company_name || "Company")}
                </p>

                <p>
                    Salary: ${escapeHTML(job.salary || "Not specified")}
                </p>

                <p>
                    Skills: ${escapeHTML(job.skills || "Not specified")}
                </p>

                <span class="status-badge ${
                    String(job.status).toLowerCase() === "active"
                        ? "selected"
                        : ""
                }">

                    ${escapeHTML(job.status || "Active")}

                </span>

            </div>

        `).join("");

    } catch (error) {

        console.error("Admin jobs error:", error);

        container.innerHTML =
            "<p>Unable to load job opportunities.</p>";
    }
}


// ---------------- ADMIN APPLICATIONS ----------------

async function loadAdminApplications() {

    const tableBody =
        document.getElementById("adminApplicationsTable");

    if (!tableBody) return;

    try {

        const result =
            await apiRequest("/admin/applications");

        const applications =
            getArray(result, "applications");

        if (!applications.length) {

            setAdminTableMessage(
                tableBody,
                "No applications found.",
                5
            );

            return;
        }

        tableBody.innerHTML = applications.map(application => `

            <tr>

                <td>${escapeHTML(application.id)}</td>

                <td>
                    ${escapeHTML(application.student_name || "Student")}
                </td>

                <td>
                    ${escapeHTML(application.job_title || "Job")}
                </td>

                <td>
                    ${escapeHTML(application.company_name || "Company")}
                </td>

                <td>
                    <span class="status-badge">
                        ${escapeHTML(application.status || "Pending")}
                    </span>
                </td>

            </tr>

        `).join("");

    } catch (error) {

        console.error("Admin applications error:", error);

        setAdminTableMessage(
            tableBody,
            "Unable to load applications.",
            5
        );
    }
}


// ---------------- ADMIN DASHBOARD STATS ----------------

async function updateAdminDashboard() {

    const user = getLoggedInUser();

    if (!user || user.role !== "admin") return;

    try {

        const stats =
            await apiRequest("/admin/dashboard");

        setText("totalStudents", stats.totalStudents ?? 0);
        setText("totalCompanies", stats.totalCompanies ?? 0);
        setText("totalJobs", stats.totalJobs ?? 0);
        setText("totalApplications", stats.totalApplications ?? 0);

        setText(
            "selectedStudents",
            stats.selectedStudents ?? stats.placedStudents ?? 0
        );

        setText(
            "placementRate",
            stats.placementRate ?? "0%"
        );

        setText(
            "reportTotalStudents",
            stats.totalStudents ?? 0
        );

        setText(
            "reportPlacedStudents",
            stats.selectedStudents ?? stats.placedStudents ?? 0
        );

        setText(
            "reportPlacementRate",
            stats.placementRate ?? "0%"
        );

        const progress =
            document.getElementById("reportProgress");

        if (progress) {

            const rate = parseFloat(
                String(stats.placementRate ?? "0").replace("%", "")
            ) || 0;

            const safeRate =
                Math.max(0, Math.min(100, rate));

            progress.style.width = `${safeRate}%`;

            progress.setAttribute(
                "aria-valuenow",
                String(safeRate)
            );
        }

    } catch (error) {

        console.error(
            "Admin dashboard statistics error:",
            error
        );
    }

    await Promise.allSettled([

        loadAdminStudents(),
        loadAdminCompanies(),
        loadAdminJobs(),
        loadAdminApplications()

    ]);
}


// ==================================================
// 9. AUTO PAGE INITIALIZATION
// ==================================================

document.addEventListener("DOMContentLoaded", function () {

    const page = getCurrentPage();

    // STUDENT DASHBOARD
    if (page === "student-dashboard.html") {

        if (!checkDashboardAccess("student")) return;

        showStudentInformation();

        displayStudentJobs();

        updateStudentDashboard();

        loadStudentProfile();
    }

    // COMPANY DASHBOARD
    else if (page === "company-dashboard.html") {

        if (!checkDashboardAccess("company")) return;

        showCompanyInformation();

        displayCompanyJobs();

        updateCompanyDashboard();
    }

    // ADMIN DASHBOARD
    else if (page === "admin-dashboard.html") {

        if (!checkDashboardAccess("admin")) return;

        updateAdminDashboard();
    }

});