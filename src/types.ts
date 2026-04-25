export interface Patient {
  id: number;
  name: string;
  email: string;
  age: number | null;
  gender: string | null;
  patient_type: string | null;
  employee_code: string | null;
  uin_number: string | null;
  phone: string | null;
  created_at: string;
  last_alert_sent_at: string | null;
  latest_test_date?: string;
  latest_bp?: string;
  latest_sugar?: number;
  latest_sugar_type?: string;
  latest_cholesterol?: number;
  latest_pulse?: number;
}

export interface TestRecord {
  id: number;
  patient_id: number;
  bp_sys: number;
  bp_dia: number;
  blood_sugar: number;
  sugar_type: string;
  cholesterol: number;
  pulse_rate: number;
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
