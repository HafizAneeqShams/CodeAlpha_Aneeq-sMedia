import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const Messages = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const userIdFromUrl = searchParams.get('user');

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (userIdFromUrl) {
      fetchUserAndMessages(userIdFromUrl);
    }
  }, [userIdFromUrl]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser._id);
      markMessagesAsRead(selectedUser._id);
    }
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const markMessagesAsRead = async (userId) => {
    try {
      await axios.put(`http://localhost:5000/api/messages/read/${userId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserAndMessages = async (userId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/users/${userId}`);
      setSelectedUser(res.data);
      await fetchMessages(userId);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/messages/conversations/all');
      setConversations(res.data);
      setLoading(false);
      if (!userIdFromUrl && res.data.length > 0) {
        setSelectedUser(res.data[0].user);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/messages/${userId}`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    setSending(true);
    try {
      const res = await axios.post('http://localhost:5000/api/messages', {
        receiverId: selectedUser._id,
        content: newMessage.trim()
      });
      
      setMessages([...messages, res.data]);
      setNewMessage('');
    } catch (err) {
      console.error(err);
      alert('Failed to send message');
    }
    setSending(false);
  };

  const getProfilePic = (userData) => {
    return userData?.profilePicture 
      ? `http://localhost:5000${userData.profilePicture}` 
      : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userData?.name || userData?.username || 'U') + '&background=1877f2&color=fff&size=40';
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="messages-container">
      {/* Sidebar */}
      <div className="messages-sidebar">
        <div className="sidebar-header">
          <h3>💬 Messages</h3>
        </div>
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <p className="no-conversations">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <div 
                key={conv.user._id}
                className={`conversation-item ${selectedUser?._id === conv.user._id ? 'active' : ''}`}
                onClick={() => setSelectedUser(conv.user)}
              >
                <img src={getProfilePic(conv.user)} alt={conv.user.username} />
                <div className="conv-info">
                  <strong>{conv.user.name || conv.user.username}</strong>
                  <p className="last-message">
                    {conv.lastMessage?.content?.substring(0, 30)}
                  </p>
                </div>
                {conv.unread && <span className="unread-dot"></span>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="messages-chat">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="chat-header">
              <Link to={`/profile/${selectedUser._id}`} className="chat-user-info">
                <img src={getProfilePic(selectedUser)} alt={selectedUser.username} />
                <span className="chat-username">{selectedUser.name || selectedUser.username}</span>
              </Link>
            </div>

            {/* Messages - LEFT/RIGHT */}
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="no-messages">No messages yet</div>
              ) : (
                messages.map((msg) => {
                  const isSent = msg.sender._id === user.id;
                  return (
                    <div 
                      key={msg._id}
                      style={{
                        display: 'flex',
                        justifyContent: isSent ? 'flex-end' : 'flex-start',
                        marginBottom: '8px',
                        alignItems: 'flex-end',
                        gap: '8px',
                        width: '100%'
                      }}
                    >
                      {/* Received - Profile pic left */}
                      {!isSent && (
                        <img 
                          src={getProfilePic(msg.sender)} 
                          alt="avatar"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            flexShrink: 0
                          }}
                        />
                      )}
                      
                      {/* Bubble */}
                      <div
                        style={{
                          maxWidth: '70%',
                          padding: '8px 14px',
                          borderRadius: '18px',
                          backgroundColor: isSent ? '#1877f2' : 'white',
                          color: isSent ? 'white' : '#1c1c1e',
                          borderBottomRightRadius: isSent ? '4px' : '18px',
                          borderBottomLeftRadius: isSent ? '18px' : '4px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          wordWrap: 'break-word'
                        }}
                      >
                        <p style={{ margin: 0, fontSize: '0.95rem' }}>{msg.content}</p>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          opacity: 0.7,
                          marginLeft: '6px',
                          display: 'inline-block'
                        }}>
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          {isSent && ' ✓✓'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="chat-input-form">
              <input
                type="text"
                placeholder={`Message ${selectedUser.name || selectedUser.username}...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="chat-input-field"
              />
              <button type="submit" disabled={sending} className="send-btn">
                {sending ? '...' : 'Send'}
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">Select a conversation</div>
        )}
      </div>
    </div>
  );
};

export default Messages;