import { Router } from 'express';
import multer from 'multer';
import { authenticateJWT, requireRole } from '../middleware/auth';
import {
  acceptAllDraftBlocks,
  acceptDepreciation,
  addManualBlock,
  addManualWall,
  addStructure,
  bindCaseRates,
  calculateSnapshot,
  confirmWallRun,
  createDraftLine,
  decideBlock,
  excludeHelperBlocks,
  exportSnapshotPdf,
  exportSnapshotXls,
  finalizeSnapshot,
  generateApplicability,
  generateMeasurementSheet,
  generateCandidates,
  getSnapshot,
  getWorkflowCase,
  searchCaseCatalogue,
  importRateSchedule,
  importYpTable,
  pinRate,
  removeStructure,
  replaceMembers,
  replaceOpenings,
  replaceRooms,
  runSourceReplay,
  updateIdentity,
  updateStructureProfile,
  applyStructureLayout,
  applySimplePlan,
  patchWallRun,
  patchRoom,
  uploadEvidence,
} from '../controllers/workflowController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.use(authenticateJWT);

router.get('/cases/:caseId', getWorkflowCase);
router.get('/cases/:caseId/catalogue', searchCaseCatalogue);
router.put('/cases/:caseId/identity', updateIdentity);
router.post('/cases/:caseId/structures', addStructure);
router.delete('/structures/:id', removeStructure);
router.put('/structures/:id', updateStructureProfile);
router.put('/structures/:id/structure-layout', applyStructureLayout);
router.put('/structures/:id/simple-plan', applySimplePlan);
router.patch('/wall-runs/:id', patchWallRun);
router.patch('/rooms/:id', patchRoom);
router.put('/structures/:id/rooms', replaceRooms);
router.post('/structures/:id/geometry/candidates', generateCandidates);
router.post('/wall-runs/:id/confirm', confirmWallRun);
router.post('/structures/:id/wall-runs', addManualWall);
router.put('/structures/:id/openings', replaceOpenings);
router.put('/structures/:id/members', replaceMembers);
router.post('/structures/:id/generate', generateApplicability);
router.post('/structures/:id/generate-measurement', generateMeasurementSheet);
router.post('/structures/:id/draft-lines', createDraftLine);
router.post('/blocks/:id/decision', decideBlock);
router.post('/cases/:caseId/accept-draft-blocks', acceptAllDraftBlocks);
router.post('/cases/:caseId/bind-rates', bindCaseRates);
router.post('/cases/:caseId/exclude-helper-blocks', excludeHelperBlocks);
router.post('/structures/:id/manual-block', addManualBlock);
router.post('/blocks/:id/rate', pinRate);
router.post('/cases/:caseId/calculate', calculateSnapshot);
router.post('/cases/:caseId/depreciation/accept', acceptDepreciation);
router.post('/cases/:caseId/source-replay', runSourceReplay);
router.post('/cases/:caseId/evidence', upload.single('file'), uploadEvidence);
router.post('/snapshots/:id/finalize', requireRole(['ADMIN']), finalizeSnapshot);
router.get('/snapshots/:id', getSnapshot);
router.get('/snapshots/:id/pdf', exportSnapshotPdf);
router.get('/snapshots/:id/xls', exportSnapshotXls);
router.post('/rate-schedules/import', requireRole(['ADMIN']), importRateSchedule);
router.post('/yp-tables/import', requireRole(['ADMIN']), importYpTable);

export default router;
