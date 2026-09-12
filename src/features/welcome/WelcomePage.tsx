import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Brand } from '@/components/brand/Brand';

export default function WelcomePage() {
  useEffect(() => {
    document.title = 'Learn beyond the page | Averiq';
  }, []);

  return (
    <section className="welcome-layout" aria-labelledby="welcome-title">
      <div className="welcome-copy">
        <Brand />

        <h1 id="welcome-title" className="type-hero">
          Learn beyond
          <br />
          the page.
        </h1>

        <p className="welcome-description">
          Understand concepts.
          <br />
          See them come alive.
          <br />
          Prepare smarter.
        </p>

        <div className="welcome-actions">
          <Link className="button button--primary button--lg" to="/signup">
            Get started
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
          </Link>

          <Link className="button button--outline button--lg" to="/login">
            Sign in
          </Link>
        </div>

        <p className="type-caption">
          Classes 6–12 · CBSE · CISCE
        </p>
      </div>

      <div className="welcome-art" aria-hidden="true">
        <svg viewBox="0 0 520 520" fill="none">
          <circle cx="260" cy="260" r="170" />
          <ellipse
            cx="260"
            cy="260"
            rx="210"
            ry="72"
            transform="rotate(-28 260 260)"
          />
          <path d="M70 360c75 0 105-200 185-200s110 240 200 80" />
          <path d="M95 415h340M125 100v320" />
          <circle cx="172" cy="190" r="7" />
          <circle cx="392" cy="284" r="6" />
          <circle cx="260" cy="260" r="11" />
        </svg>
      </div>
    </section>
  );
}
