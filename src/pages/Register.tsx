import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

export function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.full_name,
          phone_number: formData.phone_number,
        },
      },
    });

    if (error) {
      toast.error('Hiba: ' + error.message);
      setLoading(false);
    } else {
      toast.success('Regisztráció sikeres! Kérjük jelentkezzen be.');
      navigate('/login');
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="cafe-card p-8 md:p-12"
      >
        <h1 className="text-2xl font-bold mb-2 text-center">Fiók létrehozása</h1>
        <p className="text-cafe-medium/50 mb-8 text-sm text-center">Csatlakozzon az Ügyfélkapuhoz a kényelmes szervizelésért</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-medium/40" size={20} />
            <input
              required
              className="cafe-input pl-12"
              placeholder="Teljes név"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-medium/40" size={20} />
            <input
              required
              type="email"
              className="cafe-input pl-12"
              placeholder="Email cím"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-medium/40" size={20} />
            <input
              required
              type="tel"
              className="cafe-input pl-12"
              placeholder="Telefonszám"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-medium/40" size={20} />
            <input
              required
              type="password"
              className="cafe-input pl-12"
              placeholder="Jelszó"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <button type="submit" disabled={loading} className="cafe-btn-primary w-full py-4 mt-4">
            {loading ? 'Regisztráció...' : 'Regisztráció'}
          </button>
        </form>

        <p className="mt-8 text-sm text-cafe-medium/60 text-center">
          Már tag?{' '}
          <Link to="/login" className="text-cafe-gold font-bold hover:underline">
            Lépjen be itt
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
