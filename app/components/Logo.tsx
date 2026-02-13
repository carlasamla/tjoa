"use client";

import Link from "next/link";

function SearchBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M50 10C28 10 10 26 10 46c0 11 5 21 14 28l-4 14 16-8c4 1 9 2 14 2 22 0 40-16 40-36S72 10 50 10z" />
      <circle cx="48" cy="43" r="14" />
      <line x1="58" y1="53" x2="68" y2="63" />
    </svg>
  );
}

export function Logo({ size = "default" }: { size?: "default" | "small" }) {
  if (size === "small") {
    return (
      <Link href="/" className="flex items-center gap-0.5">
        <span className="text-2xl font-bold tracking-tight text-foreground">
          tjoa
        </span>
        <SearchBubbleIcon className="h-5 w-5 text-foreground" />
      </Link>
    );
  }

  return (
    <Link href="/" className="mb-4 flex items-center gap-0.5">
      <span className="text-3xl font-bold tracking-tight text-foreground">
        tjoa
      </span>
      <SearchBubbleIcon className="h-7 w-7 text-foreground" />
    </Link>
  );
}
