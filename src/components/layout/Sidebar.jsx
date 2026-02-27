// src/components/layout/Sidebar.jsx
import React, { useMemo } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, User, FileText, Users, Upload, CheckCircle, 
  Store, MessageSquare, ClipboardList, UserPlus, Settings, 
  BarChart3, Calendar, UserCheck, BookOpen, GraduationCap, Shield, Info, Archive, MapPin
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { formatDate } from '../../utils/dateUtils';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { getGroupsForEvaluator, academicYear, getDefenseSchedules, groups } = useProject();

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
    if (user?.role === 'advisor' && user?.id) {
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
    const allSchedules = getDefenseSchedules();
    const semesterSchedules = allSchedules.filter(s => (s.semester || 1) === academicYear.semester);

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
  }, [user, groups, getDefenseSchedules, academicYear.semester]);

  const getMenuItems = () => {
    switch (user?.role) {



      case 'student':
        let studentItems = [
          { path: '/student', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/student/profile', icon: User, label: 'My Profile' },
          { path: '/student/group', icon: Users, label: 'My Group' },
          { path: '/student/proposal', icon: FileText, label: 'Project Proposal' },
          { path: '/student/progress', icon: Upload, label: 'Progress Reports' },
          { path: '/student/final-draft', icon: CheckCircle, label: 'Final Draft' },
          { path: '/student/defense-schedule', icon: Calendar, label: 'Defense Schedule' },
          { path: '/student/evaluators', icon: UserCheck, label: 'Assigned Evaluators' },
        ];
        if (academicYear?.semester === 2) {
          studentItems = studentItems.filter(item => item.path !== '/student/proposal');
        }
        return studentItems;
      case 'advisor':

        let advisorItems = [
          { path: '/advisor', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/advisor/profile', icon: User, label: 'Profile' },
          { path: '/advisor/marketplace', icon: Store, label: 'Project Marketplace' },
          { path: '/advisor/groups', icon: Users, label: 'My Groups' },
          { path: '/advisor/progress-review', icon: MessageSquare, label: 'Progress Review' },
          { path: '/advisor/final-approval', icon: CheckCircle, label: 'Final Approval' },
          { path: '/advisor/AdvisorEvaluations', icon: Shield, label: 'Evaluations' },
          { path: '/advisor/schedule', icon: Calendar, label: 'Evaluation Schedule' },
          { path: '/advisor/repository', icon: Archive, label: 'Advisor Repository' },
        ];

        // Hide marketplace in Semester 2
        if (academicYear?.semester === 2) {
          advisorItems = advisorItems.filter(item => 
            item.path !== '/advisor/marketplace'
          );
        }
        return advisorItems;
      case 'dept-head':
        let deptHeadItems = [
          { path: '/dept-head', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/dept-head/profile', icon: User, label: 'Profile' },
          { path: '/dept-head/registrations', icon: UserPlus, label: 'Student Registration' },
          { path: '/dept-head/students', icon: GraduationCap, label: 'Registered Students' },
          { path: '/dept-head/proposals', icon: ClipboardList, label: 'Proposal Evaluation' },
          { path: '/dept-head/groups', icon: Users, label: 'Group Formation' },
          { path: '/dept-head/group-info', icon: Info, label: 'Group Information' },
          { path: '/dept-head/claimed-projects', icon: UserCheck, label: 'Claimed Projects' },
          { path: '/dept-head/final-drafts', icon: CheckCircle, label: 'Final Drafts' },
          { path: '/dept-head/monitoring', icon: BarChart3, label: 'Progress Monitoring' },
          { path: '/dept-head/repository', icon: Archive, label: 'Dept Repository' },
          { path: '/dept-head/reports', icon: FileText, label: 'Reports' },
          { path: '/dept-head/defense-schedule', icon: Calendar, label: 'Defense Schedule' },
        ];
        if (academicYear?.semester === 2) {
          deptHeadItems = deptHeadItems.filter(item => 
            item.path !== '/dept-head/registrations' &&
            item.path !== '/dept-head/proposals' &&
            item.path !== '/dept-head/groups'
          );
        }
        return deptHeadItems;
      case 'faculty-head':
        let facultyItems = [
          { path: '/faculty-head', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/faculty-head/profile', icon: User, label: 'Profile' },
          { path: '/faculty-head/defense', icon: Calendar, label: 'Defense Schedule' },
          { path: '/faculty-head/EvaluatorManager', icon: UserCheck, label: 'Evaluator Assignment' },
          { path: '/faculty-head/venues', icon: MapPin, label: 'Venues Management' },
          { path: '/faculty-head/reports', icon: BarChart3, label: 'Faculty Reports' },          
          { path: '/faculty-head/academic-year', icon: BookOpen, label: 'Academic Year' },
          { path: '/faculty-head/repository', icon: Archive, label: 'Faculty Repository' },
        ];
        if (academicYear?.semester === 2) {
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
  };

  const menuItems = getMenuItems();

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
                <span className="font-medium text-sm flex-1">{item.label}</span>
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
                      <span className="text-xs font-medium truncate">{child.label}</span>
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
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-inner">
              <span className="text-lg font-bold text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-400 capitalize truncate">{user?.role?.replace('-', ' ')}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;