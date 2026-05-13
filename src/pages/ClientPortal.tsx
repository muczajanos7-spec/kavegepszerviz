import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Repair, Appointment } from '../types';
import { 
  Coffee, 
  Wrench, 
  History, 
  Calendar, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Plus,
  ArrowRight,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export function ClientPortal() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
    if (user) fetchData();
  }, [user, authLoading]);

  async function fetchData() {
    setLoading(true);
    const [repRes, appRes] = await Promise.all([
      supabase.from('repairs').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').eq('user_id', user?.id).order('requested_date', { ascending: false })
    ]);

    if (repRes.data) setRepairs(repRes.data);
    if (appRes.data) setAppointments(appRes.data);
    setLoading(false);
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Coffee className="animate-spin text-cafe-gold" size={48} />
        <p className="font-medium italic">Betöltés...</p>
      </div>
    );
  }

  const activeRepairs = repairs.filter(r => r.status !== 'átadva');
  const pastRepairs = repairs.filter(r => r.status === 'átadva');

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-12">
        <h1 className="text-3xl font-bold text-cafe-dark mb-2">Szia, {profile?.full_name || 'Ügyfelünk'}!</h1>
        <p className="text-cafe-medium/50 italic">Isten hozott a digitális szervizkönyvedben.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column: Quick Actions & Stats */}
        <div className="md:col-span-1 space-y-6">
          {isAdmin && (
            <button 
              onClick={() => navigate('/admin')}
              className="w-full bg-cafe-dark text-cafe-gold border-2 border-cafe-gold flex items-center justify-center gap-2 py-4 rounded-3xl font-bold hover:bg-cafe-gold hover:text-cafe-dark transition-all"
            >
              <Settings size={20} /> Admin Irányítópult
            </button>
          )}

          <button 
            onClick={() => navigate('/#idopont')}
            className="w-full cafe-btn-primary flex items-center justify-center gap-2 py-4 shadow-xl shadow-cafe-gold/20"
          >
            <Plus size={20} /> Új időpontkérés
          </button>

          <div className="cafe-card p-6 bg-cafe-dark text-cafe-cream">
            <h3 className="text-sm font-bold uppercase tracking-widest text-cafe-gold mb-4">Gépnapló</h3>
            <div className="space-y-4">
               <StatItem label="Aktív javítás" value={activeRepairs.length} icon={Wrench} />
               <StatItem label="Összes szerviz" value={repairs.length} icon={History} />
            </div>
          </div>
        </div>

        {/* Right Column: Active Repairs & History */}
        <div className="md:col-span-2 space-y-8">
          {/* Active Repairs */}
          <section>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Clock className="text-cafe-gold" size={20} />
              Jelenlegi folyamatok
            </h2>
            {activeRepairs.length > 0 ? (
              <div className="space-y-4">
                {activeRepairs.map(repair => (
                  <RepairCard key={repair.id} repair={repair} />
                ))}
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-cafe-medium/10 rounded-3xl text-center text-cafe-medium/40 italic">
                Nincs aktív javításod pillanatnyilag.
              </div>
            )}
          </section>

          {/* Past Repairs */}
          {pastRepairs.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <CheckCircle2 className="text-cafe-steel" size={20} />
                Korábbi javítások
              </h2>
              <div className="space-y-4">
                {pastRepairs.map(repair => (
                  <RepairCard key={repair.id} repair={repair} isPast />
                ))}
              </div>
            </section>
          )}

          {/* Pending Appointments */}
          {appointments.length > 0 && (
             <section>
               <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-cafe-medium">
                 <Calendar size={20} />
                 Foglalásaid
               </h2>
               <div className="space-y-3">
                 {appointments.map(app => (
                   <div key={app.id} className="cafe-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                       {app.image_url ? (
                         <img src={app.image_url} alt="Machine" className="w-12 h-12 rounded-lg object-cover border border-cafe-medium/10" />
                       ) : (
                         <div className="w-12 h-12 bg-cafe-medium/5 rounded-lg flex items-center justify-center text-cafe-medium/30">
                           <Coffee size={24} />
                         </div>
                       )}
                       <div>
                         <p className="font-bold text-cafe-dark">{app.machine_model}</p>
                         <p className="text-xs text-cafe-medium/50">
                           {new Date(app.requested_date).toLocaleString('hu-HU', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-3">
                       <span className={cn(
                         "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                         app.status === 'visszaigazolva' ? "bg-green-100 text-green-700" : 
                         app.status === 'lemondva' ? "bg-red-100 text-red-700" :
                         "bg-yellow-100 text-yellow-700"
                       )}>
                         {app.status}
                       </span>
                       <button 
                         onClick={() => navigate(`/status/${app.id}`)}
                         className="p-2 hover:bg-cafe-medium/5 rounded-full text-cafe-medium transition-colors"
                       >
                         <ArrowRight size={18} />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
             </section>
          )}
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, icon: Icon }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 opacity-60">
        <Icon size={16} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}

function RepairCard({ repair, isPast }: { repair: Repair; isPast?: boolean; key?: any }) {
  const navigate = useNavigate();
  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      onClick={() => navigate(`/status/${repair.id}`)}
      className={cn(
        "cafe-card p-6 cursor-pointer border-l-4 transition-all overflow-hidden relative",
        isPast ? "border-l-cafe-steel/30 opacity-70" : "border-l-cafe-gold shadow-md"
      )}
    >
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-lg">{repair.machine_model}</h4>
            {repair.status === 'kész' && !isPast && (
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </div>
          <p className="text-sm text-cafe-medium/60 mb-4 line-clamp-1">{repair.error_description}</p>
          
          {repair.public_note && !isPast && (
             <div className="mb-4 p-3 bg-cafe-gold/5 rounded-xl border border-cafe-gold/10">
                <p className="text-[10px] font-bold text-cafe-gold uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Clock size={10} /> Legutóbbi üzenet
                </p>
                <p className="text-sm italic text-cafe-dark font-medium line-clamp-2">"{repair.public_note}"</p>
             </div>
          )}

          <div className="flex items-center gap-3">
            <span className={cn(
               "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
               isPast ? "bg-cafe-medium/5 text-cafe-medium" : 
               repair.status === 'kész' ? "bg-green-100 text-green-700" :
               "bg-cafe-gold/10 text-cafe-gold"
            )}>
              {repair.status}
            </span>
            <span className="text-[10px] font-mono text-cafe-medium/30">{new Date(repair.created_at).toLocaleDateString('hu-HU')}</span>
          </div>
        </div>
        <ArrowRight size={20} className="text-cafe-medium/20 mt-1" />
      </div>
      
      {/* Subtle background decoration */}
      <Wrench className="absolute -right-4 -bottom-4 w-24 h-24 text-cafe-medium/5 -rotate-12" />
    </motion.div>
  );
}
