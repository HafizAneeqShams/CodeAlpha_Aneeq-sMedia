// export default PostCard;

import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import ImageViewer from './ImageViewer';  // ✅ NEW - Image Viewer Import

const PostCard = ({ post, onUpdate, onDelete }) => {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(post.likes?.includes(user?.id) || false);
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [showReplies, setShowReplies] = useState({});
  const [replyTexts, setReplyTexts] = useState({});
  const [showReplyInputs, setShowReplyInputs] = useState({});
  const [loadingReply, setLoadingReply] = useState({});
  
  // ✅ NEW - Image Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const isOwner = post.user._id === user?.id;
  const postDate = new Date(post.createdAt);
  const timeAgo = formatDistanceToNow(postDate, { addSuffix: true });

  const profilePic = post.user.profilePicture 
    ? `http://localhost:5000${post.user.profilePicture}` 
    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(post.user.name || post.user.username) + '&background=1877f2&color=fff&size=40';

  // ✅ NEW - Handle Image Click
  const handleImageClick = (media, index) => {
    // Check if it's an image (not video)
    if (post.mediaType === 'video') return;
    
    const allMedia = post.media ? [{
      url: `http://localhost:5000${post.media}`,
      type: post.mediaType || 'image'
    }] : [];
    
    setViewerIndex(index || 0);
    setViewerOpen(true);
  };

  // ✅ NEW - Get media items for viewer
  const getMediaItems = () => {
    if (!post.media || post.media === '' || post.media === 'none') return [];
    return [{
      url: `http://localhost:5000${post.media}`,
      type: post.mediaType || 'image'
    }];
  };

  // ✅ Like post
  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await axios.put(`http://localhost:5000/api/posts/${post._id}/like`);
      setLiked(res.data.includes(user.id));
      setLikeCount(res.data.length);
      onUpdate({ ...post, likes: res.data });
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ Add comment
  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const res = await axios.post(`http://localhost:5000/api/posts/${post._id}/comment`, {
        text: comment
      });
      setComment('');
      onUpdate({ ...post, comments: res.data });
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ Delete post
  const handleDelete = async () => {
    if (window.confirm('Delete this post?')) {
      try {
        await axios.delete(`http://localhost:5000/api/posts/${post._id}`);
        onDelete(post._id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ✅ Like comment
  const handleCommentLike = async (commentId) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/comments/${commentId}/like`);
      const updatedComments = post.comments.map(c => {
        if (c._id === commentId) {
          return { ...c, likes: res.data };
        }
        return c;
      });
      onUpdate({ ...post, comments: updatedComments });
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ ADD REPLY
  const handleReply = async (commentId) => {
    const replyText = replyTexts[commentId] || '';
    
    console.log('🔍 Comment ID received:', commentId);
    console.log('📝 Reply text:', replyText);
    
    if (!commentId) {
      alert('Error: Comment ID is missing!');
      return;
    }
    
    if (!replyText.trim()) {
      alert('Please write a reply');
      return;
    }

    setLoadingReply({ ...loadingReply, [commentId]: true });

    try {
      const url = `http://localhost:5000/api/comments/${commentId}/reply`;
      console.log('📡 Sending to URL:', url);
      
      const res = await axios.post(url, {
        text: replyText.trim()
      });
      
      console.log('✅ Reply response:', res.data);
      
      const updatedComments = post.comments.map(c => {
        if (c._id === commentId) {
          return { ...c, replies: res.data };
        }
        return c;
      });
      onUpdate({ ...post, comments: updatedComments });
      
      setReplyTexts({ ...replyTexts, [commentId]: '' });
      setShowReplyInputs({ ...showReplyInputs, [commentId]: false });
      alert('✅ Reply sent successfully!');
      
    } catch (err) {
      console.error('❌ Error:', err);
      console.error('❌ Response:', err.response?.data);
      alert('Failed to send reply: ' + (err.response?.data?.msg || err.message));
    }
    
    setLoadingReply({ ...loadingReply, [commentId]: false });
  };

  // ✅ Like reply
  const handleReplyLike = async (replyId) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/comments/reply/${replyId}/like`);
      const updatedComments = post.comments.map(c => {
        const updatedReplies = c.replies?.map(r => {
          if (r._id === replyId) {
            return { ...r, likes: res.data };
          }
          return r;
        });
        return { ...c, replies: updatedReplies };
      });
      onUpdate({ ...post, comments: updatedComments });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleReplies = (commentId) => {
    setShowReplies({ ...showReplies, [commentId]: !showReplies[commentId] });
  };

  const toggleReplyInput = (commentId) => {
    setShowReplyInputs({ ...showReplyInputs, [commentId]: !showReplyInputs[commentId] });
  };

  const updateReplyText = (commentId, text) => {
    setReplyTexts({ ...replyTexts, [commentId]: text });
  };

  return (
    <div className="post-card">
      {/* Header */}
      <div className="post-header">
        <Link to={`/profile/${post.user._id}`} className="post-user-info">
          <img src={profilePic} alt={post.user.username} />
          <div>
            <span className="username">{post.user.name || post.user.username}</span>
            <span className="post-time">{timeAgo}</span>
          </div>
        </Link>
        {isOwner && <button className="delete-btn" onClick={handleDelete}>✕</button>}
      </div>

      {/* Content */}
      {post.content && (
        <div className="post-content">
          <p>{post.content}</p>
        </div>
      )}

      {/* ✅ Media - Click to Open Full Screen */}
      {post.media && post.media !== '' && post.media !== 'none' && (
        <div className="post-media">
          {post.mediaType === 'video' ? (
            <video 
              src={`http://localhost:5000${post.media}`} 
              controls 
              className="post-video" 
            />
          ) : (
            <img 
              src={`http://localhost:5000${post.media}`} 
              alt="Post" 
              className="post-image"
              onClick={() => handleImageClick({ url: post.media, type: 'image' }, 0)}
              style={{ cursor: 'pointer' }}
            />
          )}
        </div>
      )}

      {/* Stats */}
      <div className="post-stats">
        <span>{likeCount} likes</span>
        <span>{post.comments?.length || 0} comments</span>
      </div>

      {/* Actions */}
      <div className="post-actions">
        <button className={`action-btn like-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
          {liked ? '❤️' : '🤍'} Like
        </button>
        <button className="action-btn" onClick={() => setShowComments(!showComments)}>
          💬 Comment
        </button>
        <button className="action-btn">↗️ Share</button>
      </div>

      {/* Comments */}
      <div className="post-comments-section">
        <form onSubmit={handleComment} className="comment-form">
          <img 
            src={user?.profilePicture ? `http://localhost:5000${user.profilePicture}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || user?.username || 'U') + '&background=1877f2&color=fff&size=32'} 
            alt="Avatar" 
          />
          <input
            type="text"
            placeholder="Write a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button type="submit">Post</button>
        </form>

        {showComments && (
          <div className="comments-list">
            {post.comments?.length === 0 ? (
              <p className="no-comments">No comments yet</p>
            ) : (
              post.comments.map((c, index) => {
                const commenterPic = c.user?.profilePicture 
                  ? `http://localhost:5000${c.user.profilePicture}` 
                  : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(c.user?.name || c.user?.username || 'U') + '&background=1877f2&color=fff&size=32';
                
                const isCommentLiked = c.likes?.includes(user?.id) || false;
                const commentLikeCount = c.likes?.length || 0;
                const replyCount = c.replies?.length || 0;
                const showRepliesForThis = showReplies[c._id] || false;
                const showReplyInputForThis = showReplyInputs[c._id] || false;
                const replyText = replyTexts[c._id] || '';

                return (
                  <div key={index} className="comment-item">
                    <div className="comment-main">
                      <Link to={`/profile/${c.user._id}`}>
                        <img src={commenterPic} alt="Avatar" />
                      </Link>
                      <div className="comment-body">
                        <div className="comment-header">
                          <Link to={`/profile/${c.user._id}`}>
                            <strong>{c.user?.name || c.user?.username}</strong>
                          </Link>
                          <span className="comment-time">
                            {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="comment-text">{c.text}</p>
                        <div className="comment-actions">
                          <button 
                            className={`like-btn ${isCommentLiked ? 'liked' : ''}`}
                            onClick={() => handleCommentLike(c._id)}
                          >
                            {isCommentLiked ? '❤️' : '🤍'} {commentLikeCount > 0 && commentLikeCount}
                          </button>
                          <button onClick={() => toggleReplyInput(c._id)}>
                            Reply {replyCount > 0 && `(${replyCount})`}
                          </button>
                        </div>

                        {showReplyInputForThis && (
                          <div className="reply-input">
                            <input
                              type="text"
                              placeholder="Write a reply..."
                              value={replyText}
                              onChange={(e) => updateReplyText(c._id, e.target.value)}
                              autoFocus
                            />
                            <button 
                              onClick={() => handleReply(c._id)}
                              disabled={loadingReply[c._id]}
                            >
                              {loadingReply[c._id] ? '...' : 'Reply'}
                            </button>
                            <button onClick={() => {
                              setShowReplyInputs({ ...showReplyInputs, [c._id]: false });
                              setReplyTexts({ ...replyTexts, [c._id]: '' });
                            }}>
                              Cancel
                            </button>
                          </div>
                        )}

                        {replyCount > 0 && (
                          <button className="show-replies-btn" onClick={() => toggleReplies(c._id)}>
                            {showRepliesForThis ? 'Hide replies' : `View ${replyCount} replies`}
                          </button>
                        )}
                      </div>
                    </div>

                    {showRepliesForThis && c.replies?.length > 0 && (
                      <div className="replies-list">
                        {c.replies.map((reply, idx) => {
                          const replyerPic = reply.user?.profilePicture 
                            ? `http://localhost:5000${reply.user.profilePicture}` 
                            : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(reply.user?.name || reply.user?.username || 'U') + '&background=1877f2&color=fff&size=28';
                          
                          const isReplyLiked = reply.likes?.includes(user?.id) || false;
                          const replyLikeCount = reply.likes?.length || 0;

                          return (
                            <div key={idx} className="reply-item">
                              <Link to={`/profile/${reply.user._id}`}>
                                <img src={replyerPic} alt="Avatar" />
                              </Link>
                              <div className="reply-body">
                                <div className="reply-header">
                                  <Link to={`/profile/${reply.user._id}`}>
                                    <strong>{reply.user?.name || reply.user?.username}</strong>
                                  </Link>
                                  <span className="reply-time">
                                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                                <p className="reply-text">{reply.text}</p>
                                <button 
                                  className={`like-btn ${isReplyLiked ? 'liked' : ''}`}
                                  onClick={() => handleReplyLike(reply._id)}
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
        )}
      </div>

      {/* ✅ Image Viewer */}
      {viewerOpen && (
        <ImageViewer
          images={getMediaItems()}
          currentIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
};

export default PostCard;