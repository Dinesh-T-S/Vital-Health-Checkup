<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/122ce472-2a09-401e-867e-ddef0da1e90a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

<hr>

<h1>🏥 Patient Health Monitoring System</h1>

<p>
A responsive web application that stores patient health data, monitors medical readings,
and sends automated alerts when abnormal values are detected.
Perfect for healthcare providers to manage patient wellness and ensure timely check-ups.
</p>

<hr>

<h2>🔑 Core Features</h2>

<h3>1. 🧍 Patient Management</h3>
<ul>
  <li>Store patient details: name, email, blood pressure, blood sugar</li>
  <li>Maintain full test history (previous + latest test dates)</li>
  <li>Search patients by name or health parameters</li>
</ul>

<h3>2. 🚨 Automated Alert System</h3>
<ul>
  <li>Auto-sends alerts when:
    <ul>
      <li>Blood Pressure > <strong>140/90 mmHg</strong></li>
      <li>Blood Sugar > <strong>120 mg/dL</strong></li>
    </ul>
  </li>
  <li>Prevents spam: only one alert every 3 months</li>
  <li>Tracks last alert sent date</li>
</ul>

<h3>3. 📊 Dashboard & Statistics</h3>
<ul>
  <li>Total number of patients</li>
  <li>Completed vs pending tests</li>
  <li>Patients with abnormal readings</li>
  <li>Visualizations using charts (monthly trends, risk distribution)</li>
  <li>Date-range filtering</li>
</ul>

<h3>4. 📅 Test History Tracking</h3>
<ul>
  <li>Full history table with date, BP, sugar level, and status</li>
  <li>Compare previous and latest records</li>
</ul>

<h3>5. 🔐 Security</h3>
<ul>
  <li>Secure email notifications</li>
  <li>HTTPS support</li>
</ul>

<h3>6. 📱 Responsive Design</h3>
<ul>
  <li>Optimized for desktop, tablet, and mobile</li>
  <li>Built using modern responsive UI frameworks</li>
  <li>Clean and flexible layout</li>
</ul>

<hr>
