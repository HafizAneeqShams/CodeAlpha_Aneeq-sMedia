import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const userId = id || currentUser?.id;
  const isOwnProfile = currentUser && userId === currentUser.id;

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!userId) {
      navigate(`/profile/${currentUser.id}`);
      return;
    }
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      console.log('📡 Fetching profile for:', userId);
      
      const userRes = await axios.get(`http://localhost:5000/api/users/${userId}`);
      console.log('✅ Profile data:', userRes.data);
      
      setProfileUser(userRes.data);
      setEditName(userRes.data.name || '');
      setEditBio(userRes.data.bio || '');
      
      // ✅ Check if current user is following this profile
      if (currentUser) {
        const isFollowingUser = userRes.data.followers?.includes(currentUser.id) || false;
        console.log('Is following:', isFollowingUser);
        setIsFollowing(isFollowingUser);
      }
      
      setFollowerCount(userRes.data.followers?.length || 0);
      
      const postsRes = await axios.get(`http://localhost:5000/api/posts/user/${userId}`);
      setPosts(postsRes.data);
    } catch (err) {
      console.error('❌ Error fetching profile:', err);
    }
    setLoading(false);
  };

  // ✅ FOLLOW HANDLER - FIXED
  const handleFollow = async () => {
    if (!currentUser) return;
    
    try {
      console.log('📡 Toggle follow for user:', userId);
      const res = await axios.put(`http://localhost:5000/api/users/follow/${userId}`);
      console.log('✅ Follow response:', res.data);
      
      // ✅ Get new status from response
      const newStatus = res.data.isFollowing;
      console.log('New status:', newStatus);
      
      // ✅ Update following status
      setIsFollowing(newStatus);
      
      // ✅ Update follower count
      setFollowerCount(prev => newStatus ? prev + 1 : prev - 1);
      
      // ✅ Update current user's following list in context
      if (currentUser) {
        const updatedUser = { ...currentUser };
        if (newStatus) {
          if (!updatedUser.following?.includes(userId)) {
            updatedUser.following = [...(updatedUser.following || []), userId];
          }
        } else {
          updatedUser.following = updatedUser.following?.filter(uid => uid !== userId) || [];
        }
        updateUser(updatedUser);
      }
      
      // ✅ Update profile user's followers
      setProfileUser(prev => ({
        ...prev,
        followers: newStatus 
          ? [...(prev.followers || []), currentUser.id]
          : prev.followers?.filter(uid => uid !== currentUser.id) || []
      }));
      
    } catch (err) {
      console.error('❌ Follow error:', err);
      alert('Failed to follow/unfollow. Please try again.');
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const res = await axios.post('http://localhost:5000/api/users/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateUser(res.data);
      setProfileUser(prev => ({ ...prev, profilePicture: res.data.profilePicture }));
      alert('✅ Profile picture updated!');
    } catch (err) {
      alert('❌ Failed to upload');
    }
    setUploading(false);
  };

  const handleUpdateProfile = async () => {
    try {
      const res = await axios.put('http://localhost:5000/api/users/profile', {
        name: editName,
        bio: editBio
      });
      updateUser(res.data);
      setProfileUser(prev => ({ ...prev, name: res.data.name, bio: res.data.bio }));
      setIsEditing(false);
      alert('✅ Profile updated!');
    } catch (err) {
      alert('❌ Failed to update');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!currentUser) {
    navigate('/login');
    return null;
  }
  if (!profileUser) return <div className="loading">User not found</div>;

  const profilePic = profileUser.profilePicture 
    ? `http://localhost:5000${profileUser.profilePicture}` 
    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profileUser.name || profileUser.username) + '&background=1877f2&color=fff&size=128';

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar-wrapper">
          <img 
            src={profilePic}
            alt="Profile" 
            className="profile-avatar-large"
            onError={(e) => {
              e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profileUser.name || profileUser.username) + '&background=1877f2&color=fff&size=128';
            }}
          />
          {isOwnProfile && (
            <>
              <button 
                className="change-avatar-btn"
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
              >
                {uploading ? '⏳' : '📷'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleProfilePictureUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </>
          )}
        </div>
        
        <div className="profile-info">
          <h2>{profileUser.name || profileUser.username}</h2>
          <p>@{profileUser.username}</p>
          
          <div className="profile-stats">
            <span>📊 {followerCount} Followers</span>
            <span>📊 {profileUser.following?.length || 0} Following</span>
            <span>📝 {posts.length} Posts</span>
          </div>

          <div className="profile-bio">
            {profileUser.bio ? (
              <p>{profileUser.bio}</p>
            ) : (
              <p style={{ color: '#999' }}>
                {isOwnProfile ? 'Click Edit Profile to add bio' : 'No bio yet'}
              </p>
            )}
          </div>

          {/* ===== BUTTONS ===== */}
          <div className="profile-buttons">
            {isOwnProfile ? (
              <button 
                className="edit-profile-btn"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? '❌ Cancel' : '✏️ Edit Profile'}
              </button>
            ) : (
              <>
                <button 
                  className={`follow-btn ${isFollowing ? 'following' : ''}`}
                  onClick={handleFollow}
                >
                  {isFollowing ? 'Following' : '+ Follow'}
                </button>
                <Link to={`/messages?user=${profileUser._id}`} className="message-btn">
                  💬 Message
                </Link>
              </>
            )}
          </div>

          {isEditing && isOwnProfile && (
            <div className="edit-form">
              <div className="edit-field">
                <label>Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="edit-field">
                <label>Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={200}
                  rows="3"
                />
                <span>{editBio.length}/200</span>
              </div>
              <div className="edit-actions">
                <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button className="save-btn" onClick={handleUpdateProfile}>
                  💾 Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="profile-posts">
        <h3>📝 Posts</h3>
        {posts.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
            No posts yet
          </p>
        ) : (
          posts.map(post => (
            <PostCard 
              key={post._id} 
              post={post} 
              onUpdate={fetchProfile}
              onDelete={fetchProfile}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Profile;