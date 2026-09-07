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
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', background: '#222', padding: '0.5rem', borderRadius: '8px' }}>
      <select 
        value={type} 
        onChange={(e) => setType(e.target.value)}
        style={{ background: '#333', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '4px', outline: 'none' }}
      >
        <option value="flight">Flight #</option>
        <option value="airport">Airport (IATA)</option>
      </select>
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={type === 'flight' ? "e.g. AA100" : "e.g. JFK"}
        style={{ flex: 1, background: 'transparent', color: '#fff', border: 'none', outline: 'none', padding: '0.5rem' }}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <Search size={16} /> Search
      </button>
    </form>
  );
};

export default SearchBar;
