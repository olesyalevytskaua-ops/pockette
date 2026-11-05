import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, ScanLine } from 'lucide-react';
import {
  BarcodeFormat, BinaryBitmap, DecodeHintType, HTMLCanvasElementLuminanceSource,
  HybridBinarizer, MultiFormatReader, NotFoundException,
} from '@zxing/library';
import { formats, validateCode, type CodeFormat, type ScannedCode } from './code-formats';
import { useT } from './i18n';

const supported = new Map<BarcodeFormat, CodeFormat>([
  [BarcodeFormat.CODE_128, 'code128'],
  [BarcodeFormat.EAN_13, 'ean13'],
  [BarcodeFormat.EAN_8, 'ean8'],
  [BarcodeFormat.UPC_A, 'upca'],
  [BarcodeFormat.CODE_39, 'code39'],
  [BarcodeFormat.QR_CODE, 'qrcode'],
]);

function makeReader(photo = false) {
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [...supported.keys()]);
  if (photo) hints.set(DecodeHintType.TRY_HARDER, true);
  const reader = new MultiFormatReader();
  reader.setHints(hints);
  return reader;
}

function readCanvas(reader: MultiFormatReader, canvas: HTMLCanvasElement, invert = false): ScannedCode | null {
  try {
    const source = new HTMLCanvasElementLuminanceSource(canvas);
    const result = reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(invert ? source.invert() : source)));
    const format = supported.get(result.getBarcodeFormat());
    return format ? { number: result.getText(), format } : null;
  } catch (error) {
    if (error instanceof NotFoundException) return null;
    throw error;
  }
}

function drawFrame(canvas: HTMLCanvasElement, image: CanvasImageSource, width: number, height: number, limit: number, turn = 0) {
  const scale = Math.min(1, limit / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const targetWidth = turn % 2 ? h : w;
  const targetHeight = turn % 2 ? w : h;
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(turn * Math.PI / 2);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export default function CodeScanner({ onCode, onBack }: { onCode: (code: ScannedCode) => void; onBack: () => void }) {
  const t = useT();
  const [mode, setMode] = useState<'idle' | 'starting' | 'camera' | 'photo'>('idle');
  const [message, setMessage] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const session = useRef<{ id: number; stream?: MediaStream; timer?: number }>({ id: 0 });

  function stop() {
    const current = session.current;
    window.clearTimeout(current.timer);
    current.stream?.getTracks().forEach(track => track.stop());
    session.current = { id: current.id + 1 };
    if (video.current) video.current.srcObject = null;
  }

  useEffect(() => {
    const onPageHide = () => {
      stop();
      setMode('idle');
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      stop();
    };
  }, []);

  function finish(code: ScannedCode) {
    stop();
    const problem = validateCode(code.number, code.format, t);
    if (problem) {
      setMode('idle');
      setMessage(`${t.detected(formats[code.format])} ${problem}`);
      return;
    }
    onCode(code);
  }

  async function startCamera() {
    setMessage('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage(t.cameraUnavailable);
      return;
    }
    stop();
    const id = session.current.id;
    setMode('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      });
      if (session.current.id !== id || !video.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      session.current.stream = stream;
      const preview = video.current;
      preview.srcObject = stream;
      setMode('camera');
      await preview.play();
      if (session.current.id !== id) return;
      const reader = makeReader();
      const canvas = document.createElement('canvas');
      const tick = () => {
        if (session.current.id !== id) return;
        try {
          if (preview.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && preview.videoWidth > 0) {
            drawFrame(canvas, preview, preview.videoWidth, preview.videoHeight, 960);
            const result = readCanvas(reader, canvas);
            if (result) { finish(result); return; }
          }
          session.current.timer = window.setTimeout(tick, 220);
        } catch {
          stop();
          setMode('idle');
          setMessage(t.previewUnreadable);
        }
      };
      stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
        if (session.current.id !== id) return;
        stop();
        setMode('idle');
        setMessage(t.cameraStopped);
      }, { once: true }));
      tick();
    } catch (error) {
      if (session.current.id !== id) return;
      stop();
      setMode('idle');
      setMessage(error instanceof DOMException && error.name === 'NotAllowedError'
        ? t.cameraBlocked
        : t.cameraFailed);
    }
  }

  async function scanPhoto(file: File) {
    stop();
    setMessage('');
    if (file.size > 25 * 1024 * 1024) {
      setMode('idle');
      setMessage(t.photoTooLarge);
      return;
    }
    const id = session.current.id;
    setMode('photo');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (session.current.id !== id) return;
      const reader = makeReader(true);
      const canvas = document.createElement('canvas');
      for (let turn = 0; turn < 4; turn++) {
        drawFrame(canvas, image, image.naturalWidth, image.naturalHeight, 1800, turn);
        const result = readCanvas(reader, canvas) ?? readCanvas(reader, canvas, true);
        if (result) { finish(result); return; }
      }
      setMode('idle');
      setMessage(t.noCodeFound);
    } catch {
      if (session.current.id !== id) return;
      setMode('idle');
      setMessage(t.imageUnreadable);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const cameraActive = mode === 'starting' || mode === 'camera';

  return <section className="scanner" aria-label={t.scanRegion}>
    <p>{t.scanIntro}</p>
    <div className="scan-preview" hidden={mode !== 'camera'}>
      <video ref={video} muted playsInline aria-label={t.livePreview} />
      <div className="scan-guide" aria-hidden="true"><ScanLine size={44} /></div>
    </div>
    <div className="scan-actions">
      <button className="primary-button" type="button" disabled={mode === 'photo'} onClick={() => {
        if (cameraActive) { stop(); setMode('idle'); }
        else void startCamera();
      }}><Camera size={18} aria-hidden="true" />{cameraActive ? t.stopCamera : t.useCamera}</button>
      <button className="outline-button" type="button" disabled={mode === 'photo'} onClick={() => {
        if (cameraActive) { stop(); setMode('idle'); }
        photoInput.current?.click();
      }}><ImagePlus size={18} aria-hidden="true" />{t.choosePhoto}</button>
      <input ref={photoInput} hidden type="file" accept="image/*" aria-label={t.photoInput} onChange={e => {
        const file = e.currentTarget.files?.[0];
        e.currentTarget.value = '';
        if (file) void scanPhoto(file);
      }} />
    </div>
    <p role="status" className="scan-status">{mode === 'starting' ? t.waitingCamera
      : mode === 'camera' ? t.holdSteady
      : mode === 'photo' ? t.readingPhoto : ''}</p>
    {message && <p role="alert" className="error">{message}</p>}
    <p className="small">{t.photosStay}</p>
    <button className="text-button scan-back" type="button" onClick={onBack}>{t.backToManual}</button>
  </section>;
}
