import React, { useEffect, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import bwipjs from 'bwip-js/browser';
import { Plus, Search, X, Pencil, Trash2, Download, Upload, Check, WifiOff, ScanLine, ChevronUp, ChevronDown, Pin } from 'lucide-react';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './style.css';
import { isPromo, PromoForm, PromoTicket, type Promo } from './promos';
import { CODE_LIMIT, formats, isCodeFormat, validateCode, type CodeFormat, type ScannedCode } from './code-formats';
import { cardTone, presets } from './tone';
import { dictionaries, I18n, LANG_KEY, useT, type Lang, type Strings } from './i18n';

const CodeScanner = React.lazy(() => import('./CodeScanner'));

type Card = {id:string; store:string; label:string; number:string; format:CodeFormat; color:string; demo?:boolean};
const KEY='pockette.cards.v1';
const initial:Card[]=[
 {id:'demo-1',store:'IKEA',label:'IKEA Family',number:'6275981234567890',format:'code128',color:'#2B3A67',demo:true},
 {id:'demo-2',store:'Starbucks',label:'Starbucks Rewards',number:'6048123456789012',format:'code128',color:'#1F5F5B',demo:true},
 {id:'demo-3',store:'SEPHORA',label:'Beauty Insider',number:'2891045678901',format:'code128',color:'#762D46',demo:true},
 {id:'demo-4',store:'Tesco',label:'Clubcard',number:'6340041234567890',format:'code128',color:'#3A2A25',demo:true}
];
function isCard(c:unknown):c is Card {if(!c||typeof c!=='object')return false;const a=c as Card;return typeof a.id==='string'&&typeof a.store==='string'&&a.store.length>0&&a.store.length<=60&&typeof a.label==='string'&&a.label.length<=80&&typeof a.number==='string'&&a.number.length>0&&a.number.length<=CODE_LIMIT&&isCodeFormat(a.format)&&/^#[\da-f]{6}$/i.test(a.color)&&(a.demo===undefined||typeof a.demo==='boolean');}
type Data = { cards: Card[]; promos: Promo[] };
type Tab = 'cards' | 'coupons' | 'settings';
type Layout = 'stack' | 'tile';
type Appearance = 'system' | 'light' | 'dark';
const THEME_KEY = 'pockette.appearance';
const LAYOUT_KEY = 'pockette.layout';
const HINT_KEY = 'pockette.hint.grid';

function parseData(value: unknown): Data {
  const data = Array.isArray(value) ? { cards: value, promos: [] } : value as Partial<Data> | null;
  if (!data || !Array.isArray(data.cards) || !data.cards.every(isCard)
    || !Array.isArray(data.promos) || !data.promos.every(isPromo)) throw new Error('Invalid wallet');
  if (new Set(data.cards.map(c => c.id)).size !== data.cards.length
    || new Set(data.promos.map(p => p.id)).size !== data.promos.length) throw new Error('Duplicate IDs');
  return { cards: data.cards, promos: data.promos };
}

function load(): { data: Data; error: '' | 'read' } {
  try {
    const raw = localStorage.getItem(KEY);
    return { data: raw === null ? { cards: initial, promos: [] } : parseData(JSON.parse(raw)), error: '' };
  } catch {
    return { data: { cards: [], promos: [] }, error: 'read' };
  }
}

function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const saved = localStorage.getItem(key) as T | null;
    if (saved && allowed.includes(saved)) return saved;
  } catch { /* Preferences fall back to defaults. */ }
  return fallback;
}
const hintSeen = () => readPref(HINT_KEY, ['seen'], '') === 'seen';
function writePref(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* Kept for this session only. */ }
}

const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
function applyTheme(appearance: Appearance) {
  const dark = appearance === 'dark' || (appearance === 'system' && systemDark());
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#140C0F' : '#F8F6F4');
}

function codeError(number: string, format: CodeFormat, t: Strings) {
  const problem = validateCode(number, format, t);
  if (problem) return problem;
  try {
    bwipjs.toCanvas(document.createElement('canvas'), { bcid: format, text: number, scale: 2, height: 14 });
    return '';
  } catch {
    return t.cannotRender;
  }
}
/** "4820001277340" → "4820 0012 7734 0". Only digit runs are grouped; anything else shows as stored. */
const grouped = (n: string) => /^\d+$/.test(n) ? n.replace(/(\d{4})(?=\d)/g, '$1 ') : n;

