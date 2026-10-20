import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Key, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Information Technology');
  const [role, setRole] = useState<'admin' | 'network_engineer' | 'viewer'>('viewer');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        await register({ username, password, full_name: fullName, department, role });
      } else {
        await login({ username, password });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
    setIsLoading(true);
    try {
      await login({ username: u, password: p });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isRegisterMode ? 'Register System Account' : 'NOC System Authentication'}
      description="Secure token-based access with role-based authorization"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 mt-2">
        {errorMsg && (
          <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {isRegisterMode && (
          <>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. S. Ramesh"
                className="w-full px-3 py-1.5 text-xs rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary bg-white text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary bg-white text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Access Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary bg-white text-foreground"
              >
                <option value="viewer">Academic Reviewer (Read Only)</option>
                <option value="network_engineer">Network Engineer (Operational)</option>
                <option value="admin">Campus IT Director (Full Admin)</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Username</label>
          <div className="relative">
            <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary bg-white text-foreground"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Password</label>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary bg-white text-foreground"
            />
          </div>
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full text-xs h-9">
          <Key className="w-3.5 h-3.5 mr-1.5" />
          <span>{isRegisterMode ? 'Create Account' : 'Sign In with JWT'}</span>
        </Button>

        {/* Quick Demo Credentials */}
        {!isRegisterMode && (
          <div className="pt-3 border-t border-border">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              One-Click Evaluator Access
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('admin', 'AdminPass2026!')}
                className="text-[11px] h-7 px-2"
              >
                IT Director
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('operator', 'NetworkOps2026!')}
                className="text-[11px] h-7 px-2"
              >
                NOC Engineer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('viewer', 'ViewerREC2026!')}
                className="text-[11px] h-7 px-2"
              >
                Reviewer
              </Button>
            </div>
          </div>
        )}

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setErrorMsg('');
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
          >
            {isRegisterMode ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

