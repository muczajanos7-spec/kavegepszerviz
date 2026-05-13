import React, { useState, useEffect } from 'react';
import { Search, Coffee, ArrowRight, Clock, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Machine } from '../types';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export function Home() {
  const { user, profile } = useAuth();
  const [searchId, setSearchId] = useState('');
  const [featuredMachines, setFeaturedMachines] = useState<Machine[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchMachines() {
      const { data } = await supabase
        .from('machines_for_sale')
        .select('*')
        .eq('status', 'elérhető')
        .limit(3);
      if (data) setFeaturedMachines(data);
    }
    fetchMachines();
  }, []);

  const [appointment, setAppointment] = useState({
    customer_name: '',
    phone: '',
    machine_model: '',
    description: '',
    requested_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (profile) {
      setAppointment(prev => ({
        ...prev,
        customer_name: profile.full_name,
        phone: profile.phone_number
      }));
    }
  }, [profile]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      navigate(`/status/${searchId.trim()}`);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('appointments')
      .insert([{
        ...appointment,
        user_id: user?.id || null,
      }]);

    if (error) {
      toast.error('Hiba: ' + error.message);
    } else {
      toast.success('Köszönjük! Hamarosan keressük Önt a visszaigazolással.');
      setAppointment({
        customer_name: profile?.full_name || '',
        phone: profile?.phone_number || '',
        machine_model: '',
        description: '',
        requested_date: new Date().toISOString().split('T')[0],
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center justify-center p-3 bg-cafe-gold/10 rounded-2xl mb-6"
        >
          <Coffee className="text-cafe-gold w-8 h-8" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-bold text-cafe-dark mb-4 leading-tight"
        >
          Kávégép Szerviz és <br />
          <span className="text-cafe-light underline decoration-cafe-gold/30">Minőségi</span> Értékesítés
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-cafe-medium/70 text-lg mb-10 max-w-lg mx-auto"
        >
          Profi javítás és felújított gépek garanciával. Kövesse nyomon kávégépe állapotát online!
        </motion.p>

        {/* Status Search */}
        <motion.form
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSearch}
          className="relative max-w-md mx-auto"
        >
          <input
            type="text"
            placeholder="Adja meg a munkalapszámot (UUID)..."
            className="cafe-input pr-12 shadow-xl shadow-cafe-dark/5"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cafe-gold text-cafe-dark rounded-lg hover:bg-cafe-gold/80 transition-colors"
          >
            <Search size={20} />
          </button>
        </motion.form>
      </section>

      {/* Featured Machines */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="text-cafe-gold" size={24} />
            Kiemelt ajánlataink
          </h2>
          <button
            onClick={() => navigate('/gepek')}
            className="text-cafe-light font-medium flex items-center gap-1 hover:text-cafe-gold transition-colors"
          >
            Összes gép <ArrowRight size={18} />
          </button>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredMachines.length > 0 ? (
            featuredMachines.map((machine) => (
              <motion.div
                key={machine.id}
                whileHover={{ y: -5 }}
                className="cafe-card cursor-pointer"
                onClick={() => navigate('/gepek')}
              >
                <div className="aspect-video bg-cafe-medium/5 relative overflow-hidden">
                  {machine.image_url ? (
                    <img src={machine.image_url} alt={machine.model_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-cafe-light/30">
                      <Coffee size={48} />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-cafe-dark font-bold text-sm">
                    {machine.price.toLocaleString('hu-HU')} Ft
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">{machine.model_name}</h3>
                  <p className="text-cafe-medium/60 text-sm line-clamp-1">{machine.description}</p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-cafe-medium/40 italic">
              Nincsenek elérhető gépek pillanatnyilag.
            </div>
          )}
        </div>
      </section>

      <section id="idopont" className="mb-16 scroll-mt-24">
        <div className="cafe-card p-8 md:p-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Foglaljon időpontot szervizre</h2>
          <form className="grid md:grid-cols-2 gap-6" onSubmit={handleBooking}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Az Ön neve</label>
                <input 
                  type="text" 
                  required 
                  className="cafe-input" 
                  placeholder="Minta János"
                  value={appointment.customer_name}
                  onChange={(e) => setAppointment({ ...appointment, customer_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Telefonszám</label>
                <input 
                  type="tel" 
                  required 
                  className="cafe-input" 
                  placeholder="+36 30 123 4567"
                  value={appointment.phone}
                  onChange={(e) => setAppointment({ ...appointment, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Kért időpont</label>
                <input 
                  type="date" 
                  required 
                  className="cafe-input"
                  value={appointment.requested_date}
                  onChange={(e) => setAppointment({ ...appointment, requested_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Készülék típusa</label>
                <input 
                  type="text" 
                  required 
                  className="cafe-input" 
                  placeholder="pl. Saeco PicoBaristo"
                  value={appointment.machine_model}
                  onChange={(e) => setAppointment({ ...appointment, machine_model: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Hiba rövid leírása</label>
                <textarea 
                  rows={4} 
                  className="cafe-input resize-none" 
                  placeholder="Nem fűt fel, hangosan darál..."
                  value={appointment.description}
                  onChange={(e) => setAppointment({ ...appointment, description: e.target.value })}
                ></textarea>
              </div>
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="cafe-btn-primary w-full py-4 text-lg shadow-xl shadow-cafe-gold/20">
                Időpont kérése
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Info Section */}
      <section className="bg-cafe-dark text-cafe-cream rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-4">Időpontra van szüksége?</h2>
          <p className="opacity-70 mb-8 max-w-md">
            Hozza be kávégépét gyorsszervizünkbe! Egyszerűen foglaljon időpontot online vagy kérdezzen tőlünk szakértő választ.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="tel:+36301234567" className="cafe-btn-primary bg-cafe-gold text-cafe-dark hover:bg-cafe-gold/90">
              Hívjon most
            </a>
            <button className="cafe-btn-secondary border border-cafe-cream/20 hover:bg-cafe-cream/10">
              Üzenet küldése
            </button>
          </div>
        </div>
        <Clock className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5" />
      </section>
    </div>
  );
}
