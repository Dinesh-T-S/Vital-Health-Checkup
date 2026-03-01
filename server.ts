import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

console.log(`[STARTUP] GMAIL_USER: ${process.env.GMAIL_USER ? 'SET' : 'MISSING'}`);
console.log(`[STARTUP] GMAIL_PASS: ${process.env.GMAIL_PASS ? 'SET' : 'MISSING'}`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("health.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'admin'
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    age INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_alert_sent_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    bp_sys INTEGER NOT NULL,
    bp_dia INTEGER NOT NULL,
    blood_sugar INTEGER NOT NULL,
    test_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    type TEXT,
    value_summary TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );
`);

// Migration: Add age column if missing
const tableInfo = db.prepare("PRAGMA table_info(patients)").all() as any[];
if (!tableInfo.some(col => col.name === 'age')) {
  db.exec("ALTER TABLE patients ADD COLUMN age INTEGER");
}

// Seed Admin User if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "admin");
}

const app = express();
app.use(express.json());

const JWT_SECRET = "vitaltrack-secret-key-2026";

// Email Transporter Setup
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const gmailUser = process.env.GMAIL_USER?.trim().replace(/^["']|["']$/g, '');
  const gmailPass = process.env.GMAIL_PASS?.trim().replace(/\s/g, '').replace(/^["']|["']$/g, '');

  if (!gmailUser || !gmailPass) return null;

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });
}

async function sendEmail(to: string, subject: string, text: string) {
  const gmailUser = process.env.GMAIL_USER?.trim().replace(/^["']|["']$/g, '');
  const gmailPass = process.env.GMAIL_PASS?.trim().replace(/\s/g, '').replace(/^["']|["']$/g, '');

  const maskedUser = gmailUser ? `${gmailUser.substring(0, 3)}...` : 'MISSING';
  const maskedPass = gmailPass ? `${gmailPass.substring(0, 3)}...` : 'MISSING';
  console.log(`[DEBUG] Email to ${to} | User: ${maskedUser} | Pass: ${maskedPass} (Len: ${gmailPass?.length})`);

  if (!gmailUser || !gmailPass) {
    const msg = `[MOCK EMAIL] To: ${to}, Subject: ${subject}, Body: ${text}`;
    console.log(msg);
    return { success: true, mock: true, message: msg };
  }

  const transport = getTransporter();
  if (!transport) return { success: false, error: "Transporter not initialized" };

  try {
    const info = await transport.sendMail({
      from: gmailUser,
      to,
      subject,
      text,
    });
    console.log(`[REAL EMAIL SENT] To: ${to}, MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EMAIL ERROR] To: ${to}`, error);
    return { success: false, error: error.message };
  }
}

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API Routes ---

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, user: { username: user.username, role: user.role } });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.get("/api/dashboard/stats", authenticateToken, (req, res) => {
  const totalPatients = db.prepare("SELECT COUNT(*) as count FROM patients").get() as any;
  const totalTests = db.prepare("SELECT COUNT(*) as count FROM tests").get() as any;
  
  // High values: BP > 140/90 or Sugar > 120
  // We check the latest test for each patient
  const highValuePatients = db.prepare(`
    SELECT COUNT(DISTINCT patient_id) as count 
    FROM tests t1
    WHERE t1.id = (SELECT id FROM tests t2 WHERE t2.patient_id = t1.patient_id ORDER BY test_date DESC LIMIT 1)
    AND (bp_sys >= 140 OR bp_dia >= 90 OR blood_sugar >= 120)
  `).get() as any;

  // Pending tests: Patients who haven't had a test in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const pendingTests = db.prepare(`
    SELECT COUNT(*) as count FROM patients p
    WHERE NOT EXISTS (
      SELECT 1 FROM tests t 
      WHERE t.patient_id = p.id 
      AND t.test_date > ?
    )
  `).get(thirtyDaysAgo.toISOString()) as any;

  res.json({
    totalPatients: totalPatients.count,
    totalTests: totalTests.count,
    highValuePatients: highValuePatients.count,
    pendingTests: pendingTests.count,
    completedTests: totalTests.count // In this context, every entry in tests table is a completed test
  });
});

app.get("/api/patients", authenticateToken, (req, res) => {
  const search = req.query.search || "";
  const patients = db.prepare(`
    SELECT p.*, 
    (SELECT test_date FROM tests WHERE patient_id = p.id ORDER BY test_date DESC LIMIT 1) as latest_test_date,
    (SELECT bp_sys || '/' || bp_dia FROM tests WHERE patient_id = p.id ORDER BY test_date DESC LIMIT 1) as latest_bp,
    (SELECT blood_sugar FROM tests WHERE patient_id = p.id ORDER BY test_date DESC LIMIT 1) as latest_sugar
    FROM patients p
    WHERE p.name LIKE ? OR p.email LIKE ?
  `).all(`%${search}%`, `%${search}%`);
  res.json(patients);
});

app.post("/api/patients", authenticateToken, (req, res) => {
  const { name, email, age } = req.body;
  try {
    const result = db.prepare("INSERT INTO patients (name, email, age) VALUES (?, ?, ?)").run(name, email, age);
    res.json({ id: result.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put("/api/patients/:id", authenticateToken, (req, res) => {
  const { name, email, age } = req.body;
  try {
    db.prepare("UPDATE patients SET name = ?, email = ?, age = ? WHERE id = ?").run(name, email, age, req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/patients/:id", authenticateToken, (req, res) => {
  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(req.params.id);
  const history = db.prepare("SELECT * FROM tests WHERE patient_id = ? ORDER BY test_date DESC").all(req.params.id);
  const alerts = db.prepare("SELECT * FROM alerts WHERE patient_id = ? ORDER BY sent_at DESC").all(req.params.id);
  res.json({ patient, history, alerts });
});

app.post("/api/tests", authenticateToken, async (req, res) => {
  const { patient_id, bp_sys, bp_dia, blood_sugar, bypass_cooldown } = req.body;
  
  const result = db.prepare("INSERT INTO tests (patient_id, bp_sys, bp_dia, blood_sugar) VALUES (?, ?, ?, ?)")
    .run(patient_id, bp_sys, bp_dia, blood_sugar);

  let alertTriggered = false;
  const isHigh = bp_sys >= 140 || bp_dia >= 90 || blood_sugar >= 120;
  if (isHigh) {
    const patient: any = db.prepare("SELECT * FROM patients WHERE id = ?").get(patient_id);
    const lastAlert = patient.last_alert_sent_at ? new Date(patient.last_alert_sent_at) : null;
    const now = new Date();
    
    const threeMonthsInMs = 90 * 24 * 60 * 60 * 1000;
    
    if (bypass_cooldown || !lastAlert || (now.getTime() - lastAlert.getTime() > threeMonthsInMs)) {
      alertTriggered = true;
      const type = (bp_sys >= 140 || bp_dia >= 90) && blood_sugar >= 120 ? "Both" : (blood_sugar >= 120 ? "Blood Sugar" : "Blood Pressure");
      const valueSummary = `BP: ${bp_sys}/${bp_dia}, Sugar: ${blood_sugar}`;
      
      db.prepare("INSERT INTO alerts (patient_id, type, value_summary) VALUES (?, ?, ?)").run(patient_id, type, valueSummary);
      db.prepare("UPDATE patients SET last_alert_sent_at = ? WHERE id = ?").run(now.toISOString(), patient_id);
      
      const subject = "Health Check-Up Reminder";
      const body = `Dear ${patient.name},
