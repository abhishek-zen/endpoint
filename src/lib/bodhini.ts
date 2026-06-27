// Bodhini tour guide SDK helpers

declare global {
  interface Window {
    bodhini?: {
      identify: (props: { userId: string; email?: string; plan?: string }) => void;
      startGuide: (guideId: string) => void;
    };
    bodhiniConfig?: {
      userId?: string;
      email?: string;
      plan?: string;
    };
  }
}

const GUIDE_ID = process.env.NEXT_PUBLIC_BODHINI_GUIDE_ID ?? '';

export function bodhiniIdentify(props: { userId: string; email?: string; plan?: string }) {
  if (typeof window !== 'undefined' && window.bodhini) {
    window.bodhini.identify(props);
  }
}

/** Auto-launches the guide on every page load. */
export function bodhiniAutoTour() {
  if (typeof window === 'undefined') return;
  window.bodhini?.startGuide(GUIDE_ID);
}

/** Manually trigger the guide — used by the Tour / Help button. */
export function bodhiniStartGuide(id: string = GUIDE_ID) {
  if (typeof window === 'undefined') return;
  window.bodhini?.startGuide(id);
}

