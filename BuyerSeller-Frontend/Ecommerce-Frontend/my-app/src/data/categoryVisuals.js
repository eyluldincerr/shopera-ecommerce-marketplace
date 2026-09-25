import accessories from "../assets/categories/accessories.webp";
import audio from "../assets/categories/audio.webp";
import automotive from "../assets/categories/automotive.webp";
import baby from "../assets/categories/baby.webp";
import beauty from "../assets/categories/beauty.webp";
import books from "../assets/categories/books.webp";
import businessLaptops from "../assets/categories/business-laptops.webp";
import computers from "../assets/categories/computers.webp";
import electronics from "../assets/categories/electronics.webp";
import fashion from "../assets/categories/fashion.webp";
import fitness from "../assets/categories/fitness.webp";
import furniture from "../assets/categories/furniture.webp";
import gaming from "../assets/categories/gaming.webp";
import groceries from "../assets/categories/groceries.webp";
import health from "../assets/categories/health.webp";
import homeLiving from "../assets/categories/home-living.webp";
import jewelry from "../assets/categories/jewelry.webp";
import kitchen from "../assets/categories/kitchen.webp";
import laptops from "../assets/categories/laptops.webp";
import mensFashion from "../assets/categories/mens-fashion.webp";
import office from "../assets/categories/office.webp";
import other from "../assets/categories/other.webp";
import outdoor from "../assets/categories/outdoor.webp";
import pets from "../assets/categories/pets.webp";
import phones from "../assets/categories/phones.webp";
import photography from "../assets/categories/photography.webp";
import shoes from "../assets/categories/shoes.webp";
import sports from "../assets/categories/sports.webp";
import toysGames from "../assets/categories/toys-games.webp";
import travel from "../assets/categories/travel.webp";
import watches from "../assets/categories/watches.webp";
import womensFashion from "../assets/categories/womens-fashion.webp";

export const CATEGORY_VISUAL_LIBRARY = Object.freeze({
  accessories,
  audio,
  automotive,
  baby,
  beauty,
  books,
  "business-laptops": businessLaptops,
  computers,
  electronics,
  fashion,
  fitness,
  furniture,
  gaming,
  groceries,
  health,
  "home-living": homeLiving,
  jewelry,
  kitchen,
  laptops,
  "mens-fashion": mensFashion,
  office,
  other,
  outdoor,
  pets,
  phones,
  photography,
  shoes,
  sports,
  "toys-games": toysGames,
  travel,
  watches,
  "womens-fashion": womensFashion,
});

const visualRules = [
  [
    "business-laptops",
    [
      "business laptop",
      "business laptops",
      "business computer",
      "business computers",
      "work laptop",
      "work laptops",
      "is laptop",
      "kurumsal laptop",
      "kurumsal bilgisayar",
    ],
  ],
  ["womens-fashion", ["women", "woman", "womens", "ladies", "kadın", "kadin"]],
  ["mens-fashion", ["mens", "men", "man", "erkek"]],
  ["phones", ["phone", "mobile", "smartphone", "telefon", "cep telefonu"]],
  ["laptops", ["laptop", "laptops", "notebook", "ultrabook", "dizüstü", "dizustu"]],
  ["computers", ["computer", "computers", "desktop", "pc", "bilgisayar", "masaüstü", "masaustu"]],
  ["gaming", ["gaming", "game", "console", "oyun"]],
  ["audio", ["audio", "headphone", "speaker", "earbud", "kulaklık", "kulaklik", "hoparlör", "hoparlor"]],
  ["photography", ["photo", "camera", "photography", "fotoğraf", "fotograf", "kamera"]],
  ["electronics", ["electronic", "gadget", "technology", "tech", "elektronik", "teknoloji"]],
  ["shoes", ["shoe", "sneaker", "footwear", "ayakkabı", "ayakkabi"]],
  ["fashion", ["fashion", "clothing", "clothes", "apparel", "moda", "giyim"]],
  ["beauty", ["beauty", "cosmetic", "makeup", "perfume", "güzellik", "guzellik", "kozmetik", "parfüm", "parfum"]],
  ["health", ["health", "wellness", "personal care", "sağlık", "saglik", "bakım", "bakim"]],
  ["kitchen", ["kitchen", "cookware", "appliance", "mutfak"]],
  ["furniture", ["furniture", "sofa", "chair", "mobilya"]],
  ["office", ["office", "stationery", "workspace", "ofis", "kırtasiye", "kirtasiye"]],
  ["home-living", ["home", "living", "decor", "household", "ev", "dekorasyon", "yaşam", "yasam"]],
  ["fitness", ["fitness", "gym", "workout", "exercise", "spor salonu", "egzersiz"]],
  ["outdoor", ["outdoor", "camping", "hiking", "garden", "kamp", "bahçe", "bahce"]],
  ["sports", ["sport", "football", "basketball", "soccer", "spor", "futbol", "basketbol"]],
  ["automotive", ["automotive", "car", "vehicle", "motor", "auto", "otomotiv", "araba", "araç", "arac"]],
  ["toys-games", ["toy", "toys", "board game", "oyuncak"]],
  ["baby", ["baby", "infant", "toddler", "bebek"]],
  ["pets", ["pet", "pets", "dog", "cat", "evcil", "kedi", "köpek", "kopek"]],
  ["books", ["book", "books", "reading", "kitap"]],
  ["jewelry", ["jewelry", "jewellery", "necklace", "ring", "takı", "taki", "mücevher", "mucevher"]],
  ["watches", ["watch", "watches", "saat"]],
  ["groceries", ["grocery", "groceries", "food", "market", "gıda", "gida", "yiyecek"]],
  ["accessories", ["accessory", "accessories", "bag", "wallet", "aksesuar", "çanta", "canta"]],
  ["travel", ["travel", "luggage", "suitcase", "seyahat", "valiz"]],
];

const normalizeCategoryName = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9ğüşöçı\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const resolveCategoryVisualKey = (categoryName) => {
  const normalized = normalizeCategoryName(categoryName);

  if (!normalized) {
    return "other";
  }

  for (const [visualKey, aliases] of visualRules) {
    if (aliases.some((alias) => normalized.includes(normalizeCategoryName(alias)))) {
      return visualKey;
    }
  }

  return "other";
};

const CATEGORY_VISUAL_FAMILY = Object.freeze({
  "business-laptops": "computing",
  computers: "computing",
  laptops: "computing",
  electronics: "electronics",
  phones: "mobile",
  audio: "audio",
  gaming: "gaming",
  photography: "photography",
  "home-living": "home",
  furniture: "home",
  kitchen: "kitchen",
  office: "office",
  fashion: "fashion",
  "mens-fashion": "fashion",
  "womens-fashion": "fashion",
  shoes: "shoes",
  accessories: "accessories",
  beauty: "beauty-care",
  health: "beauty-care",
  sports: "active",
  fitness: "active",
  outdoor: "outdoor",
  automotive: "automotive",
  "toys-games": "kids",
  baby: "kids",
  pets: "pets",
  books: "books",
  jewelry: "jewelry",
  watches: "watches",
  groceries: "groceries",
  travel: "travel",
  other: "other",
});

export const getCategoryVisualByKey = (visualKey) =>
  CATEGORY_VISUAL_LIBRARY[visualKey] || other;

export const getCategoryVisualFamily = (categoryName) => {
  const visualKey = resolveCategoryVisualKey(categoryName);
  return CATEGORY_VISUAL_FAMILY[visualKey] || visualKey || "other";
};

export const getCategoryVisual = (categoryName) =>
  getCategoryVisualByKey(resolveCategoryVisualKey(categoryName));
