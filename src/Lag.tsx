import { useEffect, useState } from "react";

// Enkel versjon: KUN Enhetsregisteret (FLI) i Bamble
const BAMBLE_KOMMUNENR = "4012";
const ENHETSREGISTERET_URL =
  "https://data.brreg.no/enhetsregisteret/api/enheter";

interface Enhet {
  organisasjonsnummer: string;
  navn: string;

  // Nyttige felt vi viser
  stiftelsesdato?: string;
  registreringsdatoEnhetsregisteret?: string;
  hjemmeside?: string;
  kontaktinformasjon?: { telefon?: string; epost?: string };

  // For adresse/kart
  forretningsadresse?: {
    adresse?: string[];
    postnummer?: string;
    poststed?: string;
  };

  // Viktig: statusflagg fra Enhetsregisteret
  konkurs?: boolean;
  underAvvikling?: boolean;
  underTvangsavviklingEllerTvangsopplosning?: boolean;

  // Beholdes i tilfelle du vil vise senere
  organisasjonsform?: { kode?: string };
}

// Avled statuskode og -label fra flaggene
function deriveStatus(e: Enhet): { code: "aktiv" | "avvik" | "konkurs"; label: string } {
  if (e.konkurs) return { code: "konkurs", label: "Konkurs" };
  if (e.underTvangsavviklingEllerTvangsopplosning || e.underAvvikling) {
    // vi slår disse sammen til "Under avvikling" for UI-et
    return { code: "avvik", label: "Under avvikling" };
  }
  return { code: "aktiv", label: "Aktiv" };
}

