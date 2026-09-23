import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  catalogAuditApi,
  workforceApi,
  accessControlApi,
  importsApi,
} from '../../services/dajaPlatform';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Tag,
  Layers,
  List,
  Search,
  Edit3,
  Plus,
  X,
  Check,
  Trash2,
  Filter,
  Eye, // <--- NOVA IKONA
  EyeOff, // <--- NOVA IKONA
  ClipboardList,
  ChevronDown,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import useProducts from '../../hooks/useProducts';
import {
  deleteProduct,
  saveProduct,
  setProductVisibility,
} from '../../services/products';

// ... (Ostali importi ostaju isti: AdminProductModal, ExcelManager, itd.)
import AdminProductModal from './components/AdminProductModal.jsx';
import WorkforcePanel from './components/WorkforcePanel.jsx';
import ConfirmModal from '../../components/modals/ConfirmModal.jsx';
import ExcelManager from './components/ExcelManager';
import {
  brandService,
  departmentService,
  categoryService,
  specKeyService,
  uploadRemoteImage,
} from '../../services/admin';
import { money } from '../../utils/currency';
import SEOHead from '../../components/seo/SEOHead.jsx';
import PolicyPublicationPanel from './components/PolicyPublicationPanel.jsx';
import PromotionManager from './components/PromotionManager.jsx';

// ... (sanitizeItem i generateSlug funkcije ostaju iste)

const sanitizeItem = (item) => {
  const clean = { ...item };
  Object.keys(clean).forEach((key) => {
    if (clean[key] === undefined) delete clean[key];
  });
  if (!clean.id || clean.id === '') delete clean.id;
  return clean;
};

const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/đ/g, 'dj')
    .replace(/ž/g, 'z')
    .replace(/č/g, 'c')
    .replace(/ć/g, 'c')
    .replace(/š/g, 's')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

const AUDIT_OPERATION_LABELS = {
  create: 'Dodat artikal',
  update: 'Izmenjen artikal',
  soft_delete: 'Obrisan artikal',
  publish: 'Objavljen artikal',
  unpublish: 'Sakriven artikal',
  price_change: 'Izmenjena cena',
  adjust: 'Izmenjeno stanje',
};

const AUDIT_FIELD_LABELS = {
  name: 'Naziv',
  slug: 'URL naziv',
  description: 'Opis',
  itemCondition: 'Stanje artikla',
  departmentId: 'Odeljenje',
  brandId: 'Brend',
  primaryCategoryId: 'Kategorija',
  sku: 'Šifra artikla',
  barcode: 'Barkod',
  mpn: 'Model / MPN',
  gender: 'Pol',
  currentPriceAmount: 'Cena',
  currency: 'Valuta',
  active: 'Aktivan',
  published: 'Vidljiv u prodavnici',
  attributes: 'Specifikacije',
  imageUrl: 'Glavna slika',
  imageUrls: 'Slike',
  features: 'Istaknute karakteristike',
  seo: 'SEO podaci',
  marketingFlags: 'Marketinške oznake',
  model3DUrl: '3D model',
  quantity: 'Količina na stanju',
  quantityDelta: 'Razlika',
  locationId: 'Lokacija',
  zoneId: 'Zona',
  binId: 'Polica',
  sourceType: 'Razlog izmene',
};

const splitOfferedAnswers = (value) =>
  [...new Set(String(value || '').split(',').map((item) => item.trim()).filter(Boolean))];

