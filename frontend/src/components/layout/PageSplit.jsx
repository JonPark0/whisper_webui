// Figma "Split": large page title on the left, work column on the right
// (stacked on narrow screens), as in the PALNARIUM list pages.
export const PageSplit = ({ title, description, aside, children }) => (
  <main className="px-6 lg:px-40 pt-10 lg:pt-[72px] pb-24 flex flex-col lg:flex-row gap-12 lg:gap-24">
    <div className="lg:w-[340px] shrink-0 flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
      <h1 className="font-display text-[40px] leading-[48px] lg:text-display font-light text-ink">{title}</h1>
      {description && <p className="font-sans text-body text-ink-2">{description}</p>}
      {aside && <div className="pt-6 flex flex-col gap-1.5 font-display text-caption font-light text-ink-2">{aside}</div>}
    </div>
    <div className="flex-1 min-w-0 flex flex-col gap-14">{children}</div>
  </main>
);

export const Section = ({ title, actions, children, labelledBy }) => {
  const id = labelledBy || `section-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <div className="flex items-end gap-6">
        <h2 id={id} className="flex-1 font-display text-heading font-light text-ink">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
};
