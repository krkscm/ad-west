import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import type { ContactData, ContactEditField, ContactSelectOption } from '../../constants/contactColumns';
import { backendApi, EnumValueApi } from '../../utils/backendApi';

interface ContactEditModalProps {
  isOpen: boolean;
  title?: string;
  fields: ContactEditField[];
  data: ContactData;
  isSaving: boolean;
  onClose: () => void;
  onSave: (data: ContactData) => void;
}

function useContactFieldEnums(fields: ContactEditField[]) {
  const enumTypes = useMemo(
    () => [...new Set(fields.map((field) => field.enumType).filter((value): value is string => Boolean(value)))],
    [fields],
  );
  const [enumMap, setEnumMap] = useState<Record<string, EnumValueApi[]>>({});

  useEffect(() => {
    if (!enumTypes.length) {
      setEnumMap({});
      return;
    }
    let cancelled = false;
    Promise.all(
      enumTypes.map(async (enumType) => {
        const values = await backendApi.listEnumValues(enumType).catch(() => []);
        return [enumType, values] as const;
      }),
    ).then((entries) => {
      if (!cancelled) {
        setEnumMap(Object.fromEntries(entries));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enumTypes.join('|')]);

  return enumMap;
}

function buildSelectOptions(
  field: ContactEditField,
  enumMap: Record<string, EnumValueApi[]>,
  currentValue: string,
): ContactSelectOption[] {
  const seen = new Set<string>();
  const options: ContactSelectOption[] = [];

  const add = (value: string, label: string) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    options.push({ value, label });
  };

  if (field.enumType) {
    for (const item of enumMap[field.enumType] ?? []) {
      add(item.value, item.label);
    }
  }

  for (const item of field.options ?? []) {
    add(item.value, item.label);
  }

  if (currentValue && !seen.has(currentValue)) {
    add(currentValue, currentValue);
  }

  return options;
}

export const ContactEditModal: React.FC<ContactEditModalProps> = ({
  isOpen,
  title = 'Edit Contact',
  fields,
  data,
  isSaving,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<ContactData>({});
  const enumMap = useContactFieldEnums(fields);

  useEffect(() => {
    if (!isOpen) return;
    const next: ContactData = {};
    for (const field of fields) {
      const value = data[field.key];
      next[field.key] = value == null ? '' : String(value);
    }
    setFormData(next);
  }, [isOpen, fields, data]);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ContactData = {};
    for (const field of fields) {
      const raw = formData[field.key];
      const trimmed = raw == null ? '' : String(raw).trim();
      payload[field.key] = trimmed === '' ? null : trimmed;
    }
    onSave(payload);
  };

  const renderField = (field: ContactEditField) => {
    const value = formData[field.key] == null ? '' : String(formData[field.key]);

    if (field.inputType === 'textarea') {
      return (
        <textarea
          className="form-input"
          rows={3}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => handleChange(field.key, e.target.value)}
          style={{ resize: 'vertical' }}
        />
      );
    }

    if (field.inputType === 'select') {
      const options = buildSelectOptions(field, enumMap, value);
      return (
        <select
          className="form-input"
          value={value}
          onChange={(e) => handleChange(field.key, e.target.value)}
          style={{ cursor: 'pointer' }}
        >
          <option value="">— Select —</option>
          {options.map((option) => (
            <option key={`${field.key}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        className="form-input"
        type={field.inputType === 'tel' ? 'tel' : 'text'}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => handleChange(field.key, e.target.value)}
      />
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="640px">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '14px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
          {fields.map((field) => (
            <div key={field.key}>
              <label className="form-label">{field.label}</label>
              {renderField(field)}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-dark)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
