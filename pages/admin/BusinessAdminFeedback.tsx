import React, { useEffect, useMemo, useState } from 'react';
import { dataService } from '../../services/dataService';
import { Feedback, FeedbackStatus, LinkEntry } from '../../types';

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const statusLabel = (s: FeedbackStatus) => {
  switch (s) {
    case FeedbackStatus.NEW:
      return 'New';
    case FeedbackStatus.RESOLVED:
      return 'Resolved';
    case FeedbackStatus.FLAGGED:
      return 'Flagged';
    case FeedbackStatus.SPAM:
      return 'Spam';
    case FeedbackStatus.DELETED:
      return 'Deleted';
    default:
      return String(s);
  }
};

const statusPillClass = (s: FeedbackStatus) => {
  switch (s) {
    case FeedbackStatus.NEW:
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
    case FeedbackStatus.RESOLVED:
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case FeedbackStatus.FLAGGED:
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    case FeedbackStatus.SPAM:
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
    case FeedbackStatus.DELETED:
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  }
};

const StarRow = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < Math.round(rating);
        return (
          <svg
            key={i}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={filled ? 'currentColor' : 'none'}
            className={filled ? 'text-amber-400' : 'text-slate-300'}
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 17.27l5.18 3.05-1.39-5.98L20.5 9.24l-6.17-.53L12 3 9.67 8.71l-6.17.53 4.71 5.1-1.39 5.98z" />
          </svg>
        );
      })}
    </div>
  );
};

