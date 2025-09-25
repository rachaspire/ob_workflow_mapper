import { useState, useCallback, useEffect, useRef } from 'react';

export const useResizablePanel = (initialWidth = 320, minWidth = 280, maxWidthPercent = 50) => {
  const [width, setWidth] = useState(() => {
    // Load from localStorage if available
    const savedWidth = localStorage.getItem('nodeInspectorWidth');
    return savedWidth ? parseInt(savedWidth, 10) : initialWidth;
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const startWidth = useRef(0);

  // Save width to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('nodeInspectorWidth', width.toString());
  }, [width]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    startWidth.current = width;
    
    // Add cursor style to body
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const deltaX = dragStartX.current - e.clientX; // Reversed since we're resizing from the left edge
    const newWidth = startWidth.current + deltaX;
    
    // Calculate constraints
    const maxWidth = window.innerWidth * (maxWidthPercent / 100);
    const constrainedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
    
    setWidth(constrainedWidth);
  }, [isDragging, minWidth, maxWidthPercent]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isDragging]);

  // Global mouse event handlers
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle window resize to ensure panel doesn't exceed max width
  useEffect(() => {
    const handleWindowResize = () => {
      const maxWidth = window.innerWidth * (maxWidthPercent / 100);
      if (width > maxWidth) {
        setWidth(Math.max(minWidth, maxWidth));
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [width, minWidth, maxWidthPercent]);

  return {
    width,
    isDragging,
    handleMouseDown,
    resizeHandleProps: {
      onMouseDown: handleMouseDown,
      style: { cursor: 'col-resize' }
    }
  };
};