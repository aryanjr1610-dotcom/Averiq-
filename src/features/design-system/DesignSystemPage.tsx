import * as React from 'react';
import { useEffect, useState } from 'react';

import {
  ArrowRight,
  Bookmark,
  Check,
  Copy,
  Info,
  Layers,
  MoreHorizontal,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react';

import { Button, IconButton } from '@/components/ui/Button';
import {
  Input,
  Select,
  Textarea,
  Checkbox,
  Radio,
  Switch,
} from '@/components/ui/Input';
import { Surface, Card } from '@/components/ui/Surface';
import { ProgressBar } from '@/components/progress/MasteryBar';
import { Dialog } from '@/components/ui/Dialog';
import { Sheet } from '@/components/ui/Sheet';
import {
  EmptyState,
  ErrorState,
  PageSkeleton,
} from '@/components/system/States';
import { useToast } from '@/components/system/toast';
import { PageHeader } from '@/components/system/PageHeader';
import { cn } from '@/lib/cn';

function Icon({
  icon: Component,
  size = 'md',
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean }>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}) {
  const s = size === 'xs' ? 14 : size === 'sm' ? 16 : size === 'lg' ? 24 : size === 'xl' ? 32 : 20;
  return <Component size={s} strokeWidth={1.75} aria-hidden />;
}

function Tag({
  variant = 'neutral',
  className,
  children,
}: {
  variant?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-xs border px-2 py-0.5 text-caption font-medium',
        variant === 'accent' && 'border-accent/30 bg-accent-quiet text-accent',
        variant === 'success' && 'border-success/30 bg-success-quiet text-success',
        variant === 'warning' && 'border-warning/30 bg-warning-quiet text-warning',
        variant === 'danger' && 'border-danger/30 bg-danger-quiet text-danger',
        (!variant || variant === 'neutral') && 'border-edge bg-surface-2 text-ink-secondary',
        className,
      )}
    >
      {children}
    </span>
  );
}

function Avatar({
  name,
  size = 'md',
  status,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'busy';
}) {
  const sz =
    size === 'sm'
      ? 'h-7 w-7 text-caption'
      : size === 'lg'
        ? 'h-11 w-11 text-body'
        : 'h-9 w-9 text-body-sm';
  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center rounded-full bg-surface-3 font-medium text-ink',
        sz,
      )}
    >
      {name.slice(0, 2).toUpperCase()}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 h-2 w-2 rounded-full ring-2 ring-surface-1',
            status === 'online' ? 'bg-success' : status === 'busy' ? 'bg-danger' : 'bg-ink-tertiary',
          )}
        />
      )}
    </span>
  );
}

function CircularProgress({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-body font-semibold text-accent">{value}%</span>
      <span className="text-caption text-ink-secondary">{label}</span>
    </div>
  );
}

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return <span title={label}>{children}</span>;
}

function Popover({ trigger, children }: { label?: string; trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className="absolute top-full mt-2 z-50 rounded-lg border border-edge bg-surface-3 p-4 shadow-3">
          {children}
        </div>
      )}
    </div>
  );
}

type MenuItem = {
  id?: string;
  label?: string;
  icon?: React.ReactNode | React.ElementType;
  disabled?: boolean;
  separator?: boolean;
  onSelect?: () => void;
};

