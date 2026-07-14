import { NextResponse } from "next/server";

export const runtime = "edge";

const WIKIPEDIA_ENDPOINT = "https://en.wikipedia.org/w/api.php";
const MAX_TITLES = 50;
const MAX_TITLE_LENGTH = 255;
const UPSTREAM_TIMEOUT_MS = 10_000;
const WIKIPEDIA_REVALIDATE_SECONDS = 2_592_000;
const USER_AGENT =
  "TravelPlanner/1.0 (https://github.com/ShoudongLUO/TravelPlanner)";

interface Location {
  lat: number;
  lng: number;
}

interface ValidatedTitle {
  input: string;
  lookup: string;
}

interface WikipediaMapping {
  from: string;
  to: string;
}

interface WikipediaPage {
  title: string;
  location: Location | null;
}

class UpstreamContractError extends Error {}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequestBody(
  value: unknown,
): { titles: ValidatedTitle[] } | NextResponse {
  if (!isRecord(value) || !Array.isArray(value.titles)) {
    return errorResponse("titles must be an array", 400);
  }

  if (value.titles.length > MAX_TITLES) {
    return errorResponse(`titles must contain at most ${MAX_TITLES} items`, 413);
  }

  const titles: ValidatedTitle[] = [];
  for (const title of value.titles) {
    if (typeof title !== "string") {
      return errorResponse("every title must be a string", 400);
    }

    if (title.length > MAX_TITLE_LENGTH) {
      if (title.trim().length <= MAX_TITLE_LENGTH) {
        return errorResponse("titles contain excessive surrounding whitespace", 400);
      }
      return errorResponse(
        `titles must be at most ${MAX_TITLE_LENGTH} characters`,
        413,
      );
    }

    const lookup = title.trim();
    if (lookup.length === 0) {
      return errorResponse("titles must not be blank", 400);
    }

    titles.push({ input: title, lookup });
  }

  return { titles };
}

function parseMappings(value: unknown, field: string): WikipediaMapping[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new UpstreamContractError(`${field} must be an array`);
  }

  return value.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.from !== "string" ||
      entry.from.length === 0 ||
      typeof entry.to !== "string" ||
      entry.to.length === 0
    ) {
      throw new UpstreamContractError(`invalid ${field} mapping`);
    }
    return { from: entry.from, to: entry.to };
  });
}

function parsePage(value: unknown): WikipediaPage {
  if (!isRecord(value) || typeof value.title !== "string" || !value.title) {
    throw new UpstreamContractError("invalid page title");
  }

  const isMissing = value.missing === true;
  if (
    !isMissing &&
    (typeof value.pageid !== "number" ||
      !Number.isSafeInteger(value.pageid) ||
      value.pageid <= 0)
  ) {
    throw new UpstreamContractError("invalid page id");
  }

  if (value.coordinates === undefined) {
    return { title: value.title, location: null };
  }
  if (!Array.isArray(value.coordinates)) {
    throw new UpstreamContractError("coordinates must be an array");
  }
  if (value.coordinates.length === 0) {
    return { title: value.title, location: null };
  }

  const coordinate = value.coordinates[0];
  if (
    !isRecord(coordinate) ||
    typeof coordinate.lat !== "number" ||
    !Number.isFinite(coordinate.lat) ||
    typeof coordinate.lon !== "number" ||
    !Number.isFinite(coordinate.lon) ||
    coordinate.lat < -90 ||
    coordinate.lat > 90 ||
    coordinate.lon < -180 ||
    coordinate.lon > 180
  ) {
    throw new UpstreamContractError("invalid coordinates");
  }

  return {
    title: value.title,
    location: { lat: coordinate.lat, lng: coordinate.lon },
  };
}

function parseWikipediaResponse(value: unknown): {
  mappings: WikipediaMapping[];
  pages: WikipediaPage[];
} {
  if (!isRecord(value) || !isRecord(value.query)) {
    throw new UpstreamContractError("missing query data");
  }
  if (!Array.isArray(value.query.pages)) {
    throw new UpstreamContractError("pages must be an array");
  }

  const normalized = parseMappings(value.query.normalized, "normalized");
  const redirects = parseMappings(value.query.redirects, "redirects");
  const pages = value.query.pages.map(parsePage);
  return { mappings: [...normalized, ...redirects], pages };
}

function resolveCanonicalTitle(
  title: string,
  mappings: WikipediaMapping[],
): string {
  const mappedTitles = new Map(mappings.map(({ from, to }) => [from, to]));
  const visited = new Set<string>();
  let current = title;

  while (!visited.has(current)) {
    visited.add(current);
    const next = mappedTitles.get(current);
    if (!next) break;
    current = next;
  }

  return current;
}

function buildLocations(
  titles: ValidatedTitle[],
  mappings: WikipediaMapping[],
  pages: WikipediaPage[],
): Record<string, Location | null> {
  const locationsByTitle = new Map(
    pages.map(({ title, location }) => [title, location]),
  );

  return Object.fromEntries(
    titles.map(({ input, lookup }) => {
      const canonicalTitle = resolveCanonicalTitle(lookup, mappings);
      return [input, locationsByTitle.get(canonicalTitle) ?? null];
    }),
  );
}

function wikipediaUrl(titles: string[]): string {
  const searchParams = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "coordinates",
    coprimary: "primary",
    colimit: "1",
    redirects: "1",
    titles: titles.join("|"),
  });
  return `${WIKIPEDIA_ENDPOINT}?${searchParams.toString()}`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid JSON body", 400);
  }

  const validated = validateRequestBody(body);
  if (validated instanceof NextResponse) return validated;
  if (validated.titles.length === 0) {
    return NextResponse.json({ locations: {} });
  }

  const uniqueTitles = Array.from(
    new Set(validated.titles.map(({ lookup }) => lookup)),
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(wikipediaUrl(uniqueTitles), {
      method: "GET",
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      next: { revalidate: WIKIPEDIA_REVALIDATE_SECONDS },
    });

    if (upstream.status === 429) {
      return errorResponse("Wikipedia rate limit reached", 429);
    }
    if (!upstream.ok) {
      return errorResponse("Wikipedia is temporarily unavailable", 503);
    }

    let upstreamBody: unknown;
    try {
      upstreamBody = await upstream.json();
    } catch {
      return errorResponse("Wikipedia returned an invalid response", 503);
    }

    const { mappings, pages } = parseWikipediaResponse(upstreamBody);
    return NextResponse.json({
      locations: buildLocations(validated.titles, mappings, pages),
    });
  } catch {
    return errorResponse("Wikipedia is temporarily unavailable", 503);
  } finally {
    clearTimeout(timeout);
  }
}
