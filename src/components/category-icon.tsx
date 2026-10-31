import type { IconName } from "@/lib/category-visuals";

const PATHS: Record<IconName, React.ReactNode> = {
  coffee: <><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" /><path d="M6 2v2M10 2v2M14 2v2" /></>,
  eclipse: <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" /></>,
  sigma: <path d="M18 5H7l6 7-6 7h11" />,
  cpu: <><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>,
  sparkles: <><path d="M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z" /><path d="M19 2v4M17 4h4M5 16v4M3 18h4" /></>,
  code: <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
  cross: <path d="M12 3v18M6 9h12" />,
  bot: <><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M12 4v4M8 4h8M2 14h1M21 14h1" /><circle cx="8.5" cy="14" r="1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="14" r="1" fill="currentColor" stroke="none" /></>,
  utensils: <><path d="M4 2v7a3 3 0 0 0 6 0V2M7 2v20" /><path d="M20 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zM20 15v7" /></>,
  pen: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
};

export function CategoryIcon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
