import React, { useState } from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ onSearch, disabled }) => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('flight');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), type);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <select
        className="select"
        value={type}
        onChange={(e) => setType(e.target.value)}
        style={{ width: 170 }}
        aria-label="Search type"
        disabled={disabled}
      >
        <option value="flight">Flight number</option>
        <option value="airport">Airport code</option>
      </select>
      <input
        className="input input--code"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value.toUpperCase())}
        placeholder={type === 'flight' ? '6E754' : 'DEL'}
        style={{ flex: '1 1 200px' }}
        disabled={disabled}
        aria-label="Flight number or airport code"
      />
      <button type="submit" className="btn btn--primary" disabled={disabled}>
        <Search size={15} /> Search
      </button>
    </form>
  );
};

export default SearchBar;
