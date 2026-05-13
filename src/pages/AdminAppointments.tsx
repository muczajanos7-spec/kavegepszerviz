import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { Calendar, Phone, CheckCircle2, XCircle, ArrowLeft, MoreVertical, Wrench, Coffee } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

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

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast.error('Hiba: ' + error.message);
    } else {
      toast.success('Státusz frissítve!');
      setAppointments(appointments.map(a => a.id === id ? { ...a, status: status as any } : a));
    }
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
        status: 'beérkezett',
        history: [{ status: 'beérkezett', timestamp: new Date().toISOString(), note: 'Időpontból létrehozva' }]
      }]);

    if (error) {
       toast.error('Hiba az átalakításkor: ' + error.message);
    } else {
       await updateStatus(app.id, 'visszaigazolva');
       toast.success('Munkalap létrehozva!');
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
                  <p className="text-cafe-medium/70 font-medium mb-4 flex items-center gap-2">
                    <Coffee size={16} /> {app.machine_model}
                  </p>
                  
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
                          onClick={() => updateStatus(app.id, 'lemondva')}
                          className="flex-1 md:flex-none p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Lemondás"
                        >
                          <XCircle size={24} />
                        </button>
                        <button 
                          onClick={() => convertToRepair(app)}
                          className="flex-1 md:flex-none p-3 bg-cafe-gold text-cafe-dark rounded-xl hover:bg-cafe-gold/90 transition-all flex items-center justify-center gap-2 font-bold px-6"
                        >
                          <Wrench size={20} /> Fogadás
                        </button>
                      </>
                    )}
                    {app.status === 'visszaigazolva' && (
                       <div className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-xl">
                         <CheckCircle2 size={16} /> Visszaigazolva
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
    </div>
  );
}
