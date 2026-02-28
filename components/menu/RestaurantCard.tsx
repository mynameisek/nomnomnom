import type { Menu } from '@/lib/types/menu';
import { useLanguage } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

const GOOGLE_MAPS_DOMAIN: Record<Lang, string> = {
  fr: 'maps.google.fr',
  en: 'maps.google.com',
  tr: 'maps.google.com.tr',
  de: 'maps.google.de',
};

function localizeGoogleUrl(url: string, lang: Lang): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.startsWith('maps.google')) return url;
    parsed.hostname = GOOGLE_MAPS_DOMAIN[lang];
    return parsed.toString();
  } catch {
    return url;
  }
}

interface RestaurantCardProps {
  menu: Menu;
}

export default function RestaurantCard({ menu }: RestaurantCardProps) {
  const { lang } = useLanguage();
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
              href={localizeGoogleUrl(menu.google_url, lang)}
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
