// src/components/layout/Sidebar.jsx
import React, { useMemo } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, User, FileText, Users, Upload, CheckCircle,
  Store, MessageSquare, ClipboardList, UserPlus, Settings,
  BarChart3, Calendar, UserCheck, BookOpen, GraduationCap, Shield, Info, Archive, MapPin, Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { formatDate } from '../../utils/dateUtils';

const Sidebar = ({ isOpen, onClose, academicYear }) => {
  const { user } = useAuth();
  const { getGroupsForEvaluator, getDefenseSchedules, groups } = useProject();

  const getDashboardPath = () => {
    switch (user?.role) {
      case 'student': return '/student';
      case 'advisor': return '/advisor';
      case 'dept-head': return '/dept-head';
      case 'faculty-head': return '/faculty-head';
      case 'admin': return '/admin';
      default: return '/';
    }
  };

  // Get assigned groups for advisor to display in sidebar
  const assignedGroups = useMemo(() => {
    if (user?.role === 'advisor' && user?.id && typeof getGroupsForEvaluator === 'function') {
      return getGroupsForEvaluator(user.id).filter(g => g.name !== 'Group 3');
    }
    return [];
  }, [user, getGroupsForEvaluator]);

  const evaluationDuties = useMemo(() => {
    if (user?.role !== 'advisor' || !groups) return [];

    // 1. Find all groups where the user is an evaluator (persists across semesters)
    const myEvaluationGroups = groups.filter(g =>
      g.evaluators?.some(e => e.id === user.id)
    );

    // 2. Check for schedules in the current semester
    const allSchedules = typeof getDefenseSchedules === 'function' ? getDefenseSchedules() : [];
    const currentSemester = academicYear?.semester || 1;
    const semesterSchedules = allSchedules.filter(s => (s.semester || 1) === currentSemester);

    return myEvaluationGroups.map(group => {
      const schedule = semesterSchedules.find(s => s.groupId === group.id);
      const otherEvaluators = group.evaluators.filter(e => e.id !== user.id).map(e => e.name).join(', ');
      return {
        groupId: group.id,
        groupName: group.name,
        date: schedule?.date,
        isScheduled: !!schedule,
        otherEvaluators: otherEvaluators,
      };
    });
  }, [user, groups, getDefenseSchedules, academicYear?.semester]);

  const getMenuItems = useMemo(() => {
    // Get current semester once at the top level
    const semValue = academicYear?.semester;
    const currentSemester = (semValue === '2' || semValue === 2) ? 2 : 1;

    switch (user?.role) {

      case 'student':
        // Build student menu items based on semester
        const studentItems = [
          { path: '/student', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/student/profile', icon: User, label: 'My Profile' },
          { path: '/student/group', icon: Users, label: 'My Group' },
          // Project Proposal - EXPLICITLY only in Semester 1
          { path: '/student/proposal', icon: FileText, label: 'Project Title Submission', showOnlyInSemester: 1 },
          // Progress Reports - visible in both semesters
          { path: '/student/progress', icon: Upload, label: 'Progress Reports' },
          // Final Draft - visible in both semesters
          { path: '/student/final-draft', icon: CheckCircle, label: 'Final Draft' },
          // Defense Schedule - visible in both semesters
          { path: '/student/defense-schedule', icon: Calendar, label: 'Defense Schedule' },
          // Assigned Evaluators - persists across semesters
          { path: '/student/evaluators', icon: UserCheck, label: 'Assigned Evaluators' },
        ];

        // Filter: Remove items that have showOnlyInSemester and don't match current semester
        return studentItems.filter(item => {
          // If item has showOnlyInSemester restriction, check it
          if (item.showOnlyInSemester !== undefined) {
            return item.showOnlyInSemester === currentSemester;
          }
          // No restriction, show item
          return true;
        });
      case 'advisor':
        // Build advisor menu items with semester awareness
        const advisorItems = [
          { path: '/advisor', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/advisor/profile', icon: User, label: 'Profile' },
          // Project Marketplace - only in Semester 1
          { path: '/advisor/marketplace', icon: Store, label: 'Project Marketplace', showOnlyInSemester: 1 },
          { path: '/advisor/groups', icon: Users, label: 'My Groups' },
          // Progress Review - visible in both semesters, but semester-aware
          { path: '/advisor/progress-review', icon: MessageSquare, label: 'Progress Review', semester: 'both' },
          // Final Approval - visible in both semesters, but semester-aware
          { path: '/advisor/final-approval', icon: CheckCircle, label: 'Final Drafts', semester: 'both' },
          { path: '/advisor/AdvisorEvaluations', icon: Shield, label: 'Evaluations' },
          { path: '/advisor/schedule', icon: Calendar, label: 'Evaluation Schedule' },
        ];

        // Filter items based on current semester
        return advisorItems.filter(item => {
          // If item has showOnlyInSemester restriction, check it
          if (item.showOnlyInSemester !== undefined) {
            return item.showOnlyInSemester === currentSemester;
          }
          // No restriction, show item
          return true;
        });
      case 'dept-head':
        // Build department head menu items with semester awareness
        const deptHeadItems = [
          { path: '/dept-head', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/dept-head/profile', icon: User, label: 'Profile' },
          // Student Registration - only in Semester 1
          { path: '/dept-head/registrations', icon: UserPlus, label: 'Student Registration', showOnlyInSemester: 1 },
          { path: '/dept-head/students', icon: GraduationCap, label: 'Registered Students' },
          // Proposal Evaluation - only in Semester 1
          { path: '/dept-head/proposals', icon: ClipboardList, label: 'Proposal Evaluation', showOnlyInSemester: 1 },
          // Group Formation - only in Semester 1
          { path: '/dept-head/groups', icon: Users, label: 'Group Formation', showOnlyInSemester: 1 },
          { path: '/dept-head/group-info', icon: Info, label: 'Group Information' },
          { path: '/dept-head/claimed-projects', icon: UserCheck, label: 'Claimed Projects' },
          // Final Drafts - visible in both semesters, but semester-aware
          { path: '/dept-head/final-drafts', icon: CheckCircle, label: 'Final Drafts', semester: 'both' },
          // Progress Monitoring - visible in both semesters, but semester-aware
          { path: '/dept-head/monitoring', icon: BarChart3, label: 'Progress Monitoring', semester: 'both' },
          // Reports - visible in both semesters, but semester-aware
          { path: '/dept-head/reports', icon: FileText, label: 'Reports', semester: 'both' },
          { path: '/dept-head/defense-schedule', icon: Calendar, label: 'Defense Schedule' },
        ];

        // Filter items based on current semester (declared at top of useMemo)
        return deptHeadItems.filter(item => {
          // If item has showOnlyInSemester restriction, check it
          if (item.showOnlyInSemester !== undefined) {
            return item.showOnlyInSemester === currentSemester;
          }
          // No restriction, show item
          return true;
        });
      case 'faculty-head':
        if (academicYear?.status === 'terminated') {
          return [
            { path: '/faculty-head', icon: LayoutDashboard, label: 'Dashboard' },
            { path: '/faculty-head/profile', icon: User, label: 'Profile' },
            { path: '/faculty-head/academic-year', icon: BookOpen, label: 'Academic Year' },
          ];
        }

        let facultyItems = [
          { path: '/faculty-head', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/faculty-head/profile', icon: User, label: 'Profile' },
          {
            path: '/faculty-head/defense',
            icon: Calendar,
            label: 'Defense Schedule',
            badge: (typeof getDefenseSchedules === 'function' ? getDefenseSchedules() : []).filter(s => (s.semester || 1) === (academicYear?.semester || 1)).length
          },
          { path: '/faculty-head/EvaluatorManager', icon: UserCheck, label: 'Evaluator Assignment' },
          { path: '/faculty-head/venues', icon: MapPin, label: 'Venues Management' },
          { path: '/faculty-head/sections', icon: Layers, label: 'Section Configuration' },
          { path: '/faculty-head/domains', icon: Layers, label: 'Project Domains' },
          { path: '/faculty-head/reports', icon: BarChart3, label: 'Faculty Reports' },
          { path: '/faculty-head/academic-year', icon: BookOpen, label: 'Academic Year' },
        ];
        // Hide Evaluator Manager in Semester 2
        if (parseInt(academicYear?.semester || '1', 10) === 2) {
          facultyItems = facultyItems.filter(item => item.path !== '/faculty-head/EvaluatorManager');
        }
        return facultyItems;
      case 'admin':
        return [
          { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/admin/profile', icon: User, label: 'Profile' },
          { path: '/admin/users', icon: Users, label: 'User Management' },
          { path: '/admin/registration-control', icon: UserCheck, label: 'Registration Control' },
          { path: '/admin/inquiries', icon: MessageSquare, label: 'System Inquiries' },
          { path: '/admin/settings', icon: Settings, label: 'System Settings' },
        ];
      default:
        return [];
    }
  }, [user?.role, academicYear?.semester, groups, getDefenseSchedules, getGroupsForEvaluator]);

  const menuItems = getMenuItems;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out shadow-2xl
          lg:translate-x-0 lg:static lg:z-0 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ fontFamily: 'Times New Roman, serif' }}
      >
        {/* Logo / Header */}
        <Link to={getDashboardPath()} className="flex items-center gap-4 px-6 h-20 border-b border-gray-800 bg-gray-900/50 hover:bg-gray-800 transition-colors">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">FYPM System</h1>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Hawassa University</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          {menuItems.map((item) => (
            <div key={item.path}>
              <NavLink
                to={item.path}
                end={item.path.split('/').length === 2 && !item.children}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 duration-200`} />
                <span className="font-bold text-sm flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {item.badge}
                  </span>
                )}
              </NavLink>

              {/* Render Sub-items (Groups) */}
              {item.children && item.children.length > 0 && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-800 pl-2">
                  {item.children.map(child => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      onClick={onClose}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200
                        ${isActive
                          ? 'text-blue-400 bg-gray-800/50'
                          : 'text-gray-500 hover:text-gray-300'
                        }
                      `}
                    >
                      <span className="text-xs font-bold truncate">{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-800/50 border border-gray-700/50">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture.startsWith('data:image')
                  ? user.profilePicture
                  : user.profilePicture.startsWith('/uploads')
                  ? `http://localhost:5001${user.profilePicture}`
                  : user.profilePicture}
                alt={user.name}
                className="w-10 h-10 rounded-lg object-cover border border-gray-600 shadow-sm"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-inner ${user?.profilePicture ? 'hidden' : 'flex'}`}>
              <span className="text-lg font-bold text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-400 capitalize truncate">{user?.role?.replace('-', ' ')}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;