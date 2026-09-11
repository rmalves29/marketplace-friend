import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  MessageSquare,
  Megaphone,
  Plug,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { to: "/anuncios", label: "Anúncios", icon: Megaphone },
  { to: "/integracoes", label: "Integrações", icon: Plug },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="border-b border-sidebar-border bg-sidebar lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="grid size-9 place-items-center rounded-lg bg-primary font-display text-lg font-bold text-primary-foreground">
            T
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold text-sidebar-foreground">
              Tiops CRM
            </p>
            <p className="text-xs text-muted-foreground">Marketplace Connect</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-primary"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 lg:h-screen lg:overflow-y-auto">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-6 py-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {actions}
        </header>
        <div className="px-6 py-6">{children}</div>
      </main>
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card ${className}`}>{children}</div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-12 text-center text-sm text-muted-foreground">{message}</div>
  );
}
