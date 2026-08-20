// export default Notifications;


import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
      
      // Poll every 15 seconds
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 15000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/notifications');
      setNotifications(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/notifications/unread/count');
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/${id}/read`);
      setNotifications(notifications.map(n => 
        n._id === id ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('http://localhost:5000/api/notifications/read/all');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/notifications/${id}`);
      setNotifications(notifications.filter(n => n._id !== id));
      if (!notifications.find(n => n._id === id)?.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getNotificationText = (notification) => {
    const from = notification.from?.name || notification.from?.username || 'Someone';
    
    switch (notification.type) {
      case 'like':
        return `${from} liked your post`;
      case 'comment':
        return `${from} commented on your post`;
      case 'follow':
        return `${from} started following you`;
      case 'reply':
        return `${from} replied to your comment`;
      case 'message':
        return `${from} sent you a message`;
      default:
        return `${from} interacted with you`;
    }
  };

  const getNotificationLink = (notification) => {
    switch (notification.type) {
      case 'like':
      case 'comment':
        return `/profile/${notification.from?._id}`;
      case 'follow':
        return `/profile/${notification.from?._id}`;
      case 'message':
        return `/messages?user=${notification.from?._id}`;
      default:
        return '#';
    }
  };

  return (
    <div className="notifications-wrapper">
      <button 
        className="notifications-btn"
        onClick={() => {
          setShowDropdown(!showDropdown);
          if (!showDropdown) fetchNotifications();
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notifications-dropdown">
          <div className="notif-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={markAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading ? (
              <p className="notif-loading">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="no-notif">No notifications yet</p>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification._id} 
                  className={`notif-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => markAsRead(notification._id)}
                >
                  <Link to={getNotificationLink(notification)} className="notif-content">
                    <img 
                      src={notification.from?.profilePicture ? `http://localhost:5000${notification.from.profilePicture}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(notification.from?.name || 'U') + '&background=1877f2&color=fff&size=40'} 
                      alt="Avatar" 
                    />
                    <div>
                      <p className="notif-text">{getNotificationText(notification)}</p>
                      <span className="notif-time">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </Link>
                  <button 
                    className="notif-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification._id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;