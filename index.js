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
