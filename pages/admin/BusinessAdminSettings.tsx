import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import { Business, LowRatingQuestion, LowRatingQuestionType } from '../../types';
import { Save, Undo2, Trash2, Plus } from 'lucide-react';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const BusinessAdminSettings: React.FC = () => {
  const { slug: urlSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const loaded = useMemo(() => dataService.getBusinessBySlug(urlSlug || ''), [urlSlug]);
  const [business, setBusiness] = useState<Business | null>(loaded || null);
  const [baseline, setBaseline] = useState<Business | null>(loaded ? JSON.parse(JSON.stringify(loaded)) : null);

  const [isSaved, setIsSaved] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    if (loaded) {
      setBusiness(loaded);
      setBaseline(JSON.parse(JSON.stringify(loaded)));
      setSlugError(null);
    }
  }, [loaded?.id]);

  const isDirty = useMemo(() => {
    if (!business || !baseline) return false;
    return JSON.stringify(business) !== JSON.stringify(baseline);
  }, [business, baseline]);

  // Warn on refresh/close with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  if (!business) return null;

  const setField = (patch: Partial<Business>) => setBusiness({ ...business, ...patch });

  const handleLogoFile = async (file: File | null) => {
    if (!file) return;
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
    setField({ theme: { ...business.theme, logoUrl: dataUrl } });
    setIsDirty(true);
  };

  const clearLogo = () => {
    setField({ theme: { ...business.theme, logoUrl: undefined } });
    setIsDirty(true);
  };

  const handleSlugChange = (raw: string) => {
    const clean = dataService.toSlug(raw);
    setField({ slug: clean });
    if (!clean) {
      setSlugError('Slug is required.');
      return;
    }
    if (!dataService.isSlugAvailable(clean, business.id)) {
      setSlugError('This slug is already taken. Choose a unique slug.');
      return;
    }
    setSlugError(null);
  };

  const addQuestion = () => {
    const q: LowRatingQuestion = {
      id: crypto.randomUUID(),
      prompt: 'New question',
      type: 'single',
      options: ['Option 1', 'Option 2'],
      required: false,
    };
    setField({ lowRatingQuestions: [...(business.lowRatingQuestions || []), q] });
  };

  const updateQuestion = (id: string, patch: Partial<LowRatingQuestion>) => {
    const next = (business.lowRatingQuestions || []).map(q => (q.id === id ? { ...q, ...patch } : q));
    setField({ lowRatingQuestions: next });
  };

  const removeQuestion = (id: string) => {
    const next = (business.lowRatingQuestions || []).filter(q => q.id !== id);
    setField({ lowRatingQuestions: next });
  };

  const addOption = (qid: string) => {
    const q = (business.lowRatingQuestions || []).find(x => x.id === qid);
    if (!q) return;
    updateQuestion(qid, { options: [...q.options, `Option ${q.options.length + 1}`] });
  };

  const updateOption = (qid: string, index: number, value: string) => {
    const q = (business.lowRatingQuestions || []).find(x => x.id === qid);
    if (!q) return;
    const next = [...q.options];
    next[index] = value;
    updateQuestion(qid, { options: next });
  };

  const deleteOption = (qid: string, index: number) => {
    const q = (business.lowRatingQuestions || []).find(x => x.id === qid);
    if (!q) return;
    const next = q.options.filter((_, i) => i !== index);
    updateQuestion(qid, { options: next.length ? next : ['Option 1'] });
  };

  const validateBeforeSave = (): string | null => {
    if (!business.name.trim()) return 'Business name is required.';
    if (!business.slug.trim()) return 'Business slug is required.';
    if (!dataService.isSlugAvailable(business.slug, business.id)) return 'Business slug must be unique.';
    if (business.googleReviewUrl && !/^https?:\/\//i.test(business.googleReviewUrl)) return 'Google Review Link must be a valid URL.';
    if (business.exitRedirectUrl && business.exitRedirectUrl.length > 0 && !/^https?:\/\//i.test(business.exitRedirectUrl)) return 'Exit Redirect URL must be a valid URL.';

    const questions = business.lowRatingQuestions || [];
    for (const q of questions) {
      if (!q.prompt.trim()) return 'Every question must have text.';
      if (!Array.isArray(q.options) || q.options.length === 0) return 'Every question must have at least one option.';
      for (const opt of q.options) {
        if (!opt.trim()) return 'Option text cannot be empty.';
      }
    }
    return null;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateBeforeSave();
    if (err) {
      alert(err);
      return;
    }

    const prevSlug = baseline?.slug;
    dataService.saveBusiness(business);

    setBaseline(JSON.parse(JSON.stringify(business)));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);

    // If slug changed, move the admin route to the new URL immediately
    if (prevSlug && prevSlug !== business.slug) {
      navigate(`/p/${business.slug}/admin/settings`, { replace: true });
    }
  };

  const handleUndo = () => {
    if (!baseline) return;
    setBusiness(JSON.parse(JSON.stringify(baseline)));
    setSlugError(null);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-500">Configure how the routing works.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Business Identity */}
        <div className="rf-card p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Business</h3>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Business Name</label>
            <input
              type="text"
              value={business.name}
              onChange={(e) => setField({ name: e.target.value })}
              className="w-full p-3 border rounded-lg text-sm"
              placeholder="Business Name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Business Slug</label>
            <input
              type="text"
              value={business.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className={`w-full p-3 border rounded-lg text-sm ${slugError ? 'border-red-300' : ''}`}
              placeholder="bistro-co"
            />
            <p className={`text-xs ${slugError ? 'text-red-600' : 'text-slate-500'}`}>
              {slugError
                ? slugError
                : 'This controls your public and portal URLs (e.g., /r/your-slug and /p/your-slug).'}
            </p>
          </div>
        </div>

        {/* Routing */}
        <div className="rf-card p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Routing</h3>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">Routing Threshold</label>

            <div className="bg-[rgba(20,184,166,0.08)] border border-[var(--rf-border)] rounded-xl p-4">
              <p className="text-sm text-slate-700">
                If a customer rates <span className="font-bold">4 stars or higher</span>, they are{' '}
                <span className="font-bold">automatically redirected</span> to Google.
                <br />
                Otherwise, they stay here for internal feedback.
              </p>

              <div className="mt-4 flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={business.thresholdRating}
                  onChange={(e) => setField({ thresholdRating: clamp(parseInt(e.target.value), 1, 5) })}
                  className="w-full"
                />
                <div className="text-[color:var(--rf-accent)] font-bold min-w-[80px] text-right">{business.thresholdRating} Stars</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Google Review Link</label>
            <input
              type="url"
              value={business.googleReviewUrl}
              onChange={(e) => setField({ googleReviewUrl: e.target.value })}
              className="w-full p-3 border rounded-lg text-sm"
              placeholder="https://search.google.com/local/writereview?placeid=EXAMPLE"
            />
            <p className="text-xs text-slate-400">Direct link to the review dialog (search.google.com/...)</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Exit Redirect URL</label>
            <input
              type="url"
              value={business.exitRedirectUrl || ''}
              onChange={(e) => setField({ exitRedirectUrl: e.target.value })}
              className="w-full p-3 border rounded-lg text-sm"
              placeholder="https://yourwebsite.com"
            />
            <p className="text-xs text-slate-400">Used when customers click Cancel, the close (X), or Done.</p>
          </div>
        </div>

        {/* Theme */}
        <div className="rf-card p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Theme</h3>
            <p className="text-xs text-slate-500 mt-1">These settings apply to both the customer flow and this dashboard.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ColorField
              label="Brand / Accent"
              value={business.theme.accentColor}
              helper="Buttons, stars, highlights."
              onChange={(val) => setField({ theme: { ...business.theme, accentColor: val } })}
            />
            <ColorField
              label="Customer Background"
              value={business.theme.customerBackground || '#ffffff'}
              helper="Customer landing background."
              onChange={(val) => setField({ theme: { ...business.theme, customerBackground: val } })}
            />
            <ColorField
              label="Dashboard Background"
              value={business.theme.dashboardBackground || '#f8fafc'}
              helper="Main app background."
              onChange={(val) => setField({ theme: { ...business.theme, dashboardBackground: val } })}
            />
            <ColorField
              label="Card Background"
              value={business.theme.cardBackground || '#ffffff'}
              helper="Panels and cards."
              onChange={(val) => setField({ theme: { ...business.theme, cardBackground: val } })}
            />
          </div>

          <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="h-14 w-14 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
              {business.theme.logoUrl ? (
                <img src={business.theme.logoUrl} alt="Business logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-slate-500 font-semibold">{business.name?.charAt(0)?.toUpperCase() || 'B'}</span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Business Logo</p>
                  <p className="text-xs text-slate-500">Shown on the public review form. If not set, we use the first letter of your business.</p>
                </div>
                {business.theme.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setField({ theme: { ...business.theme, logoUrl: '' } })}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Low-rating Questions */}
        <div className="rf-card p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Low-rating Questions</h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure questions shown when a customer rates below your threshold.
            </p>
          </div>

          <div className="space-y-6">
            {(business.lowRatingQuestions || []).map((q) => (
              <div key={q.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-4 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <input
                      type="text"
                      value={q.prompt}
                      onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                      className="md:col-span-2 w-full p-3 border rounded-lg text-sm"
                    />
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(q.id, { type: e.target.value as LowRatingQuestionType })}
                      className="w-full p-3 border rounded-lg text-sm"
                    >
                      <option value="single">Single choice</option>
                      <option value="multiple">Multiple choice</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Options</p>

                  <div className="space-y-2">
                    {q.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-slate-300">•</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(q.id, idx, e.target.value)}
                          className="flex-1 p-3 border rounded-lg text-sm bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => deleteOption(q.id, idx)}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
                          aria-label="Delete option"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addOption(q.id)}
                    className="text-sm font-semibold text-[color:var(--rf-accent)] hover:underline inline-flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add option
                  </button>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      className="text-sm font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Remove question
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addQuestion}
              className="w-full border border-slate-200 rounded-xl p-5 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Plus size={18} />
                Add question
              </div>
              <p className="text-xs text-slate-500 mt-1">Build a client-specific set of low-rating questions.</p>
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end items-center gap-3 pt-2">
          {isSaved && <span className="text-emerald-600 font-semibold text-sm">Save Changes</span>}
          <button
            type="button"
            onClick={handleUndo}
            disabled={!isDirty}
            className="px-5 py-3 rounded-full font-semibold border border-slate-200 bg-white text-slate-700 disabled:opacity-40 inline-flex items-center gap-2"
          >
            <Undo2 size={18} />
            Undo Changes
          </button>
          <button
            type="submit"
            disabled={!!slugError}
            className="px-7 py-3 rounded-full font-bold text-white inline-flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: business.theme.accentColor }}
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

const ColorField = ({
  label,
  value,
  helper,
  onChange,
}: {
  label: string;
  value: string;
  helper: string;
  onChange: (v: string) => void;
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-12 rounded-lg border" />
      <p className="text-xs text-slate-400">{helper}</p>
    </div>
  );
};

export default BusinessAdminSettings;
