/**
 * Phase 6.5 Stress Test — Direct Google Sheets API
 * Creates 15 records from different form types, then runs concurrency + failure tests
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env');
  const content = readFileSync(envPath, 'utf-8');
  const vars = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) vars[match[1].trim()] = match[2].trim();
  }
  return vars;
}

const env = loadEnv();
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SPREADSHEET_ID = '11dGB-fG2UMqsdqc182PsY-K6S_19FKc8bsZLHlic18M';

let accessToken = '';

async function getAccessToken() {
  const res = await fetch(`https://oauth2.googleapis.com/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  accessToken = data.access_token;
  return accessToken;
}

async function appendRow(row) {
  const range = 'ForgeRecords!A1:J1';
  const res = await fetch(
    `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(`Append failed: ${data.error.message}`);
  return data.updates?.updatedRows || 0;
}

async function getAllRows() {
  const res = await fetch(
    `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/ForgeRecords!A1:J?access_token=${accessToken}`
  );
  const data = await res.json();
  if (data.error) throw new Error(`Read failed: ${data.error.message}`);
  return data.values || [];
}

async function updateRow(rowNumber, row) {
  const range = `ForgeRecords!A${rowNumber}:J${rowNumber}`;
  const res = await fetch(
    `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED&access_token=${accessToken}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(`Update failed: ${data.error.message}`);
  return data.updatedCells || 0;
}

// ─── Test Data ──────────────────────────────────────────────────────────────
const formSchemas = {
  'F/08': { name: 'Order Form', fields: { client_name: 'Test Corp', project_name: 'Stress Test Project', order_date: '2026-04-20', delivery_date: '2026-05-01', status: 'Pending', description: 'Stress test order' } },
  'F/09': { name: 'Customer Complaint', fields: { date: '2026-04-20', customer_name: 'John Doe', project_name: 'Stress Test', complaint_type: 'Service', description: 'Test complaint', status: 'Open', resolution: '' } },
  'F/10': { name: 'Customer Feedback', fields: { date: '2026-04-20', customer_name: 'Jane Smith', project_name: 'Stress Test', feedback_type: 'Positive', comments: 'Great service', rating: '5' } },
  'F/11': { name: 'Production Plan', fields: { date: '2026-04-20', month: 'April', year: '2026', planned_output: '500', actual_output: '', notes: 'Stress test plan' } },
  'F/13': { name: 'Purchase Order', fields: { date: '2026-04-20', supplier: 'ACME Supplies', item: 'Widgets', quantity: '100', unit_price: '', status: 'Pending', delivery_date: '2026-05-15' } },
  'F/17': { name: 'QA Test Request', fields: { date: '2026-04-20', product: 'Widget A', test_type: 'Functional', requested_by: 'Test Lab', priority: 'High', description: 'Stress test request' } },
  'F/20': { name: 'Review Agenda', fields: { date: '2026-04-20', review_type: 'Management', agenda_items: 'Q2 review, budget, performance', participants: 'Management Team' } },
  'F/22': { name: 'Corrective Action', fields: { date: '2026-04-20', nc_reference: 'F/12-001', description: 'Test corrective action', root_cause: 'Process gap', action_taken: 'Procedure update', responsible: 'QA Team', status: 'Open', due_date: '' } },
  'F/25': { name: 'Audit Plan', fields: { date: '2026-04-20', audit_type: 'Internal', scope: 'All departments', period: 'Q2 2026', lead_auditor: 'Ahmed Khaled', status: 'Planned' } },
  'F/28': { name: 'Training Attendance', fields: { date: '2026-04-20', course_name: 'ISO 9001 Overview', trainer: 'Maria Magdy', project: 'Stress Test', agent_id: 'VIZ-020', agent_name: 'Test Agent', attended: 'Yes', score: '85' } },
  'F/30': { name: 'Performance Appraisal', fields: { date: '2026-04-20', period: 'Q1 2026', agent_id: 'VIZ-020', agent_name: 'Test Agent', project: 'Stress Test', score: '82', evaluator: 'Ahmed Khaled', comments: 'Good performance' } },
  'F/35': { name: 'Design Monitoring', fields: { date: '2026-04-20', project: 'Stress Test', phase: 'Development', metrics: 'On track', issues: 'None', action_items: 'Continue monitoring' } },
  'F/43': { name: 'Induction Training Record', fields: { date: '2026-04-20', agent_id: 'VIZ-020', agent_name: 'Test Agent', department: 'QA', qualification: 'BSc Engineering', issued_by: 'Ahmed Khaled', project: 'Stress Test' } },
  'F/48': { name: 'Internal Audit Report', fields: { date: '2026-04-20', audit_id: 'IA-2026-05', scope: 'Quality System', findings: '2 minor NCs', recommendations: 'Update procedures', status: 'Draft' } },
  'F/50': { name: 'Customer Property Register', fields: { date: '2026-04-20', customer: 'Test Corp', property: 'Dataset v2', received_by: 'Ahmed Khaled', condition: 'Good', storage: 'Secure server', return_date: '' } },
};

// Track serials generated to verify uniqueness
const generatedSerials = {};
const serialCounters = {};

function getNextSerial(formCode) {
  if (!serialCounters[formCode]) serialCounters[formCode] = 0;
  serialCounters[formCode]++;
  const num = String(serialCounters[formCode]).padStart(3, '0');
  return `${formCode}-${num}`;
}

function serializeRecord(formCode, data) {
  const serial = data.serial;
  const formName = formSchemas[formCode]?.name || '';
  const createdAt = data._createdAt || new Date().toISOString();
  const createdBy = data._createdBy || 'stress-test';
  const lastModifiedAt = data._lastModifiedAt || '';
  const lastModifiedBy = data._lastModifiedBy || '';
  const editCount = String(data._editCount ?? 0);
  const modificationReason = data._modificationReason || '';

  const metadataKeys = new Set([
    'serial', 'formCode', 'formName',
    '_createdAt', '_createdBy',
    '_lastModifiedAt', '_lastModifiedBy',
    '_editCount', '_modificationReason',
  ]);

  const formDataObj = {};
  for (const [key, value] of Object.entries(data)) {
    if (!metadataKeys.has(key)) {
      formDataObj[key] = value;
    }
  }

  return [
    serial, formCode, formName,
    createdAt, createdBy, lastModifiedAt, lastModifiedBy,
    editCount, modificationReason,
    JSON.stringify(formDataObj),
  ];
}

// ─── Test 1: Create 15 records ──────────────────────────────────────────────
async function testCreateRecords() {
  console.log('\n═══ TEST 1: Create 15 Records ═══');
  const formCodes = Object.keys(formSchemas);
  let created = 0;
  let failed = 0;
  const serials = [];

  // First, get current serial counters from existing data
  const rows = await getAllRows();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0]) {
      const match = row[0].match(/^(F\/\d+)-(\d+)$/);
      if (match) {
        const code = match[1];
        const num = parseInt(match[2], 10);
        if (!serialCounters[code] || serialCounters[code] < num) {
          serialCounters[code] = num;
        }
      }
    }
  }
  console.log(`Existing serial counters: ${JSON.stringify(serialCounters)}`);

  for (const formCode of formCodes) {
    const nextSerial = getNextSerial(formCode);
    if (generatedSerials[nextSerial]) {
      console.log(`  ⚠️ DUPLICATE SERIAL: ${nextSerial} — skipping`);
      failed++;
      continue;
    }
    generatedSerials[nextSerial] = true;

    const data = {
      serial: nextSerial,
      formCode,
      _createdAt: new Date().toISOString(),
      _createdBy: 'stress-test@robin',
      _lastModifiedAt: '',
      _lastModifiedBy: '',
      _editCount: 0,
      _modificationReason: '',
      ...formSchemas[formCode].fields,
    };

    const row = serializeRecord(formCode, data);
    try {
      const updated = await appendRow(row);
      if (updated > 0) {
        console.log(`  ✅ ${nextSerial} (${formSchemas[formCode].name})`);
        serials.push(nextSerial);
        created++;
      } else {
        console.log(`  ❌ ${nextSerial} — 0 rows updated`);
        failed++;
      }
    } catch (err) {
      console.log(`  ❌ ${nextSerial} — ${err.message}`);
      failed++;
    }

    // Small delay between creates
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nResult: ${created} created, ${failed} failed`);
  return serials;
}

// ─── Test 2: Multiple edits on same record ──────────────────────────────────
async function testMultipleEdits() {
  console.log('\n═══ TEST 2: Multiple Edits on Same Record ═══');
  
  // Use F/12-001 (the original record, currently editCount=1)
  const serial = 'F/12-001';
  const rows = await getAllRows();
  let rowNum = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === serial) { rowNum = i + 1; break; } // +1 for header in Sheets row numbering
  }
  if (rowNum < 0) {
    console.log(`  ❌ ${serial} not found`);
    return;
  }

  const edits = [
    { field: 'status', value: 'In Progress', reason: 'Status update #1' },
    { field: 'status', value: 'Closed', reason: 'Status update #2 - closing' },
    { field: 'root_cause', value: 'Updated root cause analysis', reason: 'Root cause refined after investigation' },
    { field: 'corrective_action', value: 'Updated corrective action with lessons learned', reason: 'Action refined' },
    { field: 'description', value: 'Updated description with more detail', reason: 'Adding detail' },
  ];

  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];
    // Simulate update: read current row, modify, write back
    const currentRows = await getAllRows();
    const currentRow = currentRows[rowNum - 1]; // 0-indexed in JS
    let formData = {};
    try { formData = JSON.parse(currentRow[9] || '{}'); } catch { formData = {}; }
    
    formData[edit.field] = edit.value;
    
    const editCount = parseInt(currentRow[7] || '0', 10) + 1;
    const newRow = [
      currentRow[0], currentRow[1], currentRow[2],
      currentRow[3], currentRow[4],
      new Date().toISOString(), 'stress-test@robin',
      String(editCount), edit.reason,
      JSON.stringify(formData),
    ];

    try {
      const cells = await updateRow(rowNum, newRow);
      console.log(`  ✅ Edit ${i+1}: ${edit.field}="${edit.value}" → editCount=${editCount}, ${cells} cells updated`);
    } catch (err) {
      console.log(`  ❌ Edit ${i+1} failed: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // Verify final state
  const finalRows = await getAllRows();
  const finalRow = finalRows[rowNum - 1];
  console.log(`  Final editCount: ${finalRow[7]}, _lastModifiedBy: ${finalRow[6]}`);
}

// ─── Test 3: Serial Uniqueness Check ────────────────────────────────────────
async function testSerialUniqueness() {
  console.log('\n═══ TEST 3: Serial Uniqueness Audit ═══');
  const rows = await getAllRows();
  const serials = {};
  const duplicates = [];
  
  for (let i = 1; i < rows.length; i++) {
    const serial = rows[i][0];
    if (serials[serial]) {
      duplicates.push({ serial, row1: serials[serial], row2: i + 1 });
    } else {
      serials[serial] = i + 1;
    }
  }

  if (duplicates.length === 0) {
    console.log(`  ✅ All ${Object.keys(serials).length} serials are unique`);
  } else {
    console.log(`  ❌ ${duplicates.length} duplicate serials found:`);
    duplicates.forEach(d => console.log(`    ${d.serial}: rows ${d.row1} and ${d.row2}`));
  }
  return duplicates;
}

// ─── Test 4: Data Integrity Audit ──────────────────────────────────────────
async function testDataIntegrity() {
  console.log('\n═══ TEST 4: Data Integrity Audit ═══');
  const rows = await getAllRows();
  const issues = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const serial = row[0] || '';
    const formCode = row[1] || '';
    const formName = row[2] || '';
    const createdAt = row[3] || '';
    const createdBy = row[4] || '';
    const editCount = row[7] || '';
    const formData = row[9] || '';

    // Check serial format
    if (!/^F\/\d{1,2}-\d{3,4}$/.test(serial)) {
      issues.push({ row: rowNum, serial, issue: `Invalid serial format: "${serial}"` });
    }

    // Check formCode
    if (!formCode) {
      issues.push({ row: rowNum, serial, issue: 'Missing formCode' });
    }

    // Check formName
    if (!formName) {
      issues.push({ row: rowNum, serial, issue: 'Missing formName' });
    }

    // Check createdAt
    if (!createdAt) {
      issues.push({ row: rowNum, serial, issue: 'Missing _createdAt' });
    } else if (!createdAt.startsWith('202')) {
      issues.push({ row: rowNum, serial, issue: `Invalid _createdAt: "${createdAt}"` });
    }

    // Check createdBy
    if (!createdBy) {
      issues.push({ row: rowNum, serial, issue: 'Missing _createdBy' });
    }

    // Check editCount is numeric
    if (isNaN(parseInt(editCount, 10))) {
      issues.push({ row: rowNum, serial, issue: `Invalid editCount: "${editCount}"` });
    }

    // Check formData is valid JSON
    try {
      const parsed = JSON.parse(formData);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('formData is not an object');
      }
    } catch (e) {
      issues.push({ row: rowNum, serial, issue: `Invalid JSON in formData: "${formData.substring(0, 50)}..."` });
    }

    // Check serial-formCode consistency
    if (serial && formCode) {
      const codeFromSerial = serial.split('-')[0];
      if (codeFromSerial !== formCode) {
        issues.push({ row: rowNum, serial, issue: `Serial prefix "${codeFromSerial}" doesn't match formCode "${formCode}"` });
      }
    }
  }

  if (issues.length === 0) {
    console.log(`  ✅ All ${rows.length - 1} records pass integrity checks`);
  } else {
    console.log(`  ❌ ${issues.length} integrity issues found:`);
    issues.forEach(i => console.log(`    Row ${i.row} (${i.serial}): ${i.issue}`));
  }
  return issues;
}

// ─── Test 5: Concurrency Simulation ────────────────────────────────────────
async function testConcurrency() {
  console.log('\n═══ TEST 5: Concurrency Simulation ═══');
  
  // Simulate two concurrent updates to the same record
  const serial = 'F/08-001';
  const rows = await getAllRows();
  let rowNum = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === serial) { rowNum = i + 1; break; }
  }
  if (rowNum < 0) {
    console.log(`  ⚠️ ${serial} not found, skipping concurrency test`);
    return;
  }

  const currentRow = rows[rowNum - 1];
  const baseEditCount = parseInt(currentRow[7] || '0', 10);
  let baseFormData = {};
  try { baseFormData = JSON.parse(currentRow[9] || '{}'); } catch {}

  // Tab A: reads, waits, then writes
  const tabA_data = { ...baseFormData, status: 'Processing' };
  const tabA_row = [
    currentRow[0], currentRow[1], currentRow[2],
    currentRow[3], currentRow[4],
    new Date().toISOString(), 'tab-a@robin',
    String(baseEditCount + 1), 'Tab A edit',
    JSON.stringify(tabA_data),
  ];

  // Tab B: reads same base, writes with different change
  const tabB_data = { ...baseFormData, status: 'Approved' };
  const tabB_row = [
    currentRow[0], currentRow[1], currentRow[2],
    currentRow[3], currentRow[4],
    new Date().toISOString(), 'tab-b@robin',
    String(baseEditCount + 1), 'Tab B edit — CONFLICT',
    JSON.stringify(tabB_data),
  ];

  // Tab A writes first
  console.log(`  Tab A writing status="Processing" (editCount=${baseEditCount + 1})...`);
  await updateRow(rowNum, tabA_row);
  
  // Tab B writes after (simulating stale read)
  console.log(`  Tab B writing status="Approved" (editCount=${baseEditCount + 1}) — STALE DATA...`);
  try {
    await updateRow(rowNum, tabB_row);
    // If we get here, the update went through — this is a silent overwrite!
    console.log(`  ⚠️ CONCURRENCY ISSUE: Tab B overwrote Tab A's changes! No optimistic locking at API level.`);
    
    // Verify what's in Sheets now
    const verifyRows = await getAllRows();
    const verifyRow = verifyRows[rowNum - 1];
    const verifyData = JSON.parse(verifyRow[9] || '{}');
    console.log(`  Final status in Sheets: "${verifyData.status}" (should be "Processing" but was overwritten to "Approved")`);
    console.log(`  editCount in Sheets: ${verifyRow[7]} (should be ${baseEditCount + 2} but is ${baseEditCount + 1} due to race)`);
    console.log(`  _lastModifiedBy: "${verifyRow[6]}" (Tab B won the race)`);
  } catch (err) {
    console.log(`  ✅ Update blocked: ${err.message}`);
  }
}

// ─── Test 6: Rapid Serial Generation ────────────────────────────────────────
async function testRapidSerialGeneration() {
  console.log('\n═══ TEST 6: Rapid Serial Generation (5 quick F/12 creates) ═══');
  
  // Get current F/12 counter
  const rows = await getAllRows();
  let maxNum = 0;
  for (let i = 1; i < rows.length; i++) {
    const match = (rows[i][0] || '').match(/^F\/12-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  console.log(`  Current F/12 max serial: F/12-${String(maxNum).padStart(3,'0')}`);

  const rapidSerials = [];
  const promises = [];

  for (let i = 0; i < 5; i++) {
    const nextNum = maxNum + i + 1;
    const serial = `F/12-${String(nextNum).padStart(3, '0')}`;
    rapidSerials.push(serial);
    
    const data = {
      serial,
      formCode: 'F/12',
      _createdAt: new Date().toISOString(),
      _createdBy: 'rapid-test@robin',
      _editCount: 0,
      date: '2026-04-20',
      project_name: 'Rapid Test',
      nc_type: 'Minor',
      description: `Rapid create test #${i+1}`,
      root_cause: '',
      corrective_action: '',
      status: 'Open',
      closure_date: '',
      reported_by: 'Stress Test',
    };

    const row = serializeRecord('F/12', data);
    promises.push(
      appendRow(row)
        .then(() => console.log(`  ✅ ${serial} created`))
        .catch(err => console.log(`  ❌ ${serial} failed: ${err.message}`))
    );
  }

  // Fire all 5 requests simultaneously
  await Promise.all(promises);

  // Verify all unique
  const verifyRows = await getAllRows();
  const f12Serials = [];
  for (let i = 1; i < verifyRows.length; i++) {
    if ((verifyRows[i][0] || '').startsWith('F/12-')) {
      f12Serials.push(verifyRows[i][0]);
    }
  }
  const unique = [...new Set(f12Serials)];
  console.log(`  F/12 serials in Sheet: ${f12Serials.length} total, ${unique.length} unique`);
  if (f12Serials.length !== unique.length) {
    console.log(`  ❌ DUPLICATE SERIALS DETECTED!`);
  } else {
    console.log(`  ✅ All F/12 serials are unique`);
  }
}

// ─── Test 7: Failure Simulation ─────────────────────────────────────────────
async function testFailureSimulation() {
  console.log('\n═══ TEST 7: Failure Simulation ═══');
  
  // Test 7a: Invalid token
  console.log('\n  Test 7a: Invalid access token');
  const goodToken = accessToken;
  const savedToken = accessToken;
  accessToken = 'invalid-token-12345';
  try {
    await appendRow(['F/99-999', 'F/99', 'Test', '', '', '', '', '0', '', '{}']);
    console.log('  ❌ Write succeeded with invalid token — should have failed!');
  } catch (err) {
    console.log(`  ✅ Write correctly rejected: ${err.message.substring(0, 60)}`);
  }
  accessToken = savedToken;

  // Test 7b: Missing required fields (empty serial)
  console.log('\n  Test 7b: Empty serial field');
  try {
    await appendRow(['', 'F/12', 'Non-Conforming', '', '', '', '', '0', '', '{}']);
    console.log('  ⚠️ Empty serial was accepted by Sheets API — validation must be in app layer');
  } catch (err) {
    console.log(`  ✅ Empty serial rejected: ${err.message.substring(0, 60)}`);
  }

  // Test 7c: Invalid JSON in formData
  console.log('\n  Test 7c: Invalid JSON in formData');
  try {
    await appendRow(['F/99-998', 'F/99', 'Test', '', '', '', '', '0', '', 'not-valid-json']);
    console.log('  ⚠️ Invalid JSON was accepted by Sheets — validation must be in app layer');
  } catch (err) {
    console.log(`  ✅ Invalid JSON rejected: ${err.message.substring(0, 60)}`);
  }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  QMS FORGE — Phase 6.5 Stress Test Suite         ║');
  console.log('╚══════════════════════════════════════════════════╝');

  console.log('\n🔐 Getting access token...');
  await getAccessToken();
  console.log('  ✅ Token obtained');

  // Phase 1: Create records
  const serials = await testCreateRecords();

  // Phase 2: Multiple edits
  await testMultipleEdits();

  // Phase 3: Serial uniqueness
  const dupes = await testSerialUniqueness();

  // Phase 4: Data integrity
  const issues = await testDataIntegrity();

  // Phase 5: Concurrency
  await testConcurrency();

  // Phase 6: Rapid serial generation
  await testRapidSerialGeneration();

  // Phase 7: Failure simulation
  await testFailureSimulation();

  // ── Final Summary ──
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  STRESS TEST SUMMARY                             ║');
  console.log('╚══════════════════════════════════════════════════╝');
  
  const finalRows = await getAllRows();
  console.log(`Total records in ForgeRecords: ${finalRows.length - 1}`);
  console.log(`Duplicate serials: ${dupes.length}`);
  console.log(`Integrity issues: ${issues.length}`);

  console.log('\n═══ COMPLETE ═══');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});