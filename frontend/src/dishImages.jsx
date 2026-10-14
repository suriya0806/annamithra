// Food image mapping helper for ANNAMITHRA Menu, POS, and Recipes
const DISH_IMAGE_MAP = {
  "chicken biryani": "/assets/dish_chicken_biryani.jpg",
  "biryani": "/assets/dish_chicken_biryani.jpg",
  "mutton biryani": "/assets/dish_mutton_biryani.jpg",
  "chicken 65": "/assets/dish_chicken_65.jpg",
  "65": "/assets/dish_chicken_65.jpg",
  "paneer tikka": "/assets/dish_paneer_tikka.jpg",
  "paneer": "/assets/dish_paneer_tikka.jpg",
  "fried rice": "/assets/dish_fried_rice.jpg",
  "rice": "/assets/dish_fried_rice.jpg",
  "noodles": "/assets/dish_fried_rice.jpg",
  "gobi": "/assets/dish_chicken_65.jpg",
  "parotta": "/assets/dish_paneer_tikka.jpg",
  "meals": "/assets/dish_chicken_biryani.jpg"
};

export const WEB_FOOD_PRESETS = [
  {
    category: "Biryani & Rice",
    items: [
      { name: "Chicken Biryani", url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80" },
      { name: "Mutton Biryani", url: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=80" },
      { name: "Veg Pulao", url: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=500&auto=format&fit=crop&q=80" },
      { name: "Fried Rice", url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=80" },
      { name: "Steamed Rice", url: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=500&auto=format&fit=crop&q=80" }
    ]
  },
  {
    category: "Curries & Gravies",
    items: [
      { name: "Chicken Curry", url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80" },
      { name: "Paneer Butter Masala", url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80" },
      { name: "Dal Tadka", url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80" },
      { name: "Mutton Rogan Josh", url: "https://images.unsplash.com/photo-1545247181-516773cae754?w=500&auto=format&fit=crop&q=80" },
      { name: "Fish Curry", url: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80" }
    ]
  },
  {
    category: "Starters & Snacks",
    items: [
      { name: "Chicken 65", url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&auto=format&fit=crop&q=80" },
      { name: "Chicken Tikka", url: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80" },
      { name: "Paneer Tikka", url: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80" },
      { name: "Samosa", url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80" },
      { name: "French Fries", url: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80" }
    ]
  },
  {
    category: "Breads & Breakfast",
    items: [
      { name: "Butter Naan", url: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80" },
      { name: "Malabar Parotta", url: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=80" },
      { name: "Masala Dosa", url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80" },
      { name: "Idli Sambar", url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80" }
    ]
  },
  {
    category: "Fast Food & Chinese",
    items: [
      { name: "Burger", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80" },
      { name: "Pizza", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80" },
      { name: "Hakka Noodles", url: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80" },
      { name: "Momos", url: "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=500&auto=format&fit=crop&q=80" }
    ]
  },
  {
    category: "Desserts & Beverages",
    items: [
      { name: "Gulab Jamun", url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80" },
      { name: "Ice Cream", url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80" },
      { name: "Fresh Juice", url: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=80" },
      { name: "Filter Coffee", url: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=80" },
      { name: "Masala Chai", url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80" }
    ]
  }
];

export function getDishImage(dishName, category, customImageUrl = null) {
  if (customImageUrl && typeof customImageUrl === "string" && customImageUrl.trim()) {
    return customImageUrl.trim();
  }
  if (!dishName) return "/assets/dish_chicken_biryani.jpg";
  const name = String(dishName).toLowerCase();
  for (const [key, path] of Object.entries(DISH_IMAGE_MAP)) {
    if (name.includes(key)) return path;
  }
  const cat = String(category || "").toLowerCase();
  if (cat.includes("biryani") || cat.includes("rice")) return "/assets/dish_chicken_biryani.jpg";
  if (cat.includes("starter") || cat.includes("appetizer") || cat.includes("snack") || cat.includes("chicken")) {
    return "/assets/dish_chicken_65.jpg";
  }
  if (cat.includes("mutton") || cat.includes("gravy") || cat.includes("curry")) {
    return "/assets/dish_mutton_biryani.jpg";
  }
  if (cat.includes("veg") || cat.includes("tandoor") || cat.includes("paneer")) {
    return "/assets/dish_paneer_tikka.jpg";
  }
  return "/assets/dish_fried_rice.jpg";
}

// Brand Chef Hat / Cloche SVG component
export function AnnamithraLogoIcon({ size = 24, color = "#D6A84F" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
      <line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  );
}

export const SamayaLogoIcon = AnnamithraLogoIcon;
