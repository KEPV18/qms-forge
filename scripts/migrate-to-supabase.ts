/**
 * Phase 3: Migration Script — qms-forge
 * Reads all data from Google Sheets → inserts into Supabase.
 * Run ONCE. Validates counts and integrity.
 *
 * Usage: npx tsx scripts/migrate-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_API_KEY || '';
const SPREADSHEET_ID = process.env.VITE_SPREADSHEET_ID || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  if (!SUPABASE_URL) console.error('   VITE_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!GOOGLE_API_KEY || !SPREADSHEET_ID) {
  console.error('❌ Missing Google Sheets config in .env.local');
  if (!GOOGLE_API_KEY) console.error('   VITE_GOOGLE_API_KEY');
  if (!SPREADSHEET_ID) console.error('   VITE_SPREADSHEET_ID');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

const COL = {
  CATEGORY: 0, CODE: 1, RECORD_NAME: 2, DESCRIPTION: 3, WHEN_TO_FILL: 4,
  TEMPLATE_LINK: 5, FOLDER_LINK: 6, LAST_SERIAL: 7, LAST_FILE_DATE: 8,
  DAYS_AGO: 9, NEXT_SERIAL: 10, AUDIT_STATUS: 11, REVIEWED_BY: 13,
  REVIEW_DATE: 14, FILE_REVIEWS: 15, REVIEWED_FLAG: 17,
} as const;

interface SheetRow {
  rowIndex: number; category: string; code: string; recordName: string;
  description: string; whenToFill: string; templateLink: string;
  folderLink: string; lastSerial: string; lastFileDate: string;
  daysAgo: string; nextSerial: string; auditStatus: string;
  reviewed: boolean; reviewedBy: string; reviewDate: string;
  fileReviews: Record<string, unknown>; auditIssues: string[];
  recordStatus: string; lastAuditDate: string | null;
}

async function fetchSheetRows(): Promise<SheetRow[]> {
  const url = `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/Data!A1:R100?key=${GOOGLE_API_KEY}`;
  console.log('📥 Fetching data from Google Sheets...');

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sheets API: ${response.status} ${response.statusText}`);

  const data = await response.json();
  const rawRows: string[][] = data.values || [];
  console.log(`   Got ${rawRows.length} raw rows`);

  const records: SheetRow[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || !row.length) continue;
    if ((row[0] || '').startsWith('📂') || row[0] === 'Category' || !row[0]) continue;
    if (row.length <= COL.CODE || !row[COL.CODE]) continue;

    let fileReviews: Record<string, unknown> = {};
    if (row[COL.FILE_REVIEWS]) {
      try {
        const parsed = JSON.parse(row[COL.FILE_REVIEWS]);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) fileReviews = parsed;
      } catch { console.warn(`   ⚠️ Bad JSON row ${i + 1}`); }
    }

    const auditIssues: string[] = Array.isArray((fileReviews as Record<string, unknown>).auditIssues)
      ? (fileReviews as Record<string, unknown>).auditIssues as string[] : [];
    const recordStatus = String((fileReviews as Record<string, unknown>).recordStatus || 'pending');
    const lastAuditDate = (fileReviews as Record<string, unknown>).lastAuditDate
      ? String((fileReviews as Record<string, unknown>).lastAuditDate) : null;

    records.push({
      rowIndex: i + 1, category: row[COL.CATEGORY] || '', code: row[COL.CODE] || '',
      recordName: row[COL.RECORD_NAME] || '', description: row[COL.DESCRIPTION] || '',
      whenToFill: row[COL.WHEN_TO_FILL] || '', templateLink: row[COL.TEMPLATE_LINK] || '',
      folderLink: row[COL.FOLDER_LINK] || '', lastSerial: row[COL.LAST_SERIAL] || '',
      lastFileDate: row[COL.LAST_FILE_DATE] || '', daysAgo: row[COL.DAYS_AGO] || '',
      nextSerial: row[COL.NEXT_SERIAL] || '', auditStatus: row[COL.AUDIT_STATUS] || '',
      reviewed: (row[COL.REVIEWED_FLAG] || '').toLowerCase() === 'true',
      reviewedBy: row[COL.REVIEWED_BY] || '', reviewDate: row[COL.REVIEW_DATE] || '',
      fileReviews, auditIssues, recordStatus, lastAuditDate,
    });
  }
  return records;
}

async function migrate() {
  console.log('🚀 Phase 3: Google Sheets → Supabase Migration\n');

  const sheetRows = await fetchSheetRows();
  console.log(`✅ Parsed ${sheetRows.length} records\n`);

  if (sheetRows.length !== 35) console.warn(`⚠️  Expected 35, got ${sheetRows.length}`);

  const { data: existing, error: checkError } = await supabase.from('records').select('code');
  if (checkError) {
    console.error('❌ Cannot reach records table:', checkError.message);
    console.error('   Run Phase 1 SQL first (scripts/supabase_migration_phase1.sql)');
    process.exit(1);
  }

  if (existing && existing.length > 0) {
    console.log(`⚠️  ${existing.length} existing records. Clearing...`);
    const { error: delError } = await supabase.from('records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delError) { console.error('❌ Clear failed:', delError.message); process.exit(1); }
    console.log('   ✅ Cleared');
  }

  console.log('\n📤 Inserting into Supabase...');
  const insertRows = sheetRows.map(r => ({
    row_index: r.rowIndex, category: r.category, code: r.code,
    record_name: r.recordName, description: r.description, when_to_fill: r.whenToFill,
    template_link: r.templateLink, folder_link: r.folderLink,
    last_serial: r.lastSerial, last_file_date: r.lastFileDate, days_ago: r.daysAgo,
    next_serial: r.nextSerial, audit_status: r.auditStatus,
    reviewed: r.reviewed, reviewed_by: r.reviewedBy, review_date: r.reviewDate,
    file_reviews: r.fileReviews as any, audit_issues: r.auditIssues,
    record_status: r.recordStatus, last_audit_date: r.lastAuditDate,
  }));

  // Insert in batches of 10 to avoid payload limits
  let allInserted: any[] = [];
  for (let i = 0; i < insertRows.length; i += 10) {
    const batch = insertRows.slice(i, i + 10);
    const { data: batchData, error: batchError } = await supabase.from('records').insert(batch).select();
    if (batchError) throw new Error(`Batch ${i}-${i + batch.length} failed: ${batchError.message}`);
    if (batchData) allInserted = allInserted.concat(batchData);
    console.log(`   Batch ${i}-${i + batch.length}: ${batchData?.length || 0} records`);
  }
  console.log(`✅ Inserted ${allInserted.length} records\n`);

  // Validate
  console.log('🔍 Validating...');
  const { data: allRecords } = await supabase.from('records').select('*').order('row_index');
  if (!allRecords || allRecords.length !== sheetRows.length) {
    console.error(`❌ Count: expected ${sheetRows.length}, got ${allRecords?.length || 0}`);
    process.exit(1);
  }
  console.log(`   ✅ Count: ${allRecords.length} matches`);

  let mismatches = 0;
  for (let i = 0; i < sheetRows.length; i++) {
    if (sheetRows[i].code !== allRecords[i].code) { console.error(`   ❌ Code mismatch at ${i}`); mismatches++; }
  }
  console.log(`   ${mismatches === 0 ? '✅' : '❌'} Integrity: ${mismatches === 0 ? 'VERIFIED' : `${mismatches} mismatches`}`);

  console.log('\n' + '='.repeat(50));
  console.log(`🎉 Migration ${mismatches === 0 ? 'Complete' : 'Failed'}!`);
  console.log(`   Records: ${allRecords.length}`);
  console.log('='.repeat(50));
}

migrate().catch(err => { console.error('Fatal:', err); process.exit(1); });