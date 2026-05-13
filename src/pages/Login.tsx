import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Coffee, Lock, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Hiba: ' + error.message);
      setLoading(false);
    } else {
      toast.success('Sikeres belépés!');
      navigate('/ugyfelkapu');
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-12 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="cafe-card p-8 md:p-12 text-center"
      >
        <div className="inline-flex p-4 bg-cafe-gold/10 rounded-full mb-6">
          <Coffee className="text-cafe-gold" size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Üdvözöljük újra!</h1>
        <p className="text-cafe-medium/50 mb-8 text-sm">Lépjen be a javításai kezeléséhez</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-medium/40" size={20} />
            <input
              required
              type="email"
              className="cafe-input pl-12"
              placeholder="Email cím"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-medium/40" size={20} />
            <input
              required
              type="password"
              className="cafe-input pl-12"
              placeholder="Jelszó"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="cafe-btn-primary w-full py-4 shadow-lg shadow-cafe-dark/10">
            {loading ? 'Belépés...' : 'Belépés'}
          </button>
        </form>

        <p className="mt-8 text-sm text-cafe-medium/60">
          Még nincs fiókja?{' '}
          <Link to="/register" className="text-cafe-gold font-bold hover:underline">
            Regisztráljon itt
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
