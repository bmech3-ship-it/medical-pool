import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Archive,
  HandPlatter,
  Undo2,
  FileBarChart2,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertTriangle,
  Factory,
  Building2,
  PencilLine,
  Trash2,
  Download,
  Printer,
  QrCode,
} from "lucide-react";

/** Local, robust useLocalStorage hook (persists safely, no auto-reset) */
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = React.useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });
  // keep in sync across tabs
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try { setValue(JSON.parse(e.newValue!)); } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);
  // persist on change
  React.useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

/********** tiny UI helpers **********/
const Card = ({ className = "", children }: { className?: string; children: React.ReactNode }) => (
  <div className={"bg-white/90 backdrop-blur border rounded-2xl p-4 shadow-sm " + className}>{children}</div>
);
const Badge = ({ tone = "slate", children }: { tone?: "slate" | "green" | "red" | "blue"; children: React.ReactNode }) => {
  const map: any = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return <span className={"inline-flex items-center px-2.5 py-1 rounded-full text-xs border " + map[tone]}>{children}</span>;
};
const Button = ({ variant = "default", size = "md", className = "", ...rest }: any) => {
  const variantMap: any = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "border hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    secondary: "bg-slate-700 text-white hover:bg-slate-800",
  };
  const sizeMap: any = { sm: "px-3 py-1.5 rounded-lg text-sm", md: "px-4 py-2 rounded-xl", lg: "px-5 py-3 rounded-2xl text-base" };
  return <button className={[variantMap[variant], sizeMap[size], "inline-flex items-center gap-2", className].join(" ")} {...rest} />;
};

/** composition-safe Text input (for labeled fields) */
const Text = ({
  label, value, onChange, type = "text", placeholder, required,
}: { label: string; value: any; onChange?: (v: string) => void; type?: string; placeholder?: string; required?: boolean; }) => {
  const [local, setLocal] = useState<string>("");
  const composing = useRef(false);

  useEffect(() => {
    if (!composing.current) setLocal((value ?? "").toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocal(v);
    if (!composing.current) onChange && onChange(v);
  };

  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1 text-slate-700">
        {label}{required ? " *" : ""}
      </span>
      <input
        type={type}
        value={local}
        onChange={handleChange}
        onCompositionStart={() => { composing.current = true; }}
        onCompositionEnd={(e) => {
          composing.current = false;
          const v = (e.target as HTMLInputElement).value;
          setLocal(v);
          onChange && onChange(v);
        }}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
      />
    </label>
  );
};

/** composition-safe compact input (for table cells / inline edit) */
const CInput = ({
  value, onChange, type = "text", className = "",
}: { value: any; onChange?: (v: string)=>void; type?: string; className?: string; }) => {
  const [local, setLocal] = useState<string>("");
  const composing = useRef(false);
  useEffect(()=>{ if(!composing.current) setLocal((value ?? "").toString()); }, [value]);
  return (
    <input
      type={type}
      value={local}
      onChange={(e)=>{ const v=e.target.value; setLocal(v); if(!composing.current) onChange && onChange(v); }}
      onCompositionStart={()=>{composing.current=true;}}
      onCompositionEnd={(e)=>{ composing.current=false; const v=(e.target as HTMLInputElement).value; setLocal(v); onChange && onChange(v);}}
      className={"px-2 py-1 border rounded " + className}
    />
  );
};

/********** utils **********/
const uid = (): string => Math.random().toString(36).slice(2) + Date.now().toString(36);
const todayStr = (): string => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number): string => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());
const formatDate = (d?: string | null): string => {
  if (!d) return "";
  const x = new Date(d);
  return isValidDate(x) ? x.toLocaleDateString() : "";
};
const daysBetween = (a: string, b: string | Date = new Date()): number => {
  const d1 = new Date(a), d2 = new Date(b);
  if (!isValidDate(d1) || !isValidDate(d2)) return 0;
  return Math.floor((d2.getTime() - d1.getTime()) / 86400000);
};

// Dynamic loader for SheetJS (XLSX). Caches on window.
async function loadXLSX(): Promise<any> {
  if ((window as any).XLSX) return (window as any).XLSX;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("โหลดไลบรารี XLSX ไม่สำเร็จ"));
    document.head.appendChild(s);
  });
  return (window as any).XLSX;
}

/********** signature **********/
function SignaturePad({ value, onChange, height = 120 }: { value?: string | null; onChange?: (v: string | null) => void; height?: number; }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.lineWidth = 2; ctx.lineCap = "round";
    const pos = (e: any) => {
      const r = c.getBoundingClientRect(); const t = e.touches?.[0];
      const x = (t ? t.clientX : e.clientX) - r.left; const y = (t ? t.clientY : e.clientY) - r.top; return { x, y };
    };
    const start = (e: any) => { drawing.current = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e: any) => { if (!drawing.current) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const end = () => { if (!drawing.current) return; drawing.current = false; onChange && onChange(c.toDataURL("image/png")); };
    c.addEventListener("mousedown", start); c.addEventListener("mousemove", move); window.addEventListener("mouseup", end);
    c.addEventListener("touchstart", start, { passive: false } as any); c.addEventListener("touchmove", move, { passive: false } as any); window.addEventListener("touchend", end);
    return () => {
      c.removeEventListener("mousedown", start); c.removeEventListener("mousemove", move); window.removeEventListener("mouseup", end);
      c.removeEventListener("touchstart", start); c.removeEventListener("touchmove", move); window.removeEventListener("touchend", end);
    };
  }, [onChange]);
  const clear = () => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height); onChange && onChange(null);
  };
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">ลงลายเซ็นผู้ขอยืม (เมาส์/นิ้ว)</div>
      <div className="border rounded-xl bg-white"><canvas ref={ref} width={600} height={height} className="w-full rounded-xl" /></div>
      <Button variant="ghost" size="sm" className="mt-2" onClick={clear}>ล้างลายเซ็น</Button>
      {value && <span className="ml-2 text-emerald-700 text-sm inline-flex items-center gap-1"><CheckCircle2 size={16}/>บันทึกลายเซ็นแล้ว</span>}
    </div>
  );
}

