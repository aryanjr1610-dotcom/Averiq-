import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Atom } from "lucide-react";
import { Derivation } from "@/components/reader/ChapterReader";
import { Button } from "@/components/ui/Button";

export interface Formula {
  id: string;
  name: string;
  subject: string;
  latex: ReactNode;               // pre-rendered KaTeX node
  meaning: string;
  variables: { symbol: ReactNode; name: string; unit: string }[];
  derivation?: { summary: string; steps: ReactNode[] };
  example?: { prompt: string; solution: ReactNode };
  lessonHref?: string;
  visualHref?: string;
}

export function FormulaDetail({ f }: { f: Formula }) {
  return (
    <article className="mx-auto max-w-reading">
      <p className="t-overline mb-3 text-content-secondary">{f.subject}</p>
      <h1 className="t-page-title">{f.name}</h1>

      {/* The formula itself gets the most space on the page. */}
      <div className="my-7 overflow-x-auto rounded-xl border border-line bg-surface-immersive px-5 py-8 text-center">
        <div className="inline-block min-w-0 text-[1.35rem]">{f.latex}</div>
      </div>

      <p className="t-body-lg text-content-secondary">{f.meaning}</p>

      {/* Variables as a definition table — dense, scannable, no cards. */}
      <h2 className="t-section mt-10 border-b border-line-subtle pb-2.5">Variables</h2>
      <table className="mt-4 w-full border-collapse text-left">
        <thead>
          <tr className="t-overline text-content-tertiary">
            <th scope="col" className="pb-2 pr-4 font-semibold">Symbol</th>
            <th scope="col" className="pb-2 pr-4 font-semibold">Quantity</th>
            <th scope="col" className="pb-2 font-semibold">SI unit</th>
          </tr>
        </thead>
        <tbody>
          {f.variables.map((v, i) => (
            <tr key={i} className="border-t border-line-subtle">
              <td className="w-16 py-2.5 pr-4 font-mono text-[0.95rem]">{v.symbol}</td>
              <td className="py-2.5 pr-4 t-body-sm">{v.name}</td>
              <td className="py-2.5 t-body-sm num text-content-secondary">{v.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {f.derivation && (
        <>
          <h2 className="t-section mt-10 border-b border-line-subtle pb-2.5">Derivation</h2>
          <Derivation summary={f.derivation.summary} steps={f.derivation.steps} />
        </>
      )}

      {f.example && (
        <>
          <h2 className="t-section mt-10 border-b border-line-subtle pb-2.5">Worked example</h2>
          <p className="t-body mt-4 text-content-secondary">{f.example.prompt}</p>
          <div className="mt-4 rounded-md border-l-2 border-subject/60 bg-subject/5 p-4 t-body">
            {f.example.solution}
          </div>
        </>
      )}

      <div className="mt-12 flex flex-wrap gap-2 border-t border-line-subtle pt-6">
        {f.lessonHref && (
          <Button variant="secondary" size="md" icon={<BookOpen />}>
            <Link to={f.lessonHref}>Open lesson</Link>
          </Button>
        )}
        {f.visualHref && (
          <Button variant="subject" size="md" icon={<Atom />}>
            <Link to={f.visualHref}>Visualize</Link>
          </Button>
        )}
      </div>
    </article>
  );
}
