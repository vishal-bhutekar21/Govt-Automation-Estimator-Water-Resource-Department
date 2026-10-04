import React, { useEffect, useState } from 'react';

/** Normalize typed decimals: allow "1.", ".5", and Indian "1,97". */
export function sanitizeDecimalInput(raw: string, integer = false): string | null {
  let next = raw.replace(/,/g, '.');
  if (next === '') return '';
  if (integer) return /^\d+$/.test(next) ? next : null;
  if (!/^\d*\.?\d*$/.test(next)) return null;
  return next;
}

export function parseDecimal(raw: string): number | null {
  const cleaned = raw.trim().replace(/,/g, '.');
  if (cleaned === '' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Text input that keeps incomplete decimals (e.g. "1.") while focused,
 * so Number() coercion in parents cannot swallow the dot mid-typing.
 */
export function DecimalField(props: {
  label?: string;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  integer?: boolean;
  disabled?: boolean;
  hint?: string;
  className?: string;
  inputClassName?: string;
}) {
  const propText = props.value === null || props.value === undefined ? '' : String(props.value);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(propText);

  useEffect(() => {
    if (!focused) setDraft(propText);
  }, [propText, focused]);

  const commit = (raw: string) => {
    const next = sanitizeDecimalInput(raw, props.integer);
    if (next === null) return;
    setDraft(next);
    if (!props.integer && (next === '.' || next.endsWith('.'))) return;
    props.onChange(next);
  };

  return (
    <label className={props.className || 'block text-sm'}>
      {props.label && (
        <span className="font-semibold text-slate-700">
          {props.label}
          {props.suffix ? ` (${props.suffix})` : ''}
        </span>
      )}
      <input
        disabled={props.disabled}
        inputMode={props.integer ? 'numeric' : 'decimal'}
        className={props.inputClassName || 'mt-1 w-full border border-slate-200 rounded-gov-sm px-3 py-2'}
        value={focused ? draft : propText}
        placeholder={props.placeholder}
        onFocus={() => {
          setFocused(true);
          setDraft(propText);
        }}
        onBlur={() => {
          setFocused(false);
          const next = sanitizeDecimalInput(draft, props.integer);
          if (next === null) return;
          const committed = next.endsWith('.') ? next.slice(0, -1) : next;
          setDraft(committed);
          if (committed !== propText) props.onChange(committed);
        }}
        onChange={(e) => commit(e.target.value)}
      />
      {props.hint && <span className="text-xs text-slate-400">{props.hint}</span>}
    </label>
  );
}
