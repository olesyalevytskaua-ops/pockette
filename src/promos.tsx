import { useState } from 'react';
import { Check, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useT } from './i18n';

export type Promo = { id: string; store: string; code: string; offer: string; expires: string };

export function isPromo(value: unknown): value is Promo {
  if (!value || typeof value !== 'object') return false;
  const p = value as Promo;
  return typeof p.id === 'string' && !!p.id
    && typeof p.store === 'string' && !!p.store.trim() && p.store.length <= 60
    && typeof p.code === 'string' && !!p.code.trim() && p.code.length <= 100 && !/[\r\n]/.test(p.code)
    && typeof p.offer === 'string' && p.offer.length <= 100
    && typeof p.expires === 'string' && (!p.expires || isExpiry(p.expires));
}

function isExpiry(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value;
}

export function PromoForm({ promo, onSave, onRemove }: {
  promo?: Promo; onSave: (promo: Promo) => void; onRemove: () => void;
}) {
  const t = useT();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  if (promo && removing) return <>
    <p>{t.removeCodeFor(promo.store)}</p>
    <div className="actions">
      <button className="outline-button" onClick={() => setRemoving(false)}>{t.cancel}</button>
      <button className="outline-button danger-button" onClick={onRemove}><Trash2 size={16} aria-hidden="true" />{t.removePromo}</button>
    </div>
  </>;
  return <form onSubmit={e => {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    const next = {
      id: promo?.id ?? crypto.randomUUID(),
      store: String(fields.get('store')).trim(),
      code: String(fields.get('code')).trim(),
      offer: String(fields.get('offer')).trim(),
      expires: String(fields.get('expires')),
    };
    if (!isPromo(next)) { setError(t.checkPromo); return; }
    onSave(next);
  }}>
    <label>{t.storeName}<input name="store" autoFocus required maxLength={60} defaultValue={promo?.store} placeholder={t.promoStorePlaceholder} /></label>
    <label>{t.promoCode}<input name="code" required maxLength={100} defaultValue={promo?.code} placeholder={t.promoCodePlaceholder} autoCapitalize="off" spellCheck={false} /></label>
    <label>{t.offer} <span className="small">{t.optional}</span><input name="offer" maxLength={100} defaultValue={promo?.offer} placeholder={t.offerPlaceholder} /></label>
    <label>{t.expiry} <span className="small">{t.optional}</span><input name="expires" type="date" max="9999-12-31" defaultValue={promo?.expires} /></label>
    {error && <p role="alert" className="error">{error}</p>}
    <button className="primary-button" type="submit"><span className="plus-ring" aria-hidden="true">{promo ? <Check size={14} /> : <Plus size={14} strokeWidth={1.8} />}</span>{promo ? t.saveChanges : t.savePromo}</button>
    {promo && <div className="actions"><button className="text-button" type="button" onClick={() => setRemoving(true)}><Trash2 size={16} aria-hidden="true" />{t.delete}</button></div>}
  </form>;
}

export function PromoTicket({ promo, onEdit, onNotice }: {
  promo: Promo; onEdit: () => void; onNotice: (message: string) => void;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const expiry = promo.expires ? new Date(promo.expires + 'T23:59:59.999') : null;
  const expired = expiry && +expiry < Date.now();
  const daysLeft = expiry ? Math.ceil((+expiry - Date.now()) / 86400000) : Infinity;
  const date = expiry?.toLocaleDateString(t.locale, { day: 'numeric', month: 'short', year: 'numeric' });
  return <article className="coupon">
    <div className="coupon-head">
      <div><h2>{promo.store}</h2>{promo.offer && <p className="coupon-offer">{promo.offer}</p>}</div>
      <button className="icon-button" aria-label={t.editPromoFor(promo.store)} onClick={onEdit}><Pencil size={17} /></button>
    </div>
    <div className="coupon-code">
      <code>{promo.code}</code>
      <button className="outline-button" aria-label={t.copyPromoFor(promo.store)} onClick={async () => {
        try {
          await navigator.clipboard.writeText(promo.code);
          setCopied(true);
          onNotice(t.promoCopied);
        } catch { onNotice(t.copyUnavailable); }
      }}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copied ? t.copied : t.copy}</button>
    </div>
    {expiry && <p className={`coupon-meta${expired ? ' expired' : ''}`}>
      <span>{expired ? t.expired : t.until}{' '}<time dateTime={promo.expires}>{date}</time></span>
      {!expired && daysLeft <= 7 && <span className="chip">{t.expiringSoon}</span>}
    </p>}
  </article>;
}
