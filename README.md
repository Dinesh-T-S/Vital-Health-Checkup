# Healtrix - Healthcare Monitoring & Alert System

Healtrix is a professional healthcare monitoring application designed for healthcare providers to track patient Healtrix and automate health interventions. It provides a centralized dashboard for managing patient records, logging health metrics, and sending automated alerts when critical thresholds are reached.

## 📋 Healtrix Overview

![login](https://github.com/user-attachments/assets/8a294f1e-4c31-4bcb-9a2f-c3a7dad57006)
![Dashboard](https://github.com/user-attachments/assets/242ef03e-a331-463b-a8ae-0f1177fbee31)
![configuration](https://github.com/user-attachments/assets/59cb0817-284a-42e8-9c89-3dd48a1962f3)
![add patient](https://github.com/user-attachments/assets/c6d807dd-6c14-422a-8afb-193a169e6062)
![patient list](https://github.com/user-attachments/assets/c2c68de7-110a-4b91-be87-6273e95ed70d)
![patient details](https://github.com/user-attachments/assets/0d9ffc17-135d-44e0-a952-3e5801ae8aa3)
![add test result](https://github.com/user-attachments/assets/478cb0d1-fbf7-4c00-921c-15a7a4590905)
![remainder email](https://github.com/user-attachments/assets/af899d60-3b3b-457f-a3cf-b8280ef6f4d3)
![edit patient details](https://github.com/user-attachments/assets/84fb0aa4-71a5-434b-ab5d-7af6f406f260)
![delete test](https://github.com/user-attachments/assets/88ab4dfa-d877-40a7-af66-145894d8f718)
![delete patient](https://github.com/user-attachments/assets/4ef9cbaf-5c97-45ff-b858-73b1f8970cc4)


## 📋 Feature Summary
- **Dynamic Alert Days**: Fully configurable alert cooldown period (Settings tab).
- **Patient Management**: Add, Edit, and Delete patient profiles.
- **Test Management**: Add and Delete individual test records.
- **Search**: Real-time search functionality for the patient database.
- **Safety**: Custom Delete Confirmation modals for all destructive actions.
- **Automation**: Intelligent health alerts with "Force Alert" bypass.

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

### 2. Healtrix Tracking & Management
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
3. **Log Healtrix**: Click on a patient to add their latest BP and Blood Sugar readings.
4. **Monitor Alerts**: Check the patient's alert history to see if notifications were triggered.
5. **Adjust Settings**: Visit the settings tab to fine-tune the alert frequency (Dynamic Alert Days).
