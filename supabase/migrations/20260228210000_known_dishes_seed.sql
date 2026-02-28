-- =============================================================================
-- Seed known_dishes table with 120-150 entries for Strasbourg foreign cuisines
-- =============================================================================
-- Covers: Turkish, North African, Alsatian, Japanese, Italian, Chinese, French
-- Priority: dishes hardest to interpret for non-native diners
-- All descriptions bilingual (FR + EN)
-- ON CONFLICT DO NOTHING: idempotent — safe to run multiple times
-- =============================================================================

INSERT INTO known_dishes (canonical_name, aliases, cuisine, is_beverage, description_fr, description_en)
VALUES

-- =============================================================================
-- TURKISH (~30 entries)
-- =============================================================================

('Mantı',
  ARRAY['manti', 'manty', 'boulettes turques', 'turkish dumplings', 'ravioli turc', 'mantu'],
  'turkish', FALSE,
  'Petites pâtes fourrées à la viande hachée, servies avec du yaourt à l''ail et une sauce au beurre pimenté. Plat national turc.',
  'Small dumplings filled with spiced ground meat, served with garlic yogurt and chili butter sauce. A national Turkish dish.'),

('Lahmacun',
  ARRAY['lahmadjun', 'lahmajun', 'pizza turque', 'turkish pizza', 'tarte à la viande turque', 'lahmajoun'],
  'turkish', FALSE,
  'Fine galette de pâte garnie de viande hachée épicée, oignons et tomates. Souvent roulée avec salade et jus de citron.',
  'Thin flatbread topped with spiced minced meat, onions and tomatoes. Often rolled up with salad and lemon juice.'),

('Köfte',
  ARRAY['kofte', 'kofta', 'boulettes de viande turques', 'turkish meatballs', 'boulettes grillées'],
  'turkish', FALSE,
  'Boulettes de viande épicées à base de boeuf ou d''agneau haché, grillées ou cuites à la poêle. Variante turque du kofta.',
  'Spiced ground beef or lamb patties, grilled or pan-fried. The Turkish variant of kofta.'),

('Döner Kebab',
  ARRAY['doner kebab', 'döner', 'doner', 'kebab turc', 'viande tournante', 'shawarma turc', 'gyros turc'],
  'turkish', FALSE,
  'Viande d''agneau, poulet ou veau marinée, empilée sur une broche verticale et grillée lentement. Servie en sandwich ou sur assiette.',
  'Marinated lamb, chicken, or veal stacked on a vertical spit and slow-roasted. Served in flatbread or on a plate.'),

('İskender Kebab',
  ARRAY['iskender kebab', 'iskender', 'iskender kebap', 'kebab iskender', 'alexandre kebab'],
  'turkish', FALSE,
  'Tranches de döner sur pain pita, nappées de sauce tomate et de beurre fondu chaud, servies avec yaourt. Spécialité de Bursa.',
  'Döner slices over pita bread, topped with tomato sauce and hot melted butter, served with yogurt. Specialty of Bursa.'),

('Mercimek Çorbası',
  ARRAY['mercimek corbasi', 'soupe de lentilles turque', 'turkish lentil soup', 'corba', 'çorba aux lentilles'],
  'turkish', FALSE,
  'Soupe de lentilles rouges crémeuse, assaisonnée de cumin et paprika, garnies de croûtons et jus de citron. Incontournable de la cuisine turque.',
  'Creamy red lentil soup seasoned with cumin and paprika, garnished with croutons and lemon juice. A Turkish staple.'),

('Börek',
  ARRAY['borek', 'burek', 'boreka', 'feuilleté turc', 'turkish pastry', 'pâte filo farcie'],
  'turkish', FALSE,
  'Feuilleté de pâte yufka (filo) fourré de fromage, épinards ou viande hachée. Cuit au four ou frit selon la variante.',
  'Flaky yufka (filo) pastry filled with cheese, spinach, or minced meat. Baked or fried depending on the variant.'),

('Pide',
  ARRAY['pide turc', 'turkish pide', 'bateau turc', 'turkish flatbread', 'pizza bateau'],
  'turkish', FALSE,
  'Pain en forme de bateau garni de fromage, viande hachée ou oeuf. Spécialité du four turc, cousin de la pizza.',
  'Boat-shaped flatbread topped with cheese, ground meat, or egg. A Turkish oven specialty, cousin to pizza.'),

('Adana Kebab',
  ARRAY['adana kebap', 'adana kebab', 'kebab épicé', 'spicy kebab', 'kebab rouge'],
  'turkish', FALSE,
  'Brochette de viande hachée épicée à la pâte de piment rouge, grillée sur charbon. Originaire d''Adana en Turquie du sud.',
  'Spiced ground meat skewer with red chili paste, grilled over charcoal. Originally from Adana in southern Turkey.'),

('Beyti',
  ARRAY['beyti kebab', 'beyti sarma', 'rouleau de viande turc', 'beyti wrap'],
  'turkish', FALSE,
  'Kebab de viande hachée épicée roulé dans du pain lavash, servi avec sauce tomate et yaourt. Spécialité d''Istanbul.',
  'Spiced ground meat kebab rolled in lavash bread, served with tomato sauce and yogurt. An Istanbul specialty.'),

('Hünkâr Beğendi',
  ARRAY['hunkar begendi', 'hunkar begendi', 'boeuf à la purée d''aubergine', 'sultan''s delight', 'beef with eggplant puree'],
  'turkish', FALSE,
  'Ragoût d''agneau ou de veau sur purée crémeuse d''aubergines fumées au fromage. Plat impérial ottoman, traduit littéralement par "délice du sultan".',
  'Lamb or veal stew over creamy smoked eggplant and cheese puree. An Ottoman imperial dish, literally "Sultan''s Delight".'),

('İmam Bayıldı',
  ARRAY['imam bayildi', 'imam bayildi', 'aubergine farcie turque', 'stuffed eggplant turkish', 'l''imam s''est évanoui'],
  'turkish', FALSE,
  'Aubergine farcie à l''oignon, à l''ail et aux tomates, cuite à l''huile d''olive. Plat végétarien classique dont le nom signifie "l''imam s''est évanoui".',
  'Eggplant stuffed with onion, garlic and tomatoes, cooked in olive oil. A classic vegetarian dish whose name means "the imam fainted".'),

('Kuzu Tandır',
  ARRAY['kuzu tandir', 'agneau au four turc', 'turkish roast lamb', 'tandir lamb', 'tandir kebab'],
  'turkish', FALSE,
  'Agneau cuit lentement dans un four tandir (four en argile enfoui dans la terre) jusqu''à ce que la viande tombe de l''os.',
  'Lamb slow-cooked in a tandır oven (clay oven buried in the ground) until the meat falls off the bone.'),

('Menemen',
  ARRAY['menemen turc', 'oeufs turcs aux tomates', 'turkish scrambled eggs', 'eggs with peppers tomatoes'],
  'turkish', FALSE,
  'Oeufs brouillés avec tomates, poivrons verts et épices, cuits dans une poêle. Plat populaire du petit-déjeuner turc.',
  'Scrambled eggs with tomatoes, green peppers and spices, cooked in a pan. A popular Turkish breakfast dish.'),

('Gözleme',
  ARRAY['gozleme', 'crêpe turque', 'turkish flatbread pancake', 'galette fourrée turque'],
  'turkish', FALSE,
  'Galette de pâte fine (yufka) garnie de fromage, épinards ou viande, pliée et cuite sur une plaque chauffante. Plat de rue populaire.',
  'Thin flatbread (yufka) filled with cheese, spinach, or meat, folded and cooked on a griddle. Popular street food.'),

