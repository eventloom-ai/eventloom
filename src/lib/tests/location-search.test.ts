import { describe, expect, it } from "vitest";
import { locationAnswer, parseGoogleSuggestions, parsePhotonSuggestions } from "@/lib/location-search";

describe("location search", () => {
  it("normalizes Google Places predictions", () => {
    expect(parseGoogleSuggestions({
      suggestions: [{
        placePrediction: {
          placeId: "abc",
          text: { text: "Toronto City Hall, Toronto, ON, Canada" },
          structuredFormat: {
            mainText: { text: "Toronto City Hall" },
            secondaryText: { text: "Toronto, ON, Canada" },
          },
        },
      }],
    })).toEqual([{
      id: "google:abc",
      label: "Toronto City Hall",
      secondary: "Toronto, ON, Canada",
      provider: "google",
    }]);
  });

  it("normalizes and deduplicates OpenStreetMap results", () => {
    const feature = {
      properties: {
        name: "Toronto City Hall",
        street: "Queen Street West",
        housenumber: "100",
        city: "Toronto",
        state: "Ontario",
        country: "Canada",
        osm_type: "W",
        osm_id: 123,
      },
    };

    expect(parsePhotonSuggestions({ features: [feature, feature] })).toEqual([{
      id: "osm:W:123",
      label: "Toronto City Hall",
      secondary: "100 Queen Street West, Toronto, Ontario, Canada",
      provider: "openstreetmap",
    }]);
  });

  it("stores the selected place name and location context", () => {
    expect(locationAnswer({
      label: "Toronto City Hall",
      secondary: "Toronto, Ontario, Canada",
    })).toBe("Toronto City Hall, Toronto, Ontario, Canada");
  });
});
