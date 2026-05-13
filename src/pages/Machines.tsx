import { useState, useEffect } from 'react';
import { Coffee, Filter, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Machine } from '../types';

export function Machines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMachines() {
      const { data, error } = await supabase
        .from('machines_for_sale')
        .select('*')
        .eq('status', 'elérhető')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMachines(data);
      }
      setLoading(false);
    }
    fetchMachines();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <header className="mb-12">
        <h1 className="text-3xl font-bold text-cafe-dark mb-2">Felújított Kávégépek</h1>
        <p className="text-cafe-medium/60 text-lg">Minden gépünk alapos tisztításon, tömítéscserén és beállításon esett át.</p>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
          <Coffee className="animate-bounce text-cafe-gold" size={48} />
          <p className="font-medium italic">Kínálat betöltése...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {machines.length > 0 ? (
            machines.map((machine, index) => (
              <motion.div
                key={machine.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="cafe-card group"
              >
                <div className="aspect-square bg-cafe-medium/5 relative overflow-hidden">
                  {machine.image_url ? (
                    <img 
                      src={machine.image_url} 
                      alt={machine.model_name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-cafe-light/20">
                      <Coffee size={64} />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="bg-cafe-gold text-cafe-dark font-bold px-3 py-1 rounded-full text-sm shadow-lg">
                      {machine.price.toLocaleString('hu-HU')} Ft
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3">{machine.model_name}</h3>
                  <div className="space-y-4">
                    <p className="text-cafe-medium/70 text-sm leading-relaxed">
                      {machine.description || 'Nincs leírás megadva.'}
                    </p>
                    <div className="pt-4 border-t border-cafe-medium/10 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-cafe-steel text-sm">
                        <Info size={16} />
                        <span>6 hónap garancia</span>
                      </div>
                      <button className="cafe-btn-primary py-2 px-4 text-sm">
                        Érdekel
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-24 text-center">
              <div className="inline-flex p-4 bg-cafe-medium/5 rounded-full mb-4">
                <Filter className="text-cafe-medium/20" size={32} />
              </div>
              <h3 className="text-xl font-medium text-cafe-dark">Jelenleg nincs eladó gépünk</h3>
              <p className="text-cafe-medium/50">Nézzen vissza később vagy hívjon minket az egyedi igényeivel!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