('Karnıyarık',
  ARRAY['karniyarik', 'aubergine farcie à la viande turque', 'stuffed eggplant with meat', 'split belly eggplant'],
  'turkish', FALSE,
  'Aubergine fendue et farcie de viande hachée épicée aux tomates et oignons, puis cuite au four. Plat principal classique de la cuisine ottomane.',
  'Slit eggplant stuffed with spiced ground meat, tomatoes and onions, then oven-baked. A classic Ottoman main dish.'),

('Kısır',
  ARRAY['kisir', 'taboulé turc', 'turkish bulgur salad', 'bulgur kısır', 'kisir salad'],
  'turkish', FALSE,
  'Salade de boulgour fin aux tomates, oignons verts, persil, menthe et concentré de tomates épicé. Version turque du taboulé.',
  'Fine bulgur salad with tomatoes, spring onions, parsley, mint and spiced tomato paste. The Turkish version of tabbouleh.'),

('Çoban Salatası',
  ARRAY['coban salatasi', 'salade berger', 'shepherd salad', 'turkish shepherd salad', 'salade turque'],
  'turkish', FALSE,
  'Salade fraîche de tomates, concombres, oignons et poivrons finement coupés avec persil, huile d''olive et citron. La salade classique turque.',
  'Fresh salad of finely diced tomatoes, cucumbers, onions and peppers with parsley, olive oil and lemon. The classic Turkish salad.'),

('Sigara Böreği',
  ARRAY['sigara boregi', 'cigare börk', 'cigarette borek', 'rouleau de feta', 'feuilleté cigare'],
  'turkish', FALSE,
  'Feuilles de pâte filo roulées en forme de cigare, fourrées de feta et persil, frites jusqu''à dorées. Populaires en apéritif.',
  'Filo pastry sheets rolled cigarette-style, filled with feta and parsley, fried until golden. Popular as appetizers.'),

('Dolma',
  ARRAY['dolma', 'sarma', 'feuille de vigne farcie', 'stuffed vine leaves', 'feuille de vigne', 'yaprak sarma'],
  'turkish', FALSE,
  'Feuilles de vigne ou légumes farcis de riz épicé, herbes et viande (ou sans viande). Plat méditerranéen emblématique.',
  'Vine leaves or vegetables stuffed with spiced rice, herbs and meat (or meatless). An emblematic Mediterranean dish.'),

('Cacık',
  ARRAY['cacik', 'tzatziki turc', 'turkish tzatziki', 'yaourt concombre', 'yogurt cucumber dip'],
  'turkish', FALSE,
  'Yaourt au concombre râpé, à l''ail et à la menthe, allongé d''eau glacée. Cousin turc du tzatziki grec, servi comme trempette ou soupe froide.',
  'Yogurt with grated cucumber, garlic and mint, thinned with iced water. The Turkish cousin of Greek tzatziki, served as a dip or cold soup.'),

('Acılı Ezme',
  ARRAY['acili ezme', 'ezme épicée', 'spicy turkish dip', 'tomate épicée turc', 'salsa turque'],
  'turkish', FALSE,
  'Sauce épicée de tomates, poivrons, oignons et herbes finement hachés avec pâte de piment. Condiment incontournable des kebabs.',
  'Spicy sauce of finely chopped tomatoes, peppers, onions and herbs with chili paste. Essential condiment for kebabs.'),

('Dürüm',
  ARRAY['durum', 'wrap turc', 'turkish wrap', 'sandwich lavash', 'durum kebab', 'rouleau turc'],
  'turkish', FALSE,
  'Viande grillée (souvent döner ou köfte) roulée dans du pain lavash fin avec salade, tomates et sauces. Version wrap du kebab.',
  'Grilled meat (often döner or köfte) rolled in thin lavash bread with salad, tomatoes and sauces. The wrap version of kebab.'),

('Baklava',
  ARRAY['baklava turc', 'turkish baklava', 'pâtisserie feuilletée au miel', 'baklawa', 'feuilleté noix miel'],
  'turkish', FALSE,
  'Pâtisserie composée de fines feuilles de pâte filo, de pistaches ou noix hachées, imbibée de sirop de sucre ou de miel. Dessert emblématique du Moyen-Orient.',
  'Pastry made of thin filo layers, chopped pistachios or walnuts, soaked in sugar syrup or honey. The emblematic Middle Eastern dessert.'),

('Künefe',
  ARRAY['kunefe', 'kunafa', 'konafa', 'pâtisserie au fromage turc', 'kadayif cheese dessert'],
  'turkish', FALSE,
  'Pâtisserie chaude de kadayif (vermicelles) garnie de fromage fondu, imbibée de sirop et garnie de pistaches. Spécialité du Hatay.',
  'Hot pastry of kadayif (shredded wheat) filled with melted cheese, soaked in syrup and topped with pistachios. A Hatay specialty.'),

('Çiğ Köfte',
  ARRAY['cig kofte', 'kofta crue', 'raw kofta vegan', 'boulette épicée vegan', 'kofte végétalien'],
  'turkish', FALSE,
  'Boulettes épicées à base de boulgour, concentré de tomates et herbes — version végétalienne (la version à la viande crue est désormais rare). Souvent servies en rouleau.',
  'Spiced patties made of bulgur, tomato paste and herbs — the vegan version (raw meat version is now rare). Often served as a wrap roll.'),

('Sucuk',
  ARRAY['soudjouk', 'sujuk', 'saucisse turque', 'turkish sausage', 'saucisse épicée turque'],
  'turkish', FALSE,
  'Saucisse sèche épicée à base de boeuf haché, parfumée à l''ail, cumin et piment. Servie grillée, en omelette ou en sandwich.',
  'Spiced dry sausage made of ground beef, flavored with garlic, cumin and chili. Served grilled, in an omelette or in a sandwich.'),

('Simit',
  ARRAY['simit turc', 'bagel turc', 'turkish bagel', 'pain aux graines turque', 'gevrek'],
  'turkish', FALSE,
  'Anneau de pain croustillant recouvert de graines de sésame, cuit au four. Pain de rue iconique d''Istanbul, vendu par des marchands ambulants.',
  'Crispy baked bread ring coated in sesame seeds. Istanbul''s iconic street bread, sold by street vendors.'),

('Ezme',
  ARRAY['ezme de poivron', 'pepper paste dip', 'dip turc', 'purée de poivron turc', 'biber ezmesi'],
  'turkish', FALSE,
  'Purée de poivrons rouges grillés et épices, utilisée comme trempette ou condiment. Accompagne la plupart des plats turcs.',
  'Roasted red pepper and spice puree, used as a dip or condiment. Accompanies most Turkish dishes.'),

-- =============================================================================
-- NORTH AFRICAN (~20 entries)
-- =============================================================================

('Couscous',
  ARRAY['couscouss', 'kuskus', 'couscous royal', 'couscous marocain', 'couscous algérien', 'couscous tunisien'],
  'north_african', FALSE,
  'Semoule de blé dur cuite à la vapeur, servie avec un bouillon épicé de légumes et viande (agneau, poulet, merguez). Plat emblématique du Maghreb.',
  'Steamed semolina served with a spiced broth of vegetables and meat (lamb, chicken, merguez). The emblematic dish of the Maghreb.'),

('Tajine',
  ARRAY['tagine', 'tadzin', 'tajine marocain', 'moroccan tagine', 'ragoût marocain', 'tagine pot'],
  'north_african', FALSE,
  'Ragoût cuit lentement dans un plat en terre cuite conique, alliant viande (agneau, poulet) à des légumes, olives, citrons confits et épices.',
  'Slow-cooked stew in a conical clay pot, combining meat (lamb, chicken) with vegetables, olives, preserved lemons and spices.'),

