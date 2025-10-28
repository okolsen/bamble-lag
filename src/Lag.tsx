import { useEffect, useState } from "react";

// Enkel versjon: KUN Enhetsregisteret (FLI) i Bamble
const BAMBLE_KOMMUNENR = "4012";
const ENHETSREGISTERET_URL =
  "https://data.brreg.no/enhetsregisteret/api/enheter";

interface Enhet {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform?: { kode?: string };
  forretningsadresse?: {
    adresse?: string[];
    postnummer?: string;
    poststed?: string;
  };
  status?: string;
}

export default function Lag() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [enheter, setEnheter] = useState<Enhet[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Nullstill side ved søkeendring/størrelse
  useEffect(() => {
    setPage(0);
  }, [query, size]);

  // Hent data fra Enhetsregisteret (kun FLI i Bamble)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          organisasjonsform: "FLI",
          kommunenummer: BAMBLE_KOMMUNENR,
          size: String(size),
          page: String(page),
        });
        if (query) {
          params.set("navn", query);
          params.set("navnMetodeForSoek", "FORTLOEPENDE");
        }
        const res = await fetch(`${ENHETSREGISTERET_URL}?${params.toString()}`);
        if (!res.ok) throw new Error("Feil fra Enhetsregisteret");
        const data = await res.json();
        const list: Enhet[] = data._embedded?.enheter ?? [];
        setEnheter(list);
        setTotalPages(data.page?.totalPages ?? 0);
        setTotalElements(data.page?.totalElements ?? list.length);
      } catch (e: any) {
        setError(e?.message ?? "Noe gikk galt");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [query, page, size]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      {/* Toppstripe – inspirasjon fra Bamble */}
      <header className="bg-sky-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Placeholder for logo */}
            <div className="h-8 w-8 rounded-md bg-sky-700" aria-hidden />
            <span className="text-lg font-semibold tracking-tight">
              Bamble kommune
            </span>
          </div>
          <span className="text-xs opacity-80">Lag &amp; foreninger</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <h1 className="text-3xl font-bold tracking-tight text-sky-900">
          Finn lag og foreninger i Bamble
        </h1>
        <p className="mt-1 text-sm text-sky-900/70">
          Data fra Enhetsregisteret (organisasjonsform FLI). Kommunenummer{" "}
          {BAMBLE_KOMMUNENR}.
        </p>

        {/* Kontroller */}
        <div className="mt-5 grid grid-cols-12 gap-3 rounded-3xl border border-sky-100 bg-white p-4 shadow-sm sm:p-5">
          {/* BREDT søkefelt */}
          <div className="col-span-12 md:col-span-9">
            <label className="mb-1 block text-sm font-medium text-sky-900">
              Søk
            </label>
            <input
              className="w-full rounded-3xl border border-sky-200 bg-sky-50/30 px-4 py-3 text-base shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-300"
              placeholder="Søk på navn (f.eks. idrett, kor, speider)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Per side */}
          <div className="col-span-6 md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-sky-900">
              Per side
            </label>
            <select
              className="w-full rounded-3xl border border-sky-200 bg-white px-4 py-3 shadow-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-300"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            >
              {[25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Treffinfo */}
          <div className="col-span-6 md:col-span-1 flex items-end justify-end text-sm text-sky-900/70">
            <div>
              {enheter.length} av {totalElements}
            </div>
          </div>
        </div>

        {/* Resultat */}
        {loading && (
          <div className="mt-6 animate-pulse rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
            Laster…
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {enheter.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-sky-100 bg-white p-6 text-sm text-sky-900/70 shadow-sm">
                Ingen treff på disse filtrene.
              </div>
            ) : (
              <ul className="mt-6 grid gap-4">
                {enheter.map((item) => (
                  <li
                    key={item.organisasjonsnummer}
                    className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-sky-900">
                          {item.navn}
                        </h3>
                        <div className="mt-1 text-sm text-sky-900/70">
                          Org.nr: {item.organisasjonsnummer}
                        </div>
                        <div className="mt-1 text-sm text-sky-900/80">
                          <span className="opacity-70">Orgform:</span>{" "}
                          {item.organisasjonsform?.kode ?? "-"}
                          {item.status && (
                            <>
                              <span className="opacity-70"> • Status:</span>{" "}
                              {item.status}
                            </>
                          )}
                          {item.forretningsadresse?.poststed && (
                            <>
                              <span className="opacity-70"> • Poststed:</span>{" "}
                              {item.forretningsadresse.poststed}
                            </>
                          )}
                        </div>
                      </div>
                      <a
                        href={`https://virksomhet.brreg.no/nb/oppslag/enheter/${item.organisasjonsnummer}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-sky-200 px-3 py-2 text-sm text-sky-900 hover:bg-sky-50 hover:shadow"
                      >
                        Åpne
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Paginering */}
            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page <= 0}
                className="rounded-2xl border border-sky-200 bg-white px-4 py-2 text-sky-900 shadow-sm disabled:opacity-50 hover:bg-sky-50"
              >
                Forrige
              </button>
              <div className="text-sm text-sky-900/70">
                Side {page + 1} av {Math.max(1, totalPages)}
              </div>
              <button
                onClick={() =>
                  setPage((p) => (page + 1 < totalPages ? p + 1 : p))
                }
                disabled={page + 1 >= totalPages}
                className="rounded-2xl border border-sky-200 bg-white px-4 py-2 text-sky-900 shadow-sm disabled:opacity-50 hover:bg-sky-50"
              >
                Neste
              </button>
            </div>
          </>
        )}

        <footer className="mt-10 text-xs text-sky-900/60">
          Data: Enhetsregisteret (Brønnøysundregistrene) — NLOD.
        </footer>
      </main>
    </div>
  );
}
