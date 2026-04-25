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
  Pencil,
  X,
  CheckCircle2,
  Info
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Patient, TestRecord, AlertRecord, DashboardStats, AuthState } from './types';

// --- Components ---

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = "", 
  disabled = false,
  type = 'button'
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost',
  className?: string,
  disabled?: boolean,
  type?: 'button' | 'submit'
}) => {
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-50"
  };

  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  placeholder, 
  icon: Icon,
  required = false
}: { 
  label?: string, 
  type?: string, 
  value: string | number, 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  placeholder?: string,
  icon?: any,
  required?: boolean
}) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
      <input 
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 ${Icon ? 'pl-10' : 'px-4'} pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700`}
      />
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('vitaltrack_auth');
    return saved ? JSON.parse(saved) : { token: null, user: null };
  });

  const [view, setView] = useState<'dashboard' | 'patients' | 'settings'>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState<string>('');
  const [filterAgeRange, setFilterAgeRange] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDetail, setPatientDetail] = useState<{ history: TestRecord[], alerts: AlertRecord[] } | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ alert_cooldown_days: '90', admin_notification_email: 'dineshts465@gmail.com' });
  
  // Modals
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [showAddTest, setShowAddTest] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean, 
    title: string, 
    message: string, 
    onConfirm: () => void,
    confirmText?: string,
    variant?: 'danger' | 'primary' | 'secondary'
  } | null>(null);
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [newPatient, setNewPatient] = useState({ 
    name: '', 
    email: '', 
    age: '', 
    gender: '', 
    patient_type: 'Patient', 
    employee_code: '', 
    uin_number: '',
    phone: ''
  });
  const [editPatientForm, setEditPatientForm] = useState({ 
    name: '', 
    email: '', 
    age: '', 
    gender: '', 
    patient_type: '', 
    employee_code: '', 
    uin_number: '',
    phone: ''
  });
  const [newTest, setNewTest] = useState({ 
    bp_sys: '', 
    bp_dia: '', 
    blood_sugar: '', 
    sugar_type: 'Random',
    cholesterol: '',
    pulse_rate: '',
    bypass_cooldown: false 
  });
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uinError, setUinError] = useState("");

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      // Search check
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.id.toString().includes(searchQuery);
      
      if (!matchesSearch) return false;

      // Gender filter
      if (filterGender && p.gender !== filterGender) return false;

      // Age filter
      if (filterAgeRange) {
        const age = p.age || 0;
        if (filterAgeRange === '0-18' && age > 18) return false;
        if (filterAgeRange === '19-35' && (age < 19 || age > 35)) return false;
        if (filterAgeRange === '36-50' && (age < 36 || age > 50)) return false;
        if (filterAgeRange === '50+' && age <= 50) return false;
      }

      // Status filter
      if (filterStatus) {
        const [sys, dia] = p.latest_bp ? p.latest_bp.split('/').map(Number) : [0, 0];
        const sugar = p.latest_sugar || 0;
        const sugarType = p.latest_sugar_type || 'Random';
        const cholesterol = p.latest_cholesterol || 0;
        
        const sugarHigh = sugarType === 'Fasting' ? sugar > 100 : sugar >= 140;
        const isHigh = p.latest_bp && (sys >= 140 || dia >= 90 || sugarHigh || cholesterol >= 200);
        
        if (filterStatus === 'high' && !isHigh) return false;
        if (filterStatus === 'normal' && isHigh) return false;
        if (filterStatus === 'normal' && !p.latest_bp) return false;
      }

      // Type filter
      if (filterType && p.patient_type !== filterType) return false;

      return true;
    });
  }, [patients, searchQuery, filterGender, filterAgeRange, filterStatus, filterType]);

  useEffect(() => {
    localStorage.setItem('vitaltrack_auth', JSON.stringify(auth));
    if (auth.token) {
      fetchDashboardData();
      fetchPatients();
      fetchSettings();
    }
  }, [auth.token]);

  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(auth.token ? { 'Authorization': `Bearer ${auth.token}` } : {}),
      ...options.headers
    };

    const response = await fetch(endpoint, { ...options, headers });
    if (response.status === 401) {
      setAuth({ token: null, user: null });
      return null;
    }
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Something went wrong');
    }
    return response.json();
  };

  const fetchDashboardData = async () => {
    try {
      const [statsData, trendsData] = await Promise.all([
        apiFetch('/api/dashboard/stats'),
        apiFetch('/api/trends')
      ]);
      setStats(statsData);
      setTrends(trendsData);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const fetchPatients = async () => {
    try {
      const data = await apiFetch(`/api/patients?search=${searchQuery}`);
      setPatients(data);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await apiFetch('/api/settings');
      if (data) setSettings(data);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const fetchPatientDetail = async (id: number) => {
    try {
      const data = await apiFetch(`/api/patients/${id}`);
      setSelectedPatient(data.patient);
      setPatientDetail({ history: data.history, alerts: data.alerts });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm)
      });
      setAuth(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/api/patients', {
        method: 'POST',
        body: JSON.stringify({ ...newPatient, age: parseInt(newPatient.age) })
      });
      setShowAddPatient(false);
      setNewPatient({ 
        name: '', 
        email: '', 
        age: '', 
        gender: '', 
        patient_type: 'Patient', 
        employee_code: '', 
        uin_number: '',
        phone: ''
      });
      fetchPatients();
      fetchDashboardData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setLoading(true);
    try {
      await apiFetch(`/api/patients/${selectedPatient.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...editPatientForm, age: parseInt(editPatientForm.age) })
      });
      setShowEditPatient(false);
      fetchPatientDetail(selectedPatient.id);
      fetchPatients();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerEmail = async () => {
    if (!selectedPatient) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Trigger Email',
      message: `Are you sure you want to manually trigger a health update email to ${selectedPatient.name} at ${selectedPatient.email}?`,
      confirmText: 'Send Email',
      variant: 'primary',
      onConfirm: async () => {
        setLoading(true);
        setConfirmModal(null);
        try {
          const result = await apiFetch(`/api/patients/${selectedPatient.id}/trigger-email`, {
            method: 'POST'
          });
          if (result.success) {
            setSuccess(`Email notification successfully sent to ${selectedPatient.email}`);
            setTimeout(() => setSuccess(null), 5000);
            fetchPatientDetail(selectedPatient.id);
          } else {
            setError(`Failed to trigger email: ${result.error}`);
          }
        } catch (e: any) {
          setError(`Error: ${e.message}`);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleAddTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    
    const bpSys = parseInt(newTest.bp_sys);
    const bpDia = parseInt(newTest.bp_dia);
    const sugar = parseInt(newTest.blood_sugar);

    if (bpSys >= 500 || bpDia >= 500) {
      setError("Blood pressure values must be below 500");
      return;
    }
    if (sugar >= 1000) {
      setError("Blood sugar value must be below 1000");
      return;
    }

    setShowConfirmSave(true);
  };

  const confirmAndSaveTest = async () => {
    if (!selectedPatient) return;
    
    const bpSys = parseInt(newTest.bp_sys);
    const bpDia = parseInt(newTest.bp_dia);
    const sugar = parseInt(newTest.blood_sugar);
    const chol = parseInt(newTest.cholesterol) || 0;
    const pulse = parseInt(newTest.pulse_rate) || 0;

    setLoading(true);
    setShowConfirmSave(false);
    try {
      await apiFetch('/api/tests', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          bp_sys: bpSys,
          bp_dia: bpDia,
          blood_sugar: sugar,
          sugar_type: newTest.sugar_type,
          cholesterol: chol,
          pulse_rate: pulse,
          bypass_cooldown: newTest.bypass_cooldown
        })
      });
      setSuccess('Health record saved successfully.');
      setTimeout(() => setSuccess(null), 5000);
      setShowAddTest(false);
      setNewTest({ 
        bp_sys: '', 
        bp_dia: '', 
        blood_sugar: '', 
        sugar_type: 'Random', 
        cholesterol: '', 
        pulse_rate: '',
        bypass_cooldown: false 
      });
      fetchPatientDetail(selectedPatient.id);
      fetchPatients();
      fetchDashboardData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatient = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Patient',
      message: 'Are you sure you want to delete this patient and all their records? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/patients/${id}`, { method: 'DELETE' });
          setSelectedPatient(null);
          fetchPatients();
          fetchDashboardData();
          setConfirmModal(null);
        } catch (e: any) {
          setError(e.message);
        }
      }
    });
  };

  const handleDeleteTest = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Test Record',
      message: 'Are you sure you want to delete this test record?',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/tests/${id}`, { method: 'DELETE' });
          if (selectedPatient) fetchPatientDetail(selectedPatient.id);
          fetchPatients();
          fetchDashboardData();
          setConfirmModal(null);
        } catch (e: any) {
          setError(e.message);
        }
      }
    });
  };

  if (!auth.token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Health Tracker Portal</h1>
            <p className="text-slate-500">Monitoring System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
              label="Username" 
              value={loginForm.username} 
              onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
              icon={Users}
              required
            />
            <Input 
              label="Password" 
              type="password"
              value={loginForm.password} 
              onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
              icon={ClipboardCheck}
              required
            />
            {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <Button type="submit" className="w-full py-3" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Demo Credentials</p>
            <p className="text-sm text-slate-500 mt-1">admin / admin123</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 leading-none">Health Tracker</h2>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          <button 
            onClick={() => setView('patients')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'patients' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Users className="w-5 h-5" /> Patients
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'settings' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Bell className="w-5 h-5" /> Alerts & Settings
          </button>
        </nav>

        <div className="p-4 mt-auto border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700 font-bold text-xs">
              {auth.user?.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{auth.user?.username}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">{auth.user?.role}</p>
            </div>
          </div>
          <button 
            onClick={() => setAuth({ token: null, user: null })}
            className="w-full flex items-center gap-3 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-bottom border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 capitalize">{view}</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search patients..." 
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (view === 'patients') fetchPatients();
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64"
              />
            </div>
            <Button onClick={() => setShowAddPatient(true)} variant="primary">
              <Plus className="w-4 h-4" /> New Patient
            </Button>
          </div>
        </header>

        <div className="p-8">
          {success && (
            <div className="mb-6 animate-in slide-in-from-top duration-300">
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <p className="text-sm font-bold">{success}</p>
                <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {error && view !== 'patients' && !selectedPatient && (
            <div className="mb-6 animate-in slide-in-from-top duration-300">
              <div className="bg-rose-50 border border-rose-100 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <p className="text-sm font-bold">{error}</p>
                <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {view === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Patients</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{stats?.totalPatients || 0}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" /> +12% from last month
                  </p>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tests Conducted</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{stats?.totalTests || 0}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" /> +5% from last month
                  </p>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">High Risk</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{stats?.highValuePatients || 0}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3 text-rose-500" /> -2% from last month
                  </p>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                      <History className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Follow-up</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{stats?.pendingTests || 0}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3 text-amber-500" /> Requires attention
                  </p>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-600" /> Average Blood Pressure Trend
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trends}>
                        <defs>
                          <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Area type="monotone" dataKey="avg_sys" stroke="#10b981" fillOpacity={1} fill="url(#colorSys)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-600" /> Average Blood Sugar Trend
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Line type="monotone" dataKey="avg_sugar" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {view === 'patients' && (
            <div className="space-y-6">
              {!selectedPatient ? (
                <div className="space-y-4">
                  {/* Filters Header */}
                  <Card className="p-4 bg-white">
                    <div className="flex flex-wrap gap-4 items-end">
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Gender</label>
                        <select 
                          value={filterGender}
                          onChange={e => setFilterGender(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">All Genders</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Age Range</label>
                        <select 
                          value={filterAgeRange}
                          onChange={e => setFilterAgeRange(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">All Ages</option>
                          <option value="0-18">0 - 18</option>
                          <option value="19-35">19 - 35</option>
                          <option value="36-50">36 - 50</option>
                          <option value="50+">50+</option>
                        </select>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Health Status</label>
                        <select 
                          value={filterStatus}
                          onChange={e => setFilterStatus(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">All Statuses</option>
                          <option value="normal">Normal</option>
                          <option value="high">High Risk</option>
                        </select>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">User Type</label>
                        <select 
                          value={filterType}
                          onChange={e => setFilterType(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">All Types</option>
                          <option value="Patient">Patient</option>
                          <option value="Employee">Employee</option>
                        </select>
                      </div>
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setFilterGender('');
                          setFilterAgeRange('');
                          setFilterStatus('');
                          setFilterType('');
                          setSearchQuery('');
                        }}
                        className="text-xs"
                      >
                        Reset Filters
                      </Button>
                    </div>
                  </Card>

                  <Card>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Patient</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Gender</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Age</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Latest Test</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredPatients.map(p => {
                          const [sys, dia] = p.latest_bp ? p.latest_bp.split('/').map(Number) : [0, 0];
                          const sugar = p.latest_sugar || 0;
                          const sugarType = p.latest_sugar_type || 'Random';
                          const cholesterol = p.latest_cholesterol || 0;
                          
                          const sugarHigh = sugarType === 'Fasting' ? sugar > 100 : sugar >= 140;
                          const isHigh = p.latest_bp && (sys >= 140 || dia >= 90 || sugarHigh || cholesterol >= 200);
                          
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-all cursor-pointer group" onClick={() => fetchPatientDetail(p.id)}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold">
                                    {p.name[0]}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">{p.name}</p>
                                    <div className="flex flex-col">
                                      <p className="text-xs text-slate-500">{p.email}</p>
                                      {p.phone && <p className="text-[10px] text-emerald-600 font-bold">{p.phone}</p>}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  p.patient_type === 'Employee' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                                }`}>
                                  {p.patient_type || 'Patient'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  p.gender === 'Male' ? 'bg-blue-50 text-blue-600' : 
                                  p.gender === 'Female' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {p.gender || 'N/A'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">{p.age || 'N/A'}</td>
                            <td className="px-6 py-4">
                              {p.latest_test_date ? (
                                <div>
                                  <p className="text-sm font-semibold text-slate-700">{p.latest_bp} mmHg</p>
                                  <p className="text-[10px] text-slate-400">{format(parseISO(p.latest_test_date), 'MMM d, yyyy')}</p>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No tests yet</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {isHigh ? (
                                <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase rounded-lg border border-rose-100">High Risk</span>
                              ) : (
                                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-lg border border-emerald-100">Normal</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="p-2 text-slate-400 hover:text-emerald-600 transition-all">
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Button onClick={() => setSelectedPatient(null)} variant="ghost">
                      <History className="w-4 h-4 rotate-180" /> Back to List
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={() => handleTriggerEmail()} variant="secondary">
                      <Mail className="w-4 h-4" /> Trigger Email
                    </Button>
                    <Button onClick={() => setShowAddTest(true)} variant="primary">
                      <Plus className="w-4 h-4" /> Add Test Result
                    </Button>
                    <Button onClick={() => {
                      setEditPatientForm({
                        name: selectedPatient.name,
                        email: selectedPatient.email,
                        age: selectedPatient.age?.toString() || '',
                        gender: selectedPatient.gender || '',
                        patient_type: selectedPatient.patient_type || 'Patient',
                        employee_code: selectedPatient.employee_code || '',
                        uin_number: selectedPatient.uin_number || '',
                        phone: selectedPatient.phone || ''
                      });
                      setShowEditPatient(true);
                    }} variant="secondary">
                      <Pencil className="w-4 h-4" /> Edit Profile
                    </Button>
                    <Button onClick={() => handleDeletePatient(selectedPatient.id)} variant="danger">
                      <Trash2 className="w-4 h-4" /> Delete Patient
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Patient Profile */}
                    <Card className="p-6 h-fit">
                      <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-24 h-24 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-700 text-3xl font-bold mb-4">
                          {selectedPatient.name[0]}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">{selectedPatient.name}</h3>
                        <p className="text-slate-500 text-sm">{selectedPatient.email}</p>
                        {selectedPatient.phone && <p className="text-emerald-600 text-xs font-bold mt-1">{selectedPatient.phone}</p>}
                        <div className="flex gap-2 mt-4 flex-wrap justify-center">
                          <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">Age: {selectedPatient.age}</span>
                          <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">Gender: {selectedPatient.gender}</span>
                          <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">Type: {selectedPatient.patient_type}</span>
                          <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">ID: {selectedPatient.id}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-3 bg-slate-50 rounded-xl flex flex-col items-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Latest BP</p>
                          <p className="text-sm font-bold text-slate-700">{selectedPatient.latest_bp || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl flex flex-col items-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Latest Cholesterol</p>
                          <p className="text-sm font-bold text-slate-700">{selectedPatient.latest_cholesterol || '0'} mg/dL</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl flex flex-col items-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Latest Pulse</p>
                          <p className="text-sm font-bold text-slate-700">{selectedPatient.latest_pulse || '0'} bpm</p>
                        </div>
                      </div>

                      <div className="space-y-4 pt-6 border-t border-slate-100">
                        {selectedPatient.patient_type === 'Employee' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Employee Code</span>
                            <span className="font-semibold text-slate-700">{selectedPatient.employee_code}</span>
                          </div>
                        )}
                        {selectedPatient.patient_type === 'Patient' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">UIN Number</span>
                            <span className="font-semibold text-slate-700">{selectedPatient.uin_number}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Registered</span>
                          <span className="font-semibold text-slate-700">{format(parseISO(selectedPatient.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Last Alert</span>
                          <span className="font-semibold text-slate-700">
                            {selectedPatient.last_alert_sent_at ? format(parseISO(selectedPatient.last_alert_sent_at), 'MMM d, yyyy') : 'None'}
                          </span>
                        </div>
                      </div>
                    </Card>

                    {/* Systemic Details */}
                    <div className="lg:col-span-2 space-y-6">
                      <Card>
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                          <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <History className="w-5 h-5 text-emerald-600" /> Systemic Details
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-3">Date Entered</th>
                                <th className="px-6 py-3">BP (Sys/Dia)</th>
                                <th className="px-6 py-3">Sugar</th>
                                <th className="px-6 py-3">Cholesterol</th>
                                <th className="px-6 py-3">Pulse</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {patientDetail?.history.map(test => {
                                let sugarStatus = 'Normal';
                                if (test.blood_sugar < 70) sugarStatus = 'Hypoglycemia';
                                else if (test.sugar_type === 'Fasting') {
                                  if (test.blood_sugar >= 126) sugarStatus = 'Diabetes';
                                  else if (test.blood_sugar >= 100) sugarStatus = 'Prediabetes';
                                } else {
                                  if (test.blood_sugar >= 200) sugarStatus = 'Diabetes';
                                  else if (test.blood_sugar >= 140) sugarStatus = 'Prediabetes';
                                }

                                let bpStatus = 'Normal';
                                const s = test.bp_sys;
                                const d = test.bp_dia;

                                if (s >= 180 || d >= 120) bpStatus = 'Crisis';
                                else if (s >= 140 || d >= 90) bpStatus = 'Stage 2';
                                else if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89)) bpStatus = 'Stage 1';
                                else if (s >= 120 && s <= 129 && d < 80) bpStatus = 'Elevated';
                                else if (s < 90 || d < 60) bpStatus = 'Hypotension';
                                else if (s < 120 && d < 80) bpStatus = 'Normal';

                                return (
                                <tr key={test.id} className="group">
                                  <td className="px-6 py-4 text-sm text-slate-600">{format(parseISO(test.test_date), 'MMM d, yyyy HH:mm')}</td>
                                  <td className="px-6 py-4">
                                    <div>
                                      <p className={`font-bold ${bpStatus === 'Crisis' || bpStatus === 'Stage 2' || bpStatus === 'Hypotension' ? 'text-rose-600' : bpStatus === 'Stage 1' || bpStatus === 'Elevated' ? 'text-amber-600' : 'text-slate-700'}`}>
                                        {test.bp_sys}/{test.bp_dia}
                                      </p>
                                      <p className="text-[10px] text-slate-500 uppercase font-bold">{bpStatus}</p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div>
                                      <p className={`font-bold ${sugarStatus === 'Diabetes' || sugarStatus === 'Hypoglycemia' ? 'text-rose-600' : sugarStatus === 'Prediabetes' ? 'text-amber-600' : 'text-slate-700'}`}>
                                        {test.blood_sugar} mg/dL
                                      </p>
                                      <p className="text-[10px] text-slate-500 uppercase font-bold">{test.sugar_type} • {sugarStatus}</p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`font-bold ${test.cholesterol >= 200 ? 'text-rose-600' : 'text-slate-700'}`}>
                                      {test.cholesterol || '0'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`font-bold ${test.pulse_rate < 50 || test.pulse_rate > 100 ? 'text-rose-600' : 'text-slate-700'}`}>
                                      {test.pulse_rate || '0'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button 
                                      onClick={() => handleDeleteTest(test.id)}
                                      className="p-2 text-slate-300 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
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
                      </Card>

                      <Card>
                        <div className="p-6 border-b border-slate-50">
                          <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Bell className="w-5 h-5 text-amber-600" /> Alert Log
                          </h3>
                        </div>
                        <div className="p-6 space-y-4">
                          {patientDetail?.alerts.map(alert => (
                            <div key={alert.id} className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                                <Mail className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-amber-900">Health Alert Sent: {alert.type}</p>
                                <p className="text-xs text-amber-700 mt-1">{alert.value_summary}</p>
                                <p className="text-[10px] text-amber-500 mt-2 font-bold uppercase">{format(parseISO(alert.sent_at), 'MMM d, yyyy HH:mm')}</p>
                              </div>
                            </div>
                          ))}
                          {patientDetail?.alerts.length === 0 && (
                            <div className="text-center py-8 text-slate-400 italic text-sm">No alerts sent to this patient.</div>
                          )}
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card className="p-8">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Bell className="w-6 h-6 text-emerald-600" /> Alert Configuration
                </h3>
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                    <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-800">
                      Alerts are automatically sent to patients when their vital signs exceed normal ranges. 
                      The cooldown period prevents multiple alerts for the same condition within a short timeframe.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Input 
                      label="Alert Cooldown (Days)" 
                      type="number"
                      value={settings.alert_cooldown_days}
                      onChange={e => setSettings({ ...settings, alert_cooldown_days: e.target.value })}
                      placeholder="e.g. 90"
                    />
                    <Input 
                      label="Admin Notification Email" 
                      type="email"
                      value={settings.admin_notification_email}
                      onChange={e => setSettings({ ...settings, admin_notification_email: e.target.value })}
                      placeholder="e.g. admin@example.com"
                    />
                    <Button 
                      onClick={async () => {
                        try {
                          await apiFetch('/api/settings', {
                            method: 'POST',
                            body: JSON.stringify(settings)
                          });
                          setSuccess('Settings updated successfully');
                          setTimeout(() => setSuccess(null), 3000);
                        } catch (e: any) {
                          setError(e.message);
                        }
                      }}
                      className="w-full"
                    >
                      Save Configuration
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-8 border-rose-100">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-rose-600" /> System Status
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-sm font-bold text-slate-700">Database Engine</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 uppercase">Operational</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-sm font-bold text-slate-700">Email Gateway</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 uppercase">Connected</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
          <Card className="w-full max-w-sm p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-500 text-sm mb-8">{confirmModal.message}</p>
              <div className="flex gap-3 w-full">
                <Button onClick={() => setConfirmModal(null)} variant="secondary" className="flex-1">Cancel</Button>
                <Button 
                  onClick={confirmModal.onConfirm} 
                  variant={confirmModal.variant || 'danger'} 
                  className="flex-1 shadow-lg"
                >
                  {confirmModal.confirmText || 'Delete'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showConfirmSave && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
          <Card className="w-full max-w-sm p-8 shadow-2xl border-rose-100">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Confirm Save</h3>
              <p className="text-slate-500 text-sm">
                Are you sure you want to save this health record? Once saved, it will be added to the patient's history and alerts may be triggered.
              </p>
              <div className="grid grid-cols-2 gap-4 w-full pt-4">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowConfirmSave(false)}
                  className="w-full border-slate-200 hover:border-slate-300"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmAndSaveTest}
                  variant="primary"
                  className="w-full shadow-lg shadow-emerald-200"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Confirm Save'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showAddPatient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <Card className="w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Register Patient</h3>
              <button onClick={() => setShowAddPatient(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <Input 
                label="Full Name" 
                value={newPatient.name} 
                onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
                required
              />
              <Input 
                label="Email Address" 
                type="email"
                value={newPatient.email} 
                onChange={e => setNewPatient({ ...newPatient, email: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gender</label>
                  <select 
                    value={newPatient.gender}
                    onChange={e => setNewPatient({ ...newPatient, gender: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Input 
                  label="Age" 
                  type="number"
                  value={newPatient.age} 
                  onChange={e => setNewPatient({ ...newPatient, age: e.target.value })}
                  required
                />
              </div>

              <Input 
                label="Phone Number" 
                type="tel"
                value={newPatient.phone} 
                onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })}
                placeholder="e.g. +91 9876543210"
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Type</label>
                <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
                  {['Patient', 'Employee'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewPatient({ ...newPatient, patient_type: type })}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${newPatient.patient_type === type ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {newPatient.patient_type === 'Employee' ? (
                <Input 
                  label="Employee Code" 
                  value={newPatient.employee_code} 
                  onChange={e => setNewPatient({ ...newPatient, employee_code: e.target.value })}
                  required
                />
              ) : (
                <div className="space-y-1.5">
                  <Input 
                    label="UIN Number" 
                    value={newPatient.uin_number} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setNewPatient({ ...newPatient, uin_number: val });
                      if (val.length > 0 && val.length < 10) {
                        setUinError("UIN must be exactly 10 digits");
                      } else {
                        setUinError("");
                      }
                    }}
                    placeholder="Enter 10-digit UIN"
                    required
                  />
                  {uinError && <p className="text-[10px] text-rose-500 font-bold uppercase">{uinError}</p>}
                </div>
              )}

              <Button type="submit" className="w-full py-3" disabled={loading || (newPatient.patient_type === 'Patient' && newPatient.uin_number.length !== 10)}>
                {loading ? 'Registering...' : 'Complete Registration'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {showEditPatient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <Card className="w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Edit Patient Profile</h3>
              <button onClick={() => setShowEditPatient(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleEditPatient} className="space-y-4">
              <Input 
                label="Full Name" 
                value={editPatientForm.name} 
                onChange={e => setEditPatientForm({ ...editPatientForm, name: e.target.value })}
                required
              />
              <Input 
                label="Email Address" 
                type="email"
                value={editPatientForm.email} 
                onChange={e => setEditPatientForm({ ...editPatientForm, email: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gender</label>
                  <select 
                    value={editPatientForm.gender}
                    onChange={e => setEditPatientForm({ ...editPatientForm, gender: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Input 
                  label="Age" 
                  type="number"
                  value={editPatientForm.age} 
                  onChange={e => setEditPatientForm({ ...editPatientForm, age: e.target.value })}
                  required
                />
              </div>

              <Input 
                label="Phone Number" 
                type="tel"
                value={editPatientForm.phone} 
                onChange={e => setEditPatientForm({ ...editPatientForm, phone: e.target.value })}
                placeholder="e.g. +91 9876543210"
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Type</label>
                <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
                  {['Patient', 'Employee'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditPatientForm({ ...editPatientForm, patient_type: type })}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${editPatientForm.patient_type === type ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {editPatientForm.patient_type === 'Employee' ? (
                <Input 
                  label="Employee Code" 
                  value={editPatientForm.employee_code} 
                  onChange={e => setEditPatientForm({ ...editPatientForm, employee_code: e.target.value })}
                  required
                />
              ) : (
                <div className="space-y-1.5">
                  <Input 
                    label="UIN Number" 
                    value={editPatientForm.uin_number} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setEditPatientForm({ ...editPatientForm, uin_number: val });
                      if (val.length > 0 && val.length < 10) {
                        setUinError("UIN must be exactly 10 digits");
                      } else {
                        setUinError("");
                      }
                    }}
                    placeholder="Enter 10-digit UIN"
                    required
                  />
                  {uinError && <p className="text-[10px] text-rose-500 font-bold uppercase">{uinError}</p>}
                </div>
              )}

              <Button type="submit" className="w-full py-3" disabled={loading || (editPatientForm.patient_type === 'Patient' && editPatientForm.uin_number.length !== 10)}>
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {showAddTest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-6 overscroll-none">
          <Card className="w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Add Test Result</h3>
              <button onClick={() => setShowAddTest(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-blue-800 space-y-1">
                  <p className="font-bold uppercase tracking-wider">Sugar Level Reference:</p>
                  <p>• Normal: Fasting ≤100 mg/dL | Post-meal {'<'}140 mg/dL</p>
                  <p>• Prediabetes: Fasting 100-125 | Post-meal 140-199</p>
                  <p>• Diabetes: Fasting ≥126 | Post-meal ≥200</p>
                  <p>• Hypoglycemia: {'<'}70 mg/dL</p>
                </div>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-800 space-y-1">
                  <p className="font-bold uppercase tracking-wider text-amber-900">BP Level Reference:</p>
                  <p>• Normal: {'<'}120 / {'<'}80 mmHg</p>
                  <p>• Elevated: 120-129 / {'<'}80</p>
                  <p>• Stage 1: 130-139 / 80-89</p>
                  <p>• Stage 2: ≥140 / ≥90</p>
                  <p>• Crisis: {'>'}180 / {'>'}120</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAddTest} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Systolic BP" 
                  type="number"
                  value={newTest.bp_sys} 
                  onChange={e => setNewTest({ ...newTest, bp_sys: e.target.value })}
                  placeholder="e.g. 120 (max 499)"
                  required
                />
                <Input 
                  label="Diastolic BP" 
                  type="number"
                  value={newTest.bp_dia} 
                  onChange={e => setNewTest({ ...newTest, bp_dia: e.target.value })}
                  placeholder="e.g. 80 (max 499)"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sugar Test Type</label>
                  <select 
                    value={newTest.sugar_type}
                    onChange={e => setNewTest({ ...newTest, sugar_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700"
                    required
                  >
                    <option value="Random">Random</option>
                    <option value="Fasting">Fasting</option>
                    <option value="Post Prandial">After Eating</option>
                    <option value="HbA1c">HbA1c</option>
                  </select>
                </div>
                <Input 
                  label="Sugar Level (mg/dL)" 
                  type="number"
                  value={newTest.blood_sugar} 
                  onChange={e => setNewTest({ ...newTest, blood_sugar: e.target.value })}
                  placeholder="e.g. 100 (max 999)"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Cholesterol (mg/dL)" 
                  type="number"
                  value={newTest.cholesterol} 
                  onChange={e => setNewTest({ ...newTest, cholesterol: e.target.value })}
                  placeholder="e.g. 180"
                />
                <Input 
                  label="Pulse Rate (bpm)" 
                  type="number"
                  value={newTest.pulse_rate} 
                  onChange={e => setNewTest({ ...newTest, pulse_rate: e.target.value })}
                  placeholder="e.g. 72"
                />
              </div>
              
              <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer border border-slate-200 hover:border-emerald-500 transition-all">
                <input 
                  type="checkbox" 
                  checked={newTest.bypass_cooldown}
                  onChange={e => setNewTest({ ...newTest, bypass_cooldown: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">Force Alert Notification</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Bypass 90-day cooldown rule</p>
                </div>
              </label>

              {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

              <Button type="submit" className="w-full py-3" disabled={loading}>
                {loading ? 'Saving Record...' : 'Save Test Result'}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
