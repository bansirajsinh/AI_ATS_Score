import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email address';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrors({ form: result.error });
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-sm text-text-secondary mt-2">Log in to access your resume history</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div className="text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-3">{errors.form}</div>
          )}

          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }}
              className={`w-full px-4 py-2.5 bg-white/[0.03] border ${errors.email ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all`}
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })); }}
              className={`w-full px-4 py-2.5 bg-white/[0.03] border ${errors.password ? 'border-red-500/50' : 'border-white/10'} rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all`}
              placeholder="••••••••"
            />
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
          </div>

          <Button type="submit" loading={loading} size="lg" className="w-full">
            Log in
          </Button>
        </form>

        <p className="text-sm text-text-muted text-center mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">Sign up</Link>
        </p>
      </div>
    </div>
  );
}