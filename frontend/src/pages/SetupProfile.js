import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const SetupProfile = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const { user, updateUser } = useAuth();  // ✅ user bhi lo
  const navigate = useNavigate();

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      console.log('✅ File selected:', selectedFile.name);
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) {
      navigate('/');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      console.log('📤 Uploading profile picture...');
      
      const res = await axios.post('http://localhost:5000/api/users/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log('✅ Server response:', res.data);
      console.log('✅ New profile picture:', res.data.profilePicture);
      
      // ✅ Update user in context
      updateUser(res.data);
      
      // ✅ Also update local user if needed
      if (user) {
        const updatedUser = { ...user, profilePicture: res.data.profilePicture };
        updateUser(updatedUser);
      }
      
      alert('✅ Profile picture updated!');
      navigate('/');
      
    } catch (err) {
      console.error('❌ Upload error:', err);
      console.error('❌ Error response:', err.response?.data);
      alert('Failed to upload profile picture: ' + (err.response?.data?.msg || err.message));
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <h1>📸 Set Up Your Profile</h1>
        <p>Add a profile picture to get started</p>
        
        <div className="setup-avatar-wrapper" onClick={() => fileInputRef.current.click()}>
          {preview ? (
            <img src={preview} alt="Preview" className="setup-avatar" />
          ) : (
            <div className="setup-avatar-placeholder">
              <span>+</span>
              <p>Add Photo</p>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        <div className="setup-buttons">
          <button className="skip-btn" onClick={handleSkip}>
            Skip for now
          </button>
          <button 
            className="upload-btn" 
            onClick={handleUpload}
            disabled={loading || !file}
          >
            {loading ? 'Uploading...' : '✅ Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupProfile;