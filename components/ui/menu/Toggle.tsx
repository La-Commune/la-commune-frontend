"use client";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 text-[10px] uppercase tracking-widest transition-colors duration-200 ${
        checked ? "text-stone-600 dark:text-stone-300" : "text-stone-400 dark:text-stone-600"
      }`}
    >
      <span
        className={`w-8 h-4 rounded-full border transition-all duration-300 flex items-center px-0.5 ${
          checked ? "bg-stone-600 dark:bg-stone-300 border-stone-600 dark:border-stone-300" : "bg-transparent border-stone-300 dark:border-stone-700"
        }`}
      >
        <span
          className={`w-3 h-3 rounded-full transition-transform duration-300 ${
            checked ? "translate-x-4 bg-white dark:bg-neutral-900" : "translate-x-0 bg-stone-300 dark:bg-stone-700"
          }`}
        />
      </span>
      {label}
    </button>
  );
}