function Code({card}:{card:Card}) {
  const t=useT();
  const ref=useRef<HTMLCanvasElement>(null);
  const [error,setError]=useState('');
  // paddingwidth keeps a quiet zone of at least 10 module widths each side.
  useEffect(()=>{try{bwipjs.toCanvas(ref.current!,{bcid:card.format,text:card.number,scale:3,height:18,paddingwidth:card.format==='qrcode'?4:12,paddingheight:4,backgroundcolor:'ffffff',barcolor:'000000',...(card.format==='qrcode'?{eclevel:'M'}:{})});setError('');}catch{setError(t.cannotDraw);}},[card,t]);
  return <div className="code-panel">{error?<p role="alert">{error}</p>:<canvas ref={ref} className={card.format==='qrcode'?'qr':''} role="img" aria-label={(card.format==='qrcode'?t.qrFor:t.barcodeFor)(card.store,card.number)}/>}<p className="code-value">{card.number}</p></div>;
}

function Modal({title,onClose,children,card}:{title:string;onClose:()=>void;children:React.ReactNode;card?:Card}) {
  const t=useT();const ref=useRef<HTMLDialogElement>(null);const titleId=useId();
  useEffect(()=>{const previous=document.activeElement as HTMLElement;ref.current?.showModal();return()=>{previous?.focus();};},[]);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}>
    {card
      ? <div className="modal-head card-head store-card" style={cardTone(card.color)}><div className="card-id"><h2 id={titleId}>{title}</h2>{card.label && <span className="card-category">{card.label}</span>}</div><button className="icon-button" aria-label={t.close} onClick={onClose}><X/></button></div>
      : <div className="modal-head"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label={t.close} onClick={onClose}><X/></button></div>}
    <div className="sheet-body">{children}</div>
  </dialog>;
}

const BarcodeGlyph = ({ size = 20 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 6v12M7 6v12M10 6v12M14 6v12M17 6v12M20 6v12" /></svg>;
const StackIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="4" y="3" width="16" height="6" rx="2" /><rect x="4" y="9" width="16" height="6" rx="2" /><rect x="4" y="15" width="16" height="6" rx="2" /></svg>;
const TileIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></svg>;
const CardsIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18" /></svg>;
const CouponIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" /><path d="M10 8v8" strokeDasharray="2 2" /></svg>;
const SettingsIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>;

const cardLabel = (t: Strings, card: Card) => t.openCard(card.store, card.label, !!card.demo);

/** CardStrip: a full-size card in the stack. The front card adds the code row. */
function CardStrip({ card, front, onClick }: { card: Card; front?: boolean; onClick?: () => void }) {
  // Without onClick it is a picture of a card (the editor's live preview), not a control.
  const t = useT();
  const Tag = onClick ? 'button' : 'div';
  return <Tag {...(onClick ? { type: 'button' as const, onClick, 'aria-label': cardLabel(t, card) } : {})} className={`store-card card-strip${front ? ' front' : ''}`} style={cardTone(card.color)}>
    <span className="card-id"><span className="card-name">{card.store}</span>{card.label && <span className="card-category">{card.label}</span>}</span>
    {front && <>
      <span className="card-rule" aria-hidden="true" />
      <span className="card-foot"><span><BarcodeGlyph />{t.tapToShow}</span><span className="card-number">{grouped(card.number)}</span></span>
    </>}
  </Tag>;
}

/** CardTile: the same card surface at grid size. */
function CardTile({ card, onClick }: { card: Card; onClick: () => void }) {
  const t = useT();
  return <button type="button" className="store-card card-tile" style={cardTone(card.color)} onClick={onClick} aria-label={cardLabel(t, card)}>
    <span className="card-glyph"><BarcodeGlyph size={18} /></span>
    <span className="card-id"><span className="card-name">{card.store}</span>{card.label && <span className="card-category">{card.label}</span>}</span>
  </button>;
}

function PrimaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`primary-button ${className}`} {...props}>
    <span className="plus-ring" aria-hidden="true"><Plus size={14} strokeWidth={1.8} /></span>{children}
  </button>;
}

