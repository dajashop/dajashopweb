import { strToU8, unzipSync, zipSync } from 'fflate';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_XLSX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_XLSX_UNCOMPRESSED_SIZE = 48 * 1024 * 1024;
const RELATIONSHIPS_NS =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const getDateString = () => new Date().toISOString().split('T')[0];

const triggerDownload = (bytes, filename, type = XLSX_MIME) => {
  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

const neutralizeSpreadsheetFormula = (value) => {
  const text = String(value ?? '');
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
};

const escapeXml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const safeSheetName = (value, fallback = 'Tabela') =>
  String(value || fallback)
    .replace(/[\\/?*\[\]:]/g, '-')
    .slice(0, 31) || fallback;

const columnName = (index) => {
  let name = '';
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
};

const cellXml = (reference, value, style = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${reference}" s="${style}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }

  const text = neutralizeSpreadsheetFormula(value);
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
};

const worksheetXml = ({ columns, rows }) => {
  const safeColumns = columns.length > 0 ? columns : [{ key: 'value', header: 'Vrednost' }];
  const header = safeColumns
    .map((column, index) => cellXml(`${columnName(index)}1`, column.header, 1))
    .join('');
  const dataRows = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 2;
      const cells = safeColumns
        .map((column, columnIndex) =>
          cellXml(
            `${columnName(columnIndex)}${rowNumber}`,
            row?.[column.key] ?? '',
          ),
        )
        .join('');
      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join('');
  const columnDefinitions = safeColumns
    .map(
      (column, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${Number(column.width) || 20}" customWidth="1"/>`,
    )
    .join('');
  const lastColumn = columnName(safeColumns.length - 1);
  const lastRow = Math.max(rows.length + 1, 1);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${columnDefinitions}</cols>
  <sheetData><row r="1">${header}</row>${dataRows}</sheetData>
  <autoFilter ref="A1:${lastColumn}${lastRow}"/>
</worksheet>`;
};

const createXlsx = (sheets) => {
  const safeSheets = sheets.length > 0 ? sheets : [{ title: 'Tabela', columns: [], rows: [] }];
  const files = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${safeSheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('')}
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${RELATIONSHIPS_NS}">
  <sheets>${safeSheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(safeSheetName(sheet.title, `Tabela ${index + 1}`))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join('')}</sheets>
</workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${safeSheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join('')}
  <Relationship Id="rId${safeSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    'xl/styles.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF111111"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
</styleSheet>`),
  };

  safeSheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(worksheetXml(sheet));
  });

  return zipSync(files, { level: 6 });
};

const xmlNodes = (node, name) => {
  const namespaced = node.getElementsByTagNameNS
    ? Array.from(node.getElementsByTagNameNS('*', name))
    : [];
  return namespaced.length > 0
    ? namespaced
    : Array.from(node.getElementsByTagName(name));
};

const parseXml = (bytes, fileName) => {
  const document = new DOMParser().parseFromString(
    new TextDecoder().decode(bytes),
    'application/xml',
  );
  if (document.querySelector('parsererror')) {
    throw new Error(`Excel fajl sadrži neispravan ${fileName}.`);
  }
  return document;
};

const resolveSheetPath = (files) => {
  const fallbacks = Object.keys(files)
    .filter((path) => /^xl\/worksheets\/[^/]+\.xml$/i.test(path))
    .sort((first, second) => first.localeCompare(second, undefined, { numeric: true }));
  if (fallbacks.length === 0) throw new Error('Excel fajl nema radni list.');
  if (!files['xl/workbook.xml'] || !files['xl/_rels/workbook.xml.rels']) return fallbacks[0];

  try {
    const workbook = parseXml(files['xl/workbook.xml'], 'workbook.xml');
    const firstSheet = xmlNodes(workbook, 'sheet')[0];
    const relationId =
      firstSheet?.getAttributeNS(RELATIONSHIPS_NS, 'id') ||
      firstSheet?.getAttribute('r:id');
    const relations = parseXml(
      files['xl/_rels/workbook.xml.rels'],
      'workbook relacije',
    );
    const target = xmlNodes(relations, 'Relationship').find(
      (relation) => relation.getAttribute('Id') === relationId,
    )?.getAttribute('Target');
    if (!target) return fallbacks[0];
    const resolved = target.startsWith('/')
      ? target.slice(1)
      : `xl/${target.replace(/^\.\//, '')}`;
    return files[resolved] ? resolved : fallbacks[0];
  } catch {
    return fallbacks[0];
  }
};

const columnIndexFromReference = (reference, fallback) => {
  const letters = String(reference || '').match(/[A-Z]+/i)?.[0];
  if (!letters) return fallback;
  return letters
    .toUpperCase()
    .split('')
    .reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
};

const readSharedStrings = (files) => {
  const source = files['xl/sharedStrings.xml'];
  if (!source) return [];
  const document = parseXml(source, 'sharedStrings.xml');
  return xmlNodes(document, 'si').map((entry) => entry.textContent || '');
};

