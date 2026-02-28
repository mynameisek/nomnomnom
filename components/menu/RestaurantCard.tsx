import type { Menu } from '@/lib/types/menu';

interface RestaurantCardProps {
  menu: Menu;
}

export default function RestaurantCard({ menu }: RestaurantCardProps) {
  const name = menu.restaurant_name ?? menu.google_place_name ?? 'Menu';
  const hasPlacesData = menu.google_address || menu.google_rating || menu.google_phone;

  if (!hasPlacesData) {
    // Simple fallback: just the name as an h1
    return (
      <h1 className="text-2xl font-bold text-brand-white mb-1 truncate">
        {name}
      </h1>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-bold text-brand-white truncate">
          {menu.google_url ? (
            <a
              href={menu.google_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-orange transition-colors"
            >
              {name}
            </a>
          ) : (
            name
          )}
        </h1>
        {menu.google_rating != null && (
          <span className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-medium text-brand-orange">
            <span>&#9733;</span>
            {menu.google_rating.toFixed(1)}
          </span>
        )}
      </div>

      {menu.google_address && (
        <p className="text-brand-muted text-sm mt-1 truncate">
          {menu.google_address}
        </p>
      )}

      {menu.google_phone && (
        <p className="text-brand-muted text-sm mt-0.5">
          <a
            href={`tel:${menu.google_phone}`}
            className="hover:text-brand-orange transition-colors"
          >
            {menu.google_phone}
          </a>
        </p>
      )}
    </div>
  );
}
