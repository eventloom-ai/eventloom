import { NextRequest, NextResponse } from "next/server";
import { parseGoogleSuggestions, parsePhotonSuggestions } from "@/lib/location-search";

export const dynamic = "force-dynamic";

const REQUEST_TIMEOUT_MS = 5_000;

async function searchGoogle(query: string, apiKey: string) {
  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "suggestions.placePrediction.placeId",
        "suggestions.placePrediction.text.text",
        "suggestions.placePrediction.structuredFormat.mainText.text",
        "suggestions.placePrediction.structuredFormat.secondaryText.text",
      ].join(","),
    },
    body: JSON.stringify({ input: query, includeQueryPredictions: false }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`Google Places returned ${response.status}`);
  return parseGoogleSuggestions(await response.json());
}

async function searchOpenStreetMap(query: string, language: string) {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "6");
  url.searchParams.set("lang", /^[a-z]{2}$/i.test(language) ? language.toLowerCase() : "en");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Eventloom location search (https://eventloom.co)",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`Photon returned ${response.status}`);
  return parsePhotonSuggestions(await response.json());
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 120) ?? "";
  if (query.length < 2) {
    return NextResponse.json({ suggestions: [], provider: null });
  }

  try {
    const googleKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
    if (googleKey) {
      const suggestions = await searchGoogle(query, googleKey);
      return NextResponse.json({ suggestions, provider: "google" });
    }

    const language = request.headers.get("accept-language")?.split(",")[0]?.split("-")[0] ?? "en";
    const suggestions = await searchOpenStreetMap(query, language);
    return NextResponse.json({ suggestions, provider: "openstreetmap" });
  } catch (error) {
    console.error("Location search failed", error);
    return NextResponse.json(
      { suggestions: [], provider: null, error: "Location search is temporarily unavailable." },
      { status: 503 },
    );
  }
}