const cellValue = (cell, sharedStrings) => {
  const type = cell.getAttribute('t');
  const inlineString = xmlNodes(cell, 'is')[0];
  if (type === 'inlineStr') return inlineString?.textContent || '';

  const value = xmlNodes(cell, 'v')[0]?.textContent || '';
  if (type === 's') return sharedStrings[Number(value)] ?? '';
  if (type === 'b') return value === '1';
  if (type === 'str' || type === 'e') return value;
  if (value === '') {
    const formula = xmlNodes(cell, 'f')[0]?.textContent;
    return formula ? `=${formula}` : '';
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : value;
};

const rowsToObjects = (rows) => {
  if (rows.length === 0) return [];
  const headers = rows[0].map((header) => String(header ?? '').trim());
  return rows
    .slice(1)
    .map((values) => {
      const result = {};
      headers.forEach((header, index) => {
        if (header) result[header] = values[index] ?? '';
      });
      return result;
    })
    .filter((row) => Object.values(row).some((value) => String(value).trim() !== ''));
};

const parseXlsx = (buffer) => {
  const input = new Uint8Array(buffer);
  if (input.byteLength > MAX_XLSX_FILE_SIZE) {
    throw new Error('Excel fajl je prevelik. Maksimalna veličina je 12 MB.');
  }

  let files;
  try {
    files = unzipSync(input);
  } catch {
    throw new Error('Nije moguće otvoriti .xlsx fajl.');
  }
  const unpackedSize = Object.values(files).reduce(
    (total, file) => total + file.byteLength,
    0,
  );
  if (unpackedSize > MAX_XLSX_UNCOMPRESSED_SIZE) {
    throw new Error('Excel fajl sadrži previše podataka za bezbedan uvoz.');
  }

  const sheetPath = resolveSheetPath(files);
  const sharedStrings = readSharedStrings(files);
  const worksheet = parseXml(files[sheetPath], sheetPath);
  const rows = xmlNodes(worksheet, 'row').map((row) => {
    const values = [];
    let fallbackIndex = 0;
    xmlNodes(row, 'c').forEach((cell) => {
      const index = columnIndexFromReference(cell.getAttribute('r'), fallbackIndex);
      values[index] = cellValue(cell, sharedStrings);
      fallbackIndex = index + 1;
    });
    return values;
  });
  return rowsToObjects(rows);
};

const countDelimiters = (line, delimiter) => {
  let count = 0;
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') {
      if (inQuotes && line[index + 1] === '"') index += 1;
      else inQuotes = !inQuotes;
    } else if (!inQuotes && line[index] === delimiter) {
      count += 1;
    }
  }
  return count;
};

const parseCsvRows = (text, delimiter) => {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (inQuotes && input[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && character === delimiter) {
      row.push(value);
      value = '';
    } else if (!inQuotes && (character === '\n' || character === '\r')) {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }
  if (inQuotes) throw new Error('CSV fajl ima nezatvorene navodnike.');
  row.push(value);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
};

const parseCsv = (text) => {
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] || '';
  const delimiters = [',', ';', '\t'];
  const delimiter = delimiters.reduce(
    (best, candidate) =>
      countDelimiters(firstLine, candidate) > countDelimiters(firstLine, best)
        ? candidate
        : best,
    ',',
  );
  return rowsToObjects(parseCsvRows(text, delimiter));
};

const productColumns = (specKeys = []) => [
  { header: 'ID', key: 'ID', width: 25 },
  { header: 'Naziv', key: 'Naziv', width: 30 },
  { header: 'Brend', key: 'Brend', width: 15 },
  { header: 'Odeljenje', key: 'Odeljenje', width: 15 },
  { header: 'Kategorija', key: 'Kategorija', width: 20 },
  { header: 'Pol', key: 'Pol', width: 10 },
  { header: 'Cena', key: 'Cena', width: 12 },
  { header: 'Slika', key: 'Slika', width: 30 },
  { header: 'Opis', key: 'Opis', width: 40 },
  ...specKeys.map((key) => ({ header: `Spec: ${key}`, key: `Spec: ${key}`, width: 20 })),
];

// --- IZVOZ (XLSX) ---
export const exportToExcel = async (data, fileName = 'proizvodi') => {
  const specKeys = new Set();
  const rows = data.map((item) => {
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

  triggerDownload(
    createXlsx([{ title: 'Lager Lista', columns: productColumns([...specKeys]), rows }]),
    `DajaShop_${fileName}_${getDateString()}.xlsx`,
  );
};

// --- UVOZ (XLSX ili CSV) ---
export const importFromExcel = async (file) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'csv' || file.type === 'text/csv') {
    return parseCsv(await file.text());
  }
  if (extension === 'xlsx') return parseXlsx(await file.arrayBuffer());
  throw new Error('Podržani su samo .xlsx i .csv fajlovi.');
};

// --- ŠABLON I ŠIFARNIK ---
export const downloadTemplate = async (
  existingBrands = [],
  existingCategories = [],
) => {
  const depts = ['satovi', 'naocare', 'baterije', 'daljinski'];
  const genders = ['MUŠKI', 'ŽENSKI', 'UNISEX'];
  const maxRows = Math.max(existingBrands.length, existingCategories.length, 4);
  const referenceRows = Array.from({ length: maxRows }, (_, index) => ({
    brendovi: existingBrands[index]?.name || '',
    kategorije: existingCategories[index]?.name || '',
    odeljenja: depts[index] || '',
    pol: genders[index] || '',
  }));
  const templateRow = {
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
  };

  triggerDownload(
    createXlsx([
      {
        title: 'Unos Proizvoda',
        columns: productColumns(['Mehanizam', 'Staklo']),
        rows: [templateRow],
      },
      {
        title: 'Šifarnik (Pomoć)',
        columns: [
          { header: 'Postojeći Brendovi', key: 'brendovi', width: 25 },
          { header: 'Postojeće Kategorije', key: 'kategorije', width: 25 },
          { header: 'Dozvoljena Odeljenja', key: 'odeljenja', width: 20 },
          { header: 'Pol (Opcije)', key: 'pol', width: 25 },
        ],
        rows: referenceRows,
      },
    ]),
    'DajaShop_Sablon_i_Sifarnik.xlsx',
  );
};
