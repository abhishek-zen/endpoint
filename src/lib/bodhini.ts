// Bodhini tour guide SDK helpers

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BodhiniGuide {
  id: string;
  name: string;
  type: string;
  sub_type: string;
}

export interface BodhiniIdentifyProps {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  plan?: string;
  [key: string]: unknown; // custom targeting properties
}

export interface BodhiniEventDetail {
  event_type: BodhiniEventType;
  guide_id: string;
  step_id?: string;
  anon_id?: string;
  trigger_source?: string;
  response?: unknown; // survey answers
}

export type BodhiniEventType =
  | 'bodhini:event'
  | 'bodhini:guide_triggered'
  | 'bodhini:guide_completed'
  | 'bodhini:guide_dismissed'
  | 'bodhini:guide_step_viewed'
  | 'bodhini:survey_answered'
  | 'bodhini:announcement_dismissed';

declare global {
  interface Window {
    bodhini?: {
      version: string;
      identify: (props: BodhiniIdentifyProps) => void;
      startGuide: (guideId: string) => void;
      guides: BodhiniGuide[];
    };
    bodhiniConfig?: Omit<BodhiniIdentifyProps, 'userId'> & { userId?: string };
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GUIDE_ID = process.env.NEXT_PUBLIC_BODHINI_GUIDE_ID ?? '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Update user properties. Call after login or when user state changes. */
export function bodhiniIdentify(props: BodhiniIdentifyProps) {
  if (typeof window !== 'undefined' && window.bodhini) {
    window.bodhini.identify(props);
  }
}

/** Manually trigger a guide by ID — used by Tour / Help buttons. */
export function bodhiniStartGuide(id: string = GUIDE_ID) {
  if (typeof window === 'undefined') return;
  window.bodhini?.startGuide(id);
}

export function bodhiniReplayGuide(id: string = GUIDE_ID) {
  if (typeof window === 'undefined') return;
  window.bodhini?.startGuide(id);
}

/** Log all loaded guide IDs, names, and types to the console. */
export function bodhiniListGuides() {
  if (typeof window === 'undefined') return;
  window.bodhini?.guides.forEach(g =>
    console.log('[Bodhini guide]', g.id, g.name, `(${g.type}/${g.sub_type})`)
  );
}

export function bodhiniOnEvent(
  handler: (detail: BodhiniEventDetail) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<BodhiniEventDetail>).detail;
    handler(detail);
  };
  window.addEventListener('bodhini:event', listener);
  return () => window.removeEventListener('bodhini:event', listener);
}

export function bodhiniOnEventType(
  type: BodhiniEventType,
  handler: (detail: BodhiniEventDetail) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<BodhiniEventDetail>).detail;
    handler(detail);
  };
  window.addEventListener(type, listener);
  return () => window.removeEventListener(type, listener);
}

