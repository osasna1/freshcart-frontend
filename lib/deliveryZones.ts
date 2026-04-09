// Toronto, Oshawa and Barrie postal code prefixes (first 3 characters)
export const TORONTO_CODES = [
  "M1B", "M1C", "M1E", "M1G", "M1H", "M1J", "M1K", "M1L",
  "M1M", "M1N", "M1P", "M1R", "M1S", "M1T", "M1V", "M1W",
  "M1X", "M2H", "M2J", "M2K", "M2L", "M2M", "M2N", "M2P",
  "M2R", "M3A", "M3B", "M3C", "M3H", "M3J", "M3K", "M3L",
  "M3M", "M3N", "M4A", "M4B", "M4C", "M4E", "M4G", "M4H",
  "M4J", "M4K", "M4L", "M4M", "M4N", "M4P", "M4R", "M4S",
  "M4T", "M4V", "M4W", "M4X", "M4Y", "M5A", "M5B", "M5C",
  "M5E", "M5G", "M5H", "M5J", "M5K", "M5L", "M5M", "M5N",
  "M5P", "M5R", "M5S", "M5T", "M5V", "M5W", "M5X", "M6A",
  "M6B", "M6C", "M6E", "M6G", "M6H", "M6J", "M6K", "M6L",
  "M6M", "M6N", "M6P", "M6R", "M6S", "M7A", "M8V", "M8W",
  "M8X", "M8Y", "M8Z", "M9A", "M9B", "M9C", "M9L", "M9M",
  "M9N", "M9P", "M9R", "M9V", "M9W",
];

export const OSHAWA_CODES = [
  "L1G", "L1H", "L1J", "L1K", "L1L",
];

export const BARRIE_CODES = [
  "L4M", "L4N", "L9J",
];

export const ALL_DELIVERY_CODES = [
  ...TORONTO_CODES,
  ...OSHAWA_CODES,
  ...BARRIE_CODES,
];

export type DeliveryCity = "Toronto" | "Oshawa" | "Barrie" | null;

export function checkDeliveryZone(postalCode: string): {
  allowed: boolean;
  city: DeliveryCity;
  message: string;
} {
  const cleaned = postalCode.replace(/\s/g, "").toUpperCase();

  if (cleaned.length < 3) {
    return {
      allowed: false,
      city: null,
      message: "Please enter a valid postal code.",
    };
  }

  const prefix = cleaned.substring(0, 3);

  if (TORONTO_CODES.includes(prefix)) {
    return {
      allowed: true,
      city: "Toronto",
      message: "✅ Great! We deliver to your area in Toronto.",
    };
  }

  if (OSHAWA_CODES.includes(prefix)) {
    return {
      allowed: true,
      city: "Oshawa",
      message: "✅ Great! We deliver to your area in Oshawa.",
    };
  }

  if (BARRIE_CODES.includes(prefix)) {
    return {
      allowed: true,
      city: "Barrie",
      message: "✅ Great! We deliver to your area in Barrie.",
    };
  }

  return {
    allowed: false,
    city: null,
    message: "❌ Sorry, we currently only deliver in Toronto, Oshawa and Barrie.",
  };
}