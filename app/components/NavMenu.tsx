"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const links = [
  { href: "/", key: "things" },
  { href: "/stocks", key: "stocks" },
] as const;

export function NavMenu() {
  const pathname = usePathname();
  const t = useTranslations("Nav");

  return (
    <nav className="mb-3 flex gap-1 rounded-lg border border-border p-1">
      {links.map(({ href, key }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
