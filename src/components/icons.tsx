import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...rest }: P) {
  return {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...rest,
  };
}

export const IconHome = (p: P) => <svg {...base(p)}><path d="M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /></svg>;
export const IconBox = (p: P) => <svg {...base(p)}><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>;
export const IconDoc = (p: P) => <svg {...base(p)}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><path d="M14 3v6h6" /><path d="M8 13h8M8 17h5" /></svg>;
export const IconChart = (p: P) => <svg {...base(p)}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>;
export const IconScan = (p: P) => <svg {...base(p)}><path d="M3 7V5a2 2 0 012-2h2" /><path d="M17 3h2a2 2 0 012 2v2" /><path d="M21 17v2a2 2 0 01-2 2h-2" /><path d="M7 21H5a2 2 0 01-2-2v-2" /><path d="M7 8v8M11 8v8M15 8v8M18 8v8" /></svg>;
export const IconPlus = (p: P) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const IconMinus = (p: P) => <svg {...base(p)}><path d="M5 12h14" /></svg>;
export const IconBack = (p: P) => <svg {...base(p)}><path d="M15 18l-6-6 6-6" /></svg>;
export const IconChevron = (p: P) => <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>;
export const IconDown = (p: P) => <svg {...base(p)}><path d="M6 9l6 6 6-6" /></svg>;
export const IconSearch = (p: P) => <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>;
export const IconIn = (p: P) => <svg {...base(p)}><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 21h16" /></svg>;
export const IconOut = (p: P) => <svg {...base(p)}><path d="M12 15V3" /><path d="M7 8l5-5 5 5" /><path d="M4 21h16" /></svg>;
export const IconTransfer = (p: P) => <svg {...base(p)}><path d="M4 7h13" /><path d="M14 4l3 3-3 3" /><path d="M20 17H7" /><path d="M10 14l-3 3 3 3" /></svg>;
export const IconCheckList = (p: P) => <svg {...base(p)}><path d="M9 4h6" /><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 11l2 2 4-4" /></svg>;
export const IconAlert = (p: P) => <svg {...base(p)}><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>;
export const IconTruck = (p: P) => <svg {...base(p)}><rect x="2" y="7" width="13" height="10" rx="1" /><path d="M15 10h4l3 3v4h-7" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>;
export const IconSettings = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
export const IconWarehouse = (p: P) => <svg {...base(p)}><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-7h6v7" /></svg>;
export const IconUsers = (p: P) => <svg {...base(p)}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.9" /><path d="M16 3.1a4 4 0 010 7.8" /></svg>;
export const IconUpload = (p: P) => <svg {...base(p)}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><path d="M14 3v6h6" /><path d="M12 18v-6" /><path d="M9 15l3-3 3 3" /></svg>;
export const IconDownload = (p: P) => <svg {...base(p)}><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" /></svg>;
export const IconX = (p: P) => <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const IconCheck = (p: P) => <svg {...base(p)}><path d="M5 12l5 5L20 7" /></svg>;
export const IconLock = (p: P) => <svg {...base(p)}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>;
export const IconLogout = (p: P) => <svg {...base(p)}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>;
export const IconBuilding = (p: P) => <svg {...base(p)}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" /></svg>;
export const IconMore = (p: P) => <svg {...base(p)}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>;
export const IconTrash = (p: P) => <svg {...base(p)}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>;
export const IconFlash = (p: P) => <svg {...base(p)}><path d="M6 2h12v5l-3 4v11H9V11L6 7z" /><path d="M12 14v3" /></svg>;
export const IconPrinter = (p: P) => <svg {...base(p)}><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M6 14h12v7H6z" /></svg>;
export const IconMenu = (p: P) => <svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
export const IconCatalog = (p: P) => <svg {...base(p)}><path d="M2 5.5C2 4.7 2.7 4 3.5 4H9a3 3 0 013 3v13a2.5 2.5 0 00-2.5-2.5h-6A1.5 1.5 0 012 16z" /><path d="M22 5.5c0-.8-.7-1.5-1.5-1.5H15a3 3 0 00-3 3v13a2.5 2.5 0 012.5-2.5h6a1.5 1.5 0 001.5-1.5z" /><path d="M15.5 8.5h3M15.5 12h3" /></svg>;
export const IconPin = (p: P) => <svg {...base(p)}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;
