// ============================================================================
// QMS Forge — Record List Page
// Read-only list of all records with filtering by form type.
// ============================================================================

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Filter, Search, AlertTriangle, Eye, ChevronRight } from 'lucide-react';
import { MOCK_RECORDS, getActiveFormCodes, getEditRiskLevel, type QMSRecord } from '../data/mockRecords';
import { FORM_SCHEMAS } from '../data/formSchemas';
import { isoToDisplay } from '../schemas';

// ============================================================================
// Status badge colors
// ============================================================================

const STATUS_COLORS: Record<string, string> = {
  'Open': 'bg-red-500/20 text-red-400 border border-red-500/30',
  'In Progress': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  'Closed': 'bg-green-500/20 text-green-400 border border-green-500/30',
  'Verified': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'Active': 'bg-green-500/20 text-green-400 border border-green-500/30',
  'Completed': 'bg-green-500/20 text-green-400 border border-green-500/30',
  'On Hold': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  'Achieved': 'bg-green-500/20 text-green-400 border border-green-500/30',
  'On Track': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'Planned': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

const RISK_COLORS: Record<string, string> = {
  'none': '',
  'low': 'text-slate-400',
  'medium': 'text-amber-400',
  'high': 'text-red-400',
};

// ============================================================================
// Record List Page
// ============================================================================

const RecordListPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'serial' | 'date' | 'edited'>('serial');

  const activeFormCodes = getActiveFormCodes();
  const formNames = useMemo(() => {
    const map: Record<string, string> = {};
    FORM_SCHEMAS.forEach(f => { map[f.code] = f.name; });
    return map;
  }, []);

  const filteredRecords = useMemo(() => {
    let records = [...MOCK_RECORDS];

    // Filter by form code
    if (formFilter !== 'all') {
      records = records.filter(r => r.formCode === formFilter);
    }

    // Search by serial or content
    if (search.trim()) {
      const q = search.toLowerCase();
      records = records.filter(r =>
        r.serial.toLowerCase().includes(q) ||
        r.formName.toLowerCase().includes(q) ||
        Object.values(r).some(v => typeof v === 'string' && v.toLowerCase().includes(q))
      );
    }

    // Sort
    records.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return (b._createdAt || '').localeCompare(a._createdAt || '');
        case 'edited':
          return b._editCount - a._editCount;
        case 'serial':
        default:
          return a.serial.localeCompare(b.serial);
      }
    });

    return records;
  }, [formFilter, search, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Records</h1>
          <p className="text-sm text-slate-400 mt-1">
            {MOCK_RECORDS.length} records across {activeFormCodes.length} form types
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-slate-900 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search serial, name, or content..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={formFilter}
            onChange={e => setFormFilter(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Forms</option>
            {activeFormCodes.map(code => (
              <option key={code} value={code}>{code} — {formNames[code] || code}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Sort:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'serial' | 'date' | 'edited')}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="serial">Serial</option>
            <option value="date">Date Created</option>
            <option value="edited">Most Edited</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 rounded-xl border border-slate-700">
          <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">No records found matching your filters.</p>
          <p className="text-sm text-slate-500 mt-1">Try adjusting the search or form type.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRecords.map(record => {
            const risk = getEditRiskLevel(record);
            const status = (record.status as string) || '';
            const statusColor = STATUS_COLORS[status] || 'bg-slate-500/20 text-slate-400 border border-slate-500/30';

            return (
              <button
                key={record.serial}
                onClick={() => navigate(`/records/${encodeURIComponent(record.serial)}`)}
                className="w-full flex items-center gap-4 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 hover:border-indigo-500/50 transition-colors text-left group"
              >
                {/* Serial */}
                <div className="flex-shrink-0 w-24">
                  <span className="font-mono text-sm text-indigo-400">{record.serial}</span>
                </div>

                {/* Form name */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-100 truncate">{record.formName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {isoToDisplay(record.date as string || record._createdAt?.split('T')[0] || '')}
                    {record.project_name && ` · ${record.project_name}`}
                    {record.employee_name && ` · ${record.employee_name}`}
                  </div>
                </div>

                {/* Status */}
                {status && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>
                    {status}
                  </span>
                )}

                {/* Edit risk */}
                {risk !== 'none' && (
                  <div className={`flex items-center gap-1 text-xs ${RISK_COLORS[risk]}`}>
                    {risk === 'high' && <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>{record._editCount} edit{record._editCount !== 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* Navigate icon */}
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              </button>
            );
          })}
        </div>
      )}

      {/* Footer stats */}
      <div className="flex gap-4 text-xs text-slate-500">
        <span>{filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}</span>
        {formFilter !== 'all' && (
          <span>· Filtered to {formFilter}</span>
        )}
        {search && (
          <span>· Search: "{search}"</span>
        )}
      </div>
    </div>
  );
};

export default RecordListPage;