('Merguez',
  ARRAY['merghez', 'saucisse maghrébine', 'north african sausage', 'saucisse épicée', 'merguez grillée'],
  'north_african', FALSE,
  'Saucisse épicée à base d''agneau et/ou boeuf, parfumée au cumin, piment et harissa. Grillée à la braise ou au four.',
  'Spiced sausage made of lamb and/or beef, seasoned with cumin, chili and harissa. Grilled over charcoal or in the oven.'),

('Pastilla',
  ARRAY['pastilla', 'bastilla', 'b''stilla', 'pigeon pie moroccan', 'briouate marocaine', 'feuilleté sucré salé marocain'],
  'north_african', FALSE,
  'Tourte feuilletée (pâte warka) fourrée de pigeon ou poulet épicé, amandes sucrées et oeufs brouillés. Saupoudrée de sucre et cannelle. Spécialité festive marocaine.',
  'Flaky pastry (warka dough) filled with spiced pigeon or chicken, sweet almonds and scrambled eggs. Dusted with sugar and cinnamon. A Moroccan festive specialty.'),

('Harira',
  ARRAY['harira marocaine', 'soupe harira', 'moroccan lentil tomato soup', 'chorba marocaine'],
  'north_african', FALSE,
  'Soupe épaisse de tomates, lentilles et pois chiches avec coriandre, céleri et épices. Traditionnellement consommée pour rompre le jeûne du Ramadan.',
  'Thick soup of tomatoes, lentils and chickpeas with coriander, celery and spices. Traditionally eaten to break the Ramadan fast.'),

('Briouate',
  ARRAY['briouat', 'briouate marocain', 'feuilleté triangulaire marocain', 'moroccan pastry triangle', 'brouate'],
  'north_african', FALSE,
  'Triangles ou rouleaux de pâte warka croustillante fourrés de fromage, viande ou crevettes épicées. Souvent servis en entrée ou apéritif.',
  'Crispy warka pastry triangles or rolls filled with cheese, meat or spiced shrimp. Often served as a starter or appetizer.'),

('Chakchouka',
  ARRAY['shakshuka', 'shakshouka', 'chakchouka tunisien', 'oeufs aux tomates nord-africain', 'shakshuka tunisian'],
  'north_african', FALSE,
  'Oeufs pochés dans une sauce épaisse de tomates, poivrons et épices. Plat populaire du petit-déjeuner ou du déjeuner au Maghreb et au Moyen-Orient.',
  'Eggs poached in a thick sauce of tomatoes, peppers and spices. A popular breakfast or lunch dish across the Maghreb and Middle East.'),

('Zaalouk',
  ARRAY['zaalouk marocain', 'caviar d''aubergines marocain', 'moroccan eggplant salad', 'salade d''aubergines marocaine'],
  'north_african', FALSE,
  'Salade cuite d''aubergines et tomates mijotées avec ail, cumin, paprika et coriandre. Servie froide comme entrée ou accompagnement.',
  'Cooked salad of eggplant and tomatoes simmered with garlic, cumin, paprika and coriander. Served cold as a starter or side dish.'),

('Msemen',
  ARRAY['msemmen', 'rghaif', 'meloui', 'crêpe feuilletée marocaine', 'moroccan flatbread', 'galette marocaine'],
  'north_african', FALSE,
  'Galette feuilletée marocaine carrée, croustillante à l''extérieur et moelleuse à l''intérieur. Servie avec miel ou fromage au petit-déjeuner.',
  'Square Moroccan layered flatbread, crispy outside and soft inside. Served with honey or cheese at breakfast.'),

('Brik',
  ARRAY['brik tunisien', 'brick', 'brik à l''oeuf', 'tunisian egg pastry', 'feuille de brik'],
  'north_african', FALSE,
  'Feuilleté triangulaire tunisien de pâte fine (malsouka) fourré d''un oeuf entier, thon et câpres, frit à la poêle. L''oeuf reste coulant.',
  'Tunisian triangular pastry of thin dough (malsouka) filled with a whole egg, tuna and capers, pan-fried. The egg stays runny.'),

('Lablabi',
  ARRAY['lablabi tunisien', 'soupe de pois chiches tunisienne', 'tunisian chickpea soup', 'leblebi'],
  'north_african', FALSE,
  'Soupe tunisienne de pois chiches dans un bouillon épicé, servie sur du pain rassis émietté avec harissa, câpres et oeuf poché.',
  'Tunisian chickpea soup in a spiced broth, served over crumbled stale bread with harissa, capers and a poached egg.'),

('Mechouia',
  ARRAY['mechouia tunisienne', 'salade mechouia', 'tunisian grilled salad', 'salade de légumes grillés tunisienne'],
  'north_african', FALSE,
  'Salade tunisienne de tomates, poivrons et piments grillés puis écrasés avec ail, huile d''olive et thon. Servie froide en entrée.',
  'Tunisian salad of grilled and crushed tomatoes, peppers and chili with garlic, olive oil and tuna. Served cold as a starter.'),

('Chorba',
  ARRAY['chorba algérienne', 'shorba', 'soupe algérienne', 'algerian soup', 'chorba frik'],
  'north_african', FALSE,
  'Soupe consistante algérienne à base de viande d''agneau, tomates et frik (blé vert concassé), parfumée à la coriandre et ras el hanout.',
  'Hearty Algerian soup made with lamb, tomatoes and frik (cracked green wheat), flavored with coriander and ras el hanout.'),

('Kefta',
  ARRAY['kefta marocaine', 'kofta marocain', 'moroccan meatballs', 'boulettes marocaines épicées'],
  'north_african', FALSE,
  'Boulettes ou brochettes de viande hachée épicée (agneau ou boeuf) avec persil, coriandre, cumin et paprika. Cuites en tajine, au four ou grillées.',
  'Spiced ground meat balls or skewers (lamb or beef) with parsley, coriander, cumin and paprika. Cooked in tagine, oven or grilled.'),

('Loubia',
  ARRAY['loubia marocaine', 'haricots blancs marocains', 'moroccan white beans', 'fasoulia'],
  'north_african', FALSE,
  'Ragoût de haricots blancs mijotés avec tomates, paprika, cumin et huile d''olive. Plat végétarien réconfortant du Maghreb.',
  'Stew of white beans simmered with tomatoes, paprika, cumin and olive oil. A comforting vegetarian dish from the Maghreb.'),

('Rfissa',
  ARRAY['rfissa marocaine', 'moroccan chicken fenugreek', 'poulet fenugrec marocain', 'trid rfissa'],
  'north_african', FALSE,
  'Plat marocain de poulet mijoté aux lentilles, fenugrec et ras el hanout, servi sur des feuillets de msemen émiettés. Plat de fête traditionnel.',
  'Moroccan dish of chicken braised with lentils, fenugreek and ras el hanout, served over crumbled msemen sheets. A traditional celebration dish.'),

('Makroud',
  ARRAY['makrout', 'makroud algérien', 'gâteau semoule dattes', 'semolina date cake', 'algerian semolina pastry'],
  'north_african', FALSE,
  'Pâtisserie maghrébine de semoule de blé fourrée de pâte de dattes, frite puis trempée dans du miel. Dessert emblématique de l''Algérie et de la Tunisie.',
  'Maghrebi semolina pastry filled with date paste, fried then dipped in honey. An emblematic dessert of Algeria and Tunisia.'),

('Ful Medames',
  ARRAY['ful medames', 'foul', 'fèves cuites', 'egyptian fava beans', 'fouul', 'ful'],
  'north_african', FALSE,
  'Fèves mijotées avec huile d''olive, ail, citron et cumin. Plat de petit-déjeuner emblématique d''Égypte et du Moyen-Orient.',
  'Fava beans simmered with olive oil, garlic, lemon and cumin. The emblematic breakfast dish of Egypt and the Middle East.'),

