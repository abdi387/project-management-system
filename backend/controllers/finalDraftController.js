const { FinalDraft, Group, User, AcademicYear } = require('../models');
const { sequelize } = require('../config/db');
const { validationResult } = require('express-validator');
const {
    notifyFinalDraftSubmission,
    notifyFinalDraftApproval,
    notifyFacultyHeadEvaluatorAssignment,
    notifyDeptHeadDraftReadyForReview
} = require('./notificationController');
const { Op } = require('sequelize');

// @desc    Submit or Resubmit a final draft
// @route   POST /api/final-drafts
// @access  Private/Student
const submitFinalDraft = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { groupId, title, fileUrl, fileName, draftId } = req.body;
    const transaction = await sequelize.transaction();

    try {
        const group = await Group.findByPk(groupId, {
            include: [
                { model: User, as: 'Advisor', attributes: ['id', 'name', 'email'] },
                {
                    model: AcademicYear,
                    as: 'AcademicYear',
                    attributes: ['id', 'semester', 'yearName']
                }
            ],
            transaction
        });

        if (!group) {
            await transaction.rollback();
            return res.status(404).json({ success: false, error: 'Group not found' });
        }

        if (!group.advisorId) {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'Group does not have an advisor assigned' });
        }

        let draft;
        // If draftId is provided, it's a resubmission
        if (draftId) {
            draft = await FinalDraft.findOne({ where: { id: draftId, groupId }, transaction });
            if (!draft) {
                await transaction.rollback();
                return res.status(404).json({ success: false, error: 'Final draft to update not found' });
            }
            if (draft.advisorStatus !== 'rejected') {
                await transaction.rollback();
                return res.status(400).json({ success: false, error: 'Can only resubmit a rejected draft' });
            }

            // Update the existing draft for resubmission
            draft.title = title;
            draft.fileUrl = fileUrl;
            draft.fileName = fileName;
            draft.submittedAt = new Date();
            draft.advisorStatus = 'pending';
            draft.advisorApprovedAt = null;
            await draft.save({ transaction });

        } else {
            // Check if a draft already exists for the current academic year and semester and is not rejected
            const existingDraft = await FinalDraft.findOne({
                where: {
                    groupId,
                    academicYearId: group.academicYearId,
                    semester: String(group.AcademicYear.semester)
                },
                transaction
            });

            if (existingDraft && existingDraft.advisorStatus !== 'rejected') {
                await transaction.rollback();
                return res.status(400).json({ success: false, error: 'A final draft for this group has already been submitted for this semester' });
            }

            // Create a new draft - ensure semester is stored as string '1' or '2'
            draft = await FinalDraft.create({
                groupId,
                userId: req.user.id,
                academicYearId: group.academicYearId,
                semester: String(group.AcademicYear.semester),
                title,
                fileUrl,
                fileName,
                submittedAt: new Date(),
                advisorStatus: 'pending',
            }, { transaction });
        }

        // Update group status to show a draft has been submitted
        group.finalDraftStatus = 'submitted';
        await group.save({ transaction });

        await transaction.commit();

        // Fire-and-forget notification to avoid delaying the API response.
        // This prevents client timeouts if notification sending is slow.
        if (group.Advisor) {
            notifyFinalDraftSubmission(
                group.Advisor,
                group.name,
                draft.title,
                group.department
            ).catch(err => console.error('BACKGROUND NOTIFICATION FAILED:', err));
        }

        res.status(201).json({
            success: true,
            message: 'Final draft submitted successfully',
            draft,
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Submit final draft error:', error);
        res.status(500).json({ success: false, error: 'Server error: ' + error.message });
    }
};

// @desc    Get final draft by group ID
// @route   GET /api/final-drafts/group/:groupId
// @access  Private
const getFinalDraftByGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const drafts = await FinalDraft.findAll({
            where: { groupId },
            include: [
                {
                    model: User,
                    as: 'Student',
                    attributes: ['id', 'name']
                }
            ],
            order: [['submittedAt', 'DESC']]
        });

        if (!drafts || drafts.length === 0) {
            // This is not an error; it just means no draft has been submitted yet.
            return res.status(404).json({ success: false, error: 'Final draft not found for this group' });
        }

        res.json({ success: true, drafts });
    } catch (error) {
        console.error('Get final draft by group error:', error);
        res.status(500).json({ success: false, error: 'Server error: ' + error.message });
    }
};

