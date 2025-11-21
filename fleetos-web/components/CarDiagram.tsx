'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DamagePoint {
  id: string;
  x: number;
  y: number;
  view: 'front' | 'rear' | 'left' | 'right';
  description?: string;
  severity: 'minor' | 'moderate' | 'severe';
  markerType?: 'slight-scratch' | 'heavy-scratch' | 'bent' | 'broken';
}

type DamageMarkerType = 'slight-scratch' | 'heavy-scratch' | 'bent' | 'broken';

interface CarDiagramProps {
  onAddDamage: (x: number, y: number, view: 'front' | 'rear' | 'left' | 'right', markerType: DamageMarkerType) => void;
  onRemoveLastDamage?: () => void;
  damagePoints: DamagePoint[];
  isEditable?: boolean;
}

/**
 * Web car diagram component - matches mobile app functionality
 * Allows marking damage points on car diagram images
 */
export function CarDiagram({ 
  onAddDamage, 
  onRemoveLastDamage,
  damagePoints = [],
  isEditable = true 
}: CarDiagramProps) {
  const [selectedView, setSelectedView] = useState<'front' | 'rear' | 'left' | 'right'>('front');
  const [selectedMarkerType, setSelectedMarkerType] = useState<DamageMarkerType>('slight-scratch');
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });

  // Car diagram image paths (you'll need to add actual images)
  const carImages = {
    front: '/car-front.png', // Replace with actual path
    rear: '/car-rear.png',
    left: '/car-left.png',
    right: '/car-right.png',
  };

  useEffect(() => {
    updateImageLayout();
    window.addEventListener('resize', updateImageLayout);
    return () => window.removeEventListener('resize', updateImageLayout);
  }, [selectedView]);

  function updateImageLayout() {
    if (!containerRef.current || !imageRef.current) return;
    
    const container = containerRef.current;
    const img = imageRef.current;
    
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    setImageLayout({
      width: imgRect.width,
      height: imgRect.height,
      x: imgRect.left - containerRect.left,
      y: imgRect.top - containerRect.top
    });
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isEditable || !containerRef.current || !imageRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - imageLayout.x;
    const y = e.clientY - rect.top - imageLayout.y;
    
    // Convert to percentage (0-100) relative to image size
    const xPercent = (x / imageLayout.width) * 100;
    const yPercent = (y / imageLayout.height) * 100;
    
    // Ensure within bounds
    const clampedX = Math.max(0, Math.min(100, xPercent));
    const clampedY = Math.max(0, Math.min(100, yPercent));
    
    onAddDamage(clampedX, clampedY, selectedView, selectedMarkerType);
  }

  function getMarkerIcon(markerType?: DamageMarkerType) {
    switch (markerType) {
      case 'slight-scratch':
        return <div className="w-5 h-0.5 bg-red-600" />; // Thin line
      case 'heavy-scratch':
        return <div className="w-5 h-1 bg-red-600" />; // Thick line
      case 'bent':
        return <div className="w-4 h-4 border-2 border-red-600" />; // Square
      case 'broken':
        return (
          <div className="w-4 h-4 relative">
            <div className="absolute inset-0 border-2 border-red-600 rotate-45" />
            <div className="absolute inset-0 border-2 border-red-600 -rotate-45" />
          </div>
        ); // X mark
      default:
        return <div className="w-3 h-3 bg-red-600 rounded-full" />;
    }
  }

  function renderDamageMarker(damage: DamagePoint) {
    if (damage.view !== selectedView) return null;
    
    const left = `${damage.x}%`;
    const top = `${damage.y}%`;
    
    return (
      <div
        key={damage.id}
        className="absolute transform -translate-x-1/2 -translate-y-1/2"
        style={{ left, top }}
      >
        {getMarkerIcon(damage.markerType)}
      </div>
    );
  }

  return (
    <div className="car-diagram-container">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select View</label>
        <div className="flex gap-2">
          {(['front', 'rear', 'left', 'right'] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setSelectedView(view)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedView === view
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isEditable && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Damage Type</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'slight-scratch', label: 'Slight Scratch' },
              { value: 'heavy-scratch', label: 'Heavy Scratch' },
              { value: 'bent', label: 'Bent' },
              { value: 'broken', label: 'Broken' },
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setSelectedMarkerType(type.value as DamageMarkerType)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  selectedMarkerType === type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getMarkerIcon(type.value as DamageMarkerType)}
                <span className="ml-1">{type.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative border-2 border-gray-300 rounded-lg bg-gray-50 p-4 cursor-crosshair"
        onClick={isEditable ? handleImageClick : undefined}
      >
        <div className="relative mx-auto" style={{ maxWidth: '100%' }}>
          <img
            ref={imageRef}
            src={carImages[selectedView] || '/car-front.png'}
            alt={`Car ${selectedView} view`}
            className="max-w-full h-auto"
            onLoad={updateImageLayout}
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          />
          
          {/* Render damage markers */}
          {damagePoints.map(damage => renderDamageMarker(damage))}
        </div>
      </div>

      {isEditable && onRemoveLastDamage && damagePoints.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onRemoveLastDamage}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Remove Last Damage
          </button>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p>Click on the car diagram to mark damage points. Current view: <strong>{selectedView}</strong></p>
        {damagePoints.length > 0 && (
          <p>Total damage points: <strong>{damagePoints.length}</strong></p>
        )}
      </div>
    </div>
  );
}

