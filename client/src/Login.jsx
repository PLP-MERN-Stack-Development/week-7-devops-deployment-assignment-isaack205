import React, { useState } from 'react';

function Login({ onLogin, error }) {
  const [usernameInput, setUsernameInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(usernameInput);
  };

  return (
    <div className="login-container">
      <h1>Welcome to the Real-Time Chat!</h1>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="text"
          placeholder="Enter your username"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          maxLength={20}
          required
        />
        <button type="submit">Join Chat</button>
      </form>
      {error && <p className="login-error">{error}</p>}
    </div>
  );
}

export default Login;