export default function Lag() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [statusFilter, setStatusFilter] = useState<"" | "aktiv" | "avvik" | "konkurs">("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [enheter, setEnheter] = useState<Enhet[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Hjelpere
  const normUrl = (u?: string) => {
    if (!u) return null;
    const href = u.startsWith("http") ? u : `https://${u}`;
    return { href, label: href.replace(/^https?:\/\//, "") };
  };

  const calcAge = (d?: string) => {
    if (!d) return null;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - dt.getFullYear();
    const m = now.getMonth() - dt.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dt.getDate())) years--;
    return years >= 0 ? years : null;
  };

  const mapsLink = (a?: Enhet["forretningsadresse"]) => {
    if (!a) return null;
    const line = [
      a.adresse?.[0],
      a.postnummer && a.poststed ? `${a.postnummer} ${a.poststed}` : a.poststed,
    ]
      .filter(Boolean)
      .join(", ");
    return line
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          line
        )}`
      : null;
  };

  // Markér søketreff i navn
  function highlight(text: string, q: string) {
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return text;
    return (
      <>
        {text.slice(0, i)}
        <mark className="bg-yellow-200 px-0.5 rounded">
          {text.slice(i, i + q.length)}
        </mark>
        {text.slice(i + q.length)}
      </>
    );
  }

  // Nullstill side ved søkeendring/størrelse/filter
  useEffect(() => {
    setPage(0);
  }, [query, size, statusFilter]);

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

  // Klientside-filter for status (bruk avledet statuskode)
  const filtered = enheter.filter((e) => {
    if (!statusFilter) return true;
    const { code } = deriveStatus(e);
    return code === statusFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      {/* Toppstripe – inspirasjon fra Bamble */}
      <header className="bg-white-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Kommunelogo fra /public/logo.png */}
            <img src="/logo.png" alt="Bamble kommune" className="h-20 w-auto" />
            
          </div>
          
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
          <div className="col-span-12 md:col-span-7">
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

          {/* Statusfilter (bruker avledet status) */}
          <div className="col-span-6 md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-sky-900">
              Status
            </label>
            <select
              className="w-full rounded-3xl border border-sky-200 bg-white px-4 py-3 shadow-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-300"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "" | "aktiv" | "avvik" | "konkurs")
              }
            >
              <option value="">Alle statuser</option>
              <option value="aktiv">Aktive</option>
              <option value="avvik">Under avvikling</option>
              <option value="konkurs">Konkurs</option>
            </select>
          </div>

          {/* Treffinfo */}
          <div className="col-span-12 md:col-span-1 flex items-end justify-end text-sm text-sky-900/70">
            <div>
              {filtered.length} av {totalElements}
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
            {filtered.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-sky-100 bg-white p-6 text-sm text-sky-900/70 shadow-sm">
                Ingen treff på disse filtrene.
              </div>
            ) : (
              <ul className="mt-6 grid gap-4">
                {filtered.map((item) => {
                  const homepage = normUrl(item.hjemmeside);
                  const etablertDato =
                    item.stiftelsesdato ?? item.registreringsdatoEnhetsregisteret;
                  const etablertVis = etablertDato
                    ? new Date(etablertDato).toLocaleDateString("no-NO")
                    : null;
                  const alder = calcAge(etablertDato);
                  const kart = mapsLink(item.forretningsadresse);
                  const { code: statusCode, label: statusLabel } = deriveStatus(item);

                  return (
                    <li
                      key={item.organisasjonsnummer}
                      className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-sky-900">
                            {highlight(item.navn, query)}
                          </h3>
                          <div className="mt-1 text-sm text-sky-900/70">
                            Org.nr: {item.organisasjonsnummer}
                          </div>

                          {/* INFO-SEKSJON */}
                          <div className="mt-2 text-sm text-sky-900/90 space-y-1">
                            {(etablertVis || typeof alder === "number") && (
                              <div>
                                <span className="opacity-70">Etablert:</span>{" "}
                                {etablertVis ?? "—"}
                                {typeof alder === "number" && (
                                  <span className="ml-1 opacity-70">
                                    ({alder} år)
                                  </span>
                                )}
                              </div>
                            )}

                            {homepage && (
                              <div>
                                <span className="opacity-70">Nettside:</span>{" "}
                                <a
                                  href={homepage.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sky-700 underline hover:text-sky-900"
                                >
                                  {homepage.label}
                                </a>
                              </div>
                            )}

                            {(item.kontaktinformasjon?.epost ||
                              item.kontaktinformasjon?.telefon) && (
                              <div className="flex flex-wrap gap-x-4">
                                {item.kontaktinformasjon?.epost && (
                                  <span>
                                    <span className="opacity-70">E-post:</span>{" "}
                                    {item.kontaktinformasjon.epost}
                                  </span>
                                )}
                                {item.kontaktinformasjon?.telefon && (
                                  <span>
                                    <span className="opacity-70">Telefon:</span>{" "}
                                    {item.kontaktinformasjon.telefon}
                                  </span>
                                )}
                              </div>
                            )}

                            {(item.forretningsadresse?.adresse?.[0] ||
                              item.forretningsadresse?.poststed) && (
                              <div>
                                <span className="opacity-70">Forretningsadresse:</span>{" "}
                                {[
                                  item.forretningsadresse?.adresse?.[0],
                                  item.forretningsadresse?.postnummer &&
                                  item.forretningsadresse?.poststed
                                    ? `${item.forretningsadresse.postnummer} ${item.forretningsadresse.poststed}`
                                    : item.forretningsadresse?.poststed,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                                {kart && (
                                  <>
                                    {" "}
                                    •{" "}
                                    <a
                                      href={kart}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sky-700 underline hover:text-sky-900"
                                    >
                                      Åpne i kart
                                    </a>
                                  </>
                                )}
                                
                              </div>
                            )}

                            {/* Status-badge (avledet) */}
                            <div>
                              <span className="opacity-70">Status:</span>{" "}
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  statusCode === "aktiv"
                                    ? "bg-green-100 text-green-800"
                                    : statusCode === "avvik"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {statusLabel}
                              </span>
                            </div>
                          </div>
                        </div>

                        <a
                          href={`https://virksomhet.brreg.no/nb/oppslag/enheter/${item.organisasjonsnummer}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-sky-200 px-3 py-2 text-sm text-sky-900 hover:bg-sky-50 hover:shadow flex items-center gap-1"
                        >
                          Se detaljer i Brønnøysundregisteret<span aria-hidden>↗️</span>
                        </a>
                      </div>
                    </li>
                  );
                })}
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