('Ojja',
  ARRAY['ojja tunisienne', 'chakchouka tunisienne', 'oeufs merguez tunisien', 'tunisian eggs sausage'],
  'north_african', FALSE,
  'Plat tunisien d''oeufs pochés dans une sauce tomate épicée avec merguez ou crevettes, poivrons et harissa.',
  'Tunisian dish of eggs poached in a spicy tomato sauce with merguez or shrimp, peppers and harissa.'),

('Mloukhia',
  ARRAY['mouloukhia', 'corchorus', 'molokhia', 'corète potagère', 'jute leaves dish'],
  'north_african', FALSE,
  'Ragoût de feuilles de corète (jute) séchées et réduites en poudre, cuit avec poulet ou agneau dans un bouillon épicé. Plat national tunisien.',
  'Stew of dried and powdered jute leaves cooked with chicken or lamb in a spiced broth. A Tunisian national dish.'),

-- =============================================================================
-- ALSATIAN (~15 entries)
-- =============================================================================

('Tarte Flambée',
  ARRAY['flammekueche', 'flammekuche', 'tarte flambée alsacienne', 'flam', 'pizza alsacienne'],
  'alsatian', FALSE,
  'Fine galette de pâte recouverte de fromage blanc, crème fraîche, oignons et lardons, cuite dans un four très chaud. Spécialité emblématique d''Alsace.',
  'Thin flatbread dough topped with fromage blanc, crème fraîche, onions and bacon, cooked in a very hot oven. The emblematic Alsatian specialty.'),

('Choucroute',
  ARRAY['choucroute garnie', 'sauerkraut', 'choucroute alsacienne', 'sauerkraut alsace', 'chou fermenté garni'],
  'alsatian', FALSE,
  'Chou blanc fermenté (choucroute) cuit dans du riesling avec des charcuteries (jambonneau, saucisses de Strasbourg, lard). Plat emblématique alsacien.',
  'Fermented white cabbage (sauerkraut) cooked in riesling with cold cuts (ham hock, Strasbourg sausages, bacon). The emblematic Alsatian dish.'),

('Baeckeoffe',
  ARRAY['baeckehoffe', 'beckenofe', 'bäckeoffe', 'potée alsacienne', 'alsatian meat stew'],
  'alsatian', FALSE,
  'Ragoût alsacien de trois viandes (porc, agneau, boeuf) marinées dans le riesling, cuites au four dans une terrine lutée. Plat de lundi lavage traditionnellement.',
  'Alsatian stew of three meats (pork, lamb, beef) marinated in riesling, oven-cooked in a sealed terrine. Traditionally a Monday wash-day dish.'),

('Munster',
  ARRAY['munster alsacien', 'fromage munster', 'munster géromé', 'alsatian munster cheese', 'munster fermier'],
  'alsatian', FALSE,
  'Fromage à croûte lavée AOP d''Alsace, à la saveur puissante et à la texture crémeuse. Servi seul ou fondu sur tarte flambée.',
  'AOC washed-rind cheese from Alsace, with a strong flavor and creamy texture. Served alone or melted on tarte flambée.'),

('Fleischnacka',
  ARRAY['fleischnaka', 'fleischschnacka', 'rouleau de viande alsacien', 'alsatian meat roll', 'pâte farcie alsacienne'],
  'alsatian', FALSE,
  'Roulade de pâte farcie de viande hachée épicée, tranchée et cuite dans un bouillon. Spécialité alsacienne conviviale.',
  'Pastry roll filled with spiced ground meat, sliced and cooked in broth. A convivial Alsatian specialty.'),

('Bibalakas',
  ARRAY['bibeleskaes', 'bibelskäs', 'bibalakas', 'fromage blanc alsacien', 'alsatian cheese dip', 'fromage blanc herbes'],
  'alsatian', FALSE,
  'Fromage blanc alsacien assaisonné d''herbes fraîches (ciboulette, persil), ail et échalotes. Servi avec pain ou pommes de terre.',
  'Alsatian fresh cheese seasoned with fresh herbs (chives, parsley), garlic and shallots. Served with bread or potatoes.'),

('Bretzel',
  ARRAY['pretzel', 'bretzel alsacien', 'alsatian pretzel', 'bretzl', 'knot bread'],
  'alsatian', FALSE,
  'Pain en forme de noeud recouvert de sel gemme, à la croûte brune brillante obtenue par trempage dans de l''eau alcaline. Symbole de l''Alsace.',
  'Knot-shaped bread covered in rock salt, with a shiny brown crust achieved by dipping in alkaline water. A symbol of Alsace.'),

('Presskopf',
  ARRAY['presskopf alsacien', 'fromage de tête', 'head cheese', 'pâté de tête alsacien', 'sülze'],
  'alsatian', FALSE,
  'Charcuterie alsacienne de morceaux de tête de porc en gelée, assaisonnée de vinaigre et herbes. Servie en tranches en charcuterie.',
  'Alsatian charcuterie of pork head pieces in aspic, seasoned with vinegar and herbs. Served sliced as cold cut.'),

('Spätzle',
  ARRAY['spaetzle', 'spaetzli', 'pâtes alsaciennes', 'alsatian egg noodles', 'knöpfle'],
  'alsatian', FALSE,
  'Petites pâtes irrégulières faites d''une pâte d''oeuf pressée à travers une passoire dans l''eau bouillante. Servies en accompagnement ou sautées au beurre.',
  'Small irregular pasta made from egg dough pressed through a colander into boiling water. Served as a side dish or sautéed in butter.'),

('Kugelhopf',
  ARRAY['kougelhof', 'kouglof', 'kugelhopf', 'gâteau alsacien levé', 'alsatian bundt cake'],
  'alsatian', FALSE,
  'Brioche alsacienne levée en forme de couronne à godrons, aux raisins secs et amandes, cuite dans un moule en terre cuite caractéristique.',
  'Risen Alsatian brioche in a fluted crown shape, with raisins and almonds, baked in a characteristic terracotta mold.'),

('Streusel',
  ARRAY['streusel alsacien', 'tarte streusel', 'alsatian crumble cake', 'crumble tarte alsacienne'],
  'alsatian', FALSE,
  'Gâteau ou tarte recouvert de streusel (pâte sablée émiettée au beurre), souvent aux quetsches ou mirabelles.',
  'Cake or tart topped with streusel (crumbly butter shortcrust), often with quetsche plums or mirabelle plums.'),

('Roïgabrageldi',
  ARRAY['roigabrageldi', 'pommes de terre sautées alsaciennes', 'alsatian fried potatoes', 'grumbeeragebradeldi'],
  'alsatian', FALSE,
  'Pommes de terre sautées alsaciennes à la graisse d''oie ou lard, oignons et herbes. Accompagnement traditionnel des plats de viande.',
  'Alsatian sautéed potatoes in goose fat or lard, with onions and herbs. Traditional accompaniment to meat dishes.'),

('Bredele',
  ARRAY['bredalas', 'bredela', 'biscuits de Noël alsaciens', 'alsatian christmas cookies', 'petits gâteaux alsaciens'],
  'alsatian', FALSE,
  'Petits biscuits de Noël alsaciens aux formes variées (étoiles, sapins, coeurs), parfumés à la cannelle, anis ou citron.',
  'Small Alsatian Christmas cookies in various shapes (stars, fir trees, hearts), flavored with cinnamon, anise or lemon.'),

('Winstub',
  ARRAY['winstub alsacien', 'plat winstub', 'taverne alsacienne', 'alsatian tavern dish'],
  'alsatian', FALSE,
  'Plat de brasserie alsacienne traditionnel servi dans les winstubs (petits restaurants conviviaux), souvent salade de pommes de terre au lard ou choucroute.',
  'Traditional Alsatian brasserie dish served in winstubs (cozy small restaurants), often potato salad with bacon or choucroute.'),

