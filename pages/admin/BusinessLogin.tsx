
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import { authService } from '../../services/authService';
import { LayoutDashboard } from 'lucide-react';

const BusinessLogin: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [pass, setPass] = useState('');
  const business = dataService.getBusinessBySlug(slug || '');

  useEffect(() => {
    if (!business) navigate('/super/login');
  }, [business]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === 'admin') {
      authService.loginAsAdmin(business!.id);
      navigate(`/p/${slug}/admin`);
    } else {
      alert('Incorrect password. Use "admin" for demo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rf-card p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-slate-100 text-slate-900 rounded-lg mb-4">
            <LayoutDashboard size={32} />
          </div>
          <h1 className="text-xl font-bold">{business?.name}</h1>
          <p className="text-sm text-gray-500">Business Portal Admin</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            placeholder="Admin Password"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-slate-500"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <button className="w-full py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors">
            Sign In
          </button>
        </form>
        
        <p className="text-center mt-6 text-[10px] text-slate-300 uppercase tracking-widest">Powered by Sinux</p>
      </div>
    </div>
  );
};

export default BusinessLogin;