function DropdownMenu({ trigger, items }: { label?: string; trigger: React.ReactNode; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className="absolute top-full mt-2 z-50 rounded-lg border border-edge bg-surface-3 p-2 shadow-3 min-w-[160px]">
          {items.map((it, i) =>
            it.separator ? (
              <hr key={i} className="my-1 border-edge" />
            ) : (
              <button
                key={it.id || i}
                disabled={it.disabled}
                onClick={() => {
                  it.onSelect?.();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-body-sm text-ink hover:bg-surface-2 disabled:opacity-40"
              >
                {it.icon && (
                  <span className="shrink-0 text-ink-tertiary">
                    {React.isValidElement(it.icon)
                      ? it.icon
                      : React.createElement(it.icon as React.ComponentType<{ size?: number; strokeWidth?: number }>, { size: 16, strokeWidth: 1.75 })}
                  </span>
                )}
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Divider({ vertical = false }: { vertical?: boolean }) {
  return <hr className={cn(vertical ? 'mx-2 h-6 w-px bg-edge' : 'my-4 h-px w-full bg-edge')} />;
}

function Section({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      {eyebrow && <p className="text-overline mb-1">{eyebrow}</p>}
      <h2 className="text-section-title mb-1">{title}</h2>
      {description && <p className="text-body-sm text-ink-secondary mb-4">{description}</p>}
      {children}
    </section>
  );
}

function StudyContextIndicator({ items }: { items: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-2 text-label text-ink-secondary">
      {items.map((it, i) => (
        <span key={i} className="rounded-xs border border-edge-subtle bg-surface-2 px-2.5 py-1">
          {it}
        </span>
      ))}
    </div>
  );
}

function ReadingContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <article className={cn('prose max-w-reading text-ink', className)}>{children}</article>;
}

function FeatureCard({
  title,
  description,
  icon,
  variant,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  variant?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-edge bg-surface-1 p-5', variant === 'accent' && 'border-accent/30')}>
      {icon && <div className="mb-3 text-accent">{icon}</div>}
      <h3 className="text-card-title">{title}</h3>
      <p className="mt-1 text-body-sm text-ink-secondary">{description}</p>
    </div>
  );
}

function InteractiveCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-edge bg-surface-1 p-5 text-left transition-colors hover:border-edge-strong"
    >
      {icon && <div className="mb-3 text-accent">{icon}</div>}
      <h3 className="text-card-title">{title}</h3>
      <p className="mt-1 text-body-sm text-ink-secondary">{description}</p>
    </button>
  );
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string; [key: string]: unknown }) {
  return <div className={className}>{children}</div>;
}
function SharedLayout({ children }: { children: React.ReactNode; [key: string]: unknown }) {
  return <div>{children}</div>;
}
function SharedElement({ children, className }: { children: React.ReactNode; className?: string; [key: string]: unknown }) {
  return <div className={className}>{children}</div>;
}
function Stagger({ children, className }: { children: React.ReactNode; className?: string; [key: string]: unknown }) {
  return <div className={className}>{children}</div>;
}
function SuccessFeedback({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-body-sm font-medium text-success">
      <Check size={16} strokeWidth={1.75} aria-hidden />
      {children}
    </span>
  );
}

import { Brand } from '@/components/brand/Brand';

import {
  contextForPreset,
  subjectVisuals,
} from '@/app/config/academic-themes';

import { useAcademicTheme } from '@/app/providers/AcademicThemeProvider';

import type {
  AcademicPage,
  AcademicPreset,
  VisualPreferences,
} from '@/types/academic-theme';

import './showcase.css';

const themeOptions: Array<{
  value: string;
  label: string;
}> = [
  { value: 'balanced', label: 'Balanced · Classes 6–10' },
  { value: 'pcm', label: 'PCM' },
  { value: 'pcb', label: 'PCB' },
  { value: 'pcmb', label: 'PCMB' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'humanities', label: 'Humanities' },
  { value: 'subject:physics', label: 'Physics' },
  { value: 'subject:mathematics', label: 'Mathematics' },
  { value: 'subject:biology', label: 'Biology' },
];

const surfaceTokens = [
  '--background',
  '--surface-1',
  '--surface-2',
  '--surface-3',
  '--accent',
  '--academic-a',
] as const;

export default function DesignSystemPage() {
  const { notify } = useToast();

  const {
    context,
    setContext,
    preferences,
    updatePreferences,
    theme,
    reducedMotion,
  } = useAcademicTheme();

  const [preview, setPreview] = useState('balanced');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSide, setSheetSide] =
    useState<'left' | 'right' | 'bottom'>('right');

  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState('comfortable');
  const [selected, setSelected] = useState(false);
  const [motionKey, setMotionKey] = useState(0);
  const [successKey, setSuccessKey] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    document.title = 'Design system | Averiq';

    return () => {
      setContext({
        grade: 10,
        group: 'balanced',
        page: 'default',
      });
    };
  }, [setContext]);

  function chooseTheme(value: string) {
    setPreview(value);

    if (value.startsWith('subject:')) {
      const subjectId = value.slice('subject:'.length);
      const visual = subjectVisuals[subjectId];

      setContext({
        ...contextForPreset(visual?.backgroundPreset ?? 'balanced'),
        subjectId,
      });

      return;
    }

    setContext(contextForPreset(value as AcademicPreset));
  }

  return (
    <div className="design-showcase">
      <PageHeader
        eyebrow="Internal studio · Development only"
        title="A quieter kind of clarity."
        description="Averiq’s shared visual language. These are component demonstrations—not product screens."
        metadata={
          <StudyContextIndicator
            items={['Design system', 'Academic atmosphere', 'Motion']}
          />
        }
        actions={<Tag variant="accent">Phase 2</Tag>}
      />

      <Section
        eyebrow="01 / Atmosphere"
        title="Academic context, one identity"
        description="Typography and controls stay consistent. Context changes the peripheral motifs and ambient tone."
      >
        <Surface variant="hero" padding="lg">
          <div className="showcase-stack">
            <div className="showcase-grid">
              <Select
                label="Academic preview"
                value={preview}
                onChange={(event) => chooseTheme(event.target.value)}
              >
                {themeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <Select
                label="Page context"
                value={context.page ?? 'default'}
                onChange={(event) => {
                  setContext((current) => ({
                    ...current,
                    page: event.target.value as AcademicPage,
                  }));
                }}
              >
                <option value="default">Default</option>
                <option value="reading">Reading</option>
                <option value="focus">Focus</option>
                <option value="visual-lab">Visual Lab foundation</option>
                <option value="anatomy">Anatomy foundation</option>
                <option value="exam">Competitive practice context</option>
              </Select>

              <Select
                label="Appearance"
                value={preferences.mode}
                onChange={(event) => {
                  updatePreferences({
                    mode: event.target.value as VisualPreferences['mode'],
                  });
                }}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </Select>

              <Select
                label="Decoration"
                value={preferences.decoration}
                onChange={(event) => {
                  updatePreferences({
                    decoration:
                      event.target.value as VisualPreferences['decoration'],
                  });
                }}
              >
                <option value="standard">Standard</option>
                <option value="minimal">Minimal</option>
                <option value="off">Off</option>
              </Select>
            </div>

            <div className="showcase-row">
              <Switch
                label="Ambient motion"
                checked={preferences.ambientMotion}
                disabled={reducedMotion}
                onChange={(event) => {
                  updatePreferences({
                    ambientMotion: event.target.checked,
                  });
                }}
              />

              <Switch
                label="Pointer response"
                checked={preferences.pointerResponse}
                disabled={reducedMotion}
                onChange={(event) => {
                  updatePreferences({
                    pointerResponse: event.target.checked,
                  });
                }}
              />

              <Switch
                label="Reduced-motion simulation"
                checked={preferences.motion === 'reduce'}
                onChange={(event) => {
                  updatePreferences({
                    motion: event.target.checked ? 'reduce' : 'system',
                  });
                }}
              />

              <Switch
                label="High contrast"
                checked={preferences.contrast === 'high'}
                onChange={(event) => {
                  updatePreferences({
                    contrast: event.target.checked ? 'high' : 'system',
                  });
                }}
              />
            </div>

            <div className="showcase-theme-summary">
              <p className="type-label">
                Active motifs: {theme.motifs.join(' · ')}
              </p>

              <p className="type-caption">
                Intensity: {theme.intensity}.
                {' '}
                {reducedMotion
                  ? 'Reduced motion is active.'
                  : 'Ambient motion is optional and paused when the page is hidden.'}
              </p>
            </div>
          </div>
        </Surface>
      </Section>

      <Section title="Typography" eyebrow="02 / Hierarchy">
        <div className="showcase-stack">
          <p className="type-display">Understand deeply.</p>
          <p className="type-hero">Make room for thought.</p>
          <p className="type-title">Page title</p>
          <p className="type-section">Section title</p>
          <p className="type-card">Card title</p>
          <p className="type-body-lg">Body large for introductions and reading.</p>
          <p className="type-body">Body text for everyday interface content.</p>
          <p className="type-body-sm">Small body text for supporting detail.</p>
          <p className="type-label">Label and control text</p>
          <p className="type-caption">Caption and supplementary information</p>
          <p className="type-overline">Academic context</p>
          <p className="type-number">24.08</p>
        </div>
      </Section>

      <Section title="Palette and surfaces" eyebrow="03 / Depth">
        <div className="showcase-grid showcase-grid--three">
          {surfaceTokens.map((token) => (
            <div key={token} className="showcase-token">
              <div
                className="showcase-token__sample"
                style={{ background: `var(${token})` }}
              />
              <code className="type-caption">{token}</code>
            </div>
          ))}
        </div>

        <div className="showcase-grid">
          <Card
            title="Solid surface"
            description="The default. Opaque, quiet and easy to read."
          />

          <Card
            variant="elevated"
            title="Elevated surface"
            description="Tonal separation instead of a large shadow."
          />

          <Card
            variant="glass"
            title="Restricted glass"
            description="Reserved for floating controls and temporary overlays."
          />

          <FeatureCard
            variant="learning"
            title="Learning surface"
            description="A calmer composition for sustained attention."
            icon={<Icon icon={Layers} size="lg" />}
          />
        </div>
      </Section>

      <Section title="Actions and controls" eyebrow="04 / Interaction">
        <div className="showcase-row">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="quiet">Quiet</Button>
          <Button variant="danger">Danger</Button>
        </div>

        <div className="showcase-row">
          <Button size="sm">Small</Button>
          <Button size="lg">
            Continue
            <Icon icon={ArrowRight} size="sm" />
          </Button>

          <Button loading>Saving</Button>
          <Button disabled>Unavailable</Button>

          <Tooltip label="Save this example">
            <IconButton
              icon={Bookmark}
              aria-label="Save this example"
              selected={selected}
              onClick={() => setSelected((current) => !current)}
            />
          </Tooltip>
        </div>

        <div className="showcase-grid">
          <Input
            label="Search example"
            placeholder="Search within a subject"
            leadingIcon={<Icon icon={Search} size="sm" />}
            description="A decorative leading icon with a real text label."
          />

          <Input
            label="Validated value"
            defaultValue="Averiq"
            success="This value is available."
            trailingIcon={<Icon icon={Check} size="sm" />}
          />

          <Input
            label="Error example"
            defaultValue="Incomplete entry"
            error="Add the missing information."
          />

          <Input
            label="Read-only example"
            value="Managed by your school"
            readOnly
          />

          <Input
            label="Disabled example"
            placeholder="Not available"
            disabled
          />

          <Textarea
            label="Text area"
            placeholder="A short reflection..."
            description="This is a primitive demonstration, not the Notes feature."
          />
        </div>

        <div className="showcase-row">
          <Checkbox
            label="Example preference"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />

          <Switch
            label="Low-stimulation mode"
            checked={preferences.focusMode}
            onChange={(event) => {
              updatePreferences({ focusMode: event.target.checked });
            }}
          />
        </div>

        <fieldset className="showcase-radio-group">
          <legend className="type-label">Information density example</legend>

          <Radio
            name="density-example"
            value="comfortable"
            label="Comfortable"
            checked={radio === 'comfortable'}
            onChange={() => setRadio('comfortable')}
          />

          <Radio
            name="density-example"
            value="compact"
            label="Compact"
            checked={radio === 'compact'}
            onChange={() => setRadio('compact')}
          />
        </fieldset>
      </Section>

      <Section title="Context and progress" eyebrow="05 / Meaning">
        <div className="showcase-row">
          <Tag>CBSE</Tag>
          <Tag>Class 12</Tag>
          <Tag variant="accent">Physics</Tag>
          <Tag variant="success">Completed</Tag>
          <Tag variant="warning">Needs review</Tag>

          <Avatar name="Averiq Student" size="sm" />
          <Avatar name="Averiq Student" status="online" />
          <Avatar name="Averiq Student" size="lg" />
        </div>

        <div className="showcase-grid">
          <Surface>
            <ProgressBar label="Example progress" value={64} />
          </Surface>

          <Surface>
            <CircularProgress label="Example mastery" value={72} />
          </Surface>
        </div>

        <StudyContextIndicator items={['CBSE', 'Class 12', 'PCM']} />
      </Section>

      <Section title="Overlays" eyebrow="06 / Focus management">
        <div className="showcase-row">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>

          <Button variant="outline" onClick={() => setSheetOpen(true)}>
            Open sheet
          </Button>

          <Popover
            label="Example contextual information"
            trigger={<Button variant="outline">Open popover</Button>}
          >
            <div className="showcase-stack">
              <p className="type-label">Context without interruption</p>
              <p className="text-secondary">
                Escape or an outside interaction closes this popover.
              </p>
              <Button size="sm" onClick={() => notify('Example action.', 'info')}>
                Example action
              </Button>
            </div>
          </Popover>

          <DropdownMenu
            label="Example actions"
            trigger={
              <IconButton
                icon={MoreHorizontal}
                aria-label="Open example actions"
              />
            }
            items={[
              {
                id: 'copy',
                label: 'Copy example',
                icon: Copy,
                onSelect: () => notify('Example selected.', 'info'),
              },
              {
                id: 'separator',
                separator: true,
              },
              {
                id: 'settings',
                label: 'Unavailable action',
                icon: Settings,
                disabled: true,
                onSelect: () => {},
              },
            ]}
          />
        </div>

        <Select
          label="Sheet position"
          value={sheetSide}
          onChange={(event) => {
            setSheetSide(event.target.value as typeof sheetSide);
          }}
        >
          <option value="right">Right</option>
          <option value="left">Left</option>
          <option value="bottom">Bottom</option>
        </Select>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="A focused decision"
          description="An accessible dialog primitive with focus containment, Escape dismissal and focus restoration."
          footer={
            <>
              <Button variant="quiet" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>
                Done
              </Button>
            </>
          }
        >
          <Input label="Example input inside a dialog" autoFocus />
        </Dialog>

        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="A contextual panel"
          description="This is the sheet foundation, not navigation or an AI panel."
        >
          <div className="showcase-stack">
            <p className="text-secondary">
              Sheet content scrolls independently. Focus stays inside while open.
            </p>
            <Button onClick={() => setSheetOpen(false)}>Close panel</Button>
          </div>
        </Sheet>
      </Section>

      <Section title="Loading and recovery" eyebrow="07 / Resilience">
        <div className="showcase-grid">
          <Surface>
            <PageSkeleton />
          </Surface>

          <EmptyState
            heading="h3"
            icon={<Icon icon={Info} size="lg" />}
            title="No examples saved."
            description="A calm empty state explains the next useful action."
            action={<Button variant="secondary">Example action</Button>}
          />

          <ErrorState
            heading="h3"
            message="Check your connection, then try again."
            retry={() => notify('Retry demonstration.', 'info')}
            secondaryAction={<Button variant="quiet">Dismiss example</Button>}
          />

          <Surface>
            <div className="showcase-stack">
              <p className="type-card">Notification severity</p>

              <div className="showcase-row">
                <Button
                  variant="outline"
                  onClick={() => notify('Example saved.', 'success')}
                >
                  Success
                </Button>

                <Button
                  variant="outline"
                  onClick={() => notify('There is more information available.', 'info')}
                >
                  Information
                </Button>

                <Button
                  variant="outline"
                  onClick={() => notify('Please review this example.', 'warning')}
                >
                  Warning
                </Button>

                <Button
                  variant="outline"
                  onClick={() => notify('The example could not be saved.', 'error')}
                >
                  Error
                </Button>
              </div>
            </div>
          </Surface>
        </div>
      </Section>

      <Section title="Motion lab" eyebrow="08 / Restraint">
        <div className="showcase-row">
          <Button
            variant="secondary"
            onClick={() => setMotionKey((current) => current + 1)}
          >
            Replay reveal
          </Button>

          <Button
            variant="outline"
            onClick={() => setSuccessKey((current) => current + 1)}
          >
            Milestone feedback
          </Button>

          <Button
            variant="quiet"
            onClick={() => setExpanded((current) => !current)}
          >
            Toggle shared expansion
          </Button>
        </div>

        <div className="showcase-motion-stage">
          <SuccessFeedback key={successKey}>
            Meaningful milestone complete
          </SuccessFeedback>
        </div>

        <Reveal key={`reveal-${motionKey}`}>
          <Surface variant="soft">
            A short opacity and eight-pixel reveal.
          </Surface>
        </Reveal>

        <Stagger
          key={`stagger-${motionKey}`}
          className="showcase-grid showcase-grid--three"
        >
          <InteractiveCard
            title="One"
            description="A small, bounded stagger."
            icon={<Icon icon={Layers} />}
          />

          <InteractiveCard
            title="Two"
            description="Hover lifts by two pixels."
            icon={<Icon icon={Sparkles} />}
          />

          <InteractiveCard
            title="Three"
            description="Press feedback stays subtle."
            icon={<Icon icon={ArrowRight} />}
          />
        </Stagger>

        <SharedLayout id="development-expansion">
          <SharedElement id="expansion-example">
            <Surface variant="soft">
              <div className="showcase-stack">
                <p className="type-card">Shared-layout foundation</p>

                {expanded && (
                  <p className="text-secondary">
                    This is a contained expansion demonstration. Future cards
                    and destination screens may share layout identifiers within
                    a deliberate transition boundary.
                  </p>
                )}
              </div>
            </Surface>
          </SharedElement>
        </SharedLayout>
      </Section>

      <Section title="Reading rhythm" eyebrow="09 / Academic typography">
        <Surface variant="learning" padding="lg">
          <ReadingContent className="showcase-reading">
            <h3>Space to follow an idea</h3>

            <p>
              Reading surfaces use a controlled line length, generous leading
              and predictable spacing. The surrounding atmosphere becomes
              quieter rather than competing with the text.
            </p>

            <p>
              This paragraph demonstrates typography only. It is not a lesson,
              a curriculum entry or a production reader.
            </p>

            <blockquote>
              Emphasis should clarify a concept—not interrupt concentration.
            </blockquote>

            <div className="reading-equation">
              <code>Equation container · horizontal overflow stays local</code>
            </div>

            <ul>
              <li>Keep the hierarchy clear.</li>
              <li>Separate equations and callouts deliberately.</li>
              <li>Keep long text within a comfortable reading measure.</li>
            </ul>
          </ReadingContent>
        </Surface>
      </Section>

      <Divider />

      <div className="showcase-row">
        <Brand variant="mark" />
        <Brand variant="wordmark" />
        <Brand />

        <p className="type-caption">
          Phase 3 must inherit this system—not replace it.
        </p>
      </div>
    </div>
  );
}