const OfferedAnswersDropdown = ({
  value,
  draft,
  open,
  onValueChange,
  onDraftChange,
  onOpenChange,
  compact = false,
}) => {
  const answers = splitOfferedAnswers(value);
  const addAnswer = () => {
    const nextAnswer = draft.trim();
    if (!nextAnswer) return;
    onValueChange([...new Set([...answers, nextAnswer])].join(', '));
    onDraftChange('');
    onOpenChange(true);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          className={`w-full bg-white/5 border border-primary-dark rounded-xl px-3 py-2 pr-10 text-sm focus:border-primary outline-none transition-colors ${compact ? 'rounded-lg py-1' : ''}`}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onFocus={() => onOpenChange(true)}
          onBlur={() => window.setTimeout(() => onOpenChange(false), 120)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addAnswer();
            }
          }}
          placeholder="Upišite odgovor"
          aria-label="Ponuđeni odgovori"
          aria-expanded={open}
          maxLength={160}
        />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={addAnswer}
          disabled={!draft.trim()}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-35 transition-colors"
          aria-label="Dodaj ponuđeni odgovor"
        >
          <Plus size={compact ? 15 : 17} />
        </button>
      </div>
      {open && (
        <div
          className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-primary-dark bg-[#17201d] shadow-xl"
          onMouseDown={(event) => event.preventDefault()}
        >
          {answers.length ? (
            <ul className="max-h-44 overflow-y-auto py-1.5 custom-scrollbar">
              {answers.map((answer) => (
                <li key={answer} className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-white hover:bg-white/5">
                  <span className="min-w-0 truncate">{answer}</span>
                  <button
                    type="button"
                    onClick={() => onValueChange(answers.filter((item) => item !== answer).join(', '))}
                    className="shrink-0 rounded-md p-1 text-neutral-400 hover:bg-red-400/10 hover:text-red-300 transition-colors"
                    aria-label={`Ukloni odgovor ${answer}`}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-xs text-neutral-400">Upišite odgovor i pritisnite + da ga dodate u listu.</p>
          )}
        </div>
      )}
    </div>
  );
};

const INVENTORY_SOURCE_LABELS = {
  admin_product_save: 'Admin: čuvanje artikla',
  admin_product_quantity_change: 'Admin: ručna izmena količine',
  inventory_item_create: 'Dodavanje komada na stanje',
  inventory_item_move: 'Premeštanje komada',
  rfiddaja_sync: 'RFID aplikacija',
  rfiddaja_tag_placement: 'Postavljanje RFID taga',
};

const AUDIT_IGNORED_FIELDS = new Set([
  'id',
  'organizationId',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'version',
]);

const auditValuesMatch = (before, after) =>
  JSON.stringify(before ?? null) === JSON.stringify(after ?? null);

const formatAuditValue = (value, field, payload) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Da' : 'Ne';
  if (field === 'sourceType') {
    return INVENTORY_SOURCE_LABELS[value] || String(value);
  }
  if (field === 'currentPriceAmount' && Number.isFinite(Number(value))) {
    return `${(Number(value) / 100).toLocaleString('sr-RS', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${payload?.currency || 'RSD'}`;
  }
  if (typeof value === 'object') {
    const text = Array.isArray(value)
      ? value.join(', ')
      : JSON.stringify(value);
    return text.length > 180 ? `${text.slice(0, 177)}…` : text;
  }
  return String(value);
};

const getAuditChanges = (event) => {
  const before = event.beforePayload;
  const after = event.afterPayload;
  const hasBefore = before && typeof before === 'object';
  const hasAfter = after && typeof after === 'object';
  if (!hasBefore && !hasAfter) return [];

  const fields =
    hasBefore && hasAfter
      ? [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
          (field) => !auditValuesMatch(before[field], after[field]),
        )
      : Object.keys(hasAfter ? after : before);

  return fields
    .filter((field) => !AUDIT_IGNORED_FIELDS.has(field))
    .map((field) => ({
      field,
      label: AUDIT_FIELD_LABELS[field] || field,
      before: formatAuditValue(hasBefore ? before[field] : null, field, before),
      after: formatAuditValue(hasAfter ? after[field] : null, field, after),
    }));
};

const formatAuditDate = (value) =>
  value
    ? new Intl.DateTimeFormat('sr-RS', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(new Date(value))
    : '—';

const AUDIT_CREATION_GROUP_WINDOW_MS = 10_000;

const auditTimestamp = (event) => new Date(event.occurredAt).getTime();

const auditProductId = (event) =>
  event.productId ||
  (event.aggregateType === 'product' ? event.aggregateId : null);

const collapseInitialCatalogEvents = (events) => {
  const grouped = new Set();
  const replacementByEventId = new Map();

  events
    .filter(
      (event) =>
        event.aggregateType === 'product' && event.operation === 'create',
    )
    .forEach((productCreated) => {
      const productId = auditProductId(productCreated);
      const startedAt = auditTimestamp(productCreated);
      if (!productId || Number.isNaN(startedAt)) return;

      const relatedEvents = events
        .filter((candidate) => {
          const candidateTime = auditTimestamp(candidate);
          return (
            auditProductId(candidate) === productId &&
            candidate.actorUserId === productCreated.actorUserId &&
            candidateTime >= startedAt &&
            candidateTime - startedAt <= AUDIT_CREATION_GROUP_WINDOW_MS
          );
        })
        .sort((a, b) => auditTimestamp(a) - auditTimestamp(b));

      if (relatedEvents.length < 2) return;

      const mostRecent = relatedEvents.at(-1);
      relatedEvents.forEach((event) => grouped.add(event.id));
      replacementByEventId.set(mostRecent.id, {
        ...productCreated,
        id: `creation-${productCreated.id}`,
        occurredAt: mostRecent.occurredAt,
        operation: 'create',
        relatedEvents,
      });
    });

  return events.flatMap((event) => {
    const replacement = replacementByEventId.get(event.id);
    if (replacement) return [replacement];
    return grouped.has(event.id) ? [] : [event];
  });
};

const AUDIT_DETAIL_TABS = [
  {
    id: 'basic',
    label: 'Osnovno',
    fields: [
      'name',
      'slug',
      'description',
      'itemCondition',
      'departmentId',
      'brandId',
      'primaryCategoryId',
      'active',
      'published',
    ],
  },
  {
    id: 'variant',
    label: 'Cena i varijanta',
    fields: [
      'sku',
      'barcode',
      'mpn',
      'gender',
      'currentPriceAmount',
      'currency',
    ],
  },
  {
    id: 'specifications',
    label: 'Specifikacije',
    fields: ['attributes', 'features'],
  },
  {
    id: 'seo',
    label: 'SEO i marketing',
    fields: ['seo', 'marketingFlags', 'model3DUrl'],
  },
  {
    id: 'inventory',
    label: 'Stanje',
    fields: [
      'quantity',
      'quantityDelta',
      'locationId',
      'zoneId',
      'binId',
      'sourceType',
    ],
  },
];

const getAuditDetailTabs = (event) => {
  const allChanges = (event.relatedEvents || [event]).flatMap((sourceEvent) =>
    getAuditChanges(sourceEvent).map((change) => ({
      ...change,
      source: sourceEvent.aggregateType,
    })),
  );
  const fieldCounts = allChanges.reduce((counts, change) => {
    counts[change.field] = (counts[change.field] || 0) + 1;
    return counts;
  }, {});

  return AUDIT_DETAIL_TABS.map((tab) => ({
    ...tab,
    changes: allChanges
      .filter((change) => tab.fields.includes(change.field))
      .map((change) => ({
        ...change,
        label:
          fieldCounts[change.field] > 1 && change.source === 'variant'
            ? `Varijanta: ${change.label}`
            : change.label,
      })),
  })).filter((tab) => tab.changes.length > 0);
};

function AdminDashboardContent() {
  const { user, staffReady } = useAuth();
  const nav = useNavigate();
  // The public realtime signal carries the changed product ID. The admin hook
  // then loads only that product through its authenticated catalog API.
  const { items: products, refresh: refreshProducts } = useProducts({
    admin: true,
    publicRealtime: true,
  });

  // ... (State varijable ostaju iste: activeTab, searchTerm, filters...)
  const [activeTab, setActiveTab] = useState('products');
  const [staffAccess, setStaffAccess] = useState(null);
  const [staffAccessLoaded, setStaffAccessLoaded] = useState(false);
  const isCatalogContributor = Boolean(
    !staffAccess?.isOwner && staffAccess?.roles?.includes('Unosilac kataloga'),
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilters, setSearchFilters] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [expandedAuditId, setExpandedAuditId] = useState(null);
  const [activeAuditDetailTab, setActiveAuditDetailTab] = useState('basic');
  const [myWorkforceStats, setMyWorkforceStats] = useState(null);
  const [myWorkforceLoading, setMyWorkforceLoading] = useState(false);
  const [myWorkforceError, setMyWorkforceError] = useState('');
  const [accessUsers, setAccessUsers] = useState([]);
  const [accessRoles, setAccessRoles] = useState([]);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState('');
  const displayedAuditEvents = useMemo(
    () => collapseInitialCatalogEvents(auditEvents),
    [auditEvents],
  );

  useEffect(() => {
    let cancelled = false;
    accessControlApi.me()
      .then((access) => { if (!cancelled) setStaffAccess(access); })
      .catch(() => { if (!cancelled) setStaffAccess(null); })
      .finally(() => { if (!cancelled) setStaffAccessLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isCatalogContributor && !['products', 'brands', 'categories', 'specs', 'my-workforce'].includes(activeTab)) {
      setActiveTab('products');
    }
  }, [activeTab, isCatalogContributor]);

  // ... (Ostali state-ovi za brendove, kategorije...)
  const [brands, setBrands] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [brandFilters, setBrandFilters] = useState([]);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandDept, setNewBrandDept] = useState('');
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [editingBrandName, setEditingBrandName] = useState('');

  const [categories, setCategories] = useState([]);
  const [catFilters, setCatFilters] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDept, setNewCatDept] = useState('');
  const [newCatBrand, setNewCatBrand] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatBrandId, setEditingCatBrandId] = useState('');
  const [catBrandFilter, setCatBrandFilter] = useState('');

  const [specs, setSpecs] = useState([]);
  const [specFilters, setSpecFilters] = useState([]);
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecUnit, setNewSpecUnit] = useState('');
  const [newSpecOptions, setNewSpecOptions] = useState('');
  const [newSpecOptionDraft, setNewSpecOptionDraft] = useState('');
  const [newSpecOptionsOpen, setNewSpecOptionsOpen] = useState(false);
  const [newSpecDept, setNewSpecDept] = useState('');
  const [editingSpecId, setEditingSpecId] = useState(null);
  const [editingSpecName, setEditingSpecName] = useState('');
  const [editingSpecUnit, setEditingSpecUnit] = useState('');
  const [editingSpecOptions, setEditingSpecOptions] = useState('');
  const [editingSpecOptionDraft, setEditingSpecOptionDraft] = useState('');
  const [editingSpecOptionsOpen, setEditingSpecOptionsOpen] = useState(false);

  const filterOptions = [
    { id: 'name', label: 'Naziv' },
    { id: 'department', label: 'Odeljenje' },
    { id: 'brand', label: 'Brend' },
    { id: 'category', label: 'Kategorija' },
    { id: 'price', label: 'Cena' },
  ];

  // Use the same department source as brands and categories. The fallback
  // keeps the controls usable during the initial API request.
  const departmentOptions = useMemo(() => {
    if (departments.length) {
      return departments
        .filter((department) => department.slug)
        .map((department) => ({ id: department.slug, label: department.name }));
    }
    return [
      { id: 'satovi', label: 'Satovi' },
      { id: 'daljinski', label: 'Daljinski' },
      { id: 'baterije', label: 'Baterije' },
      { id: 'naocare', label: 'Naočare' },
    ];
  }, [departments]);

  // Fetch Data useEffects (Ostaju isti...)
  useEffect(() => {
    const unsub0 = departmentService.subscribe(setDepartments, console.error);
    const unsub1 = brandService.subscribe(setBrands, console.error);
    const unsub2 = categoryService.subscribe(setCategories, console.error);
    const unsub3 = specKeyService.subscribe(setSpecs, console.error);
    return () => {
      unsub0();
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const departmentIdFor = useCallback(
    (slug) => departments.find((department) => department.slug === slug)?.id,
    [departments],
  );
  const departmentNameFor = (departmentId, fallbackSlug = '') =>
    departments.find(
      (department) => String(department.id) === String(departmentId),
    )?.name ||
    departmentOptions.find((department) => department.id === fallbackSlug)
      ?.label ||
    fallbackSlug ||
    'Nepoznato';
  const belongsToDepartment = useCallback(
    (item, slug) => {
      const departmentId = departmentIdFor(slug);
      return departmentId
        ? String(item.departmentId) === String(departmentId)
        : item.department === slug;
    },
    [departmentIdFor],
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (staffReady === false && user === null) nav('/');
  }, [staffReady, user, nav]);

  useEffect(() => {
    if (activeTab !== 'audit') return undefined;

    let cancelled = false;
    setAuditLoading(true);
    setAuditError('');
    catalogAuditApi
      .list({ limit: 100 })
      .then((events) => {
        if (!cancelled) setAuditEvents(Array.isArray(events) ? events : []);
      })
      .catch((error) => {
        if (!cancelled) {
          setAuditError(error?.message || 'Dnevnik aktivnosti nije dostupan.');
        }
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'access') return undefined;
    let cancelled = false;
    setAccessLoading(true); setAccessError('');
    Promise.all([accessControlApi.users(), accessControlApi.roles()])
      .then(([users, roles]) => { if (!cancelled) { setAccessUsers(Array.isArray(users) ? users : []); setAccessRoles(Array.isArray(roles) ? roles : []); } })
      .catch((error) => { if (!cancelled) setAccessError(error?.message || 'Korisnici i dozvole nisu dostupni.'); })
      .finally(() => { if (!cancelled) setAccessLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab]);

  const contributorRole = accessRoles.find((role) => role.code === 'catalog_contributor');
  const createEmployee = async (event) => {
    event.preventDefault();
    if (!contributorRole) return;
    try {
      await accessControlApi.createUser({ email: newEmployeeEmail.trim(), displayName: newEmployeeName.trim(), roleId: contributorRole.id });
      setNewEmployeeEmail(''); setNewEmployeeName('');
      setAccessUsers(await accessControlApi.users());
    } catch (error) { setAccessError(error?.message || 'Zaposleni nije dodat.'); }
  };

  const removeEmployeeAccess = async (employee) => {
    if (!window.confirm(`Ukloniti pristup za ${employee.displayName || employee.email}?`)) return;
    try {
      await accessControlApi.updateAssignments(employee.id, []);
      setAccessUsers(await accessControlApi.users());
    } catch (error) { setAccessError(error?.message || 'Dozvole nisu promenjene.'); }
  };


  useEffect(() => {
    if (activeTab !== 'my-workforce' || !isCatalogContributor) return undefined;
    let cancelled = false;
    setMyWorkforceLoading(true);
    setMyWorkforceError('');
    workforceApi.me()
      .then((stats) => { if (!cancelled) setMyWorkforceStats(stats); })
      .catch((error) => { if (!cancelled) setMyWorkforceError(error?.message || 'Statistika trenutno nije dostupna.'); })
      .finally(() => { if (!cancelled) setMyWorkforceLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, isCatalogContributor]);


  // --- NOVA FUNKCIJA: Toggle Visibility ---
  const toggleVisibility = async (product) => {
    try {
      // Ako polje ne postoji, smatramo da je true (vidljiv), pa ga postavljamo na false.
      // Ako postoji, samo ga invertiramo.
      const currentStatus = product.isVisible !== false;

      await setProductVisibility(product.id, !currentStatus);
    } catch (error) {
      console.error('Greška pri menjanju vidljivosti:', error);
      alert('Došlo je do greške.');
    }
  };

  // --- Helper funkcije za UI akcije ---
  const toggleSearchFilter = (id) => {
    setSearchFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  // (Ostale funkcije za brendove/kategorije/specifikacije ostaju iste... handleAddBrand, handleUpdateBrand, itd.)
  // Zbog dužine koda, ne kopiram ih sve ovde, ali one ostaju nepromenjene.
  const handleAddBrand = async (e) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    const departmentSlug =
      brandFilters.length === 1 ? brandFilters[0] : newBrandDept;
    const departmentId = departmentIdFor(departmentSlug);
    if (!departmentId) return alert('Izaberi odeljenje za novi brend.');
    try {
      await brandService.add(newBrandName, {
        departmentId,
      });
      setNewBrandName('');
    } catch (err) {
      alert('Greška.');
    }
  };
  const handleUpdateBrand = async () => {
    if (!editingBrandName.trim()) return;
    try {
      await brandService.update(editingBrandId, editingBrandName);
      setEditingBrandId(null);
    } catch (err) {
      alert('Greška.');
    }
  };
  const handleDeleteBrand = async (id) => {
    if (window.confirm('Obriši?')) await brandService.remove(id);
  };

  const toggleCatFilter = (deptId) => {
    setCatFilters((prev) =>
      prev.includes(deptId)
        ? prev.filter((d) => d !== deptId)
        : [...prev, deptId],
    );
    setNewCatDept((current) => (current === deptId ? '' : deptId));
    setCatBrandFilter('');
    setNewCatBrand('');
  };
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const brandToUse = catBrandFilter || newCatBrand;
    const brandObj = brands.find((b) => b.name === brandToUse);
    const selectedDepartmentSlug =
      catFilters.length === 1 ? catFilters[0] : newCatDept;
    const selectedDepartmentId = departmentIdFor(selectedDepartmentSlug);
    const dept = selectedDepartmentId || brandObj?.departmentId;
    if (!dept) return alert('Izaberi odeljenje.');
    if (brandObj?.departmentId && brandObj.departmentId !== dept) {
      return alert('Izabrani brend ne pripada izabranom odeljenju.');
    }
    try {
      await categoryService.add(newCatName, {
        departmentId: dept,
        brandId: brandObj?.id || null,
      });
      setNewCatName('');
    } catch (err) {
      alert('Greška.');
    }
  };
  const handleUpdateCategory = async () => {
    if (!editingCatName.trim()) return;
    try {
      await categoryService.update(editingCatId, editingCatName, {
        brandId: editingCatBrandId || null,
      });
      setEditingCatId(null);
      setEditingCatBrandId('');
    } catch (err) {
      alert('Greška.');
    }
  };
  const handleDeleteCategory = async (id) => {
    if (window.confirm('Obriši?')) await categoryService.remove(id);
  };

  const toggleSpecFilter = (deptId) => {
    setSpecFilters((prev) =>
      prev.includes(deptId)
        ? prev.filter((d) => d !== deptId)
        : [...prev, deptId],
    );
    setNewSpecDept((current) => (current === deptId ? '' : deptId));
  };
  const handleAddSpec = async (e) => {
    e.preventDefault();
    if (!newSpecName.trim()) return;
    const departmentSlug =
      specFilters.length === 1 ? specFilters[0] : newSpecDept;
    const departmentId = departmentIdFor(departmentSlug);
    if (!departmentId) return alert('Izaberi odeljenje za karakteristiku.');
    try {
      await specKeyService.add(newSpecName, {
        departmentId,
        unit: newSpecUnit.trim(),
        optionValues: newSpecOptions.split(',').map((value) => value.trim()).filter(Boolean),
      });
      setNewSpecName('');
      setNewSpecUnit('');
      setNewSpecOptions('');
      setNewSpecOptionDraft('');
      setNewSpecOptionsOpen(false);
    } catch (err) {
      alert('Greška.');
    }
  };
  const handleUpdateSpec = async () => {
    if (!editingSpecName.trim()) return;
    try {
      await specKeyService.update(editingSpecId, editingSpecName, {
        unit: editingSpecUnit.trim(),
        optionValues: editingSpecOptions.split(',').map((value) => value.trim()).filter(Boolean),
      });
      setEditingSpecId(null);
      setEditingSpecUnit('');
      setEditingSpecOptions('');
      setEditingSpecOptionDraft('');
      setEditingSpecOptionsOpen(false);
    } catch (err) {
      alert('Greška.');
    }
  };
  const handleDeleteSpec = async (id) => {
    if (window.confirm('Obriši?')) await specKeyService.remove(id);
  };

  const toggleBrandFilter = (deptId) => {
    setBrandFilters((prev) =>
      prev.includes(deptId)
        ? prev.filter((d) => d !== deptId)
        : [...prev, deptId],
    );
    setNewBrandDept((current) => (current === deptId ? '' : deptId));
  };

  const openNew = () => {
    setEditProduct(null);
    setModalOpen(true);
  };
  const openEdit = (p) => {
    setEditProduct(p);
    setModalOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (deleteId) {
      await deleteProduct(deleteId);
      setDeleteId(null);
    }
  };

  // --- Import logika (handleBulkImport) ostaje ista... ---
  const handleBulkImport = async ({ file }) => {
    const base64Xlsx = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const draft = await importsApi.createXlsx({
      sourceName: file.name,
      base64Xlsx,
      dryRun: true,
    });
    const jobId = draft?.id || draft?.jobId;
    if (!jobId) throw new Error('API nije vratio ID posla za uvoz.');
    const report = await importsApi.reconciliation(jobId);
    if (
      !window.confirm(
        `Provera je gotova. Nastaviti sa uvozom?\n${JSON.stringify(report).slice(0, 400)}`,
      )
    )
      return;
    await importsApi.execute(jobId);
    refreshProducts();
  };

  // --- Filtriranje Proizvoda ---
  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    if (searchFilters.length > 0) {
      return searchFilters.some((field) => {
        let val = p[field];
        if (field === 'department') val = val || 'satovi';
        return String(val || '')
          .toLowerCase()
          .includes(term);
      });
    }
    return (
      p.name.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term)
    );
  }).sort((left, right) => {
    // A contributor's corrections are the most urgent work. Keep every
    // returned article at the top even when the rest of the catalog is sorted
    // or refreshed in a different order.
    if (!isCatalogContributor) return 0;
    const rank = (product) => product.qualityReviewStatus === 'changes_requested' ? 0 : 1;
    const rankDifference = rank(left) - rank(right);
    if (rankDifference) return rankDifference;
    return new Date(right.qualityReviewedAt || right.updatedAt || 0).getTime()
      - new Date(left.qualityReviewedAt || left.updatedAt || 0).getTime();
  });
  const returnedForRevisionCount = isCatalogContributor
    ? products.filter((product) => product.qualityReviewStatus === 'changes_requested').length
    : 0;
  const personalDailyStats = Array.isArray(myWorkforceStats?.daily) ? myWorkforceStats.daily : [];
  const personalHourlyStats = Array.isArray(myWorkforceStats?.hourly) ? myWorkforceStats.hourly : [];
  const personalDailyMax = Math.max(1, ...personalDailyStats.map((item) => Number(item.count || 0)));

  // Memoizacija (visibleBrands, visibleCategories...) ostaje ista
  const visibleBrands = useMemo(() => {
    if (brandFilters.length === 0) return brands;
    return brands.filter((b) =>
      brandFilters.some((slug) => b.departmentId === departmentIdFor(slug)),
    );
  }, [brands, brandFilters, departmentIdFor]);
  const availableBrandsForFilter = useMemo(() => {
    if (catFilters.length === 0) return brands;
    return brands.filter((brand) =>
      catFilters.some((slug) => belongsToDepartment(brand, slug)),
    );
  }, [brands, catFilters, belongsToDepartment]);
  const visibleCategories = useMemo(() => {
    return categories.filter((c) => {
      const deptMatch =
        catFilters.length === 0 ||
        catFilters.some((slug) => c.departmentId === departmentIdFor(slug));
      const selectedBrandId = brands.find(
        (brand) => brand.name === catBrandFilter,
      )?.id;
      const brandMatch = !catBrandFilter || c.brandId === selectedBrandId;
      return deptMatch && brandMatch;
    });
  }, [categories, catFilters, catBrandFilter, brands, departmentIdFor]);
  const availableBrandsForCat = useMemo(() => {
    if (catFilters.length === 1)
      return brands.filter(
        (b) => b.departmentId === departmentIdFor(catFilters[0]),
      );
    if (newCatDept)
      return brands.filter(
        (b) => b.departmentId === departmentIdFor(newCatDept),
      );
    return brands;
  }, [brands, catFilters, newCatDept, departmentIdFor]);
  const visibleSpecs = useMemo(() => {
    if (specFilters.length === 0) return specs;
    return specs.filter((spec) =>
      specFilters.some((slug) => belongsToDepartment(spec, slug)),
    );
  }, [specs, specFilters, belongsToDepartment]);

  if (!user) return null;

  return (
    <div className="min-h-screen pb-20 bg-[#f5f5f7] rounded-b-2xl">
      <SEOHead title="Admin" noIndex={true} />
      {/* HEADER OSTAJE ISTI */}
      <div className="bg-white border-b border-neutral-200 sticky top-[var(--header-bar-h)] z-30 shadow-sm">
        <div className="container py-6">
          <h1 className="text-3xl font-bold text-neutral-900 mb-6">
            Admin Panel
          </h1>
          <div className="flex gap-2 overflow-x-auto px-2 py-4 custom-scrollbar">
            <TabButton
              active={activeTab === 'products'}
              onClick={() => setActiveTab('products')}
              icon={Package}
              label="Proizvodi"
            />
            <TabButton
              active={activeTab === 'brands'}
              onClick={() => setActiveTab('brands')}
              icon={Tag}
              label="Brendovi"
            />
            <TabButton
              active={activeTab === 'categories'}
              onClick={() => setActiveTab('categories')}
              icon={Layers}
              label="Kategorije"
            />
            <TabButton
              active={activeTab === 'specs'}
              onClick={() => setActiveTab('specs')}
              icon={List}
              label="Specifikacije"
            />
            {staffAccessLoaded && isCatalogContributor && (
              <TabButton
                active={activeTab === 'my-workforce'}
                onClick={() => setActiveTab('my-workforce')}
                icon={ClipboardList}
                label="Moj učinak"
              />
            )}
            {staffAccessLoaded && !isCatalogContributor && (
              <>
                <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={ClipboardList} label="Dnevnik" />
                <TabButton active={activeTab === 'workforce'} onClick={() => setActiveTab('workforce')} icon={ClipboardList} label="Učinak zaposlenih" />
                <TabButton active={activeTab === 'access'} onClick={() => setActiveTab('access')} icon={ShieldCheck} label="Korisnici i dozvole" />
                <TabButton active={activeTab === 'privacy'} onClick={() => setActiveTab('privacy')} icon={ShieldCheck} label="Privatnost" />
                <TabButton active={activeTab === 'promotions'} onClick={() => setActiveTab('promotions')} icon={Ticket} label="Promo kodovi" />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container mt-8">
        {activeTab === 'promotions' && (
          <PromotionManager
            products={products}
            brands={brands}
            categories={categories}
            departments={departments}
            specs={specs}
          />
        )}
        {activeTab === 'products' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <ExcelManager
              products={products}
              brands={brands}
              categories={categories}
              onImport={handleBulkImport}
            />

            {isCatalogContributor && returnedForRevisionCount > 0 && (
              <div className="rounded-2xl border border-amber-300 bg-amber-100 px-5 py-4 text-amber-950 shadow-sm">
                <p className="font-bold">Imate {returnedForRevisionCount} {returnedForRevisionCount === 1 ? 'artikal vraćen' : 'artikla vraćena'} na doradu.</p>
                <p className="mt-1 text-sm">Otvorite žuti red ispod, uradite navedene ispravke i sačuvajte artikal. Zatim ponovo ide na proveru.</p>
              </div>
            )}

            {/* SEARCH BAR I DUGME DODAJ (Ostaje isto) */}
            <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
              <div className="flex flex-1 max-w-2xl gap-2">
                {/* ... Input i Filter dugme ... */}
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    size={18}
                  />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pretraži..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-neutral-200 transition-all text-neutral-900"
                  />
                </div>
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`h-full px-4 rounded-xl border flex items-center gap-2 font-medium transition-all ${
                      searchFilters.length > 0
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-md'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {' '}
                    <Filter size={18} />{' '}
                    <span className="hidden sm:inline">Filteri</span>{' '}
                  </button>
                  <AnimatePresence>
                    {isFilterOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-56 bg-white border border-neutral-100 rounded-xl shadow-xl z-50 overflow-hidden p-1"
                      >
                        {filterOptions.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => toggleSearchFilter(opt.id)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors text-left mb-0.5 ${
                              searchFilters.includes(opt.id)
                                ? 'bg-neutral-50 text-neutral-900 font-semibold'
                                : 'text-neutral-600 hover:bg-neutral-50'
                            }`}
                          >
                            {' '}
                            <span>{opt.label}</span>{' '}
                            {searchFilters.includes(opt.id) && (
                              <Check size={16} className="text-emerald-500" />
                            )}{' '}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openNew}
                  className="bg-neutral-900 text-white rounded-xl px-5 py-2.5 flex items-center gap-2 hover:bg-black font-bold"
                >
                  <Plus size={20} /> Dodaj Proizvod
                </button>
              </div>
            </div>

            {/* TABELA PROIZVODA */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs font-bold tracking-wider border-b border-neutral-200">
                    <tr>
                      <th className="p-4">Slika</th>
                      <th className="p-4">Naziv</th>
                      <th className="p-4">Odeljenje</th>
                      <th className="p-4">Brend</th>
                      <th className="p-4">Cena</th>
                      <th className="p-4">Kategorija</th>
                      <th className="p-4 text-right">Akcije</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredProducts.map((p) => {
                      // Provera da li je sakriven
                      const isHidden = p.isVisible === false;
                      const needsRevision = isCatalogContributor && p.qualityReviewStatus === 'changes_requested';
                      const revisionNote = String(p.qualityReviewNote || '').trim();
                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors ${
                            needsRevision
                              ? 'bg-amber-100 hover:bg-amber-200'
                              : isHidden
                              ? 'bg-neutral-100/50 opacity-60'
                              : 'hover:bg-neutral-50'
                          }`}
                        >
                          <td className="p-4">
                            <div className="w-12 h-12 rounded-lg border border-neutral-200 bg-neutral-100 overflow-hidden relative">
                              <img
                                src={p.image || '/placeholder.png'}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                              {isHidden && (
                                <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                  <EyeOff
                                    size={16}
                                    className="text-neutral-600"
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-neutral-900">
                            <div className="flex flex-col">
                              <span>
                                {p.name}{' '}
                                {needsRevision && (
                                  <span className="text-[10px] text-amber-800 uppercase ml-2 font-extrabold">
                                    (Doraditi)
                                  </span>
                                )}
                                {isHidden && (
                                  <span className="text-[10px] text-red-500 uppercase ml-2">
                                    (Sakriven)
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                /{p.slug}
                              </span>
                            </div>
                          </td>
                          {needsRevision ? (
                            <td colSpan={2} className="p-4 min-w-[28rem] text-sm text-amber-950">
                              <div className="leading-relaxed">
                                <p className="font-extrabold uppercase text-xs tracking-wide">Zadatak za doradu</p>
                                <p className="mt-1 font-medium">{revisionNote || 'Vlasnik je zatražio doradu ovog artikla. Proverite podatke, ispravite ih i sačuvajte proizvod.'}</p>
                                <p className="mt-2 text-xs text-amber-800">Kliknite na ikonu olovke, uradite tražene izmene i sačuvajte artikal.</p>
                              </div>
                            </td>
                          ) : (
                            <>
                              <td className="p-4">
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 uppercase tracking-wider">
                                  {p.department || 'satovi'}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                                  {p.brand}
                                </span>
                              </td>
                            </>
                          )}
                          <td className="p-4 font-mono font-bold text-neutral-900">
                            {money(p.price)}
                          </td>
                          {needsRevision ? (
                            <td className="p-4 text-xs font-bold uppercase tracking-wide text-amber-800">Doraditi</td>
                          ) : (
                            <td className="p-4 text-neutral-500">{p.category}</td>
                          )}

                          {/* --- AKCIJE --- */}
                          <td className="p-4 text-right">
                            <div className="inline-flex gap-2">
                              {/* DUGME ZA VISIBILITY */}
                              <button
                                onClick={() => toggleVisibility(p)}
                                className={`p-2 rounded-lg transition-colors ${
                                  isHidden
                                    ? 'text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600'
                                    : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600'
                                }`}
                                title={
                                  isHidden
                                    ? 'Prikaži proizvod'
                                    : 'Sakrij proizvod'
                                }
                              >
                                {isHidden ? (
                                  <EyeOff size={18} />
                                ) : (
                                  <Eye size={18} />
                                )}
                              </button>

                              <button
                                onClick={() => openEdit(p)}
                                className="p-2 text-neutral-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg"
                                title="Izmeni"
                              >
                                <Edit3 size={18} />
                              </button>
                              {!isCatalogContributor && (
                                <button
                                  onClick={() => setDeleteId(p.id)}
                                  className="p-2 text-neutral-400 hover:bg-red-50 hover:text-red-500 rounded-full"
                                  title="Obriši"
                                >
                                  <X size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'my-workforce' && isCatalogContributor && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-white p-6 shadow-sm">
              <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-700 uppercase">Moj učinak</p>
              <h2 className="mt-1 text-2xl font-black text-neutral-900">Pregled unosa i provera artikala</h2>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">Ovde vidiš svoj učinak, stanje provere i koliko puta su artikli vraćeni na doradu.</p>
            </div>

            {myWorkforceLoading ? (
              <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-neutral-500">Učitavanje statistike…</div>
            ) : myWorkforceError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{myWorkforceError}</div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ['Danas', myWorkforceStats?.createdToday || 0, 'novih artikala'],
                    ['Juče', myWorkforceStats?.createdYesterday || 0, 'novih artikala'],
                    ['Ove nedelje', myWorkforceStats?.createdThisWeek || 0, 'novih artikala'],
                    ['Ukupno', myWorkforceStats?.createdTotal || 0, 'svih unosa'],
                  ].map(([label, value, hint]) => (
                    <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                      <p className="text-sm font-semibold text-neutral-500">{label}</p>
                      <p className="mt-2 text-3xl font-black text-neutral-900">{value}</p>
                      <p className="mt-1 text-xs text-neutral-500">{hint}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <p className="text-sm font-bold text-emerald-800">Odobreno za obračun</p>
                    <p className="mt-2 text-3xl font-black text-emerald-950">{myWorkforceStats?.approvedCount || 0}</p>
                    <p className="mt-1 text-xs text-emerald-800">Ukupno za isplatu: {money(Number(myWorkforceStats?.approvedAmountMinor || 0) / 100)}</p>
                  </div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
                    <p className="text-sm font-bold text-sky-800">Na proveri</p>
                    <p className="mt-2 text-3xl font-black text-sky-950">{myWorkforceStats?.pendingCount || 0}</p>
                    <p className="mt-1 text-xs text-sky-800">Čeka odluku vlasnika</p>
                  </div>
                  <div className="rounded-2xl border border-amber-300 bg-amber-100 p-5">
                    <p className="text-sm font-bold text-amber-900">Trenutno na doradi</p>
                    <p className="mt-2 text-3xl font-black text-amber-950">{myWorkforceStats?.changesRequestedCount || 0}</p>
                    <p className="mt-1 text-xs text-amber-800">Prikaži žute redove u Proizvodima</p>
                  </div>
                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
                    <p className="text-sm font-bold text-orange-800">Vraćeno na doradu</p>
                    <p className="mt-2 text-3xl font-black text-orange-950">{myWorkforceStats?.returnedTotal || 0}</p>
                    <p className="mt-1 text-xs text-orange-800">Danas: {myWorkforceStats?.returnedToday || 0} · Juče: {myWorkforceStats?.returnedYesterday || 0}</p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                  <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <h3 className="font-black text-neutral-900">Poslednjih 7 dana</h3>
                        <p className="mt-1 text-sm text-neutral-500">Broj unetih artikala po danu</p>
                      </div>
                      <span className="text-sm font-bold text-neutral-700">Ovaj mesec: {myWorkforceStats?.createdThisMonth || 0}</span>
                    </div>
                    <div className="mt-6 flex h-44 items-end gap-3">
                      {personalDailyStats.map((item) => {
                        const count = Number(item.count || 0);
                        return (
                          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                            <span className="text-xs font-bold text-neutral-700">{count}</span>
                            <div className="flex h-28 w-full items-end rounded-t-lg bg-neutral-100">
                              <div className="w-full rounded-t-lg bg-emerald-600 transition-all" style={{ height: `${Math.max(count ? 10 : 0, (count / personalDailyMax) * 100)}%` }} />
                            </div>
                            <span className="text-[11px] text-neutral-500">{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <h3 className="font-black text-neutral-900">Današnji ritam</h3>
                    <p className="mt-1 text-sm text-neutral-500">Unosi po satu</p>
                    <div className="mt-5 space-y-3">
                      {personalHourlyStats.length ? personalHourlyStats.map((item) => (
                        <div key={item.hour} className="flex items-center gap-3 text-sm">
                          <span className="w-9 font-mono text-neutral-500">{item.hour}h</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, Number(item.count || 0) * 20)}%` }} /></div>
                          <span className="w-5 text-right font-bold text-neutral-800">{item.count}</span>
                        </div>
                      )) : <p className="py-8 text-center text-sm text-neutral-500">Danas još nema unosa.</p>}
                    </div>
                    <div className="mt-6 border-t border-neutral-100 pt-4 text-sm text-neutral-600">
                      Obrišeni artikli: <strong className="text-neutral-900">{myWorkforceStats?.deletedCount || 0}</strong>
                      <br />Cena po odobrenom artiklu: <strong className="text-neutral-900">{money(Number(myWorkforceStats?.rateMinor || 0) / 100)}</strong>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.section>
        )}

        {activeTab === 'audit' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden"
          >
            <div className="p-5 border-b border-neutral-100">
              <h2 className="font-bold text-lg text-neutral-900">
                Dnevnik aktivnosti artikala
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                Ko je menjao artikal ili njegovo stanje na lageru.
              </p>
            </div>

            {auditLoading ? (
              <div className="p-8 text-center text-neutral-500">
                Učitavanje dnevnika…
              </div>
            ) : auditError ? (
              <div className="p-8 text-center text-red-600">{auditError}</div>
            ) : auditEvents.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                Još nema zabeleženih aktivnosti za artikle.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs font-bold tracking-wider border-b border-neutral-200">
                    <tr>
                      <th className="p-4">Vreme</th>
                      <th className="p-4">Korisnik</th>
                      <th className="p-4">Akcija</th>
                      <th className="p-4">Artikal</th>
                      <th className="p-4 text-right">Detalji</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {displayedAuditEvents.map((event) => {
                      const isExpanded = expandedAuditId === event.id;
                      const detailTabs = getAuditDetailTabs(event);
                      const selectedDetailTab =
                        detailTabs.find(
                          (tab) => tab.id === activeAuditDetailTab,
                        ) || detailTabs[0];

                      return (
                        <React.Fragment key={event.id}>
                          <tr
                            className="cursor-pointer hover:bg-neutral-50"
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            onClick={() => {
                              setExpandedAuditId(
                                isExpanded ? null : event.id,
                              );
                              if (!isExpanded)
                                setActiveAuditDetailTab('basic');
                            }}
                            onKeyDown={(keyboardEvent) => {
                              if (
                                keyboardEvent.key !== 'Enter' &&
                                keyboardEvent.key !== ' '
                              )
                                return;

                              keyboardEvent.preventDefault();
                              setExpandedAuditId(
                                isExpanded ? null : event.id,
                              );
                              if (!isExpanded)
                                setActiveAuditDetailTab('basic');
                            }}
                          >
                            <td className="p-4 whitespace-nowrap text-neutral-600">
                              {formatAuditDate(event.occurredAt)}
                            </td>
                            <td className="p-4">
                              <div className="font-medium text-neutral-900">
                                {event.actorName}
                              </div>
                              {event.actorEmail && (
                                <div className="text-xs text-neutral-500">
                                  {event.actorEmail}
                                </div>
                              )}
                            </td>
                            <td className="p-4 font-medium text-neutral-800">
                              {AUDIT_OPERATION_LABELS[event.operation] ||
                                event.operation}
                            </td>
                            <td className="p-4 text-neutral-700">
                              {event.productName}
                            </td>
                            <td className="p-4 text-right">
                              <span
                                className="inline-flex text-[0px] text-primary"
                                aria-hidden="true"
                              >
                                <ChevronDown
                                  size={20}
                                  className={`transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                  aria-hidden="true"
                                />
                                {isExpanded ? 'Sakrij' : 'Prikaži'}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-neutral-50/70">
                              <td colSpan="5" className="p-4">
                                {selectedDetailTab ? (
                                  <div>
                                    {event.reason && (
                                      <p className="mb-3 text-sm text-neutral-600">
                                        <span className="font-semibold text-neutral-800">
                                          Razlog:
                                        </span>{' '}
                                        {INVENTORY_SOURCE_LABELS[event.reason] ||
                                          event.reason}
                                      </p>
                                    )}
                                    <div className="mb-4 flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
                                      {detailTabs.map((tab) => (
                                        <button
                                          key={tab.id}
                                          type="button"
                                          onClick={() =>
                                            setActiveAuditDetailTab(tab.id)
                                          }
                                          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                                            selectedDetailTab.id === tab.id
                                              ? 'bg-neutral-900 text-white'
                                              : 'bg-white text-neutral-600 hover:bg-neutral-100'
                                          }`}
                                        >
                                          {tab.label}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
                                      <table className="w-full text-sm">
                                        <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                                          <tr>
                                            <th className="p-3 text-left">
                                              Polje
                                            </th>
                                            <th className="p-3 text-left">
                                              Pre izmene
                                            </th>
                                            <th className="p-3 text-left">
                                              Posle izmene
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100">
                                          {selectedDetailTab.changes.map(
                                            (change) => (
                                              <tr
                                                key={`${change.source}-${change.field}`}
                                              >
                                                <td className="p-3 font-medium text-neutral-800">
                                                  {change.label}
                                                </td>
                                                <td className="p-3 text-neutral-600 break-all">
                                                  {change.before}
                                                </td>
                                                <td className="p-3 text-neutral-900 break-all">
                                                  {change.after}
                                                </td>
                                              </tr>
                                            ),
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-neutral-600">
                                    Za ovu akciju nema poređenja pre i posle
                                    izmene. Dodavanje i brisanje čuvaju samo
                                    dostupno stanje artikla.
                                  </p>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'workforce' && !isCatalogContributor && <WorkforcePanel departments={departments} categories={categories} brands={brands} />}

        {activeTab === 'privacy' && <PolicyPublicationPanel />}

        {activeTab === 'access' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-neutral-900">Korisnici i dozvole</h2>
              <p className="mt-1 text-sm text-neutral-500">Dodaj zaposlenog koji može da radi samo sa svojim artiklima.</p>
              <form onSubmit={createEmployee} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input required type="text" value={newEmployeeName} onChange={(event) => setNewEmployeeName(event.target.value)} placeholder="Ime i prezime" className="rounded-xl border border-neutral-200 px-3 py-2.5 text-sm" />
                <input required type="email" value={newEmployeeEmail} onChange={(event) => setNewEmployeeEmail(event.target.value)} placeholder="E-mail" className="rounded-xl border border-neutral-200 px-3 py-2.5 text-sm" />
                <button disabled={!contributorRole} type="submit" className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Dodaj zaposlenog</button>
              </form>
              {!contributorRole && !accessLoading && <p className="mt-3 text-sm text-amber-700">Rola „Unosilac kataloga” još nije kreirana. Sačekaj da se migracija 046 izvrši na backendu.</p>}
            </div>
            {accessError && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{accessError}</div>}
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-100 p-4 text-sm font-bold">Zaposleni sa pristupom</div>
              {accessLoading ? <p className="p-8 text-center text-neutral-500">Učitavanje korisnika…</p> : <div className="divide-y divide-neutral-100">{accessUsers.map((employee) => { const assignment = employee.assignments?.find((item) => item.roleId === contributorRole?.id); return <div key={employee.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="font-semibold text-neutral-900">{employee.displayName}</div><div className="text-sm text-neutral-500">{employee.email}</div></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${assignment ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{assignment ? 'Unosilac kataloga' : 'Druga rola'}</span>{assignment && <button type="button" onClick={() => void removeEmployeeAccess(employee)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600">Ukloni pristup</button>}</div></div>; })}{!accessUsers.length && !accessLoading && <p className="p-8 text-center text-neutral-500">Nema korisnika.</p>}</div>}
            </div>
          </motion.div>
        )}

        {/* Ostali tabovi za Brendove/Kategorije/Specifikacije (ostaju nepromenjeni) */}
        {activeTab === 'brands' /* ... kod za brendove ... */ && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            {' '}
            <div className="card glass p-6 h-full flex flex-col">
              {' '}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                {' '}
                <div className="flex items-center gap-3">
                  {' '}
                  <div className="p-2 rounded-xl bg-white/10 text-primary">
                    {' '}
                    <Tag size={20} />{' '}
                  </div>{' '}
                  <h2 className="text-xl font-bold">Brendovi</h2>{' '}
                </div>{' '}
                <div className="flex flex-wrap gap-2">
                  {' '}
                  {departmentOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => toggleBrandFilter(opt.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all border border-transparent ${
                        brandFilters.includes(opt.id)
                          ? 'bg-neutral-900 text-white shadow-md'
                          : 'bg-white/50 text-neutral-500 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {' '}
                      {opt.label}{' '}
                    </button>
                  ))}{' '}
                  {brandFilters.length > 0 && (
                    <button
                      onClick={() => {
                        setBrandFilters([]);
                        setNewBrandDept('');
                      }}
                      className="px-2 text-xs font-bold text-red-400 hover:text-red-600"
                    >
                      {' '}
                      Reset{' '}
                    </button>
                  )}{' '}
                </div>{' '}
              </div>{' '}
              <form onSubmit={handleAddBrand} className="flex gap-2 mb-4">
                {' '}
                {brandFilters.length !== 1 && (
                  <select
                    className="bg-white/5 border border-primary-dark rounded-xl px-3 py-2 text-sm focus:border-primary outline-none transition-colors"
                    value={newBrandDept}
                    onChange={(e) => setNewBrandDept(e.target.value)}
                  >
                    {' '}
                    <option value="">- Odeljenje -</option>{' '}
                    {departmentOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {' '}
                        {opt.label}{' '}
                      </option>
                    ))}{' '}
                  </select>
                )}{' '}
                <input
                  className="flex-1 bg-white/5 border border-primary-dark rounded-xl px-4 py-2 text-sm focus:border-primary outline-none transition-colors"
                  placeholder="Novi brend..."
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                />{' '}
                <button
                  type="submit"
                  disabled={!newBrandName.trim()}
                  className="btn btn--primary rounded-xl px-3"
                >
                  {' '}
                  <Plus size={18} />{' '}
                </button>{' '}
              </form>{' '}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar max-h-[500px]">
                {' '}
                <AnimatePresence initial={false}>
                  {' '}
                  {visibleBrands.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-primary group transition-colors"
                    >
                      {' '}
                      {editingBrandId === item.id ? (
                        <div className="flex flex-1 items-center gap-2">
                          {' '}
                          <input
                            className="flex-1 bg-black/20 rounded-lg px-2 py-1 text-sm outline-none border border-primary/50"
                            value={editingBrandName}
                            onChange={(e) =>
                              setEditingBrandName(e.target.value)
                            }
                            autoFocus
                          />{' '}
                          <button
                            onClick={handleUpdateBrand}
                            className="text-emerald-500 p-1 hover:bg-white/10 rounded-lg"
                          >
                            {' '}
                            <Check size={16} />{' '}
                          </button>{' '}
                          <button
                            onClick={() => setEditingBrandId(null)}
                            className="text-red-400 p-1 hover:bg-white/10 rounded-lg"
                          >
                            {' '}
                            <X size={16} />{' '}
                          </button>{' '}
                        </div>
                      ) : (
                        <>
                          {' '}
                          <div className="flex items-center gap-2">
                            {' '}
                            <span className="font-medium text-sm">
                              {' '}
                              {item.name}{' '}
                            </span>{' '}
                            {brandFilters.length !== 1 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-400 border border-white/5 uppercase tracking-wider">
                                {' '}
                                {departments.find(
                                  (department) =>
                                    department.id === item.departmentId,
                                )?.name || 'Nepoznato'}{' '}
                              </span>
                            )}{' '}
                          </div>{' '}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {' '}
                            <button
                              onClick={() => {
                                setEditingBrandId(item.id);
                                setEditingBrandName(item.name);
                              }}
                              className="p-1.5 hover:bg-white/10 rounded-lg text-muted hover:text-primary transition-colors"
                            >
                              {' '}
                              <Edit3 size={14} />{' '}
                            </button>{' '}
                            <button
                              onClick={() => handleDeleteBrand(item.id)}
                              className="p-1.5 hover:bg-white/10 rounded-lg text-muted hover:text-red-400 transition-colors"
                            >
                              {' '}
                              <Trash2 size={14} />{' '}
                            </button>{' '}
                          </div>{' '}
                        </>
                      )}{' '}
                    </motion.div>
                  ))}{' '}
                </AnimatePresence>{' '}
              </div>{' '}
            </div>{' '}
          </motion.div>
        )}
        {activeTab === 'categories' /* ... kod za kategorije ... */ && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            {' '}
            <div className="card glass p-6 h-full flex flex-col">
              {' '}
              <div className="flex flex-col gap-4 mb-6 border-b border-white/10 pb-4">
                {' '}
                <div className="flex items-center justify-between">
                  {' '}
                  <div className="flex items-center gap-3">
                    {' '}
                    <div className="p-2 rounded-xl bg-white/10 text-primary">
                      {' '}
                      <Layers size={20} />{' '}
                    </div>{' '}
                    <h2 className="text-xl font-bold">Kategorije</h2>{' '}
                  </div>{' '}
                  <div className="flex flex-wrap gap-2">
                    {' '}
                    {departmentOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => toggleCatFilter(opt.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all border border-transparent ${
                          catFilters.includes(opt.id)
                            ? 'bg-neutral-900 text-white shadow-md'
                            : 'bg-white/50 text-neutral-500 border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        {' '}
                        {opt.label}{' '}
                      </button>
                    ))}{' '}
                    {(catFilters.length > 0 || catBrandFilter) && (
                      <button
                        onClick={() => {
                          setCatFilters([]);
                          setCatBrandFilter('');
                          setNewCatDept('');
                          setNewCatBrand('');
                        }}
                        className="px-2 text-xs font-bold text-red-400 hover:text-red-600"
                      >
                        {' '}
                        Reset{' '}
                      </button>
                    )}{' '}
                  </div>{' '}
                </div>{' '}
                <div className="flex items-center gap-2">
                  {' '}
                  <Filter size={16} className="text-neutral-400" />{' '}
                  <select
                    className="bg-white/5 border border-primary-dark rounded-xl px-3 py-1.5 text-xs focus:border-primary outline-none transition-colors min-w-[150px] text-neutral-700"
                    value={catBrandFilter}
                    onChange={(e) => setCatBrandFilter(e.target.value)}
                  >
                    {' '}
                    <option value="">Svi Brendovi</option>{' '}
                    {availableBrandsForFilter.map((b) => (
                      <option key={b.id} value={b.name}>
                        {' '}
                        {b.name}{' '}
                      </option>
                    ))}{' '}
                  </select>{' '}
                </div>{' '}
              </div>{' '}
              <form
                onSubmit={handleAddCategory}
                className="flex flex-wrap gap-2 mb-4 items-end"
              >
                {' '}
                {catFilters.length !== 1 && (
                  <div className="flex-1 min-w-[120px]">
                    {' '}
                    <label className="text-[10px] uppercase font-bold text-neutral-400 ml-1">
                      {' '}
                      Odeljenje{' '}
                    </label>{' '}
                    <select
                      className="w-full bg-white/5 border border-primary-dark rounded-xl px-3 py-2 text-sm focus:border-primary outline-none transition-colors"
                      value={newCatDept}
                      onChange={(e) => {
                        setNewCatDept(e.target.value);
                        setNewCatBrand('');
                      }}
                    >
                      {' '}
                      <option value="">- Izaberi -</option>{' '}
                      {departmentOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {' '}
                          {opt.label}{' '}
                        </option>
                      ))}{' '}
                    </select>{' '}
                  </div>
                )}{' '}
                <div className="flex-1 min-w-[120px]">
                  {' '}
                  <label className="text-[10px] uppercase font-bold text-neutral-400 ml-1">
                    {' '}
                    Brend{' '}
                  </label>{' '}
                  <select
                    className="w-full bg-white/5 border border-primary-dark rounded-xl px-3 py-2 text-sm focus:border-primary outline-none transition-colors"
                    value={newCatBrand}
                    onChange={(e) => setNewCatBrand(e.target.value)}
                  >
                    {' '}
                    <option value="">
                      - Bez brenda (opšta kategorija) -
                    </option>{' '}
                    {availableBrandsForCat.map((b) => (
                      <option key={b.id} value={b.name}>
                        {' '}
                        {b.name}{' '}
                      </option>
                    ))}{' '}
                  </select>{' '}
                </div>{' '}
                <div className="flex-[2] min-w-[150px]">
                  {' '}
                  <label className="text-[10px] uppercase font-bold text-neutral-400 ml-1">
                    {' '}
                    Naziv{' '}
                  </label>{' '}
                  <input
                    className="w-full bg-white/5 border border-primary-dark rounded-xl px-4 py-2 text-sm focus:border-primary outline-none transition-colors"
                    placeholder="npr. G-Shock..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />{' '}
                </div>{' '}
                <button
                  type="submit"
                  disabled={
                    !newCatName.trim() ||
                    !(
                      catFilters.length === 1 ||
                      newCatDept ||
                      catBrandFilter ||
                      newCatBrand
                    )
                  }
                  className="btn btn--primary rounded-xl px-3 py-2 mb-[1px]"
                >
                  {' '}
                  <Plus size={18} />{' '}
                </button>{' '}
              </form>{' '}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar max-h-[500px]">
                {' '}
                <AnimatePresence initial={false}>
                  {' '}
                  {visibleCategories.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-primary group transition-colors"
                    >
                      {' '}
                      {editingCatId === item.id ? (
                        <div className="flex flex-1 items-center gap-2">
                          {' '}
                          <input
                            className="flex-1 bg-black/20 rounded-lg px-2 py-1 text-sm outline-none border border-primary/50"
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            autoFocus
                          />{' '}
                          <select
                            className="bg-black/20 rounded-lg px-2 py-1 text-sm outline-none border border-primary/50"
                            value={editingCatBrandId}
                            onChange={(e) =>
                              setEditingCatBrandId(e.target.value)
                            }
                          >
                            <option value="">Bez brenda</option>
                            {brands
                              .filter(
                                (brand) =>
                                  brand.departmentId === item.departmentId,
                              )
                              .map((brand) => (
                                <option key={brand.id} value={brand.id}>
                                  {brand.name}
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={handleUpdateCategory}
                            className="text-emerald-500 p-1 hover:bg-white/10 rounded-lg"
                          >
                            {' '}
                            <Check size={16} />{' '}
                          </button>{' '}
                          <button
                            onClick={() => setEditingCatId(null)}
                            className="text-red-400 p-1 hover:bg-white/10 rounded-lg"
                          >
                            {' '}
                            <X size={16} />{' '}
                          </button>{' '}
                        </div>
                      ) : (
                        <>
                          {' '}
                          <div className="flex items-center gap-2 flex-wrap">
                            {' '}
                            <span className="font-medium text-sm">
                              {' '}
                              {item.name}{' '}
                            </span>{' '}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-white border border-white/10">
                              {' '}
                              {brands.find((brand) => brand.id === item.brandId)
                                ?.name || 'Bez brenda'}{' '}
                            </span>{' '}
                            {catFilters.length !== 1 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-400 border border-white/5 uppercase tracking-wider">
                                {' '}
                                {departments.find(
                                  (department) =>
                                    department.id === item.departmentId,
                                )?.name || 'Satovi'}{' '}
                              </span>
                            )}{' '}
                          </div>{' '}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {' '}
                            <button
                              onClick={() => {
                                setEditingCatId(item.id);
                                setEditingCatName(item.name);
                                setEditingCatBrandId(item.brandId || '');
                              }}
                              className="p-1.5 hover:bg-white/10 rounded-lg text-muted hover:text-primary transition-colors"
                            >
                              {' '}
                              <Edit3 size={14} />{' '}
                            </button>{' '}
                            <button
                              onClick={() => handleDeleteCategory(item.id)}
                              className="p-1.5 hover:bg-white/10 rounded-lg text-muted hover:text-red-400 transition-colors"
                            >
                              {' '}
                              <Trash2 size={14} />{' '}
                            </button>{' '}
                          </div>{' '}
                        </>
                      )}{' '}
                    </motion.div>
                  ))}{' '}
                </AnimatePresence>{' '}
              </div>{' '}
            </div>{' '}
          </motion.div>
        )}
        {activeTab === 'specs' /* ... kod za specifikacije ... */ && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            {' '}
            <div className="card glass p-6 h-full flex flex-col">
              {' '}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                {' '}
                <div className="flex items-center gap-3">
                  {' '}
                  <div className="p-2 rounded-xl bg-white/10 text-primary">
                    {' '}
                    <List size={20} />{' '}
                  </div>{' '}
                  <h2 className="text-xl font-bold">Karakteristike</h2>{' '}
                </div>{' '}
                <div className="flex flex-wrap gap-2">
                  {' '}
                  {departmentOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => toggleSpecFilter(opt.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all border border-transparent ${
                        specFilters.includes(opt.id)
                          ? 'bg-neutral-900 text-white shadow-md'
                          : 'bg-white/50 text-neutral-500 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {' '}
                      {opt.label}{' '}
                    </button>
                  ))}{' '}
                  {specFilters.length > 0 && (
                    <button
                      onClick={() => {
                        setSpecFilters([]);
                        setNewSpecDept('');
                      }}
                      className="px-2 text-xs font-bold text-red-400 hover:text-red-600"
                    >
                      {' '}
                      Reset{' '}
                    </button>
                  )}{' '}
                </div>{' '}
              </div>{' '}
              <form
                onSubmit={handleAddSpec}
                className="flex flex-wrap gap-2 mb-4 items-end"
              >
                {' '}
                {specFilters.length !== 1 && (
                  <div className="flex-1 min-w-[120px]">
                    {' '}
                    <label className="text-[10px] uppercase font-bold text-neutral-400 ml-1">
                      {' '}
                      Odeljenje{' '}
                    </label>{' '}
                    <select
                      className="w-full bg-white/5 border border-primary-dark rounded-xl px-3 py-2 text-sm focus:border-primary outline-none transition-colors"
                      value={newSpecDept}
                      onChange={(e) => setNewSpecDept(e.target.value)}
                    >
                      {' '}
                      <option value="">- Izaberi -</option>{' '}
                      {departmentOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {' '}
                          {opt.label}{' '}
                        </option>
                      ))}{' '}
                    </select>{' '}
                  </div>
                )}{' '}
                <div className="flex-[2] min-w-[120px]">
                  {' '}
                  <label className="text-[10px] uppercase font-bold text-neutral-400 ml-1">
                    {' '}
                    Naziv{' '}
                  </label>{' '}
                  <input
                    className="w-full bg-white/5 border border-primary-dark rounded-xl px-4 py-2 text-sm focus:border-primary outline-none transition-colors"
                    placeholder="Npr. Težina"
                    value={newSpecName}
                    onChange={(e) => setNewSpecName(e.target.value)}
                  />{' '}
                </div>{' '}
                <div className="w-[100px]">
                  {' '}
                  <label className="text-[10px] uppercase font-bold text-neutral-400 ml-1">
                    {' '}
                    Jed. (opc){' '}
                  </label>{' '}
                  <input
                    className="w-full bg-white/5 border border-primary-dark rounded-xl px-3 py-2 text-sm focus:border-primary outline-none transition-colors text-center"
                    placeholder="g, mm"
                    value={newSpecUnit}
                    onChange={(e) => setNewSpecUnit(e.target.value)}
                  />{' '}
                </div>{' '}
                <div className="flex-[2] min-w-[170px]">
                  <label className="text-[10px] uppercase font-bold text-neutral-400 ml-1">Ponuđeni odgovori</label>
                  <OfferedAnswersDropdown
                    value={newSpecOptions}
                    draft={newSpecOptionDraft}
                    open={newSpecOptionsOpen}
                    onValueChange={setNewSpecOptions}
                    onDraftChange={setNewSpecOptionDraft}
                    onOpenChange={setNewSpecOptionsOpen}
                  />
                </div>{' '}
                <button
                  type="submit"
                  disabled={!newSpecName.trim()}
                  className="btn btn--primary rounded-xl px-3 py-2 mb-[1px]"
                >
                  {' '}
                  <Plus size={18} />{' '}
                </button>{' '}
              </form>{' '}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar max-h-[500px]">
                {' '}
                <AnimatePresence initial={false}>
                  {' '}
                  {visibleSpecs.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-primary group transition-colors"
                    >
                      {' '}
                      {editingSpecId === item.id ? (
                        <div className="flex flex-1 items-center gap-2">
                          {' '}
                          <input
                            className="flex-1 bg-black/20 rounded-lg px-2 py-1 text-sm outline-none border border-primary/50"
                            value={editingSpecName}
                            onChange={(e) => setEditingSpecName(e.target.value)}
                            autoFocus
                          />{' '}
                          <input
                            className="w-20 bg-black/20 rounded-lg px-2 py-1 text-sm outline-none border border-primary/50"
                            value={editingSpecUnit}
                            onChange={(e) => setEditingSpecUnit(e.target.value)}
                            placeholder="Jedinica"
                            aria-label="Jedinica specifikacije"
                          />{' '}
                          <div className="flex-1 min-w-[180px]">
                            <OfferedAnswersDropdown
                              value={editingSpecOptions}
                              draft={editingSpecOptionDraft}
                              open={editingSpecOptionsOpen}
                              onValueChange={setEditingSpecOptions}
                              onDraftChange={setEditingSpecOptionDraft}
                              onOpenChange={setEditingSpecOptionsOpen}
                              compact
                            />
                          </div>{' '}
                          <button
                            onClick={handleUpdateSpec}
                            className="text-emerald-500 p-1 hover:bg-white/10 rounded-lg"
                          >
                            {' '}
                            <Check size={16} />{' '}
                          </button>{' '}
                          <button
                            onClick={() => {
                              setEditingSpecId(null);
                              setEditingSpecOptionDraft('');
                              setEditingSpecOptionsOpen(false);
                            }}
                            className="text-red-400 p-1 hover:bg-white/10 rounded-lg"
                          >
                            {' '}
                            <X size={16} />{' '}
                          </button>{' '}
                        </div>
                      ) : (
                        <>
                          {' '}
                          <div className="flex items-center gap-2">
                            {' '}
                            <span className="font-medium text-sm">
                              {' '}
                              {item.name}{' '}
                            </span>{' '}
                            {item.unit && (
                              <span className="text-xs text-neutral-400 bg-white/10 px-1.5 rounded">
                                {' '}
                                ({item.unit}){' '}
                              </span>
                            )}{' '}
                            {Array.isArray(item.optionValues) && item.optionValues.length > 0 && <span className="text-[10px] text-neutral-400">{item.optionValues.join(', ')}</span>}{' '}
                            {specFilters.length !== 1 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-400 border border-white/5 uppercase tracking-wider">
                                {' '}
                                {departmentNameFor(
                                  item.departmentId,
                                  item.department,
                                )}{' '}
                              </span>
                            )}{' '}
                          </div>{' '}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {' '}
                            <button
                              onClick={() => {
                                setEditingSpecId(item.id);
                                setEditingSpecName(item.name);
                                setEditingSpecUnit(item.unit || '');
                                setEditingSpecOptions(Array.isArray(item.optionValues) ? item.optionValues.join(', ') : '');
                                setEditingSpecOptionDraft('');
                                setEditingSpecOptionsOpen(false);
                              }}
                              className="p-1.5 hover:bg-white/10 rounded-lg text-muted hover:text-primary transition-colors"
                            >
                              {' '}
                              <Edit3 size={14} />{' '}
                            </button>{' '}
                            <button
                              onClick={() => handleDeleteSpec(item.id)}
                              className="p-1.5 hover:bg-white/10 rounded-lg text-muted hover:text-red-400 transition-colors"
                            >
                              {' '}
                              <Trash2 size={14} />{' '}
                            </button>{' '}
                          </div>{' '}
                        </>
                      )}{' '}
                    </motion.div>
                  ))}{' '}
                </AnimatePresence>{' '}
              </div>{' '}
            </div>{' '}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <AdminProductModal
            product={editProduct}
            onClose={() => setModalOpen(false)}
            onSuccess={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteProduct}
        title="Obriši proizvod?"
        description="Ovaj proizvod će biti trajno uklonjen."
        confirmText="Obriši"
        isDanger={true}
      />
    </div>
  );
}

export default function AdminDashboard() {
  const { user, authReady, staffReady } = useAuth();
  const nav = useNavigate();
  const isAuthorized = Boolean(user && staffReady);

  useEffect(() => {
    if (authReady && !isAuthorized) nav('/', { replace: true });
  }, [authReady, isAuthorized, nav]);

  if (!authReady || (user && !staffReady)) {
    return <div className="p-8 text-center text-slate-500">Provera pristupa…</div>;
  }
  if (!isAuthorized) return null;
  return <AdminDashboardContent />;
}

// Helper komponenta za tabove
function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
        active
          ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-300 scale-105'
          : 'bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 border border-neutral-200'
      }`}
    >
      {' '}
      <Icon size={18} /> {label}{' '}
    </button>
  );
}
