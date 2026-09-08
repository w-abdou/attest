/**
 * Inline stroke icons. Kept local rather than pulling an icon package so the
 * frontend has no extra runtime dependency.
 */
type IconProps = React.SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em"
      aria-hidden="true" {...props}
    >
      {children}
    </svg>
  );
}

export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 3l7 3v6c0 4.4-3 8.2-7 9-4-.8-7-4.6-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></Icon>
);
export const FileIcon = (p: IconProps) => (
  <Icon {...p}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" /><path d="M14 3v5h5" /></Icon>
);
export const UsersIcon = (p: IconProps) => (
  <Icon {...p}><path d="M16 20v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1" /><circle cx="9" cy="7" r="3.2" /><path d="M22 20v-1a4 4 0 00-3-3.87" /><path d="M16 3.13A4 4 0 0116 11" /></Icon>
);
export const HomeIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3 10l9-7 9 7v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M9 21v-7h6v7" /></Icon>
);
export const PenIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" /></Icon>
);
export const CheckIcon = (p: IconProps) => (<Icon {...p}><path d="M20 6L9 17l-5-5" /></Icon>);
export const CheckCircleIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></Icon>
);
export const AlertIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5" /><path d="M12 16.2h.01" /></Icon>
);
export const InfoIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4.5" /><path d="M12 8h.01" /></Icon>
);
export const CopyIcon = (p: IconProps) => (
  <Icon {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></Icon>
);
export const UploadIcon = (p: IconProps) => (
  <Icon {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 9l5-5 5 5" /><path d="M12 4v12" /></Icon>
);
export const CloseIcon = (p: IconProps) => (<Icon {...p}><path d="M18 6L6 18" /><path d="M6 6l12 12" /></Icon>);
export const ChevronRightIcon = (p: IconProps) => (<Icon {...p}><path d="M9 18l6-6-6-6" /></Icon>);
export const ArrowLeftIcon = (p: IconProps) => (<Icon {...p}><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></Icon>);
export const PlusIcon = (p: IconProps) => (<Icon {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Icon>);
export const TrashIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></Icon>
);
export const HistoryIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 4v4h4" /><path d="M12 8v4l3 2" /></Icon>
);
export const LayersIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></Icon>
);
export const SettingsIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2v.2a2 2 0 11-4 0v-.1A1.7 1.7 0 005 19.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 002.6 15H2.4a2 2 0 110-4h.1A1.7 1.7 0 004.6 5L4.5 5a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 0010 2.6V2.4a2 2 0 114 0v.1a1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 001.2 2.9h.2a2 2 0 110 4h-.1a1.7 1.7 0 00-1.6 1z" /></Icon>
);
export const LogOutIcon = (p: IconProps) => (
  <Icon {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></Icon>
);
export const MenuIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></Icon>
);
export const EyeIcon = (p: IconProps) => (
  <Icon {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></Icon>
);
export const EyeOffIcon = (p: IconProps) => (
  <Icon {...p}><path d="M10.6 6.2A9.9 9.9 0 0112 6c6.4 0 10 7 10 7a17 17 0 01-3.3 4.1" /><path d="M6.6 6.6A17 17 0 002 13s3.6 7 10 7a9.6 9.6 0 004.9-1.3" /><path d="M3 3l18 18" /></Icon>
);
export const SpinnerIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" className="animate-spin-slow" aria-hidden="true" {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.25" />
    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);
