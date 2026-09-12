import * as React from 'react';
import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router-dom';

export interface LinkProps extends Omit<RouterLinkProps, 'to'> {
  href?: string;
  to?: string;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, to, ...props },
  ref,
) {
  const target = to ?? href ?? '';
  return <RouterLink ref={ref} to={target} {...props} />;
});

export default Link;
