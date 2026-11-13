import type { LonLat, TripPlace } from "@/lib/trip/tripTypes";

/** Airports, towns and published landmarks. Hotels sit at town level, never at an address. */

const TURKEY = "Europe/Istanbul";

function place(name: string, position: LonLat, approximate = false, timeZone = TURKEY): TripPlace {
  return { name, position, timeZone, approximate };
}

export const PLACES = {
  amsterdamAirport: place("Amsterdam Schiphol", [4.7639, 52.3086], false, "Europe/Amsterdam"),
  sabihaGokcen: place("Istanbul Sabiha Gökçen", [29.3092, 40.8986]),
  sanliurfaAirport: place("Şanlıurfa GAP Airport", [38.8956, 37.4457]),
  urfaOldTown: place("Şanlıurfa old town", [38.789, 37.15], true),
  urfaCentre: place("Şanlıurfa", [38.795, 37.158], true),
  urfaMuseum: place("Şanlıurfa Archaeology Museum", [38.7835, 37.161], true),
  gobekliTepe: place("Göbeklitepe", [38.922364, 37.223242]),
  gobekliVisitorCentre: place("Göbeklitepe visitor centre", [38.9141, 37.2174]),
  abrahamsCave: place("Mevlid-i Halil, Balıklıgöl", [38.786, 37.145], true),
  karadut: place("Karadut", [38.783, 37.93], true),
  nemrutVisitorCentre: place("Mount Nemrut visitor centre", [38.7281, 37.9704]),
  nemrutSummit: place("Mount Nemrut summit", [38.7408, 37.9806]),
  karahanTepe: place("Karahan Tepe", [39.30361, 37.0925]),
  akcakale: place("Akçakale, on the Syrian border", [38.9481, 36.7111], true),
  sultanahmet: place("Sultanahmet, Istanbul", [28.9765, 41.0065], true),
  hagiaSophia: place("Hagia Sophia", [28.9801, 41.0086]),
  blueMosque: place("Blue Mosque", [28.9768, 41.0054]),
  topkapiPalace: place("Topkapı Palace", [28.9834, 41.0115]),
} as const;
