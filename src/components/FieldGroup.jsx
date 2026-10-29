// A labelled group of form fields (two columns on wider screens), used by the requirements forms.
export default function FieldGroup({ title, children }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--nebula-3)' }}>{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}