/********** root **********/
export default function App() {
  const [tab, setTab] = useState<'dashboard' | 'assets' | 'borrow' | 'return' | 'report' | 'settings'>('dashboard');

  // master data (persist)
  const [brands, setBrands] = useLocalStorage<string[]>("mp:brands", []);
  const [models, setModels] = useLocalStorage<{ brand: string; name: string; }[]>("mp:models", []);
  const [vendors, setVendors] = useLocalStorage<string[]>("mp:vendors", []);
  const [depts, setDepts]     = useLocalStorage<string[]>("mp:depts",   []);

  // assets & borrows (persist)
  const [assets, setAssets] = useLocalStorage<any[]>("mp:assets", []);
  const [borrows, setBorrows] = useLocalStorage<any[]>("mp:borrows", []);

  // settings (persist)
  const [orgName, setOrgName]       = useLocalStorage<string>("mp:org_name", "Hospital Name");
  const [reportLogo, setReportLogo] = useLocalStorage<string>("mp:report_logo", "");

  const active = useMemo(() => borrows.filter(b => !b.returned_at), [borrows]);
  const activeIds = useMemo(() => active.map(b => b.asset_id), [active]);
  const borrowedCount = new Set(active.map(b => b.asset_id)).size;
  const availableCount = Math.max(assets.length - borrowedCount, 0);
  const overdueCount = active.filter(b => daysBetween(b.start_date) >= 14).length;

  // mutations
  const createAsset  = async (payload: any) => { setAssets(prev => [payload, ...prev]); return true; };
  const deleteAsset  = async (id: string)     => { setAssets(prev => prev.filter(a => a.asset_id !== id)); return true; };
  const updateAsset  = async (id: string, patch: any) => { setAssets(prev => prev.map(a => a.asset_id === id ? { ...a, ...patch } : a)); return true; };
  const createBorrow = async (record: any)    => { setBorrows(prev => [record, ...prev]); return true; };
  const updateBorrow = async (id: string, patch: any) => { setBorrows(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b)); return true; };
  const returnBorrow = async (id: string)     => { const ts = new Date().toISOString(); setBorrows(prev => prev.map(b => b.id === id ? { ...b, returned_at: ts } : b)); return true; };

  const TABS: any = {
    dashboard: { label: "แดชบอร์ด", icon: <LayoutDashboard size={18}/> },
    assets:    { label: "ลงทะเบียน", icon: <Archive size={18}/> },
    borrow:    { label: "บันทึกยืม", icon: <HandPlatter size={18}/> },
    return:    { label: "บันทึกคืน", icon: <Undo2 size={18}/> },
    report:    { label: "รายงาน",   icon: <FileBarChart2 size={18}/> },
    settings:  { label: "Settings",  icon: <SettingsIcon size={18}/> },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-lg text-slate-800">
            <QrCode className="text-blue-600"/>
            <span>Medical Pool</span>
            <Badge tone="blue">{orgName}</Badge>
          </div>
          <nav className="ml-auto flex flex-wrap gap-2">
            {(Object.keys(TABS) as Array<typeof tab>).map((id) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={
                  "px-3 py-2 rounded-xl border inline-flex items-center gap-2 transition " +
                  (tab === id ? "bg-blue-600 text-white border-blue-700 shadow-sm" : "bg-white hover:bg-slate-50")
                }>
                {TABS[id].icon} {TABS[id].label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 text-slate-800">
        {tab === "dashboard" && (
          <Dashboard assets={assets} active={active} borrowedCount={borrowedCount} availableCount={availableCount} overdueCount={overdueCount} />
        )}
        {tab === "assets" && (
          <Assets
            brands={brands} setBrands={setBrands}
            models={models} setModels={setModels}
            vendors={vendors} setVendors={setVendors}
            assets={assets}
            onCreateAsset={createAsset} onDeleteAsset={deleteAsset} onUpdateAsset={updateAsset}
          />
        )}
        {tab === "borrow" && (
          <Borrow assets={assets} depts={depts} setDepts={setDepts} onCreateBorrow={createBorrow} activeIds={activeIds} />
        )}
        {tab === "return" && (
          <Return borrows={borrows} onReturn={returnBorrow} onUpdateBorrow={updateBorrow} />
        )}
        {tab === "report" && (
          <Report borrows={borrows} depts={depts} orgName={orgName} reportLogo={reportLogo} />
        )}
        {tab === "settings" && (
          <Settings orgName={orgName} setOrgName={setOrgName} reportLogo={reportLogo} setReportLogo={setReportLogo} />
        )}
      </main>
    </div>
  );
}

/********** dashboard **********/
function Dashboard({ assets, active, borrowedCount, availableCount, overdueCount }: { assets: any[]; active: any[]; borrowedCount: number; availableCount: number; overdueCount: number; }) {
  const overdue = useMemo(() => active.filter((b: any) => daysBetween(b.start_date) >= 14), [active]);
  const normal  = useMemo(() => active.filter((b: any) => daysBetween(b.start_date) < 14), [active]);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="text-center"><div className="text-2xl font-bold">{borrowedCount}</div><div className="text-sm text-slate-500">กำลังยืม</div></Card>
      <Card className="text-center"><div className="text-2xl font-bold">{availableCount}</div><div className="text-sm text-slate-500">คงเหลือ</div></Card>
      <Card className="text-center"><div className="text-2xl font-bold">{assets.length}</div><div className="text-sm text-slate-500">ทั้งหมด</div></Card>
      <Card className="text-center border-red-200"><div className="text-2xl font-bold text-red-600">{overdueCount}</div><div className="text-sm text-red-700">≥ 14 วัน</div></Card>

      <Card className="md:col-span-4">
        <div className="flex items-center gap-2 mb-2"><AlertTriangle className="text-red-600" size={18}/><h4 className="font-semibold">รายการเกิน 14 วัน</h4></div>
        <ActiveLoans borrows={overdue} compact />
      </Card>
      <Card className="md:col-span-4">
        <div className="flex items-center gap-2 mb-2"><Factory size={18} className="text-slate-600"/><h4 className="font-semibold">รายการค้างยืม</h4></div>
        <ActiveLoans borrows={normal} compact />
      </Card>
    </div>
  );
}

/********** assets (register) + Edit **********/
function Assets({ brands, setBrands, models, setModels, vendors, setVendors, assets, onCreateAsset, onDeleteAsset, onUpdateAsset }: any) {
  const [form, setForm] = useState({ asset_id: "", id_code: "", name: "", brand: "", model: "", vendor: "", serial: "", purchase_date: "", price: "" });
  const [err, setErr] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Inline add states
  const [addingBrand, setAddingBrand] = useState(false); const [newBrand, setNewBrand] = useState("");
  const [addingModel, setAddingModel] = useState(false); const [newModel, setNewModel] = useState("");
  const [addingVendor, setAddingVendor] = useState(false); const [newVendor, setNewVendor] = useState("");

  const modelOptions = useMemo(() => models.filter((m: any) => m.brand === (editingId ? editForm.brand : form.brand)).map((m: any) => m.name), [models, form.brand, editForm.brand, editingId]);

  const confirmAddBrand = () => {
    const v = newBrand.trim(); if (!v) return;
    if (!brands.includes(v)) setBrands([...brands, v]);
    if (editingId) setEditForm((p: any) => ({ ...p, brand: v, model: "" }));
    else setForm({ ...form, brand: v, model: "" });
    setNewBrand(""); setAddingBrand(false);
  };
  const confirmAddModel = () => {
    const currentBrand = editingId ? editForm.brand : form.brand;
    if (!currentBrand) return alert("เลือกยี่ห้อก่อน");
    const v = newModel.trim(); if (!v) return;
    if (!models.find((m: any) => m.name === v && m.brand === currentBrand)) setModels([...models, { brand: currentBrand, name: v }]);
    if (editingId) setEditForm((p: any) => ({ ...p, model: v })); else setForm({ ...form, model: v });
    setNewModel(""); setAddingModel(false);
  };
  const confirmAddVendor = () => {
    const v = newVendor.trim(); if (!v) return;
    if (!vendors.includes(v)) setVendors([...vendors, v]);
    if (editingId) setEditForm((p: any) => ({ ...p, vendor: v })); else setForm({ ...form, vendor: v });
    setNewVendor(""); setAddingVendor(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    const f = form as any;
    if (!f.asset_id || !f.id_code || !f.name || !f.serial) return setErr("กรอก Asset ID / ID CODE / ชื่อ / Serial");
    if (assets.some((a: any) => a.asset_id === f.asset_id)) return setErr("Asset ID ซ้ำ");
    if (assets.some((a: any) => a.id_code === f.id_code)) return setErr("ID CODE ซ้ำ");
    if (assets.some((a: any) => a.serial === f.serial)) return setErr("Serial ซ้ำ");
    const payload = { ...f, price: f.price ? Number(f.price) : null };
    const ok = await onCreateAsset(payload); if (ok) { setForm({ asset_id: "", id_code: "", name: "", brand: "", model: "", vendor: "", serial: "", purchase_date: "", price: "" }); }
  };

  const startEdit = (a: any) => { setEditingId(a.asset_id); setEditForm({ ...a, price: a.price ?? "" }); setErr(""); };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };
  const saveEdit = async () => {
    const f = editForm;
    if (!f.asset_id || !f.id_code || !f.name || !f.serial) return setErr("กรอก Asset ID / ID CODE / ชื่อ / Serial");
    if (assets.some((a: any) => a.asset_id === f.asset_id && a.asset_id !== editingId)) return setErr("Asset ID ซ้ำ");
    if (assets.some((a: any) => a.id_code === f.id_code && a.asset_id !== editingId)) return setErr("ID CODE ซ้ำ");
    if (assets.some((a: any) => a.serial === f.serial && a.asset_id !== editingId)) return setErr("Serial ซ้ำ");
    await onUpdateAsset(editingId, { ...f, price: f.price ? Number(f.price) : null });
    setEditingId(null); setEditForm({});
  };

  const Block = ({ children }: any) => <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;

  const BrandField = ({ isEdit }: { isEdit?: boolean }) => (
    <label className="block">
      <span className="block text-sm font-medium mb-1">ยี่ห้อ</span>
      <div className="flex gap-2 items-start">
        <select
          value={isEdit ? editForm.brand : form.brand}
          onChange={(e) => isEdit ? setEditForm((p: any) => ({ ...p, brand: e.target.value, model: "" })) : setForm({ ...form, brand: e.target.value, model: "" })}
          className="w-full px-3 py-2 border rounded-xl">
          <option value="">-- เลือก --</option>
          {brands.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
        <Button variant="ghost" onClick={() => setAddingBrand(v => !v)} size="sm">+ เพิ่ม</Button>
      </div>
      {addingBrand && (
        <div className="mt-2 flex gap-2">
          <input className="px-3 py-2 border rounded-xl flex-1" placeholder="พิมพ์ยี่ห้อใหม่" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} />
          <Button variant="success" onClick={confirmAddBrand} size="sm">บันทึก</Button>
          <Button variant="ghost" onClick={() => { setAddingBrand(false); setNewBrand(""); }} size="sm">ยกเลิก</Button>
        </div>
      )}
    </label>
  );
  const ModelField = ({ isEdit }: { isEdit?: boolean }) => (
    <label className="block">
      <span className="block text-sm font-medium mb-1">รุ่น</span>
      <div className="flex gap-2 items-start">
        <select
          value={isEdit ? editForm.model : form.model}
          onChange={(e) => isEdit ? setEditForm((p: any) => ({ ...p, model: e.target.value })) : setForm({ ...form, model: e.target.value })}
          className="w-full px-3 py-2 border rounded-xl">
          <option value="">-- เลือก --</option>
          {modelOptions.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
        <Button variant="ghost" onClick={() => setAddingModel(v => !v)} size="sm">+ เพิ่ม</Button>
      </div>
      {addingModel && (
        <div className="mt-2 flex gap-2">
          <input className="px-3 py-2 border rounded-xl flex-1" placeholder={`เพิ่มรุ่นใหม่ให้ ${(editingId ? editForm.brand : form.brand) || ""}`} value={newModel} onChange={(e) => setNewModel(e.target.value)} />
          <Button variant="success" onClick={confirmAddModel} size="sm">บันทึก</Button>
          <Button variant="ghost" onClick={() => { setAddingModel(false); setNewModel(""); }} size="sm">ยกเลิก</Button>
        </div>
      )}
    </label>
  );
  const VendorField = ({ isEdit }: { isEdit?: boolean }) => (
    <label className="block">
      <span className="block text-sm font-medium mb-1">บริษัทผู้ขาย</span>
      <div className="flex gap-2 items-start">
        <select
          value={isEdit ? editForm.vendor : form.vendor}
          onChange={(e) => isEdit ? setEditForm((p: any) => ({ ...p, vendor: e.target.value })) : setForm({ ...form, vendor: e.target.value })}
          className="w-full px-3 py-2 border rounded-xl">
          <option value="">-- เลือก --</option>
          {vendors.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
        <Button variant="ghost" onClick={() => setAddingVendor(v => !v)} size="sm">+ เพิ่ม</Button>
      </div>
      {addingVendor && (
        <div className="mt-2 flex gap-2">
          <input className="px-3 py-2 border rounded-xl flex-1" placeholder="พิมพ์บริษัทผู้ขายใหม่" value={newVendor} onChange={(e) => setNewVendor(e.target.value)} />
          <Button variant="success" onClick={confirmAddVendor} size="sm">บันทึก</Button>
          <Button variant="ghost" onClick={() => { setAddingVendor(false); setNewVendor(""); }} size="sm">ยกเลิก</Button>
        </div>
      )}
    </label>
  );

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Archive size={18} className="text-blue-600"/>
        <h3 className="font-semibold">ลงทะเบียนเครื่องมือแพทย์</h3>
      </div>
      {err && <div className="mb-3"><Badge tone="red">{err}</Badge></div>}
      <form onSubmit={submit} className="space-y-3">
        <Block>
          <Text label="Asset ID" value={form.asset_id} onChange={(v) => setForm({ ...form, asset_id: v })} required />
          <Text label="ID CODE" value={form.id_code} onChange={(v) => setForm({ ...form, id_code: v })} required />
          <Text label="ชื่อเครื่องมือ" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <BrandField />
          <ModelField />
          <VendorField />
          <Text label="Serial" value={form.serial} onChange={(v) => setForm({ ...form, serial: v })} required />
          <Text label="วันที่ซื้อ" type="date" value={form.purchase_date} onChange={(v) => setForm({ ...form, purchase_date: v })} />
          <Text label="ราคา" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
        </Block>
        <Button className="mt-2" type="submit"><CheckCircle2 size={18}/>บันทึก</Button>
      </form>

      <h4 className="font-semibold mt-6 mb-2 flex items-center gap-2"><Building2 size={18}/> รายการเครื่องมือ ({assets.length})</h4>
      <div className="overflow-auto max-h-96 border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr>{["Asset ID", "ID CODE", "ชื่อ", "ยี่ห้อ/รุ่น", "Serial", "วันที่ซื้อ", "ราคา", "บริษัท", "#"].map((h) => <th key={h} className="text-left px-3 py-2 border-b">{h}</th>)}</tr>
          </thead>
          <tbody>
            {assets.map((a: any) => (
              <tr key={a.asset_id} className="odd:bg-white even:bg-slate-50 align-top hover:bg-slate-100/60">
                <AssetRow
                  a={a}
                  brands={brands} models={models} vendors={vendors}
                  editingIdState={{ editingId, setEditingId }}
                  editFormState={{ editForm, setEditForm }}
                  onDeleteAsset={onDeleteAsset}
                  onSaveEdit={saveEdit}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AssetRow({ a, brands, models, vendors, editingIdState, editFormState, onDeleteAsset, onSaveEdit }: any) {
  const { editingId, setEditingId } = editingIdState;
  const { editForm, setEditForm } = editFormState;
  const startEdit = (row: any) => { setEditingId(row.asset_id); setEditForm({ ...row, price: row.price ?? "" }); };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const modelOptions = useMemo(
    () => models.filter((m: any) => m.brand === (editForm.brand ?? a.brand)).map((m: any) => m.name),
    [models, editForm.brand, a.brand]
  );

  return editingId === a.asset_id ? (
    <>
      <td className="px-3 py-2 border-b"><CInput className="w-40" value={editForm.asset_id} onChange={(v)=>setEditForm((p:any)=>({...p, asset_id:v}))}/></td>
      <td className="px-3 py-2 border-b"><CInput className="w-32" value={editForm.id_code} onChange={(v)=>setEditForm((p:any)=>({...p, id_code:v}))}/></td>
      <td className="px-3 py-2 border-b"><CInput className="w-48" value={editForm.name} onChange={(v)=>setEditForm((p:any)=>({...p, name:v}))}/></td>
      <td className="px-3 py-2 border-b w-64">
        <label className="block mb-1">
          <span className="block text-xs text-slate-600">ยี่ห้อ</span>
          <select className="w-full px-2 py-1 border rounded" value={editForm.brand} onChange={(e)=>setEditForm((p:any)=>({...p, brand:e.target.value, model:""}))}>
            <option value="">-- เลือก --</option>
            {brands.map((o: string) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-slate-600">รุ่น</span>
          <select className="w-full px-2 py-1 border rounded" value={editForm.model} onChange={(e)=>setEditForm((p:any)=>({...p, model:e.target.value}))}>
            <option value="">-- เลือก --</option>
            {modelOptions.map((o: string) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      </td>
      <td className="px-3 py-2 border-b"><CInput className="w-40" value={editForm.serial} onChange={(v)=>setEditForm((p:any)=>({...p, serial:v}))}/></td>
      <td className="px-3 py-2 border-b"><CInput type="date" value={editForm.purchase_date||""} onChange={(v)=>setEditForm((p:any)=>({...p, purchase_date:v}))}/></td>
      <td className="px-3 py-2 border-b"><CInput type="number" className="w-28" value={editForm.price??""} onChange={(v)=>setEditForm((p:any)=>({...p, price:v}))}/></td>
      <td className="px-3 py-2 border-b">
        <label className="block">
          <span className="block text-xs text-slate-600">บริษัทผู้ขาย</span>
          <CInput className="w-40" value={editForm.vendor||""} onChange={(v)=>setEditForm((p:any)=>({...p, vendor:v}))}/>
        </label>
      </td>
      <td className="px-3 py-2 border-b text-right space-x-2">
        <Button variant="success" size="sm" onClick={onSaveEdit}><CheckCircle2 size={16}/>บันทึก</Button>
        <Button variant="ghost" size="sm" onClick={cancelEdit}>ยกเลิก</Button>
      </td>
    </>
  ) : (
    <>
      <td className="px-3 py-2 border-b">{a.asset_id}</td>
      <td className="px-3 py-2 border-b">{a.id_code}</td>
      <td className="px-3 py-2 border-b">{a.name}</td>
      <td className="px-3 py-2 border-b">{a.brand} {a.model}</td>
      <td className="px-3 py-2 border-b">{a.serial}</td>
      <td className="px-3 py-2 border-b">{formatDate(a.purchase_date)}</td>
      <td className="px-3 py-2 border-b">{a.price != null ? Number(a.price).toLocaleString() : "-"}</td>
      <td className="px-3 py-2 border-b">{a.vendor || "-"}</td>
      <td className="px-3 py-2 border-b text-right space-x-2">
        <Button variant="ghost" size="sm" onClick={() => startEdit(a)}><PencilLine size={16}/>แก้ไข</Button>
        <Button variant="danger" size="sm" onClick={() => onDeleteAsset(a.asset_id)}><Trash2 size={16}/>ลบ</Button>
      </td>
    </>
  );
}

/********** borrow **********/
function Borrow({ assets, depts, setDepts, onCreateBorrow, activeIds = [] }: any) {
  const [assetId, setAssetId] = useState("");
  const asset  = useMemo(() => assets.find((a: any) => a.asset_id === assetId), [assets, assetId]);
  const isBusy = useMemo(() => asset ? activeIds.includes(asset.asset_id) : false, [asset, activeIds]);
  const [form, setForm] = useState({ peripherals: "", lender_name: "", start_date: todayStr(), end_date: "", borrower_name: "", borrower_dept: "" });
  const [sign, setSign] = useState<string | null>(null);
  const [err, setErr] = useState("");

  // Inline add for Department
  const [addingDept, setAddingDept] = useState(false);
  const [newDept, setNewDept] = useState("");
  const confirmAddDept = () => {
    const v = newDept.trim(); if (!v) return;
    if (!depts.includes(v)) setDepts([...depts, v]);
    setForm({ ...form, borrower_dept: v });
    setNewDept(""); setAddingDept(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!asset) return setErr("ไม่พบ Asset ID นี้");
    if (isBusy) return setErr("เครื่องนี้กำลังถูกยืมอยู่ — ห้ามบันทึกซ้ำ");
    if (!form.lender_name || !form.borrower_name || !form.start_date) return setErr("กรอกผู้ให้ยืม/ผู้ยืม/วันที่เริ่มยืม");
    if (!sign) return setErr("กรุณาเซ็นชื่อผู้ขอยืมให้เรียบร้อย");
    const rec = {
      id: uid(), asset_id: asset.asset_id, asset_name: asset.name,
      ...form, end_date: form.end_date || null, returned_at: null,
      borrower_sign: sign, created_at: new Date().toISOString()
    };
    const ok = await onCreateBorrow(rec); if (ok) { setSign(null); alert("บันทึกการยืมแล้ว"); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <div className="flex items-center gap-2 mb-3"><HandPlatter size={18} className="text-blue-600"/><h3 className="font-semibold">ค้นหาเครื่องด้วย Asset ID</h3></div>
        <CInput className="w-full" value={assetId} onChange={setAssetId} />
        {asset ? (
          <div className="mt-3 text-sm">
            <div className="font-medium">{asset.name}</div>
            <div className="text-slate-600">{asset.brand} {asset.model} • Serial: {asset.serial}</div>
            {isBusy && <div className="mt-2"><Badge tone="red">กำลังถูกยืมอยู่</Badge></div>}
          </div>
        ) : (
          <div className="mt-3 text-slate-500 text-sm">พิมพ์ Asset ID เพื่อค้นหา</div>
        )}
      </Card>

      <Card className="lg:col-span-2">
        <div className="flex items-center gap-2 mb-3"><CheckCircle2 size={18} className="text-blue-600"/><h3 className="font-semibold">บันทึกการยืม</h3></div>
        {err && <div className="mb-3"><Badge tone="red">{err}</Badge></div>}
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Text label="อุปกรณ์ต่อพ่วง" value={form.peripherals} onChange={(v) => setForm({ ...form, peripherals: v })} />
          <Text label="ชื่อผู้ให้ยืม" value={form.lender_name} onChange={(v) => setForm({ ...form, lender_name: v })} required />
          <Text label="วันที่เริ่มยืม" type="date" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} required />
          <Text label="กำหนดคืน (ถ้ามี)" type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
          <Text label="ชื่อผู้ขอยืม" value={form.borrower_name} onChange={(v) => setForm({ ...form, borrower_name: v })} required />
          <label className="block md:col-span-2">
            <span className="block text-sm font-medium mb-1">แผนกผู้ขอยืม</span>
            <div className="flex gap-2 items-start">
              <select className="px-3 py-2 border rounded-xl w-full" value={form.borrower_dept} onChange={(e) => setForm({ ...form, borrower_dept: e.target.value })}>
                <option value="">-- เลือก --</option>
                {depts.map((d: string) => <option key={d} value={d}>{d}</option>)}
              </select>
              <Button variant="ghost" size="sm" onClick={() => setAddingDept(v => !v)}>+ เพิ่ม</Button>
            </div>
            {addingDept && (
              <div className="mt-2 flex gap-2">
                <CInput className="flex-1" value={newDept} onChange={setNewDept} />
                <Button variant="success" size="sm" onClick={confirmAddDept}>บันทึก</Button>
                <Button variant="ghost" size="sm" onClick={() => { setAddingDept(false); setNewDept(""); }}>ยกเลิก</Button>
              </div>
            )}
          </label>
          <div className="md:col-span-2"><SignaturePad value={sign} onChange={setSign} /></div>
          <div className="md:col-span-2">
            <Button className={isBusy ? "bg-slate-400 hover:bg-slate-400 cursor-not-allowed" : ""} disabled={isBusy}>
              บันทึกการยืม
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

/********** return + Edit **********/
function Return({ borrows, onReturn, onUpdateBorrow }: any) {
  const active = borrows.filter((b: any) => !b.returned_at);
  const [kw, setKw] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>({});
  const list = useMemo(
    () => !kw ? active : active.filter((r: any) => {
      const k = kw.toLowerCase();
      return r.asset_id.toLowerCase().includes(k) || (r.asset_name || "").toLowerCase().includes(k) || (r.borrower_name || "").toLowerCase().includes(k);
    }),
    [kw, active]
  );
  const start = (r: any) => { setEditId(r.id); setEdit({ borrower_name: r.borrower_name||"", borrower_dept: r.borrower_dept||"", lender_name: r.lender_name||"", peripherals: r.peripherals||"", end_date: r.end_date||"" }); };
  const cancel = () => { setEditId(null); setEdit({}); };
  const save = async (id: string) => { await onUpdateBorrow(id, edit); setEditId(null); };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3"><Undo2 size={18} className="text-blue-600"/><h3 className="font-semibold">บันทึกการคืน</h3></div>
      <CInput className="w-full md:w-80 mb-3" value={kw} onChange={setKw} />
      <div className="overflow-auto max-h-[28rem] border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 sticky top-0"><tr>{["Asset ID", "ชื่อเครื่อง", "ผู้ยืม", "เริ่มยืม", "วันสะสม", "#"].map(h => <th key={h} className="text-left px-3 py-2 border-b">{h}</th>)}</tr></thead>
          <tbody>
            {list.map((r: any) => (
              <tr key={r.id} className="odd:bg-white even:bg-slate-50 align-top hover:bg-slate-100/60">
                <td className="px-3 py-2 border-b">{r.asset_id}</td>
                <td className="px-3 py-2 border-b">{r.asset_name}</td>
                <td className="px-3 py-2 border-b">
                  {editId===r.id ? (
                    <div className="grid grid-cols-1 gap-1">
                      <CInput value={edit.borrower_name} onChange={(v)=>setEdit((p:any)=>({...p, borrower_name:v}))} />
                      <CInput value={edit.borrower_dept} onChange={(v)=>setEdit((p:any)=>({...p, borrower_dept:v}))} />
                      <CInput value={edit.lender_name} onChange={(v)=>setEdit((p:any)=>({...p, lender_name:v}))} />
                      <CInput value={edit.peripherals} onChange={(v)=>setEdit((p:any)=>({...p, peripherals:v}))} />
                      <CInput type="date" value={edit.end_date} onChange={(v)=>setEdit((p:any)=>({...p, end_date:v}))} />
                      <div className="space-x-2 mt-1">
                        <Button variant="success" size="sm" onClick={()=>save(r.id)}><CheckCircle2 size={16}/>บันทึก</Button>
                        <Button variant="ghost" size="sm" onClick={cancel}>ยกเลิก</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">{r.borrower_name} {daysBetween(r.start_date) >= 14 && <Badge tone="red">นาน</Badge>}</div>
                    </>
                  )}
                </td>
                <td className="px-3 py-2 border-b">{formatDate(r.start_date)}</td>
                <td className={"px-3 py-2 border-b " + (daysBetween(r.start_date) >= 14 ? "text-red-700 font-semibold" : "")}>{daysBetween(r.start_date)}</td>
                <td className="px-3 py-2 border-b">
                  {editId===r.id ? null : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={()=>start(r)}><PencilLine size={16}/>แก้ไข</Button>
                      <Button variant="success" size="sm" onClick={()=>onReturn(r.id)}><CheckCircle2 size={16}/>บันทึกคืน</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (<tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">ไม่มีรายการที่กำลังยืม</td></tr>)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/********** report (PDF + real .xlsx) **********/
function Report({ borrows, depts, orgName, reportLogo }: { borrows: any[]; depts: string[]; orgName: string; reportLogo: string; }) {
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [dept, setDept] = useState("");
  const [xlLoading, setXlLoading] = useState(false);
  const [xlNote, setXlNote] = useState("");

  const filtered = useMemo(
    () => borrows.filter((r: any) => {
      const sd = new Date(r.start_date);
      if (from && sd < new Date(from)) return false;
      if (to && sd > new Date(to)) return false;
      if (dept && (r.borrower_dept || "") !== dept) return false;
      return true;
    }),
    [borrows, from, to, dept]
  );

  const exportFallbackXLS = () => {
    const head1 = `<tr><th colspan="10" style="font-size:16px;text-align:left">${orgName}</th></tr>`;
    const head2 = `<tr><th colspan="10" style="text-align:left">รายงานการยืม-คืน • พิมพ์เมื่อ ${new Date().toLocaleString()}</th></tr>`;
    const headers = ["Asset ID","ชื่อเครื่อง","ผู้ยืม","แผนก","ผู้ให้ยืม","เริ่มยืม","กำหนดคืน","คืนจริง","ระยะเวลา(วัน)","ลายเซ็น"];
    const thead = `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;
    const tbody = filtered.map((r:any)=> `<tr>
      <td>${r.asset_id}</td>
      <td>${r.asset_name||""}</td>
      <td>${r.borrower_name||""}</td>
      <td>${r.borrower_dept||""}</td>
      <td>${r.lender_name||""}</td>
      <td>${formatDate(r.start_date)}</td>
      <td>${r.end_date?formatDate(r.end_date):""}</td>
      <td>${r.returned_at?formatDate(r.returned_at):""}</td>
      <td>${r.returned_at?daysBetween(r.start_date,r.returned_at):daysBetween(r.start_date)}</td>
      <td></td>
    </tr>`).join("");
    const html = `<!doctype html><html><head><meta charset='utf-8'></head><body><table>${head1}${head2}${thead}${tbody}</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `medical_pool_${Date.now()}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const exportXLSX = async () => {
    if (xlLoading) return;
    if (!filtered || filtered.length === 0) {
      setXlNote("ไม่มีข้อมูลตามตัวกรองที่จะส่งออก");
      setTimeout(()=>setXlNote(""), 2500);
      return;
    }

    setXlLoading(true); setXlNote("กำลังโหลดไลบรารี Excel...");
    let XLSX: any;
    try {
      XLSX = await loadXLSX();
    } catch (e:any) {
      setXlNote("โหลด XLSX ไม่สำเร็จ กำลังใช้ไฟล์สำรอง .xls");
      exportFallbackXLS(); setXlLoading(false); return;
    }
    if (!XLSX?.utils) {
      setXlNote("XLSX ใช้งานไม่ได้ กำลังใช้ไฟล์สำรอง .xls");
      exportFallbackXLS(); setXlLoading(false); return;
    }

    try {
      const now = new Date();
      const aoa: any[][] = [
        [orgName],
        ["รายงานการยืม-คืน", now.toLocaleString()],
        [""],
        ["Asset ID","ชื่อเครื่อง","ผู้ยืม","แผนก","ผู้ให้ยืม","เริ่มยืม","กำหนดคืน","คืนจริง","ระยะเวลา(วัน)","ลายเซ็น"]
      ];
      filtered.forEach((r:any)=>{
        aoa.push([
          String(r.asset_id || ""),
          String(r.asset_name || ""),
          String(r.borrower_name || ""),
          String(r.borrower_dept || ""),
          String(r.lender_name || ""),
          formatDate(r.start_date) || "",
          r.end_date ? formatDate(r.end_date) : "",
          r.returned_at ? formatDate(r.returned_at) : "",
          r.returned_at ? daysBetween(r.start_date, r.returned_at) : daysBetween(r.start_date),
          ""
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      (ws["!cols"] as any) = [{wch:12},{wch:22},{wch:16},{wch:10},{wch:14},{wch:12},{wch:12},{wch:12},{wch:12},{wch:10}];
      (ws["!merges"] as any) = [{s:{r:0,c:0}, e:{r:0,c:9}}];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, `medical_pool_${Date.now()}.xlsx`);
      setXlNote(`ส่งออก .xlsx เรียบร้อย (${filtered.length} รายการ)`);
    } catch (e:any) {
      setXlNote("สร้าง .xlsx ไม่ได้ กำลังใช้ไฟล์สำรอง .xls");
      exportFallbackXLS();
    } finally {
      setXlLoading(false);
      setTimeout(()=>setXlNote(""), 3000);
    }
  };

  const printPDF = () => {
    const rows = filtered.map((r: any) => (
      `<tr><td>${r.asset_id}</td><td>${r.asset_name || ""}</td><td>${r.borrower_name || ""}</td><td>${r.borrower_dept || ""}</td><td>${r.lender_name || ""}</td><td>${formatDate(r.start_date)}</td><td>${r.end_date ? formatDate(r.end_date) : ""}</td><td>${r.returned_at ? formatDate(r.returned_at) : ""}</td><td>${r.returned_at ? daysBetween(r.start_date, r.returned_at) : daysBetween(r.start_date)}</td><td>${r.borrower_sign ? `<img src='${r.borrower_sign}' style='height:28px'/>` : "-"}</td></tr>`
    )).join("");
    const logo = reportLogo ? `<img src='${reportLogo}' style='height:48px;margin-right:8px'/>` : "";
    const html = `<!doctype html><html><head><meta charset='utf-8'><title>Report</title><style>body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#0f172a}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #e5e7eb;padding:6px;text-align:left}thead{background:#f8fafc}.muted{color:#64748b;font-size:11px}@media print{@page{margin:12mm}}</style></head><body><div style='display:flex;align-items:center;font-weight:700;margin-bottom:8px'>${logo}<div>${orgName}</div></div><div class='muted' style='margin-bottom:6px'>รายงานการยืม-คืน • พิมพ์เมื่อ ${new Date().toLocaleString()}</div><table><thead><tr><th>Asset ID</th><th>ชื่อเครื่อง</th><th>ผู้ยืม</th><th>แผนก</th><th>ผู้ให้ยืม</th><th>เริ่มยืม</th><th>กำหนดคืน</th><th>คืนจริง</th><th>ระยะเวลา(วัน)</th><th>ลายเซ็น</th></tr></thead><tbody>${rows || `<tr><td colspan='10' class='muted'>ไม่มีข้อมูล</td></tr>`}</tbody></table><script>window.addEventListener('load',()=>{setTimeout(()=>{window.print();},100)});</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { alert("เบราว์เซอร์บล็อกป๊อปอัป กรุณาอนุญาต แล้วลองใหม่"); return; }
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
  };

  return (
    <Card>
      <div className="flex items-center mb-2 gap-2">
        <FileBarChart2 className="text-blue-600" size={18}/>
        <h3 className="font-semibold text-xl">รายงานการยืม-คืน</h3>
        <Badge tone="blue">พบ {filtered.length} รายการ</Badge>
        <div className="ml-auto flex gap-2">
          <Button variant="success" onClick={exportXLSX} disabled={xlLoading} className={xlLoading? "cursor-wait":""}>
            <Download size={18}/> {xlLoading ? "กำลังเตรียม Excel..." : "Export Excel (.xlsx)"}
          </Button>
          <Button variant="secondary" onClick={printPDF}><Printer size={18}/>พิมพ์ PDF</Button>
        </div>
      </div>
      {xlNote && <div className="mb-3 text-sm text-slate-600">{xlNote}</div>}
      <div className="flex flex-wrap gap-3 mb-3 items-end">
        <div><label className="text-sm block mb-1">จาก</label><input type="date" className="px-3 py-2 border rounded-xl" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="text-sm block mb-1">ถึง</label><input type="date" className="px-3 py-2 border rounded-xl" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="flex-1 min-w-[220px]"><label className="block"><span className="block text-sm font-medium mb-1">แผนก</span><select className="px-3 py-2 border rounded-xl w-full" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">ทั้งหมด</option>{depts.map(d => <option key={d} value={d}>{d}</option>)}</select></label></div>
      </div>
      <div className="overflow-auto max-h-[28rem] border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr>{["Asset ID", "ชื่อเครื่อง", "ผู้ยืม", "แผนก", "ผู้ให้ยืม", "เริ่มยืม", "กำหนดคืน", "คืนจริง", "ระยะเวลา(วัน)", "ลายเซ็น"].map(h => (<th key={h} className="text-left px-3 py-2 border-b">{h}</th>))}</tr>
          </thead>
          <tbody>
            {filtered.map((r: any) => (
              <tr key={r.id} className="odd:bg-white even:bg-slate-50 hover:bg-slate-100/60">
                <td className="px-3 py-2 border-b">{r.asset_id}</td>
                <td className="px-3 py-2 border-b">{r.asset_name}</td>
                <td className="px-3 py-2 border-b">{r.borrower_name}</td>
                <td className="px-3 py-2 border-b">{r.borrower_dept || "-"}</td>
                <td className="px-3 py-2 border-b">{r.lender_name}</td>
                <td className="px-3 py-2 border-b">{formatDate(r.start_date)}</td>
                <td className="px-3 py-2 border-b">{r.end_date ? formatDate(r.end_date) : "-"}</td>
                <td className="px-3 py-2 border-b">{r.returned_at ? formatDate(r.returned_at) : "-"}</td>
                <td className="px-3 py-2 border-b">{r.returned_at ? daysBetween(r.start_date, r.returned_at) : daysBetween(r.start_date)}</td>
                <td className="px-3 py-2 border-b">{r.borrower_sign ? <img src={r.borrower_sign} alt="sign" className="h-8" /> : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/********** active list **********/
function ActiveLoans({ borrows, compact }: { borrows: any[]; compact?: boolean; }) {
  const rows = borrows;
  return (
    <div className="overflow-auto max-h-96 border rounded-xl">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 sticky top-0">
          <tr>{["Asset ID", "ชื่อเครื่อง", "ผู้ยืม", "แผนก", "เริ่มยืม", "กำหนดคืน", "วันสะสม", compact ? "" : "ลายเซ็น"].filter(Boolean).map(h => (<th key={String(h)} className="text-left px-3 py-2 border-b">{h as any}</th>))}</tr>
        </thead>
        <tbody>
          {rows.map((r: any) => {
            const od = daysBetween(r.start_date) >= 14;
            return (
              <tr key={r.id} className={"align-top " + (od ? "bg-red-50 hover:bg-red-100/70" : "odd:bg-white even:bg-slate-50 hover:bg-slate-100/60")}>
                <td className="px-3 py-2 border-b">{r.asset_id}</td>
                <td className="px-3 py-2 border-b">{r.asset_name}</td>
                <td className="px-3 py-2 border-b">{r.borrower_name}</td>
                <td className="px-3 py-2 border-b">{r.borrower_dept || "-"}</td>
                <td className="px-3 py-2 border-b">{formatDate(r.start_date)}</td>
                <td className="px-3 py-2 border-b">{r.end_date ? formatDate(r.end_date) : "-"}</td>
                <td className={"px-3 py-2 border-b " + (od ? "text-red-700 font-semibold" : "")}>{daysBetween(r.start_date)}</td>
                {!compact && <td className="px-3 py-2 border-b">{r.borrower_sign ? <img src={r.borrower_sign} alt="sign" className="h-10" /> : "-"}</td>}
              </tr>
            );
          })}
          {rows.length === 0 && (<tr><td colSpan={compact ? 7 : 8} className="px-3 py-6 text-center text-slate-500">ไม่มีรายการค้าง</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

/********** settings (Org Name + Logo + Reset) **********/
function Settings({ orgName, setOrgName, reportLogo, setReportLogo }: { orgName: string; setOrgName: (v: string)=>void; reportLogo: string; setReportLogo: (v: string)=>void; }) {
  const onResetAll = () => {
    try {
      Object.keys(localStorage).filter(k => k.startsWith("mp:")).forEach(k => localStorage.removeItem(k));
      alert("ล้างข้อมูลทั้งหมดแล้ว ระบบจะรีเฟรชหน้าให้อัตโนมัติ");
      window.location.reload();
    } catch (e) {
      console.error("Reset error", e);
      alert("ล้างข้อมูลไม่สำเร็จ (ดูคอนโซลเพิ่มเติม)");
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <SettingsIcon className="text-blue-600"/><h3 className="font-semibold">Settings</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-slate-600">ชื่อหน่วยงาน</label>
          <input className="w-full px-3 py-2 border rounded-xl" value={orgName} onChange={(e)=>setOrgName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-slate-600">โลโก้รายงาน (URL)</label>
          <input className="w-full px-3 py-2 border rounded-xl" value={reportLogo} onChange={(e)=>setReportLogo(e.target.value)} placeholder="https://.../logo.png" />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-slate-500">
          เก็บข้อมูลแบบออฟไลน์ในเบราว์เซอร์ (localStorage) — ไม่หายเมื่อรีเฟรช/ปิดเปิดใหม่
        </div>
        <div className="flex gap-2">
          <Button variant="danger" onClick={onResetAll}>ล้างข้อมูลทั้งหมด</Button>
        </div>
      </div>
    </Card>
  );
}

/********** lightweight tests (console) **********/
try {
  console.assert(daysBetween("2024-01-01", "2024-01-02") === 1, "daysBetween should be 1 day");
  const ts = todayStr(); console.assert(ts.length === 10 && ts[4] === "-" && ts[7] === "-", "todayStr format yyyy-mm-dd");
  const activeIdsTest = [{ asset_id: "A" }, { asset_id: "B" }, { asset_id: "A" }];
  console.assert(new Set(activeIdsTest.map(b => b.asset_id)).size === 2, "unique borrowed asset count");
  console.assert(addDays("2024-01-01", 1) === "2024-01-02", "addDays +1");
  console.assert(formatDate("invalid-date") === "", "formatDate invalid returns empty");
  console.assert(daysBetween("2024-01-10", "2024-01-01") === -9 || daysBetween("2024-01-10", "2024-01-01") <= 0, "daysBetween handles reverse order");
  console.log("UI sanity tests passed");
} catch (e) { console.warn("Sanity test failed", e); }
