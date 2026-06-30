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
    console.log('[Bodhini] identify →', props);
    window.bodhini.identify(props);
  } else {
    console.warn('[Bodhini] identify called but SDK not ready', props);
  }
}

/** Manually trigger a guide by ID — used by Tour / Help buttons. */
export function bodhiniStartGuide(id: string = GUIDE_ID) {
  if (typeof window === 'undefined') return;
  console.log('[Bodhini] startGuide →', id);
  window.bodhini?.startGuide(id);
}

/**
 * Force-replay a guide the user has already seen.
 * startGuide() always bypasses the server-side "seen" check —
 * this is just a semantically named alias to make intent clear.
 */
export function bodhiniReplayGuide(id: string = GUIDE_ID) {
  if (typeof window === 'undefined') return;
  console.log('[Bodhini] replayGuide →', id, '(force re-show)');
  window.bodhini?.startGuide(id);
}

/** Log all loaded guide IDs, names, and types to the console. */
export function bodhiniListGuides() {
  if (typeof window === 'undefined') return;
  window.bodhini?.guides.forEach(g =>
    console.log('[Bodhini guide]', g.id, g.name, `(${g.type}/${g.sub_type})`)
  );
}

/**
 * Subscribe to all Bodhini guide events (catch-all).
 * Returns an unsubscribe function — use as useEffect return value.
 *
 * @example
 * useEffect(() => bodhiniOnEvent(({ event_type, guide_id }) => {
 *   analytics.track(event_type, { guide_id });
 * }), []);
 */
export function bodhiniOnEvent(
  handler: (detail: BodhiniEventDetail) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<BodhiniEventDetail>).detail;
    console.log('[Bodhini] event captured →', detail.event_type, '| guide:', detail.guide_id, detail.step_id ? '| step: ' + detail.step_id : '', detail.trigger_source ? '| source: ' + detail.trigger_source : '');
    handler(detail);
  };
  window.addEventListener('bodhini:event', listener);
  return () => window.removeEventListener('bodhini:event', listener);
}

/**
 * Subscribe to a specific Bodhini event type.
 * Returns an unsubscribe function — use as useEffect return value.
 *
 * @example
 * useEffect(() => bodhiniOnEventType('bodhini:guide_completed', ({ guide_id }) => {
 *   unlockFeature(guide_id);
 * }), []);
 */
export function bodhiniOnEventType(
  type: BodhiniEventType,
  handler: (detail: BodhiniEventDetail) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<BodhiniEventDetail>).detail;
    console.log(`[Bodhini] ${type} →`, '| guide:', detail.guide_id, detail.step_id ? '| step: ' + detail.step_id : '', detail.response !== undefined ? '| response:' : '', detail.response ?? '');
    handler(detail);
  };
  window.addEventListener(type, listener);
  return () => window.removeEventListener(type, listener);
}

