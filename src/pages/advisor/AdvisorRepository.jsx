// src/pages/advisor/AdvisorRepository.jsx
import React, { useState } from 'react';
import { Archive, Book, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import { formatDate } from '../../utils/dateUtils';

const AccordionItem = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
      </button>
      {isOpen && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
};

const AdvisorRepository = () => {
  const { user } = useAuth();
  const { advisorRepository } = useProject();

  const myRepository = advisorRepository[user.id] || {};
  const academicYears = Object.keys(myRepository).sort().reverse();

  if (academicYears.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Advisor Repository</h1>
        <p className="text-gray-500 mt-2">No archived data found. Information will be stored here when a semester is terminated.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Advisor Repository</h1>
      <p className="text-gray-500">
        This is an archive of your mentored groups and evaluation duties from past academic years and semesters.
      </p>

      <div className="space-y-4">
        {academicYears.map((year, index) => (
          <AccordionItem key={year} title={`Academic Year: ${year}`} defaultOpen={index === 0}>
            <div className="space-y-6">
              {['semester1', 'semester2'].map(semesterKey => {
                const semesterData = myRepository[year][semesterKey];
                if (!semesterData) return null;

                const semesterNumber = semesterKey.replace('semester', '');

                return (
                  <div key={semesterKey} className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">
                      Semester {semesterNumber}
                      <span className="text-sm font-normal text-gray-400 ml-2">(Archived on {formatDate(semesterData.archivedAt)})</span>
                    </h3>
                    
                    {/* Mentored Groups */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
                        <Book className="w-5 h-5 text-blue-600" />
                        Mentored Groups
                      </h4>
                      {semesterData.mentoredGroups?.length > 0 ? (
                        <ul className="space-y-3">
                          {semesterData.mentoredGroups.map(group => (
                            <li key={group.id} className="bg-gray-50 p-3 rounded-lg border">
                              <p className="font-medium">{group.name} - <span className="text-gray-600">{group.approvedTitle}</span></p>
                              <p className="text-sm text-gray-500">Reports: {group.semesterReports?.length || 0}, Final Draft: {group.semesterFinalDraft ? 'Submitted' : 'N/A'}</p>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-gray-500 italic">No mentored groups with activity this semester.</p>}
                    </div>

                    {/* Evaluation Duties */}
                    <div>
                      <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
                        <Shield className="w-5 h-5 text-indigo-600" />
                        Evaluation Duties
                      </h4>
                      {semesterData.evaluationDuties?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="p-2 text-left font-medium">Group</th>
                                <th className="p-2 text-left font-medium">Project</th>
                                <th className="p-2 text-left font-medium">Date</th>
                                <th className="p-2 text-left font-medium">Time</th>
                                <th className="p-2 text-left font-medium">Venue</th>
                              </tr>
                            </thead>
                            <tbody>
                              {semesterData.evaluationDuties.map(duty => (
                                <tr key={duty.groupId} className="border-b">
                                  <td className="p-2 font-medium">{duty.groupName}</td>
                                  <td className="p-2">{duty.projectTitle}</td>
                                  <td className="p-2">{formatDate(duty.date)}</td>
                                  <td className="p-2">{duty.time}</td>
                                  <td className="p-2">{duty.venue}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="text-sm text-gray-500 italic">No evaluation duties this semester.</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionItem>
        ))}
      </div>
    </div>
  );
};

export default AdvisorRepository;