import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ProxiSkills — Marketplace freelance local au Maroc" },
      {
        name: "description",
        content:
          "Trouvez des freelances locaux qualifiés au Maroc : design, développement, photo, cours, réparation. Recherche par ville, prix et avis.",
      },
      { name: "author", content: "ProxiSkills" },
      { property: "og:title", content: "ProxiSkills — Marketplace freelance local au Maroc" },
      {
        property: "og:description",
        content: "La marketplace qui connecte clients et freelances locaux au Maroc.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "ProxiSkills — Marketplace freelance local au Maroc" },
      { name: "description", content: "Local Connect is a local freelance service marketplace connecting clients with nearby freelancers." },
      { property: "og:description", content: "Local Connect is a local freelance service marketplace connecting clients with nearby freelancers." },
      { name: "twitter:description", content: "Local Connect is a local freelance service marketplace connecting clients with nearby freelancers." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/93f0d6fa-9d82-4760-b062-064b259acc2d/id-preview-1312e349--7ff10ac9-2732-467d-a82a-5b5cf2d4d375.lovable.app-1777084867839.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/93f0d6fa-9d82-4760-b062-064b259acc2d/id-preview-1312e349--7ff10ac9-2732-467d-a82a-5b5cf2d4d375.lovable.app-1777084867839.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