// @desc    Get all final drafts for the logged-in advisor
// @route   GET /api/final-drafts/advisor/pending
// @access  Private/Advisor
const getPendingAdvisorDrafts = async (req, res) => {
    try {
        // Find all groups mentored by the current advisor
        const advisorGroups = await Group.findAll({
            where: { advisorId: req.user.id },
            attributes: ['id', 'academicYearId']
        });

        if (advisorGroups.length === 0) {
            return res.json({ success: true, drafts: [] });
        }

        const groupIds = advisorGroups.map(g => g.id);

        // Find all drafts for these groups
        const drafts = await FinalDraft.findAll({
            where: {
                groupId: { [Op.in]: groupIds }
            },
            include: [
                {
                    model: Group,
                    as: 'Group',
                    attributes: ['name', 'department', 'academicYearId']
                }
            ],
            order: [['submittedAt', 'DESC']]
        });

        res.json({ success: true, drafts });
    } catch (error) {
        console.error('Get advisor drafts error:', error);
        res.status(500).json({ success: false, error: 'Server error: ' + error.message });
    }
};

// @desc    Approve a final draft (by Advisor)
// @route   PUT /api/final-drafts/:draftId/advisor-approve
// @access  Private/Advisor
const approveDraftByAdvisor = async (req, res) => {
    const { draftId } = req.params;
    const advisorId = req.user.id;
    const transaction = await sequelize.transaction();

    try {
        const draft = await FinalDraft.findByPk(draftId, {
            include: [{ model: Group, as: 'Group' }],
            transaction
        });

        if (!draft) {
            await transaction.rollback();
            return res.status(404).json({ success: false, error: 'Draft not found' });
        }

        if (draft.Group.advisorId !== advisorId) {
            await transaction.rollback();
            return res.status(403).json({ success: false, error: 'You are not authorized to approve this draft' });
        }

        draft.advisorStatus = 'approved';
        draft.advisorApprovedAt = new Date();
        await draft.save({ transaction });

        // Also update the group's status to reflect advisor approval
        await Group.update(
            { finalDraftStatus: 'advisor-approved' },
            { where: { id: draft.groupId }, transaction }
        );

        await transaction.commit();

        // --- Notification to Group Members (Async - don't block response) ---
        setImmediate(async () => {
            try {
                const groupWithMembers = await Group.findByPk(draft.groupId, {
                    include: [
                        {
                            model: User,
                            as: 'Members',
                            attributes: ['id', 'name', 'email']
                        },
                        {
                            model: User,
                            as: 'Advisor',
                            attributes: ['id', 'name']
                        }
                    ]
                });

                const memberIds = groupWithMembers?.Members?.map(m => m.id) || [];
                const advisorName = groupWithMembers?.Advisor?.name || 'Your Advisor';

                if (memberIds.length > 0) {
                    await notifyFinalDraftApproval(
                        groupWithMembers,
                        memberIds,
                        'advisor',
                        advisorName,
                        draft.title
                    );
                    console.log(`✅ Final draft approval notification sent to ${memberIds.length} group members`);
                }
            } catch (notifError) {
                console.error('❌ Failed to send final draft approval notification to students:', notifError);
            }

            // --- Notification to Department Head (Async) ---
            try {
                const deptHeads = await User.findAll({
                    where: {
                        role: 'dept-head',
                        department: draft.Group.department,
                        status: 'active'
                    },
                    attributes: ['id', 'name', 'email']
                });

                if (deptHeads.length > 0) {
                    await notifyDeptHeadDraftReadyForReview(
                        deptHeads,
                        draft.Group.name,
                        draft.Group.department,
                        draft.title,
                        draft.Group.Advisor?.name || 'Advisor'
                    );
                    console.log(`✅ Dept head notification sent for draft approval`);
                }
            } catch (notifError) {
                console.error('❌ Failed to send notification to dept head:', notifError);
            }

            // --- Escalation to Faculty Head for Evaluator Assignment (Async) ---
            try {
                const facultyHeads = await User.findAll({
                    where: { role: 'faculty-head' }
                });

                if (facultyHeads.length > 0) {
                    const facultyHeadIds = facultyHeads.map(h => h.id);
                    await notifyFacultyHeadEvaluatorAssignment(facultyHeadIds, draft.Group.name, draft.Group.department);
                    console.log(`✅ Faculty head notification sent for evaluator assignment`);
                }
            } catch (notifError) {
                console.error('❌ Failed to send notification to faculty head:', notifError);
            }
        });

        res.json({ success: true, message: 'Draft approved successfully', draft });
    } catch (error) {
        // Check if the transaction has already been committed or rolled back
        if (!transaction.finished) {
            await transaction.rollback();
        }
        console.error('Approve draft by advisor error:', error);
        res.status(500).json({ success: false, error: 'Server error: ' + error.message });
    }
};

