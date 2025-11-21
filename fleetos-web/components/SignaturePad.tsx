'use client';

import React, { useState, useRef, useEffect } from 'react';

interface SignaturePadProps {
  onSignatureSave: (uri: string) => void;
  initialSignature?: string;
  width?: number;
  height?: number;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Web signature pad component - matches mobile app functionality
 * Uses HTML5 canvas for drawing signatures
 */
export function SignaturePad({ 
  onSignatureSave, 
  initialSignature,
  width = 300,
  height = 200
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (initialSignature && canvasRef.current) {
      loadInitialSignature(initialSignature);
    }
  }, [initialSignature]);

  function loadInitialSignature(dataUri: string) {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, width, height);
      setHasSignature(true);
    };
    img.src = dataUri;
  }

  function getPointFromEvent(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null {
    if (!canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      // Touch event
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const point = getPointFromEvent(e);
    if (!point || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    setLastPoint(point);
    setHasSignature(true);
    
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing || !canvasRef.current || !lastPoint) return;
    
    const point = getPointFromEvent(e);
    if (!point) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    setLastPoint(point);
  }

  function stopDrawing() {
    if (isDrawing) {
      setIsDrawing(false);
      setLastPoint(null);
    }
  }

  function clearSignature() {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  function saveSignature() {
    if (!canvasRef.current || !hasSignature) {
      alert('Παρακαλώ κάντε μια υπογραφή πρώτα');
      return;
    }

    try {
      // Get canvas as data URL (PNG)
      const dataUrl = canvasRef.current.toDataURL('image/png');
      
      // Convert to SVG format like mobile app for consistency
      const svgContent = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>
          <image href="${dataUrl}" width="${width}" height="${height}"/>
        </svg>
      `;
      
      // Convert to base64 data URI like mobile app
      const base64Svg = btoa(unescape(encodeURIComponent(svgContent)));
      const dataUri = `data:image/svg+xml;base64,${base64Svg}`;
      
      onSignatureSave(dataUri);
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Αποτυχία αποθήκευσης υπογραφής');
    }
  }

  return (
    <div className="signature-pad-container">
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full border border-gray-200 rounded bg-white cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => {
            e.preventDefault();
            startDrawing(e);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            draw(e);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopDrawing();
          }}
          style={{ touchAction: 'none' }}
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={clearSignature}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            🗑️ Διαγραφή
          </button>
          <button
            type="button"
            onClick={saveSignature}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Αποθήκευση
          </button>
        </div>
      </div>
    </div>
  );
}

