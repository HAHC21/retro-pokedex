/** Load Google Analytics only when VITE_GA_MEASUREMENT_ID is set (production build). */
export function initAnalytics(): void {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  if (!measurementId) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  const w = window as Window & {
    dataLayer?: object[];
    gtag?: (...args: unknown[]) => void;
  };
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    w.dataLayer!.push(arguments);
  };
  w.gtag("js", new Date());
  w.gtag("config", measurementId);
}
