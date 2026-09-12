import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Brand } from '@/components/brand/Brand';
import { Surface } from '@/components/ui/Surface';

export function AuthFrame({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} | Averiq`;
  }, [title]);

  return (
    <div className="auth-layout">
      <Surface className="auth-surface" padding="lg">
        <div className="auth-stack">
          <Link className="brand-link" to="/welcome" aria-label="Averiq welcome">
            <Brand />
          </Link>

          <div className="auth-heading">
            <h1>{title}</h1>
            <p className="text-secondary">{description}</p>
          </div>

          {children}

          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </Surface>
    </div>
  );
}
