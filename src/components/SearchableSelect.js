import { useMemo, useState } from 'react';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const SearchableSelect = ({
  name,
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Selectionner',
  searchPlaceholder = 'Rechercher...',
  required = false,
  disabled = false,
  helper,
  className = '',
  emptyLabel = 'Aucun resultat',
}) => {
  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      return options;
    }
    return options.filter((option) => {
      const labelValue = normalizeText(option.label);
      const metaValue = normalizeText(option.meta);
      return labelValue.includes(normalizedQuery) || metaValue.includes(normalizedQuery);
    });
  }, [options, query]);

  return (
    <label className={`form-field ${className}`.trim()}>
      {label && <span>{label}</span>}
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        disabled={disabled}
      />
      <select name={name} value={value} onChange={onChange} required={required} disabled={disabled}>
        <option value="">{placeholder}</option>
        {filteredOptions.length ? (
          filteredOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        ) : (
          <option value="" disabled>
            {emptyLabel}
          </option>
        )}
      </select>
      {helper && <small className="muted">{helper}</small>}
    </label>
  );
};

export default SearchableSelect;