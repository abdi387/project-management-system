const User = require('./User');
const AcademicYear = require('./AcademicYear');
const Group = require('./Group');
const GroupMember = require('./GroupMember');
const Evaluator = require('./Evaluator');
const Proposal = require('./Proposal');
const ProposalTitle = require('./ProposalTitle');
const ProgressReport = require('./ProgressReport');
const FinalDraft = require('./FinalDraft');
const DefenseSchedule = require('./DefenseSchedule');
const Venue = require('./Venue');
const ProjectDomain = require('./ProjectDomain');
const Notification = require('./Notification');
const Inquiry = require('./Inquiry');
const SystemSetting = require('./SystemSetting');
const RegistrationControl = require('./RegistrationControl');
const AdvisorRepository = require('./AdvisorRepository');
const PasswordResetToken = require('./PasswordResetToken');
const Section = require('./Section');

// Define associations

// User associations
User.belongsTo(Section, { as: 'Section', foreignKey: 'section' });
User.hasMany(Group, { as: 'LedGroups', foreignKey: 'leaderId' });
User.hasMany(Group, { as: 'AdvisedGroups', foreignKey: 'advisorId' });
User.belongsToMany(Group, { 
  through: GroupMember, 
  as: 'MemberOfGroups', 
  foreignKey: 'userId',
  otherKey: 'groupId'
});
User.belongsToMany(Group, { 
  through: Evaluator, 
  as: 'EvaluatorOfGroups', 
  foreignKey: 'userId',
  otherKey: 'groupId'
});
User.hasMany(Proposal, { as: 'Proposals', foreignKey: 'userId' });
User.hasMany(ProgressReport, { as: 'ProgressReports', foreignKey: 'userId' });
User.hasMany(FinalDraft, { as: 'FinalDrafts', foreignKey: 'userId' });
User.hasMany(Notification, { as: 'Notifications', foreignKey: 'userId' });
User.hasMany(Inquiry, { as: 'Inquiries', foreignKey: 'userId' });

// Group associations
Group.belongsTo(User, { as: 'Leader', foreignKey: 'leaderId' });
Group.belongsTo(User, { as: 'Advisor', foreignKey: 'advisorId' });
Group.belongsTo(AcademicYear, { as: 'AcademicYear', foreignKey: 'academicYearId' });
Group.belongsToMany(User, { 
  through: GroupMember, 
  as: 'Members', 
  foreignKey: 'groupId',
  otherKey: 'userId'
});
Group.belongsToMany(User, { 
  through: Evaluator, 
  as: 'Evaluators', 
  foreignKey: 'groupId',
  otherKey: 'userId'
});
Group.hasMany(Proposal, { as: 'Proposals', foreignKey: 'groupId' });
Group.hasMany(ProgressReport, { as: 'ProgressReports', foreignKey: 'groupId' });
Group.hasMany(FinalDraft, { as: 'FinalDrafts', foreignKey: 'groupId' });
Group.hasMany(DefenseSchedule, { as: 'DefenseSchedules', foreignKey: 'groupId' });

// GroupMember associations
GroupMember.belongsTo(Group, { foreignKey: 'groupId', as: 'Group' });
GroupMember.belongsTo(User, { foreignKey: 'userId', as: 'User' });

// Evaluator associations
Evaluator.belongsTo(Group, { foreignKey: 'groupId', as: 'Group' });
Evaluator.belongsTo(User, { foreignKey: 'userId', as: 'User' });
Evaluator.belongsTo(AcademicYear, { foreignKey: 'academicYearId', as: 'AcademicYear' });

// AcademicYear associations
AcademicYear.hasMany(Group, { as: 'Groups', foreignKey: 'academicYearId' });
AcademicYear.hasMany(Proposal, { as: 'Proposals', foreignKey: 'academicYearId' });
AcademicYear.hasMany(DefenseSchedule, { as: 'DefenseSchedules', foreignKey: 'academicYearId' });

// Proposal associations
Proposal.belongsTo(Group, { as: 'Group', foreignKey: 'groupId' });
Proposal.belongsTo(User, { as: 'Student', foreignKey: 'userId' });
Proposal.belongsTo(AcademicYear, { as: 'AcademicYear', foreignKey: 'academicYearId' });
Proposal.hasMany(ProposalTitle, { as: 'Titles', foreignKey: 'proposalId' });

// ProposalTitle associations
ProposalTitle.belongsTo(Proposal, { as: 'Proposal', foreignKey: 'proposalId' });
ProposalTitle.belongsTo(ProjectDomain, { as: 'Domain', foreignKey: 'domainId' });

// ProgressReport associations
ProgressReport.belongsTo(Group, { as: 'Group', foreignKey: 'groupId' });
ProgressReport.belongsTo(User, { as: 'Student', foreignKey: 'userId' });

// FinalDraft associations
FinalDraft.belongsTo(Group, { as: 'Group', foreignKey: 'groupId' });
FinalDraft.belongsTo(User, { as: 'Student', foreignKey: 'userId' });

// DefenseSchedule associations
DefenseSchedule.belongsTo(Group, { as: 'Group', foreignKey: 'groupId' });
DefenseSchedule.belongsTo(Venue, { as: 'Venue', foreignKey: 'venueId' });
DefenseSchedule.belongsTo(AcademicYear, { as: 'AcademicYear', foreignKey: 'academicYearId' });

// Venue associations
Venue.hasMany(DefenseSchedule, { as: 'DefenseSchedules', foreignKey: 'venueId' });

// ProjectDomain associations
ProjectDomain.hasMany(ProposalTitle, { as: 'ProposalTitles', foreignKey: 'domainId' });

// Notification associations
Notification.belongsTo(User, { as: 'User', foreignKey: 'userId' });

// Inquiry associations
Inquiry.belongsTo(User, { as: 'User', foreignKey: 'userId' });

// RegistrationControl associations
RegistrationControl.belongsTo(AcademicYear, { as: 'AcademicYear', foreignKey: 'academicYearId' });

// AdvisorRepository associations
AdvisorRepository.belongsTo(User, { as: 'Advisor', foreignKey: 'advisorId' });
AdvisorRepository.belongsTo(Group, { as: 'Group', foreignKey: 'groupId' });
AdvisorRepository.belongsTo(AcademicYear, { as: 'AcademicYear', foreignKey: 'academicYearId' });

// PasswordResetToken associations
PasswordResetToken.belongsTo(User, {
  as: 'User',
  foreignKey: 'userId',
  targetKey: 'id',
  onDelete: 'CASCADE'
});
User.hasMany(PasswordResetToken, {
  as: 'PasswordResetTokens',
  foreignKey: 'userId',
  onDelete: 'CASCADE'
});

// Section associations
Section.hasMany(User, { as: 'Users', foreignKey: 'section' });

module.exports = {
  User,
  AcademicYear,
  Group,
  GroupMember,
  Evaluator,
  Proposal,
  ProposalTitle,
  ProgressReport,
  FinalDraft,
  DefenseSchedule,
  Venue,
  ProjectDomain,
  Notification,
  Inquiry,
  SystemSetting,
  RegistrationControl,
  AdvisorRepository,
  PasswordResetToken,
  Section
};