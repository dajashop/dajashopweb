import ExcelJS from 'exceljs';

const getDateString = () => new Date().toISOString().split('T')[0];

const triggerDownload = (buffer, filename) => {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// --- IZVOZ (EXPORT) ---
export const exportToExcel = async (data, fileName = 'proizvodi') => {
  const specKeys = new Set();
  const cleanData = data.map((item) => {
    const row = {
      ID: item.id,
      Naziv: item.name,
      Brend: item.brand,
      Odeljenje: item.department || 'satovi',
      Kategorija: item.category,
      Pol: item.gender || 'Unisex',
      Cena: item.price,
      Slika: item.image || '',
      Opis: item.description || '',
    };
    if (item.specs && typeof item.specs === 'object') {
      Object.keys(item.specs).forEach((key) => {
        specKeys.add(key);
        row[`Spec: ${key}`] = item.specs[key];
      });
    }
    return row;
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Lager Lista');
  worksheet.columns = [
    { header: 'ID', key: 'ID', width: 25 },
    { header: 'Naziv', key: 'Naziv', width: 30 },
    { header: 'Brend', key: 'Brend', width: 15 },
    { header: 'Odeljenje', key: 'Odeljenje', width: 15 },
    { header: 'Kategorija', key: 'Kategorija', width: 20 },
    { header: 'Pol', key: 'Pol', width: 10 },
    { header: 'Cena', key: 'Cena', width: 10 },
    { header: 'Slika', key: 'Slika', width: 30 },
    { header: 'Opis', key: 'Opis', width: 40 },
    ...[...specKeys].map((k) => ({ header: `Spec: ${k}`, key: `Spec: ${k}`, width: 20 })),
  ];
  worksheet.addRows(cleanData);

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, `DajaShop_${fileName}_${getDateString()}.xlsx`);
};

// --- UVOZ (IMPORT) ---
export const importFromExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(e.target.result);
        const worksheet = workbook.worksheets[0];
        const headers = worksheet.getRow(1).values.slice(1);
        const jsonData = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const rowObj = {};
          headers.forEach((header, i) => {
            if (header) rowObj[header] = row.getCell(i + 1).value ?? '';
          });
          jsonData.push(rowObj);
        });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

// --- NAPREDNI ŠABLON ---
export const downloadTemplate = async (
  existingBrands = [],
  existingCategories = []
) => {
  const workbook = new ExcelJS.Workbook();

  const templateWS = workbook.addWorksheet('Unos Proizvoda');
  templateWS.columns = [
    { header: 'ID', key: 'ID', width: 25 },
    { header: 'Naziv', key: 'Naziv', width: 30 },
    { header: 'Brend', key: 'Brend', width: 15 },
    { header: 'Odeljenje', key: 'Odeljenje', width: 15 },
    { header: 'Kategorija', key: 'Kategorija', width: 15 },
    { header: 'Pol', key: 'Pol', width: 10 },
    { header: 'Cena', key: 'Cena', width: 10 },
    { header: 'Slika', key: 'Slika', width: 30 },
    { header: 'Opis', key: 'Opis', width: 30 },
    { header: 'Spec: Mehanizam', key: 'Spec: Mehanizam', width: 20 },
    { header: 'Spec: Staklo', key: 'Spec: Staklo', width: 20 },
  ];
  templateWS.addRow({
    ID: '',
    Naziv: 'Primer: Casio Edifice',
    Brend: 'Casio',
    Odeljenje: 'satovi',
    Kategorija: 'Edifice',
    Pol: 'MUŠKI',
    Cena: 15900,
    Slika: 'https://link-do-slike.com/sat.jpg',
    Opis: 'Opis proizvoda...',
    'Spec: Mehanizam': 'Kvarcni',
    'Spec: Staklo': 'Safirno',
  });

  const refWS = workbook.addWorksheet('Šifarnik (Pomoć)');
  refWS.columns = [
    { header: 'Postojeći Brendovi', key: 'brendovi', width: 25 },
    { header: 'Postojeće Kategorije', key: 'kategorije', width: 25 },
    { header: 'Dozvoljena Odeljenja', key: 'odeljenja', width: 20 },
    { header: 'Pol (Opcije)', key: 'pol', width: 25 },
  ];
  const depts = ['satovi', 'naocare', 'baterije', 'daljinski'];
  const genders = ['MUŠKI', 'ŽENSKI', 'UNISEX'];
  const maxRows = Math.max(existingBrands.length, existingCategories.length, 4);
  for (let i = 0; i < maxRows; i++) {
    refWS.addRow({
      brendovi: existingBrands[i]?.name || '',
      kategorije: existingCategories[i]?.name || '',
      odeljenja: depts[i] || '',
      pol: genders[i] || '',
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, 'DajaShop_Sablon_i_Sifarnik.xlsx');
};
