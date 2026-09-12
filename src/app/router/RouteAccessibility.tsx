import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteAccessibility() {
  const { pathname } = useLocation();

  useEffect(() => {
    document
      .getElementById('main-content')
      ?.focus({
        preventScroll: true,
      });

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }, [pathname]);

  const name =
    pathname === '/'
      ? 'Averiq home'
      : pathname
          .split('/')
          .filter(Boolean)
          .join(' / ');

  return (
    <span
      className="sr-only"
      role="status"
    >
      Page: {name}
    </span>
  );
}
