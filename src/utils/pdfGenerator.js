// src/utils/pdfGenerator.js

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateDepartmentReport = (department, data) => {
  const doc = new jsPDF();
  const safeData = data || {};
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(13, 148, 136); // Teal color
  doc.text(`${department || 'Department'} Report`, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  
  let headerInfo = `Generated on: ${new Date().toLocaleDateString()}`;
  if (safeData.academicYear) headerInfo += ` | Academic Year: ${safeData.academicYear}`;
  if (safeData.semester) headerInfo += ` | Semester: ${safeData.semester}`;
  
  doc.text(headerInfo, 14, 30);

  // Statistics Section
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Department Statistics', 14, 45);

  const statsData = [
    ['Total Groups', safeData.totalGroups || 0],
    ['Approved Proposals', safeData.approvedProposals || 0],
    ['Pending Proposals', safeData.pendingProposals || 0],
    ['Groups with Advisor', safeData.groupsWithAdvisor || 0],
    ['Completed Projects', safeData.completedProjects || 0]
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
  let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 100;
  
  if (safeData.groups && safeData.groups.length > 0) {
    doc.setFontSize(14);
    doc.text('Group Details', 14, finalY);

    const groupsBody = safeData.groups.map(g => [
      g.name || 'N/A',
      g.approvedTitle || 'N/A',
      g.members || 'N/A',
      g.advisorName || 'N/A',
      g.progressStatus || 'N/A',
      g.finalDraftStatus || 'N/A'
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
  if (safeData.defenseSchedules && safeData.defenseSchedules.length > 0) {
    // Check for page break
    if (finalY > doc.internal.pageSize.height - 40) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(14);
    doc.text('Defense Schedules', 14, finalY);

    const defenseBody = safeData.defenseSchedules.map(s => [
      s.groupName || 'N/A',
      s.projectTitle || 'N/A',
      s.members || 'N/A',
      s.date ? new Date(s.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
      s.time || 'N/A',
      s.venue || 'N/A',
      s.evaluators || 'N/A'
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
};

export const generateDefenseSchedulePDF = (schedules, department, users, groups) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const safeSchedules = Array.isArray(schedules) ? schedules : [];

  // Header
  doc.setFontSize(20);
  doc.setTextColor(13, 148, 136); // Teal color
  doc.text(`${department || 'Department'} - Defense Schedules`, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  const defenseBody = safeSchedules.map(s => {
    const group = groups.find(g => g.id === s.groupId);
    const firstMember = users.find(u => u.id === group?.members?.[0]);
    const section = firstMember?.section || 'N/A';
    
    const memberNames = group?.members?.map(id => {
        const m = users.find(u => u.id === id);
        return m ? m.name : 'Unknown';
    }).join('\n') || 'N/A';

    const evaluatorNames = s.evaluators?.map(e => e.name).join('\n') || 'N/A';

    return [
      s.groupName || 'N/A',
      section,
      memberNames,
      s.projectTitle || 'N/A',
      s.date ? new Date(s.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
      s.time || 'N/A',
      s.venue || 'N/A',
      evaluatorNames
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [['Group', 'Section', 'Members', 'Project Title', 'Date', 'Time', 'Venue', 'Evaluators']],
    body: defenseBody,
    theme: 'striped',
    styles: { valign: 'middle' },
    headStyles: { fillColor: [13, 148, 136] },
    columnStyles: {
      0: { cellWidth: 20 },
      2: { cellWidth: 40 },
      3: { cellWidth: 50 },
      7: { cellWidth: 40 }
    }
  });

  return doc;
};

export const generateFacultyReport = (faculty, data) => {
  const doc = new jsPDF();
  const safeData = data || {};
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(13, 148, 136); // Teal color
  doc.text(`${faculty || 'Faculty'} Report`, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);

  let headerInfo = `Generated on: ${new Date().toLocaleDateString()}`;
  if (safeData.academicYear) headerInfo += ` | Academic Year: ${safeData.academicYear}`;
  if (safeData.semester) headerInfo += ` | Semester: ${safeData.semester}`;

  doc.text(headerInfo, 14, 30);

  // Statistics Section
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Faculty Statistics', 14, 45);

  const statsData = [
    ['Total Departments', safeData.totalDepartments || 0],
    ['Total Groups', safeData.totalGroups || 0],
    ['Total Students', safeData.totalStudents || 0],
    ['Approved Proposals', safeData.approvedProposals || 0],
    ['Completed Projects', safeData.completedProjects || 0]
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

  if (safeData.departments && Array.isArray(safeData.departments)) {
    let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 100;
    doc.setFontSize(14);
    doc.text('Department Breakdown', 14, finalY);

    const deptBody = safeData.departments.map(d => [
      d.name || 'N/A',
      d.totalGroups || 0,
      d.approvedProposals || 0,
      d.completedProjects || 0,
      d.advisorCount || 0
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Department', 'Groups', 'Approved', 'Completed', 'Advisors']],
      body: deptBody,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] },
      styles: { fontSize: 9, cellPadding: 3 }
    });
  }

  return doc;
};

export const downloadPDF = (doc, filename) => {
  doc.save(`${filename}.pdf`);
};

export const generateRegisteredStudentsPDF = (students, department) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(13, 148, 136); // Teal color
  doc.text(`Registered Students - ${department || 'Department'}`, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  const studentsBody = students.map(student => [
    student.name || 'N/A',
    student.studentId || 'N/A',
    student.email || 'N/A',
    student.section || 'N/A',
    student.cgpa || 'N/A'
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['Name', 'Student ID', 'Email', 'Section', 'CGPA']],
    body: studentsBody,
    theme: 'striped',
    headStyles: { fillColor: [13, 148, 136] },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  return doc;
};


export const generateGroupInformationPDF = (groups, department, users) => {
    const doc = new jsPDF({ orientation: 'landscape' });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(13, 148, 136); // Teal color
    doc.text(`Group Information - ${department || 'Department'}`, 14, 22);
  
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
    const groupsBody = groups.map(group => {
      const firstMember = users.find(u => u.id === group.members[0]);
      const section = firstMember?.section || 'N/A';
      const memberNames = group.members.map(id => {
        const member = users.find(u => u.id === id);
        return member?.name || 'Unknown';
      }).join('\n');
      const advisor = users.find(u => u.id === group.advisorId);
      
      const projectTitle = typeof group.approvedTitle === 'object' ? group.approvedTitle?.title : group.approvedTitle;

      const evaluators = group.evaluators && group.evaluators.length > 0
        ? group.evaluators.map(e => e.name).join('\n')
        : 'Not assigned';
  
      return [
        group.name || 'N/A',
        section,
        memberNames,
        department,
        advisor?.name || 'N/A',
        projectTitle || 'N/A',
        evaluators
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Group ID', 'Section', 'Group Members', 'Department', 'Advisor', 'Project Title', 'Evaluators']],
      body: groupsBody,
      theme: 'striped',
      styles: { valign: 'middle' },
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
  };

export const generateClaimedProjectsPDF = (groups, department, users) => {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Header
  doc.setFontSize(20);
  doc.setTextColor(13, 148, 136); // Teal color
  doc.text(`Claimed Projects - ${department || 'Department'}`, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  const groupsBody = groups.map(group => {
    const firstMember = users.find(u => u.id === group.members[0]);
    const section = firstMember?.section || 'N/A';
    const memberNames = group.members.map(id => {
      const member = users.find(u => u.id === id);
      return member?.name || 'Unknown';
    }).join('\n');
    const advisor = users.find(u => u.id === group.advisorId);
    const projectTitle = typeof group.approvedTitle === 'object' ? group.approvedTitle?.title : group.approvedTitle;

    return [
      group.name || 'N/A',
      section,
      projectTitle || 'N/A',
      advisor?.name || 'N/A',
      memberNames,
      group.progressStatus || 'N/A'
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [['Group', 'Section', 'Project Title', 'Advisor', 'Members', 'Progress']],
    body: groupsBody,
    theme: 'striped',
    styles: { valign: 'middle' },
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
};

export const generateFinalDraftsPDF = (drafts, department, groups, users) => {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Header
  doc.setFontSize(20);
  doc.setTextColor(13, 148, 136); // Teal color
  doc.text(`Final Drafts - ${department || 'Department'}`, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  const draftsBody = drafts.map(draft => {
    const group = groups.find(g => g.id === draft.groupId);
    const advisor = users.find(u => u.id === group?.advisorId);
    
    let section = 'N/A';
    if (group && group.members && group.members.length > 0) {
       const firstMember = users.find(u => u.id === group.members[0]);
       if (firstMember) section = firstMember.section || 'N/A';
    }

    return [
      group?.name || 'Unknown',
      section,
      draft.title || 'N/A',
      advisor?.name || 'Unknown',
      draft.submittedAt ? new Date(draft.submittedAt).toLocaleDateString() : 'N/A'
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [['Group', 'Section', 'Project Title', 'Advisor', 'Submitted Date']],
    body: draftsBody,
    theme: 'striped',
    headStyles: { fillColor: [13, 148, 136] },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 2: { cellWidth: 80 } }
  });

  return doc;
};

export const generateFacultyDefenseSchedulePDF = (schedules, users, groups) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  const safeSchedules = Array.isArray(schedules) ? schedules : [];

  // Header
  doc.setFontSize(20);
  doc.setTextColor(13, 148, 136); // Teal color
  doc.text(`Faculty-wide Defense Schedule`, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  const defenseBody = safeSchedules.map(s => {
    const group = groups.find(g => g.id === s.groupId);
    const firstMember = users.find(u => u.id === group?.members?.[0]);
    const section = firstMember?.section || 'N/A';
    
    const memberNames = group?.members?.map(id => {
        const m = users.find(u => u.id === id);
        return m ? m.name : 'Unknown';
    }).join('\n') || 'N/A';

    const evaluatorNames = s.evaluators?.map(e => e.name).join('\n') || 'N/A';

    return [
      s.groupName || 'N/A',
      section,
      s.department || 'N/A',
      memberNames,
      s.projectTitle || 'N/A',
      s.date ? new Date(s.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
      s.time || 'N/A',
      s.venue || 'N/A',
      evaluatorNames
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [['Group', 'Section', 'Department', 'Members', 'Project Title', 'Date', 'Time', 'Venue', 'Evaluators']],
    body: defenseBody,
    theme: 'striped',
    styles: { valign: 'middle' },
    headStyles: { fillColor: [13, 148, 136] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 15 },
      2: { cellWidth: 30 },
      3: { cellWidth: 40 },
      4: { cellWidth: 50 },
      8: { cellWidth: 40 }
    }
  });

  return doc;
};

export const generateEvaluatorAssignmentsPDF = (assignedGroups, users) => {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Header
  doc.setFontSize(20);
  doc.setTextColor(13, 148, 136); // Teal color
  doc.text(`Evaluator Assignments`, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  const body = assignedGroups.map(group => {
    const firstMember = users.find(u => u.id === group?.members?.[0]);
    const section = firstMember?.section || 'N/A';
    
    const memberNames = group?.members?.map(id => {
        const m = users.find(u => u.id === id);
        return m ? m.name : 'Unknown';
    }).join('\n') || 'N/A';

    const evaluatorNames = group.evaluators?.map(e => e.name).join('\n') || 'N/A';
    const advisor = users.find(u => u.id === group?.advisorId);

    const projectTitle = typeof group?.approvedTitle === 'object' ? group.approvedTitle?.title : group?.approvedTitle;

    return [
      group?.name || 'N/A',
      section,
      group?.department || 'N/A',
      advisor?.name || 'N/A',
      memberNames,
      projectTitle || 'N/A',
      evaluatorNames
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [['Group', 'Section', 'Department', 'Advisor', 'Members', 'Project Title', 'Evaluators']],
    body: body,
    theme: 'striped',
    styles: { valign: 'middle' },
    headStyles: { fillColor: [13, 148, 136] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 15 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 40 },
      5: { cellWidth: 60 },
      6: { cellWidth: 40 }
    }
  });

  return doc;
};