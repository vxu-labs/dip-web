"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseGlobalSkills } from "@/lib/global-skill-import.mjs";

type Item = Record<string, any>;
type Mode = "skills" | "knowledge";

export default function LibraryPanel({ mode, repos, selected, branch, request, imported, saveImported }: {
  mode: Mode; repos: Item[]; selected?: string; branch?: string;
  request: (args: Item) => Promise<Item>; imported: Item[]; saveImported: (items: Item[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [importError, setImportError] = useState("");
  const [limit, setLimit] = useState(60);
  const [refresh, setRefresh] = useState(0);
  const requestRef = useRef(request);
  requestRef.current = request;
  const project = filter || (mode === "knowledge" ? selected || repos[0]?.name || "" : "");
  const selectedRepos = useMemo(() => repos
    .filter((repo) => !project || repo.name === project)
    .map((repo) => ({ name: repo.name, branch: repo.name === selected ? branch || repo.branch : repo.branch })),
  [repos, project, selected, branch]);

  useEffect(() => {
    let alive = true;
    let next = 0;
    const loaded: Item[] = [];
    const failures: string[] = [];
    setResults([]);
    setErrors([]);
    setLoading(true);
    async function worker() {
      while (alive && next < selectedRepos.length) {
        const target = selectedRepos[next++];
        try {
          const result = await requestRef.current({ action: "library", repo: target.name, branch: target.branch });
          if (alive) loaded.push(result);
        } catch (error) {
          if (alive) failures.push(target.name + " · " + (error instanceof Error ? error.message : "Read failed"));
        }
      }
    }
    void Promise.all(Array.from({ length: Math.min(3, selectedRepos.length) }, worker)).then(() => {
      if (!alive) return;
      setResults(loaded.sort((a, b) => a.repo.localeCompare(b.repo)));
      setErrors(failures);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [selectedRepos, refresh]);

  const isSkills = mode === "skills";
  const entries = [
    ...(isSkills && !project ? imported.map((entry) => ({ ...entry, global: true })) : []),
    ...results.flatMap((result) => (isSkills ? result.skills : result.knowledge)
      .map((entry: Item) => ({ ...entry, repo: result.repo, branch: result.branch, commit: result.commit }))),
  ] as Item[];
  const filterText = query.trim().toLowerCase();
  const visible = entries.filter((entry) =>
    [entry.name, entry.title, entry.source, entry.repo, entry.host, entry.category, entry.activation]
      .some((field) => String(field || "").toLowerCase().includes(filterText)),
  );
  const notes = results.flatMap((result) => result.warnings.map((warning: string) => result.repo + " · " + warning));
  function sourceLink(entry: Item, source: string) {
    return "https://github.com/" + entry.repo + "/blob/" + entry.commit + "/" +
      source.split("/").map(encodeURIComponent).join("/");
  }

  return <section className="dip-library">
    <p className="eyebrow">{isSkills ? "SKILL LIBRARY" : "PROJECT KNOWLEDGE"}</p>
    <h1>{isSkills ? "Skills" : "Knowledge"}</h1>
    <p>{isSkills ? "Browse committed project skills and your imported global skill list." : "Browse indexed knowledge and native instructions in the selected source branch."}</p>
    <div className="dip-library-controls">
      <label>Search <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(60); }} placeholder={isSkills ? "Find a skill…" : "Find a source…"} /></label>
      <label>Project <select value={project} onChange={(e) => { setFilter(e.target.value); setLimit(60); }}>
        {isSkills && <option value="">All projects and global</option>}
        {!isSkills && !repos.length && <option value="">No connected projects</option>}
        {repos.map((repo) => <option value={repo.name} key={repo.name}>{repo.name}</option>)}
      </select></label>
      <button className="github-link" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>Refresh</button>
    </div>
    {isSkills && <div className="dip-library-import">
      <a className="github-link" href="/skill-migration-prompt.txt" target="_blank" rel="noreferrer">Skill migration prompt ↗</a>
      <label>Import global skill list <input type="file" accept=".json,application/json" onChange={async (event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (!file) return;
        try {
          if (file.size > 256 * 1024) throw Error("Skill export exceeds 256 KiB.");
          saveImported(parseGlobalSkills(JSON.parse(await file.text())));
          setImportError("");
        } catch (error) {
          setImportError(error instanceof Error ? error.message : "Invalid global skill list.");
        }
      }}/></label>
      {imported.length > 0 && <button className="github-link" onClick={() => saveImported([])}>Clear imported list</button>}
      <small>Export names and activation metadata from DIP Local. This import stays in this browser.</small>
      {importError && <p role="alert">{importError}</p>}
    </div>}
    {!!(errors.length || notes.length) && <details className="alert"><summary>Some sources need attention ({errors.length + notes.length})</summary>{[...errors, ...notes].map((message, index) => <p key={index}>{message}</p>)}</details>}
    <p role="status">{loading ? "Checking connected repositories…" : `${visible.length} ${isSkills ? "skills" : "sources"}`}</p>
    <div className="dip-library-grid">
      {visible.slice(0, limit).map((entry, index) => <article className="dip-library-card" key={JSON.stringify([entry.repo, entry.source, entry.id, entry.name, entry.host, index])}>
        <small>{entry.global ? "Global · Imported" : entry.repo + " · " + entry.branch}</small>
        <h2>{entry.name || entry.title}</h2>
        <p>{entry.host || entry.category} · {entry.activation || entry.currentness}</p>
        {entry.summary && <p>{entry.summary}</p>}
        {entry.source && <a href={sourceLink(entry, entry.source)} target="_blank" rel="noreferrer">{entry.source} ↗</a>}
        {entry.policy && <a href={sourceLink(entry, entry.policy)} target="_blank" rel="noreferrer">Activation policy ↗</a>}
        {(entry.scope || entry.scopes?.length > 0) && <small>Scope {entry.scope || entry.scopes.join(", ")}</small>}
      </article>)}
    </div>
    {visible.length > limit && <button className="github-link" onClick={() => setLimit((value) => value + 60)}>Show more</button>}
  </section>;
}
