import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { Calendar, Phone, CheckCircle2, XCircle, ArrowLeft, MoreVertical, Wrench, Coffee } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    setLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('requested_date', { ascending: true });
    
    if (data) setAppointments(data);
    setLoading(false);
  }

  const updateStatus = async (id: string, status: string, noteText?: string) => {
    setActionLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`/api/admin/appointments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, note: noteText })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Sikertelen frissítés');

      toast.success('Státusz frissítve és értesítés elküldve!');
      setAppointments(appointments.map(a => a.id === id ? { ...a, status: status as any, public_note: noteText } : a));
      setShowNoteModal(false);
      setNote('');
      setSelectedAppointment(null);
    } catch (error: any) {
      toast.error('Hiba: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openNoteModal = (app: Appointment, status: string) => {
    setSelectedAppointment(app);
    setTargetStatus(status);
    setNote('');
    setShowNoteModal(true);
  };

  const convertToRepair = async (app: Appointment) => {
    const { data, error } = await supabase
      .from('repairs')
      .insert([{
        user_id: app.user_id,
        customer_name: app.customer_name,
        phone: app.phone,
        machine_model: app.machine_model,
        error_description: app.description,
        public_note: app.public_note, // Carry over current note
        status: 'beérkezett',
        history: [{ status: 'beérkezett', timestamp: new Date().toISOString(), note: 'Időpontból létrehozva' }]
      }]);

    if (error) {
       toast.error('Hiba az átalakításkor: ' + error.message);
    } else {
       await updateStatus(app.id, 'visszaigazolva', 'Munkalap létrehozva, a készüléket fogadtuk.');
       toast.success('Munkalap létrehozva!');
       fetchAppointments(); // Refresh list
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin" className="p-2 hover:bg-cafe-medium/5 rounded-xl transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">Beérkező Időpontok</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-cafe-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {appointments.length > 0 ? (
            appointments.map((app) => (
              <motion.div 
                layout
                key={app.id}
                className="cafe-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold uppercase",
                      app.status === 'függőben' ? "bg-yellow-100 text-yellow-700" :
                      app.status === 'visszaigazolva' ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {app.status}
                    </span>
                    <span className="text-xs text-cafe-medium/40">{new Date(app.created_at).toLocaleDateString('hu-HU')}</span>
                  </div>
                  <h3 className="text-xl font-bold">{app.customer_name}</h3>
                  <p className="text-cafe-medium/70 font-medium mb-2 flex items-center gap-2">
                    <Coffee size={16} /> {app.machine_model}
                  </p>
                  
                  {app.description && (
                    <p className="text-sm text-cafe-medium mb-4 italic">"{app.description}"</p>
                  )}

                  {app.image_url && (
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-cafe-gold uppercase tracking-widest mb-1">Csatolt kép</p>
                      <img 
                        src={app.image_url} 
                        alt="Machine" 
                        className="w-48 h-32 object-cover rounded-xl border border-cafe-medium/10 cursor-zoom-in"
                        onClick={() => window.open(app.image_url, '_blank')}
                      />
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-4 text-sm text-cafe-medium/60">
                    <a href={`tel:${app.phone}`} className="flex items-center gap-1 hover:text-cafe-gold">
                      <Phone size={14} /> {app.phone}
                    </a>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} /> {new Date(app.requested_date).toLocaleDateString('hu-HU')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {app.status === 'függőben' && (
                      <>
                        <button 
                          onClick={() => openNoteModal(app, 'lemondva')}
                          className="flex-1 md:flex-none p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Lemondás"
                          disabled={actionLoading}
                        >
                          <XCircle size={24} />
                        </button>
                        <button 
                          onClick={() => openNoteModal(app, 'visszaigazolva')}
                          className="flex-1 md:flex-none p-3 bg-cafe-gold text-cafe-dark rounded-xl hover:bg-cafe-gold/90 transition-all flex items-center justify-center gap-2 font-bold px-6"
                          disabled={actionLoading}
                        >
                          <CheckCircle2 size={20} /> Visszaigazolás
                        </button>
                      </>
                    )}
                    {app.status === 'visszaigazolva' && (
                       <button 
                        onClick={() => convertToRepair(app)}
                        className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl hover:bg-green-100 transition-colors"
                        disabled={actionLoading}
                       >
                         <Wrench size={16} /> Munkalap létrehozása
                       </button>
                    )}
                    {app.status === 'lemondva' && (
                       <div className="flex items-center gap-2 text-red-500 font-bold text-sm bg-red-50 px-4 py-2 rounded-xl">
                         <XCircle size={16} /> Elutasítva
                       </div>
                    )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-24 text-cafe-medium/30 italic">
              Nincs beérkező kérés pillanatnyilag.
            </div>
          )}
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="cafe-card p-8 max-w-md w-full shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-4">
              {targetStatus === 'visszaigazolva' ? 'Foglalás Visszaigazolása' : 'Foglalás Elutasítása'}
            </h2>
            <p className="text-sm text-cafe-medium/60 mb-6">
              Szeretnél üzenetet küldeni az ügyfélnek? Az üzenet belekerül az értesítő e-mailbe.
            </p>
            
            <textarea
              className="cafe-input min-h-[120px] mb-6 p-4"
              placeholder="Pl.: Várjuk szeretettel holnap 10 órakor! Vagy: Sajnos ez az időpont már foglalt..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            
            <div className="flex gap-4">
              <button 
                onClick={() => setShowNoteModal(false)}
                className="flex-1 py-3 font-bold text-cafe-light hover:text-cafe-dark transition-colors"
                disabled={actionLoading}
              >
                Mégse
              </button>
              <button 
                onClick={() => updateStatus(selectedAppointment!.id, targetStatus, note)}
                className={cn(
                  "flex-1 py-3 rounded-xl font-bold shadow-lg transition-all",
                  targetStatus === 'visszaigazolva' 
                    ? "bg-cafe-gold text-cafe-dark hover:bg-cafe-gold/90 shadow-cafe-gold/20" 
                    : "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20"
                )}
                disabled={actionLoading}
              >
                {actionLoading ? 'Küldés...' : (targetStatus === 'visszaigazolva' ? 'Visszaigazolás' : 'Elutasítás')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
