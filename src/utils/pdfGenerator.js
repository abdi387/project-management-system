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

export const generateDefenseSchedulePDF = (department, schedules) => {
  const doc = new jsPDF();
  const safeSchedules = Array.isArray(schedules) ? schedules : [];

  // Header
  doc.setFontSize(20);
  doc.setTextColor(13, 148, 136); // Teal color
  doc.text(`${department || 'Department'} - Defense Schedules`, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  const defenseBody = safeSchedules.map(s => [
    s.groupName || 'N/A',
    s.projectTitle || 'N/A',
    s.members || 'N/A',
    s.evaluators || 'N/A',
    s.date ? new Date(s.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
    s.time || 'N/A',
    s.venue || 'N/A'
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['Group', 'Project', 'Students', 'Evaluators', 'Date', 'Time', 'Venue']],
    body: defenseBody,
    theme: 'striped',
    headStyles: { fillColor: [13, 148, 136] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      2: { cellWidth: 40 },
      3: { cellWidth: 40 }
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