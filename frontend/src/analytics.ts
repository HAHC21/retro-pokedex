const MEASUREMENT_ID = "G-H9DLB7GLB9";

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/** Load GA only on the deployed site — never on Vite dev / local preview. */
export function initAnalytics(): void {
  if (!import.meta.env.PROD || isLocalHost(window.location.hostname)) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
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
  w.gtag("config", MEASUREMENT_ID);
}
