interface LabeledSelectProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly onChange: (value: T) => void;
}

/** Seletor nativo com rótulo visível e uma seta própria, na cor do tema. */
export function LabeledSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: LabeledSelectProps<T>) {
  return (
    <label className="flex items-center gap-2 font-semibold">
      {label}
      {/* Seta própria: a nativa fica colada na borda e não pode ser afastada. */}
      <span className="relative inline-flex items-center">
        <select
          value={value}
          className="focus-ring appearance-none rounded-sm border-2 border-muted bg-raised py-1 pr-10 pl-3 text-fg"
          onChange={(event) => onChange(event.target.value as T)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 12 8"
          className="pointer-events-none absolute right-3 h-2 w-3 text-fg"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m1 1.5 5 5 5-5" />
        </svg>
      </span>
    </label>
  );
}
