import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Search, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Save, 
  Wrench,
  Clock,
  Package,
  CheckCircle2,
  Truck,
  ArrowLeft
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Repair, RepairStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

const statusFlow: RepairStatus[] = ['beérkezett', 'javítás alatt', 'alkatrészre vár', 'kész', 'átadva'];

const statusMeta: Record<RepairStatus, { label: string; icon: any; color: string }> = {
  'beérkezett': { label: 'Beérkezett', icon: Clock, color: 'bg-blue-100 text-blue-600' },
  'javítás alatt': { label: 'Javítás', icon: Wrench, color: 'bg-orange-100 text-orange-600' },
  'alkatrészre vár': { label: 'Alkatrész', icon: Package, color: 'bg-purple-100 text-purple-600' },
  'kész': { label: 'Kész', icon: CheckCircle2, color: 'bg-green-100 text-green-600' },
  'átadva': { label: 'Átadva', icon: Truck, color: 'bg-gray-100 text-gray-600' },
};

export function AdminRepairs() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newRepair, setNewRepair] = useState({
    customer_name: '',
    phone: '',
    machine_model: '',
    error_description: '',
  });

  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchRepairs();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin');
      toast.error('Kérjük jelentkezzen be!');
    }
  }

  async function fetchRepairs() {
    setLoading(true);
    const { data, error } = await supabase
      .from('repairs')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (data) setRepairs(data);
    setLoading(false);
  }

  const handleAddRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('repairs')
      .insert([newRepair])
      .select()
      .single();

    if (error) {
      toast.error('Hiba: ' + error.message);
    } else {
      toast.success('Munkalap létrehozva!');
      setRepairs([data, ...repairs]);
      setShowAddModal(false);
      setNewRepair({ customer_name: '', phone: '', machine_model: '', error_description: '' });
    }
  };

  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
  const [statusNote, setStatusNote] = useState('');

  const updateStatus = async (id: string, currentStatus: RepairStatus, direction: 'next' | 'prev' | 'set', targetStatus?: RepairStatus) => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    let nextStatus = targetStatus;
    
    if (!nextStatus) {
      let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex < 0 || nextIndex >= statusFlow.length) return;
      nextStatus = statusFlow[nextIndex];
    }

    const repair = repairs.find(r => r.id === id);
    if (!repair) return;

    const newHistory = [
      ...(repair.history || []), 
      { 
        status: nextStatus, 
        timestamp: new Date().toISOString(),
        note: statusNote.trim() || undefined 
      }
    ];
    
    const { error } = await supabase
      .from('repairs')
      .update({ 
        status: nextStatus, 
        updated_at: new Date().toISOString(),
        history: newHistory,
        public_note: statusNote.trim() || repair.public_note // Preserve or update
      })
      .eq('id', id);

    if (error) {
      toast.error('Hiba a frissítéskor');
    } else {
      setRepairs(repairs.map(r => r.id === id ? { 
        ...r, 
        status: nextStatus!, 
        updated_at: new Date().toISOString(), 
        history: newHistory,
        public_note: statusNote.trim() || r.public_note
      } : r));
      toast.success('Állapot frissítve');
      setStatusNote('');
      setEditingRepair(null);
    }
  };

  const updateEstimatedDate = async (id: string, date: string) => {
    const { error } = await supabase
      .from('repairs')
      .update({ estimated_completion: date })
      .eq('id', id);
    if (error) toast.error('Hiba a dátum mentésekor');
    else {
      setRepairs(repairs.map(r => r.id === id ? { ...r, estimated_completion: date } : r));
      toast.success('Várható elkészülés mentve');
    }
  };

  const filteredRepairs = repairs.filter(r => 
    r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.machine_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.includes(searchTerm)
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin" className="p-2 hover:bg-cafe-medium/5 rounded-xl transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">Munkalapok</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-medium/30" size={20} />
          <input
            type="text"
            placeholder="Keresés név, gép vagy ID alapján..."
            className="cafe-input pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="cafe-btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Plus size={20} /> Új munkalap
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-cafe-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRepairs.map((repair) => (
            <RepairItem 
              key={repair.id} 
              repair={repair} 
              onUpdateStatus={updateStatus} 
              onUpdateDate={updateEstimatedDate}
            />
          ))}
          {filteredRepairs.length === 0 && (
            <div className="text-center py-12 text-cafe-medium/40 italic">
              Nincs találat.
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-cafe-dark/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Új munkalap felvétele</h2>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-cafe-medium/5 rounded-full">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleAddRepair} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Ügyfél neve</label>
                    <input
                      required
                      type="text"
                      className="cafe-input"
                      value={newRepair.customer_name}
                      onChange={(e) => setNewRepair({ ...newRepair, customer_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Telefonszám</label>
                    <input
                      required
                      type="tel"
                      className="cafe-input"
                      value={newRepair.phone}
                      onChange={(e) => setNewRepair({ ...newRepair, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Készülék típusa</label>
                    <input
                      required
                      type="text"
                      className="cafe-input"
                      value={newRepair.machine_model}
                      onChange={(e) => setNewRepair({ ...newRepair, machine_model: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Hiba leírása</label>
                    <textarea
                      rows={3}
                      className="cafe-input resize-none"
                      value={newRepair.error_description}
                      onChange={(e) => setNewRepair({ ...newRepair, error_description: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="cafe-btn-primary w-full py-4 mt-4">
                    Munkalap mentése
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RepairItem({ repair, onUpdateStatus, onUpdateDate }: { repair: Repair; onUpdateStatus: any; onUpdateDate: any; key?: any }) {
  const meta = statusMeta[repair.status];
  const Icon = meta.icon;
  const [note, setNote] = useState('');

  return (
    <motion.div 
      layout
      className="cafe-card p-6 flex flex-col gap-6"
    >
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide", meta.color)}>
              <Icon size={14} />
              {meta.label}
            </span>
            <span className="text-[10px] font-mono text-cafe-medium/30">{repair.id.slice(0, 8)}...</span>
          </div>
          <h3 className="text-xl font-bold text-cafe-dark">{repair.customer_name}</h3>
          <p className="text-cafe-medium/60 font-medium mb-2">{repair.machine_model}</p>
          {repair.public_note && (
             <div className="text-[10px] bg-cafe-gold/5 text-cafe-gold px-2 py-1 rounded inline-block">
               Aktív üzenet: <span className="italic">"{repair.public_note}"</span>
             </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={() => { onUpdateStatus(repair.id, repair.status, 'prev', undefined, note); setNote(''); }}
            disabled={repair.status === statusFlow[0]}
            className="flex-1 md:flex-none h-12 w-12 flex items-center justify-center bg-white border-2 border-cafe-medium/10 rounded-xl text-cafe-medium hover:bg-cafe-medium/5 disabled:opacity-20 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="hidden md:flex flex-col items-center justify-center px-4 py-2 bg-cafe-medium/5 rounded-xl min-w-[120px]">
            <span className="text-[10px] text-cafe-medium/40 font-bold uppercase">Léptetés</span>
            <span className="text-xs font-bold text-cafe-medium">Állapot váltás</span>
          </div>
          <button 
            onClick={() => { onUpdateStatus(repair.id, repair.status, 'next', undefined, note); setNote(''); }}
            disabled={repair.status === statusFlow[statusFlow.length - 1]}
            className="flex-1 md:flex-none h-12 w-12 flex items-center justify-center bg-cafe-dark text-cafe-cream rounded-xl hover:bg-cafe-medium disabled:opacity-20 transition-all"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-cafe-medium/5">
        <div>
          <label className="text-[10px] font-bold text-cafe-medium/40 uppercase tracking-widest block mb-1">Megjegyzés a státuszhoz (ügyfél látja)</label>
          <input 
            type="text" 
            placeholder="Szerviz üzenet..." 
            className="cafe-input py-2 text-sm" 
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-cafe-medium/40 uppercase tracking-widest block mb-1">Várható elkészülés</label>
          <input 
            type="date" 
            className="cafe-input py-2 text-sm" 
            value={repair.estimated_completion || ''} 
            onChange={(e) => onUpdateDate(repair.id, e.target.value)}
          />
        </div>
      </div>
    </motion.div>
  );
}
