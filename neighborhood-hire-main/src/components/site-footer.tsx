import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-xl font-bold text-foreground">
            Proxi<span className="text-gradient">Skills</span>
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            La marketplace qui connecte clients et freelances locaux au Maroc — design, développement, photo, cours,
            réparation et plus.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Plateforme</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/services" className="hover:text-foreground">Trouver un service</Link></li>
            <li><a href="#freelancers" className="hover:text-foreground">Freelances populaires</a></li>
            <li><a href="#how-it-works" className="hover:text-foreground">Comment ça marche</a></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Ressources</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Aide & support</a></li>
            <li><a href="#" className="hover:text-foreground">Conditions d'utilisation</a></li>
            <li><a href="#" className="hover:text-foreground">Confidentialité</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ProxiSkills — Marketplace freelance local. Tous droits réservés.
      </div>
    </footer>
  );
}