Your recent test results show that your blood pressure or blood sugar levels are above the normal range (${valueSummary}).
We recommend scheduling a regular health check-up.
Thank you.`;
      
      const emailResult = await sendEmail(patient.email, subject, body);
      return res.json({ 
        id: result.lastInsertRowid, 
        alertTriggered: true, 
        emailStatus: emailResult.success ? 'sent' : 'failed',
        emailError: emailResult.error 
      });
    } else {
      const daysRemaining = Math.ceil((threeMonthsInMs - (now.getTime() - lastAlert.getTime())) / (24 * 60 * 60 * 1000));
      return res.json({ id: result.lastInsertRowid, alertTriggered: false, reason: `Alert skipped: 3-month rule active. Next alert available in ${daysRemaining} days. Use 'Bypass' to force.` });
    }
  }

  res.json({ id: result.lastInsertRowid, alertTriggered });
});

app.post("/api/patients/:id/reset-alert", authenticateToken, (req, res) => {
  db.prepare("UPDATE patients SET last_alert_sent_at = NULL WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post("/api/patients/:id/trigger-alert", authenticateToken, async (req, res) => {
  const patient: any = db.prepare("SELECT * FROM patients WHERE id = ?").get(req.params.id);
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  const latestTest: any = db.prepare("SELECT * FROM tests WHERE patient_id = ? ORDER BY test_date DESC LIMIT 1").get(req.params.id);
  
  const valueSummary = latestTest 
    ? `Latest BP: ${latestTest.bp_sys}/${latestTest.bp_dia}, Latest Sugar: ${latestTest.blood_sugar}`
    : "No recent test data available";
  
  const type = "Manual Reminder";
  const now = new Date();

  // Record the alert
  db.prepare("INSERT INTO alerts (patient_id, type, value_summary) VALUES (?, ?, ?)").run(req.params.id, type, valueSummary);
  
  // We update the last_alert_sent_at to maintain the 3-month rule for automatic alerts
  db.prepare("UPDATE patients SET last_alert_sent_at = ? WHERE id = ?").run(now.toISOString(), req.params.id);

  const subject = "Health Check-Up Reminder";
  const body = `Dear ${patient.name},
Your recent test results show that your blood pressure or blood sugar levels are above the normal range.
We recommend scheduling a regular health check-up.
Thank you.`;

  const emailResult = await sendEmail(patient.email, subject, body);

  res.json({ 
    success: emailResult.success, 
    error: emailResult.error,
    mock: emailResult.mock 
  });
});

app.get("/api/trends", authenticateToken, (req, res) => {
  // Monthly trends for the last 6 months
  const trends = db.prepare(`
    SELECT 
      strftime('%Y-%m', test_date) as month,
      COUNT(*) as test_count,
      AVG(bp_sys) as avg_sys,
      AVG(blood_sugar) as avg_sugar
    FROM tests
    GROUP BY month
    ORDER BY month DESC
    LIMIT 6
  `).all();
  res.json(trends.reverse());
});

// --- Vite Middleware ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
