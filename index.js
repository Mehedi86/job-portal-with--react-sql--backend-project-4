const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON body

// MySQL connection pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "mehedi86",
  database: "jobdb",
});

// -------- USERS ROUTES -------- //

// Get all users
app.get("/api/users", (req, res) => {
  pool.query("SELECT * FROM users", (err, results) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ error: "Database query error" });
    }
    res.json(results);
  });
});

// Add a new user
app.post("/api/users", (req, res) => {
  const { name, email, password, role, email_verified = 1 } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const query =
    "INSERT INTO users (name, email, password, role, email_verified) VALUES (?, ?, ?, ?, ?)";

  pool.query(
    query,
    [name, email, password, role, email_verified],
    (err, result) => {
      if (err) {
        console.error("Error inserting user:", err);
        return res.status(500).json({ error: "Database insert error" });
      }
      res
        .status(201)
        .json({ id: result.insertId, name, email, role, email_verified });
    }
  );
});

// LOGIN ROUTE
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const query = "SELECT * FROM users WHERE email = ? AND password = ? LIMIT 1";
  pool.query(query, [email, password], (err, results) => {
    if (err) {
      console.error("Error checking user:", err);
      return res.status(500).json({ error: "Database query error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = results[0];
    delete user.password; // Don't send password back
    res.json({ ...user, authenticated: true });
  });
});

// Get jobseeker profile from job_seeker_profiles only
app.get("/api/jobseeker/:id", (req, res) => {
  const { id } = req.params;

  const query = "SELECT * FROM job_seeker_profiles WHERE user_id = ? LIMIT 1";

  pool.query(query, [id], (err, results) => {
    if (err) {
      console.error("Error fetching jobseeker profile:", err);
      return res.status(500).json({ error: "Database query error" });
    }

    if (results.length === 0) {
      // Return empty object with status 200
      return res.json({});
    }

    res.json(results[0]);
  });
});


// Update or insert jobseeker profile
app.put("/api/jobseeker/:id", (req, res) => {
  const { id } = req.params;
  const { phone, address, resume_path, skills, experience, education } = req.body;

  if (!id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  // First check if profile exists
  pool.query(
    "SELECT id FROM job_seeker_profiles WHERE user_id = ? LIMIT 1",
    [id],
    (err, results) => {
      if (err) {
        console.error("Error while checking profile:", err);
        return res.status(500).json({ error: "user not found!!" });
      }

      if (results.length > 0) {
        // Update existing profile
        pool.query(
          `UPDATE job_seeker_profiles 
           SET phone = ?, address = ?, resume_path = ?, skills = ?, experience = ?, education = ?, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
          [phone, address, resume_path, skills, experience, education, id],
          (err2) => {
            if (err2) {
              console.error("Error updating profile:", err2);
              return res.status(500).json({ error: "Database update error" });
            }
            res.json({ message: "Profile updated successfully" });
          }
        );
      } else {
        // Insert new profile if not exists
        pool.query(
          `INSERT INTO job_seeker_profiles 
           (user_id, phone, address, resume_path, skills, experience, education) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, phone, address, resume_path, skills, experience, education],
          (err3) => {
            if (err3) {
              console.error("Error inserting profile:", err3);
              return res.status(500).json({ error: "Database insert error" });
            }
            res.json({ message: "Profile created successfully" });
          }
        );
      }
    }
  );
});

// Get applied jobs for a user
app.get("/api/applied/:id", (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      ja.id AS application_id,
      ja.status,
      ja.applied_at,
      j.id AS job_id,
      j.company,
      j.title,
      j.location
    FROM job_applications ja
    JOIN jobs j ON ja.job_id = j.id
    WHERE ja.job_seeker_id = ?
    ORDER BY ja.applied_at DESC
  `;

  pool.query(query, [id], (err, results) => {
    if (err) {
      console.error("Error fetching applied jobs:", err);
      return res.status(500).json({ error: "Database query error" });
    }
    res.json(results); // Returns [] if no jobs applied
  });
});

// Get all jobs posted by a specific employer
app.get("/api/employer/:id/jobs", (req, res) => {
  const { id } = req.params; // employer user ID

  const query = `
    SELECT 
      j.id AS job_id,
      j.company,
      j.title,
      j.description,
      j.category,
      j.location,
      j.status,
      j.created_at,
      j.updated_at
    FROM jobs j
    WHERE j.employer_id = ?
    ORDER BY j.created_at DESC
  `;

  pool.query(query, [id], (err, results) => {
    if (err) {
      console.error("Error fetching employer jobs:", err);
      return res.status(500).json({ error: "Database query error" });
    }
    res.json(results); // returns [] if no jobs found
  });
});

// Update job status (open/closed)
app.put("/api/job/:jobId/status", (req, res) => {
  const { jobId } = req.params;
  const { status } = req.body;

  if (!["open", "closed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const query = `
    UPDATE jobs 
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  pool.query(query, [status, jobId], (err, result) => {
    if (err) {
      console.error("Error updating job status:", err);
      return res.status(500).json({ error: "Database update error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({ message: `Job status updated to ${status}` });
  });
});


// -------- JOBS ROUTES -------- //
app.get("/api/jobs", (req, res) => {
  pool.query("SELECT * FROM jobs", (err, results) => {
    if (err) {
      console.error("Error fetching jobs:", err);
      return res.status(500).json({ error: "Database query error" });
    }
    res.json(results);
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