function Segmented<T extends string>({ label, value, options, onChange, icons }: {
  label: string; value: T; options: { value: T; label: string; icon?: React.ReactNode }[]; onChange: (v: T) => void; icons?: boolean;
}) {
  return <div className={`segmented${icons ? ' icons' : ''}`} role="group" aria-label={label}>
    {options.map(o => <button key={o.value} type="button" aria-pressed={value === o.value} aria-label={o.icon ? o.label : undefined} onClick={() => onChange(o.value)}>{o.icon ?? o.label}</button>)}
  </div>;
}
function LayoutSwitch({ value, onChange }: { value: Layout; onChange: (v: Layout) => void }) {
  const t = useT();
  return <Segmented label={t.cardLayout} icons value={value} onChange={onChange} options={[{ value: 'stack', label: t.stackView, icon: <StackIcon /> }, { value: 'tile', label: t.tileView, icon: <TileIcon /> }]} />;
}

function SearchField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const t = useT();
  return <label className="search-field"><Search size={20} strokeWidth={1.6} aria-hidden="true" />
    <input type="search" aria-label={label} placeholder={label} value={value} onChange={e => onChange(e.target.value)} />
    {value && <button type="button" className="icon-button" aria-label={t.clearSearch} onClick={() => onChange('')}><X size={16} /></button>}
  </label>;
}

function Editor({ card, onSave, onClose }: { card?: Card; onSave: (c: Card) => void; onClose: () => void }) {
  const t = useT();
  const [store, setStore] = useState(card?.store ?? '');
  const [label, setLabel] = useState(card?.label ?? '');
  const [number, setNumber] = useState(card?.number ?? '');
  const [format, setFormat] = useState<CodeFormat>(card?.format ?? 'code128');
  const [color, setColor] = useState(card?.color ?? presets[0].color);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState('');
  const scanButton = useRef<HTMLButtonElement>(null);
  const storeInput = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<'scan' | 'store' | null>(null);
  // A card saved with an older colour keeps it as a choice until it is changed.
  const swatches = presets.map(p => ({ name: t.colours[p.name], color: p.color as string }));
  if (card && !presets.some(p => p.color.toLowerCase() === card.color.toLowerCase())) swatches.push({ name: t.currentColour, color: card.color });

  useEffect(() => {
    if (scanning) return;
    if (returnFocus.current === 'scan') scanButton.current?.focus();
    if (returnFocus.current === 'store') storeInput.current?.focus();
    returnFocus.current = null;
  }, [scanning]);

  function backToForm() {
    returnFocus.current = 'scan';
    setScanning(false);
  }

  function useCode(code: ScannedCode) {
    const problem = codeError(code.number, code.format, t);
    if (problem) {
      setError(problem);
      backToForm();
      return;
    }
    setNumber(code.number);
    setFormat(code.format);
    setError('');
    setScanNotice(t.scanned(formats[code.format]));
    returnFocus.current = store.trim() ? 'scan' : 'store';
    setScanning(false);
  }

  const preview: Card = { id: 'preview', store: store.trim() || t.storeName, label: label.trim(), number: number || '0000 0000', format, color };
  return <Modal title={scanning ? t.scanCode : card ? t.editCard : t.addCard} onClose={scanning ? backToForm : onClose}>
    {scanning ? <React.Suspense fallback={<p role="status">{t.openingScanner}</p>}>
      <CodeScanner onCode={useCode} onBack={backToForm} />
    </React.Suspense> : <>
      <div className="preview" aria-hidden="true"><CardStrip card={preview} /></div>
      <button ref={scanButton} className="outline-button scan-launch" type="button" onClick={() => {
        setScanNotice('');
        setScanning(true);
      }}><ScanLine size={19} aria-hidden="true" />{t.scanButton}</button>
      {scanNotice && <p className="banner" role="status">{scanNotice}</p>}
      <form onSubmit={e => {
        e.preventDefault();
        const err = codeError(number, format, t);
        if (err) { setError(err); return; }
        onSave({ id: card?.id ?? crypto.randomUUID(), store: store.trim(), label: label.trim(), number, format, color, demo: card?.demo });
      }}>
        <label>{t.storeName}<input ref={storeInput} autoFocus required maxLength={60} value={store} onChange={e => setStore(e.target.value)} placeholder={t.storePlaceholder} pattern={'.*\\S.*'} /></label>
        <label>{t.cardName} <span className="small">{t.optional}</span><input maxLength={80} value={label} onChange={e => setLabel(e.target.value)} placeholder={t.cardNamePlaceholder} /></label>
        <label>{t.codeFormat}<select value={format} onChange={e => { setFormat(e.target.value as CodeFormat); setError(''); }}>
          {Object.entries(formats).map(([value, name]) => <option key={value} value={value}>{value === 'qrcode' ? name : t.barcodeFormat(name)}</option>)}
        </select></label>
        <label>{t.cardNumber}
          {format === 'qrcode'
            ? <textarea required value={number} maxLength={CODE_LIMIT} rows={2} onChange={e => { setNumber(e.target.value); setError(''); }} autoCapitalize="off" spellCheck={false} placeholder={t.cardNumberPlaceholder}  />
            : <input required value={number} maxLength={CODE_LIMIT} onChange={e => { setNumber(e.target.value); setError(''); }} autoCapitalize="off" spellCheck={false} placeholder={t.cardNumberPlaceholder}  />}
        </label>
        <fieldset><legend>{t.cardColour}</legend><div className="swatches">{swatches.map(s => <button type="button" key={s.color} style={cardTone(s.color)} className="swatch" aria-label={s.name} aria-pressed={color.toLowerCase() === s.color.toLowerCase()} onClick={() => setColor(s.color)}>{color.toLowerCase() === s.color.toLowerCase() && <Check size={18} />}</button>)}</div></fieldset>
        {error && <p role="alert" className="error">{error}</p>}
        <PrimaryButton type="submit">{card ? t.saveChanges : t.addToWallet}</PrimaryButton>
      </form>
    </>}
  </Modal>;
}