('Fleischschnacka',
  ARRAY['fleischnecken', 'escargots de viande alsaciens', 'meat snails alsace', 'roulade viande pâte'],
  'alsatian', FALSE,
  'Pâte à nouille roulée avec une farce de boeuf haché braisé, tranchée en rondelles et mijotée dans un bouillon de boeuf. Spécialité alsacienne conviviale.',
  'Noodle dough rolled with braised minced beef filling, sliced into rounds and simmered in beef broth. A convivial Alsatian specialty.'),

-- =============================================================================
-- JAPANESE (~15 entries)
-- =============================================================================

('Ramen',
  ARRAY['ramen japonais', 'soupe ramen', 'japanese ramen', 'tonkotsu ramen', 'shio ramen', 'shoyu ramen', 'miso ramen'],
  'japanese', FALSE,
  'Soupe de nouilles de blé dans un bouillon riche (tonkotsu, shoyu, shio ou miso), garnie de chashu (porc braisé), oeuf mariné, bambou et nori.',
  'Wheat noodle soup in a rich broth (tonkotsu, shoyu, shio or miso), topped with chashu (braised pork), marinated egg, bamboo shoots and nori.'),

('Gyoza',
  ARRAY['jiaozi japonais', 'ravioli japonais', 'japanese gyoza', 'pot stickers', 'dumpling grillé', 'yaki gyoza'],
  'japanese', FALSE,
  'Raviolis japonais fourrés de porc haché et chou chinois, cuits à la vapeur puis poêlés pour une base croustillante. Servis avec sauce soja-vinaigre.',
  'Japanese dumplings filled with ground pork and Chinese cabbage, steamed then pan-fried for a crispy base. Served with soy-vinegar dipping sauce.'),

('Takoyaki',
  ARRAY['octopus balls', 'boules de poulpe', 'takoyaki japonais', 'billes de poulpe', 'osaka takoyaki'],
  'japanese', FALSE,
  'Boulettes de pâte grillées fourrées de morceaux de poulpe, garnies de sauce takoyaki, mayonnaise japonaise et flocons de bonite. Spécialité d''Osaka.',
  'Grilled batter balls filled with octopus pieces, topped with takoyaki sauce, Japanese mayonnaise and bonito flakes. Osaka specialty.'),

('Okonomiyaki',
  ARRAY['okonomi yaki', 'crêpe japonaise', 'japanese pancake savory', 'pizza japonaise', 'japanese savory pancake'],
  'japanese', FALSE,
  'Galette japonaise épaisse à la farine de blé, chou, oeufs et garnitures au choix (crevettes, porc, fromage), garnie de sauce okonomiyaki, mayonnaise et nori.',
  'Thick Japanese pancake with wheat flour, cabbage, eggs and toppings of choice (shrimp, pork, cheese), topped with okonomiyaki sauce, mayo and nori.'),

('Tonkatsu',
  ARRAY['ton katsu', 'côtelette panée japonaise', 'japanese pork cutlet', 'tonkatsu porc', 'katsu'],
  'japanese', FALSE,
  'Côtelette de porc panée et frite dans de l''huile, servie sur riz ou avec chou râpé et sauce tonkatsu. Plat populaire du quotidien japonais.',
  'Breaded and deep-fried pork cutlet, served on rice or with shredded cabbage and tonkatsu sauce. A popular everyday Japanese dish.'),

('Tempura',
  ARRAY['tempura japonaise', 'beignets japonais', 'japanese tempura', 'friture japonaise légère'],
  'japanese', FALSE,
  'Crevettes ou légumes enrobés d''une pâte légère et frits à haute température pour un enrobage délicat et croustillant. Servis avec dashi-soja.',
  'Shrimp or vegetables coated in light batter and fried at high temperature for a delicate crispy coating. Served with dashi-soy dipping sauce.'),

('Karaage',
  ARRAY['kara age', 'poulet frit japonais', 'japanese fried chicken', 'poulet karaage', 'tori karaage'],
  'japanese', FALSE,
  'Morceaux de poulet marinés au shoyu et gingembre, enrobés de fécule de pomme de terre et frits pour une texture croustillante. Accompagnés de mayonnaise et citron.',
  'Chicken pieces marinated in soy sauce and ginger, coated in potato starch and fried for a crispy texture. Served with mayonnaise and lemon.'),

('Katsudon',
  ARRAY['katsu don', 'riz tonkatsu', 'rice bowl pork cutlet', 'donburi katsu', 'katsudon bowl'],
  'japanese', FALSE,
  'Bol de riz (donburi) garni de tonkatsu (côtelette de porc panée) et oeufs mijotés dans un bouillon dashi-soja sucré.',
  'Rice bowl (donburi) topped with tonkatsu (breaded pork cutlet) and eggs simmered in a sweet dashi-soy broth.'),

('Yakitori',
  ARRAY['yaki tori', 'brochettes de poulet japonaises', 'japanese chicken skewers', 'tori yaki'],
  'japanese', FALSE,
  'Brochettes de poulet grillées sur charbon (yakitori = viande grillée), avec sauce tare sucrée-salée ou simplement sel. Plusieurs parties du poulet utilisées.',
  'Chicken skewers grilled over charcoal (yakitori = grilled bird), with sweet-salty tare sauce or simply salt. Various parts of the chicken used.'),

('Edamame',
  ARRAY['edamame japonais', 'fèves de soja', 'soy beans', 'haricots soja', 'green soybeans'],
  'japanese', FALSE,
  'Gousses de soja immatures, cuites à la vapeur ou bouillies avec du sel. Apéritif populaire dans les izakayas (bars à vin japonais).',
  'Immature soybean pods, steamed or boiled with salt. A popular appetizer in izakayas (Japanese gastropubs).'),

('Miso Soup',
  ARRAY['soupe miso', 'miso shiru', 'misoshiru', 'soupe miso japonaise', 'dashi miso'],
  'japanese', FALSE,
  'Bouillon dashi (kombu-bonite) dans lequel est dissous du miso (pâte de soja fermenté), garni de tofu, algues wakame et ciboule.',
  'Dashi broth (kombu-bonito) in which miso (fermented soybean paste) is dissolved, garnished with tofu, wakame seaweed and spring onions.'),

('Onigiri',
  ARRAY['onigiri japonais', 'boulette de riz japonaise', 'japanese rice ball', 'riceball', 'omusubi'],
  'japanese', FALSE,
  'Boulette de riz japonais compressé en forme de triangle ou ovale, fourrée de saumon, thon mayo ou prune umeboshi, enveloppée de nori.',
  'Japanese compressed rice ball shaped into a triangle or oval, filled with salmon, tuna mayo or umeboshi plum, wrapped in nori.'),

('Chirashi',
  ARRAY['chirashi sushi', 'chirashizushi', 'bol de sushi', 'sushi bowl', 'bol riz poisson cru'],
  'japanese', FALSE,
  'Bol de riz à sushi vinaigré surmonté d''assortiment de poissons et fruits de mer crus (sashimi), décorés de roe, avocat et légumes marinés.',
  'Vinegared sushi rice bowl topped with an assortment of raw fish and seafood (sashimi), decorated with roe, avocado and pickled vegetables.'),

('Soba',
  ARRAY['soba japonaises', 'nouilles soba', 'japanese buckwheat noodles', 'sarrasin japonais', 'zaru soba'],
  'japanese', FALSE,
  'Nouilles de sarrasin japonaises, servies froides avec sauce tsuyu (dashi-soja-mirin) pour tremper, ou chaudes en soupe. Plat traditionnel du Nouvel An.',
  'Japanese buckwheat noodles, served cold with tsuyu dipping sauce (dashi-soy-mirin) or hot in soup. A traditional New Year dish.'),

