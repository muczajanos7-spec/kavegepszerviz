import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, LogIn, Wrench, ShoppingBag, LogOut, ChevronRight, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export function Admin() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Hiba a bejelentkezés során: ' + error.message);
    } else {
      toast.success('Sikeres bejelentkezés!');
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Kijelentkezve');
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-cafe-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cafe-card p-10 text-center"
        >
          <div className="inline-flex p-4 bg-cafe-gold/10 rounded-full mb-6">
            <Lock className="text-cafe-gold" size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-8">Admin Belépés</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-medium/40" size={20} />
              <input
                type="email"
                placeholder="Email cím"
                className="cafe-input pl-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-medium/40" size={20} />
              <input
                type="password"
                placeholder="Jelszó"
                className="cafe-input pl-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="cafe-btn-primary w-full flex items-center justify-center gap-2" disabled={loginLoading}>
              <LogIn size={20} />
              {loginLoading ? 'Belépés...' : 'Belépés'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <div className="p-8 cafe-card">
          <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Nincs jogosultsága</h2>
          <p className="text-cafe-medium mb-6">Ez a felület csak adminisztrátorok számára érhető el.</p>
          <Link to="/ugyfelkapu" className="cafe-btn-primary block w-full">Vissza az Ügyfélkapuhoz</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-bold text-cafe-dark">Vezérlőpult</h1>
          <p className="text-cafe-medium/50">Üdvözöljük, {user?.email}!</p>
        </div>
        <button onClick={handleLogout} className="text-cafe-light hover:text-red-500 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <LogOut size={18} />
          Kijelentkezés
        </button>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        <AdminCard
          to="/admin/repairs"
          icon={Wrench}
          title="Munkalapok"
          description="Új munkalap felvétele és státuszok frissítése."
          color="bg-cafe-dark text-cafe-cream"
        />
        <AdminCard
          to="/admin/appointments"
          icon={Calendar}
          title="Időpontok"
          description="Beérkező foglalások kezelése és visszaigazolása."
          color="bg-white border-2 border-cafe-medium/10 text-cafe-dark"
        />
        <AdminCard
          to="/admin/machines"
          icon={ShoppingBag}
          title="Árukészlet"
          description="Új kávégépek feltöltése és módosítása."
          color="bg-cafe-gold text-cafe-dark"
        />
      </div>
    </div>
  );
}

function AdminCard({ to, icon: Icon, title, description, color }: any) {
  return (
    <Link to={to} className="group">
      <motion.div 
        whileHover={{ y: -5 }}
        className="cafe-card p-8 h-full flex flex-col items-start gap-6 border-2 border-transparent hover:border-cafe-gold transition-all"
      >
        <div className={cn("p-4 rounded-2xl", color)}>
          <Icon size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-2 group-hover:text-cafe-gold transition-colors">{title}</h3>
          <p className="text-cafe-medium/60 text-sm leading-relaxed">{description}</p>
        </div>
        <div className="mt-auto pt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-cafe-light">
          Kezelés <ChevronRight size={16} />
        </div>
      </motion.div>
    </Link>
  );
}