function App() {
  const [loaded] = useState(load);
  const [data, setData] = useState(loaded.data);
  const [storageError, setStorageError] = useState<'' | 'read' | 'save'>(loaded.error);
  const [lang, setLang] = useState<Lang>(() => readPref(LANG_KEY, ['en', 'uk'] as Lang[], navigator.language.toLowerCase().startsWith('uk') ? 'uk' : 'en'));
  const t = dictionaries[lang];
  const [appearance, setAppearance] = useState<Appearance>(() => readPref(THEME_KEY, ['light', 'dark'] as Appearance[], 'system'));
  const [layout, setLayout] = useState<Layout>(() => readPref(LAYOUT_KEY, ['stack', 'tile'] as const, 'stack'));
  const [tab, setTab] = useState<Tab>('cards');
  const [query, setQuery] = useState('');
  const [reordering, setReordering] = useState(false);
  const [hint, setHint] = useState(false);
  const [selected, setSelected] = useState<Card | null>(null);
  const [editor, setEditor] = useState<{ card?: Card } | null>(null);
  const [promoEditor, setPromoEditor] = useState<{ promo?: Promo } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);
  const inputRef = useRef<HTMLInputElement>(null);
  const { cards, promos } = data;

  useEffect(() => {
    applyTheme(appearance);
    if (appearance !== 'system') return;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => applyTheme('system');
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [appearance]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  function chooseAppearance(next: Appearance) {
    setAppearance(next);
    writePref(THEME_KEY, next === 'system' ? null : next);
  }
  function chooseLang(next: Lang) {
    setLang(next);
    writePref(LANG_KEY, next);
  }
  function chooseLayout(next: Layout) {
    setLayout(next);
    writePref(LAYOUT_KEY, next);
    if (next === 'tile') dismissHint();
  }
  function dismissHint() {
    setHint(false);
    writePref(HINT_KEY, 'seen');
  }
  function go(next: Tab) {
    setTab(next);
    setQuery('');
    setReordering(false);
    window.scrollTo(0, 0);
  }

  function commit(next: Data, message: string) {
    try {
      if (storageError) throw Error();
      localStorage.setItem(KEY, JSON.stringify(next));
      setData(next);
      setNotice(message);
      return true;
    } catch {
      setStorageError('save');
      setNotice(t.saveError);
      return false;
    }
  }

  function move(id: string, by: -1 | 1) {
    const from = cards.findIndex(c => c.id === id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= cards.length) return;
    const next = [...cards];
    [next[from], next[to]] = [next[to], next[from]];
    commit({ ...data, cards: next }, (by < 0 ? t.movedUp : t.movedDown)(cards[from].store));
  }

  function exportWallet() {
    try {
      const raw = storageError ? localStorage.getItem(KEY) : JSON.stringify(data, null, 2);
      const url = URL.createObjectURL(new Blob([raw ?? '{}'], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'pockette-backup.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(t.backupDownloaded);
    } catch { setNotice(t.storageUnavailable); }
  }

  async function importWallet(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1000000) throw Error();
      const incoming = parseData(JSON.parse(await file.text()));
      if (incoming.cards.length + incoming.promos.length > 1000
        || incoming.cards.some(c => !!codeError(c.number, c.format, t))) throw Error();
      const next = { cards: [...cards], promos: [...promos] };
      let added = 0;
      for (const c of incoming.cards) {
        if (next.cards.some(n => n.store === c.store && n.number === c.number && n.format === c.format)) continue;
        next.cards.push({ ...c, id: crypto.randomUUID() });
        added++;
      }
      for (const p of incoming.promos) {
        if (next.promos.some(n => n.store.toLowerCase() === p.store.toLowerCase() && n.code === p.code)) continue;
        next.promos.push({ ...p, id: crypto.randomUUID() });
        added++;
      }
      commit(next, t.imported(added));
    } catch { setNotice(t.invalidBackup); }
    finally { if (inputRef.current) inputRef.current.value = ''; }
  }

  const normalized = query.toLowerCase().trim();
  const filteredCards = cards.filter(c => `${c.store} ${c.label}`.toLowerCase().includes(normalized));
  const filteredPromos = promos.filter(p => `${p.store} ${p.code} ${p.offer}`.toLowerCase().includes(normalized));
  const open = (card: Card) => { setSelected(card); setDeleting(false); };
  const addCard = () => setEditor({});
  const addPromo = () => setPromoEditor({});

  const banners = <>
    {offline && <p className="banner"><WifiOff size={16} aria-hidden="true" />{t.offline}</p>}
    {storageError && <p className="error" role="alert">{storageError === 'read' ? t.readError : t.saveError}</p>}
  </>;

  function cardsScreen() {
    if (!cards.length) return <div className="empty">
      <h2>{t.noCards}</h2>
      <p>{t.noCardsText}</p>
      <PrimaryButton onClick={addCard}>{t.addFirstCard}</PrimaryButton>
    </div>;
    if (!filteredCards.length) return <div className="empty">
      <h2>{t.noMatches}</h2>
      <p>{t.nothingMatches(query.trim())}</p>
      <button className="text-button" onClick={() => setQuery('')}>{t.resetSearch}</button>
      <PrimaryButton onClick={addCard}>{t.addCard}</PrimaryButton>
    </div>;
    if (reordering) return <ul className="reorder-list" aria-label={t.reorderCards}>
      {cards.map((card, i) => <li key={card.id} className="reorder-row" style={cardTone(card.color)}>
        <span className="reorder-swatch" aria-hidden="true" />
        <span className="card-id"><span className="card-name">{card.store}</span>{card.label && <span className="card-category">{card.label}</span>}</span>
        <button className="icon-button" aria-label={t.moveUp(card.store)} disabled={i === 0} onClick={() => move(card.id, -1)}><ChevronUp size={20} /></button>
        <button className="icon-button" aria-label={t.moveDown(card.store)} disabled={i === cards.length - 1} onClick={() => move(card.id, 1)}><ChevronDown size={20} /></button>
      </li>)}
    </ul>;
    return layout === 'stack' ? <>
      <ul className="card-stack">
        {filteredCards.map((card, i) => <li key={card.id}><CardStrip card={card} front={i === filteredCards.length - 1} onClick={() => open(card)} /></li>)}
      </ul>
      <PrimaryButton className="home-add" onClick={addCard}>{t.addCard}</PrimaryButton>
    </> : <ul className="card-grid">
      {filteredCards.map(card => <li key={card.id}><CardTile card={card} onClick={() => open(card)} /></li>)}
      <li><button className="add-tile" onClick={addCard}><span className="plus-disc" aria-hidden="true"><Plus size={16} strokeWidth={1.8} /></span>{t.addCard}</button></li>
    </ul>;
  }

  return <I18n.Provider value={t}>
    <a className="skip-link" href="#screen">{t.skip}</a>
    <div className="app">
      <header className="header">
        <a className="wordmark" href="/" aria-label={t.home}>Pockette<span aria-hidden="true">.</span></a>
        {tab === 'cards' && !reordering && <LayoutSwitch value={layout} onChange={chooseLayout} />}
      </header>
      <div className="hairline" aria-hidden="true" />
      <main id="screen">
        {tab === 'cards' && <>
          <p className="eyebrow">{t.cardCount(cards.length)} · {t.readyOffline}</p>
          <h1 className="screen-title">{t.yourCards}</h1>
          {cards.length > 0 && !reordering && <SearchField label={t.searchCards} value={query} onChange={setQuery} />}
          {banners}
          <p className="sr-only" role="status">{t.cardsFound(filteredCards.length)}</p>
          {cards.length > 1 && !normalized && <div className="section-row">
            <h2 className="section-label">{reordering ? t.moveCards : t.inYourOrder}</h2>
            <button className="text-button" aria-pressed={reordering} onClick={() => setReordering(!reordering)}>{reordering ? t.done : t.reorder}</button>
          </div>}
          {hint && layout === 'stack' && !reordering && <div className="hint" role="status">
            <p>{t.gridHint}</p>
            <button className="text-button" onClick={() => chooseLayout('tile')}>{t.useGrid}</button>
            <button className="icon-button" aria-label={t.dismissTip} onClick={dismissHint}><X size={16} /></button>
          </div>}
          {cardsScreen()}
        </>}

        {tab === 'coupons' && <>
          <p className="eyebrow">{t.couponCount(promos.length)} · {t.readyOffline}</p>
          <h1 className="screen-title">{t.coupons}</h1>
          {promos.length > 0 && <SearchField label={t.searchCoupons} value={query} onChange={setQuery} />}
          {banners}
          <p className="sr-only" role="status">{t.couponsFound(filteredPromos.length)}</p>
          {filteredPromos.length > 0 ? <>
            <div className="section-row"><h2 className="section-label">{t.savedCodes}</h2></div>
            <ul className="coupon-list">{filteredPromos.map(promo => <li key={promo.id}><PromoTicket key={promo.code} promo={promo} onEdit={() => setPromoEditor({ promo })} onNotice={setNotice} /></li>)}</ul>
            <PrimaryButton className="home-add" onClick={addPromo}>{t.addCoupon}</PrimaryButton>
          </> : <div className="empty">
            <h2>{normalized ? t.noMatches : t.noCoupons}</h2>
            <p>{normalized ? t.nothingMatches(query.trim()) : t.noCouponsText}</p>
            {normalized ? <button className="text-button" onClick={() => setQuery('')}>{t.resetSearch}</button>
              : <PrimaryButton onClick={addPromo}>{t.addCoupon}</PrimaryButton>}
          </div>}
        </>}

        {tab === 'settings' && <>
          <p className="eyebrow">{t.storedHere}</p>
          <h1 className="screen-title">{t.settings}</h1>
          {banners}
          <section className="settings-group" aria-labelledby="set-display">
            <h2 id="set-display">{t.display}</h2>
            <ul className="group">
              <li className="row"><span className="row-text">{t.language}</span>
                <Segmented label={t.language} value={lang} onChange={chooseLang} options={[{ value: 'en', label: 'English' }, { value: 'uk', label: 'Українська' }]} /></li>
              <li className="row"><span className="row-text">{t.appearance}</span>
                <Segmented label={t.appearance} value={appearance} onChange={chooseAppearance} options={[{ value: 'system', label: t.system }, { value: 'light', label: t.light }, { value: 'dark', label: t.dark }]} /></li>
              <li className="row"><span className="row-text">{t.defaultLayout}</span>
                <Segmented label={t.defaultLayout} value={layout} onChange={chooseLayout} options={[{ value: 'stack', label: t.stack }, { value: 'tile', label: t.tile }]} /></li>
            </ul>
          </section>
          <section className="settings-group" aria-labelledby="set-backup">
            <h2 id="set-backup">{t.backupRestore}</h2>
            <ul className="group">
              <li><button className="row" onClick={exportWallet}><span className="row-text">{t.backUp}<small>{t.backUpText}</small></span><Download size={18} className="chevron" aria-hidden="true" /></button></li>
              <li><button className="row" onClick={() => inputRef.current?.click()}><span className="row-text">{t.importBackup}<small>{t.importText}</small></span><Upload size={18} className="chevron" aria-hidden="true" /></button></li>
            </ul>
            <p className="settings-note">{t.backupNote}</p>
          </section>
        </>}
      </main>
      {/* Mounted on every tab so an import finishing after a tab switch still lands. */}
      <input ref={inputRef} hidden type="file" accept=".json,application/json" aria-label={t.importFile} onChange={e => void importWallet(e.target.files?.[0])} />
    </div>

    <nav className="tabbar" aria-label={t.mainNav}>
      <ul>
        <li><button aria-current={tab === 'cards' ? 'page' : undefined} onClick={() => go('cards')}><CardsIcon />{t.tabCards}</button></li>
        <li><button aria-current={tab === 'coupons' ? 'page' : undefined} onClick={() => go('coupons')}><CouponIcon />{t.tabCoupons}</button></li>
        <li><button aria-current={tab === 'settings' ? 'page' : undefined} onClick={() => go('settings')}><SettingsIcon />{t.tabSettings}</button></li>
      </ul>
    </nav>

    <p className={`notice${notice ? ' visible' : ''}`} role="status">{notice}</p>
    {editor && <Editor card={editor.card} onClose={() => setEditor(null)} onSave={card => {
      const next = editor.card ? cards.map(c => c.id === card.id ? card : c) : [...cards, card];
      if (!commit({ ...data, cards: next }, editor.card ? t.cardUpdated : t.cardAdded)) return;
      setEditor(null);
      if (!editor.card && next.length === 9 && layout === 'stack' && !hintSeen()) setHint(true);
    }} />}
    {promoEditor && <Modal title={promoEditor.promo ? t.editCoupon : t.addCoupon} onClose={() => setPromoEditor(null)}>
      <PromoForm promo={promoEditor.promo} onSave={promo => {
        const next = promoEditor.promo ? promos.map(p => p.id === promo.id ? promo : p) : [...promos, promo];
        if (commit({ ...data, promos: next }, t.couponSaved)) setPromoEditor(null);
      }} onRemove={() => {
        if (commit({ ...data, promos: promos.filter(p => p.id !== promoEditor.promo?.id) }, t.couponRemoved)) setPromoEditor(null);
      }} />
    </Modal>}
    {selected && (deleting
      ? <Modal title={t.removeCardQ} onClose={() => setSelected(null)}>
        <p>{t.removeCardText(selected.store)}</p>
        <div className="actions"><button className="outline-button" onClick={() => setDeleting(false)}>{t.keepCard}</button>
          <button className="outline-button danger-button" onClick={() => {
            if (commit({ ...data, cards: cards.filter(c => c.id !== selected.id) }, t.cardRemoved)) setSelected(null);
          }}><Trash2 size={17} aria-hidden="true" />{t.removeCard}</button></div>
      </Modal>
      : <Modal title={selected.store} card={selected} onClose={() => setSelected(null)}>
        {selected.demo && <p className="banner"><Pin size={15} aria-hidden="true" />{t.demoCard}</p>}
        <Code card={selected} />
        <div className="actions">
          <button className="outline-button" onClick={() => { setEditor({ card: selected }); setSelected(null); }}><Pencil size={17} aria-hidden="true" />{t.editCard}</button>
          <button className="text-button" onClick={() => setDeleting(true)}><Trash2 size={17} aria-hidden="true" />{t.delete}</button>
        </div>
      </Modal>)}
  </I18n.Provider>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
