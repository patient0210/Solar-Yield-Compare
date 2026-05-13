import { Link, useLocation } from "wouter";
import { Sun, GitCompare } from "lucide-react";

const tabs = [
  { href: "/", label: "시뮬레이션", icon: Sun },
  { href: "/compare", label: "경사각 비교", icon: GitCompare },
];

export default function Nav() {
  const [location] = useLocation();

  return (
    <nav className="w-full border-b bg-card z-20 shrink-0">
      <div className="flex h-12 items-center px-4 gap-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 h-8 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              data-testid={`nav-${label}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
