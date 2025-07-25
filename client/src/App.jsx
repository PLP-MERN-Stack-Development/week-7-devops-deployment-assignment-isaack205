import React, { useState, useEffect } from 'react';
import Login from './Login';
import Chat from './Chat';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_SERVER_URL);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    socket.on('authenticated', (user) => {
      setUsername(user);
      setIsAuthenticated(true);
      setAuthError('');
    });

    socket.on('auth error', (message) => {
      setAuthError(message);
    });

    return () => {
      socket.off('authenticated');
      socket.off('auth error');
    };
  }, []);

  const handleLogin = (user) => {
    if (user.trim() === '') {
      setAuthError('Username cannot be empty.');
      return;
    }
    socket.emit('authenticate', user);
  };

  return (
    <>
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} error={authError} />
      ) : (
        <Chat username={username} socket={socket} />
      )}
    </>
  );
}

export default App;