('Udon',
  ARRAY['udon japonais', 'nouilles udon', 'japanese thick noodles', 'nouilles épaisses japonaises'],
  'japanese', FALSE,
  'Épaisses nouilles de farine de blé japonaises, servies en soupe chaude avec dashi, sauce soja et diverses garnitures (tempura, kamaboko, abura age).',
  'Thick Japanese wheat flour noodles, served in hot dashi soup with soy sauce and various toppings (tempura, fish cake, fried tofu).'),

-- =============================================================================
-- ITALIAN (~15 entries)
-- =============================================================================

('Osso Buco',
  ARRAY['ossobuco', 'osso buco milanese', 'jarret de veau braisé', 'braised veal shank', 'risotto osso buco'],
  'italian', FALSE,
  'Jarret de veau braisé dans vin blanc, tomates et bouillon avec gremolata (citron, persil, ail). Spécialité milanaise, servi avec risotto jaune au safran.',
  'Veal shank braised in white wine, tomatoes and broth with gremolata (lemon, parsley, garlic). A Milanese specialty, served with saffron risotto.'),

('Arancini',
  ARRAY['arancine', 'arancino', 'boulettes de riz siciliennes', 'sicilian rice balls', 'arancini di riso'],
  'italian', FALSE,
  'Boulettes de riz siciliennes fourrées de ragoût de viande, mozzarella et petits pois, panées et frites. Spécialité de rue sicilienne.',
  'Sicilian rice balls filled with meat ragù, mozzarella and peas, breaded and fried. A Sicilian street food specialty.'),

('Burrata',
  ARRAY['burrata italienne', 'burrata pugliese', 'mozarella burrata', 'fresh burrata'],
  'italian', FALSE,
  'Fromage frais des Pouilles à coque de mozzarella remplie de crème et filaments de mozzarella (stracciatella). Servie avec tomates et huile d''olive.',
  'Fresh cheese from Apulia with a mozzarella shell filled with cream and mozzarella strands (stracciatella). Served with tomatoes and olive oil.'),

('Tiramisu',
  ARRAY['tiramisu', 'tiramisù', 'dessert mascarpone', 'tira mi su', 'tiramisu italien'],
  'italian', FALSE,
  'Dessert en couches de biscuits (savoiardi) imbibés de café et alcool, alternés avec crème au mascarpone et jaunes d''oeufs, saupoudré de cacao.',
  'Layered dessert of coffee and liquor-soaked ladyfinger biscuits alternated with mascarpone cream and egg yolks, dusted with cocoa.'),

('Saltimbocca',
  ARRAY['saltimbocca alla romana', 'escalope romain', 'veal with prosciutto sage', 'saltinbocca'],
  'italian', FALSE,
  'Escalopes de veau fines surmontées de prosciutto et sauge, sautées au beurre et vin blanc. Spécialité romaine (saltimbocca = saute en bouche).',
  'Thin veal escalopes topped with prosciutto and sage, sautéed in butter and white wine. Roman specialty (saltimbocca = jumps in the mouth).'),

('Panna Cotta',
  ARRAY['panna cota', 'pannacotta', 'crème cuite italienne', 'italian cooked cream dessert'],
  'italian', FALSE,
  'Dessert de crème cuite gélifiée à la gélatine, à la texture soyeuse, servi avec coulis de fruits rouges ou caramel. Originaire du Piémont.',
  'Gelatin-set cooked cream dessert with a silky texture, served with red berry coulis or caramel. Originally from Piedmont.'),

('Bruschetta',
  ARRAY['bruschetta italienne', 'toast tomates italiens', 'italian toasted bread', 'antipasto bruschetta'],
  'italian', FALSE,
  'Tranches de pain grillé frottées à l''ail, arrosées d''huile d''olive et garnies de tomates fraîches, basilic et sel. Antipasto classique.',
  'Grilled bread slices rubbed with garlic, drizzled with olive oil and topped with fresh tomatoes, basil and salt. Classic antipasto.'),

('Gnocchi',
  ARRAY['gnocchi italiens', 'gnocchi de pommes de terre', 'potato gnocchi', 'gnocci'],
  'italian', FALSE,
  'Petits boulettes de pommes de terre et farine, à la texture moelleuse, servies avec sauce au gorgonzola, pesto ou tomates.',
  'Small potato and flour dumplings with a soft texture, served with gorgonzola sauce, pesto or tomatoes.'),

('Vitello Tonnato',
  ARRAY['vitel tonné', 'veau au thon', 'veal tuna sauce', 'vitello tonato', 'antipasto veau'],
  'italian', FALSE,
  'Fines tranches de veau braisé nappées d''une sauce crémeuse au thon, câpres et anchois. Antipasto piémontais servi froid.',
  'Thin slices of braised veal coated in a creamy tuna, caper and anchovy sauce. Piedmontese antipasto served cold.'),

('Ribollita',
  ARRAY['ribollita toscane', 'soupe toscane', 'tuscan bread soup', 'soupe de pain toscane'],
  'italian', FALSE,
  'Soupe toscane épaisse de haricots cannellini, légumes, pain rassis et chou lacinato (nero), réchauffée plusieurs fois (ribollita = rebouillie).',
  'Thick Tuscan soup of cannellini beans, vegetables, stale bread and lacinato (black) cabbage, reheated multiple times (ribollita = reboiled).'),

('Caponata',
  ARRAY['caponata sicilienne', 'ratatouille sicilienne', 'sicilian eggplant stew', 'aubergines siciliennes'],
  'italian', FALSE,
  'Ragoût aigre-doux sicilien d''aubergines, tomates, céleri, olives et câpres avec vinaigre et sucre. Servi froid en antipasto ou accompagnement.',
  'Sicilian sweet-and-sour stew of eggplant, tomatoes, celery, olives and capers with vinegar and sugar. Served cold as antipasto or side dish.'),

('Supplì',
  ARRAY['suppli', 'supplì romani', 'boulettes de riz romaines', 'roman rice croquettes', 'rice balls rome'],
  'italian', FALSE,
  'Croquettes de riz romaines fourrées de mozzarella et ragù, panées et frites. Différentes des arancini par leur forme allongée et leur simplicité.',
  'Roman rice croquettes filled with mozzarella and ragù, breaded and fried. Different from arancini by their elongated shape and simplicity.'),

('Cacio e Pepe',
  ARRAY['cacio pepe', 'pâtes au fromage et poivre', 'pasta cheese pepper', 'tonnarelli cacio pepe'],
  'italian', FALSE,
  'Pâtes romaines (souvent tonnarelli) avec sauce crémeuse de pecorino romano fondu et poivre noir fraîchement moulu. Recette minimaliste emblématique.',
  'Roman pasta (often tonnarelli) with a creamy sauce of melted pecorino romano and freshly ground black pepper. An emblematic minimalist recipe.'),

('Polenta',
  ARRAY['polenta italienne', 'porridge de maïs', 'cornmeal porridge', 'polenta crémeuse'],
  'italian', FALSE,
  'Bouillie de semoule de maïs cuite dans l''eau ou le bouillon, servie crémeuse ou laissée à refroidir et grillée. Accompagnement du nord de l''Italie.',
  'Porridge of cornmeal cooked in water or broth, served creamy or left to set and grilled. A northern Italian accompaniment.'),

('Risotto',
  ARRAY['risotto italien', 'riz risotto', 'risotto milanese', 'risotto champignons', 'riz crémeux'],
  'italian', FALSE,
  'Riz à grains ronds (arborio, carnaroli) cuit par absorption progressive de bouillon chaud, avec parmesan et beurre pour la mantecatura. Base de nombreuses déclinaisons.',
  'Round-grain rice (arborio, carnaroli) cooked by gradual absorption of hot broth, with parmesan and butter for mantecatura. Base for many variations.'),

