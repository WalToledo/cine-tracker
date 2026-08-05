import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { clearTmdbCache } from "../services/tmdb.service";

/**
 * A diferencia del resto de las suites del backend, ésta no toca la base de
 * datos: se stubean `fetch` y `TMDB_API_KEY` para probar los dos modos del
 * proxy (con API Key y con el fallback mockeado).
 */
function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const TRENDING_PAYLOAD = {
  results: [
    {
      id: 1234,
      title: "Una película real",
      poster_path: "/poster.jpg",
      overview: "Sinopsis desde TMDB.",
      release_date: "2024-01-15",
      vote_average: 7.8,
    },
  ],
};

function searchPayload(page: number) {
  return {
    page,
    total_pages: 3,
    results: [
      {
        id: 603 + page,
        title: `The Matrix (página ${page})`,
        poster_path: "/matrix.jpg",
        overview: "Sinopsis desde TMDB.",
        release_date: "1999-03-31",
        vote_average: 8.2,
      },
    ],
  };
}

const DETAILS_PAYLOAD = {
  id: 550,
  title: "Fight Club",
  poster_path: "/poster.jpg",
  overview: "Sinopsis desde TMDB.",
  release_date: "1999-10-15",
  vote_average: 8.4,
  backdrop_path: "/backdrop.jpg",
  tagline: "Mischief. Mayhem. Soap.",
  runtime: 139,
  genres: [
    { id: 18, name: "Drama" },
    { id: 53, name: "Suspense" },
  ],
  credits: {
    // 12 actores: el servicio debe quedarse sólo con los 10 primeros.
    cast: Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      name: `Actor ${index + 1}`,
      character: `Personaje ${index + 1}`,
      profile_path: index === 0 ? "/profile.jpg" : null,
    })),
    crew: [
      { id: 900, name: "Alguien de sonido", job: "Sound Editor" },
      { id: 7467, name: "David Fincher", job: "Director" },
    ],
  },
  videos: {
    results: [
      { key: "no-oficial", site: "YouTube", type: "Trailer", official: false },
      { key: "un-teaser", site: "YouTube", type: "Teaser", official: true },
      { key: "el-oficial", site: "YouTube", type: "Trailer", official: true },
    ],
  },
};

describe("/api/movies", () => {
  beforeEach(() => {
    clearTmdbCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe("with a TMDB API key configured", () => {
    beforeEach(() => {
      vi.stubEnv("TMDB_API_KEY", "test-key");
    });

    it("maps the trending payload to camelCase", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(TRENDING_PAYLOAD));
      vi.stubGlobal("fetch", fetchMock);

      const response = await request(app).get("/api/movies/trending");

      expect(response.status).toBe(200);
      expect(response.body.movies).toEqual([
        {
          id: 1234,
          title: "Una película real",
          posterPath: "/poster.jpg",
          overview: "Sinopsis desde TMDB.",
          releaseDate: "2024-01-15",
          voteAverage: 7.8,
        },
      ]);

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain("/trending/movie/week");
      expect(url).toContain("api_key=test-key");
    });

    it("does not hit TMDB twice for the same request within the cache TTL", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(TRENDING_PAYLOAD));
      vi.stubGlobal("fetch", fetchMock);

      await request(app).get("/api/movies/trending");
      await request(app).get("/api/movies/trending");

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("extracts director, caps the cast at 10 and picks the official trailer", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(DETAILS_PAYLOAD));
      vi.stubGlobal("fetch", fetchMock);

      const response = await request(app).get("/api/movies/550");

      expect(response.status).toBe(200);

      const { movie } = response.body;
      expect(movie.director).toBe("David Fincher");
      expect(movie.cast).toHaveLength(10);
      expect(movie.cast[0]).toEqual({
        id: 1,
        name: "Actor 1",
        character: "Personaje 1",
        profilePath: "/profile.jpg",
      });
      expect(movie.trailerKey).toBe("el-oficial");
      expect(movie.genres).toEqual(["Drama", "Suspense"]);
      expect(movie.backdropPath).toBe("/backdrop.jpg");
      expect(movie.runtime).toBe(139);

      expect(fetchMock.mock.calls[0][0]).toContain("append_to_response=credits,videos");
    });

    it("maps the search payload and reports the pagination", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(searchPayload(1)));
      vi.stubGlobal("fetch", fetchMock);

      const response = await request(app).get("/api/movies/search?q=el%20padrino");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        movies: [
          {
            id: 604,
            title: "The Matrix (página 1)",
            posterPath: "/matrix.jpg",
            overview: "Sinopsis desde TMDB.",
            releaseDate: "1999-03-31",
            voteAverage: 8.2,
          },
        ],
        page: 1,
        totalPages: 3,
      });

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain("/search/movie");
      expect(url).toContain("query=el%20padrino");
      expect(url).toContain("page=1");
    });

    it("caches each page separately", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(searchPayload(1)))
        .mockResolvedValueOnce(jsonResponse(searchPayload(2)));
      vi.stubGlobal("fetch", fetchMock);

      await request(app).get("/api/movies/search?q=matrix");
      const second = await request(app).get("/api/movies/search?q=matrix&page=2");
      const cached = await request(app).get("/api/movies/search?q=matrix&page=2");

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][0]).toContain("page=2");
      expect(second.body.page).toBe(2);
      expect(cached.body).toEqual(second.body);
    });

    it("turns a 404 from TMDB into a 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 404)));

      const response = await request(app).get("/api/movies/999999");

      expect(response.status).toBe(404);
    });
  });

  describe("without a TMDB API key", () => {
    beforeEach(() => {
      vi.stubEnv("TMDB_API_KEY", "");
    });

    it("falls back to the mocked movies without calling TMDB", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const response = await request(app).get("/api/movies/trending");

      expect(response.status).toBe(200);
      expect(response.body.movies).toHaveLength(8);
      expect(response.body.movies[0].title).toBe("Fight Club");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("serves a mocked movie detail with empty cast and no trailer", async () => {
      const response = await request(app).get("/api/movies/550");

      expect(response.status).toBe(200);
      expect(response.body.movie.title).toBe("Fight Club");
      expect(response.body.movie.cast).toEqual([]);
      expect(response.body.movie.trailerKey).toBeNull();
    });

    it("returns 404 for a movie that is not in the mocked data", async () => {
      const response = await request(app).get("/api/movies/999999");

      expect(response.status).toBe(404);
    });

    it("filters the mocked movies by title without calling TMDB", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const response = await request(app).get("/api/movies/search?q=MATRIX");

      expect(response.status).toBe(200);
      expect(response.body.movies).toHaveLength(1);
      expect(response.body.movies[0].title).toBe("The Matrix");
      expect(response.body.totalPages).toBe(1);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it("rejects a non numeric id", async () => {
    const response = await request(app).get("/api/movies/not-a-number");

    expect(response.status).toBe(400);
  });

  it("rejects a search without a query", async () => {
    const missing = await request(app).get("/api/movies/search");
    const blank = await request(app).get("/api/movies/search?q=%20%20");

    expect(missing.status).toBe(400);
    expect(missing.body).toEqual({ error: "q is required" });
    expect(blank.status).toBe(400);
  });

  it("rejects an out of range page", async () => {
    const zero = await request(app).get("/api/movies/search?q=matrix&page=0");
    const text = await request(app).get("/api/movies/search?q=matrix&page=abc");
    const tooBig = await request(app).get("/api/movies/search?q=matrix&page=501");

    expect(zero.status).toBe(400);
    expect(text.status).toBe(400);
    expect(tooBig.status).toBe(400);
  });
});
