// ============================================================================
// QMS Forge — Record List Page
// Read-only list of all records with filtering by form type.
// NOW uses real Google Sheets data via useRecords() hook.
// ============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Filter, Search, AlertTriangle, Eye, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { FORM_SCHEMAS } from '../data/formSchemas';
import { isoToDisplay } from '../schemas';
import { useRecords } from '../hooks/useRecordStorage';
import { getEditRiskLevel, type QMSRecord } from '../data/mockRecords';

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

  // ✅ Real data from Google Sheets
  const { data: records, isLoading, error, refetch } = useRecords();
  const activeFormCodes = [...new Set(records?.map(r => r.formCode as string) || [])].sort();

  const formNames: Record<string, string> = {};
  FORM_SCHEMAS.forEach(f => { formNames[f.code] = f.name; });

  const filteredRecords = (() => {
    if (!records) return [];

    let list = [...records];

    // Filter by form code
    if (formFilter !== 'all') {
      list = list.filter(r => r.formCode === formFilter);
    }

    // Search by serial or content
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.serial as string).toLowerCase().includes(q) ||
        (r.formName as string).toLowerCase().includes(q) ||
        Object.values(r).some(v => typeof v === 'string' && v.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'serial':
          return (a.serial as string).localeCompare(b.serial as string);
        case 'date':
          return ((a._createdAt as string) || '').localeCompare((b._createdAt as string) || '');
        case 'edited': {
          const ae = (a._editCount as number) || 0;
          const be = (b._editCount as number) || 0;
          return be - ae; // highest edit count first
        }
        default:
          return 0;
      }
    });

    return list;
  })();

  // ─── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-4" />
        <p className="text-slate-400">Loading records from Google Sheets...</p>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl text-slate-300 mb-2">Failed to Load Records</h2>
        <p className="text-slate-500 mb-4">{(error as Error).message}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Records</h1>
          <p className="text-sm text-slate-400 mt-1">
            {records?.length || 0} records across {activeFormCodes.length} form types
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by serial, name, or content..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={formFilter}
          onChange={e => setFormFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Forms</option>
          {activeFormCodes.map(code => (
            <option key={code} value={code}>
              {code} — {formNames[code] || code}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'serial' | 'date' | 'edited')}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="serial">Sort by Serial</option>
          <option value="date">Sort by Date</option>
          <option value="edited">Sort by Edits</option>
        </select>
      </div>

      {/* Record List */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg text-slate-400 mb-2">No Records Found</h3>
          <p className="text-sm text-slate-500">
            {records?.length === 0
              ? 'Create your first record to get started.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRecords.map(record => {
            const risk = getEditRiskLevel(record as QMSRecord);
            return (
              <button
                key={record.serial as string}
                onClick={() => navigate(`/records/${encodeURIComponent(record.serial as string)}`)}
                className="w-full flex items-center gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/30 rounded-lg transition-all text-left"
              >
                {/* Serial + Type */}
                <div className="w-28 shrink-0">
                  <span className="font-mono text-sm font-semibold text-indigo-400">
                    {record.serial as string}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">{record.formCode as string}</p>
                </div>

                {/* Name + Status */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{record.formName as string}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {record.status && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[record.status as string] || 'bg-slate-600/30 text-slate-400'}`}>
                        {record.status as string}
                      </span>
                    )}
                    {record.date && (
                      <span className="text-xs text-slate-500">
                        {isoToDisplay(record.date as string)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit Risk */}
                <div className="shrink-0 text-right">
                  {risk !== 'none' && (
                    <span className={`text-xs flex items-center gap-1 ${RISK_COLORS[risk]}`}>
                      {(record._editCount as number) > 0 && (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {risk === 'high' ? `${record._editCount} edits` : risk === 'medium' ? `${record._editCount} edits` : '1 edit'}
                    </span>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecordListPage;