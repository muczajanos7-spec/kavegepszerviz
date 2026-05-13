import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Trash2, 
  X, 
  ShoppingBag, 
  ArrowLeft,
  Image as ImageIcon,
  CheckCircle,
  Tag
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Machine } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export function AdminMachines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newMachine, setNewMachine] = useState({
    model_name: '',
    price: 0,
    description: '',
    image_url: '',
  });

  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchMachines();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin');
    }
  }

  async function fetchMachines() {
    setLoading(true);
    const { data, error } = await supabase
      .from('machines_for_sale')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setMachines(data);
    setLoading(false);
  }

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('machines_for_sale')
      .insert([newMachine])
      .select()
      .single();

    if (error) {
      toast.error('Hiba: ' + error.message);
    } else {
      toast.success('Gép hozzáadva!');
      setMachines([data, ...machines]);
      setShowAddModal(false);
      setNewMachine({ model_name: '', price: 0, description: '', image_url: '' });
    }
  };

  const deleteMachine = async (id: string) => {
    if (!confirm('Biztosan törölni szeretné ezt a gépet?')) return;
    const { error } = await supabase.from('machines_for_sale').delete().eq('id', id);
    if (error) {
      toast.error('Hiba: ' + error.message);
    } else {
      setMachines(machines.filter(m => m.id !== id));
      toast.success('Törölve');
    }
  };

  const toggleSold = async (machine: Machine) => {
    const nextStatus = machine.status === 'elérhető' ? 'eladva' : 'elérhető';
    const { error } = await supabase
      .from('machines_for_sale')
      .update({ status: nextStatus })
      .eq('id', machine.id);

    if (error) {
      toast.error('Hiba a frissítéskor');
    } else {
      setMachines(machines.map(m => m.id === machine.id ? { ...m, status: nextStatus } : m));
      toast.success(nextStatus === 'eladva' ? 'Eladottnak jelölve' : 'Újra elérhető');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin" className="p-2 hover:bg-cafe-medium/5 rounded-xl transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">Eladó gépek kezelése</h1>
      </div>

      <button 
        onClick={() => setShowAddModal(true)}
        className="cafe-btn-primary w-full md:w-auto flex items-center justify-center gap-2 mb-8"
      >
        <Plus size={20} /> Új gép feltöltése
      </button>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-cafe-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {machines.map((machine) => (
            <motion.div 
              layout
              key={machine.id}
              className={cn(
                "cafe-card group relative",
                machine.status === 'eladva' && "opacity-60 grayscale"
              )}
            >
              <div className="aspect-video bg-cafe-medium/5 relative overflow-hidden">
                {machine.image_url ? (
                  <img src={machine.image_url} alt={machine.model_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-cafe-medium/20">
                    <ImageIcon size={48} />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                   <button 
                    onClick={() => deleteMachine(machine.id)}
                    className="p-2 bg-white/90 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-lg"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{machine.model_name}</h3>
                  <span className="text-cafe-gold font-bold">{machine.price.toLocaleString('hu-HU')} Ft</span>
                </div>
                <p className="text-cafe-medium/60 text-sm mb-6 line-clamp-2">{machine.description}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleSold(machine)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all",
                      machine.status === 'elérhető' 
                        ? "bg-cafe-steel text-white hover:bg-cafe-dark" 
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    )}
                  >
                    {machine.status === 'elérhető' ? (
                      <><CheckCircle size={16} /> Eladottnak jelölés</>
                    ) : (
                      <><Tag size={16} /> Újra elérhető</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {machines.length === 0 && (
            <div className="col-span-full text-center py-24 text-cafe-medium/30 italic">
               Nincs feltöltött gép.
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
                  <h2 className="text-2xl font-bold">Gép feltöltése</h2>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-cafe-medium/5 rounded-full">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleAddMachine} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Modell megnevezése</label>
                    <input
                      required
                      type="text"
                      className="cafe-input"
                      value={newMachine.model_name}
                      onChange={(e) => setNewMachine({ ...newMachine, model_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Ar (Ft)</label>
                    <input
                      required
                      type="number"
                      className="cafe-input"
                      value={newMachine.price}
                      onChange={(e) => setNewMachine({ ...newMachine, price: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Kép URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      className="cafe-input"
                      value={newMachine.image_url}
                      onChange={(e) => setNewMachine({ ...newMachine, image_url: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-cafe-medium/50 uppercase tracking-wider block mb-1">Leírás</label>
                    <textarea
                      rows={4}
                      className="cafe-input resize-none"
                      value={newMachine.description}
                      onChange={(e) => setNewMachine({ ...newMachine, description: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="cafe-btn-primary w-full py-4 mt-4">
                    Gép mentése
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
