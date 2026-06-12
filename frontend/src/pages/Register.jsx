import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const { signup } = useContext(AuthContext);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Generate a premium random pixel art avatar based on the name
    const seed = encodeURIComponent(name.trim() || 'avatar');
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;

    const res = await signup(name, email, password, avatarUrl);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-charcoal-dark px-4">
      <div className="w-full max-w-md bg-brand-charcoal-medium border border-brand-charcoal-light p-8">
        <div className="mb-8 text-center">
          <span className="text-3xl font-extrabold tracking-widest text-brand-orange uppercase">
            Splitwise
          </span>
          <p className="text-gray-400 text-sm mt-2">Create a new account</p>
        </div>

        {error && (
          <div className="mb-4 bg-brand-red/10 border border-brand-red text-brand-red p-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-white px-4 py-3 outline-none transition-colors"
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-white px-4 py-3 outline-none transition-colors"
              placeholder="e.g. john@example.com"
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
              className="w-full bg-brand-charcoal-dark border border-brand-charcoal-light focus:border-brand-orange text-white px-4 py-3 outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold uppercase py-3 tracking-widest transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-orange hover:underline">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
