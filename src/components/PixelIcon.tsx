import React from "react";
import { ArrowLeft } from "pixelarticons/react/ArrowLeft";
import { ArrowRight } from "pixelarticons/react/ArrowRight";
import { ChevronDown } from "pixelarticons/react/ChevronDown";
import { ExternalLink } from "pixelarticons/react/ExternalLink";
import { Link } from "pixelarticons/react/Link";
import { Download } from "pixelarticons/react/Download";
import { Mail } from "pixelarticons/react/Mail";
import { Play } from "pixelarticons/react/Play";
import { Close } from "pixelarticons/react/Close";
import { Copy } from "pixelarticons/react/Copy";
import { Check } from "pixelarticons/react/Check";
import { Users } from "pixelarticons/react/Users";
import { Briefcase } from "pixelarticons/react/Briefcase";
import { BookOpen } from "pixelarticons/react/BookOpen";
import { ChevronLeft } from "pixelarticons/react/ChevronLeft";
import { ChevronRight } from "pixelarticons/react/ChevronRight";
import { Send } from "pixelarticons/react/Send";
import { Expand } from "pixelarticons/react/Expand";
import { Power } from "pixelarticons/react/Power";

export type IconName =
  | "github"
  | "linkedin"
  | "graduation-cap"
  | "hamburger"
  | "chevron-down"
  | "external-link"
  | "link"
  | "download"
  | "mail"
  | "arrow-left"
  | "arrow-right"
  | "play"
  | "x"
  | "copy"
  | "check"
  | "users"
  | "briefcase"
  | "book-open"
  | "chevron-left"
  | "chevron-right"
  | "send"
  | "maximize"
  | "power";

const customIcons: Record<string, string> = {
  github:
    "M5 2h4v2H7v2H5V2Zm0 10H3V6h2v6Zm2 2H5v-2h2v2Zm2 2v-2H7v2H3v-2H1v2h2v2h4v4h2v-4h2v-2H9Zm0 0v2H7v-2h2Zm6-12v2H9V4h6Zm4 2h-2V4h-2V2h4v4Zm0 6V6h2v6h-2Zm-2 2v-2h2v2h-2Zm-2 2v-2h2v2h-2Zm0 2h-2v-2h2v2Zm0 0h2v4h-2v-4Z",
  linkedin:
    "M7 22H1V8h6v14Zm12-12h-8v10h2v-8h4v2h-2v8H9V8h10v2Zm4 12h-6v-8h2v6h2v-8h2v10ZM3 20h2V10H3v10Zm18-8h-2v-2h2v2ZM5 7H3V5h2v2ZM3 5H1V3h2v2Zm4 0H5V3h2v2ZM5 3H3V1h2v2Z",
  "graduation-cap":
    "M2 12l10-6 10 6-10 6zm0 4v-2l10 6 10-6v2l-10 6zm8-10v4l2 2 2-2V6z",
  hamburger:
    "M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z",
};

const iconMap: Record<
  IconName,
  React.ComponentType<{ className?: string }>
> = {
  "external-link": ExternalLink,
  link: Link,
  download: Download,
  mail: Mail,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  play: Play,
  x: Close,
  copy: Copy,
  check: Check,
  users: Users,
  briefcase: Briefcase,
  "book-open": BookOpen,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  send: Send,
  maximize: Expand,
  power: Power,
  "chevron-down": ChevronDown,
  github: (() => null) as any,
  linkedin: (() => null) as any,
  "graduation-cap": (() => null) as any,
  hamburger: (() => null) as any,
};

interface PixelIconProps {
  name: IconName | string;
  className?: string;
}

export default function PixelIcon({ name, className }: PixelIconProps) {
  const path = customIcons[name];
  if (path) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
      >
        <path d={path} />
      </svg>
    );
  }

  const IconComponent = iconMap[name as IconName];
  if (!IconComponent) return null;

  return <IconComponent className={className} />;
}
