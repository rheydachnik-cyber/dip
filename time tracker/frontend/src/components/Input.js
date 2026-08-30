import React from 'react';
const Input = ({ label, type = 'text', value, onChange, placeholder, required }) => (
  <div style={{ marginBottom: '15px' }}>
    {label && <label style={{ display: 'block', marginBottom: '5px' }}>{label}</label>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="input"
    />
  </div>
);
export default Input;
