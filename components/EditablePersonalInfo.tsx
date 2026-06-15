'use client';

import { useState } from 'react';
import Icon from './Icon';
import { TextField, SelectField } from './Field';
import type { Gender, Golfer } from '@/lib/types';

const GENDERS: readonly Gender[] = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const COUNTRIES = [
  'United Kingdom', 'Ireland', 'United States', 'Canada', 'Australia',
  'Germany', 'France', 'Spain', 'Sweden', 'Japan', 'South Korea',
] as const;

export default function EditablePersonalInfo({ initial }: { initial: Golfer }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    firstName: initial.firstName,
    lastName:  initial.lastName,
    email:     initial.email,
    birthday:  initial.birthday,
    gender:    initial.gender,
    country:   initial.country,
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
        <div className="type-eyebrow">Personal info</div>
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
          <Row label="Name"     value={`${saved.firstName} ${saved.lastName}`} />
          <Row label="Email"    value={saved.email} />
          <Row label="Birthday" value={formatBirthday(saved.birthday)} />
          <Row label="Gender"   value={saved.gender} />
          <Row label="Country"  value={saved.country} />
        </dl>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField id="firstName" label="First name" value={draft.firstName}
            onChange={(v) => setDraft({ ...draft, firstName: v })} autoComplete="given-name" />
          <TextField id="lastName" label="Last name" value={draft.lastName}
            onChange={(v) => setDraft({ ...draft, lastName: v })} autoComplete="family-name" />
          <div className="sm:col-span-2">
            <TextField id="email" label="Email" type="email" value={draft.email}
              onChange={(v) => setDraft({ ...draft, email: v })} autoComplete="email" />
          </div>
          <TextField id="birthday" label="Birthday" type="date" value={draft.birthday}
            onChange={(v) => setDraft({ ...draft, birthday: v })} />
          <SelectField id="gender" label="Gender" value={draft.gender}
            onChange={(v) => setDraft({ ...draft, gender: v as Gender })}
            options={GENDERS} />
          <div className="sm:col-span-2">
            <SelectField id="country" label="Country" value={draft.country as typeof COUNTRIES[number]}
              onChange={(v) => setDraft({ ...draft, country: v })}
              options={COUNTRIES} />
          </div>
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

function formatBirthday(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}
