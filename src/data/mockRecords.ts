// ============================================================================
// QMS Forge — Mock Record Store
// Local mock data for Phase 5 development. Will be replaced by Google Sheets
// integration in Phase 6. All data goes through Zod validation on read/write.
// ============================================================================

export interface QMSRecord {
  // Identity fields — READ-ONLY after creation
  readonly serial: string;          // F/12-001
  readonly formCode: string;       // F/12
  readonly formName: string;       // Non-Conforming Report
  readonly _createdAt: string;     // ISO timestamp
  readonly _createdBy: string;     // user email

  // Edit tracking
  _lastModifiedAt: string | null;  // ISO timestamp
  _lastModifiedBy: string | null;   // user email
  _editCount: number;               // incremented on each save
  _modificationReason: string | null; // reason for last critical field edit

  // Form data — all fields from the Zod schema for this form
  [key: string]: unknown;
}

// ============================================================================
// Mock data — realistic records based on project data
// ============================================================================

export const MOCK_RECORDS: QMSRecord[] = [
  // F/12 — Non-Conforming Reports
  {
    serial: 'F/12-001',
    formCode: 'F/12',
    formName: 'Non-Conforming Report',
    _createdAt: '2026-02-15T10:30:00Z',
    _createdBy: 'akh.dev185@gmail.com',
    _lastModifiedAt: null,
    _lastModifiedBy: null,
    _editCount: 0,
    _modificationReason: null,
    date: '2026-02-15',
    project_name: 'ETH AI Model Testing',
    nc_type: 'Major',
    description: 'Agent VIZ-012 (Nada Kotb) failed 3 consecutive accuracy checks below 80% threshold on ETH annotation tasks during Q1 2026 review period.',
    root_cause: 'Insufficient training on edge cases in dataset labeling guidelines — agent was not exposed to ambiguity scenarios during onboarding.',
    corrective_action: 'Retraining session scheduled for 25/04/2026 with updated guidelines. Mentorship program assigned with weekly check-ins.',
    status: 'Open',
    closure_date: '',
    reported_by: 'Ahmed Khaled',
  },
  {
    serial: 'F/12-002',
    formCode: 'F/12',
    formName: 'Non-Conforming Report',
    _createdAt: '2026-03-22T14:15:00Z',
    _createdBy: 'akh.dev185@gmail.com',
    _lastModifiedAt: '2026-04-01T09:00:00Z',
    _lastModifiedBy: 'akh.dev185@gmail.com',
    _editCount: 2,
    _modificationReason: 'Status changed from In Progress to Closed after corrective action verified.',
    date: '2026-03-22',
    project_name: 'BatFast Image Annotation',
    nc_type: 'Minor',
    description: 'Batch 14 of BatFast annotations contained 12% label errors due to ambiguous category definitions in guidelines v2.1.',
    root_cause: 'Guidelines v2.1 had overlapping categories between "vehicle" and "transport" labels causing annotator confusion.',
    corrective_action: 'Guidelines updated to v2.2 with clearer category definitions. Batch 14 re-annotated with 98.5% accuracy.',
    status: 'Closed',
    closure_date: '2026-04-01',
    reported_by: 'Ahmed Khaled',
  },
  {
    serial: 'F/12-003',
    formCode: 'F/12',
    formName: 'Non-Conforming Report',
    _createdAt: '2026-04-18T08:45:00Z',
    _createdBy: 'akh.dev185@gmail.com',
    _lastModifiedAt: '2026-04-19T11:00:00Z',
    _lastModifiedBy: 'akh.dev185@gmail.com',
    _editCount: 4,
    _modificationReason: 'Corrective action updated with new deadline after vendor delay.',
    date: '2026-04-18',
    project_name: 'ETH-Cedric Video Annotation',
    nc_type: 'Critical',
    description: 'Client Cedric reported 23% of video annotations in batch 7 had timestamp misalignment exceeding 500ms tolerance.',
    root_cause: 'Video player sync issue in annotation platform — frame timestamps calculated from different reference point than source video.',
    corrective_action: 'Platform update deployed on 20/04. Batch 7 re-queued for review. New QA check added for timestamp alignment in all video annotation tasks.',
    status: 'In Progress',
    closure_date: '',
    reported_by: 'Ahmed Khaled',
  },

  // F/43 — Induction Training Records
  {
    serial: 'F/43-039',
    formCode: 'F/43',
    formName: 'Induction Training Record',
    _createdAt: '2026-01-30T09:00:00Z',
    _createdBy: 'akh.dev185@gmail.com',
    _lastModifiedAt: null,
    _lastModifiedBy: null,
    _editCount: 0,
    _modificationReason: null,
    date: '2026-01-30',
    employee_name: 'Sandii Magdy',
    employee_id: 'VIZ-001',
    department: 'Annotation — BatFast',
    project: 'BatFast',
    qualification: 'BSc Computer Science',
    trainer: 'Maria Magdy',
    issued_by: 'Ahmed Khaled',
    performance: 85,
    topics_covered: 'Platform onboarding, labeling guidelines v2.2, quality standards, KPI targets',
    trainer_signature: 'Maria Magdy',
    manager_signature: 'Ahmed Khaled',
  },
  {
    serial: 'F/43-044',
    formCode: 'F/43',
    formName: 'Induction Training Record',
    _createdAt: '2026-02-27T09:00:00Z',
    _createdBy: 'akh.dev185@gmail.com',
    _lastModifiedAt: '2026-03-05T14:30:00Z',
    _lastModifiedBy: 'akh.dev185@gmail.com',
    _editCount: 1,
    _modificationReason: 'Performance score updated from 82% to 83% after accuracy review.',
    date: '2026-02-27',
    employee_name: 'Omar Hamdy',
    employee_id: 'VIZ-006',
    department: 'AI Model Testing — ETH',
    project: 'ETH',
    qualification: 'BSc Information Systems',
    trainer: 'Maria Magdy',
    issued_by: 'Ahmed Khaled',
    performance: 83,
    topics_covered: 'AI model testing methodology, error categorization, reporting protocols, platform tools',
    trainer_signature: 'Maria Magdy',
    manager_signature: 'Ahmed Khaled',
  },

  // F/11 — Production Plans
  {
    serial: 'F/11-007',
    formCode: 'F/11',
    formName: 'Production Plan',
    _createdAt: '2026-04-01T08:00:00Z',
    _createdBy: 'akh.dev185@gmail.com',
    _lastModifiedAt: null,
    _lastModifiedBy: null,
    _editCount: 0,
    _modificationReason: null,
    date: '2026-04-01',
    month: 'April',
    year: 2026,
    projects: [
      { name: 'BatFast', client: 'BatFast', status: 'Active', notes: 'Image annotation — final batch processing' },
      { name: 'ETH', client: 'Adam', status: 'Active', notes: 'AI model testing — continuous evaluation' },
      { name: 'ETH-Cedric', client: 'Cedric', status: 'Active', notes: 'Video annotation — batch 8 onwards' },
    ],
    prepared_by: 'Ahmed Khaled',
    approved_by: 'Ahmed Khaled',
  },

  // F/10 — Customer Feedback
  {
    serial: 'F/10-002',
    formCode: 'F/10',
    formName: 'Customer Feedback',
    _createdAt: '2026-02-17T16:00:00Z',
    _createdBy: 'akh.dev185@gmail.com',
    _lastModifiedAt: null,
    _lastModifiedBy: null,
    _editCount: 0,
    _modificationReason: null,
    date: '2026-02-17',
    client_name: 'BatFast',
    project_name: 'BatFast',
    product_quality: 'Good',
    order_processing: 'Excellent',
    complaint_handling: 'Satisfactory',
    delivery: 'Good',
    price: 'N/A',
    comments: 'Overall satisfied with annotation quality. Some minor delays in batch delivery. Team responsiveness is excellent.',
    reviewed_by: 'Ahmed Khaled',
  },
];

// ============================================================================
// Helper functions
// ============================================================================

/** Get records filtered by form code */
export function getRecordsByForm(formCode: string): QMSRecord[] {
  return MOCK_RECORDS.filter(r => r.formCode === formCode);
}

/** Get a single record by serial number */
export function getRecordBySerial(serial: string): QMSRecord | undefined {
  return MOCK_RECORDS.find(r => r.serial === serial);
}

/** Get all unique form codes present in the data */
export function getActiveFormCodes(): string[] {
  return [...new Set(MOCK_RECORDS.map(r => r.formCode))].sort();
}

/** Check if a record has been frequently modified */
export function isFrequentlyModified(record: QMSRecord): boolean {
  return record._editCount > 3;
}

/** Get edit risk level */
export function getEditRiskLevel(record: QMSRecord): 'none' | 'low' | 'medium' | 'high' {
  if (record._editCount === 0) return 'none';
  if (record._editCount <= 1) return 'low';
  if (record._editCount <= 3) return 'medium';
  return 'high';
}