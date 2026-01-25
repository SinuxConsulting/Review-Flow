import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import type { LinkEntry } from '../../types';
import { Copy, Pencil, Trash2, Plus, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

type LinkDraft = {
  id?: string;
  label: string;
  source: string;
};

const slugifySource = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const buildPublicLink = (slug: string, source: string) => {
  // HashRouter safe URL: https://domain/path#/r/:slug?src=source
  const base = `${window.location.origin}${window.location.pathname}`;
  const qs = source ? `?src=${encodeURIComponent(source)}` : '';
  return `${base}#/r/${slug}${qs}`;
};

const CopyButton: React.FC<{ value: string; label?: string }> = ({ value, label = 'Copy' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-[color:var(--rf-accent)] text-[color:var(--rf-accent)] text-sm font-semibold hover:bg-[rgba(20,184,166,0.08)] transition-colors"
      title="Copy to clipboard"
    >
      <Copy size={16} />
      {copied ? 'Copied' : label}
    </button>
  );
};

const ModalShell: React.FC<{ open: boolean; title: string; onClose: () => void; children: React.ReactNode }> = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rf-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode size={18} className="text-slate-600" />
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold">
              Close
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const BusinessAdminLinksQr: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const business = dataService.getBusinessBySlug(slug || '');

  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [draft, setDraft] = useState<LinkDraft>({ label: '', source: '' });
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = () => {
    if (!business) return;
    setLinks(dataService.getLinks(business.id));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  const existingSources = useMemo(() => new Set(links.map(l => l.source)), [links]);

  const openAdd = () => {
    setDraft({ label: '', source: '' });
    setModalOpen(true);
  };

  const openEdit = (link: LinkEntry) => {
    setDraft({ id: link.id, label: link.label, source: link.source });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const saveDraft = () => {
    if (!business) return;

    const label = draft.label.trim();
    let source = draft.source.trim();

    if (!label) {
      alert('Label is required.');
      return;
    }
    if (!source) source = slugifySource(label);
    source = slugifySource(source);

    // Uniqueness check (allow same source if editing same record)
    const sourceTaken = links.some(l => l.source === source && l.id !== draft.id);
    if (sourceTaken) {
      alert('Source must be unique. Try a different source key.');
      return;
    }

    if (draft.id) {
      dataService.updateLink(draft.id, { label, source });
    } else {
      dataService.addLink({ businessId: business.id, label, source });
    }

    refresh();
    setModalOpen(false);
  };

  const removeLink = (link: LinkEntry) => {
    const ok = confirm(`Delete "${link.label}"? This cannot be undone.`);
    if (!ok) return;
    dataService.deleteLink(link.id);
    refresh();
  };

  const linksWithUrl = useMemo(() => {
    const s = slug || '';
    return links.map(l => ({
      ...l,
      url: buildPublicLink(s, l.source)
    }));
  }, [links, slug]);

  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const next: Record<string, string> = {};
      for (const l of linksWithUrl) {
        try {
          const dataUrl = await QRCode.toDataURL(l.url, { margin: 1, width: 256 });
          next[l.id] = dataUrl;
        } catch {
          // ignore per-item
        }
      }
      if (!cancelled) setQrMap(next);
    };

    if (linksWithUrl.length > 0) run();
    else setQrMap({});

    return () => { cancelled = true; };
  }, [linksWithUrl]);

  if (!business) {
    return (
      <div className="rf-card p-8">
        <h2 className="text-xl font-bold text-slate-900">Links & QR</h2>
        <p className="text-slate-500 mt-2">Business not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Manage Links */}
      <div className="rf-card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Manage Links</h2>
            <p className="text-slate-500 mt-1">
              Add, edit, or remove customer entry points (tables, invoices, email footers, etc.).
            </p>
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[color:var(--rf-accent)] text-white font-bold hover:bg-[color:var(--rf-accent)] transition-colors shadow"
          >
            <Plus size={18} />
            Add
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="py-3 pr-4">Label</th>
                <th className="py-3 pr-4">Source</th>
                <th className="py-3 pr-4">Link</th>
                <th className="py-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {linksWithUrl.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    No links yet. Click <span className="font-semibold text-slate-700">Add</span> to create your first entry point.
                  </td>
                </tr>
              ) : (
                linksWithUrl.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="py-5 pr-4 font-semibold text-slate-900">{l.label}</td>
                    <td className="py-5 pr-4 text-slate-500 font-mono text-[12px]">{l.source}</td>
                    <td className="py-5 pr-4">
                      <a href={l.url} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-slate-900 underline decoration-slate-200">
                        {l.url}
                      </a>
                    </td>
                    <td className="py-5 pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <CopyButton value={l.url} />
                        <button
                          onClick={() => openEdit(l)}
                          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => removeLink(l)}
                          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-source QR Codes */}
      <div className="rf-card p-8">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Per-source QR Codes</h3>
          <p className="text-slate-500 mt-1">Use these to identify where the customer came from.</p>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {linksWithUrl.length === 0 ? (
            <div className="text-slate-500 text-sm">
              Create at least one link to generate QR codes.
            </div>
          ) : (
            linksWithUrl.map((l) => (
              <div key={l.id} className="border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-base font-bold text-slate-900 truncate">{l.label}</div>
                  <div className="text-[12px] text-slate-400 mt-1 break-all">{l.url}</div>
                  <div className="mt-4">
                    <CopyButton value={l.url} label="Copy Link" />
                  </div>
                </div>

                <div className="w-32 h-32 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                  {qrMap[l.id] ? (
                    <img src={qrMap[l.id]} alt={`QR ${l.label}`} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-slate-400 text-xs">Generating…</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ModalShell
        open={modalOpen}
        title={draft.id ? 'Edit Link' : 'Add Link'}
        onClose={closeModal}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Label</label>
            <input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="e.g. Table 1, Invoice, Email Footer"
              className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Source (optional)</label>
            <input
              value={draft.source}
              onChange={(e) => setDraft({ ...draft, source: e.target.value })}
              placeholder="e.g. table_1, email, invoice"
              className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 font-mono text-sm"
            />
            <p className="text-[12px] text-slate-400 mt-2">
              If left blank, we’ll auto-generate from the label. Must be unique per business.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              onClick={closeModal}
              className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={saveDraft}
              className="px-5 py-3 rounded-xl bg-[color:var(--rf-accent)] text-white font-bold hover:bg-[color:var(--rf-accent)]"
            >
              Save
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
};

export default BusinessAdminLinksQr;
