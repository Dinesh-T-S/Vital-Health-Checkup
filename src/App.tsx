import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Users, 
  ClipboardCheck, 
  AlertTriangle, 
  Search, 
  Plus, 
  ChevronRight, 
  LogOut, 
  LayoutDashboard, 
  UserPlus, 
  History, 
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Mail,
  Calendar,
  Heart,
  Droplets,
  Trash2,
  X,
  CheckCircle2,
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, parseISO, subMonths, isAfter } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Patient, TestRecord, AlertRecord, DashboardStats, AuthState } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-zinc-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-zinc-900">{value}</h3>
      {trend && (
        <div className={cn("flex items-center mt-2 text-xs font-medium", trend > 0 ? "text-emerald-600" : "text-rose-600")}>
          {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {Math.abs(trend)}% from last month
        </div>
      )}
    </div>
    <div className={cn("p-3 rounded-xl", color)}>
      <Icon className="w-5 h-5 text-white" />
    </div>
  </div>
);

export default function App() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('vitaltrack_auth');
    return saved ? JSON.parse(saved) : { token: null, user: null };
  });
  const [view, setView] = useState<'dashboard' | 'patients' | 'patient-detail' | 'settings'>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientDetail, setPatientDetail] = useState<{ patient: Patient, history: TestRecord[], alerts: AlertRecord[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [isAddingTest, setIsAddingTest] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trends, setTrends] = useState<any[]>([]);
  const [settings, setSettings] = useState<{ alert_cooldown_days: string }>({ alert_cooldown_days: '90' });
  
  // Custom UI states for sandboxed environment
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);
  const [toasts, setToasts] = useState<{ id: number, message: string, type: 'success' | 'error' | 'info' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  // Form states
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [patientForm, setPatientForm] = useState({ name: '', email: '', age: '' });
  const [testForm, setTestForm] = useState({ bp_sys: 120, bp_dia: 80, blood_sugar: 90 });

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const headers = {
      'Content-Type': 'application/json',
      ...(auth.token ? { 'Authorization': `Bearer ${auth.token}` } : {}),
      ...options.headers,
    };

    try {
      const res = await fetch(url, { 
        ...options, 
        headers,
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      if (res.status === 401) {
        handleLogout();
        throw new Error('Unauthorized');
      }

      const text = await res.text();
      console.log(`[CLIENT] apiFetch ${url} - Status: ${res.status}, Body: ${text.substring(0, 100)}`);
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error("Failed to parse JSON:", text);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. The server might be busy or the email is taking too long.');
      }
      throw err;
    }
  };

  useEffect(() => {
    if (auth.token) {
      loadDashboard();
    }
  }, [auth.token]);

  const loadDashboard = async () => {
    try {
      const [statsData, patientsData, trendsData, settingsData] = await Promise.all([
        apiFetch('/api/dashboard/stats'),
        apiFetch('/api/patients'),
        apiFetch('/api/trends'),
        apiFetch('/api/settings')
      ]);
      setStats(statsData);
      setPatients(patientsData);
      setTrends(trendsData);
      setSettings(settingsData);
    } catch (e) {
      console.error("Failed to load dashboard", e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm)
      });
      if (data.token) {
        const newAuth = { token: data.token, user: data.user };
        setAuth(newAuth);
        localStorage.setItem('vitaltrack_auth', JSON.stringify(newAuth));
      }
    } catch (err) {
      addToast('Login failed', 'error');
    }
  };

  const handleLogout = () => {
    setAuth({ token: null, user: null });
    localStorage.removeItem('vitaltrack_auth');
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/patients', {
      method: 'POST',
      body: JSON.stringify({ ...patientForm, age: parseInt(patientForm.age) || null })
    });
    setIsAddingPatient(false);
    setPatientForm({ name: '', email: '', age: '' });
    loadDashboard();
  };

  const handleEditPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    await apiFetch(`/api/patients/${selectedPatientId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...patientForm, age: parseInt(patientForm.age) || null })
    });
    setIsEditingPatient(false);
    loadPatientDetail(selectedPatientId);
    loadDashboard();
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setIsSubmitting(true);
    try {
      const data = await apiFetch('/api/tests', {
        method: 'POST',
        body: JSON.stringify({ ...testForm, patient_id: selectedPatientId })
      });
      console.log("Test result response:", data);
      if (data.alertTriggered) {
        if (data.emailStatus === 'sent') {
          addToast("Health Alert: An email notification has been sent to the patient due to high readings.", 'success');
        } else if (data.emailStatus === 'failed') {
          addToast(`Health Alert: High readings detected, but email failed to send: ${data.emailError}`, 'error');
        } else {
          addToast("Health Alert: High readings detected. (Email logged to console)", 'info');
        }
      } else if (data.reason) {
        addToast(data.reason, 'info');
      }
      setIsAddingTest(false);
      setTestForm({ bp_sys: 120, bp_dia: 80, blood_sugar: 90 });
      if (view === 'patient-detail') {
        loadPatientDetail(selectedPatientId);
      }
      loadDashboard();
    } catch (error: any) {
      console.error("Add test error:", error);
      addToast(`Error adding test: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePatient = async (patientId: number) => {
    console.log("handleDeletePatient called", patientId);
    showConfirm(
      "Delete Patient",
      "Are you sure you want to delete this patient and all their records? This action cannot be undone.",
      async () => {
        try {
          setIsSubmitting(true);
          const result = await apiFetch(`/api/patients/${patientId}`, { method: 'DELETE' });
          console.log("Delete patient result:", result);
          addToast("Patient deleted successfully", 'success');
          setView('patients');
          await loadDashboard();
        } catch (error: any) {
          console.error("Delete patient error:", error);
          addToast(`Error deleting patient: ${error.message}`, 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleDeleteTest = async (testId: number) => {
    console.log("handleDeleteTest called", testId);
    showConfirm(
      "Delete Test Record",
      "Are you sure you want to delete this test record?",
      async () => {
        try {
          setIsSubmitting(true);
          const result = await apiFetch(`/api/tests/${testId}`, { method: 'DELETE' });
          console.log("Delete test result:", result);
          addToast("Test record deleted successfully", 'success');
          if (selectedPatientId) {
            await loadPatientDetail(selectedPatientId);
          }
          await loadDashboard();
        } catch (error: any) {
          console.error("Delete test error:", error);
          addToast(`Error deleting test: ${error.message}`, 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
      addToast("Settings updated successfully", 'success');
    } catch (error: any) {
      addToast(`Error updating settings: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadPatientDetail = async (id: number) => {
    const data = await apiFetch(`/api/patients/${id}`);
    setPatientDetail(data);
    setSelectedPatientId(id);
    setView('patient-detail');
  };

  const filteredPatients = useMemo(() => {
    return patients.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [patients, searchQuery]);

  if (!auth.token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-zinc-200 shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <Activity className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">Healtrix</h1>
            <p className="text-zinc-500 text-sm">Patient Health Monitoring System</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Username</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="admin"
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Password</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                required
              />
            </div>
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-200">
              Sign In
            </button>
          </form>
          <div className="mt-6 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
            <p className="text-center text-xs text-zinc-500">
              Demo Credentials:<br/>
              <span className="font-bold">admin / admin123</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 hidden lg:flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Activity className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">Healtrix</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          <button 
            onClick={() => setView('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
              view === 'dashboard' ? "bg-emerald-50 text-emerald-700" : "text-zinc-500 hover:bg-zinc-100"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button 
            onClick={() => setView('patients')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
              view === 'patients' ? "bg-emerald-50 text-emerald-700" : "text-zinc-500 hover:bg-zinc-100"
            )}
          >
            <Users className="w-4 h-4" />
            Patients
          </button>
          <button 
            onClick={() => setView('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
              view === 'settings' ? "bg-emerald-50 text-emerald-700" : "text-zinc-500 hover:bg-zinc-100"
            )}
          >
            <Filter className="w-4 h-4" />
            Settings
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-200">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-zinc-600">{auth.user?.username[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900 truncate">{auth.user?.username}</p>
              <p className="text-xs text-zinc-500 truncate capitalize">{auth.user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-zinc-400 hover:text-rose-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-zinc-200 sticky top-0 z-10 px-8 py-4 flex items-center justify-between lg:hidden">
           <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Activity className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">Healtrix</span>
          </div>
          <button onClick={() => setView('dashboard')} className="p-2 text-zinc-500"><LayoutDashboard className="w-6 h-6" /></button>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {view === 'dashboard' && (
            <div className="space-y-8">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-zinc-900">Dashboard</h2>
                  <p className="text-zinc-500">Welcome back, {auth.user?.username}. Here's what's happening today.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsAddingPatient(true)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-100"
                  >
                    <UserPlus className="w-4 h-4" />
                    New Patient
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Total Patients" 
                  value={stats?.totalPatients || 0} 
                  icon={Users} 
                  color="bg-blue-500"
                />
                <StatCard 
                  title="Tests Completed" 
                  value={stats?.totalTests || 0} 
                  icon={ClipboardCheck} 
                  color="bg-emerald-500"
                />
                <StatCard 
                  title="High Risk Patients" 
                  value={stats?.highValuePatients || 0} 
                  icon={AlertTriangle} 
                  color="bg-rose-500"
                />
                <StatCard 
                  title="Pending Checks" 
                  value={stats?.pendingTests || 0} 
                  icon={Bell} 
                  color="bg-amber-500"
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <h3 className="text-lg font-bold text-zinc-900 mb-6">Monthly Testing Trends</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#71717a'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#71717a'}} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="test_count" name="Tests" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <h3 className="text-lg font-bold text-zinc-900 mb-6">Average Health Metrics</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#71717a'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#71717a'}} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line type="monotone" dataKey="avg_sys" name="Avg BP (Sys)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="avg_sugar" name="Avg Sugar" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recent Patients */}
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-zinc-900">Recent Patients</h3>
                  <button onClick={() => setView('patients')} className="text-emerald-600 text-sm font-bold hover:underline">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Patient</th>
                        <th className="px-6 py-4">Latest BP</th>
                        <th className="px-6 py-4">Latest Sugar</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {patients.slice(0, 5).map(p => {
                        const isHigh = (p.latest_sugar || 0) >= 120 || (p.latest_bp && (parseInt(p.latest_bp.split('/')[0]) >= 140 || parseInt(p.latest_bp.split('/')[1]) >= 90));
                        return (
                          <tr key={p.id} className="hover:bg-zinc-50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-bold text-zinc-600">
                                  {p.name[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-zinc-900">{p.name}</p>
                                  <p className="text-xs text-zinc-500">{p.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-600 font-mono">{p.latest_bp || 'N/A'}</td>
                            <td className="px-6 py-4 text-sm text-zinc-600 font-mono">{p.latest_sugar || 'N/A'}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                isHigh ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                              )}>
                                {isHigh ? 'High Risk' : 'Normal'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => loadPatientDetail(p.id)} className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {view === 'patients' && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-zinc-900">Patients</h2>
                  <p className="text-zinc-500">Manage and track your patient records.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="text" 
                      placeholder="Search patients..."
                      className="pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full md:w-64"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => setIsAddingPatient(true)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Patient
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Patient Name</th>
                        <th className="px-6 py-4">Email Address</th>
                        <th className="px-6 py-4">Latest Test</th>
                        <th className="px-6 py-4">Last Alert</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredPatients.map(p => {
                        const isHigh = (p.latest_sugar || 0) >= 120 || (p.latest_bp && (parseInt(p.latest_bp.split('/')[0]) >= 140 || parseInt(p.latest_bp.split('/')[1]) >= 90));
                        return (
                          <tr key={p.id} className="hover:bg-zinc-50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-bold text-zinc-600">
                                  {p.name[0]}
                                </div>
                                <span className="text-sm font-bold text-zinc-900">{p.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-600">{p.email}</td>
                            <td className="px-6 py-4 text-sm text-zinc-600">
                              {p.latest_test_date ? format(parseISO(p.latest_test_date), 'MMM d, yyyy') : 'No tests'}
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-600">
                              {p.last_alert_sent_at ? format(parseISO(p.last_alert_sent_at), 'MMM d, yyyy') : 'Never'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                isHigh ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                              )}>
                                {isHigh ? 'High Risk' : 'Normal'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    console.log("Delete patient button clicked", p.id);
                                    e.stopPropagation();
                                    handleDeletePatient(p.id);
                                  }}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Patient"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => loadPatientDetail(p.id)} className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors">
                                  <ChevronRight className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {view === 'patient-detail' && patientDetail && (
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <button onClick={() => setView('patients')} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <div>
                  <h2 className="text-3xl font-bold text-zinc-900">{patientDetail.patient.name}</h2>
                  <p className="text-zinc-500">
                    Patient ID: #{patientDetail.patient.id} • {patientDetail.patient.email} 
                    {patientDetail.patient.age && ` • Age: ${patientDetail.patient.age}`}
                    {patientDetail.patient.last_alert_sent_at && ` • Last Alert: ${format(parseISO(patientDetail.patient.last_alert_sent_at), 'MMM d, yyyy')}`}
                  </p>
                </div>
                <div className="ml-auto flex gap-3">
                  <button 
                    onClick={() => {
                      setPatientForm({ 
                        name: patientDetail.patient.name, 
                        email: patientDetail.patient.email, 
                        age: patientDetail.patient.age?.toString() || '' 
                      });
                      setIsEditingPatient(true);
                    }}
                    className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-zinc-50 transition-all"
                  >
                    Edit Details
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      console.log("Delete patient detail button clicked", patientDetail.patient.id);
                      handleDeletePatient(patientDetail.patient.id);
                    }}
                    className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Patient
                  </button>
                  <button 
                    onClick={() => setIsAddingTest(true)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    New Test
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Stats & Trends */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Heart className="w-5 h-5" /></div>
                        <h4 className="font-bold text-zinc-900">Blood Pressure</h4>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-zinc-900">{patientDetail.history[0]?.bp_sys || '--'}/{patientDetail.history[0]?.bp_dia || '--'}</span>
                        <span className="text-zinc-500 text-sm">mmHg</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-2">Latest reading from {patientDetail.history[0] ? format(parseISO(patientDetail.history[0].test_date), 'MMM d') : 'N/A'}</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Droplets className="w-5 h-5" /></div>
                        <h4 className="font-bold text-zinc-900">Blood Sugar</h4>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-zinc-900">{patientDetail.history[0]?.blood_sugar || '--'}</span>
                        <span className="text-zinc-500 text-sm">mg/dL</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-2">Latest reading from {patientDetail.history[0] ? format(parseISO(patientDetail.history[0].test_date), 'MMM d') : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <h3 className="text-lg font-bold text-zinc-900 mb-6">Health History</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[...patientDetail.history].reverse()}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="test_date" axisLine={false} tickLine={false} tickFormatter={(val) => format(parseISO(val), 'MMM d')} tick={{fontSize: 10, fill: '#71717a'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#71717a'}} />
                          <Tooltip 
                            labelFormatter={(val) => format(parseISO(val as string), 'MMM d, yyyy')}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Line type="monotone" dataKey="bp_sys" name="Systolic" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="blood_sugar" name="Sugar" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-200">
                      <h3 className="text-lg font-bold text-zinc-900">Test Records</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-zinc-50 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Blood Pressure</th>
                            <th className="px-6 py-4">Blood Sugar</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {patientDetail.history.map(test => {
                            const isHigh = test.blood_sugar >= 120 || test.bp_sys >= 140 || test.bp_dia >= 90;
                            return (
                              <tr key={test.id} className="hover:bg-zinc-50 transition-colors group">
                                <td className="px-6 py-4 text-sm text-zinc-600">{format(parseISO(test.test_date), 'MMM d, yyyy HH:mm')}</td>
                                <td className="px-6 py-4 text-sm font-mono text-zinc-900">{test.bp_sys}/{test.bp_dia}</td>
                                <td className="px-6 py-4 text-sm font-mono text-zinc-900">{test.blood_sugar} mg/dL</td>
                                <td className="px-6 py-4">
                                  <span className={cn(
                                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    isHigh ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                                  )}>
                                    {isHigh ? 'High' : 'Normal'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      console.log("Delete test button clicked", test.id);
                                      e.stopPropagation();
                                      handleDeleteTest(test.id);
                                    }}
                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Delete Record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Column: Alerts & Info */}
                <div className="space-y-8">
                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                    <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-amber-500" />
                      Alert History
                    </h3>
                    <div className="space-y-4">
                      {patientDetail.alerts.length === 0 ? (
                        <p className="text-sm text-zinc-500 italic">No alerts sent yet.</p>
                      ) : (
                        patientDetail.alerts.map(alert => (
                          <div key={alert.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">{alert.type} Alert</span>
                              <span className="text-[10px] text-zinc-400">{format(parseISO(alert.sent_at), 'MMM d, yyyy')}</span>
                            </div>
                            <p className="text-sm text-zinc-700 mb-2">Email sent to patient regarding high readings.</p>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                              <Mail className="w-3 h-3" />
                              {alert.value_summary}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-emerald-600 p-6 rounded-2xl text-white shadow-lg shadow-emerald-100">
                    <h3 className="text-lg font-bold mb-2">3-Month Alert Rule</h3>
                    <p className="text-emerald-100 text-sm leading-relaxed">
                      To prevent notification fatigue, alerts are only triggered once every 90 days per patient, even if values remain high.
                    </p>
                    <div className="mt-4 pt-4 border-t border-emerald-500/50 flex items-center justify-between">
                      <span className="text-xs font-medium text-emerald-100">Last Alert Sent</span>
                      <span className="text-sm font-bold">
                        {patientDetail.patient.last_alert_sent_at ? format(parseISO(patientDetail.patient.last_alert_sent_at), 'MMM d, yyyy') : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'settings' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-zinc-900">Settings</h2>
                <p className="text-zinc-500">Configure application behavior and alert rules.</p>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm max-w-2xl">
                <form onSubmit={handleUpdateSettings} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2">Alert Cooldown (Days)</label>
                    <p className="text-xs text-zinc-500 mb-4">Number of days to wait before sending another automatic alert email to the same patient.</p>
                    <div className="flex items-center gap-4">
                      <input 
                        type="number" 
                        min="1"
                        max="365"
                        className="w-32 px-4 py-2 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={settings.alert_cooldown_days}
                        onChange={e => setSettings({ ...settings, alert_cooldown_days: e.target.value })}
                        required
                      />
                      <span className="text-sm text-zinc-600 font-medium">Days</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-100">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-xl transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 max-w-2xl">
                <div className="flex gap-4">
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-amber-900 mb-1">Important Note</h4>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      Changing the alert cooldown will affect all future health tests. Existing records will follow the new rule based on their last alert date.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {isAddingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-zinc-900">New Patient</h3>
              <button onClick={() => setIsAddingPatient(false)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
                <Plus className="w-5 h-5 rotate-45 text-zinc-400" />
              </button>
            </div>
            <form onSubmit={handleAddPatient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="John Doe"
                  value={patientForm.name}
                  onChange={e => setPatientForm({...patientForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="john@example.com"
                    value={patientForm.email}
                    onChange={e => setPatientForm({...patientForm, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Age</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="30"
                    value={patientForm.age}
                    onChange={e => setPatientForm({...patientForm, age: e.target.value})}
                  />
                </div>
              </div>
              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors mt-4">
                Create Patient
              </button>
            </form>
          </div>
        </div>
      )}

      {isEditingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-zinc-900">Edit Patient Details</h3>
              <button onClick={() => setIsEditingPatient(false)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
                <Plus className="w-5 h-5 rotate-45 text-zinc-400" />
              </button>
            </div>
            <form onSubmit={handleEditPatient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="John Doe"
                  value={patientForm.name}
                  onChange={e => setPatientForm({...patientForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="john@example.com"
                    value={patientForm.email}
                    onChange={e => setPatientForm({...patientForm, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Age</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="30"
                    value={patientForm.age}
                    onChange={e => setPatientForm({...patientForm, age: e.target.value})}
                  />
                </div>
              </div>
              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors mt-4">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {isAddingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-zinc-900">Record New Test</h3>
              <button onClick={() => setIsAddingTest(false)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
                <Plus className="w-5 h-5 rotate-45 text-zinc-400" />
              </button>
            </div>
            <form onSubmit={handleAddTest} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">BP Systolic</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={testForm.bp_sys}
                    onChange={e => setTestForm({...testForm, bp_sys: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">BP Diastolic</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={testForm.bp_dia}
                    onChange={e => setTestForm({...testForm, bp_dia: parseInt(e.target.value)})}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Blood Sugar (mg/dL)</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={testForm.blood_sugar}
                  onChange={e => setTestForm({...testForm, blood_sugar: parseInt(e.target.value)})}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="bypass_cooldown"
                  checked={testForm.bypass_cooldown || false}
                  onChange={(e) => setTestForm({ ...testForm, bypass_cooldown: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-zinc-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="bypass_cooldown" className="text-sm font-medium text-zinc-700">
                  Force Alert
                </label>
              </div>
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  <span className="font-bold text-zinc-700">Thresholds:</span> High BP is 140/90 or higher. High Sugar is 120 mg/dL or higher. Alerts will be sent if these limits are reached and no recent alert has already been sent..
                </p>
              </div>
              <button 
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Test Results'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Custom Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">{confirmModal.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="p-4 bg-zinc-50 flex gap-3">
              <button 
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 text-zinc-700 font-bold text-sm hover:bg-white transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[110] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-right-full duration-300 min-w-[300px]",
              toast.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
              toast.type === 'error' ? "bg-rose-50 border-rose-100 text-rose-800" :
              "bg-zinc-900 border-zinc-800 text-white"
            )}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-zinc-400" />}
            <p className="text-sm font-bold flex-1">{toast.message}</p>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 opacity-50" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
