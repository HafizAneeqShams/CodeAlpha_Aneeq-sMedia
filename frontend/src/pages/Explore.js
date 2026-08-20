import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Explore = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('📡 Fetching users...');
      const res = await axios.get('http://localhost:5000/api/users');
      console.log('✅ Users fetched:', res.data);
      
      // Filter out current user
      const filteredUsers = res.data.filter(u => u._id !== user?.id);
      setUsers(filteredUsers);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      setLoading(false);
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Profile picture function - FIXED
  const getProfilePic = (userData) => {
    console.log('🔍 Getting profile pic for:', userData?.username);
    console.log('📸 Profile picture path:', userData?.profilePicture);
    
    if (userData?.profilePicture) {
      return `http://localhost:5000${userData.profilePicture}`;
    }
    const name = userData?.name || userData?.username || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1877f2&color=fff&size=56`;
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="explore-container">
      <h2>🔍 Explore Users</h2>
      
      <input
        type="text"
        placeholder="Search users by name or username..."
        className="search-input"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="users-grid">
        {filteredUsers.length === 0 ? (
          <div className="no-users">
            <p>No users found</p>
            {searchTerm && <p>Try searching with different keywords</p>}
          </div>
        ) : (
          filteredUsers.map(u => (
            <Link to={`/profile/${u._id}`} key={u._id} className="explore-user-card">
              <img 
                src={getProfilePic(u)}
                alt={u.username}
                onError={(e) => {
                  console.log('❌ Image load error for:', u.username);
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.username)}&background=1877f2&color=fff&size=56`;
                }}
              />
              <div>
                <strong>{u.name || u.username}</strong>
                <p>@{u.username}</p>
                <p className="user-stats">
                  {u.followers?.length || 0} followers • {u.following?.length || 0} following
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default Explore;