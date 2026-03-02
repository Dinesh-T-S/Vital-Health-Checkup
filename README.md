# Healtrix - Healthcare Monitoring & Alert System

Healtrix is a professional healthcare monitoring application designed for healthcare providers to track patient vitals and automate health interventions. It provides a centralized dashboard for managing patient records, logging health metrics, and sending automated alerts when critical thresholds are reached.

## 🚀 Tech Stack

### Frontend
- **React 18+ (TypeScript)**: For a robust and type-safe user interface.
- **Vite**: High-performance build tool and development server.
- **Tailwind CSS**: Utility-first styling for a modern, responsive design.
- **Lucide React**: Clean and consistent iconography.
- **Recharts**: Interactive data visualization for health trends.
- **Date-fns**: Precise date manipulation and formatting.
- **Clsx & Tailwind-merge**: Efficient management of dynamic CSS classes.

### Backend
- **Node.js (Express)**: Scalable server-side logic and API management.
- **Better-SQLite3**: High-performance, synchronous SQLite database for reliable data storage.
- **JWT (JSON Web Tokens)**: Secure, stateless authentication for healthcare providers.
- **Nodemailer**: Integration for automated email notifications (currently logged to console for demonstration).

---

## ✨ Key Features

### 1. Patient Management
- **Add Patient**: Easily register new patients with their name, email, and age.
- **Edit Patient Details**: Update existing patient information at any time.
- **Delete Patient**: Remove a patient and all their associated medical records permanently.
- **Unique 9-Digit IDs**: Every patient is assigned a unique, collision-resistant 9-digit ID (e.g., `482930182`).
- **Search Functionality**: Quickly find patients by name or email using the real-time search bar.

### 2. Vitals Tracking & Management
- **Add Test Records**: Log Blood Pressure (Systolic and Diastolic) and Blood Sugar (mg/dL) for any patient.
- **Delete Test Records**: Remove individual test entries if they were entered incorrectly.
- **History Tracking**: View a complete chronological history of all tests for each patient.
- **Risk Assessment**: Automatic visual indicators for "High" vs "Normal" readings based on medical thresholds.

### 3. Automated Health Alerts
- **Smart Triggers**: Alerts are automatically triggered when readings exceed thresholds:
  - **Blood Pressure**: ≥ 140/90 mmHg
  - **Blood Sugar**: ≥ 120 mg/dL
- **Dynamic Alert Cooldown (Settings)**: Healthcare providers can customize the "Alert Cooldown" period (e.g., 30, 60, or 90 days) in the Settings tab. This prevents spamming patients with too many automated emails.
- **Force Alert Option**: Providers can manually bypass the cooldown for urgent cases by checking "Bypass cooldown" when adding a test.

### 4. Custom UI & Security
- **Delete Confirmation**: All delete actions (patients or tests) require confirmation through a custom-built modal to prevent accidental data loss.
- **Optimized for Sandbox**: Replaced native browser `confirm()` and `alert()` with a custom React-based modal and toast system to ensure 100% compatibility with sandboxed preview environments.
- **Secure Access**: Protected routes ensuring only authorized personnel can access patient data via JWT authentication.

### 5. Analytics & Insights
- **Provider Dashboard**: High-level overview of total patients, high-risk cases, and recent activity.
- **Trend Visualization**: Interactive charts showing health trends over time to help identify patterns.

---

## 🛠️ Getting Started

1. **Login**: Use the provided credentials to access the provider dashboard.
2. **Add Patient**: Create a new patient record with their contact details.
3. **Log Vitals**: Click on a patient to add their latest BP and Blood Sugar readings.
4. **Monitor Alerts**: Check the patient's alert history to see if notifications were triggered.
5. **Adjust Settings**: Visit the settings tab to fine-tune the alert frequency (Dynamic Alert Days).
