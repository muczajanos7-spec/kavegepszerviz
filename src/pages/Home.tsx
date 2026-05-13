import React, { useState, useEffect, useRef } from 'react';
import { Search, Coffee, ArrowRight, Clock, ShoppingBag, Upload, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Machine } from '../types';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export function Home() {
  const { user, profile, isAdmin } = useAuth();
  const [searchId, setSearchId] = useState('');
  const [featuredMachines, setFeaturedMachines] = useState<Machine[]>([]);
  const navigate = useNavigate();

  const [bookingLoading, setBookingLoading] = useState(false);
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    requested_time: '10:00',
  });

  // Fetch busy slots for the selected date
  useEffect(() => {
    async function fetchBusySlots() {
      if (!appointment.requested_date) return;
      
      const startOfDay = `${appointment.requested_date}T00:00:00Z`;
      const endOfDay = `${appointment.requested_date}T23:59:59Z`;

      const { data } = await supabase
        .from('appointments')
        .select('requested_date')
        .gte('requested_date', startOfDay)
        .lte('requested_date', endOfDay)
        .neq('status', 'lemondva');

      if (data) {
        const times = data.map(app => {
          const date = new Date(app.requested_date);
          return date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
        });
        setBusySlots(times);
      }
    }
    fetchBusySlots();
  }, [appointment.requested_date]);

  useEffect(() => {
    if (profile) {
      setAppointment(prev => ({
        ...prev,
        customer_name: profile.full_name,
        phone: profile.phone_number
      }));
    }
  }, [profile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A kép mérete nem haladhatja meg az 5MB-ot.');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      navigate(`/status/${searchId.trim()}`);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAdmin) {
      toast.error('Adminisztrátorként nem foglalhat saját magának időpontot.');
      return;
    }

    // Business Hours Validation (8:00 - 17:00, Mon-Fri)
    const [hours, minutes] = appointment.requested_time.split(':').map(Number);
    const selectedDate = new Date(appointment.requested_date);
    const day = selectedDate.getDay();

    if (day === 0 || day === 6) {
      toast.error('Sajnos hétvégén zárva tartunk. Kérjük válasszon hétköznapi időpontot!');
      return;
    }

    if (hours < 8 || hours >= 17) {
      toast.error('Nyitvatartási időnk: 08:00 - 17:00. Kérjük válasszon ezen belüli időpontot!');
      return;
    }

    // Conflict Check
    if (busySlots.includes(appointment.requested_time)) {
      toast.error('Ez az időpont már foglalt. Kérjük válasszon másikat!');
      return;
    }

    setBookingLoading(true);

    try {
      let imageUrl = null;

      // Upload image if exists
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `appointments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('mechanic-assets') // Let's use an existing bucket or default one
          .upload(filePath, imageFile);

        if (uploadError) {
          // If public bucket doesn't exist, we might fail, but let's try to proceed without image if it's a dev error
          console.error('Storage upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('mechanic-assets')
            .getPublicUrl(filePath);
          imageUrl = urlData.publicUrl;
        }
      }

      const fullDateTime = `${appointment.requested_date}T${appointment.requested_time}:00`;
      
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...appointment,
          image_url: imageUrl,
          requested_date: fullDateTime,
          user_id: user?.id || null,
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ismeretlen hiba történt');
      }

      toast.success(
        <div>
          <p className="font-bold">Sikeres foglalás!</p>
          <p className="text-xs">ID: {result.id}</p>
          <p className="text-xs mt-1">Hamarosan keressük Önt a visszaigazolással.</p>
        </div>,
        { duration: 6000 }
      );
      
      setAppointment({
        customer_name: profile?.full_name || '',
        phone: profile?.phone_number || '',
        machine_model: '',
        description: '',
        requested_date: new Date().toISOString().split('T')[0],
        requested_time: '10:00',
      });
      removeImage();
    } catch (error: any) {
      toast.error('Hiba: ' + error.message);
    } finally {
      setBookingLoading(false);
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Dátum</label>
                  <input 
                    type="date" 
                    required 
                    className="cafe-input"
                    value={appointment.requested_date}
                    onChange={(e) => setAppointment({ ...appointment, requested_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Időpont (precíz)</label>
                  <input 
                    type="time" 
                    required 
                    className="cafe-input"
                    value={appointment.requested_time}
                    min="08:00"
                    max="16:30"
                    step="1800"
                    onChange={(e) => setAppointment({ ...appointment, requested_time: e.target.value })}
                  />
                  <p className="text-[10px] text-red-500 font-bold uppercase mb-2 flex items-center gap-1">
                    <AlertCircle size={10} /> Nyitvatartás: H-P, 08:00 - 17:00
                  </p>
                  
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {Array.from({ length: 18 }).map((_, i) => {
                      const hour = Math.floor(i / 2) + 8;
                      const minute = i % 2 === 0 ? '00' : '30';
                      const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                      const isBusy = busySlots.includes(time);
                      const isSelected = appointment.requested_time === time;

                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={isBusy}
                          onClick={() => setAppointment({ ...appointment, requested_time: time })}
                          className={cn(
                            "py-2 rounded-lg text-[10px] font-bold transition-all border",
                            isBusy ? "bg-red-50 text-red-300 border-red-100 cursor-not-allowed line-through" :
                            isSelected ? "bg-cafe-dark text-cafe-gold border-cafe-dark shadow-md scale-105" :
                            "bg-white border-cafe-medium/10 text-cafe-medium hover:border-cafe-gold/50 hover:bg-cafe-gold/5"
                          )}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Image Upload Area */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block">Kép a hibáról (opcionális)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-4 transition-all cursor-pointer flex flex-col items-center justify-center gap-2",
                    imagePreview ? "border-cafe-gold/50 bg-cafe-gold/5" : "border-cafe-medium/10 hover:border-cafe-gold/30 hover:bg-cafe-gold/5"
                  )}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  
                  {imagePreview ? (
                    <div className="relative group w-full">
                      <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(); }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-cafe-medium/5 rounded-full text-cafe-medium">
                        <Upload size={20} />
                      </div>
                      <p className="text-xs text-cafe-medium/60 font-medium">Kattintson a feltöltéshez (Max 5MB)</p>
                    </>
                  )}
                </div>
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
              <button 
                type="submit" 
                className={cn(
                  "cafe-btn-primary w-full py-4 text-lg shadow-xl",
                  isAdmin ? "opacity-50 cursor-not-allowed bg-gray-400" : "shadow-cafe-gold/20"
                )}
                disabled={bookingLoading || isAdmin}
              >
                {isAdmin ? 'Adminisztrátor nem foglalhat' : (bookingLoading ? 'Feldolgozás...' : 'Időpont kérése')}
              </button>
              {isAdmin && (
                <p className="text-center text-xs text-red-500 mt-2 font-medium">
                  Admin felületről vagy kijelentkezve lehet tesztelni a foglalást.
                </p>
              )}
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
