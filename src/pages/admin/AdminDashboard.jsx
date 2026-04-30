import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Settings,
  Shield,
  UserPlus,
  ArrowRight,
  Activity,
  Database,
  Server,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { userService, academicService, inquiryService } from '../../services';
import useFetch from '../../hooks/useFetch';
import MetricCard from '../../components/dashboard/MetricCard';
import ReportChart from '../../components/reports/ReportChart';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { academicYear } = useProtectedRoute();

  // Fetch all users
  const { 
    data: usersData, 
    loading: usersLoading,
    refetch: refetchUsers
  } = useFetch(() => userService.getUsers());

  // Fetch system settings
  const { 
    data: settingsData,
    loading: settingsLoading 
  } = useFetch(() => academicService.getSystemSettings());

  // Fetch inquiries
  const { 
    data: inquiriesData,
    loading: inquiriesLoading 
  } = useFetch(() => inquiryService.getInquiries());

  // Fetch registration status
  const { 
    data: regData,
    loading: regLoading 
  } = useFetch(() => academicService.getRegistrationStatus());

  const [systemHealth, setSystemHealth] = useState({
    database: 'optimal',
    server: 'optimal',
    api: 'optimal',
    uptime: '99.9%'
  });

  const users = usersData?.users || [];
  const settings = settingsData?.settings || {};
  const inquiries = inquiriesData?.inquiries || [];
  const isRegistrationOpen = regData?.isOpen;

  // Calculate statistics
  const userStats = {
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    activeStudents: users.filter(u => u.role === 'student' && u.status === 'active').length,
    pendingStudents: users.filter(u => u.role === 'student' && u.status === 'pending').length,
    advisors: users.filter(u => u.role === 'advisor').length,
    deptHeads: users.filter(u => u.role === 'dept-head').length,
    facultyHeads: users.filter(u => u.role === 'faculty-head').length,
    admins: users.filter(u => u.role === 'admin').length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    pending: users.filter(u => u.status === 'pending').length
  };

  const pendingInquiries = inquiries.filter(i => i.status === 'pending').length;

  // Chart data
  const userStatusData = [
    { name: 'Active', value: userStats.active },
    { name: 'Pending', value: userStats.pending },
    { name: 'Inactive', value: userStats.inactive }
  ];

  // Recent activity
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const quickActions = [
    {
      title: 'User Management',
      description: 'Add, edit, or remove system users',
      icon: Users,
      path: '/admin/users',
      color: 'bg-blue-600',
      bg: 'bg-blue-50',
      stats: userStats.total
    },
    {
      title: 'Registration Control',
      description: isRegistrationOpen ? 'Currently OPEN' : 'Currently CLOSED',
      icon: UserPlus,
      path: '/admin/registration-control',
      color: isRegistrationOpen ? 'bg-green-600' : 'bg-red-600',
      bg: isRegistrationOpen ? 'bg-green-50' : 'bg-red-50',
      stats: userStats.pendingStudents
    },
    {
      title: 'System Inquiries',
      description: `${pendingInquiries} pending message${pendingInquiries !== 1 ? 's' : ''}`,
      icon: MessageSquare,
      path: '/admin/inquiries',
      color: 'bg-purple-600',
      bg: 'bg-purple-50',
      stats: pendingInquiries
    },
    {
      title: 'System Settings',
      description: 'Configure global preferences',
      icon: Settings,
      path: '/admin/settings',
      color: 'bg-gray-700',
      bg: 'bg-gray-50'
    }
  ];

  const userColumns = [
    {
      key: 'name',
      label: 'User',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
            {row.name?.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{row.name}</div>
            <div className="text-xs text-gray-500">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      render: (role) => (
        <span className="capitalize text-sm text-gray-600">{role?.replace('-', ' ')}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'active' ? 'bg-green-100 text-green-800' :
          status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {status}
        </span>
      )
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (date) => formatDate(date)
    }
  ];

  if (usersLoading || settingsLoading || inquiriesLoading || regLoading) {
    return <LoadingSpinner fullScreen text="Loading admin dashboard..." />;
  }

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Welcome Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 to-indigo-900 p-8 text-white shadow-xl"
      >
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 tracking-wide" style={{ fontFamily: 'Times New Roman, serif' }}>Welcome back, {user?.name}!</h1>
            <p className="text-blue-200" style={{ fontFamily: 'Times New Roman, serif' }}>
              System status is operational. You have {userStats.pending} pending approvals and {pendingInquiries} new inquiries.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 text-center">
              <p className="text-2xl font-bold">{userStats.total}</p>
              <p className="text-xs opacity-80">Total Users</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 text-center">
              <p className="text-2xl font-bold">{userStats.active}</p>
              <p className="text-xs opacity-80">Active</p>
            </div>
          </div>
        </div>

        {/* Decorative Background Circles */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-20"></div>
      </motion.div>

      {/* Key Metrics Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <MetricCard
          title="Total Users"
          value={userStats.total}
          subtitle={`${userStats.active} active`}
          icon={Users}
          color="blue"
          trend="up"
          trendValue={`+${userStats.pending} pending`}
          onClick={() => navigate('/admin/users')}
        />
        <MetricCard
          title="Active Students"
          value={userStats.activeStudents}
          subtitle={`${userStats.pendingStudents} pending`}
          icon={UserPlus}
          color="green"
          onClick={() => navigate('/admin/users?role=student')}
        />
        <MetricCard
          title="Faculty Advisors"
          value={userStats.advisors}
          subtitle={`${userStats.deptHeads} dept heads`}
          icon={Shield}
          color="purple"
          onClick={() => navigate('/admin/users?role=advisor')}
        />
        <MetricCard
          title="Pending Actions"
          value={userStats.pending + pendingInquiries}
          subtitle={`${userStats.pending} users, ${pendingInquiries} inquiries`}
          icon={Clock}
          color={userStats.pending + pendingInquiries > 0 ? 'yellow' : 'green'}
          onClick={() => navigate('/admin/inquiries')}
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={index}
            whileHover={{ y: -5 }}
            onClick={() => navigate(action.path)}
            className={`cursor-pointer rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all ${action.bg}`}
          >
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg`}>
                <action.icon className="w-6 h-6" />
              </div>
              {action.stats > 0 && (
                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                  {action.stats}
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 text-lg">{action.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{action.description}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Tables */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
          {/* Recent Users Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Recent Users</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/users')}
                className="text-blue-600"
              >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <DataTable
              columns={userColumns}
              data={recentUsers}
              searchable={false}
              pageSize={5}
              emptyMessage="No users found."
            />
          </div>

          {/* System Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Database className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Database</p>
                  <p className="text-xl font-bold text-gray-900">MySQL</p>
                  <p className="text-xs text-green-600 mt-1">● Optimal</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Server className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Server</p>
                  <p className="text-xl font-bold text-gray-900">Node.js</p>
                  <p className="text-xs text-blue-600 mt-1">● Running</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Uptime</p>
                  <p className="text-xl font-bold text-gray-900">99.9%</p>
                  <p className="text-xs text-purple-600 mt-1">Last 30 days</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Response Time</p>
                  <p className="text-xl font-bold text-gray-900">124ms</p>
                  <p className="text-xs text-orange-600 mt-1">Average</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column - Charts and Stats */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* User Status Chart */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">User Status</h3>
            <div className="h-48">
              <ReportChart
                type="bar"
                data={userStatusData}
                xKey="name"
                yKey="value"
                height={180}
              />
            </div>
          </div>

          {/* System Info Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 border border-indigo-100">
            <h3 className="font-bold text-gray-900 mb-4">System Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Version</span>
                <span className="font-medium text-gray-900">1.0.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Environment</span>
                <span className="font-medium text-gray-900">Production</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Academic Year</span>
                <span className="font-medium text-gray-900">{academicYear?.current || 'Not Set'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Semester</span>
                <span className="font-medium text-gray-900">{academicYear?.semester || 'N/A'}</span>
              </div>
              <div className="pt-4 mt-4 border-t border-indigo-200">
                <button
                  onClick={() => navigate('/admin/settings')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  System Settings
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Inquiries Preview */}
      {pendingInquiries > 0 && (
        <motion.div variants={itemVariants} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              Recent Inquiries
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/inquiries')}
              className="text-purple-600"
            >
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {inquiries.slice(0, 3).map(inquiry => (
              <div key={inquiry.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">
                  {inquiry.name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 text-sm">{inquiry.name}</h4>
                    <span className="text-xs text-gray-400">{formatDate(inquiry.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-1">{inquiry.message}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  inquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>
                  {inquiry.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AdminDashboard;