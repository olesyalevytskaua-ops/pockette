import { useEffect, useState } from 'react';
import { useT } from './i18n';

const KEY = 'pockette.splash';
/** How long the splash holds before fading; its animation ends just before this. */
const HOLD_MS = 2400;
const FADE_MS = 350;

/** Once per launch: a new tab or a reopened app shows it, a reload in the same session does not. */
export function shouldShowSplash() {
  try {
    if (sessionStorage.getItem(KEY)) return false;
    sessionStorage.setItem(KEY, 'shown');
  } catch { /* Without storage it shows on every load; it is short and skippable. */ }
  return true;
}

/**
 * Launch splash from the "Splash screen · dark" design, at a third of its 1290px artboard,
 * with its animation compressed so it never stands between someone and their barcode.
 * Any tap or key skips it.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [leaving, setLeaving] = useState(false);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const hold = setTimeout(() => setLeaving(true), reduced ? 500 : HOLD_MS);
    const skip = () => setLeaving(true);
    window.addEventListener('keydown', skip);
    return () => { clearTimeout(hold); window.removeEventListener('keydown', skip); };
  }, [reduced]);

  useEffect(() => {
    if (!leaving) return;
    const done = setTimeout(onDone, reduced ? 0 : FADE_MS);
    return () => clearTimeout(done);
  }, [leaving, onDone, reduced]);

  return <div className={`splash${leaving ? ' leaving' : ''}`} aria-hidden="true" onPointerDown={() => setLeaving(true)}>
    <div className="splash-mark">
      <div className="splash-icon">
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <rect className="splash-stroke" pathLength={1} x="24" y="22" width="52" height="30" rx="7" />
          <rect className="splash-stroke s2" pathLength={1} x="16" y="34" width="68" height="46" rx="9" />
          <rect className="splash-stroke s3" pathLength={1} x="60" y="50" width="24" height="16" rx="5" />
          <circle className="splash-stroke s4" pathLength={1} cx="68" cy="58" r="2.6" />
        </svg>
        <span className="splash-sheen" />
      </div>
      <div className="splash-word">Pockette<span className="splash-dot">.</span></div>
      <div className="splash-line" />
    </div>
    <p className="splash-tagline">{t.splashTagline}</p>
  </div>;
}
