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
