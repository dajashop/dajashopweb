import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  FileQuestion,
} from 'lucide-react';
import {
  exportToExcel,
  importFromExcel,
  downloadTemplate,
} from '../../../utils/excelHelpers';
import './ExcelManager.css';

const ExcelManager = ({ products, brands, categories, onImport }) => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleExport = async () => {
    await exportToExcel(products);
    setStatus({ type: 'success', msg: 'Tabela uspešno preuzeta!' });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleDownloadTemplate = async () => {
    await downloadTemplate(brands, categories);
    setStatus({ type: 'success', msg: 'Šablon sa šifarnikom preuzet.' });
    setTimeout(() => setStatus(null), 4000);
  };

  // Helper za čitanje kolona (Case-insensitive)
  const getVal = (row, ...keys) => {
    const foundKey = Object.keys(row).find((k) =>
      keys.some(
        (searchKey) => k.toLowerCase().trim() === searchKey.toLowerCase()
      )
    );
    return foundKey ? row[foundKey] : null;
  };

  // --- NOVA FUNKCIJA: NORMALIZACIJA POLA ---
  const parseGender = (input) => {
    if (!input) return '';
    const val = String(input).toLowerCase().trim();

    if (['m', 'muški', 'muski', 'musko', 'muško', 'male'].includes(val))
      return 'MUŠKI';
    if (
      ['z', 'ž', 'ženski', 'zenski', 'zensko', 'žensko', 'female'].includes(val)
    )
      return 'ŽENSKI';

    return ''; // Za Unisex ili nepoznato
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setStatus(null);

    try {
      const rawData = await importFromExcel(file);

      if (!rawData || rawData.length === 0) {
        throw new Error('Fajl je prazan.');
      }

      const formattedData = rawData.map((row) => {
        // 1. Specifikacije
        const specs = {};
        Object.keys(row).forEach((key) => {
          if (key.toLowerCase().startsWith('spec')) {
            const cleanName = key.replace(/spec[:\s\-_]*/i, '').trim();
            if (cleanName && row[key]) {
              specs[cleanName] = String(row[key]).trim();
            }
          }
        });

        // 2. Cena
        const rawPrice = getVal(row, 'Cena', 'price', 'iznos');
        let parsedPrice =
          parseFloat(String(rawPrice || '0').replace(/[^0-9.]/g, '')) || 0;

        // 3. Pol (Koristimo novu funkciju)
        const rawGender = getVal(row, 'Pol', 'gender', 'sex', 'rod');
        const cleanGender = parseGender(rawGender);

        return {
          id: getVal(row, 'ID', 'id', 'sifra') || null,
          name: getVal(row, 'Naziv', 'name', 'naslov') || 'Nepoznat proizvod',
          brand: getVal(row, 'Brend', 'brand', 'marka') || 'Ostalo',
          department: getVal(row, 'Odeljenje', 'department') || 'satovi',
          category: getVal(row, 'Kategorija', 'category') || 'Opšte',
          gender: cleanGender, // <--- OVDE JE POPRAVKA
          price: parsedPrice,
          image: getVal(row, 'Slika', 'image', 'url') || '',
          description: getVal(row, 'Opis', 'description') || '',
          specs: specs,
        };
      });

      await onImport(formattedData);

      setStatus({
        type: 'success',
        msg: `Uspešno učitano ${formattedData.length} proizvoda.`,
      });
    } catch (error) {
      console.error('Import Error:', error);
      setStatus({ type: 'error', msg: 'Greška! Proverite konzolu.' });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setStatus(null), 5000);
    }
  };

  return (
    <div className="excel-manager-wrapper">
      <div className="excel-actions">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="excel-btn template"
          onClick={handleDownloadTemplate}
        >
          <FileQuestion size={18} /> <span>Preuzmi Šablon</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="excel-btn export"
          onClick={handleExport}
        >
          <Download size={18} /> <span>Izvezi Listu</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="excel-btn import"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          {loading ? <span className="spinner"></span> : <Upload size={18} />}
          <span>{loading ? 'Učitavam...' : 'Uvezi Excel'}</span>
        </motion.button>
        <input
          type="file"
          accept=".xlsx, .xls"
          ref={fileInputRef}
          hidden
          onChange={handleFileImport}
        />
      </div>
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`status-message ${status.type}`}
          >
            {status.type === 'success' ? (
              <CheckCircle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            {status.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExcelManager;
