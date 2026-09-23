'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
import { Button } from './ui';

/**
 * In-page camera QR scanner.
 * Uses the browser's BarcodeDetector when available (Chrome / Android),
 * otherwise falls back to jsQR on a canvas (works on iOS Safari too).
 * The attendance QR holds only plain text like "DBG-472".
 */

type ScanState = 'idle' | 'starting' | 'live' | 'denied' | 'unsupported' | 'error';

interface Detector {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

export function QrScanner({ onCode, autoStart = false }: { onCode: (text: string) => void; autoStart?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const onCodeRef = useRef(onCode);
  const [state, setState] = useState<ScanState>('idle');

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState((s) => (s === 'live' || s === 'starting' ? 'idle' : s));
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      return;
    }
    setState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setState('live');

      const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
      const detector = Ctor ? new Ctor({ formats: ['qr_code'] }) : null;
      const jsQR = detector ? null : (await import('jsqr')).default;
      let lastTick = 0;

      const tick = async (now: number) => {
        rafRef.current = requestAnimationFrame(tick);
        if (now - lastTick < 180 || video.readyState < 2) return;
        lastTick = now;
        let text = '';
        try {
          if (detector) {
            const codes = await detector.detect(video);
            text = codes[0]?.rawValue ?? '';
          } else if (jsQR && canvasRef.current) {
            const c = canvasRef.current;
            const w = (c.width = video.videoWidth);
            const h = (c.height = video.videoHeight);
            const ctx = c.getContext('2d', { willReadFrequently: true });
            if (!ctx || !w || !h) return;
            ctx.drawImage(video, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            text = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })?.data ?? '';
          }
        } catch {
          return;
        }
        if (!text) return;
        const t = Date.now();
        if (text === lastRef.current.text && t - lastRef.current.at < 2500) return; // same code, ignore repeats
        lastRef.current = { text, at: t };
        navigator.vibrate?.(60);
        onCodeRef.current(text);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    }
  }, []);

  useEffect(() => {
    if (autoStart) start();
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [autoStart, start]);

  const live = state === 'live' || state === 'starting';

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-neutral-800 bg-black sm:aspect-[4/3]">
        <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${live ? '' : 'hidden'}`} />
        <canvas ref={canvasRef} className="hidden" />

        {live && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-2/3 w-2/3 max-w-[280px] rounded-lg border border-white/10">
              {['left-0 top-0 border-l-2 border-t-2', 'right-0 top-0 border-r-2 border-t-2', 'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((p) => (
                <span key={p} className={`absolute h-7 w-7 border-red-500 ${p}`} />
              ))}
              <span className="absolute inset-x-2 top-1/2 h-0.5 animate-pulse bg-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.9)]" />
            </div>
          </div>
        )}

        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <ScanLine className="h-12 w-12 text-neutral-700" />
            <p className="max-w-xs font-mono text-xs leading-relaxed text-neutral-400">
              {state === 'denied' && 'Camera permission was blocked. Allow camera access in the browser settings, or search by Team ID below.'}
              {state === 'unsupported' && 'This browser cannot open the camera. Use the search box below.'}
              {state === 'error' && 'Could not start the camera. Try again, or search by Team ID below.'}
              {state === 'idle' && 'Point the camera at the QR on the team’s Entry Visa.'}
            </p>
            {state !== 'unsupported' && (
              <Button variant="primary" onClick={start}>
                <Camera className="h-4 w-4" /> Start scanner
              </Button>
            )}
          </div>
        )}
      </div>
      {live && (
        <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-neutral-500">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {state === 'starting' ? 'STARTING CAMERA…' : 'SCANNING — HOLD STEADY'}
          </span>
          <Button variant="subtle" size="sm" onClick={stop}>
            <CameraOff className="h-3.5 w-3.5" /> Stop
          </Button>
        </div>
      )}
    </div>
  );
}
