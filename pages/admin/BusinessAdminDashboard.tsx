import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import { ReviewEvent, ReviewEventType } from '../../types';
import { Star, QrCode, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

const DAYS_WINDOW = 30;

const BusinessAdminDashboard: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const business = dataService.getBusinessBySlug(slug || '');

  const events = useMemo(() => dataService.getEvents(business?.id), [business?.id]);

  const windowed = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - DAYS_WINDOW);
    return events.filter(e => new Date(e.createdAt) >= since);
  }, [events]);

  const stats = useMemo(() => {
    const scans = windowed.filter(e => e.type === 'scan').length;
    const redirects = windowed.filter(e => e.type === 'redirect').length;
    const intercepted = windowed.filter(e => e.type === 'internal').length;

    const rated = windowed.filter(e => typeof e.rating === 'number');
    const avg = rated.length > 0
      ? (rated.reduce((acc, e) => acc + (e.rating || 0), 0) / rated.length).toFixed(1)
      : '0.0';

    return { scans, redirects, intercepted, avg };
  }, [windowed]);

  const recent = useMemo(() => {
    return windowed
      .filter(e => e.type === 'redirect' || e.type === 'internal')
      .slice(0, 6);
  }, [windowed]);

  const thresholdLabel = `${business?.thresholdRating || 4}+ Stars`;
  const googleActive = !!business?.googleReviewUrl;

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Overview</h2>
          <p className="text-slate-500">Welcome back, {business?.name}.</p>
        </div>
        <div className="text-xs text-slate-400 font-semibold">Last {DAYS_WINDOW} days</div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Avg Rating" value={stats.avg} icon={Star} />
        <StatCard title="Total Scans" value={stats.scans.toString()} icon={QrCode} />
        <StatCard title="Redirects (Google)" value={stats.redirects.toString()} icon={ExternalLink} sub={stats.scans > 0 ? `${Math.round((stats.redirects / stats.scans) * 100)}%` : undefined} />
        <StatCard title="Intercepted" value={stats.intercepted.toString()} icon={AlertCircle} sub={stats.intercepted > 0 ? 'Feedback caught' : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="font-bold text-slate-900 mb-3">Recent Activity</h3>
          <div className="rf-card overflow-hidden">
            <div className="divide-y divide-slate-100">
              {recent.map((e) => (
                <RecentRow key={e.id} event={e} />
              ))}
              {recent.length === 0 && (
                <div className="p-10 text-center text-slate-400">No activity yet.</div>
              )}
            </div>
          </div>
          <div className="mt-3 text-right">
            <Link to={`/p/${slug}/admin/feedback`} className="text-xs font-semibold text-[color:var(--rf-accent)] hover:underline">
              View Inbox
            </Link>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-900 mb-3">System Health</h3>
          <div className="rf-card p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-700">Threshold Strategy</div>
              <div className="text-sm font-bold text-[color:var(--rf-accent)]">{thresholdLabel}</div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-700">Google Link</div>
              <div className={`text-sm font-bold flex items-center gap-2 ${googleActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                {googleActive ? <CheckCircle2 size={16} /> : null}
                {googleActive ? 'Active' : 'Missing'}
              </div>
            </div>
            <div className="mt-5 text-xs text-slate-400">
              Manage routing and links in <Link to={`/p/${slug}/admin/settings`} className="text-[color:var(--rf-accent)] hover:underline font-semibold">Settings</Link>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const getStatIconClasses = (title: string) => {
  switch (title) {
    case 'Avg Rating':
      return { icon: 'text-amber-500', bg: 'bg-amber-50 ring-amber-100' };
    case 'Total Scans':
      return { icon: 'text-sky-600', bg: 'bg-sky-50 ring-sky-100' };
    case 'Redirects (Google)':
      return { icon: 'text-emerald-600', bg: 'bg-emerald-50 ring-emerald-100' };
    case 'Intercepted':
      return { icon: 'text-orange-600', bg: 'bg-orange-50 ring-orange-100' };
    default:
      return { icon: 'text-[color:var(--rf-accent)]', bg: 'bg-[rgba(20,184,166,0.10)] ring-[var(--rf-border)]' };
  }
};

const StatCard = ({ title, value, icon: Icon, sub }: { title: string; value: string; icon: any; sub?: string }) => (
  <div className="rf-card p-6 transition-all duration-200">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      {(() => { const cls = getStatIconClasses(title); return (<div className={`p-2 rounded-xl ring-1 ${cls.bg} ${cls.icon}`}>
        <Icon size={20} />
      </div>
    ); })()}
    </div>
  </div>
);

const RecentRow = ({ event }: { event: ReviewEvent }) => {
  const label = typeof event.rating === 'number' ? `${event.rating} Stars` : 'Scan';
  const isRedirect = event.type === 'redirect';
  const badge = isRedirect ? 'Redirected' : 'Internal';

  return (
    <div className="p-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${isRedirect ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <div>
          <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            {label}
            <span className="text-xs text-slate-400 font-medium">• {new Date(event.createdAt).toLocaleDateString()}</span>
          </div>
          {event.source && (
            <div className="text-xs text-slate-400">Source: <span className="font-semibold">{event.source}</span></div>
          )}
        </div>
      </div>
      <span className="text-xs font-semibold text-slate-700 bg-white/70 px-3 py-1 rounded-full ring-1 ring-[var(--rf-border)]">
        {badge}
      </span>
    </div>
  );
};

export default BusinessAdminDashboard;
