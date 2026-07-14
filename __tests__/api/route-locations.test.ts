/**
 * @jest-environment node
 */
import { POST } from "@/app/api/route-locations/route";

const WIKIPEDIA_ENDPOINT = "https://en.wikipedia.org/w/api.php";
const MAX_REQUEST_BODY_BYTES = 128 * 1024;

function requestWithBody(body: unknown): Request {
  return new Request("http://localhost/api/route-locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function requestWithStream(
  chunks: Uint8Array[],
  signal?: AbortSignal,
): Request {
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index]);
        index += 1;
      } else {
        controller.close();
      }
    },
  });
  const init: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: stream,
    duplex: "half",
    signal,
  };
  return new Request("http://localhost/api/route-locations", init);
}

function wikipediaResponse(
  body: unknown,
  status = 200,
): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function page(title: string, lat: number, lon: number, pageid = 1) {
  return { pageid, title, coordinates: [{ lat, lon, primary: "" }] };
}

describe("POST /api/route-locations", () => {
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("rejects invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/route-locations", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["missing titles", {}],
    ["non-array titles", { titles: "Paris" }],
    ["non-string title", { titles: ["Paris", 7] }],
    ["blank title", { titles: ["   "] }],
  ])("rejects %s", async (_label, body) => {
    const response = await POST(requestWithBody(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an empty result without an upstream request for zero titles", async () => {
    const response = await POST(requestWithBody({ titles: [] }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ locations: {} });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts one title, trims it for lookup, and preserves the input key", async () => {
    fetchMock.mockReturnValue(
      wikipediaResponse({ query: { pages: [page("Paris", 48.8566, 2.3522)] } }),
    );

    const response = await POST(requestWithBody({ titles: ["  Paris  "] }));
    const [input] = fetchMock.mock.calls[0];
    const url = new URL(String(input));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      locations: { "  Paris  ": { lat: 48.8566, lng: 2.3522 } },
    });
    expect(url.origin + url.pathname).toBe(WIKIPEDIA_ENDPOINT);
    expect(url.searchParams.get("titles")).toBe("Paris");
  });

  it("accepts exactly 50 titles", async () => {
    const titles = Array.from({ length: 50 }, (_, index) => `Place ${index}`);
    fetchMock.mockReturnValue(
      wikipediaResponse({
        query: {
          pages: titles.map((title, index) => page(title, index, index, index + 1)),
        },
      }),
    );

    const response = await POST(requestWithBody({ titles }));
    const body = (await response.json()) as { locations: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(Object.keys(body.locations)).toHaveLength(50);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("batches 50 maximally escaped titles into bounded GET URLs and merges results", async () => {
    const titles = Array.from({ length: 50 }, (_, index) =>
      `${"界".repeat(251)}${String(index).padStart(4, "0")}`,
    );
    fetchMock.mockImplementation((input) => {
      const batchTitles = new URL(String(input)).searchParams
        .get("titles")
        ?.split("|") ?? [];
      return wikipediaResponse({
        query: {
          pages: batchTitles.map((title) => {
            const index = Number(title.slice(-4));
            return page(title, index, index, index + 1);
          }),
        },
      });
    });

    const response = await POST(requestWithBody({ titles }));
    const body = (await response.json()) as {
      locations: Record<string, { lat: number; lng: number } | null>;
    };

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
    for (const [input, init] of fetchMock.mock.calls) {
      const url = String(input);
      expect(url).toMatch(/^[\x00-\x7F]+$/);
      expect(url.length).toBeLessThanOrEqual(7_500);
      expect(init).toEqual(
        expect.objectContaining({
          method: "GET",
          next: { revalidate: 2_592_000 },
        }),
      );
    }
    titles.forEach((title, index) => {
      expect(body.locations[title]).toEqual({ lat: index, lng: index });
    });
  });

  it("does not return partial locations when a later URL batch fails", async () => {
    const titles = Array.from({ length: 4 }, (_, index) =>
      `${"界".repeat(251)}${String(index).padStart(4, "0")}`,
    );
    fetchMock
      .mockImplementationOnce((input) => {
        const batchTitles = new URL(String(input)).searchParams
          .get("titles")
          ?.split("|") ?? [];
        return wikipediaResponse({
          query: {
            pages: batchTitles.map((title, index) =>
              page(title, index, index, index + 1),
            ),
          },
        });
      })
      .mockReturnValueOnce(wikipediaResponse({ error: "upstream" }, 503));

    const response = await POST(requestWithBody({ titles }));
    const body = (await response.json()) as Record<string, unknown>;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(503);
    expect(body).toEqual({ error: expect.any(String) });
    expect(body).not.toHaveProperty("locations");
  });

  it("rejects more than 50 titles", async () => {
    const titles = Array.from({ length: 51 }, (_, index) => `Place ${index}`);
    const response = await POST(requestWithBody({ titles }));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a title containing exactly 255 characters", async () => {
    const title = "a".repeat(255);
    fetchMock.mockReturnValue(
      wikipediaResponse({ query: { pages: [page(title, 1, 2)] } }),
    );

    const response = await POST(requestWithBody({ titles: [title] }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      locations: { [title]: { lat: 1, lng: 2 } },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects ordinary titles longer than 255 characters", async () => {
    const response = await POST(
      requestWithBody({ titles: ["a".repeat(256)] }),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized whitespace padding before lookup normalization", async () => {
    const paddedTitle = `${" ".repeat(100_000)}Paris`;

    const response = await POST(requestWithBody({ titles: [paddedTitle] }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized body from Content-Length without fetching upstream", async () => {
    const body = JSON.stringify({
      titles: ["Paris"],
      extra: "x".repeat(MAX_REQUEST_BODY_BYTES),
    });
    const response = await POST(
      new Request("http://localhost/api/route-locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(new TextEncoder().encode(body).byteLength),
        },
        body,
      }),
    );

    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("streams and cancels an oversized body without Content-Length", async () => {
    const encoder = new TextEncoder();
    const cancel = jest.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("x".repeat(100_000)));
        controller.enqueue(encoder.encode("x".repeat(40_000)));
      },
      cancel,
    });
    const init: RequestInit & { duplex: "half" } = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: stream,
      duplex: "half",
    };

    const response = await POST(
      new Request("http://localhost/api/route-locations", init),
    );

    expect(response.status).toBe(413);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed UTF-8 before JSON parsing", async () => {
    const response = await POST(
      requestWithStream([new Uint8Array([0xc3, 0x28])]),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deduplicates trimmed upstream titles while retaining distinct original keys", async () => {
    fetchMock.mockReturnValue(
      wikipediaResponse({ query: { pages: [page("Paris", 48.8566, 2.3522)] } }),
    );

    const response = await POST(
      requestWithBody({ titles: ["Paris", " Paris ", "Paris"] }),
    );
    const [input] = fetchMock.mock.calls[0];
    const url = new URL(String(input));

    expect(url.searchParams.get("titles")).toBe("Paris");
    expect(await response.json()).toEqual({
      locations: {
        Paris: { lat: 48.8566, lng: 2.3522 },
        " Paris ": { lat: 48.8566, lng: 2.3522 },
      },
    });
  });

  it("uses the fixed MediaWiki query and safe fetch options", async () => {
    fetchMock.mockReturnValue(
      wikipediaResponse({ query: { pages: [page("A&B / C", 1, 2)] } }),
    );

    const response = await POST(requestWithBody({ titles: ["A&B / C"] }));
    const [input, init] = fetchMock.mock.calls[0];
    const url = new URL(String(input));

    expect(response.status).toBe(200);
    expect(url.origin + url.pathname).toBe(WIKIPEDIA_ENDPOINT);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      action: "query",
      format: "json",
      formatversion: "2",
      prop: "coordinates",
      coprimary: "primary",
      colimit: "1",
      redirects: "1",
      titles: "A&B / C",
    });
    expect(init).toEqual(
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "User-Agent": expect.stringMatching(/TravelPlanner.+github\.com/i),
        }),
        signal: expect.any(AbortSignal),
        next: { revalidate: 2_592_000 },
      }),
    );
  });

  it("maps normalized and redirected titles back to every original input key", async () => {
    fetchMock.mockReturnValue(
      wikipediaResponse({
        query: {
          normalized: [{ from: "new york city", to: "New york city" }],
          redirects: [{ from: "New york city", to: "New York City" }],
          pages: [page("New York City", 40.7128, -74.006)],
        },
      }),
    );

    const response = await POST(
      requestWithBody({ titles: ["new york city", " New York City "] }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      locations: {
        "new york city": { lat: 40.7128, lng: -74.006 },
        " New York City ": { lat: 40.7128, lng: -74.006 },
      },
    });
  });

  it("returns null for valid missing and coordinate-free pages", async () => {
    fetchMock.mockReturnValue(
      wikipediaResponse({
        query: {
          pages: [
            {
              title: "Missing",
              missing: true,
              coordinates: [{ lat: 48.8566, lon: 2.3522 }],
            },
            { pageid: 2, title: "No coordinates" },
          ],
        },
      }),
    );

    const response = await POST(
      requestWithBody({ titles: ["Missing", "No coordinates"] }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      locations: { Missing: null, "No coordinates": null },
    });
  });

  it.each([
    ["non-object root", []],
    ["missing query", {}],
    ["non-array pages", { query: { pages: {} } }],
    ["page without title", { query: { pages: [{ pageid: 1 }] } }],
    ["invalid page id", { query: { pages: [{ pageid: "1", title: "Paris" }] } }],
    [
      "invalid coordinates",
      { query: { pages: [{ pageid: 1, title: "Paris", coordinates: [{}] }] } },
    ],
    [
      "non-finite latitude",
      {
        query: {
          pages: [
            { pageid: 1, title: "Paris", coordinates: [{ lat: "48", lon: 2 }] },
          ],
        },
      },
    ],
    ["invalid normalized mapping", { query: { normalized: [{}], pages: [] } }],
    ["invalid redirect mapping", { query: { redirects: [{}], pages: [] } }],
  ])("returns 503 for malformed upstream data: %s", async (_label, body) => {
    fetchMock.mockReturnValue(wikipediaResponse(body));

    const response = await POST(requestWithBody({ titles: ["Paris"] }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: expect.any(String) });
  });

  it.each([
    [91, 0],
    [-91, 0],
    [0, 181],
    [0, -181],
  ])("rejects out-of-range coordinates (%s, %s)", async (lat, lon) => {
    fetchMock.mockReturnValue(
      wikipediaResponse({ query: { pages: [page("Place", lat, lon)] } }),
    );

    const response = await POST(requestWithBody({ titles: ["Place"] }));

    expect(response.status).toBe(503);
  });

  it("maps an upstream 429 response to 429", async () => {
    fetchMock.mockReturnValue(wikipediaResponse({ error: "rate limited" }, 429));

    const response = await POST(requestWithBody({ titles: ["Paris"] }));

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: expect.any(String) });
  });

  it.each([500, 502, 503])(
    "maps an upstream %s response to retryable 503",
    async (status) => {
      fetchMock.mockReturnValue(wikipediaResponse({ error: "upstream" }, status));

      const response = await POST(requestWithBody({ titles: ["Paris"] }));

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: expect.any(String) });
    },
  );

  it("maps network failures to retryable 503", async () => {
    fetchMock.mockRejectedValue(new TypeError("network unavailable"));

    const response = await POST(requestWithBody({ titles: ["Paris"] }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: expect.any(String) });
  });

  it("maps invalid upstream JSON to 503 without returning locations", async () => {
    fetchMock.mockResolvedValue(
      new Response("{", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await POST(requestWithBody({ titles: ["Paris"] }));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: expect.any(String) });
    expect(body).not.toHaveProperty("locations");
  });

  it("aborts at exactly 10 seconds, returns 503, and clears the timer", async () => {
    jest.useFakeTimers();
    let capturedSignal: AbortSignal | undefined;
    let settled = false;
    fetchMock.mockImplementation((_input, init) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        capturedSignal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const responsePromise = POST(requestWithBody({ titles: ["Paris"] }));
    void responsePromise.then(() => {
      settled = true;
    });
    await jest.advanceTimersByTimeAsync(0);

    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    expect(capturedSignal?.aborted).toBe(false);
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(9_999);

    expect(capturedSignal?.aborted).toBe(false);
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    const response = await responsePromise;

    expect(capturedSignal?.aborted).toBe(true);
    expect(settled).toBe(true);
    expect(response.status).toBe(503);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("forwards request cancellation and removes abort and timer resources", async () => {
    jest.useFakeTimers();
    const requestController = new AbortController();
    const request = new Request("http://localhost/api/route-locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titles: ["Paris"] }),
      signal: requestController.signal,
    });
    const removeListener = jest.spyOn(request.signal, "removeEventListener");
    let upstreamSignal: AbortSignal | undefined;
    fetchMock.mockImplementation((_input, init) => {
      upstreamSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        upstreamSignal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const responsePromise = POST(request);
    await jest.advanceTimersByTimeAsync(0);
    expect(upstreamSignal?.aborted).toBe(false);

    requestController.abort();
    const response = await responsePromise;

    expect(upstreamSignal?.aborted).toBe(true);
    expect(response.status).toBe(503);
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(jest.getTimerCount()).toBe(0);
  });

  it("clears the timeout after a successful request", async () => {
    jest.useFakeTimers();
    fetchMock.mockReturnValue(
      wikipediaResponse({ query: { pages: [page("Paris", 48.8566, 2.3522)] } }),
    );

    const response = await POST(requestWithBody({ titles: ["Paris"] }));

    expect(response.status).toBe(200);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("does not expose upstream fields", async () => {
    fetchMock.mockReturnValue(
      wikipediaResponse({
        batchcomplete: true,
        query: {
          pages: [
            {
              ...page("Paris", 48.8566, 2.3522),
              touched: "secret",
              coordinates: [
                { lat: 48.8566, lon: 2.3522, globe: "earth", extra: "secret" },
              ],
            },
          ],
        },
      }),
    );

    const response = await POST(requestWithBody({ titles: ["Paris"] }));

    expect(await response.json()).toEqual({
      locations: { Paris: { lat: 48.8566, lng: 2.3522 } },
    });
  });

  it("serializes prototype-like input keys as safe own properties", async () => {
    fetchMock.mockReturnValue(
      wikipediaResponse({
        query: {
          pages: [
            page("__proto__", 1, 2, 1),
            page("constructor", 3, 4, 2),
          ],
        },
      }),
    );

    const response = await POST(
      requestWithBody({ titles: ["__proto__", "constructor"] }),
    );
    const body = (await response.json()) as {
      locations: Record<string, { lat: number; lng: number } | null>;
    };

    expect(response.status).toBe(200);
    expect(
      Object.prototype.hasOwnProperty.call(body.locations, "__proto__"),
    ).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(body.locations, "constructor"),
    ).toBe(true);
    expect(body.locations["__proto__"]).toEqual({ lat: 1, lng: 2 });
    expect(body.locations.constructor).toEqual({ lat: 3, lng: 4 });
  });
});
