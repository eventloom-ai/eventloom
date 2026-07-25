export type LocationSuggestion = {
  id: string;
  label: string;
  secondary: string;
  provider: "google" | "openstreetmap";
};

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
};

type PhotonResponse = {
  features?: Array<{
    properties?: {
      name?: string;
      street?: string;
      housenumber?: string;
      postcode?: string;
      district?: string;
      city?: string;
      county?: string;
      state?: string;
      country?: string;
      osm_type?: string;
      osm_id?: number;
    };
  }>;
};

function uniqueParts(parts: Array<string | undefined>) {
  return parts.filter((part, index, all): part is string => Boolean(part?.trim()) && all.indexOf(part) === index);
}

export function parseGoogleSuggestions(payload: GoogleAutocompleteResponse): LocationSuggestion[] {
  return (payload.suggestions ?? []).flatMap((suggestion) => {
    const prediction = suggestion.placePrediction;
    const id = prediction?.placeId;
    const label = prediction?.structuredFormat?.mainText?.text ?? prediction?.text?.text;
    if (!id || !label) return [];

    return [{
      id: `google:${id}`,
      label,
      secondary: prediction?.structuredFormat?.secondaryText?.text ?? "",
      provider: "google" as const,
    }];
  });
}

export function parsePhotonSuggestions(payload: PhotonResponse): LocationSuggestion[] {
  const seen = new Set<string>();

  return (payload.features ?? []).flatMap((feature) => {
    const place = feature.properties;
    if (!place?.name || !place.osm_type || place.osm_id === undefined) return [];

    const street = uniqueParts([place.housenumber, place.street]).join(" ");
    const secondary = uniqueParts([
      street,
      place.district,
      place.city,
      place.county,
      place.state,
      place.postcode,
      place.country,
    ]).join(", ");
    const key = `${place.name.toLocaleLowerCase()}|${secondary.toLocaleLowerCase()}`;
    if (seen.has(key)) return [];
    seen.add(key);

    return [{
      id: `osm:${place.osm_type}:${place.osm_id}`,
      label: place.name,
      secondary,
      provider: "openstreetmap" as const,
    }];
  });
}

export function locationAnswer(suggestion: Pick<LocationSuggestion, "label" | "secondary">) {
  if (!suggestion.secondary || suggestion.secondary.toLocaleLowerCase().includes(suggestion.label.toLocaleLowerCase())) {
    return suggestion.secondary || suggestion.label;
  }
  return `${suggestion.label}, ${suggestion.secondary}`;
}
