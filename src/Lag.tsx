import { useEffect, useMemo, useState } from "react";

// Konstanter
const BAMBLE_KOMMUNENR = "4012";
const ENHETSREGISTERET_URL = "https://data.brreg.no/enhetsregisteret/api/enheter";
const FRIVILLIGHETSREGISTERET_URL =
  "https://data.brreg.no/frivillighetsregisteret/api/frivillige-organisasjoner";
const ICNPO_URL = "https://data.brreg.no/frivillighetsregisteret/api/icnpo-kategorier";

type Mode = "enhet" | "frivillig";

interface Enhet {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform?: { kode?: string };
  forretningsadresse?: { adresse?: string[]; postnummer?: string; poststed?: string };
  status?: string; // "Aktiv", "Under avvikling", etc.
}

interface FrivilligOrganisasjon {
  organisasjonsnummer: string;
  navn: string;
  icnpoKategori?: { kode?: string; navn?: string } | null;
  registreringsstatus?: string; // "Registrert", etc.
}

interface IcnpoKategori { kode: string; navn: string }

export default function Lag() {
  // UI/state
  const [mode, setMode] = useState<Mode>("enhet");
  const [query, setQuery] = useState("");
  const [icnpoKode, setIcnpoKode] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  // Data/paging
  const [page, setPage] = useState(0);
  //const [size, setSize] = useState(50);
  const size = 50;
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [icnpoKategorier, setIcnpoKategorier] = useState<IcnpoKategori[]>([]);
  const [enheter, setEnheter] = useState<Enhet[]>([]);
  const [frivillige, setFrivillige] = useState<FrivilligOrganisasjon[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hent ICNPO-kategorier (kun én gang)
  useEffect(() => {
    fetch(ICNPO_URL)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setIcnpoKategorier(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Nullstill side når filtre endres
  useEffect(() => {
    setPage(0);
  }, [mode, query, icnpoKode, activeOnly, size]);

  // Hent data når parametre endres
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (mode === "enhet") {
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
          setFrivillige([]);
          setTotalPages(data.page?.totalPages ?? 0);
          setTotalElements(data.page?.totalElements ?? list.length);
        } else {
          const params = new URLSearchParams({
            kommunenummer: BAMBLE_KOMMUNENR,
            size: String(size),
            page: String(page),
          });
          if (query) params.set("navn", query);
          if (icnpoKode) params.set("icnpoKategoriKode", icnpoKode);
          const res = await fetch(`${FRIVILLIGHETSREGISTERET_URL}?${params.toString()}`);
          if (!res.ok) throw new Error("Feil fra Frivillighetsregisteret");
          const data = await res.json();
          const list: FrivilligOrganisasjon[] = data._embedded?.organisasjoner ?? [];
          setFrivillige(list);
          setEnheter([]);
          setTotalPages(data.page?.totalPages ?? 0);
          setTotalElements(data.page?.totalElements ?? list.length);
        }
      } catch (e: any) {
        setError(e?.message ?? "Noe gikk galt");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [mode, query, icnpoKode, page, size]);

  // Aktive-filter – stabil hookrekkefølge
  const baseList: any[] = mode === "frivillig" ? frivillige : enheter;
  const filtered = useMemo(() => {
    if (!activeOnly) return baseList;
    return baseList.filter((item: any) => {
      const status = (item.status ?? item.registreringsstatus ?? "").toString().toLowerCase();
      return status.includes("aktiv") || status.includes("registrert");
    });
  }, [baseList, activeOnly]);

  // UI
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Lag og foreninger i Bamble</h1>
      <p className="text-sm opacity-70">Kildedata fra Brønnøysundregistrene</p>

      {/* Kontroller */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border p-4 shadow-sm">
        <input
          className="rounded-2xl border p-3 shadow-sm"
          placeholder="Søk på navn (idrett, kor, speider...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <select
          className="rounded-2xl border p-3 shadow-sm"
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
        >
          <option value="enhet">Enhetsregisteret (FLI)</option>
          <option value="frivillig">Frivillighetsregisteret</option>
        </select>

        <select
          className="rounded-2xl border p-3 shadow-sm disabled:opacity-50"
          disabled={mode !== "frivillig"}
          value={icnpoKode}
          onChange={(e) => setIcnpoKode(e.target.value)}
        >
          <option value="">Alle kategorier</option>
          {icnpoKategorier.map((k) => (
            <option key={k.kode} value={k.kode}>{k.kode} — {k.navn}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          Kun aktive
        </label>
      </div>

      {/* Resultat */}
      {loading && (
        <div className="mt-6 animate-pulse rounded-2xl border p-6 shadow-sm">Laster…</div>
      )}
      {error && (
        <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>
      )}

      {!loading && !error && (
        <>
          <div className="mt-4 text-sm opacity-70">{filtered.length} av {totalElements} treff</div>
          {filtered.length === 0 ? (
            <div className="mt-4 rounded-2xl border p-6 text-sm opacity-70">Ingen treff på disse filtrene.</div>
          ) : (
            <ul className="mt-4 grid gap-3">
              {filtered.map((item: any) => (
                <li key={item.organisasjonsnummer} className="rounded-2xl border p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold leading-tight">{item.navn}</h3>
                      <div className="mt-1 text-sm opacity-80">Org.nr: {item.organisasjonsnummer}</div>
                      {mode === "enhet" ? (
                        <div className="mt-1 text-sm">
                          <span className="opacity-80">Orgform:</span> {item.organisasjonsform?.kode ?? "-"}
                          {item.status && (<><span className="opacity-80"> • Status:</span> {item.status}</>)}
                          {item.forretningsadresse?.poststed && (
                            <><span className="opacity-80"> • Poststed:</span> {item.forretningsadresse.poststed}</>
                          )}
                        </div>
                      ) : (
                        <div className="mt-1 text-sm">
                          {item.icnpoKategori?.kode ? (
                            <>ICNPO: {item.icnpoKategori.kode} — {item.icnpoKategori.navn}</>
                          ) : (
                            <span className="opacity-70">(Ingen kategori)</span>
                          )}
                        </div>
                      )}
                    </div>
                    <a
                      href={`https://w2.brreg.no/enhet/sok/detalj.jsp?orgnr=${item.organisasjonsnummer}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border px-3 py-2 text-sm hover:shadow"
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
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0} className="rounded-xl border px-4 py-2 disabled:opacity-50">Forrige</button>
            <div className="text-sm opacity-80">Side {page + 1} av {Math.max(1, totalPages)}</div>
            <button onClick={() => setPage((p) => (page + 1 < totalPages ? p + 1 : p))} disabled={page + 1 >= totalPages} className="rounded-xl border px-4 py-2 disabled:opacity-50">Neste</button>
          </div>
        </>
      )}

      <footer className="mt-8 text-xs opacity-60">Kilde: Enhetsregisteret & Frivillighetsregisteret (NLOD).</footer>
    </div>
  );
}
