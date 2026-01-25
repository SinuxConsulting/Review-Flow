
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { ShieldCheck } from 'lucide-react';

const SuperLogin: React.FC = () => {
  const [pass, setPass] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate auth
    if (pass === 'admin') {
      authService.loginAsSuper();
      navigate('/super');
    } else {
      alert('Incorrect password. Use "admin" for demo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rf-card p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-[rgba(20,184,166,0.08)] text-[color:var(--rf-accent)] rounded-lg mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-xl font-bold">Sinux Control Center</h1>
          <p className="text-sm text-gray-500">Super Admin Access Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            placeholder="Password (type 'admin')"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-200"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <button className="w-full py-3 bg-[color:var(--rf-accent)] text-white rounded-lg font-semibold hover:bg-[color:var(--rf-accent)] transition-colors">
            Authorize Entry
          </button>
        </form>
      </div>
    </div>
  );
};

export default SuperLogin;