// @desc    Get all final drafts for a department that are advisor-approved
// @route   GET /api/final-drafts/department/:department
// @access  Private/Dept-Head
const getDepartmentDrafts = async (req, res) => {
    try {
        const { department } = req.params;
        const { academicYearId, semester } = req.query; // Support filtering by academic year and semester

        if (req.user.role === 'dept-head' && req.user.department !== department) {
            return res.status(403).json({ success: false, error: 'You are not authorized to view drafts for this department' });
        }

        const groupWhereClause = { department };
        if (academicYearId) {
            // Ensure we filter by the active academic year if provided
            const parsedYearId = parseInt(academicYearId, 10);
            if (!isNaN(parsedYearId)) {
                groupWhereClause.academicYearId = parsedYearId;
            }
        }

        const groupsInDept = await Group.findAll({ where: groupWhereClause, attributes: ['id'] });
        if (groupsInDept.length === 0) return res.json({ success: true, drafts: [] });

        const groupIds = groupsInDept.map(g => g.id);

        // Build the where clause for drafts
        const draftWhereClause = {
            groupId: { [Op.in]: groupIds },
            advisorStatus: 'approved' // Only fetch drafts approved by the advisor
        };
        
        // Filter by semester if provided
        if (semester) {
            draftWhereClause.semester = semester;
        }

        // Get all advisor-approved drafts for dept head to view
        const drafts = await FinalDraft.findAll({
            where: draftWhereClause,
            include: [
                {
                    model: Group,
                    as: 'Group',
                    include: [
                        { model: User, as: 'Advisor' },
                        { model: User, as: 'Members' }
                    ]
                }
            ],
            order: [['submittedAt', 'DESC']]
        });

        res.json({ success: true, drafts });
    } catch (error) {
        console.error('Get department drafts error:', error);
        res.status(500).json({ success: false, error: 'Server error: ' + error.message });
    }
};

// @desc    Get all final drafts (approved and pending) for faculty head
// @route   GET /api/final-drafts/faculty-head/drafts
// @access  Private/Faculty-Head
const getFacultyHeadDrafts = async (req, res) => {
    try {
        const { academicYearId, status, semester } = req.query;

        // Build the where clause for final drafts
        const draftWhereClause = {};

        // Filter by status if provided (pending or approved)
        if (status) {
            draftWhereClause.advisorStatus = status;
        } else {
            // Default: fetch both pending and approved drafts
            draftWhereClause.advisorStatus = {
                [Op.in]: ['pending', 'approved']
            };
        }
        
        // Filter by semester if provided
        if (semester) {
            draftWhereClause.semester = semester;
        }

        // Build the where clause for groups
        const groupWhereClause = {};
        if (academicYearId) {
            const parsedYearId = parseInt(academicYearId, 10);
            if (!isNaN(parsedYearId)) {
                groupWhereClause.academicYearId = parsedYearId;
            }
        }

        // Get all groups with the where clause
        const allGroups = await Group.findAll({
            where: groupWhereClause,
            attributes: ['id']
        });

        if (allGroups.length === 0) {
            return res.json({ success: true, drafts: [] });
        }

        const groupIds = allGroups.map(g => g.id);

        // Get all final drafts with pending or approved status
        const drafts = await FinalDraft.findAll({
            where: {
                groupId: { [Op.in]: groupIds },
                ...draftWhereClause
            },
            include: [
                {
                    model: Group,
                    as: 'Group',
                    include: [
                        { model: User, as: 'Advisor', attributes: ['id', 'name'] },
                        { model: User, as: 'Members', attributes: ['id', 'name'] }
                    ]
                }
            ],
            order: [['submittedAt', 'DESC']]
        });

        res.json({ success: true, drafts });
    } catch (error) {
        console.error('Get faculty head drafts error:', error);
        res.status(500).json({ success: false, error: 'Server error: ' + error.message });
    }
};

module.exports = {
    submitFinalDraft,
    getFinalDraftByGroup,
    getPendingAdvisorDrafts,
    approveDraftByAdvisor,
    getDepartmentDrafts,
    getFacultyHeadDrafts,
};
