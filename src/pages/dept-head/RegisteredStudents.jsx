import React, { useState, useMemo } from 'react';
import { Mail, Phone, Download, Users, BookOpen, Award, GraduationCap, UserCheck, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { userService } from '../../services';
import { sectionService } from '../../services';
import pdfService from '../../services/pdfService';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import { buildSectionNameMap, resolveSectionName } from '../../utils/sectionDisplay';

// Helper function to safely format CGPA
const formatCGPA = (cgpa) => {
  if (cgpa === null || cgpa === undefined) return 'N/A';
  if (typeof cgpa === 'number') return cgpa.toFixed(2);
  if (typeof cgpa === 'string') {
    const parsed = parseFloat(cgpa);
    if (!isNaN(parsed)) return parsed.toFixed(2);
  }
  return 'N/A';
};

// Helper function to format gender with icon and styling
const formatGender = (gender) => {
  if (!gender) return 'N/A';

  const genderLower = gender.toLowerCase();
  if (genderLower === 'male') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <span className="mr-1">👨</span> Male
      </span>
    );
  } else if (genderLower === 'female') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
        <span className="mr-1">👩</span> Female
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      {gender}
    </span>
  );
};

// Section color palette
const SECTION_COLORS = [
  { bg: 'from-blue-500 to-indigo-600', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', ring: 'ring-blue-500' },
  { bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'ring-emerald-500' },
  { bg: 'from-purple-500 to-violet-600', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', ring: 'ring-purple-500' },
  { bg: 'from-orange-500 to-amber-600', light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', ring: 'ring-orange-500' },
  { bg: 'from-rose-500 to-pink-600', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', ring: 'ring-rose-500' },
  { bg: 'from-cyan-500 to-sky-600', light: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', ring: 'ring-cyan-500' },
];

const getSectionColor = (index) => SECTION_COLORS[index % SECTION_COLORS.length];

const RegisteredStudents = () => {
  const { user } = useAuth();
  const { isReadOnly } = useProtectedRoute();
  const department = user?.department;

  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');

  // Fetch active students
  const {
    data: studentsData,
    loading: studentsLoading,
    error: studentsError,
  } = useFetch(() => userService.getUsers({
    role: 'student',
    department,
    status: 'active'
  }), [department]);

  // Fetch sections from database
  const {
    data: sectionsData,
    loading: sectionsLoading,
  } = useFetch(() => sectionService.getSectionsByDepartment(department, true), [department]);

  const students = studentsData?.users || [];
  const sections = sectionsData?.sections || [];
  const sectionNameMap = useMemo(
    () => buildSectionNameMap(sections),
    [sections]
  );
  const getStudentSectionName = (student) =>
    student?.Section?.name || (student?.section ? resolveSectionName(student.section, sectionNameMap) : 'N/A');

  // Calculate section counts dynamically
  const sectionCounts = useMemo(() => {
    const counts = {};
    sections.forEach(s => {
      counts[s.name] = students.filter(st => getStudentSectionName(st) === s.name).length;
    });
    return counts;
  }, [students, sections, sectionNameMap]);

  // Calculate gender statistics
  const maleCount = students.filter(s => s.gender?.toLowerCase() === 'male').length;
  const femaleCount = students.filter(s => s.gender?.toLowerCase() === 'female').length;
  const otherCount = students.filter(s => s.gender &&
    s.gender.toLowerCase() !== 'male' &&
    s.gender.toLowerCase() !== 'female').length;

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedSection !== 'all' && getStudentSectionName(s) !== selectedSection) return false;
      if (selectedGender !== 'all') {
        if (selectedGender === 'male' && s.gender?.toLowerCase() !== 'male') return false;
        if (selectedGender === 'female' && s.gender?.toLowerCase() !== 'female') return false;
        if (selectedGender === 'other' &&
          (s.gender?.toLowerCase() === 'male' || s.gender?.toLowerCase() === 'female')) return false;
      }
      return true;
    });
  }, [students, selectedSection, selectedGender, sectionNameMap]);

  const handleExportPDF = () => {
    try {
      if (students.length === 0) {
        toast.error('No students to export');
        return;
      }

      const studentsForPdf = students.map(student => ({
        ...student,
        section: getStudentSectionName(student)
      }));
      const doc = pdfService.generateRegisteredStudentsPDF(studentsForPdf, department);
      pdfService.downloadPDF(doc, `Registered_Students_${department}_${new Date().toISOString().split('T')[0]}`);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Student Name',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">ID: {row.studentId || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Contact',
      render: (value, row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-3 h-3" /> {value || 'N/A'}
          </div>
          {row.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-3 h-3" /> {row.phone}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (value) => formatGender(value)
    },
    {
      key: 'section',
      label: 'Section',
      render: (value, row) => {
        const sectionName = getStudentSectionName(row);
        const sectionIndex = sections.findIndex(s => s.name === sectionName);
        const color = sectionIndex >= 0 ? getSectionColor(sectionIndex) : SECTION_COLORS[0];
        return sectionName && sectionName !== 'N/A' ? (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color.light} ${color.text}`}>
            {sectionName}
          </span>
        ) : 'N/A';
      }
    },
    {
      key: 'cgpa',
      label: 'CGPA',
      render: (value) => {
        const formattedCGPA = formatCGPA(value);
        return (
          <span className={`font-medium ${
            formattedCGPA !== 'N/A' && parseFloat(formattedCGPA) >= 3.5 ? 'text-green-600' :
            formattedCGPA !== 'N/A' && parseFloat(formattedCGPA) >= 3.0 ? 'text-blue-600' :
            'text-gray-600'
          }`}>
            {formattedCGPA}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value || 'unknown'} size="sm" />
    },
    {
      key: 'createdAt',
      label: 'Registered',
      render: (value) => value ? formatDate(value) : 'N/A'
    }
  ];

  if (studentsLoading || sectionsLoading) {
    return <LoadingSpinner fullScreen text="Loading students..." />;
  }

  if (studentsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Students</h2>
          <p className="text-gray-600 mb-6">There was a problem loading the student list. Please try again.</p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Times New Roman, serif' }}>
      {/* Hero Stats Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-5 shadow-lg">
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg shadow">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Registered Students</h2>
              <p className="text-violet-100 text-xs">{department} Department</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 border border-white/20 shadow hover:bg-white/20 transition-all duration-300">
              <p className="text-violet-100 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Total</p>
              <p className="text-2xl font-bold text-white">{students.length}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 border border-white/20 shadow hover:bg-white/20 transition-all duration-300">
              <p className="text-violet-100 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Male</p>
              <p className="text-2xl font-bold text-white">{maleCount}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 border border-white/20 shadow hover:bg-white/20 transition-all duration-300">
              <p className="text-violet-100 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Female</p>
              <p className="text-2xl font-bold text-white">{femaleCount}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 border border-white/20 shadow hover:bg-white/20 transition-all duration-300">
              <p className="text-violet-100 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Sections</p>
              <p className="text-2xl font-bold text-white">{sections.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gender Distribution Bar */}
      {students.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-700">Gender Distribution</span>
            <span className="text-[10px] text-gray-500">
              M: {maleCount} ({((maleCount / students.length) * 100).toFixed(1)}%) · F: {femaleCount} ({((femaleCount / students.length) * 100).toFixed(1)}%){otherCount > 0 ? ` · Other: ${otherCount}` : ''}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(maleCount / students.length) * 100}%` }} />
            <div className="bg-pink-500 h-full transition-all duration-500" style={{ width: `${(femaleCount / students.length) * 100}%` }} />
            {otherCount > 0 && <div className="bg-gray-400 h-full transition-all duration-500" style={{ width: `${(otherCount / students.length) * 100}%` }} />}
          </div>
        </div>
      )}

      {/* Section Cards */}
      {sections.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Sections
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Total Card */}
            <button
              onClick={() => setSelectedSection('all')}
              className={`relative overflow-hidden rounded-lg p-3 border-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md text-left ${
                selectedSection === 'all'
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Users className={`w-4 h-4 ${selectedSection === 'all' ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className={`text-xs font-semibold ${selectedSection === 'all' ? 'text-indigo-700' : 'text-gray-600'}`}>All</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{students.length}</p>
            </button>

            {sections.map((section, index) => {
              const color = getSectionColor(index);
              const count = sectionCounts[section.name] || 0;
              const isSelected = selectedSection === section.name;

              return (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(isSelected ? 'all' : section.name)}
                  className={`relative overflow-hidden rounded-lg p-3 border-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md text-left ${
                    isSelected
                      ? `${color.border} ${color.light} shadow-md`
                      : 'border-gray-200 bg-white shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${color.bg} ${isSelected ? 'ring-2 ring-white ring-offset-1 ' + color.ring : ''}`}></div>
                    <span className={`text-xs font-semibold ${isSelected ? color.text : 'text-gray-600'}`}>{section.name}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                  {section.supervisor && (
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">{section.supervisor}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-700">Filters:</span>
          </div>

          {/* Gender Filter */}
          <div className="flex items-center gap-1.5">
            {['all', 'male', 'female'].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGender(g)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  selectedGender === g
                    ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {g === 'all' ? 'All' : g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            icon={Download}
            disabled={students.length === 0}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Student Cards Grid */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center shadow-sm">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No students match the selected filters.</p>
          <button
            onClick={() => { setSelectedSection('all'); setSelectedGender('all'); }}
            className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredStudents.map((student) => {
            const studentSectionName = getStudentSectionName(student);
            const sectionIndex = sections.findIndex(s => s.name === studentSectionName);
            const color = sectionIndex >= 0 ? getSectionColor(sectionIndex) : SECTION_COLORS[0];

            return (
              <div
                key={student.id}
                className="group/card relative bg-gradient-to-br from-white to-slate-50 rounded-lg border border-gray-200 p-3 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 hover:-translate-y-0.5"
              >
                {/* Active dot */}
                <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white shadow-sm"></div>

                <div className="flex items-start gap-3 mb-2">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color.bg} flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0`}>
                    {student.name?.charAt(0).toUpperCase()}
                  </div>

                  {/* Name & ID */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{student.name}</h3>
                    <p className="text-[11px] text-gray-500 font-mono">{student.studentId}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 mt-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${color.light} ${color.text}`}>
                        {studentSectionName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-semibold text-gray-900">{formatCGPA(student.cgpa)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    {formatGender(student.gender)}
                    <StatusBadge status={student.status || 'unknown'} size="xs" />
                  </div>
                </div>

                {/* Registration Date */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400">Registered: {student.createdAt ? formatDate(student.createdAt) : 'N/A'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DataTable for large lists */}
      {filteredStudents.length > 20 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Student Table View</h2>
            <span className="text-xs text-gray-500">{filteredStudents.length} students</span>
          </div>
          <DataTable
            columns={columns}
            data={filteredStudents}
            searchable
            pageSize={10}
            emptyMessage="No registered students found."
          />
        </div>
      )}
    </div>
  );
};

export default RegisteredStudents;
