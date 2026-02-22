const baseRecipes = [
  {
    name: 'Menemen',
    cuisine: 'turkish',
    time: 20,
    ingredients: ['yumurta', 'domates', 'biber', 'soğan', 'zeytinyağı'],
    steps: [
      'Soğanı ve biberi zeytinyağında yumuşayana kadar kavur.',
      'Domatesi ekleyip suyunu biraz çekene kadar pişir.',
      'Çırpılmış yumurtaları ilave edip karıştırarak pişir.',
      'Tuz ve baharat ile servis et.'
    ],
    description: 'Klasik kahvaltı yıldızı, tek tavada pratik tarif.'
  },
  {
    name: 'Fırında Sebzeli Tavuk',
    cuisine: 'healthy',
    time: 45,
    ingredients: ['tavuk', 'patates', 'havuç', 'soğan', 'zeytinyağı', 'baharat'],
    steps: [
      'Sebze ve tavuğu iri parçalar halinde doğra.',
      'Zeytinyağı ve baharatla harmanlayıp tepsiye yay.',
      '190°C fırında 35-40 dakika pişir.',
      'Yanına yoğurtla servis et.'
    ],
    description: 'Dengeli, doyurucu ve hazırlaması kolay bir akşam yemeği.'
  },
  {
    name: 'Kaşarlı Tost',
    cuisine: 'fast',
    time: 10,
    ingredients: ['ekmek', 'kaşar peyniri', 'tereyağı'],
    steps: [
      'Ekmeklerin iç kısmına kaşar dilimleri yerleştir.',
      'Dışına çok az tereyağı sür.',
      'Tost makinesinde peynir eriyene kadar pişir.',
      'Domates-salatalık ile tamamla.'
    ],
    description: 'Hızlı acıkmalar için kurtarıcı tarif.'
  },
  {
    name: 'Mercimek Çorbası',
    cuisine: 'turkish',
    time: 35,
    ingredients: ['kırmızı mercimek', 'soğan', 'havuç', 'tereyağı', 'su', 'tuz'],
    steps: [
      'Soğanı tereyağında hafif kavur, havucu ekle.',
      'Yıkanmış mercimeği ve suyu ekleyip kaynat.',
      'Mercimek yumuşayınca blenderdan geçir.',
      'Tuz ve isteğe göre kimyonla servis et.'
    ],
    description: 'Ev usulü sıcak başlangıç, düşük maliyetli ve besleyici.'
  },
  {
    name: 'Yoğurtlu Nohut Salatası',
    cuisine: 'healthy',
    time: 15,
    ingredients: ['haşlanmış nohut', 'yoğurt', 'salatalık', 'sarımsak', 'dereotu', 'tuz'],
    steps: [
      'Yoğurt, ezilmiş sarımsak ve tuzu karıştır.',
      'Nohut ve küp doğranmış salatalığı ekle.',
      'Üzerine ince kıyılmış dereotu serp.',
      'Soğuk servis et.'
    ],
    description: 'Protein odaklı, ferah ve pratik bir öğün alternatifi.'
  }
];

const templatePools = [
  {
    title: 'Sebzeli {main} Sote',
    cuisine: 'healthy',
    mains: ['tavuk', 'hindi', 'mantar', 'kabak', 'patlıcan', 'karnabahar'],
    extras: ['biber', 'soğan', 'sarımsak', 'zeytinyağı', 'karabiber'],
    time: [18, 20, 22, 25]
  },
  {
    title: '{main}li Makarna',
    cuisine: 'fast',
    mains: ['domates', 'ton balığı', 'mantar', 'brokoli', 'ıspanak', 'peynir'],
    extras: ['makarna', 'zeytinyağı', 'tuz', 'karabiber', 'sarımsak'],
    time: [15, 18, 20, 22]
  },
  {
    title: 'Fırında {main} Tepsisi',
    cuisine: 'turkish',
    mains: ['patates', 'kabak', 'patlıcan', 'tavuk', 'köfte', 'karnabahar'],
    extras: ['soğan', 'domates', 'zeytinyağı', 'pul biber', 'tuz'],
    time: [35, 40, 45, 50]
  },
  {
    title: '{main} Çorbası',
    cuisine: 'turkish',
    mains: ['mercimek', 'brokoli', 'mantar', 'domates', 'kabak', 'ezogelin'],
    extras: ['soğan', 'su', 'tereyağı', 'tuz', 'nane'],
    time: [25, 30, 35, 40]
  },
  {
    title: '{main} Salatası',
    cuisine: 'healthy',
    mains: ['nohut', 'kinoa', 'yeşil mercimek', 'ton balığı', 'tavuk', 'makarna'],
    extras: ['zeytinyağı', 'limon', 'salatalık', 'maydanoz', 'tuz'],
    time: [12, 15, 18, 20]
  },
  {
    title: '{main} Tava',
    cuisine: 'fast',
    mains: ['yumurta', 'sucuk', 'patates', 'mantar', 'biber', 'soğan'],
    extras: ['zeytinyağı', 'tuz', 'karabiber', 'pul biber', 'kaşar peyniri'],
    time: [10, 12, 15, 18]
  }
];