-- =============================================================================
-- CHINESE (~15 entries)
-- =============================================================================

('Dim Sum',
  ARRAY['dimsum', 'dim sum chinois', 'chinese dim sum', 'yum cha', 'petits plats vapeur chinois'],
  'chinese', FALSE,
  'Assortiment de petits plats cantonais servis en bambouseraies à vapeur ou en assiettes lors du yum cha (thé du matin). Inclut har gow, siu mai, char siu bao.',
  'Assortment of small Cantonese dishes served in bamboo steamers or on plates during yum cha (morning tea). Includes har gow, siu mai, char siu bao.'),

('Peking Duck',
  ARRAY['canard laqué de Pékin', 'canard pékinois', 'beijing duck', 'pekin duck', 'canard laqué'],
  'chinese', FALSE,
  'Canard rôti selon une technique ancestrale (séchage, enrobage miel, cuisson au bois de fruitier) pour une peau croustillante. Servi avec crêpes mandarin, concombre et sauce hoisin.',
  'Duck roasted using an ancestral technique (air-drying, honey glaze, fruit wood roasting) for crispy skin. Served with mandarin pancakes, cucumber and hoisin sauce.'),

('Mapo Tofu',
  ARRAY['mapo doufu', 'tofu épicé sichuan', 'sichuan spicy tofu', 'ma po tofu', 'tofu pimenté'],
  'chinese', FALSE,
  'Tofu soyeux dans une sauce épicée et engourdie de viande hachée, haricots noirs fermentés, piment et poivre de Sichuan. Spécialité du Sichuan.',
  'Silky tofu in a spicy and numbing sauce with ground meat, fermented black beans, chili and Sichuan pepper. A Sichuan specialty.'),

('Baozi',
  ARRAY['bao', 'baozi chinois', 'chinese steamed buns', 'charsiu bao', 'brioche vapeur chinoise', 'mantou farci'],
  'chinese', FALSE,
  'Brioches de pâte levée cuite à la vapeur, fourrées de porc au barbecue (char siu), légumes ou haricots rouges sucrés. Disponibles grillées (sheng jian).',
  'Steamed leavened dough buns filled with BBQ pork (char siu), vegetables or sweet red beans. Also available pan-fried (sheng jian).'),

('Dan Dan Noodles',
  ARRAY['dan dan mian', 'nouilles dan dan sichuan', 'sichuan noodles sesame', 'nouilles au sésame pimentées'],
  'chinese', FALSE,
  'Nouilles de blé du Sichuan dans une sauce au sésame, pâte de chili, vinaigre et viande hachée épicée, garnies de noix de cajou et ciboule.',
  'Sichuan wheat noodles in a sesame paste, chili oil, vinegar and spiced ground meat sauce, topped with Sichuan pickles and spring onions.'),

('Char Siu',
  ARRAY['charsiu', 'char sieu', 'porc laqué cantonais', 'chinese BBQ pork', 'porc barbecue cantonais'],
  'chinese', FALSE,
  'Porc rouge laqué à la sauce hoisin, sucre, soja et alcool de riz, rôti sur une grille jusqu''à caramélisation. Incontournable cantonais.',
  'Red-lacquered pork with hoisin sauce, sugar, soy and rice wine, roasted on a rack until caramelized. A Cantonese staple.'),

('Xiaolongbao',
  ARRAY['xiao long bao', 'soup dumplings', 'raviolis soupe shanghai', 'shanghai soup dumplings', 'petits pains soupe'],
  'chinese', FALSE,
  'Raviolis vapeur shanghaïens fourrés de porc haché et bouillon gélé qui fond à la vapeur, créant une soupe à l''intérieur. Mangés avec vinaigre et gingembre.',
  'Shanghainese steamed dumplings filled with ground pork and gelled broth that melts during steaming, creating soup inside. Eaten with vinegar and ginger.'),

('Hot Pot',
  ARRAY['hot pot chinois', 'fondue chinoise', 'chinese hot pot', 'marmite chinoise', 'shabu shabu chinois'],
  'chinese', FALSE,
  'Bouillon chaud (épicé ou non) dans lequel les convives cuisent eux-mêmes viandes, légumes, tofu et fruits de mer. Expérience conviviale et interactive.',
  'Hot broth (spicy or plain) in which diners cook their own meats, vegetables, tofu and seafood. A convivial and interactive dining experience.'),

('Congee',
  ARRAY['congee', 'jook', 'bouillie de riz chinoise', 'rice porridge', 'zhou'],
  'chinese', FALSE,
  'Bouillie de riz cuite longuement dans un abondant bouillon jusqu''à consistance crémeuse. Servie avec garnitures variées (poulet effiloché, oeuf du siècle, ciboule).',
  'Rice porridge cooked slowly in abundant broth to a creamy consistency. Served with various toppings (shredded chicken, century egg, spring onions).'),

('Jiaozi',
  ARRAY['jiaozi', 'ravioli chinois', 'chinese dumplings', 'boiled dumplings', 'shui jiao'],
  'chinese', FALSE,
  'Raviolis chinois bouillis fourrés de porc haché et chou ou crevettes. Plat festif du Nouvel An chinois, chaque famille ayant sa recette.',
  'Chinese boiled dumplings filled with ground pork and cabbage or shrimp. A Chinese New Year festive dish, each family having its own recipe.'),

('Zongzi',
  ARRAY['zong zi', 'boulette de riz feuille bambou', 'bamboo leaf rice dumpling', 'sticky rice dumpling'],
  'chinese', FALSE,
  'Riz gluant farci (porc, haricots rouges, champignons, jaune d''oeuf) enveloppé dans des feuilles de bambou et cuit à la vapeur. Traditionnellement pour la Fête des bateaux-dragons.',
  'Sticky rice stuffed with fillings (pork, red beans, mushrooms, egg yolk) wrapped in bamboo leaves and steamed. Traditionally for the Dragon Boat Festival.'),

('Spring Rolls',
  ARRAY['rouleaux de printemps', 'nems', 'chun juan', 'cha gio', 'fresh spring rolls'],
  'chinese', FALSE,
  'Rouleaux frits de pâte fine (ou de riz) fourrés de légumes et viande/crevettes. Différents des nems vietnamiens par la pâte et la farce.',
  'Fried thin pastry (or rice) rolls filled with vegetables and meat/shrimp. Different from Vietnamese nem by the pastry and filling.'),

('Chow Mein',
  ARRAY['chow mein', 'nouilles sautées chinoises', 'chinese stir-fried noodles', 'lo mein'],
  'chinese', FALSE,
  'Nouilles de blé sautées à feu vif avec légumes, viande ou crevettes, sauce soja et huile de sésame. Plat de base de la cuisine cantonaise.',
  'Wheat noodles stir-fried on high heat with vegetables, meat or shrimp, soy sauce and sesame oil. A staple of Cantonese cuisine.'),

('Kung Pao Chicken',
  ARRAY['kung pao poulet', 'poulet kung pao', 'gong bao ji ding', 'poulet épicé sichuan', 'kung po chicken'],
  'chinese', FALSE,
  'Poulet sauté du Sichuan avec arachides, piment séché, poivre de Sichuan et légumes dans une sauce sucrée-salée-pimentée.',
  'Stir-fried Sichuan chicken with peanuts, dried chili, Sichuan pepper and vegetables in a sweet-salty-spicy sauce.'),

('Wonton Soup',
  ARRAY['soupe wonton', 'hun tun', 'wonton soup', 'ravioli soupe chinois', 'wantan'],
  'chinese', FALSE,
  'Bouillon léger cantonais garni de wontons (raviolis de pâte fine fourrés de porc et crevettes), ciboule et quelques légumes.',
  'Light Cantonese broth garnished with wontons (thin pastry dumplings filled with pork and shrimp), spring onions and a few vegetables.'),

