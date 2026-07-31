import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="sticky top-4 z-50 mx-4 sm:mx-6 lg:mx-8 mt-4">
      <div className="max-w-7xl mx-auto glass-panel rounded-2xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-500/25 group-hover:shadow-brand-500/50 group-hover:scale-105 transition-all">
            R
          </div>
          <span className="text-xl font-bold tracking-tight text-text-primary group-hover:text-glow transition-all">
            Resume<span className="text-brand-400">IQ</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">
                Dashboard
              </Link>
              <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
              <span className="text-sm text-text-muted hidden sm:block">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium px-4 py-2 rounded-xl bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white transition-all border border-transparent hover:border-white/10"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">
                Log in
              </Link>
              <Link
                to="/signup"
                className="relative text-sm font-medium px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:from-brand-500 hover:to-brand-400 transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                <span className="relative z-10">Sign up</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}