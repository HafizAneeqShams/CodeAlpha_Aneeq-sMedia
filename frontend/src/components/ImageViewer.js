import React, { useState, useEffect } from 'react';

const ImageViewer = ({ images, currentIndex, onClose }) => {
  const [index, setIndex] = useState(currentIndex || 0);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const goToNext = () => {
    if (index < images.length - 1) setIndex(index + 1);
  };

  const goToPrev = () => {
    if (index > 0) setIndex(index - 1);
  };

  if (!images || images.length === 0) return null;

  const currentImage = images[index];

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
        <button className="image-viewer-close" onClick={onClose}>✕</button>
        
        <div className="image-viewer-image-wrapper">
          {currentImage.type === 'video' ? (
            <video 
              src={currentImage.url} 
              controls 
              autoPlay 
              className="image-viewer-video"
            />
          ) : (
            <img 
              src={currentImage.url} 
              alt="Full view" 
              className="image-viewer-image"
            />
          )}
        </div>

        {images.length > 1 && (
          <>
            {index > 0 && (
              <button className="image-viewer-nav prev" onClick={goToPrev}>‹</button>
            )}
            {index < images.length - 1 && (
              <button className="image-viewer-nav next" onClick={goToNext}>›</button>
            )}
          </>
        )}

        {images.length > 1 && (
          <div className="image-viewer-counter">
            {index + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageViewer;