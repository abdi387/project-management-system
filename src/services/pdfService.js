import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatTime } from '../utils/dateUtils';
import { formatGroupDisplayName, getMemberSectionName } from '../utils/sectionDisplay';

const pdfService = {
  // Generic function to add header to all PDFs
  addHeader: (doc, title, subtitle = '') => {
    doc.setFontSize(20);
    doc.setTextColor(13, 148, 136);
    doc.text(title, 14, 22);
    
    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(subtitle, 14, 30);
    }
    
    return doc;
  },

  // Safe string conversion
  safeString: (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return 'N/A';
      }
    }
    return String(value);
  },

  // Safe number formatting
  safeNumber: (value, decimals = 2) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') return value.toFixed(decimals);
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) return parsed.toFixed(decimals);
    }
    return 'N/A';
  },

  getGroupDisplayName: (group) => {
    if (!group) return 'N/A';
    return pdfService.safeString(formatGroupDisplayName(group));
  },

  getGroupSectionName: (group) => {
    if (!group) return 'N/A';
    return pdfService.safeString(getMemberSectionName(group.Members?.[0]));
  },

  // Clean group name by removing repeated section info if it appears in the group name string
  cleanGroupName: (groupName, section) => {
    const name = pdfService.safeString(groupName).trim();
    const sectionText = pdfService.safeString(section).trim();
    if (!name || !sectionText || sectionText === 'N/A') return name || 'N/A';

    const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedSection = escapeRegExp(sectionText);
    const patterns = [
      new RegExp(`\\s*[-–:]\\s*${escapedSection}$`, 'i'),
      new RegExp(`\\s*\\(${escapedSection}\\)$`, 'i'),
      new RegExp(`\\s*\\[${escapedSection}\\]$`, 'i'),
      new RegExp(`\\s*,\\s*${escapedSection}$`, 'i')
    ];

    let cleaned = name;
    patterns.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, '').trim();
    });

    return cleaned || name;
  },

  // Generate registered students PDF
  generateRegisteredStudentsPDF: (students, department) => {
    try {
      const doc = new jsPDF();
      
      pdfService.addHeader(
        doc, 
        `Registered Students - ${department || 'Department'}`,
        `Generated: ${new Date().toLocaleString()} | Total: ${students.length} students`
      );

      const studentsBody = students.map(student => [
        pdfService.safeString(student.name),
        pdfService.safeString(student.studentId),
        pdfService.safeString(student.email),
        pdfService.safeString(student.gender),
        pdfService.safeString(student.section),
        student.cgpa ? pdfService.safeNumber(student.cgpa) : 'N/A'
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Name', 'Student ID', 'Email', 'Sex', 'Section', 'CGPA']],
        body: studentsBody,
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] },
        styles: { fontSize: 8, cellPadding: 2 },
      });

      return doc;
    } catch (error) {
      console.error('Error generating registered students PDF:', error);
      throw error;
    }
  },

  // Generate group information PDF
  generateGroupInformationPDF: (groups, department) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });

      pdfService.addHeader(
        doc,
        `Group Information - ${department || 'Department'}`,
        `Generated: ${new Date().toLocaleString()} | Total Groups: ${groups.length}`
      );

      const groupsBody = groups.map(group => {
        const section = pdfService.getGroupSectionName(group);
        const memberNames = group.Members?.map(m => m.name).join('\n') || 'N/A';
        const advisor = group.Advisor;
        
        let projectTitle = 'N/A';
        if (group.approvedTitle) {
          try {
            projectTitle = typeof group.approvedTitle === 'string' 
              ? JSON.parse(group.approvedTitle).title 
              : group.approvedTitle;
          } catch {
            projectTitle = group.approvedTitle;
          }
        }

        const evaluators = group.Evaluators?.map(e => e.name).join('\n') || 'Not assigned';

        return [
          pdfService.getGroupDisplayName(group),
          section,
          pdfService.safeString(memberNames),
          pdfService.safeString(group.department),
          pdfService.safeString(advisor?.name),
          pdfService.safeString(projectTitle),
          pdfService.safeString(evaluators)
        ];
      });

      autoTable(doc, {
        startY: 40,
        head: [['Group ID', 'Section', 'Group Members', 'Department', 'Advisor', 'Project Title', 'Evaluators']],
        body: groupsBody,
        theme: 'striped',
        styles: { valign: 'middle', fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 15 },
          2: { cellWidth: 45 },
          3: { cellWidth: 30 },
          4: { cellWidth: 35 },
          5: { cellWidth: 60 },
          6: { cellWidth: 45 }
        }
      });

      return doc;
    } catch (error) {
      console.error('Error generating group information PDF:', error);
      throw error;
    }
  },

  // Generate stunning group information PDF (clean, focused on groups only)
  generateGroupInformationStunningPDF: (groups, department, academicYear) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Simple header
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageWidth, 30, 'F');

      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('Group Information', 20, 18);

      doc.setFontSize(11);
      const headerInfo = `${department} Department${academicYear ? ' • ' + academicYear : ''}`;
      doc.text(headerInfo, 20, 26);

      // Group Details
      let startY = 38;

      groups.forEach((group) => {
        // Check if we need a new page
        if (startY > pageHeight - 65) {
          doc.addPage();
          startY = 15;
        }

        // Group header with color based on status
        const headerColors = {
          approved: [16, 185, 129],
          pending: [245, 158, 11],
          rejected: [239, 68, 68]
        };
        const statusColor = headerColors[group.proposalStatus] || [99, 102, 241];

        doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.roundedRect(15, startY, pageWidth - 30, 14, 2, 2, 'F');

        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text(pdfService.getGroupDisplayName(group), 20, startY + 9);

        const section = pdfService.getGroupSectionName(group);
        doc.setFontSize(10);
        doc.text(`Section: ${section}`, pageWidth - 20, startY + 9, { align: 'right' });

        startY += 18;

        // Project Title
        let projectTitle = 'Not submitted';
        if (group.approvedTitle) {
          try {
            projectTitle = typeof group.approvedTitle === 'string' && group.approvedTitle.startsWith('{')
              ? JSON.parse(group.approvedTitle).title
              : group.approvedTitle;
          } catch {
            projectTitle = group.approvedTitle;
          }
        }
        if (!projectTitle || typeof projectTitle !== 'string') {
          projectTitle = 'Not submitted';
        }

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('Project:', 20, startY);
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.text(projectTitle, 45, startY);
        startY += 7;

        // Advisor
        const advisor = group.Advisor;
        if (advisor) {
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text('Advisor:', 20, startY);
          doc.setTextColor(30, 41, 59);
          doc.setFontSize(10);
          doc.text(advisor.name || 'N/A', 45, startY);
          startY += 7;
        }

        // Members table
        if (group.Members && group.Members.length > 0) {
          doc.setFontSize(10);
          doc.setTextColor(30, 41, 59);
          doc.text('Members:', 20, startY);
          startY += 6;

          // Table header
          doc.setFillColor(241, 245, 249);
          doc.rect(20, startY, pageWidth - 40, 7, 'F');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text('Name', 25, startY + 5);
          doc.text('Student ID', 100, startY + 5);
          doc.text('CGPA', 160, startY + 5);
          doc.text('Role', 200, startY + 5);
          startY += 8;

          // Members rows
          group.Members.forEach((member, memberIdx) => {
            if (memberIdx % 2 === 0) {
              doc.setFillColor(248, 250, 252);
              doc.rect(20, startY, pageWidth - 40, 7, 'F');
            }

            doc.setFontSize(8);
            doc.setTextColor(30, 41, 59);
            doc.text(member.name || 'N/A', 25, startY + 5);
            doc.text(member.studentId || 'N/A', 100, startY + 5);
            doc.text(member.cgpa ? parseFloat(member.cgpa).toFixed(2) : 'N/A', 160, startY + 5);

            const isLeader = member.id === group.leaderId;
            if (isLeader) {
              doc.setTextColor(99, 102, 241);
            } else {
              doc.setTextColor(100, 116, 139);
            }
            doc.text(isLeader ? 'Leader' : 'Member', 200, startY + 5);

            startY += 7;
          });
        }

        // Evaluators
        if (group.Evaluators && group.Evaluators.length > 0) {
          startY += 3;
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text('Evaluators:', 20, startY);
          startY += 5;

          const evaluatorNames = group.Evaluators.map(e => e.name).join(', ') || 'N/A';
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          doc.text(evaluatorNames, 45, startY);
          startY += 7;
        }

        startY += 8; // Space between groups
      });

      // Footer on all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
        doc.text('FYP Management System', 15, pageHeight - 8);
      }

      return doc;
    } catch (error) {
      console.error('Error generating stunning group information PDF:', error);
      throw error;
    }
  },

  // Generate claimed projects PDF
  generateClaimedProjectsPDF: (groups, department) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });

      pdfService.addHeader(
        doc,
        `Claimed Projects - ${department || 'Department'}`,
        `Generated: ${new Date().toLocaleString()} | Total: ${groups.length} projects`
      );

      const groupsBody = groups.map(group => {
        const section = pdfService.getGroupSectionName(group);
        const memberNames = group.Members?.map(m => m.name).join('\n') || 'N/A';
        const advisor = group.Advisor;
        
        let projectTitle = 'N/A';
        if (group.approvedTitle) {
          try {
            projectTitle = typeof group.approvedTitle === 'string' 
              ? JSON.parse(group.approvedTitle).title 
              : group.approvedTitle;
          } catch {
            projectTitle = group.approvedTitle;
          }
        }

        return [
          pdfService.getGroupDisplayName(group),
          section,
          pdfService.safeString(projectTitle),
          pdfService.safeString(advisor?.name),
          pdfService.safeString(memberNames),
          pdfService.safeString(group.progressStatus)
        ];
      });

      autoTable(doc, {
        startY: 40,
        head: [['Group', 'Section', 'Project Title', 'Advisor', 'Members', 'Progress']],
        body: groupsBody,
        theme: 'striped',
        styles: { valign: 'middle', fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 15 },
          2: { cellWidth: 70 },
          3: { cellWidth: 35 },
          4: { cellWidth: 70 },
          5: { cellWidth: 25 }
        }
      });

      return doc;
    } catch (error) {
      console.error('Error generating claimed projects PDF:', error);
      throw error;
    }
  },

  // Generate defense schedule PDF
  generateDefenseSchedulePDF: (schedules, department) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });

      pdfService.addHeader(
        doc,
        `Defense Schedule - ${department || 'Department'}`,
        `Generated: ${new Date().toLocaleString()} | Total: ${schedules.length} defenses`
      );

      const defenseBody = schedules.map(s => {
        const section = s.section || s.members?.[0]?.section || 'N/A';
        const groupName = pdfService.cleanGroupName(s.groupName, section);
        const memberNames = s.members?.map(m => m.name).join('\n') || 'N/A';
        const evaluatorNames = s.evaluators?.map(e => e.name).join('\n') || 'N/A';

        return [
          pdfService.safeString(groupName),
          pdfService.safeString(section),
          pdfService.safeString(memberNames),
          pdfService.safeString(s.projectTitle),
          s.date ? formatDate(s.date) : 'N/A',
          s.time ? formatTime(s.time) : 'N/A',
          pdfService.safeString(s.venue),
          pdfService.safeString(evaluatorNames)
        ];
      });

      autoTable(doc, {
        startY: 40,
        head: [['Group', 'Section', 'Members', 'Project Title', 'Date', 'Time', 'Venue', 'Evaluators']],
        body: defenseBody,
        theme: 'striped',
        styles: { valign: 'middle', fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20 },
          2: { cellWidth: 40 },
          3: { cellWidth: 50 },
          7: { cellWidth: 40 }
        }
      });

      return doc;
    } catch (error) {
      console.error('Error generating defense schedule PDF:', error);
      throw error;
    }
  },

  // Generate faculty defense schedule PDF
  generateFacultyDefenseSchedulePDF: (schedules, academicYear, semester) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });

      pdfService.addHeader(
        doc,
        `Faculty Defense Schedule - ${academicYear || 'N/A'} / Semester ${semester || '1'}`,
        `Generated: ${new Date().toLocaleString()} | Total Defenses: ${schedules.length}`
      );

      const defenseBody = schedules.map(s => {
        const section = s.section || s.members?.[0]?.section || 'N/A';
        const groupName = pdfService.cleanGroupName(s.groupName, section);
        const memberNames = s.members?.map(m => m.name).join(', ') || 'N/A';
        const evaluatorNames = s.evaluators?.map(e => e.name).join(', ') || 'N/A';

        return [
          pdfService.safeString(groupName),
          pdfService.safeString(section),
          pdfService.safeString(s.department),
          pdfService.safeString(memberNames),
          pdfService.safeString(s.projectTitle),
          s.date ? formatDate(s.date) : 'N/A',
          pdfService.safeString(s.time),
          pdfService.safeString(s.venue),
          pdfService.safeString(evaluatorNames)
        ];
      });

      autoTable(doc, {
        startY: 40,
        head: [['Group', 'Section', 'Members', 'Project Title', 'Department', 'Date', 'Time', 'Venue', 'Evaluators']],
        body: defenseBody,
        theme: 'striped',
        styles: { valign: 'middle', fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
          0: { cellWidth: 22 },
          2: { cellWidth: 35 },
          3: { cellWidth: 45 },
          4: { cellWidth: 25 },
          8: { cellWidth: 35 }
        }
      });

      // Add summary at the end
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(33, 37, 41);
      doc.text('Defense Schedule Summary', doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      const summaryLines = [
        `Academic Year: ${academicYear || 'N/A'}`,
        `Semester: ${semester || '1'}`,
        `Total Defenses Scheduled: ${schedules.length}`,
        `Generated: ${new Date().toLocaleString()}`
      ];

      let y = 50;
      summaryLines.forEach(line => {
        doc.text(line, 20, y);
        y += 10;
      });

      return doc;
    } catch (error) {
      console.error('Error generating faculty defense schedule PDF:', error);
      throw error;
    }
  },

  // Generate final drafts PDF
  generateFinalDraftsPDF: (drafts, department) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });

      pdfService.addHeader(
        doc,
        `Final Drafts - ${department || 'Department'}`,
        `Generated: ${new Date().toLocaleString()} | Total: ${drafts.length} drafts`
      );

      const draftsBody = drafts.map(draft => {
        const group = draft.Group || {};
        const advisor = group.Advisor;

        return [
          pdfService.getGroupDisplayName(group),
          pdfService.getGroupSectionName(group),
          pdfService.safeString(draft.title),
          pdfService.safeString(advisor?.name),
          draft.submittedAt ? formatDate(draft.submittedAt) : 'N/A',
          pdfService.safeString(draft.advisorStatus)
        ];
      });

      autoTable(doc, {
        startY: 40,
        head: [['Group', 'Section', 'Project Title', 'Advisor', 'Submitted', 'Status']],
        body: draftsBody,
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 2: { cellWidth: 80 } }
      });

      return doc;
    } catch (error) {
      console.error('Error generating final drafts PDF:', error);
      throw error;
    }
  },

  // Generate department report PDF
  generateDepartmentReport: (department, data) => {
    try {
      const doc = new jsPDF();

      pdfService.addHeader(
        doc,
        `${department || 'Department'} Report`,
        `Generated: ${new Date().toLocaleString()} | Academic Year: ${data.academicYear || 'N/A'} | Semester: ${data.semester || 'N/A'}`
      );

      // Statistics Section
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Department Statistics', 14, 45);

      const statsData = [
        ['Total Groups', data.totalGroups || 0],
        ['Approved Proposals', data.approvedProposals || 0],
        ['Pending Proposals', data.pendingProposals || 0],
        ['Groups with Advisor', data.groupsWithAdvisor || 0],
        ['Completed Projects', data.completedProjects || 0]
      ];

      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: statsData,
        theme: 'grid',
        headStyles: { fillColor: [13, 148, 136] },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: { 0: { fontStyle: 'bold', width: 100 } }
      });

      // Groups Table
      let finalY = doc.lastAutoTable.finalY + 15;

      if (data.groups && data.groups.length > 0) {
        doc.setFontSize(14);
        doc.text('Group Details', 14, finalY);

        const groupsBody = data.groups.map(g => [
          pdfService.safeString(g.name),
          pdfService.safeString(g.approvedTitle),
          pdfService.safeString(g.members),
          pdfService.safeString(g.advisorName),
          pdfService.safeString(g.progressStatus),
          pdfService.safeString(g.finalDraftStatus)
        ]);

        autoTable(doc, {
          startY: finalY + 5,
          head: [['Group', 'Project Title', 'Members', 'Advisor', 'Progress', 'Status']],
          body: groupsBody,
          theme: 'striped',
          headStyles: { fillColor: [13, 148, 136] },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 40 },
            2: { cellWidth: 40 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 }
          }
        });

        finalY = doc.lastAutoTable.finalY + 15;
      }

      // Defense Schedules Section
      if (data.defenseSchedules && data.defenseSchedules.length > 0) {
        if (finalY > doc.internal.pageSize.height - 40) {
          doc.addPage();
          finalY = 20;
        }

        doc.setFontSize(14);
        doc.text('Defense Schedules', 14, finalY);

        const defenseBody = data.defenseSchedules.map(s => [
          pdfService.safeString(s.groupName),
          pdfService.safeString(s.projectTitle),
          pdfService.safeString(s.members),
          s.date ? formatDate(s.date) : 'N/A',
          pdfService.safeString(s.time),
          pdfService.safeString(s.venue),
          pdfService.safeString(s.evaluators)
        ]);

        autoTable(doc, {
          startY: finalY + 5,
          head: [['Group', 'Project', 'Members', 'Date', 'Time', 'Venue', 'Evaluators']],
          body: defenseBody,
          theme: 'striped',
          headStyles: { fillColor: [13, 148, 136] },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 30 },
            2: { cellWidth: 40 },
            3: { cellWidth: 20 },
            4: { cellWidth: 15 },
            5: { cellWidth: 20 },
            6: { cellWidth: 35 }
          }
        });
      }

      return doc;
    } catch (error) {
      console.error('Error generating department report PDF:', error);
      throw error;
    }
  },

  // Generate comprehensive faculty report PDF (simple table format)
  generateFacultyReport: (faculty, reportData, departmentStats, domainStats, statusData, currentSemester) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Simple header
      doc.setFillColor(13, 148, 136);
      doc.rect(0, 0, pageWidth, 25, 'F');

      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text(`Faculty Report - ${faculty || 'Faculty of Informatics'}`, 15, 16);

      doc.setFontSize(10);
      doc.text(`Academic Year: ${reportData.academicYear || 'N/A'} | Semester: ${reportData.semester || currentSemester} | Generated: ${new Date().toLocaleString()}`, 15, 22);

      let startY = 35;

      // Key Metrics Table
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Key Metrics', 15, startY);
      startY += 8;

      const metrics = [
        ['Total Groups', reportData.totalGroups],
        ['Total Students', reportData.totalStudents],
        ['Approved Proposals', reportData.approvedProposals],
        ['Completed Projects', reportData.completedProjects],
        ['Completion Rate', reportData.totalGroups > 0 ? Math.round((reportData.completedProjects / reportData.totalGroups) * 100) + '%' : '0%']
      ];

      autoTable(doc, {
        startY: startY,
        head: [['Metric', 'Value']],
        body: metrics,
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
      });

      startY = doc.lastAutoTable.finalY + 15;

      // Project Status Table (only in Semester 1)
      if (currentSemester !== '2' && statusData && statusData.length > 0) {
        doc.setFontSize(14);
        doc.text('Project Status', 15, startY);
        startY += 8;

        const statusRows = statusData.filter(s => s.value > 0).map(s => [
          s.name,
          s.value,
          reportData.totalGroups > 0 ? Math.round((s.value / reportData.totalGroups) * 100) + '%' : '0%'
        ]);

        autoTable(doc, {
          startY: startY,
          head: [['Status', 'Count', 'Percentage']],
          body: statusRows,
          theme: 'striped',
          headStyles: { fillColor: [13, 148, 136] },
          styles: { fontSize: 10, cellPadding: 5 }
        });

        startY = doc.lastAutoTable.finalY + 15;
      }

      // Department Breakdown Table
      if (reportData.departments && Array.isArray(reportData.departments)) {
        doc.setFontSize(14);
        doc.text('Department Breakdown', 15, startY);
        startY += 8;

        autoTable(doc, {
          startY: startY,
          head: [['Department', 'Groups', 'Approved Proposals', 'Completed Projects', 'Advisors']],
          body: reportData.departments.map(d => [
            pdfService.safeString(d.name),
            d.totalGroups || 0,
            d.approvedProposals || 0,
            d.completedProjects || 0,
            d.advisorCount || 0
          ]),
          theme: 'striped',
          headStyles: { fillColor: [13, 148, 136] },
          styles: { fontSize: 10, cellPadding: 5, valign: 'middle' },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
        });

        startY = doc.lastAutoTable.finalY + 15;
      }

      // Domain Distribution Table
      if (domainStats && Object.keys(domainStats).length > 0) {
        doc.setFontSize(14);
        doc.text('Project Domain Distribution', 15, startY);
        startY += 8;

        const domainRows = Object.entries(domainStats).map(([domain, count]) => [
          pdfService.safeString(domain),
          count
        ]);

        autoTable(doc, {
          startY: startY,
          head: [['Domain', 'Projects']],
          body: domainRows,
          theme: 'striped',
          headStyles: { fillColor: [13, 148, 136] },
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: { 0: { cellWidth: 180 } }
        });
      }

      // Footer on all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
        doc.text('FYP Management System - Faculty Report', 15, pageHeight - 8);
      }

      return doc;
    } catch (error) {
      console.error('Error generating faculty report PDF:', error);
      throw error;
    }
  },

  // Download PDF helper
  downloadPDF: (doc, filename) => {
    try {
      doc.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },

  // Generate evaluator assignments PDF
  generateEvaluatorAssignmentsPDF: (assignedGroups, users) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });

      pdfService.addHeader(
        doc,
        'Evaluator Assignments',
        `Generated: ${new Date().toLocaleString()} | Total: ${assignedGroups.length} groups`
      );

      const assignmentsBody = assignedGroups.map(group => {
        const evaluatorNames = group.Evaluators?.map(e => e.name).join('\n') || 'Not assigned';
        const memberNames = group.Members?.map(m => m.name).join('\n') || 'N/A';
        
        let projectTitle = 'N/A';
        if (group.approvedTitle) {
          try {
            projectTitle = typeof group.approvedTitle === 'string' 
              ? JSON.parse(group.approvedTitle).title 
              : group.approvedTitle;
          } catch {
            projectTitle = group.approvedTitle;
          }
        }

        return [
          pdfService.getGroupDisplayName(group),
          pdfService.safeString(group.department),
          pdfService.safeString(group.Advisor?.name || 'N/A'),
          pdfService.safeString(projectTitle),
          pdfService.safeString(evaluatorNames)
        ];
      });

      autoTable(doc, {
        startY: 40,
        head: [['Group', 'Department', 'Advisor', 'Project Title', 'Evaluators']],
        body: assignmentsBody,
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] },
        styles: { valign: 'middle', fontSize: 8, cellPadding: 1 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 40 },
          2: { cellWidth: 45 },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 'auto' }
        }
      });

      return doc;
    } catch (error) {
      console.error('Error generating evaluator assignments PDF:', error);
      throw error;
    }
  }
};

export default pdfService;
