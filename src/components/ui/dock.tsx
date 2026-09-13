'use client';

import {
  AnimatePresence,
  motion,
  type MotionValue,
  type SpringOptions,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

const BASE_ITEM_SIZE = 40;
const DEFAULT_MAGNIFICATION = 76;
const DEFAULT_DISTANCE = 140;
const DEFAULT_PANEL_SIZE = 60;

type DockOrientation = 'horizontal' | 'vertical';

type DockProps = {
  children: ReactNode;
  className?: string;
  distance?: number;
  panelSize?: number;
  magnification?: number;
  spring?: SpringOptions;
  orientation?: DockOrientation;
  'aria-label'?: string;
};

type DockItemProps = {
  className?: string;
  children: ReactNode;
};

type DockLabelProps = {
  className?: string;
  children: ReactNode;
};

type DockIconProps = {
  className?: string;
  children: ReactNode;
};

type DockContextValue = {
  pointerPosition: MotionValue<number>;
  spring: SpringOptions;
  magnification: number;
  distance: number;
  orientation: DockOrientation;
  reducedMotion: boolean;
};

type DockItemContextValue = {
  itemSize: MotionValue<number>;
  isHovered: MotionValue<number>;
};

const DockContext = createContext<DockContextValue | null>(null);
const DockItemContext = createContext<DockItemContextValue | null>(null);

function useDock() {
  const context = useContext(DockContext);
  if (!context) throw new Error('useDock must be used within Dock');
  return context;
}

function useDockItem() {
  const context = useContext(DockItemContext);
  if (!context) throw new Error('DockLabel and DockIcon must be used within DockItem');
  return context;
}

function Dock({
  children,
  className,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  panelSize = DEFAULT_PANEL_SIZE,
  orientation = 'horizontal',
  'aria-label': ariaLabel = 'Application dock',
}: DockProps) {
  const pointerPosition = useMotionValue(Number.POSITIVE_INFINITY);
  const isHovered = useMotionValue(0);
  const shouldReduceMotion = Boolean(useReducedMotion());

  const maxCrossSize = useMemo(
    () => Math.max(panelSize, magnification + Math.round(magnification / 2)),
    [magnification, panelSize],
  );

  const crossTarget = useTransform(
    isHovered,
    [0, 1],
    [panelSize, shouldReduceMotion ? panelSize : maxCrossSize],
  );
  const crossSize = useSpring(crossTarget, spring);

  const outerStyle = orientation === 'horizontal'
    ? { height: crossSize }
    : { width: crossSize };

  const panelStyle = orientation === 'horizontal'
    ? { height: panelSize }
    : { width: panelSize };

  return (
    <motion.div
      className={cn(
        'flex max-w-full overflow-visible',
        orientation === 'horizontal' ? 'items-end' : 'justify-end',
      )}
      style={outerStyle}
    >
      <motion.div
        onPointerMove={(event) => {
          if (event.pointerType === 'touch') return;
          isHovered.set(1);
          pointerPosition.set(orientation === 'horizontal' ? event.pageX : event.pageY);
        }}
        onPointerLeave={() => {
          isHovered.set(0);
          pointerPosition.set(Number.POSITIVE_INFINITY);
        }}
        className={cn(
          'relative mx-auto flex w-fit rounded-2xl border border-edge-subtle bg-surface-3/80 p-2 shadow-3 backdrop-blur-xl',
          orientation === 'horizontal' ? 'flex-row items-center gap-2' : 'flex-col items-center gap-2',
          className,
        )}
        style={panelStyle}
        role="toolbar"
        aria-label={ariaLabel}
      >
        <DockContext.Provider
          value={{
            pointerPosition,
            spring,
            magnification,
            distance,
            orientation,
            reducedMotion: shouldReduceMotion,
          }}
        >
          {children}
        </DockContext.Provider>
      </motion.div>
    </motion.div>
  );
}

function DockItem({ children, className }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { distance, magnification, pointerPosition, spring, orientation, reducedMotion } = useDock();
  const isHovered = useMotionValue(0);

  const pointerDistance = useTransform(pointerPosition, (value) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds || !Number.isFinite(value)) return Number.POSITIVE_INFINITY;
    const center = orientation === 'horizontal'
      ? bounds.x + bounds.width / 2
      : bounds.y + bounds.height / 2;
    return value - center;
  });

  const targetSize = reducedMotion ? BASE_ITEM_SIZE : magnification;
  const sizeTarget = useTransform(
    pointerDistance,
    [-distance, 0, distance],
    [BASE_ITEM_SIZE, targetSize, BASE_ITEM_SIZE],
  );
  const itemSize = useSpring(sizeTarget, spring);

  return (
    <DockItemContext.Provider value={{ itemSize, isHovered }}>
      <motion.div
        ref={ref}
        style={{ width: itemSize, height: itemSize }}
        onHoverStart={() => isHovered.set(1)}
        onHoverEnd={() => isHovered.set(0)}
        onFocusCapture={() => isHovered.set(1)}
        onBlurCapture={() => isHovered.set(0)}
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center rounded-2xl',
          className,
        )}
      >
        {children}
      </motion.div>
    </DockItemContext.Provider>
  );
}

function DockLabel({ children, className }: DockLabelProps) {
  const { orientation } = useDock();
  const { isHovered } = useDockItem();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => isHovered.on('change', (latest) => setIsVisible(latest === 1)), [isHovered]);

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.16 }}
          className={cn(
            'pointer-events-none absolute z-50 w-max whitespace-nowrap rounded-lg border border-edge-subtle bg-surface-3 px-2 py-1 text-caption font-medium text-ink shadow-3 backdrop-blur-xl',
            orientation === 'horizontal'
              ? 'bottom-full left-1/2 mb-3 -translate-x-1/2'
              : 'left-full top-1/2 ml-3 -translate-y-1/2',
            className,
          )}
          role="tooltip"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DockIcon({ children, className }: DockIconProps) {
  const { itemSize } = useDockItem();
  const iconSize = useTransform(itemSize, (value) => value * 0.48);

  return (
    <motion.div
      style={{ width: iconSize, height: iconSize }}
      className={cn('flex items-center justify-center', className)}
    >
      {children}
    </motion.div>
  );
}

export { Dock, DockIcon, DockItem, DockLabel };
