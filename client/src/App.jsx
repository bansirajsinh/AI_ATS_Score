import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Results from './pages/Results';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  // Quick hack: we might not have a global loading state that reliably block renders,
  // but if we do, handle it here. Otherwise just check auth.
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/results/:scoreJobId" element={<Results />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}