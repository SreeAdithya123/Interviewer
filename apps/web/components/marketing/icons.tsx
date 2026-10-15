/**
 * Ultra-light line icons for the marketing surface.
 *
 * Lucide glyphs, but every icon is forced to a hairline 1.25 stroke with round
 * caps/joins so they read like Phosphor Light / Remix Line rather than the
 * default heavy UI weight. Import from here — never import raw lucide icons
 * into a marketing component.
 *
 * Ported from reference/lovable-site/src/components/marketing/icons.tsx —
 * no react-router or Supabase dependencies in this file, so it carries over
 * unchanged.
 */
import {
  AudioLines,
  Target,
  RefreshCw,
  ShieldCheck,
  Mic,
  MessagesSquare,
  ChartNoAxesColumn,
  Video,
  FileText,
  UsersRound,
  Zap,
  Clock3,
  BookOpen,
  Heart,
  CalendarDays,
  Lightbulb,
  Mail,
  MapPin,
  Check,
  Star,
  Crown,
  Sparkles,
  Eye,
  ArrowUpRight,
  Quote,
  ScanSearch,
  LayoutDashboard,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const thin = (Base: ComponentType<LucideProps>) => {
  const ThinIcon = ({ strokeWidth = 1.25, ...props }: LucideProps) => (
    <Base strokeWidth={strokeWidth} absoluteStrokeWidth {...props} />
  );
  ThinIcon.displayName = `Thin(${Base.displayName ?? Base.name ?? "Icon"})`;
  return ThinIcon;
};

export const Waveform = thin(AudioLines);
export const TargetIcon = thin(Target);
export { TargetIcon as Target };
export const ArrowsClockwise = thin(RefreshCw);
export const ShieldCheckIcon = thin(ShieldCheck);
export { ShieldCheckIcon as ShieldCheck };
export const Microphone = thin(Mic);
export const ChatDots = thin(MessagesSquare);
export const ChartBar = thin(ChartNoAxesColumn);
export const VideoIcon = thin(Video);
export { VideoIcon as Video };
export const FileTextIcon = thin(FileText);
export { FileTextIcon as FileText };
export const UsersThree = thin(UsersRound);
export const Lightning = thin(Zap);
export const Clock = thin(Clock3);
export const BookOpenIcon = thin(BookOpen);
export { BookOpenIcon as BookOpen };
export const HeartIcon = thin(Heart);
export { HeartIcon as Heart };
export const Calendar = thin(CalendarDays);
export const LightbulbIcon = thin(Lightbulb);
export { LightbulbIcon as Lightbulb };
export const EnvelopeSimple = thin(Mail);
export const MapPinIcon = thin(MapPin);
export { MapPinIcon as MapPin };
export const CheckIcon = thin(Check);
export { CheckIcon as Check };
export const StarIcon = thin(Star);
export { StarIcon as Star };
export const CrownIcon = thin(Crown);
export { CrownIcon as Crown };
export const Sparkle = thin(Sparkles);
export const EyeIcon = thin(Eye);
export { EyeIcon as Eye };
export const Arrow = thin(ArrowUpRight);
export const QuoteMark = thin(Quote);
export const ScanIcon = thin(ScanSearch);
export { ScanIcon as Scan };
export const DashboardIcon = thin(LayoutDashboard);
export { DashboardIcon as Dashboard };