function generateRecipeDb(minCount = 520) {
  const generated = [];
  let index = 1;

  while (generated.length + baseRecipes.length < minCount) {
    templatePools.forEach((pool) => {
      pool.mains.forEach((main, mainIndex) => {
        if (generated.length + baseRecipes.length >= minCount) {
          return;
        }

        const duration = pool.time[(index + mainIndex) % pool.time.length];
        const recipe = {
          name: `${pool.title.replace('{main}', capitalize(main))} #${index}`,
          cuisine: pool.cuisine,
          time: duration,
          ingredients: [main, ...pool.extras],
          steps: [
            `${capitalize(main)} ve yardımcı malzemeleri hazırlayıp doğra.`,
            'Ana malzemeleri orta ateşte aromalarla birlikte pişir.',
            'Tuz, baharat ve kıvam ayarı yaparak lezzeti dengele.',
            'Sıcak ya da uygun şekilde dinlendirip servis et.'
          ],
          description: `Evdeki malzemelerle hızlı hazırlanabilen ${main} odaklı pratik tarif.`
        };

        generated.push(recipe);
        index += 1;
      });
    });
  }

  return [...baseRecipes, ...generated];
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const recipeDb = generateRecipeDb(520);

const ingredientsInput = document.getElementById('ingredients');
const cuisineInput = document.getElementById('cuisine');
const maxTimeInput = document.getElementById('maxTime');
const generateBtn = document.getElementById('generateBtn');
const results = document.getElementById('results');
const recipeTemplate = document.getElementById('recipeTemplate');

function normalizeList(value) {
  return value
    .toLowerCase()
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function scoreRecipe(recipe, userIngredients, maxTime) {
  const matched = recipe.ingredients.filter((item) => userIngredients.includes(item));
  const missing = recipe.ingredients.filter((item) => !userIngredients.includes(item));
  const ingredientScore = (matched.length / recipe.ingredients.length) * 80;
  const timeScore = recipe.time <= maxTime ? 20 : Math.max(0, 20 - (recipe.time - maxTime));

  return {
    score: Math.round(ingredientScore + timeScore),
    missing
  };
}

function renderRecipes(recipes, userIngredients, maxTime) {
  results.innerHTML = '';

  if (userIngredients.length === 0) {
    results.innerHTML =
      '<article class="card"><p>Lütfen en az bir malzeme yaz. Örn: yumurta, domates</p></article>';
    return;
  }

  const ranked = recipes
    .map((recipe) => {
      const { score, missing } = scoreRecipe(recipe, userIngredients, maxTime);
      return { ...recipe, score, missing };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  ranked.forEach((recipe) => {
    const node = recipeTemplate.content.cloneNode(true);
    node.querySelector('.recipe-title').textContent = recipe.name;
    node.querySelector('.score').textContent = `%${recipe.score} uyum`;
    node.querySelector('.meta').textContent = `⏱ ${recipe.time} dk • ${mapCuisine(recipe.cuisine)}`;
    node.querySelector('.description').textContent = recipe.description;

    const stepsEl = node.querySelector('.steps');
    recipe.steps.forEach((step) => {
      const li = document.createElement('li');
      li.textContent = step;
      stepsEl.appendChild(li);
    });

    node.querySelector('.missing').innerHTML = recipe.missing.length
      ? `<strong>Eksik:</strong> ${recipe.missing.join(', ')}`
      : 'Tüm temel malzemeler sende var 🎉';

    results.appendChild(node);
  });
}

function mapCuisine(cuisine) {
  const map = {
    turkish: 'Türk Mutfağı',
    healthy: 'Sağlıklı',
    fast: 'Pratik/Hızlı'
  };

  return map[cuisine] ?? 'Karışık';
}

generateBtn.addEventListener('click', () => {
  const userIngredients = normalizeList(ingredientsInput.value);
  const selectedCuisine = cuisineInput.value;
  const maxTime = Number(maxTimeInput.value) || 40;

  const filtered = recipeDb.filter((recipe) => {
    if (selectedCuisine === 'all') return true;
    return recipe.cuisine === selectedCuisine;
  });

  renderRecipes(filtered, userIngredients, maxTime);
});

renderRecipes(recipeDb, ['yumurta', 'domates', 'ekmek'], 40);
