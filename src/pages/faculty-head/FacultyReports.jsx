// src/pages/faculty-head/FacultyReports.jsx
import React from 'react';
import { FileText, BarChart3, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import ExportButton from '../../components/reports/ExportButton';
import MetricCard from '../../components/dashboard/MetricCard';
import { generateFacultyReport, downloadPDF } from '../../utils/pdfGenerator';

const FacultyReports = () => {
  const { users, getUsersByRole } = useAuth();
  const { getFacultyStats, getStatsByDepartment, academicYear, groups, projectSettings, proposals } = useProject();

  const facultyStats = getFacultyStats();
  const advisors = getUsersByRole('advisor');

  const departmentsList = [
    { name: 'Computer Science', code: 'CS' },
    { name: 'Information Technology', code: 'IT' },
    { name: 'Information Systems', code: 'IS' }
  ];

  // Chart data
  const departmentGroupsData = departmentsList.map(dept => ({
    name: dept.name,
    value: getStatsByDepartment(dept.name).totalGroups
  }));

  const departmentGroupsPieData = departmentGroupsData.map(d => ({
    id: d.name,
    label: d.name,
    value: d.value
  }));

  // Calculate Project Domains (replacing Proposal Status)
  const domainCounts = {};
  const currentProposals = proposals.filter(p => p.academicYear === academicYear.current);
  
  currentProposals.forEach(p => {
    if (p.status === 'approved' && p.approvedTitle?.domain) {
      const domain = p.approvedTitle.domain;
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    }
  });

  const projectDomainData = Object.entries(domainCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Final draft status is most relevant in Semester 2
  const finalDraftStatusData = [
    { name: 'Fully Approved', value: groups.filter(g => g.finalDraftStatus === 'fully-approved').length },
    { name: 'Advisor Approved', value: groups.filter(g => g.finalDraftStatus === 'advisor-approved').length },
    { name: 'Pending Advisor', value: groups.filter(g => g.finalDraftStatus === 'submitted').length },
    { name: 'Changes Requested', value: groups.filter(g => g.finalDraftStatus === 'changes-requested').length },
    { name: 'Not Submitted', value: groups.filter(g => !g.finalDraftStatus || g.finalDraftStatus === 'pending').length },
  ];

  const finalDraftPieData = finalDraftStatusData.map(d => ({
    id: d.name,
    label: d.name,
    value: d.value
  }));

  const progressData = departmentsList.map(dept => ({
    name: dept.code,
    completed: groups.filter(g => g.department === dept.name && (g.finalDraftStatus === 'fully-approved' || g.finalDraftStatus === 'advisor-approved')).length,
    inProgress: groups.filter(g => g.department === dept.name && g.progressStatus === 'in-progress' && g.finalDraftStatus !== 'fully-approved' && g.finalDraftStatus !== 'advisor-approved').length
  }));

  // Advisor workload
  const advisorWorkload = advisors.map(advisor => ({
    name: advisor.name,
    department: advisor.department,
    groupCount: groups.filter(g => g.advisorId === advisor.id).length,
    maxGroups: projectSettings?.maxGroupsPerAdvisor || 5
  }));

  const handleExportPDF = () => {
    const departments = departmentsList.map(dept => ({
      name: dept.name,
      ...getStatsByDepartment(dept.name)
    }));

    const reportData = {
      ...facultyStats,
      academicYear: academicYear.current,
      semester: academicYear.semester,
      departments,
      advisorWorkload
    };

    const doc = generateFacultyReport('Faculty of Informatics', reportData);
    downloadPDF(doc, `Faculty_Report_${academicYear.current.replace('/', '-')}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty Reports</h1>
          <p className="text-gray-500">Academic Year: {academicYear.current} • Semester {academicYear.semester}</p>
        </div>
        <ExportButton onExportPDF={handleExportPDF} pdfOnly />
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Groups"
          value={facultyStats.totalGroups}
          icon={Users}
          color="blue"
        />
        {academicYear.semester === 1 ? (
          <>
            <MetricCard
              title="Total Proposals"
              value={facultyStats.totalProposals}
              icon={FileText}
              color="purple"
            />
            <MetricCard
              title="Approved Proposals"
              value={facultyStats.approvedProposals}
              icon={TrendingUp}
              color="green"
            />
          </>
        ) : (
          <>
            <MetricCard
              title="Submitted Drafts"
              value={finalDraftStatusData.reduce((acc, curr) => curr.name !== 'Not Submitted' ? acc + curr.value : acc, 0)}
              icon={FileText}
              color="purple"
            />
            <MetricCard
              title="Fully Approved Drafts"
              value={finalDraftStatusData.find(d => d.name === 'Fully Approved')?.value || 0}
              icon={TrendingUp}
              color="green"
            />
          </>
        )}
        <MetricCard
          title="Completed Projects"
          value={facultyStats.completedProjects}
          icon={BarChart3}
          color="teal"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Groups by Department</h3>
          <div className="h-80">
            <ResponsivePie
              data={departmentGroupsPieData}
              margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              colors={{ scheme: 'nivo' }}
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor="#333333"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: 'color' }}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
            />
          </div>
        </div>

        {academicYear.semester === 1 ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Domains Overview</h3>
            <div className="h-80">
              <ResponsiveBar
                data={projectDomainData}
                keys={['value']}
                indexBy="name"
                margin={{ top: 20, right: 30, bottom: 70, left: 60 }}
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
                  tickRotation: -45,
                  legend: 'Domain',
                  legendPosition: 'middle',
                  legendOffset: 60
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Projects',
                  legendPosition: 'middle',
                  legendOffset: -40
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
                labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Final Draft Status (Semester 2)</h3>
            <div className="h-80">
              <ResponsivePie
                data={finalDraftPieData}
                margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                activeOuterRadiusOffset={8}
                colors={{ scheme: 'set2' }}
                borderWidth={1}
                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsTextColor="#333333"
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Progress by Department</h3>
          <div className="h-80">
            <ResponsiveBar
              data={progressData}
              keys={['completed', 'inProgress']}
              indexBy="name"
              margin={{ top: 20, right: 130, bottom: 50, left: 60 }}
              padding={0.3}
              groupMode="grouped"
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: 'paired' }}
              borderRadius={4}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Department',
                legendPosition: 'middle',
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Projects',
                legendPosition: 'middle',
                legendOffset: -40
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              legends={[
                {
                  dataFrom: 'keys',
                  anchor: 'bottom-right',
                  direction: 'column',
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemDirection: 'left-to-right',
                  itemOpacity: 0.85,
                  symbolSize: 20,
                  effects: [{ on: 'hover', style: { itemOpacity: 1 } }]
                }
              ]}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Advisor Workload</h3>
          <div className="h-80">
            <ResponsiveBar
              data={advisorWorkload.slice(0, 8)}
              keys={['groupCount']}
              indexBy="name"
              margin={{ top: 20, right: 30, bottom: 70, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: 'purple_blue' }}
              borderRadius={4}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Advisor',
                legendPosition: 'middle',
                legendOffset: 60
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Groups',
                legendPosition: 'middle',
                legendOffset: -40
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            />
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Advisor Workload Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Advisor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Groups</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Groups</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {advisorWorkload.map((advisor) => (
                <tr key={advisor.name}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{advisor.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{advisor.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{advisor.groupCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{advisor.maxGroups}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(advisor.groupCount / advisor.maxGroups) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {Math.round((advisor.groupCount / advisor.maxGroups) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FacultyReports;