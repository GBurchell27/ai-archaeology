import { aprilTime as at, stay, travel } from "@/lib/trip/tripBuilders";
import { PLACES as P } from "@/lib/trip/turkeyTripPlaces";
import type { Trip } from "@/lib/trip/tripTypes";

const AMSTERDAM_SUMMER = 2;

/**
 * Flight times come from the tickets. Everything marked `estimatedTimes` is a reasonable
 * reconstruction of the day. Roads are the router's fastest route, not a GPS trace.
 */
export const TURKEY_TRIP_2026: Trip = {
  id: "turkey-2026-04",
  title: "Turkey, 14–21 April 2026",
  roadsUrl: "/trips/turkey-2026-04.roads.json",
  segments: [
    travel("flight", "Pegasus PC1252, Amsterdam to Istanbul", P.amsterdamAirport, P.sabihaGokcen,
      at(14, "12:40", AMSTERDAM_SUMMER), at(14, "17:05"),
      { estimatedTimes: true, note: "Landing time estimated. The ticket does not say whether the connection was at Sabiha Gökçen or Istanbul Airport." }),
    stay("Connection in Istanbul", P.sabihaGokcen, at(14, "17:05"), at(14, "19:50"), { estimatedTimes: true }),
    travel("flight", "Pegasus PC2422, Istanbul to Şanlıurfa", P.sabihaGokcen, P.sanliurfaAirport,
      at(14, "19:50"), at(14, "21:35"), { estimatedTimes: true, note: "Departure estimated. Landed around 21:35." }),
    stay("Picking up the hire car, a Peugeot 2008", P.sanliurfaAirport, at(14, "21:35"), at(14, "22:15"), { estimatedTimes: true }),
    travel("drive", "Airport to Şanlıurfa", P.sanliurfaAirport, P.urfaOldTown, at(14, "22:15"), at(14, "22:55"), { estimatedTimes: true }),
    stay("Night at Alkan Mozayik Otel", P.urfaOldTown, at(14, "22:55"), at(15, "09:00"), { estimatedTimes: true }),

    travel("drive", "To the Archaeology Museum", P.urfaOldTown, P.urfaMuseum, at(15, "09:00"), at(15, "09:15"), { estimatedTimes: true }),
    stay("Şanlıurfa Archaeology Museum", P.urfaMuseum, at(15, "09:15"), at(15, "12:30"), { estimatedTimes: true }),
    travel("drive", "Out to Göbeklitepe", P.urfaMuseum, P.gobekliVisitorCentre, at(15, "12:30"), at(15, "13:00"), { estimatedTimes: true }),
    travel("walk", "Up to the enclosures", P.gobekliVisitorCentre, P.gobekliTepe, at(15, "13:00"), at(15, "13:15"), { estimatedTimes: true }),
    stay("Göbeklitepe", P.gobekliTepe, at(15, "13:15"), at(15, "16:15"), { estimatedTimes: true }),
    travel("walk", "Back to the visitor centre", P.gobekliTepe, P.gobekliVisitorCentre, at(15, "16:15"), at(15, "16:30"), { estimatedTimes: true }),
    travel("drive", "Back to Şanlıurfa", P.gobekliVisitorCentre, P.urfaOldTown, at(15, "16:30"), at(15, "17:00"), { estimatedTimes: true }),
    stay("Night at Alkan Mozayik Otel", P.urfaOldTown, at(15, "17:00"), at(16, "09:00"), { estimatedTimes: true }),

    travel("walk", "Walk to the Balıklıgöl fish pools", P.urfaOldTown, P.abrahamsCave, at(16, "09:00"), at(16, "09:15"), { estimatedTimes: true }),
    stay("The cave of Abraham, Mevlid-i Halil", P.abrahamsCave, at(16, "09:15"), at(16, "11:30"), { estimatedTimes: true }),
    travel("walk", "Back to the car", P.abrahamsCave, P.urfaOldTown, at(16, "11:30"), at(16, "11:45"), { estimatedTimes: true }),
    travel("drive", "The long drive to Karadut, near Mount Nemrut", P.urfaOldTown, P.karadut, at(16, "11:45"), at(16, "15:45"),
      { estimatedTimes: true, note: "About four hours on the road." }),
    stay("Night at Nemrut Çeşme Otel, Karadut", P.karadut, at(16, "15:45"), at(17, "04:45"), { estimatedTimes: true }),

    travel("drive", "Up the mountain before dawn", P.karadut, P.nemrutVisitorCentre, at(17, "04:45"), at(17, "05:05"), { estimatedTimes: true }),
    travel("walk", "Shuttle and footpath to the summit", P.nemrutVisitorCentre, P.nemrutSummit, at(17, "05:05"), at(17, "05:30"),
      { estimatedTimes: true, note: "Cars stop at the visitor centre. The last stretch is by shuttle and on foot." }),
    stay("Mount Nemrut, the stone heads at sunrise", P.nemrutSummit, at(17, "05:30"), at(17, "08:00"), { estimatedTimes: true }),
    travel("walk", "Back down to the car", P.nemrutSummit, P.nemrutVisitorCentre, at(17, "08:00"), at(17, "08:30"), { estimatedTimes: true }),
    travel("drive", "Back down and on to Şanlıurfa", P.nemrutVisitorCentre, P.urfaCentre, at(17, "08:30"), at(17, "13:00"),
      { estimatedTimes: true }),
    stay("Night at Ktisis Otel", P.urfaCentre, at(17, "13:00"), at(18, "08:30"), { estimatedTimes: true }),

    travel("drive", "Out to Karahan Tepe", P.urfaCentre, P.karahanTepe, at(18, "08:30"), at(18, "09:45"),
      { estimatedTimes: true, note: "The first petrol station was out of fuel and sent you to another 4 km on, where you were offered tea." }),
    stay("Karahan Tepe", P.karahanTepe, at(18, "09:45"), at(18, "12:00"), { estimatedTimes: true }),
    travel("drive", "South to the Syrian border", P.karahanTepe, P.akcakale, at(18, "12:00"), at(18, "13:45"),
      { estimatedTimes: true }),
    stay("Akçakale, talking with locals about Syria and the war", P.akcakale, at(18, "13:45"), at(18, "16:00"), { estimatedTimes: true }),
    travel("drive", "Back north to Şanlıurfa", P.akcakale, P.urfaCentre, at(18, "16:00"), at(18, "16:45"), { estimatedTimes: true }),
    stay("Evening talk about Islam and the Quran, then drinks in a bar", P.urfaCentre, at(18, "16:45"), at(19, "06:20"),
      { estimatedTimes: true, note: "Night at Ktisis Otel." }),

    travel("drive", "To the airport to drop off the car", P.urfaCentre, P.sanliurfaAirport, at(19, "06:20"), at(19, "07:00"), { estimatedTimes: true }),
    stay("Car returned, waiting to board", P.sanliurfaAirport, at(19, "07:00"), at(19, "10:15")),
    travel("flight", "Pegasus PC2421, Şanlıurfa to Istanbul", P.sanliurfaAirport, P.sabihaGokcen, at(19, "10:15"), at(19, "12:10")),
    stay("Landed at Sabiha Gökçen", P.sabihaGokcen, at(19, "12:10"), at(19, "12:40"), { estimatedTimes: true }),
    travel("drive", "Transfer to Sultanahmet", P.sabihaGokcen, P.sultanahmet, at(19, "12:40"), at(19, "14:00"), { estimatedTimes: true }),
    stay("Atam Suites, Sultanahmet", P.sultanahmet, at(19, "14:00"), at(20, "09:00"), { estimatedTimes: true }),

    travel("walk", "Walk to Hagia Sophia", P.sultanahmet, P.hagiaSophia, at(20, "09:00"), at(20, "09:10"), { estimatedTimes: true }),
    stay("Hagia Sophia", P.hagiaSophia, at(20, "09:10"), at(20, "11:00"), { estimatedTimes: true }),
    travel("walk", "Across the square to the Blue Mosque", P.hagiaSophia, P.blueMosque, at(20, "11:00"), at(20, "11:10"), { estimatedTimes: true }),
    stay("Blue Mosque", P.blueMosque, at(20, "11:10"), at(20, "12:30"), { estimatedTimes: true }),
    travel("walk", "Up to Topkapı Palace", P.blueMosque, P.topkapiPalace, at(20, "12:30"), at(20, "12:50"), { estimatedTimes: true }),
    stay("Topkapı Palace", P.topkapiPalace, at(20, "12:50"), at(20, "16:30"), { estimatedTimes: true }),
    travel("walk", "Back to the hotel", P.topkapiPalace, P.sultanahmet, at(20, "16:30"), at(20, "16:45"), { estimatedTimes: true }),
    stay("Last night at Atam Suites", P.sultanahmet, at(20, "16:45"), at(21, "09:30"), { estimatedTimes: true }),

    travel("drive", "Transfer to Sabiha Gökçen", P.sultanahmet, P.sabihaGokcen, at(21, "09:30"), at(21, "10:45"), { estimatedTimes: true }),
    stay("Waiting to board", P.sabihaGokcen, at(21, "10:45"), at(21, "12:45"), { estimatedTimes: true }),
    travel("flight", "Pegasus PC1253, Istanbul to Amsterdam", P.sabihaGokcen, P.amsterdamAirport,
      at(21, "12:45"), at(21, "15:25", AMSTERDAM_SUMMER)),
  ],
};
