export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-auto">
      <div className="mx-auto max-w-content px-6 py-12 flex flex-col items-center gap-4">
        <span className="font-bold text-lg text-brand-white tracking-tight">
          NŌM
        </span>
        <p className="text-brand-muted text-sm">Chaque plat a une histoire.</p>
        <p className="text-brand-muted text-xs">
          &copy; 2026 NŌM. Tous droits réservés.
        </p>
        <p className="text-brand-muted text-xs">Fait avec ❤️ à Strasbourg</p>
      </div>
    </footer>
  );
}
