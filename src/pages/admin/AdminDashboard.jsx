// src/pages/admin/AdminDashboard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Settings, Shield, UserPlus, ArrowRight,
  Activity, Database, Server, Clock, MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import MetricCard from '../../components/dashboard/MetricCard';
import ReportChart from '../../components/reports/ReportChart';
import SemesterStatusBanner from '../../components/common/SemesterStatusBanner';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, users } = useAuth();

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  // Calculate statistics
  const userStats = {
    total: users.length,
    students: users.filter(u => u.role === 'student' && u.status === 'active').length,
    advisors: users.filter(u => u.role === 'advisor').length,
    deptHeads: users.filter(u => u.role === 'dept-head').length,
    active: users.filter(u => u.status === 'active').length,
    pending: users.filter(u => u.status === 'pending').length
  };

  const userRoleData = [
    { name: 'Students', value: userStats.students },
    { name: 'Advisors', value: userStats.advisors },
    { name: 'Dept Heads', value: userStats.deptHeads },
    { name: 'Faculty Head', value: users.filter(u => u.role === 'faculty-head').length },
    { name: 'Admin', value: users.filter(u => u.role === 'admin').length }
  ];

  const quickActions = [
    {
      title: 'User Management',
      description: 'Add, edit, or remove system users',
      icon: Users,
      path: '/admin/users',
      color: 'bg-blue-600',
      bg: 'bg-blue-50'
    },
    {
      title: 'System Inquiries',
      description: 'View messages from contact form',
      icon: MessageSquare,
      path: '/admin/inquiries',
      color: 'bg-purple-600',
      bg: 'bg-purple-50'
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

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <SemesterStatusBanner />

      {/* 1. Welcome Banner */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-linear-to-r from-blue-900 to-indigo-900 p-8 text-white shadow-xl"
      >
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
            <p className="text-blue-200">System status is operational. You have {userStats.pending} pending approvals.</p>
          </div>
        </div>
        
        {/* Decorative Background Circles */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-20"></div>
      </motion.div>

      {/* 2. Key Metrics Grid */}
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <MetricCard
          title="Total Users"
          value={userStats.total}
          icon={Users}
          color="blue"
          trend="up"
          trendValue="+12% this month"
        />
        <MetricCard
          title="Active Students"
          value={userStats.students}
          icon={UserPlus}
          color="green"
        />
        <MetricCard
          title="Faculty Advisors"
          value={userStats.advisors}
          icon={Shield}
          color="purple"
        />
        <MetricCard
          title="Pending Actions"
          value={userStats.pending}
          icon={Clock}
          color={userStats.pending > 0 ? 'yellow' : 'green'}
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 3. Quick Actions & Analytics */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -5 }}
                onClick={() => navigate(action.path)}
                className={`cursor-pointer rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all ${action.bg}`}
              >
                <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{action.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{action.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Recent Activity Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Recent Users</h2>
              <button 
                onClick={() => navigate('/admin/users')} 
                className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.slice(-5).reverse().map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{u.name}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 capitalize">{u.role.replace('-', ' ')}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          u.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' :
                          u.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                          'bg-gray-50 text-gray-700 border-gray-100'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* 4. Right Sidebar: System Health & Distribution */}
        <motion.div variants={itemVariants} className="space-y-8">
          
          {/* User Distribution Chart */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-6">User Distribution</h3>
            <div className="h-64">
              <ReportChart
                type="pie"
                data={userRoleData}
                title=""
                height={250}
              />
            </div>
          </div>

          {/* System Health Cards */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">System Health</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Database</p>
                    <p className="text-xs text-green-600">Optimal</p>
                  </div>
                </div>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Server Load</p>
                    <p className="text-xs text-blue-600">12% Usage</p>
                  </div>
                </div>
                <div className="text-xs font-bold text-blue-700">Low</div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Uptime</p>
                    <p className="text-xs text-purple-600">99.9%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;