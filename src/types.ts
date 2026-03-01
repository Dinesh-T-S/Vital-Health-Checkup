export interface Patient {
  id: number;
  name: string;
  email: string;
  age: number | null;
  created_at: string;
  last_alert_sent_at: string | null;
  latest_test_date?: string;
  latest_bp?: string;
  latest_sugar?: number;
}

export interface TestRecord {
  id: number;
  patient_id: number;
  bp_sys: number;
  bp_dia: number;
  blood_sugar: number;
  test_date: string;
}

export interface AlertRecord {
  id: number;
  patient_id: number;
  type: string;
  value_summary: string;
  sent_at: string;
}

export interface DashboardStats {
  totalPatients: number;
  totalTests: number;
  highValuePatients: number;
  pendingTests: number;
  completedTests: number;
}

export interface AuthState {
  token: string | null;
  user: { username: string; role: string } | null;
}
