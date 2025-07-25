import React, { useState, useEffect, useRef } from 'react';

function Chat({ username, socket }) {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Initial connection feedback
    socket.on('connect', () => {
      console.log('Connected to chat server!');
    });

    // Handle incoming chat messages
    socket.on('chat message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
      // If the sender is typing, remove them from typing indicator
      if (typingUsers.has(msg.sender)) {
        setTypingUsers((prev) => {
          const newTypingUsers = new Set(prev);
          newTypingUsers.delete(msg.sender);
          return newTypingUsers;
        });
      }
    });

    // Handle online users list update (initial sync and when others join/leave)
    socket.on('online users', (users) => {
      setOnlineUsers(users.filter(user => user !== username)); // Exclude self from online list
    });

    // Handle user online/offline notifications
    socket.on('user online', (user) => {
      // Only add if not current user and not already in list
      if (user !== username && !onlineUsers.includes(user)) {
        setOnlineUsers((prevUsers) => [...prevUsers, user]);
      }
    });

    socket.on('user offline', (user) => {
      setOnlineUsers((prevUsers) => prevUsers.filter((u) => u !== user));
      setTypingUsers((prev) => { // Also remove from typing if they go offline
        const newTypingUsers = new Set(prev);
        newTypingUsers.delete(user);
        return newTypingUsers;
      });
    });

    // Handle typing indicators
    socket.on('typing', (typerUsername) => {
      if (typerUsername !== username) { // Don't show self as typing
        setTypingUsers((prev) => new Set(prev).add(typerUsername));
      }
    });

    socket.on('stop typing', (typerUsername) => {
      setTypingUsers((prev) => {
        const newTypingUsers = new Set(prev);
        newTypingUsers.delete(typerUsername);
        return newTypingUsers;
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log('Disconnected from chat server.');
      setOnlineUsers([]);
      setTypingUsers(new Set());
    });

    // Cleanup on component unmount
    return () => {
      socket.off('connect');
      socket.off('chat message');
      socket.off('online users');
      socket.off('user online');
      socket.off('user offline');
      socket.off('typing');
      socket.off('stop typing');
      socket.off('disconnect');
    };
  }, [username, socket, onlineUsers, typingUsers]); // Re-run if username or socket changes

  useEffect(() => {
    scrollToBottom(); // Scroll to bottom whenever messages update
  }, [messages, typingUsers]); // Also scroll if typing status changes to show indicator

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim()) {
      socket.emit('chat message', messageInput);
      setMessageInput('');
      socket.emit('stop typing'); // Stop typing after sending message
      clearTimeout(typingTimeoutRef.current); // Clear any pending typing timeout
    }
  };

  const handleMessageInputChange = (e) => {
    setMessageInput(e.target.value);

    if (e.target.value.trim().length > 0) {
      socket.emit('typing');
      // Clear previous timeout if user is still typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Set a timeout to emit 'stop typing' if user stops typing for 1 second
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop typing');
      }, 1000);
    } else {
      socket.emit('stop typing');
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container">
      <aside className="sidebar">
        <h3>Online Users</h3>
        <ul className="online-users-list">
          {username && <li>{username} (You)</li>}
          {onlineUsers.map((user) => (
            <li key={user}>{user}</li>
          ))}
        </ul>
      </aside>
      <main className="main-chat">
        <div className="messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message-item ${
                msg.type === 'notification'
                  ? 'notification'
                  : msg.sender === username
                  ? 'sent'
                  : 'received'
              }`}
            >
              {msg.type !== 'notification' && (
                <span className="message-sender">{msg.sender}</span>
              )}
              <span className="message-content">{msg.message}</span>
              <span className="message-timestamp">
                {formatTimestamp(msg.timestamp)}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} /> {/* Scroll target */}
        </div>
        <div className="typing-indicator">
          {typingUsers.size > 0 && (
            <span>
              {Array.from(typingUsers).join(', ')} is typing...
            </span>
          )}
        </div>
        <form onSubmit={handleSendMessage} className="message-input-form">
          <input
            type="text"
            value={messageInput}
            onChange={handleMessageInputChange}
            placeholder="Type a message..."
            autoFocus
          />
          <button type="submit">Send</button>
        </form>
      </main>
    </div>
  );
}

export default Chat;