export default function BusinessAdminFeedback() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recentlyDeleted, setRecentlyDeleted] = useState<Feedback[]>([]);
  const [undoTimeoutId, setUndoTimeoutId] = useState<number | null>(null);

  const [replyText, setReplyText] = useState('');
  const [markResolvedAfterReply, setMarkResolvedAfterReply] = useState(true);
  const [sending, setSending] = useState(false);

  const refresh = () => {
    const businessId = localStorage.getItem('currentBusinessId') || undefined;
    setFeedback(dataService.getFeedbackForBusiness(businessId));
    setLinks(dataService.getLinks(businessId));
  };

  useEffect(() => {
    refresh();
  }, []);

  const selectedFeedback = useMemo(() => feedback.find(f => f.id === selectedId) || null, [feedback, selectedId]);

  // Auto-select the first item for a better split-view experience
  useEffect(() => {
    if (!selectedId && feedback.length > 0) {
      setSelectedId(feedback[0].id);
    }
  }, [feedback, selectedId]);

  const linkByCode = useMemo(() => {
    const m = new Map<string, LinkEntry>();
    links.forEach(l => m.set(l.code, l));
    return m;
  }, [links]);

  const getSourceLabel = (f: Feedback) => {
    if (!f.source) return null;
    const l = linkByCode.get(f.source);
    return l?.label || f.source;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedRows(new Set(feedback.map(f => f.id)));
    else setSelectedRows(new Set());
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    const next = new Set(selectedRows);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedRows(next);
  };

  const markAllAsRead = () => {
    const businessId = localStorage.getItem('currentBusinessId') || undefined;
    dataService.markAllFeedbackRead(businessId);
    refresh();
  };

  const handleMarkRead = (id: string, isRead: boolean) => {
    dataService.markFeedbackRead(id, isRead);
    refresh();
  };

  const bulkUpdateStatus = (status: FeedbackStatus) => {
    dataService.bulkUpdateFeedbackStatus(Array.from(selectedRows), status);
    setSelectedRows(new Set());
    refresh();
  };

  const bulkDelete = () => {
    const ids = Array.from(selectedRows);
    if (ids.length === 0) return;

    const toDelete = feedback.filter(f => ids.includes(f.id));
    setRecentlyDeleted(toDelete);

    dataService.bulkDeleteFeedback(ids);
    setSelectedRows(new Set());
    setShowDeleteConfirm(false);
    refresh();

    if (undoTimeoutId) window.clearTimeout(undoTimeoutId);
    const tid = window.setTimeout(() => {
      toDelete.forEach(f => dataService.deleteFeedback(f.id));
      setRecentlyDeleted([]);
    }, 5000);
    setUndoTimeoutId(tid);
  };

  const undoDelete = () => {
    if (undoTimeoutId) window.clearTimeout(undoTimeoutId);
    recentlyDeleted.forEach(f => dataService.restoreDeletedFeedback(f));
    setRecentlyDeleted([]);
    refresh();
  };

  const handleReply = async () => {
    if (!selectedFeedback?.email) return;
    const message = replyText.trim();
    if (!message) return;

    setSending(true);
    try {
      await dataService.sendFeedbackReply(selectedFeedback.id, selectedFeedback.email, message);
      if (markResolvedAfterReply) {
        dataService.updateFeedbackStatus(selectedFeedback.id, FeedbackStatus.RESOLVED);
      }
      setReplyText('');
      refresh();
    } finally {
      setSending(false);
    }
  };

  const ActionButtons = ({ f }: { f: Feedback }) => {
    const isFlagged = f.status === FeedbackStatus.FLAGGED;
    return (
      <div className="flex items-center gap-2">
        <button
          className="rf-icon-btn"
          onClick={() => handleMarkRead(f.id, !f.isRead)}
          title={f.isRead ? 'Mark as unread' : 'Mark as read'}
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </button>

        <button
          className={`rf-icon-btn ${isFlagged ? 'text-amber-500' : ''}`}
          onClick={() => dataService.toggleFlagFeedback(f.id)}
          title={isFlagged ? 'Unflag' : 'Flag'}
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isFlagged ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M4 22V4a2 2 0 0 1 2-2h9l1 3h4v12h-5l-1-3H6v8H4z" />
          </svg>
        </button>

        <button
          className="rf-icon-btn text-rose-600"
          onClick={() => {
            setSelectedRows(new Set([f.id]));
            setShowDeleteConfirm(true);
          }}
          title="Delete"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M6 6l1 16h10l1-16" />
          </svg>
        </button>
      </div>
    );
  };

  const ActivityTimeline = ({ f }: { f: Feedback }) => {
    const base = [
      {
        id: 'created_at',
        createdAt: f.createdAt,
        message: 'Feedback received'
      }
    ];

    const acts = Array.isArray(f.activity) ? f.activity : [];
    const merged = [...acts.map(a => ({ id: a.id, createdAt: a.createdAt, message: a.message })), ...base]
      .filter(Boolean)
      // de-dup by id
      .reduce((acc: any[], item: any) => {
        if (!acc.find(x => x.id === item.id)) acc.push(item);
        return acc;
      }, [])
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return (
      <div className="space-y-2">
        {merged.map(a => (
          <div key={a.id} className="flex items-start gap-3">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--rf-accent)]" />
            <div className="flex-1">
              <div className="text-sm text-slate-800">{a.message}</div>
              <div className="text-xs text-slate-500">{fmtDate(a.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Feedback Inbox</h1>
          <p className="text-slate-500">Review internal feedback that was intercepted before it reached Google.</p>
        </div>

        <div className="flex items-center gap-2">
          <button className="rf-btn" onClick={markAllAsRead} type="button">
            Mark all as read
          </button>
          <button
            className="rf-btn rf-btn-danger"
            onClick={() => selectedRows.size > 0 && setShowDeleteConfirm(true)}
            disabled={selectedRows.size === 0}
            type="button"
          >
            Delete selected
          </button>
        </div>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        {/* Left: list */}
        <div className="rf-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--rf-border)] flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Inbox</div>
            <div className="text-xs text-slate-500">{feedback.filter(f => !f.isRead).length} unread</div>
          </div>

          <div className="divide-y divide-[var(--rf-border)] max-h-[70vh] overflow-auto">
            {feedback.map((f, idx) => {
              const active = f.id === selectedId;
              const src = getSourceLabel(f);
              return (
                <div
                  key={f.id}
                  className={`p-3 cursor-pointer ${active ? 'bg-[rgba(20,184,166,0.10)]' : 'hover:bg-slate-50'}`}
                  onClick={() => {
                    setSelectedId(f.id);
                    if (!f.isRead) handleMarkRead(f.id, true);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(f.id)}
                      onChange={(e) => handleRowSelect(f.id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-slate-900 truncate">{f.name || 'Anonymous'}</div>
                        {!f.isRead && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <StarRow rating={f.rating} />
                        <div className="text-xs text-slate-500">{fmtDate(f.createdAt)}</div>
                      </div>
                      <div className="mt-2 text-sm text-slate-600 line-clamp-2">{f.comment || '—'}</div>
                      {src && <div className="mt-2 text-xs text-slate-500">Source: {src}</div>}
                    </div>

                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                      <ActionButtons f={f} />
                    </div>
                  </div>

                  {idx === 0 && (
                    <div className="sr-only">
                      <input type="checkbox" aria-hidden="true" checked={selectedRows.size === feedback.length} onChange={() => {}} />
                    </div>
                  )}
                </div>
              );
            })}

            {feedback.length === 0 && (
              <div className="p-6 text-center text-slate-500">No feedback yet.</div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-[var(--rf-border)] flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selectedRows.size > 0 && selectedRows.size === feedback.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              Select all
            </label>

            <div className="flex items-center gap-2">
              <button
                className="rf-btn"
                onClick={() => bulkUpdateStatus(FeedbackStatus.RESOLVED)}
                disabled={selectedRows.size === 0}
                type="button"
              >
                Resolve
              </button>
              <button
                className="rf-btn"
                onClick={() => bulkUpdateStatus(FeedbackStatus.FLAGGED)}
                disabled={selectedRows.size === 0}
                type="button"
              >
                Flag
              </button>
            </div>
          </div>
        </div>

        {/* Right: details */}
        <div className="rf-card p-4 md:p-6 min-h-[420px]">
          {!selectedFeedback ? (
            <div className="h-full flex items-center justify-center text-slate-500">Select feedback to view details.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-slate-900 truncate">{selectedFeedback.name || 'Anonymous'}</h2>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusPillClass(selectedFeedback.status)}`}>
                      {statusLabel(selectedFeedback.status)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-slate-600">
                    <StarRow rating={selectedFeedback.rating} />
                    <span className="text-slate-300">•</span>
                    <span>{fmtDate(selectedFeedback.createdAt)}</span>
                    {selectedFeedback.email && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="truncate">{selectedFeedback.email}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="rf-btn"
                    onClick={() => handleMarkRead(selectedFeedback.id, !selectedFeedback.isRead)}
                    type="button"
                  >
                    {selectedFeedback.isRead ? 'Mark unread' : 'Mark read'}
                  </button>
                  <button
                    className="rf-btn"
                    onClick={() => dataService.toggleFlagFeedback(selectedFeedback.id)}
                    type="button"
                  >
                    {selectedFeedback.status === FeedbackStatus.FLAGGED ? 'Unflag' : 'Flag'}
                  </button>
                  <button
                    className="rf-btn rf-btn-danger"
                    onClick={() => {
                      setSelectedRows(new Set([selectedFeedback.id]));
                      setShowDeleteConfirm(true);
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="rf-card-inner">
                <div className="text-xs font-semibold text-slate-500 mb-2">COMMENT</div>
                <div className="text-slate-800">{selectedFeedback.comment || '—'}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rf-card-inner">
                  <div className="text-xs font-semibold text-slate-500 mb-1">CONTEXT</div>
                  <div className="text-sm text-slate-800">{selectedFeedback.question1 || '—'}</div>
                </div>
                <div className="rf-card-inner">
                  <div className="text-xs font-semibold text-slate-500 mb-1">WHAT THEY GOT</div>
                  <div className="text-sm text-slate-800">{selectedFeedback.question2 || '—'}</div>
                </div>
              </div>

              <div className="rf-card-inner">
                <div className="text-xs font-semibold text-slate-500 mb-2">HISTORY</div>
                <ActivityTimeline f={selectedFeedback} />
              </div>

              <div className="rf-card-inner">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Reply to Customer</div>
                    <div className="text-xs text-slate-500">
                      {selectedFeedback.email ? `This will be sent to ${selectedFeedback.email}.` : 'No email provided by the customer.'}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <textarea
                    className="rf-input h-28"
                    placeholder={selectedFeedback.email ? 'Type your response here…' : 'Cannot reply without a customer email.'}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={!selectedFeedback.email || sending}
                  />

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={markResolvedAfterReply}
                        onChange={(e) => setMarkResolvedAfterReply(e.target.checked)}
                        disabled={sending}
                      />
                      Mark as resolved after sending
                    </label>

                    <button
                      className="rf-btn rf-btn-primary"
                      onClick={handleReply}
                      disabled={!selectedFeedback.email || !replyText.trim() || sending}
                      type="button"
                    >
                      {sending ? 'Sending…' : 'Send reply'}
                    </button>
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    Phase 4 note: email sending is recorded in history and will be wired to Resend once the backend is connected.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete selected feedback?</h3>
            <p className="text-slate-600 mb-4">This will move the feedback to Deleted. You can undo for 5 seconds.</p>
            <div className="flex justify-end gap-2">
              <button className="rf-btn" onClick={() => setShowDeleteConfirm(false)} type="button">
                Cancel
              </button>
              <button className="rf-btn rf-btn-danger" onClick={bulkDelete} type="button">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo toast */}
      {recentlyDeleted.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50">
          <span>Deleted {recentlyDeleted.length} item(s).</span>
          <button className="underline" onClick={undoDelete} type="button">
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
