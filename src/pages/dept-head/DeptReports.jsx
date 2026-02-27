// src/pages/dept-head/DeptReports.jsx
import React from 'react';
import { FileText, BarChart3, PieChart, TrendingUp, Users, Calendar, Shield } from 'lucide-react';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import Button from '../../components/common/Button';
import MetricCard from '../../components/dashboard/MetricCard';
import { generateDepartmentReport, downloadPDF } from '../../utils/pdfGenerator';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import SemesterStatusBanner from '../../components/common/SemesterStatusBanner';

const DeptReports = () => {
  const { user, users } = useAuth();
  const { 
    getStatsByDepartment, 
    getGroupsByDepartment, 
    getProposalsByDepartment, 
    getDefenseSchedules,
    academicYear
  } = useProject();

  const department = user?.department;
  const stats = getStatsByDepartment(department);
  const groups = getGroupsByDepartment(department);
  const allProposals = getProposalsByDepartment(department);
  
  // Use all proposals for the academic year
  const approvedProposalsCount = allProposals.filter(p => p.status === 'approved').length;
  const pendingProposalsCount = allProposals.filter(p => p.status === 'pending').length;

  // Prepare chart data
  const allDefenseSchedules = getDefenseSchedules();
  const deptDefenseSchedules = allDefenseSchedules.filter(s => 
    s.department === department && (s.semester || 1) === academicYear.semester
  );
  const groupsWithEvaluators = groups.filter(g => g.evaluators && g.evaluators.length > 0);

  const proposalStatusData = [
    { id: 'Approved', label: 'Approved', value: approvedProposalsCount, color: '#10b981' },
    { id: 'Pending', label: 'Pending', value: pendingProposalsCount, color: '#f59e0b' },
    { id: 'Rejected', label: 'Rejected', value: allProposals.filter(p => p.status === 'rejected').length, color: '#ef4444' }
  ];

  // Calculate Domain Distribution from approved proposals
  const domainCounts = {};
  allProposals.forEach(p => {
    if (p.status === 'approved' && p.approvedTitle?.domain) {
      const domain = p.approvedTitle.domain;
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    }
  });

  const domainData = Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);

  const progressData = [
    { status: 'On Track', value: groups.filter(g => g.progressStatus === 'in-progress' && g.finalDraftStatus !== 'fully-approved' && g.finalDraftStatus !== 'advisor-approved').length },
    { status: 'Not Started', value: groups.filter(g => g.progressStatus === 'not-started').length },
    { status: 'Completed', value: groups.filter(g => g.finalDraftStatus === 'fully-approved' || g.finalDraftStatus === 'advisor-approved').length }
  ];

  // Get advisor workload
  const advisors = users.filter(u => u.role === 'advisor' && u.department === department);
  const advisorWorkload = advisors.map(advisor => ({
    advisor: advisor.name,
    groups: groups.filter(g => g.advisorId === advisor.id).length
  })).sort((a, b) => b.groups - a.groups); // Sort by workload

  const handleExportPDF = () => {
    try {
      // Defensive checks to ensure arrays exist
      const safeUsers = Array.isArray(users) ? users : [];
      const safeGroups = Array.isArray(groups) ? groups : [];
      const safeSchedules = Array.isArray(deptDefenseSchedules) ? deptDefenseSchedules : [];

      const reportData = {
        ...stats,
        completedProjects: safeGroups.filter(g => g.finalDraftStatus === 'fully-approved' || g.finalDraftStatus === 'advisor-approved').length,
        academicYear: academicYear.current,
        semester: academicYear.semester,
        groups: safeGroups.map(g => ({
          name: g.name || 'N/A',
          approvedTitle: g.approvedTitle || 'N/A',
          advisorName: safeUsers.find(u => u.id === g.advisorId)?.name || 'Not Assigned',
          progressStatus: g.progressStatus || 'N/A',
          finalDraftStatus: g.finalDraftStatus || 'N/A',
          members: (g.members || []).map(id => safeUsers.find(u => u.id === id)?.name).filter(Boolean).join(', ')
        })),
        defenseSchedules: safeSchedules.map(s => {
          const group = safeGroups.find(g => g.id === s.groupId);
          return {
            ...s,
            groupName: s.groupName || group?.name || 'N/A',
            projectTitle: s.projectTitle || group?.approvedTitle || 'N/A',
            members: group ? (group.members || []).map(id => safeUsers.find(u => u.id === id)?.name).filter(Boolean).join(', ') : '',
            evaluators: Array.isArray(s.evaluators) ? s.evaluators.map(e => e.name).join(', ') : ''
          };
        }),
      };

      const doc = generateDepartmentReport(department, reportData);
      downloadPDF(doc, `${department.replace(/\s+/g, '_')}_Report_${academicYear.current.replace('/', '-')}_Sem${academicYear.semester}_${new Date().toISOString().split('T')[0]}`);
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to generate report: ' + error.message);
    }
  };

  return (
    <div className="space-y-8">
      <SemesterStatusBanner />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Department Reports</h1>
          <p className="text-gray-500 mt-1">{department} Department Overview</p>
        </div>
        <Button onClick={handleExportPDF} icon={FileText}>
          Export Report
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Groups"
          value={stats.totalGroups}
          icon={BarChart3}
          color="blue"
        />
        <MetricCard
          title="Approved Proposals"
          value={approvedProposalsCount}
          icon={FileText}
          color="green"
        />
        <MetricCard
          title="Groups with Advisor"
          value={stats.groupsWithAdvisor}
          icon={TrendingUp}
          color="purple"
        />
        <MetricCard
          title="Evaluators Assigned"
          value={groupsWithEvaluators.length}
          icon={Shield}
          color="orange"
        />
        <MetricCard
          title="Defenses Scheduled"
          value={deptDefenseSchedules.length}
          icon={Calendar}
          color="pink"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Proposal Status - Donut Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Proposal Status Distribution</h3>
          <div className="h-80">
            <ResponsivePie
              data={proposalStatusData}
              margin={{ top: 20, right: 80, bottom: 80, left: 80 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              colors={{ datum: 'data.color' }}
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
              enableArcLinkLabels={true}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor="#333333"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: 'color' }}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
            />
          </div>
        </div>

        {/* Project Domains - Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Domains Overview</h3>
          <div className="h-80">
            {domainData.length > 0 ? (
              <ResponsiveBar
                data={domainData}
                keys={['count']}
                indexBy="domain"
                layout="horizontal"
                margin={{ top: 10, right: 30, bottom: 50, left: 100 }}
                padding={0.3}
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                colors={{ scheme: 'category10' }}
                borderRadius={4}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisTop={null}
                axisRight={null}
                axisBottom={{ 
                  tickSize: 5, 
                  tickPadding: 5, 
                  tickRotation: 0,
                  legend: 'Number of Projects',
                  legendPosition: 'middle',
                  legendOffset: 32
                }}
                axisLeft={{ 
                  tickSize: 5, 
                  tickPadding: 5, 
                  tickRotation: 0 
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
                labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No approved projects with domains yet
              </div>
            )}
          </div>
        </div>

        {/* Project Progress - Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Progress Status</h3>
          <div className="h-80">
            <ResponsiveBar
              data={progressData}
              keys={['value']}
              indexBy="status"
              margin={{ top: 10, right: 30, bottom: 50, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: 'nivo' }}
              borderRadius={4}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: 0 }}
              axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: 'Groups', legendPosition: 'middle', legendOffset: -40 }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            />
          </div>
        </div>

        {/* Advisor Workload - Horizontal Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Advisor Workload</h3>
          <div className="h-80">
            <ResponsiveBar
              data={advisorWorkload}
              keys={['groups']}
              indexBy="advisor"
              layout="horizontal"
              margin={{ top: 10, right: 30, bottom: 50, left: 100 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: 'set3' }}
              borderRadius={4}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: 'Assigned Groups', legendPosition: 'middle', legendOffset: 32 }}
              axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0 }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            />
          </div>
        </div>
      </div>

      {/* Evaluator Assignments */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 transition-shadow hover:shadow-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Evaluator Assignments</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Evaluators</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {groupsWithEvaluators.map((group) => (
                  <tr key={group.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{group.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{group.approvedTitle || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {group.evaluators.map(e => e.name).join(', ')}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {groupsWithEvaluators.length === 0 && <p className="text-center text-gray-500 py-4">No groups have evaluators assigned yet.</p>}
        </div>
      </div>

      {/* Defense Schedules */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 transition-shadow hover:shadow-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Defense Schedules</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evaluators</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deptDefenseSchedules.map((schedule) => {
                  const group = groups.find(g => g.id === schedule.groupId);
                  const studentNames = group?.members?.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ') || 'N/A';
                  const evaluatorNames = schedule.evaluators?.map(e => e.name).join(', ') || 'N/A';
                  return (
                  <tr key={schedule.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{schedule.groupName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{schedule.projectTitle || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{studentNames}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{evaluatorNames}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(schedule.date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{schedule.time}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{schedule.venue}</td>
                  </tr>
                )})}
            </tbody>
          </table>
          {deptDefenseSchedules.length === 0 && <p className="text-center text-gray-500 py-4">No defenses have been scheduled yet.</p>}
        </div>
      </div>

      {/* Group Details Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 transition-shadow hover:shadow-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Group Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Members</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Advisor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Draft</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {groups.map((group) => {
                const advisor = users.find(u => u.id === group.advisorId);
                const memberNames = group.members.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ');
                return (
                  <tr key={group.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{group.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{memberNames}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{group.approvedTitle || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{advisor?.name || 'Not Assigned'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        group.progressStatus === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        group.progressStatus === 'not-started' ? 'bg-gray-100 text-gray-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {group.progressStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        group.finalDraftStatus === 'fully-approved' ? 'bg-green-100 text-green-800' :
                        group.finalDraftStatus === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {group.finalDraftStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeptReports;