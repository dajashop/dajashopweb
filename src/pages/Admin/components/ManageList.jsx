import AdminSkeleton from '../../../components/AdminSkeleton.jsx';
// src/pages/Admin/components/ManageList.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import FlashModal from '../../../components/modals/FlashModal.jsx';

// dependencyOptions = niz objekata (npr. brendovi) za dropdown
// dependencyLabel = Labela za dropdown (npr. "Brend")
// dependencyField = Naziv polja u bazi (npr. "brand")
export default function ManageList({
  service,
  title,
  icon: Icon,
  dependencyOptions = null,
  dependencyLabel = 'Opcija',
  dependencyField = 'brand',
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stanja za novi unos
  const [newItem, setNewItem] = useState('');
  const [newDependency, setNewDependency] = useState(''); // Za izabrani brend pri dodavanju

  // Stanja za editovanje
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editDependency, setEditDependency] = useState(''); // Za izabrani brend pri editu

  const [flash, setFlash] = useState({ open: false, title: '', ok: true });

  useEffect(() => {
    const unsub = service.subscribe(
      (data) => {
        setItems(data);
        setLoading(false);
      },
      (err) => console.error(err)
    );
    return () => unsub();
  }, [service]);

  // --- Actions ---
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    // Ako postoje opcije (brendovi), a ništa nije izabrano, upozori ili dozvoli (zavisi od logike)
    // Ovde ćemo dozvoliti da bude prazno (opšta kategorija) ili obavezno ako želiš

    const extra = {};
    if (dependencyOptions && newDependency) {
      extra[dependencyField] = newDependency;
    }

    try {
      await service.add(newItem, extra);
      setNewItem('');
      setNewDependency('');
      setFlash({ open: true, title: 'Uspešno dodato', ok: true });
    } catch (error) {
      setFlash({ open: true, title: 'Greška pri dodavanju', ok: false });
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditValue(item.name);
    // Učitaj postojeći brend ako ga ima
    setEditDependency(item[dependencyField] || '');
  };

  const saveEdit = async () => {
    try {
      const extra = {};
      if (dependencyOptions) {
        extra[dependencyField] = editDependency;
      }
      await service.update(editingId, editValue, extra);
      setEditingId(null);
    } catch (error) {
      setFlash({ open: true, title: 'Greška pri izmeni', ok: false });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Da li ste sigurni?')) return;
    try {
      await service.remove(id);
    } catch (error) {
      setFlash({ open: true, title: 'Greška pri brisanju', ok: false });
    }
  };

  return (
    <div className="card glass p-6 h-full flex flex-col">
      <FlashModal
        {...flash}
        onClose={() => setFlash({ ...flash, open: false })}
      />

      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
        <div className="p-2 rounded-xl bg-white/10 text-primary">
          <Icon size={20} />
        </div>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>

      {/* Add Form */}
      <form
        onSubmit={handleAdd}
        className="flex flex-col sm:flex-row gap-2 mb-4"
      >
        {/* Ako postoje dependencyOptions (Brendovi), prikaži dropdown */}
        {dependencyOptions && (
          <select
            className="bg-white/5 border border-primary-dark rounded-xl px-3 py-2 text-sm focus:border-primary outline-none transition-colors min-w-[120px]"
            value={newDependency}
            onChange={(e) => setNewDependency(e.target.value)}
          >
            <option value="">Svi brendovi</option>
            {dependencyOptions.map((opt) => (
              <option key={opt.id} value={opt.name}>
                {opt.name}
              </option>
            ))}
          </select>
        )}

        <input
          className="flex-1 bg-white/5 border border-primary-dark rounded-xl px-4 py-2 text-sm focus:border-primary outline-none transition-colors"
          placeholder={`Novi ${title.toLowerCase()}...`}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
        />
        <button
          type="submit"
          disabled={!newItem.trim()}
          className="btn btn--primary rounded-xl px-3 py-2 flex justify-center items-center"
        >
          <Plus size={18} />
        </button>
      </form>

      {/* List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {loading ? (
<AdminSkeleton rows={4} />
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-primary group transition-colors"
              >
                {editingId === item.id ? (
                  // EDIT MODE
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    {dependencyOptions && (
                      <select
                        className="bg-black/20 rounded-lg px-2 py-1 text-sm outline-none border border-primary/50 text-neutral-300"
                        value={editDependency}
                        onChange={(e) => setEditDependency(e.target.value)}
                      >
                        <option value="">- Brend -</option>
                        {dependencyOptions.map((opt) => (
                          <option key={opt.id} value={opt.name}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      className="flex-1 bg-black/20 rounded-lg px-2 py-1 text-sm outline-none border border-primary/50"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                    />
                    <button
                      onClick={saveEdit}
                      className="text-emerald-500 p-1 hover:bg-white/10 rounded-lg"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-red-400 p-1 hover:bg-white/10 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  // VIEW MODE
                  <>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="font-medium text-sm truncate">
                        {item.name}
                      </span>
                      {/* Prikaz Benda kao Badge ako postoji */}
                      {item[dependencyField] && dependencyOptions && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-400 border border-white/5 whitespace-nowrap">
                          {item[dependencyField]}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-muted hover:text-primary transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {!loading && items.length === 0 && (
          <p className="text-center text-muted text-sm py-4">Nema podataka.</p>
        )}
      </div>
    </div>
  );
}
