/**
 * Las narrativas de los destinos (`NARRATIVA_DESTINO` en `destinoData.ts`) en
 * inglés.
 *
 * 🔴 Por qué existe (10 nov 2026): la ficha en inglés escondía la narrativa
 * (`locale === "en" ? undefined : …`) y se quedaba en ~600 palabras contra ~720
 * de la española. Ahora la ficha EN enseña esta traducción.
 *
 * Reglas:
 *  · Las MISMAS llaves que `NARRATIVA_DESTINO`. Si un destino nuevo no tiene su
 *    traducción aquí, la ficha en inglés sale SIN narrativa: nunca cae al
 *    español (ver `narrativaDestino` y `narrativasSinPareja` en `destinoData.ts`,
 *    que lista las llaves que no cuadran para poder vigilarlo en una prueba).
 *  · Traducción fiel: cada dato y cada número tal cual el español (metros,
 *    grados, horas, años). Si un dato está mal, se corrige en LOS DOS archivos.
 *  · Los nombres de lugar se quedan en español; la primera vez, con su
 *    explicación entre paréntesis cuando ayuda a un lector de EE. UU.
 */
export const NARRATIVA_DESTINO_EN: Record<string, string> = {
  "las-pozas-jardin-surrealista":
    "Some places feel like the product of an especially vivid dream. Edward James's Las Pozas is one of them: concrete columns that rise toward nowhere, staircases that defy gravity, four-meter stone flowers among real waterfalls and giant ferns. The eccentric poet who built them never meant for them to make sense. That's exactly where their power lies.",

  "cascada-de-tamul":
    "Tamul Waterfall (Cascada de Tamul) gives no warning before it appears. You paddle through the Cañón del Tampaón for 30 minutes, with rock walls on either side and the silence amplified by the water, and suddenly the river bends and there it is: a 105-meter free fall, so wide it won't fit in any photo you've ever taken. It's the kind of place that makes you understand why people cry with emotion when they travel.",

  "sotano-de-las-golondrinas":
    "5:45 AM at the edge of the Sótano de las Golondrinas (Cave of Swallows) is one of the strangest experiences a human being can have. Below: total darkness more than 370 meters down. Then the sound begins, before you see anything. Then they come out: thousands of swifts spiraling upward, like a tornado of wings that lasts twenty minutes. And at dusk comes the second show: they fly back into the abyss. This isn't nature. It's a ritual.",

  "cascadas-de-micos":
    "The Cascadas de Micos (Micos Waterfalls) are the perfect answer to the question 'what should we do today?' in the Huasteca. Seven waterfalls on a circuit, a zipline, kayaks, a sky bike and jumps into crystal-clear pools — all in one place. It's the most beautiful adventure park you'll ever set foot in, except this one was designed by nature millions of years ago.",

  "puente-de-dios-tamasopo":
    "In Tamasopo there's a natural rock arch with a river flowing through it, and between 11 AM and 1 PM the sun shines straight in and turns the water into cobalt-blue liquid glass. That light effect lasts two hours. Our guides know exactly when to get you there so you can see it. Puente de Dios isn't a place you just pass through — it's an appointment you have to arrive on time for.",

  "siete-cascadas-tamasopo":
    "Seven turquoise waterfalls, one after another, like a staircase the rock carved over centuries. You make your way down by jumping from pool to pool — with a life jacket, helmet and guide — and every jump is different: there's one for people who have never jumped and another for those ready to challenge themselves. And if you don't want to jump at all, that's fine: the water is just as clear for anyone who only wants to swim and look up.",

  "hacienda-los-gomez-tamasopo":
    "After a day of jumps and adrenaline, Hacienda Los Gómez is where your body asks to stay. Small waterfalls spilling into turquoise pools, huge sabinos (Montezuma cypresses) growing right in the water, and shade that drops the temperature several degrees. No lines, no rush, nothing to conquer. Just a beautiful river and time to do nothing — which, on a trip to the Huasteca, is rarer than it sounds.",

  "zona-arqueologica-tamtoc":
    "At Tamtoc, time is measured differently. The Huastec culture lived, built and ruled here for more than 2,000 years, long before any city you know today existed. Monument 32 — a 30-ton female figure — still gazes at the horizon from the same spot where it was placed centuries ago. Visiting at dawn, when mist covers the Tampaón River in the distance, is to understand what antiquity really means.",

  "cascadas-de-tamasopo":
    "The Cascadas de Tamasopo (Tamasopo Waterfalls) have the bluest water in the region. Not Tamul's bright turquoise, but a deep, almost unreal blue that comes from the limestone and its minerals. The natural park around them lets you swim right in the pools, beneath the falling water. It's the place where people take more photos than anywhere else in the Huasteca — and for very good reason.",

  "balneario-taninul":
    "The Taninul hot springs rise naturally from the ground at 38°C, surrounded by palms and jacarandas. They're the perfect antidote to a day of waterfalls and hikes: sinking into hot mineral water as the sun goes down and the sierra turns orange. Locals call it 'the spa of the Huasteca,' and they've been right for decades.",

  "cascadas-minas-viejas":
    "The water at Minas Viejas is a color that doesn't exist in any palette you've ever seen: somewhere between jade and turquoise, with white flashes where it breaks over the travertine terraces. The falls drop over 5 different levels, each with its own pool. It's one of those places you capture in photos but don't quite believe until you're in the water.",

  "laguna-media-luna":
    "The Laguna de la Media Luna has one unique feature: the water springs straight up from the bottom of the lagoon, cool and a crystal-clear blue that stays the same all year. Divers know it as one of the best freshwater diving spots in all of Latin America. Even without scuba gear, you simply swim over blue glass that never changes color.",

  "cascada-el-aguacate":
    "The Cascada El Aguacate is the best-kept secret on the waterfall route. Less visited than its neighbors, it waits at the end of a trail through giant ferns that smells of damp earth and cool jungle. The pool it forms is perfect for swimming: deep, blue and just the right temperature. For those who'd rather discover than post on Instagram, this is the waterfall.",

  "cascada-el-salto":
    "The Cascada El Salto doesn't have Tamul's fame, but it has something few waterfalls can offer: you can swim right at its base, with the water crashing down just meters from you. The sound it makes hitting the rock is physical — you feel it in your chest. Paired with El Meco, it forms the most photogenic duo of turquoise waterfalls in the region.",

  "cascada-el-meco":
    "El Meco has a reputation as the waterfall with the most turquoise water in the Huasteca. It isn't marketing: the calcium mineral dissolved from the rock creates a color photographers seek out on purpose. Timing is key: get there between 9 and 11 AM, when sunlight shines straight into the canyon. Our guides know exactly when to be in position.",

  "sotano-de-las-huahuas":
    "The Sótano de las Huahuas is the little brother of the Sótano de las Golondrinas — and it has something its famous neighbor doesn't: easier access and a more intimate experience. The birds spiral out at dawn, while the sunlight barely touches the rim of the abyss, and return at dusk. The noise they make together, amplified by the rock walls, is one of the strangest and most beautiful sounds in nature.",

  "cuevas-de-mantetzulel":
    "The Cuevas de Mantetzulel (Mantetzulel Caves) hold an underground ecosystem very few travelers know: million-year-old stalactites, bats navigating in the dark and the echo of your own voice amplified by 30-meter-high caverns. The temperature inside is constant: 18°C, even when it's 38°C outside.",

  "nacimiento-huichihuayan":
    "The water at the Nacimiento de Huichihuayán (Huichihuayán Spring) comes straight out of the ground at exactly 22°C, all year round. It isn't a river or a lake: it's a spring that wells up surrounded by palms, ferns and the particular silence of places that still don't appear in mass-tourism guidebooks. That perfect temperature — neither cold nor warm — makes you want to keep swimming forever.",

  "nacimiento-tambaque":
    "Tambaque is the most hidden spring in the area, and that's exactly what makes it special. To get there you walk a trail through wild tamarind trees. When you arrive: a crystal-clear pool with weeping willows hanging over the water. It's the kind of place where people propose and photographers fill their entire memory card.",

  "voladores-tamaleton":
    "The ritual of the Voladores de Tamaletón is 2,000 years old, and no video game or action movie has matched it yet: four men tied by the ankles 30 meters up, spiraling down toward the earth while one plays a flute at the top of the pole. It's a living pre-Hispanic ritual, practiced by the same Indigenous community for generations. Seeing it in person is understanding that some art forms don't fit in any museum.",

  "rio-tampaon-rafting":
    "The Tampaón River is the main artery of the whole Huasteca. Its jade-colored water runs through a canyon geologists estimate to be 200 million years old. Rafting its Class III rapids means traveling the same route the Huastec people used to move between communities centuries ago. The difference is that now there are also kayaks, canoes and the certainty that a 105-meter waterfall is waiting for you at the end of the trip.",

  "xilitla-pueblo-magico":
    "Xilitla isn't just the municipality that's home to Edward James's Las Pozas. It's a town where the Sierra Huasteca tumbles down into the jungle in a cascade of greenery, where high-altitude coffee is roasted over wood fires and where Indigenous artisans work with 800-year-old techniques. Downtown has a calm that cities lost decades ago. Staying a night here changes how you see the whole trip.",

  "aquismon-pueblo-magico":
    "Hardly anyone comes to Aquismón to stay in Aquismón, and that's part of its charm: it's the Tének gateway to the Cascada de Tamul, the sótanos (giant sinkholes) and the Tampaón River. But before heading out on an adventure, it's worth a look at its Parroquia de San Miguel Arcángel, built on an ancient Huastec platform. Named a Pueblo Mágico (Magic Town) in 2018, its Tének name means 'tree at the foot of a well': a fitting summary of a place where the sierra and the water meet.",

  "rio-axtla-el-chalan":
    "The Río Axtla has a character all its own: 'el chalán,' an old iron raft that has been crossing the river, pulled by hand, for more than half a century — no motor, no hurry. All around are crystal-clear waters and swimming holes where town life and river life blend together. This is the everyday Huasteca, the one that happens far from lines and turnstiles.",

  "castillo-de-la-salud":
    "If Xilitla has its surrealist garden, Axtla has its own, in the key of traditional medicine. The Castillo de la Salud was built in 1974 by Nahua herbalist Don Beto Ramón, who mixed pre-Hispanic symbols with biblical scenes — the Tower of Babel, Noah's Ark — around a garden with hundreds of medicinal plants. Don Beto died in 2004, but he left more than 150 herbal formulas that are still used here.",

  "cascada-los-comales":
    "Just a few steps from the Las Pozas entrance, Los Comales is the perfect dip to end your surrealist day. Its lukewarm waters fall through the jungle into pools where you can swim without crowds, and a medicinal temazcal (traditional sweat lodge) welcomes small groups for anyone who wants more than a swim. It's so close to Edward James's garden that it would be a mistake not to combine them.",

  "cascada-el-trampolin-tamasopo":
    "El Trampolín is Tamasopo's open secret: a free, public stretch of the Agua Buena river — not the paid park — where the turquoise water forms pools, little waterfalls and, yes, ropes hanging from the trees for diving in. It runs for about two kilometers of river, so there's always a pool for you. Getting in costs nothing; the memories are worth a lot.",

  "zona-arqueologica-tamohi-el-consuelo":
    "Tamohí — 'place of effervescence' in Tének — is Tamuín's other great Huastec site, distinct from Tamtoc and sometimes confused with it. Across its roughly 210 hectares on the banks of the Tampaón stand the platforms and foundations of a pre-Hispanic city, and it was here, in 1917, that 'El Adolescente Huasteco' (the Huastec Adolescent) was discovered — today one of the treasures of Mexico City's National Museum of Anthropology. Walking it means stepping onto one of the cradles of Huastec culture.",

  "templo-san-juan-bautista-coxcatlan":
    "Facing the main square of Coxcatlán stands one of the oldest churches in the Huasteca Potosina: San Juan Bautista, a 16th-century church and former convent. The way it was built makes it even more memorable: its walls are said to have been raised with stone bound by a mortar that included ground seashells. It's colonial history in its purest form, far from the tourist circuit.",

  "cascada-rancho-el-zapote-poza-azul-coxcatlan":
    "Locals simply call it 'la poza azul' (the blue pool), and the name fits: a waterfall and pool of vibrant turquoise just about eleven minutes from the town of Coxcatlán. It's one of the least crowded corners of the Huasteca, exactly the kind of place you look for when you want the turquoise water all to yourself. A secret the state is only just starting to show off.",

  "ruinas-de-el-jopoy-coxcatlan":
    "El Jopoy is both ruin and memory: the remains of one of the first Spanish chapels in the Huasteca, with stone walls and wide arches that time left open to the sky. Today the community uses it as a cemetery, so the silence among its arches feels more intimate. INAH (Mexico's National Institute of Anthropology and History) carried out preliminary explorations here around 2009, but the place still belongs, above all, to its people.",

  "tancanhuitz":
    "Tancanhuitz wins your heart on foot: its San Miguel Arcángel parish church, perched at the top of a long stairway, is famous as the 'Iglesia de los 149 Escalones' (Church of the 149 Steps). But what truly beats here is the Tének-Nahua tradition — huapango, the dances and an intense Xantolo that makes it a must-stop on the Huasteca's Day of the Dead Route. Climbing those steps is just the beginning.",

  "san-martin-chalchicuautla":
    "San Martín Chalchicuautla is called the 'Cuna del Xantolo' (Cradle of Xantolo), and that's no exaggeration: between October 31 and November 2 its streets fill with troupes of masked 'viejos' (old men) dancing huapango with a devotion that gives you goosebumps. If you go in season, zacahuil, bocoles and queso de bola round out the celebration; and the Cascada del Manantial is nearby for the next day. This is the Huasteca at its most ritual and alive.",

  "san-vicente-tancuayalab":
    "San Vicente Tancuayalab carries a big title: 'cradle of the Day of the Dead' in San Luis Potosí. Founded by Franciscans in the 16th century near the Moctezuma River — and relocated in 1767 — its Huastec name means 'place of the staff of command,' and its Xantolo keeps that ancestral authority. It's a destination for understanding where the tradition the rest of Mexico celebrates comes from.",

  "tanlajas":
    "Tanlajás — 'place of flat stones' in Tének — is home to one of the most striking rituals in the Huasteca: the 'Toreada de los Diablos' (the Devils' Bullfight), where masked men with horns, hides and a chirrión (leather whip) reenact the eternal struggle between good and evil. The hand-carved wooden masks are worth the trip on their own. And between dances, Tének cooking — zacahuiles, bocoles, cecina — does the rest.",

  "texquitote":
    "If you've ever danced to a huapango, part of its sound was born here. Texquitote is the cradle of son huasteco instrument-making: about forty luthiers build jaranas, quintas huapangueras, violins and harps by hand, and it was here that the 'quinta huapanguera,' the genre's five-string guitar, was born. Stepping into a workshop, respectfully and with advance notice, is watching music being born by hand.",

  "laguna-de-los-suspiros":
    "The soul of the Laguna de los Suspiros isn't the water but a tree: a fig tree about two hundred years old whose giant roots open into two natural 'doorways,' the most photographed spot in the place. It's a simple, peaceful outing in the Plan de Iguala ejido (communal land), the kind that rewards curious travelers who step off the usual map. Unhurried nature, in the quietest corner of the Huasteca.",

  "la-trinidad-xilitla":
    "Going up to La Trinidad means changing worlds in an hour: from Xilitla's heat to the cold and mist of one of the best-preserved forests in the Huasteca, at almost two thousand meters. It's a Nahua community of barely a hundred people where you can sleep in a cabin, camp, light a bonfire, grill your food and walk among huge madrone trees to lookouts, pools and sinkholes. The best part isn't any one attraction, but the feeling of being very far from everything.",

  "olla-de-la-luz":
    "Crowning the highest point in the municipality of Xilitla, the Olla de la Luz is an imposing abyss: a sinkhole 233 meters across with a 193-meter vertical drop, hidden high in the cloud forest. Getting there is part of the reward — a guided hike from La Trinidad among pines and madrones — and peering over its rim is one of those views that recalibrate your sense of scale. It's not a place to go alone: here, your guide is your life insurance.",

  "cueva-del-salitre":
    "A few minutes from Xilitla's surrealist downtown, the Cueva del Salitre is the Magic Town's adrenaline side: a mouth one hundred meters wide and three hundred meters deep, with walls climbers have turned into five routes and an interior made for caving and rappelling. Its name comes from the salitre (saltpeter) that seeps down the damp rock. It's proof that in Xilitla, adventure starts almost on the main square.",

  "museo-leonora-carrington-xilitla":
    "You can't understand Xilitla through Edward James alone: his friend, the surrealist painter Leonora Carrington, has her own museum here, right downtown. Through sculpture, lithography and drawing, her dreamlike creatures are in perfect dialogue with the Las Pozas garden a few minutes away; in fact, seeing both on the same day is the perfect surrealist route. A haven of art to balance out so much nature.",
};