-- =============================================================================
-- FRENCH GASTRONOMY (~15 entries)
-- =============================================================================

('Pot-au-feu',
  ARRAY['pot au feu', 'potaufeu', 'french beef stew', 'bouilli français', 'boeuf bouilli légumes'],
  'french', FALSE,
  'Plat bourgeois de boeuf (plusieurs morceaux) et légumes racines (carotte, poireau, navet, céleri) cuits longuement dans un bouillon clair. Servi avec os à moelle et cornichons.',
  'Classic French dish of beef (various cuts) and root vegetables (carrot, leek, turnip, celery) slow-cooked in a clear broth. Served with marrow bones and gherkins.'),

('Blanquette de Veau',
  ARRAY['blanquette de veau', 'blanquette veau', 'veal blanquette', 'ragoût veau blanc', 'blanquette'],
  'french', FALSE,
  'Ragoût de veau en sauce blanche crémeuse (fond de veau lié à la crème et jaune d''oeuf), avec champignons et oignons perlés. Plat bourgeois classique.',
  'Veal stew in creamy white sauce (veal stock thickened with cream and egg yolk), with mushrooms and pearl onions. A classic bourgeois dish.'),

('Bouillabaisse',
  ARRAY['bouillabaisse marseillaise', 'soupe de poisson marseille', 'marseille fish stew', 'bouillabaisse provençale'],
  'french', FALSE,
  'Soupe de poissons provençale de Marseille — rascasse, grondin, saint-pierre — dans un bouillon safran-tomates-fenouil, servie avec rouille et croûtons frottés à l''ail.',
  'Provençal fish soup from Marseille — scorpionfish, gurnard, john dory — in a saffron-tomato-fennel broth, served with rouille and garlic-rubbed croutons.'),

('Quenelle',
  ARRAY['quenelle lyonnaise', 'quenelles de brochet', 'pike quenelle', 'quenelles sauce nantua'],
  'french', FALSE,
  'Boulette allongée lyonnaise de brochet ou de veau mixé, pochée dans l''eau, servie avec sauce Nantua (homard) ou beurre blanc. Spécialité de Lyon.',
  'Elongated Lyonnaise dumpling of blended pike or veal, poached in water, served with Nantua sauce (lobster) or beurre blanc. Lyon specialty.'),

('Cassoulet',
  ARRAY['cassoulet de castelnaudary', 'cassoulet toulousain', 'cassoulet', 'white bean sausage confit'],
  'french', FALSE,
  'Ragoût mijoté du Languedoc de haricots blancs secs avec confit de canard, saucisses de Toulouse et couenne de porc, cuit au four sous une croûte.',
  'Languedoc slow-cooked stew of dried white beans with duck confit, Toulouse sausages and pork rind, oven-baked under a crust.'),

('Confit de Canard',
  ARRAY['confit canard', 'canard confit', 'duck confit', 'cuisse de canard confite', 'canard graisse d''oie'],
  'french', FALSE,
  'Cuisse de canard marinée au sel puis cuite lentement dans sa propre graisse jusqu''à tendreté. Conserve traditionnelle du Périgord, servie rôtie.',
  'Duck leg salted then slow-cooked in its own fat until tender. A traditional Périgord preserve, served roasted.'),

('Tête de Veau',
  ARRAY['tête de veau sauce gribiche', 'tête de veau ravigote', 'veal head', 'calf head sauce'],
  'french', FALSE,
  'Morceaux de tête de veau pochés (museau, langue, cervelle), servis avec sauce gribiche (vinaigrette aux oeufs durs, câpres, cornichons) ou ravigote.',
  'Poached veal head pieces (muzzle, tongue, brain), served with gribiche sauce (hard-boiled egg vinaigrette with capers, gherkins) or ravigote.'),

('Andouillette',
  ARRAY['andouillette grillée', 'andouillette AAAAA', 'andouillette de troyes', 'chitterling sausage french'],
  'french', FALSE,
  'Saucisse française de tripes et chaudins de porc, à l''odeur caractéristique, grillée et servie avec moutarde. Authentifiée AAAAA par les gastronomes.',
  'French sausage of pork tripe and chitterlings, with a characteristic smell, grilled and served with mustard. Authenticated AAAAA by gastronomes.'),

('Rillettes',
  ARRAY['rillettes du mans', 'rillettes de porc', 'pork rillettes', 'rillettes tours', 'pâté en terrine'],
  'french', FALSE,
  'Viande de porc (ou canard, saumon) cuite lentement jusqu''à effilochage puis mélangée à sa graisse. Servie froide comme pâté à tartiner sur pain.',
  'Pork (or duck, salmon) meat slow-cooked until shredded then mixed with its fat. Served cold as a spreadable pâté on bread.'),

('Brandade',
  ARRAY['brandade de morue', 'brandade nîmoise', 'salted cod brandade', 'morue brandade', 'bacalao brandade'],
  'french', FALSE,
  'Purée crémeuse de morue (cabillaud salé) et huile d''olive, parfois enrichie de pommes de terre. Spécialité de Nîmes et du Languedoc.',
  'Creamy purée of salt cod (dried codfish) and olive oil, sometimes enriched with potatoes. Specialty of Nîmes and Languedoc.'),

('Aligot',
  ARRAY['aligoté', 'aligot aubrac', 'purée de fromage auvergnate', 'auvergne cheese mash', 'purée tome fraîche'],
  'french', FALSE,
  'Purée de pommes de terre filante et élastique mélangée à la tome fraîche de l''Aubrac fondue et à l''ail. Spécialité de l''Aubrac, servie au fil comme de la mozzarella.',
  'Stretchy and elastic mashed potato blended with melted fresh Aubrac tome cheese and garlic. An Aubrac specialty, served string-like like mozzarella.'),

('Daube Provençale',
  ARRAY['daube de boeuf', 'daube provençale', 'boeuf braisé provence', 'provençal beef stew', 'boeuf daube'],
  'french', FALSE,
  'Boeuf braisé provençal dans du vin rouge avec olives noires, lardons, carottes, herbes de Provence et zestes d''orange. Mijoté plusieurs heures.',
  'Provençal braised beef in red wine with black olives, lardons, carrots, Provençal herbs and orange zest. Simmered for several hours.'),

('Navarin',
  ARRAY['navarin d''agneau', 'navarin printanier', 'spring lamb stew', 'ragoût agneau légumes', 'navarin de mouton'],
  'french', FALSE,
  'Ragoût d''agneau printanier aux légumes nouveaux (navets, carottes, petits pois, pommes de terre), mijoté dans un bouillon parfumé.',
  'Spring lamb stew with new vegetables (turnips, carrots, peas, potatoes), simmered in a fragrant broth.'),

('Garbure',
  ARRAY['garbure gasconne', 'soupe gasconne', 'gascon vegetable stew', 'soupe au lard gasconne'],
  'french', FALSE,
  'Soupe-ragoût gasconne consistante de légumes (chou, haricots, navets) et viandes fumées (confit de canard, jarret de porc), à la consistance de ragoût.',
  'Hearty Gascon soup-stew of vegetables (cabbage, beans, turnips) and smoked meats (duck confit, pork hock), with a thick stew-like consistency.'),

('Piperade',
  ARRAY['piperade basque', 'pipérade', 'oeufs basques', 'basque pepper tomato eggs', 'ttoro basque'],
  'french', FALSE,
  'Fricassée basque de poivrons rouges et verts, tomates et oignons avec ail et piment d''Espelette, liée aux oeufs brouillés ou servie en accompagnement.',
  'Basque fricassee of red and green peppers, tomatoes and onions with garlic and Espelette chili, bound with scrambled eggs or served as a side.')

ON CONFLICT (canonical_name) DO NOTHING;
