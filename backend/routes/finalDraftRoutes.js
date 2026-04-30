const express = require('express');
const router = express.Router();
const { 
    submitFinalDraft, 
    getFinalDraftByGroup,
    getPendingAdvisorDrafts,
    approveDraftByAdvisor,
    getDepartmentDrafts,
    getFacultyHeadDrafts,
} = require('../controllers/finalDraftController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, submitFinalDraft);
router.get('/group/:groupId', protect, getFinalDraftByGroup);

// Routes for advisor approval workflow
router.get(
    '/advisor/pending',
    protect,
    authorize('advisor'),
    getPendingAdvisorDrafts
);
router.put(
    '/:draftId/advisor-approve',
    protect,
    authorize('advisor'),
    approveDraftByAdvisor
);

// Route for department head to view drafts
router.get(
    '/department/:department',
    protect,
    authorize('dept-head'),
    getDepartmentDrafts
);

// Route for faculty head to view all approved and pending drafts
router.get(
    '/faculty-head/drafts',
    protect,
    authorize('faculty-head'),
    getFacultyHeadDrafts
);

module.exports = router;
