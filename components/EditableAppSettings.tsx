'use client';

import { useState } from 'react';
import Icon from './Icon';
import { SelectField } from './Field';
import type { Golfer, UnitSystem } from '@/lib/types';

const UNIT_OPTIONS: readonly UnitSystem[] = ['Yards · mph', 'Metres · kph'];
const DEXTERITY_OPTIONS = ['Right Handed', 'Left Handed'] as const;
const HANDICAP_BANDS = [
  '0-4', '5-9', '10-14', '15-19', '20.1+', 'No handicap',
] as const;

export default function EditableAppSettings({ initial }: { initial: Golfer }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    units:     initial.units,
    handicap:  initial.handicap,
    dexterity: initial.dexterity,
  });
  const [saved, setSaved] = useState(draft);

  function save() {
    setSaved(draft);
    setEditing(false);
  }
  function cancel() {
    setDraft(saved);
    setEditing(false);
  }

  return (
    <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6 flex flex-col">
      <div className="flex items-baseline justify-between mb-4">
        <div className="type-eyebrow">App settings</div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-rap-red hover:text-rap-red-hover transition-colors"
          >
            <Icon name="pencil" size={14} />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={cancel}
              className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-cta text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-rap-red text-white text-xs font-semibold uppercase tracking-cta hover:bg-rap-red-hover transition-colors"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <dl className="space-y-2.5">
          <Row label="Units"     value={saved.units} />
          <Row label="Handicap"  value={saved.handicap} />
          <Row label="Dexterity" value={saved.dexterity} />
        </dl>
      ) : (
        <div className="space-y-4">
          <SelectField id="units" label="Units" value={draft.units}
            onChange={(v) => setDraft({ ...draft, units: v as UnitSystem })}
            options={UNIT_OPTIONS} />
          <SelectField id="handicap" label="Handicap"
            value={draft.handicap as typeof HANDICAP_BANDS[number]}
            onChange={(v) => setDraft({ ...draft, handicap: v })}
            options={HANDICAP_BANDS} />
          <SelectField id="dexterity" label="Dexterity"
            value={draft.dexterity as typeof DEXTERITY_OPTIONS[number]}
            onChange={(v) => setDraft({ ...draft, dexterity: v as 'Right Handed' | 'Left Handed' })}
            options={DEXTERITY_OPTIONS} />
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <dt className="type-body-sm text-text-secondary">{label}</dt>
      <dd className="text-sm font-semibold text-text-primary text-right">{value}</dd>
    </div>
  );
}
