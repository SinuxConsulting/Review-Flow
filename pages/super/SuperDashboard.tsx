
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import { authService } from '../../services/authService';
import { Business, FeedbackStatus } from '../../types';
import { Plus, Search, ExternalLink, Settings, Users, ArrowRight, LayoutDashboard, LogOut } from 'lucide-react';

const SuperDashboard: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnboard, setShowOnboard] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setBusinesses(dataService.getBusinesses());
  }, []);

  const handleImpersonate = (b: Business) => {
    authService.impersonate(b.id);
    navigate(`/p/${b.slug}/admin`);
  };

  const handleOnboard = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    
    const newBiz: Business = {
      id: crypto.randomUUID(),
      name,
      slug,
      timezone: 'UTC',
      thresholdRating: 4,
      googleReviewUrl: '',
      theme: { accentColor: '#3b82f6' },
      contactSettings: { enabled: true },
      createdAt: new Date().toISOString()
    };
    
    dataService.saveBusiness(newBiz);
    setBusinesses([...businesses, newBiz]);
    setShowOnboard(false);
  };

  const filtered = businesses.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const allFeedback = dataService.getFeedback();
  const newFeedbackCount = allFeedback.filter(f => f.status === FeedbackStatus.NEW).length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck size={24} className="text-[color:var(--rf-accent)]" /> Sinux
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-[color:var(--rf-accent)] rounded-lg text-sm font-medium">
            <Users size={18} /> Client Gallery
          </button>
          <button onClick={() => { authService.logout(); navigate('/super/login'); }} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors text-sm font-medium">
            <LogOut size={18} /> Logout
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-10 overflow-auto">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Control Center</h2>
            <p className="text-slate-500 mt-1">Managing {businesses.length} active client portals</p>
          </div>
          <button 
            onClick={() => setShowOnboard(true)}
            className="flex items-center gap-2 bg-[color:var(--rf-accent)] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[color:var(--rf-accent)] transition-shadow shadow-sm"
          >
            <Plus size={20} /> Onboard Client
          </button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Clients</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{businesses.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Unread Feedback</p>
            <p className="text-3xl font-bold text-[color:var(--rf-accent)] mt-2">{newFeedbackCount}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-500">System Uptime</p>
            <p className="text-3xl font-bold text-emerald-500 mt-2">100%</p>
          </div>
        </div>

        {/* Client Gallery */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-4">
            <Search className="text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search clients by name or slug..." 
              className="flex-1 border-none focus:ring-0 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Client Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Rating Threshold</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{b.name}</div>
                      <div className="text-xs text-slate-400">/{b.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">Active</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1 font-medium">{b.thresholdRating}+ <Star size={14} className="fill-yellow-400 text-yellow-400" /></span>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button 
                        onClick={() => handleImpersonate(b)}
                        className="p-2 text-slate-400 hover:text-[color:var(--rf-accent)] hover:bg-[rgba(20,184,166,0.08)] rounded-lg transition-all" 
                        title="Manage Portal"
                      >
                        <LayoutDashboard size={18} />
                      </button>
                      <a 
                        href={`#/r/${b.slug}`} 
                        target="_blank"
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="View Public Link"
                      >
                        <ExternalLink size={18} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Onboarding */}
      {showOnboard && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">Onboard New Client</h3>
            </div>
            <form onSubmit={handleOnboard} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Business Name</label>
                <input required name="name" type="text" className="w-full mt-1 p-3 border rounded-lg" placeholder="e.g. Luna Dental" />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowOnboard(false)} className="px-5 py-2.5 text-slate-500 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-[color:var(--rf-accent)] text-white font-bold rounded-lg hover:bg-[color:var(--rf-accent)]">Create Client</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ShieldCheck = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);

const Star = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

export default SuperDashboard;
