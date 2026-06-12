import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || 'Invalid credentials');
    }
  };

  const handleQuickLogin = (emailVal) => {
    setEmail(emailVal);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-charcoal-dark px-4">
      <div className="w-full max-w-md bg-brand-charcoal-medium border border-brand-charcoal-light p-8">
        <div className="mb-8 text-center">
          <span className="text-3xl font-extrabold tracking-widest text-brand-orange uppercase">
            Splitwise
          </span>
          <p className="text-gray-400 text-sm mt-2">Login to your account</p>
        </div>

        {/* Quick Login Section */}
        <div className="mb-6 p-4 border border-brand-charcoal-light bg-brand-charcoal-dark">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">
            Quick Login (Demo Accounts)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('alice@example.com')}
              className="bg-brand-charcoal-medium hover:bg-brand-orange hover:text-white border border-brand-charcoal-light text-xs font-bold py-1.5 uppercase transition-colors cursor-pointer text-gray-800"
            >
              Alice
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('bob@example.com')}
              className="bg-brand-charcoal-medium hover:bg-brand-orange hover:text-white border border-brand-charcoal-light text-xs font-bold py-1.5 uppercase transition-colors cursor-pointer text-gray-800"
            >
              Bob
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('charlie@example.com')}
              className="bg-brand-charcoal-medium hover:bg-brand-orange hover:text-white border border-brand-charcoal-light text-xs font-bold py-1.5 uppercase transition-colors cursor-pointer text-gray-800"
            >
              Charlie
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-brand-red/10 border border-brand-red text-brand-red p-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-gray-800 px-4 py-3 outline-none transition-colors"
              placeholder="e.g. user@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-gray-800 px-4 py-3 outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold uppercase py-3 tracking-widest transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-orange hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
