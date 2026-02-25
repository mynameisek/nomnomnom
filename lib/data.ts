// Shared data constants for NOM landing page
// No "use client" directive — plain data module, safe for Server and Client Components

export type FoodItem = {
  url: string;
  grad: string;
  emoji: string;
};

export const FOOD: FoodItem[] = [
  { url: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&fit=crop&q=80", grad: "linear-gradient(135deg, #8B4513 0%, #D2691E 50%, #CD853F 100%)", emoji: "🍜" },
  { url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&fit=crop&q=80", grad: "linear-gradient(135deg, #B22222 0%, #DC143C 50%, #FF6347 100%)", emoji: "🍕" },
  { url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&fit=crop&q=80", grad: "linear-gradient(135deg, #2E8B57 0%, #3CB371 50%, #90EE90 100%)", emoji: "🥗" },
  { url: "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&fit=crop&q=80", grad: "linear-gradient(135deg, #DAA520 0%, #F0E68C 50%, #FAFAD2 100%)", emoji: "🍝" },
  { url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&fit=crop&q=80", grad: "linear-gradient(135deg, #8B0000 0%, #A0522D 50%, #D2691E 100%)", emoji: "🥩" },
  { url: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&fit=crop&q=80", grad: "linear-gradient(135deg, #FF8C00 0%, #FFD700 50%, #F5DEB3 100%)", emoji: "🌮" },
  { url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&fit=crop&q=80", grad: "linear-gradient(135deg, #C71585 0%, #DB7093 50%, #FFB6C1 100%)", emoji: "🍰" },
  { url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&fit=crop&q=80", grad: "linear-gradient(135deg, #2F4F4F 0%, #556B2F 50%, #8FBC8F 100%)", emoji: "🍽️" },
];

export type DishItem = {
  original: string;
  translated: string;
  country: string;
  img: number;
  price: string;
  spice: number;
};

export const DISHES: DishItem[] = [
  { original: "Midye Dolma", translated: "Moules farcies au riz épicé", country: "🇹🇷", img: 4, price: "8€", spice: 1 },
  { original: "Phở Bò", translated: "Soupe de bœuf vietnamienne", country: "🇻🇳", img: 0, price: "12€", spice: 2 },
  { original: "Khachapuri", translated: "Barque de pain au fromage", country: "🇬🇪", img: 1, price: "10€", spice: 0 },
  { original: "Pad Thaï", translated: "Nouilles sautées, cacahuètes, citron vert", country: "🇹🇭", img: 3, price: "13€", spice: 2 },
  { original: "Injera Combo", translated: "Galette éthiopienne garnie", country: "🇪🇹", img: 2, price: "14€", spice: 3 },
  { original: "Cacio e Pepe", translated: "Pâtes au fromage et poivre", country: "🇮🇹", img: 3, price: "15€", spice: 1 },
];

export type FeatureItem = {
  icon: string;
  title: string;
  desc: string;
};

export const FEATURES: FeatureItem[] = [
  { icon: "📸", title: "Scanne n'importe quel menu", desc: "QR code, lien web, PDF, ou photo de l'ardoise. L'app parse le contenu et génère des fiches par plat." },
  { icon: "🧠", title: "\"Chaud, consistant, pas trop épicé\"", desc: "Décris ton envie, l'assistant te propose un Top 3 uniquement parmi les vrais plats du menu." },
  { icon: "🌍", title: "Traduit & explique en 50+ langues", desc: "Chaque plat est traduit, prononcé et expliqué. Tu comprends le contexte culturel, pas juste les mots." },
  { icon: "🎥", title: "Stories de vrais plats", desc: "Vidéos courtes (6–12s) prises sur place par la communauté. Tu vois le plat réel avant de commander." },
  { icon: "🔍", title: "Recherche inversée", desc: "Tu te souviens du goût mais pas du nom ? Décris le plat de mémoire, l'IA le retrouve parmi des milliers." },
  { icon: "💰", title: "Crédits & récompenses", desc: "Poste une photo, corrige une fiche, découvre un nouveau resto → gagne des crédits pour les features avancées." },
];

export type BeliFeatureItem = {
  icon: string;
  title: string;
  desc: string;
  tag: string;
};

export const BELI_FEATURES: BeliFeatureItem[] = [
  { icon: "👤", title: "Taste Profile", desc: "Un portrait visuel de tes goûts : cuisines préférées, niveau d'épice, budget moyen. Partageable, comparable entre amis.", tag: "Inspiré de Beli, adapté dish-centric" },
  { icon: "💕", title: "Match Score", desc: "Un % de compatibilité gustative avec tes amis. \"On a 87% de match, on devrait manger ensemble.\" Crée du lien social naturel.", tag: "Social non-forcé" },
  { icon: "🏆", title: "Leaderboard local", desc: "Classement par ville des contributeurs les plus actifs. Lié aux crédits : contribuer = monter + gagner.", tag: "Gamification vertueuse" },
  { icon: "📊", title: "NŌM Wrapped", desc: "Ton année culinaire en résumé : top plats, cuisines découvertes, pays explorés, plat le mieux noté. Viral et partageable.", tag: "Year recap à la Spotify" },
];

export type FaqItem = {
  q: string;
  a: string;
};

export const FAQS: FaqItem[] = [
  { q: "Je dois créer un compte pour scanner ?", a: "Non. Le scan est gratuit et sans inscription. Le compte ne sert qu'à sauvegarder, publier des stories et gagner des crédits." },
  { q: "Comment l'assistant évite de recommander un plat qui n'existe pas ?", a: "Il ne choisit que parmi les plats détectés dans le menu. Si une suggestion ne correspond à aucun plat réel, elle est automatiquement rejetée." },
  { q: "C'est fiable pour les allergies ?", a: "L'app indique les allergènes « probables » mais la confirmation auprès du serveur reste indispensable. On ne remplace pas un humain sur ce sujet." },
  { q: "C'est un réseau social de plus ?", a: "Non. Le cœur du produit c'est scanner et comprendre un menu. Les stories, le leaderboard et le Taste Profile sont un mode opt-in — tu peux très bien ne jamais les utiliser." },
  { q: "Ça marche à l'étranger ?", a: "Partout. L'app traduit depuis et vers 50+ langues. Que tu sois à Istanbul, Tokyo ou Strasbourg, le menu devient lisible." },
  { q: "C'est quoi les crédits ?", a: "Une monnaie interne qui aligne l'économie : les opérations coûteuses (OCR, IA) sont financées par les contributions de la communauté. Un contributeur actif ne paye jamais." },
];
