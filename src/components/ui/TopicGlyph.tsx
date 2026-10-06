/**
 * TopicGlyph — lightweight topic-specific SVG visual.
 * Indexed blocks, linked nodes, stacks, trees, graphs, sorting bars, etc.
 * Pure SVG, no dependencies, decorative (aria-hidden).
 */
export default function TopicGlyph({ slug, className = "h-6 w-6" }: { slug: string; className?: string }) {
  const stroke = "currentColor";
  const common = {
    fill: "none" as const,
    stroke,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (slug) {
    case "arrays":
    case "strings":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <rect x="2.5" y="8" width="6" height="8" rx="1.5" />
          <rect x="9.5" y="8" width="6" height="8" rx="1.5" opacity="0.55" />
          <rect x="16.5" y="8" width="5" height="8" rx="1.5" opacity="0.85" />
          <path d="M5.5 4.5v2M12.5 4.5v2M19 4.5v2" opacity="0.6" />
        </svg>
      );
    case "linked-lists":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <circle cx="5" cy="12" r="2.6" />
          <circle cx="12" cy="12" r="2.6" />
          <circle cx="19" cy="12" r="2.6" opacity="0.7" />
          <path d="M7.6 12h1.8M14.6 12h1.8" />
          <circle cx="12" cy="12" r="0.6" fill={stroke} stroke="none" />
        </svg>
      );
    case "stacks":
    case "queues":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <rect x="6" y="3.5" width="12" height="4" rx="1.2" />
          <rect x="6" y="9" width="12" height="4" rx="1.2" opacity="0.7" />
          <rect x="6" y="14.5" width="12" height="4" rx="1.2" opacity="0.45" />
          <path d="M19.5 18.5v2M18.5 19.5h2" opacity="0.7" />
        </svg>
      );
    case "trees":
    case "binary-search-trees":
    case "heaps":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <circle cx="12" cy="5" r="2.4" />
          <circle cx="6.5" cy="13" r="2.4" opacity="0.8" />
          <circle cx="17.5" cy="13" r="2.4" opacity="0.8" />
          <circle cx="6.5" cy="20" r="1.6" opacity="0.5" />
          <circle cx="17.5" cy="20" r="1.6" opacity="0.5" />
          <path d="M10.5 7l-2.5 3.6M13.5 7l2.5 3.6M6.5 15.4v2.2M17.5 15.4v2.2" opacity="0.8" />
        </svg>
      );
    case "graphs":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <circle cx="6" cy="7" r="2.2" />
          <circle cx="18" cy="7" r="2.2" opacity="0.8" />
          <circle cx="12" cy="17" r="2.2" />
          <path d="M8.2 7h7.6M7 9l3.6 5.6M17 9l-3.6 5.6" opacity="0.8" />
        </svg>
      );
    case "sorting":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <path d="M5 20v-6M10 20V7M15 20v-9M20 20V4" />
          <path d="M3.5 20h17" opacity="0.5" />
        </svg>
      );
    case "searching":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <circle cx="10.5" cy="10.5" r="5.5" />
          <path d="M15 15l4.5 4.5" />
          <path d="M8 10.5h5" opacity="0.8" />
        </svg>
      );
    case "hashing":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <path d="M9 3.5L7 20.5M17 3.5l-2 17M4 9.5h16M4 15h16" />
        </svg>
      );
    case "recursion":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <path d="M5 12a7 7 0 0 1 12-4.9M19 12a7 7 0 0 1-12 4.9" />
          <path d="M17 3.5v3.6h-3.6M7 20.5v-3.6h3.6" />
        </svg>
      );
    case "dynamic-programming":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" opacity="0.65" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" opacity="0.65" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
          <path d="M10.5 7h3M7 10.5v3M17 10.5v3M10.5 17h3" opacity="0.7" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden {...common}>
          <circle cx="12" cy="12" r="2.2" />
          <circle cx="12" cy="12" r="6" opacity="0.45" strokeDasharray="3 3" />
          <circle cx="12" cy="12" r="9.2" opacity="0.25" strokeDasharray="2 4" />
        </svg>
      );
  }
}
