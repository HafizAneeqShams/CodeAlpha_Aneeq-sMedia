import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Notifications from './Notifications';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/messages/unread/count');
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  // ✅ Profile picture URL
  const profilePic = user.profilePicture 
    ? `http://localhost:5000${user.profilePicture}` 
    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.username) + '&background=1877f2&color=fff&size=32';

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand">📱 Aneeq's Media</Link>
        <div className="nav-links">
          <Link to="/">🏠 Feed</Link>
          <Link to="/explore">🔍 Explore</Link>
          <Notifications />
          <Link to="/messages" className="messages-link">
            💬
            {unreadCount > 0 && <span className="unread-count">{unreadCount}</span>}
          </Link>
          <Link to={`/profile/${user.id}`} className="profile-link">
            <img 
              src={profilePic}
              alt="Profile" 
              className="nav-avatar"
              onError={(e) => {
                e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || user.username) + '&background=1877f2&color=fff&size=32';
              }}
            />
            <span>{user.name || user.username}</span>
          </Link>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;