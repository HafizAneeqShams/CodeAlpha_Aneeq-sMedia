// export default CommentSection;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const CommentSection = ({ postId, comments, onCommentAdded }) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReplies, setShowReplies] = useState({});
  const [localComments, setLocalComments] = useState(comments || []);
  const [loading, setLoading] = useState(false);

  // ✅ Profile picture URL
  const userProfilePic = user?.profilePicture 
    ? `http://localhost:5000${user.profilePicture}` 
    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || user?.username || 'U') + '&background=1877f2&color=fff&size=32';

  useEffect(() => {
    setLocalComments(comments || []);
  }, [comments]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post(`http://localhost:5000/api/comments/${postId}`, {
        text: newComment.trim()
      });
      
      const newCommentData = {
        ...res.data,
        replies: [],
        likes: []
      };
      
      setLocalComments([newCommentData, ...localComments]);
      setNewComment('');
      if (onCommentAdded) onCommentAdded();
    } catch (err) {
      console.error('Error adding comment:', err);
    }
    setLoading(false);
  };

  const handleLikeComment = async (commentId) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/comments/${commentId}/like`);
      setLocalComments(localComments.map(c => {
        if (c._id === commentId) {
          return { ...c, likes: res.data };
        }
        return c;
      }));
    } catch (err) {
      console.error('Error liking comment:', err);
    }
  };

  const handleAddReply = async (commentId) => {
    if (!replyText.trim()) return;

    try {
      const res = await axios.post(`http://localhost:5000/api/comments/${commentId}/reply`, {
        text: replyText.trim()
      });
      
      setLocalComments(localComments.map(c => {
        if (c._id === commentId) {
          return { ...c, replies: res.data };
        }
        return c;
      }));
      
      setReplyText('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Error adding reply:', err);
    }
  };

  const handleLikeReply = async (replyId) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/comments/reply/${replyId}/like`);
      setLocalComments(localComments.map(c => {
        const updatedReplies = c.replies.map(r => {
          if (r._id === replyId) {
            return { ...r, likes: res.data };
          }
          return r;
        });
        return { ...c, replies: updatedReplies };
      }));
    } catch (err) {
      console.error('Error liking reply:', err);
    }
  };

  const toggleReplies = (commentId) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const getProfilePic = (userData) => {
    return userData?.profilePicture 
      ? `http://localhost:5000${userData.profilePicture}` 
      : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userData?.name || userData?.username || 'U') + '&background=1877f2&color=fff&size=32';
  };

  return (
    <div className="comment-section">
      <form onSubmit={handleAddComment} className="comment-form">
        <img src={userProfilePic} alt="Your Avatar" />
        <input
          type="text"
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? '...' : 'Post'}
        </button>
      </form>

      <div className="comments-list">
        {localComments.length === 0 ? (
          <p className="no-comments">No comments yet</p>
        ) : (
          localComments.map(comment => {
            const isLiked = comment.likes?.includes(user?.id) || false;
            const likeCount = comment.likes?.length || 0;
            const replyCount = comment.replies?.length || 0;
            const showRepliesForThis = showReplies[comment._id] || false;

            return (
              <div key={comment._id} className="comment-item">
                <div className="comment-main">
                  <Link to={`/profile/${comment.user._id}`}>
                    <img src={getProfilePic(comment.user)} alt="Avatar" />
                  </Link>
                  <div className="comment-body">
                    <div className="comment-header">
                      <Link to={`/profile/${comment.user._id}`}>
                        <strong>{comment.user.name || comment.user.username}</strong>
                      </Link>
                      <span className="comment-time">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                    <div className="comment-actions">
                      <button 
                        className={`like-btn ${isLiked ? 'liked' : ''}`}
                        onClick={() => handleLikeComment(comment._id)}
                      >
                        {isLiked ? '❤️' : '🤍'} {likeCount > 0 && likeCount}
                      </button>
                      <button onClick={() => setReplyingTo(comment._id)}>
                        Reply {replyCount > 0 && `(${replyCount})`}
                      </button>
                    </div>

                    {replyingTo === comment._id && (
                      <div className="reply-input">
                        <input
                          type="text"
                          placeholder="Write a reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          autoFocus
                        />
                        <button onClick={() => handleAddReply(comment._id)}>Reply</button>
                        <button onClick={() => { setReplyingTo(null); setReplyText(''); }}>
                          Cancel
                        </button>
                      </div>
                    )}

                    {replyCount > 0 && (
                      <button 
                        className="show-replies-btn"
                        onClick={() => toggleReplies(comment._id)}
                      >
                        {showRepliesForThis ? 'Hide replies' : `View ${replyCount} replies`}
                      </button>
                    )}
                  </div>
                </div>

                {showRepliesForThis && comment.replies?.length > 0 && (
                  <div className="replies-list">
                    {comment.replies.map(reply => {
                      const isReplyLiked = reply.likes?.includes(user?.id) || false;
                      const replyLikeCount = reply.likes?.length || 0;

                      return (
                        <div key={reply._id} className="reply-item">
                          <Link to={`/profile/${reply.user._id}`}>
                            <img src={getProfilePic(reply.user)} alt="Avatar" />
                          </Link>
                          <div className="reply-body">
                            <div className="reply-header">
                              <Link to={`/profile/${reply.user._id}`}>
                                <strong>{reply.user.name || reply.user.username}</strong>
                              </Link>
                              <span className="reply-time">
                                {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="reply-text">{reply.text}</p>
                            <button 
                              className={`like-btn ${isReplyLiked ? 'liked' : ''}`}
                              onClick={() => handleLikeReply(reply._id)}
                            >
                              {isReplyLiked ? '❤️' : '🤍'} {replyLikeCount > 0 && replyLikeCount}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CommentSection;