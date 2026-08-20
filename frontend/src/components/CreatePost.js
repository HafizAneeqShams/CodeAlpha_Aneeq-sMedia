// export default CreatePost;

import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const CreatePost = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  // ✅ Profile picture URL
  const profilePic = user?.profilePicture 
    ? `http://localhost:5000${user.profilePicture}` 
    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || user?.username || 'U') + '&background=1877f2&color=fff&size=40';

  const handleMediaSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      const previewUrl = URL.createObjectURL(file);
      setMediaPreview(previewUrl);
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaFile) {
      alert('Please add some content or media');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('content', content);
    if (mediaFile) {
      formData.append('media', mediaFile);
    }

    try {
      const res = await axios.post('http://localhost:5000/api/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newPost = {
        ...res.data,
        user: {
          _id: user.id,
          username: user.username,
          name: user.name || user.username,
          profilePicture: user.profilePicture
        }
      };
      
      onPostCreated(newPost);
      setContent('');
      removeMedia();
    } catch (err) {
      alert('Failed to create post');
    }
    setLoading(false);
  };

  return (
    <div className="create-post">
      <div className="create-post-header">
        <img 
          src={profilePic}
          alt="Profile" 
          onError={(e) => {
            e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || user?.username || 'U') + '&background=1877f2&color=fff&size=40';
          }}
        />
        <input
          type="text"
          placeholder={`What's on your mind, ${user?.name || user?.username}?`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {mediaPreview && (
        <div className="media-preview">
          {mediaType === 'video' ? (
            <video src={mediaPreview} controls className="preview-video" />
          ) : (
            <img src={mediaPreview} alt="Preview" className="preview-image" />
          )}
          <button className="remove-media" onClick={removeMedia}>✕</button>
        </div>
      )}

      <div className="create-post-actions">
        <button 
          className="action-btn media-btn"
          onClick={() => fileInputRef.current.click()}
        >
          📷 Photo/Video
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleMediaSelect}
          accept="image/*,video/*"
          style={{ display: 'none' }}
        />
        <button 
          className="submit-btn" 
          onClick={handleSubmit}
          disabled={loading || (!content.trim() && !mediaFile)}
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
};

export default CreatePost;