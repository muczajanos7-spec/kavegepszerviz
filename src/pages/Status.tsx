import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Package, 
  Truck, 
  Calendar, 
  Phone, 
  ArrowLeft,
  Coffee,
  AlertTriangle,
  History
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Repair, RepairStatus } from '../types';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

const statusSteps: { label: string; icon: any; val: RepairStatus }[] = [
  { label: 'Beérkezett', icon: Clock, val: 'beérkezett' },
  { label: 'Javítás alatt', icon: Wrench, val: 'javítás alatt' },
  { label: 'Alkatrészre vár', icon: Package, val: 'alkatrészre vár' },
  { label: 'Kész', icon: CheckCircle2, val: 'kész' },
  { label: 'Átadva', icon: Truck, val: 'átadva' },
];

export function Status() {
  const { id } = useParams<{ id: string }>();
  const [repair, setRepair] = useState<Repair | null>(null);
  const [appointment, setAppointment] = useState<any | null>(null);
  const [dataType, setDataType] = useState<'repair' | 'appointment' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      setLoading(true);
      setError(null);
      
      try {
        // Try repairs first
        const { data: repairData } = await supabase
          .from('repairs')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (repairData) {
          setRepair(repairData);
          setDataType('repair');
          return;
        }

        // Try appointments next
        const { data: appointmentData } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (appointmentData) {
          setAppointment(appointmentData);
          setDataType('appointment');
          return;
        }

        throw new Error('A megadott azonosítóhoz nem található bejegyzés.');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!id || !dataType) return;

    const table = dataType === 'repair' ? 'repairs' : 'appointments';
    
    // Create a unique channel name per ID and type
    const channel = supabase
      .channel(`status-updates-${dataType}-${id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table, 
          filter: `id=eq.${id}` 
        },
        (payload) => {
          if (dataType === 'repair') setRepair(payload.new as Repair);
          if (dataType === 'appointment') setAppointment(payload.new);
          toast.success('Állapot frissítve!', { 
            icon: '🔔',
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, dataType]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Coffee className="animate-spin text-cafe-gold" size={48} />
        <p className="font-medium italic">Adatok lekérése...</p>
      </div>
    );
  }

  if (error || (!repair && !appointment)) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <div className="bg-red-50 text-red-600 p-8 rounded-3xl mb-8">
          <AlertTriangle className="mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Hiba történt</h2>
          <p>{error || 'Ismeretlen hiba.'}</p>
        </div>
        <Link to="/" className="cafe-btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={20} /> Vissza a főoldalra
        </Link>
      </div>
    );
  }

  if (dataType === 'appointment' && appointment) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-cafe-light mb-8 hover:text-cafe-gold transition-colors">
          <ArrowLeft size={20} /> Vissza
        </Link>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="cafe-card p-10 shadow-2xl shadow-cafe-dark/10 text-center"
        >
          <div className="inline-flex p-4 bg-cafe-gold/10 rounded-full mb-6">
            <Calendar className="text-cafe-gold" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-cafe-dark mb-2">Időpont Foglalás Állapota</h1>
          <p className="text-cafe-medium/50 text-xs font-mono uppercase tracking-widest mb-8">{appointment.id}</p>
          
          <div className="flex flex-col items-center gap-4 mb-10">
            <div className={cn(
              "px-6 py-3 rounded-2xl font-bold text-lg uppercase tracking-wider",
              appointment.status === 'függőben' ? "bg-yellow-100 text-yellow-700" :
              appointment.status === 'visszaigazolva' ? "bg-green-100 text-green-700" :
              "bg-red-100 text-red-700 font-bold"
            )}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </div>
            
            {appointment.public_note && (
              <div className="my-6 p-6 bg-cafe-gold/5 border-2 border-dashed border-cafe-gold/20 rounded-2xl text-cafe-dark max-w-md">
                <p className="text-xs font-bold text-cafe-gold uppercase tracking-widest mb-2">Üzenet a szerviztől</p>
                <p className="italic">"{appointment.public_note}"</p>
              </div>
            )}

            {appointment.status === 'függőben' && !appointment.public_note && (
              <p className="text-cafe-medium text-sm max-w-sm mx-auto">
                Köszönjük türelmét! Adminisztrátorunk hamarosan feldolgozza kérését és értesíteni fogjuk.
              </p>
            )}
            {appointment.status === 'visszaigazolva' && !appointment.public_note && (
              <p className="text-green-600 font-medium max-w-sm mx-auto">
                Az időpontot visszaigazoltuk. Várjuk szeretettel!
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6 pt-10 border-t border-cafe-medium/10 text-left">
            <DetailItem 
              icon={Calendar} 
              label="Kért dátum és idő" 
              value={new Date(appointment.requested_date).toLocaleString('hu-HU')} 
            />
            <DetailItem 
              icon={Coffee} 
              label="Készülék" 
              value={appointment.machine_model} 
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!repair) return null;

  const currentStatusIndex = statusSteps.findIndex(s => s.val === repair.status);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-cafe-light mb-8 hover:text-cafe-gold transition-colors">
        <ArrowLeft size={20} /> Vissza
      </Link>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="cafe-card p-8 shadow-2xl shadow-cafe-dark/10"
      >
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-12">
          <div>
            <h1 className="text-2xl font-bold text-cafe-dark mb-2">Munkalap Állapota</h1>
            <p className="text-cafe-medium/50 text-xs font-mono uppercase tracking-widest">{repair.id}</p>
          </div>
          {repair.estimated_completion && (
             <div className="px-4 py-2 bg-cafe-gold/10 rounded-xl border border-cafe-gold/20">
               <p className="text-[10px] font-bold text-cafe-gold uppercase tracking-widest">Várható elkészülés</p>
               <p className="text-cafe-dark font-bold">{new Date(repair.estimated_completion).toLocaleDateString('hu-HU')}</p>
             </div>
          )}
        </div>

        {/* Public Note (Szervizüzenet) */}
        {repair.public_note && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-12 p-6 bg-cafe-dark text-cafe-cream rounded-3xl border-l-8 border-cafe-gold shadow-xl"
          >
            <div className="flex items-center gap-2 mb-2 text-cafe-gold">
              <CheckCircle2 size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Friss szervizüzenet</span>
            </div>
            <p className="text-lg italic font-serif">"{repair.public_note}"</p>
          </motion.div>
        )}

        {/* Status Stepper (Visual Timeline) */}
        <div className="relative mb-16">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-cafe-medium/10 -translate-y-1/2 hidden md:block" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-0 relative z-10">
            {statusSteps.map((step, idx) => {
              const Icon = step.icon;
              const isPast = idx < currentStatusIndex;
              const isCurrent = idx === currentStatusIndex;
              
              return (
                <div key={idx} className="flex md:flex-col items-center gap-4 md:gap-3 text-center group">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-700 z-20",
                    isPast ? "bg-cafe-gold text-cafe-dark shadow-lg shadow-cafe-gold/20" : 
                    isCurrent ? "bg-cafe-dark text-cafe-cream scale-125 ring-8 ring-cafe-gold/10 shadow-2xl" : 
                    "bg-white border-2 border-cafe-medium/10 text-cafe-medium/30"
                  )}>
                    <Icon size={20} />
                  </div>
                  <div className="flex flex-col md:items-center">
                    <span className={cn(
                      "text-sm font-bold transition-colors",
                      isCurrent ? "text-cafe-dark" : isPast ? "text-cafe-medium" : "text-cafe-medium/30"
                    )}>
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] text-cafe-gold font-bold uppercase tracking-wide md:mt-1 animate-pulse">
                        Folyamatban
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* History / Service Log */}
        <div className="mb-12">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-cafe-medium/40 mb-6 flex items-center gap-2">
            <History size={16} /> Szerviztörténet
          </h3>
          <div className="space-y-6">
            {repair.history && repair.history.length > 0 ? (
              repair.history.slice().reverse().map((item, idx) => (
                <div key={idx} className="flex gap-4 relative">
                  {idx !== repair.history.length - 1 && (
                    <div className="absolute left-[7px] top-6 w-[2px] h-full bg-cafe-medium/10" />
                  )}
                  <div className="w-4 h-4 rounded-full border-2 border-cafe-gold bg-white z-10 mt-1" />
                  <div>
                    <p className="font-bold text-cafe-dark text-sm">{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</p>
                    <p className="text-xs text-cafe-medium/50 mb-1">{new Date(item.timestamp).toLocaleString('hu-HU')}</p>
                    {item.note && <p className="text-sm text-cafe-medium italic">"{item.note}"</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-cafe-medium/40 italic">A javítás megkezdődött.</div>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-8 pt-8 border-t border-cafe-medium/10">
          <div className="space-y-6">
            <DetailItem 
              icon={Calendar} 
              label="Beérkezés dátuma" 
              value={new Date(repair.created_at).toLocaleDateString('hu-HU')} 
            />
            <DetailItem 
              icon={Coffee} 
              label="Készülék típusa" 
              value={repair.machine_model} 
            />
          </div>
          <div className="space-y-6">
            <DetailItem 
              icon={Wrench} 
              label="Hiba leírása" 
              value={repair.error_description || 'Nincs megadva'} 
            />
            <DetailItem 
              icon={CheckCircle2} 
              label="Utolsó frissítés" 
              value={new Date(repair.updated_at).toLocaleDateString('hu-HU')} 
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 p-2 bg-cafe-medium/5 rounded-lg text-cafe-medium">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-cafe-dark font-medium leading-tight">{value}</p>
      </div>
    </div>
  );
}
