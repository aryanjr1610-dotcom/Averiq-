import { useEffect, useRef, useState } from 'react';
import katex from 'katex';

import 'katex/dist/katex.min.css';

export function MathText({
  latex,
  alternative,
  inline = false,
}: {
  latex: string;
  alternative: string;
  inline?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    try {
      katex.render(latex, ref.current, {
        displayMode: !inline,
        throwOnError: true,
        trust: false,
        strict: 'error',
        maxExpand: 200,
        maxSize: 20,
        output: 'htmlAndMathml',
      });

      setFailed(false);
    } catch {
      ref.current.textContent = '';
      setFailed(true);
    }
  }, [latex, inline]);

  return (
    <span
      className={inline ? 'math-inline' : 'math-display'}
      role="math"
      aria-label={alternative}
    >
      <span ref={ref} />
      {failed && (
        <span className="content-unavailable">
          This equation could not be displayed.
        </span>
      )}
    </span>
  );
}
