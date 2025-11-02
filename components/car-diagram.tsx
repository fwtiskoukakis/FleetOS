import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Image, ScrollView } from 'react-native';
import { DamagePoint, DamageMarkerType } from '../models/contract.interface';
import Svg, { Line, Rect, Path, G, Ellipse, Circle } from 'react-native-svg';


interface CarDiagramProps {
  onAddDamage: (x: number, y: number, view: 'front' | 'rear' | 'left' | 'right', markerType: DamageMarkerType) => void;
  onRemoveLastDamage?: () => void;
  damagePoints: DamagePoint[];
  isEditable?: boolean;
  onVehicleTypeChange?: (type: VehicleType) => void;
}

type VehicleType = 'car' | 'scooter' | 'atv';

// Import vehicle diagram images
const vehicleImages = {
  car: require('../assets/car_conditions.png'),
  scooter: require('../assets/scooter-conditions.png'),
  atv: require('../assets/atv-conditions.png'),
};

/**
 * Interactive vehicle diagram component
 * Choose between Car, Scooter, or ATV diagrams
 */
export function CarDiagram({ onAddDamage, onRemoveLastDamage, damagePoints, isEditable = true, onVehicleTypeChange }: CarDiagramProps) {
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [containerLayout, setContainerLayout] = useState({ width: 0, height: 0 });
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [selectedMarkerType, setSelectedMarkerType] = useState<DamageMarkerType>('slight-scratch');
  const [selectedView, setSelectedView] = useState<'front' | 'rear' | 'left' | 'right'>('front');
  const [photos, setPhotos] = useState<string[]>([]);
  const containerRef = useRef<View>(null);
  const imageRef = useRef<any>(null);
  
  // Reset image layout when vehicle type changes
  useEffect(() => {
    setImageNaturalSize({ width: 0, height: 0 });
    setImageLayout({ width: 0, height: 0, x: 0, y: 0 });
  }, [vehicleType]);
  
  function handleVehicleTypeChange(type: VehicleType) {
    setVehicleType(type);
    onVehicleTypeChange?.(type);
  }

  function handleImageLoad(event: any) {
    // Handle both web and mobile event structures
    const source = event.nativeEvent?.source || {
      width: event.nativeEvent?.width,
      height: event.nativeEvent?.height
    };
    
    if (source && source.width && source.height) {
      setImageNaturalSize({ width: source.width, height: source.height });
      if (containerLayout.width > 0 && containerLayout.height > 0) {
        calculateImageLayout(containerLayout.width, containerLayout.height, source.width, source.height);
      }
    }
  }

  function handleContainerLayout(event: any) {
    const { width, height } = event.nativeEvent.layout;
    setContainerLayout({ width, height });
    if (imageNaturalSize.width > 0 && imageNaturalSize.height > 0) {
      calculateImageLayout(width, height, imageNaturalSize.width, imageNaturalSize.height);
    }
  }

  function calculateImageLayout(containerWidth: number, containerHeight: number, imageWidth?: number, imageHeight?: number) {
    // Use actual image dimensions if available, otherwise fallback to 1:1 ratio
    const imageAspectRatio = (imageWidth && imageHeight) ? imageWidth / imageHeight : 1;
    const containerAspectRatio = containerWidth / containerHeight;

    let displayWidth, displayHeight, offsetX, offsetY;

    if (containerAspectRatio > imageAspectRatio) {
      // Container is wider - image fits to height
      displayHeight = containerHeight;
      displayWidth = displayHeight * imageAspectRatio;
      offsetX = (containerWidth - displayWidth) / 2;
      offsetY = 0;
    } else {
      // Container is taller - image fits to width
      displayWidth = containerWidth;
      displayHeight = displayWidth / imageAspectRatio;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
    }

    setImageLayout({ width: displayWidth, height: displayHeight, x: offsetX, y: offsetY });
  }

  function handlePress(event: any) {
    if (!isEditable || !imageLayout.width || !imageLayout.height) return;
    
    const { locationX, locationY } = event.nativeEvent;
    
    // Adjust for image offset within container
    const adjustedX = locationX - imageLayout.x;
    const adjustedY = locationY - imageLayout.y;
    
    // Convert to percentage relative to actual image dimensions
    const xPercent = (adjustedX / imageLayout.width) * 100;
    const yPercent = (adjustedY / imageLayout.height) * 100;
    
    // Ensure the coordinates are within bounds (0-100%)
    const clampedX = Math.max(0, Math.min(100, xPercent));
    const clampedY = Math.max(0, Math.min(100, yPercent));
    
    // Use the selected view region
    onAddDamage(clampedX, clampedY, selectedView, selectedMarkerType);
  }

  function renderDamageMarker(damage: DamagePoint) {
    const size = 20;
    const color = '#FF0000';
    
    // Calculate actual position on the image
    const left = (imageLayout.width * damage.x) / 100 + imageLayout.x;
    const top = (imageLayout.height * damage.y) / 100 + imageLayout.y;
    
    switch (damage.markerType) {
      case 'slight-scratch':
        // Small thin line
        return (
          <Svg
            key={damage.id}
            width={size}
            height={size}
            style={[
              styles.damageMarkerSvg,
              {
                left: left - size / 2,
                top: top - size / 2,
              }
            ]}
          >
            <Line x1="2" y1="10" x2="18" y2="10" stroke={color} strokeWidth="1.5" />
          </Svg>
        );
      
      case 'heavy-scratch':
        // Bold thick line
        return (
          <Svg
            key={damage.id}
            width={size}
            height={size}
            style={[
              styles.damageMarkerSvg,
              {
                left: left - size / 2,
                top: top - size / 2,
              }
            ]}
          >
            <Line x1="2" y1="10" x2="18" y2="10" stroke={color} strokeWidth="3.5" />
          </Svg>
        );
      
      case 'bent':
        // Square
        return (
          <Svg
            key={damage.id}
            width={size}
            height={size}
            style={[
              styles.damageMarkerSvg,
              {
                left: left - size / 2,
                top: top - size / 2,
              }
            ]}
          >
            <Rect x="3" y="3" width="14" height="14" stroke={color} strokeWidth="2" fill="none" />
          </Svg>
        );
      
      case 'broken':
        // X mark
        return (
          <Svg
            key={damage.id}
            width={size}
            height={size}
            style={[
              styles.damageMarkerSvg,
              {
                left: left - size / 2,
                top: top - size / 2,
              }
            ]}
          >
            <Line x1="3" y1="3" x2="17" y2="17" stroke={color} strokeWidth="2.5" />
            <Line x1="17" y1="3" x2="3" y2="17" stroke={color} strokeWidth="2.5" />
          </Svg>
        );
      
      default:
        return null;
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>6. Κατάσταση Οχήματος</Text>

        {/* Vehicle Type selector buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.viewButton, vehicleType === 'car' && styles.activeButton]}
            onPress={() => handleVehicleTypeChange('car')}
          >
            <Text style={[styles.buttonText, vehicleType === 'car' && styles.activeButtonText]}>
              ΑΜΑΞΙ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewButton, vehicleType === 'scooter' && styles.activeButton]}
            onPress={() => handleVehicleTypeChange('scooter')}
          >
            <Text style={[styles.buttonText, vehicleType === 'scooter' && styles.activeButtonText]}>
              SCOOTER
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewButton, vehicleType === 'atv' && styles.activeButton]}
            onPress={() => handleVehicleTypeChange('atv')}
          >
            <Text style={[styles.buttonText, vehicleType === 'atv' && styles.activeButtonText]}>
              ATV
            </Text>
          </TouchableOpacity>
        </View>

        {/* View Region Selector */}
        <View style={styles.viewRegionSection}>
          <Text style={styles.viewRegionLabel}>Περιοχή:</Text>
          <View style={styles.viewRegionContainer}>
            <TouchableOpacity
              style={[styles.viewRegionButton, selectedView === 'front' && styles.viewRegionButtonActive]}
              onPress={() => setSelectedView('front')}
            >
              <Text style={[styles.viewRegionText, selectedView === 'front' && styles.viewRegionTextActive]}>
                Μπροστά
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewRegionButton, selectedView === 'rear' && styles.viewRegionButtonActive]}
              onPress={() => setSelectedView('rear')}
            >
              <Text style={[styles.viewRegionText, selectedView === 'rear' && styles.viewRegionTextActive]}>
                Πίσω
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewRegionButton, selectedView === 'left' && styles.viewRegionButtonActive]}
              onPress={() => setSelectedView('left')}
            >
              <Text style={[styles.viewRegionText, selectedView === 'left' && styles.viewRegionTextActive]}>
                Αριστερά
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewRegionButton, selectedView === 'right' && styles.viewRegionButtonActive]}
              onPress={() => setSelectedView('right')}
            >
              <Text style={[styles.viewRegionText, selectedView === 'right' && styles.viewRegionTextActive]}>
                Δεξιά
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Damage Marker Type Selector */}
        <View style={styles.markerSection}>
          <Text style={styles.markerLabel}>Τύπος Ζημιάς:</Text>
          <View style={styles.markerButtonContainer}>
            <TouchableOpacity
              style={[styles.markerButton, selectedMarkerType === 'slight-scratch' && styles.activeMarkerButton]}
              onPress={() => setSelectedMarkerType('slight-scratch')}
            >
              <Svg width="20" height="20">
                <Line x1="2" y1="10" x2="18" y2="10" stroke={selectedMarkerType === 'slight-scratch' ? '#fff' : '#666'} strokeWidth="1.5" />
              </Svg>
              <Text style={[styles.markerButtonText, selectedMarkerType === 'slight-scratch' && styles.activeMarkerButtonText]}>
                Γρατζουνιά
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.markerButton, selectedMarkerType === 'heavy-scratch' && styles.activeMarkerButton]}
              onPress={() => setSelectedMarkerType('heavy-scratch')}
            >
              <Svg width="20" height="20">
                <Line x1="2" y1="10" x2="18" y2="10" stroke={selectedMarkerType === 'heavy-scratch' ? '#fff' : '#666'} strokeWidth="3.5" />
              </Svg>
              <Text style={[styles.markerButtonText, selectedMarkerType === 'heavy-scratch' && styles.activeMarkerButtonText]}>
                Βαθιά
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.markerButton, selectedMarkerType === 'bent' && styles.activeMarkerButton]}
              onPress={() => setSelectedMarkerType('bent')}
            >
              <Svg width="20" height="20">
                <Rect x="3" y="3" width="14" height="14" stroke={selectedMarkerType === 'bent' ? '#fff' : '#666'} strokeWidth="2" fill="none" />
              </Svg>
              <Text style={[styles.markerButtonText, selectedMarkerType === 'bent' && styles.activeMarkerButtonText]}>
                Λαμαρίνα
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.markerButton, selectedMarkerType === 'broken' && styles.activeMarkerButton]}
              onPress={() => setSelectedMarkerType('broken')}
            >
              <Svg width="20" height="20">
                <Line x1="3" y1="3" x2="17" y2="17" stroke={selectedMarkerType === 'broken' ? '#fff' : '#666'} strokeWidth="2.5" />
                <Line x1="17" y1="3" x2="3" y2="17" stroke={selectedMarkerType === 'broken' ? '#fff' : '#666'} strokeWidth="2.5" />
              </Svg>
              <Text style={[styles.markerButtonText, selectedMarkerType === 'broken' && styles.activeMarkerButtonText]}>
                Σπασμένο
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vehicle Diagram Image */}
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.9}
          disabled={!isEditable}
          style={styles.diagramContainer}
          ref={containerRef}
          onLayout={handleContainerLayout}
        >
          <Image
            ref={imageRef}
            source={vehicleImages[vehicleType]}
            style={styles.vehicleImage}
            resizeMode="contain"
            onLoad={handleImageLoad}
          />

          {/* Damage markers overlaid on image */}
          {imageLayout.width > 0 && (
            <View
              style={[
                styles.damageOverlay,
                {
                  width: containerLayout.width,
                  height: containerLayout.height,
                }
              ]}
            >
              {damagePoints.map((damage) => renderDamageMarker(damage))}
            </View>
          )}
        </TouchableOpacity>

        {/* Undo Button and Hint */}
        <View style={styles.footerContainer}>
          <Text style={styles.hint}>
            Πατήστε στο διάγραμμα για να σημειώσετε ζημιές
          </Text>
          {damagePoints.length > 0 && onRemoveLastDamage && (
            <TouchableOpacity
              style={styles.undoButton}
              onPress={onRemoveLastDamage}
            >
              <Text style={styles.undoButtonText}>↶ Αναίρεση</Text>
            </TouchableOpacity>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  section: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 20,
    borderRadius: 10,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  activeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  activeButtonText: {
    color: '#fff',
  },
  diagramContainer: {
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    position: 'relative',
  },
  vehicleImage: {
    width: '100%',
    height: 400,
  },
  damageOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    pointerEvents: 'none',
  },
  damageMarkerSvg: {
    position: 'absolute',
    marginLeft: -10,
    marginTop: -10,
  },
  viewRegionSection: {
    marginBottom: 15,
  },
  viewRegionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewRegionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  viewRegionButton: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  viewRegionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  viewRegionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  viewRegionTextActive: {
    color: '#fff',
  },
  markerSection: {
    marginBottom: 15,
  },
  markerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  markerButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  markerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    minWidth: 90,
  },
  activeMarkerButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  markerButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  activeMarkerButtonText: {
    color: '#fff',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  hint: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  undoButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  undoButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

// Old FrontView function - no longer needed
function FrontView_OLD() {
  return (
    <G>
      {/* Hood/bonnet top edge */}
      <Path
        d="M 80 80 L 220 80"
        stroke="#000"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Windshield */}
      <Path
        d="M 80 80 L 75 120 L 225 120 L 220 80 Z"
        stroke="#000"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Roof */}
      <Rect
        x="75"
        y="120"
        width="150"
        height="80"
        stroke="#000"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Front bumper curved shape */}
      <Path
        d="M 90 230 Q 85 240, 80 250 L 80 290 Q 90 300, 100 305"
        stroke="#000"
        strokeWidth="2.5"
        fill="none"
      />
      <Path
        d="M 210 230 Q 215 240, 220 250 L 220 290 Q 210 300, 200 305"
        stroke="#000"
        strokeWidth="2.5"
        fill="none"
      />
      
      {/* Front hood */}
      <Path
        d="M 100 305 L 90 230 L 210 230 L 200 305 Z"
        stroke="#000"
        strokeWidth="2"
        fill="none"
      />
      <Line x1="100" y1="260" x2="200" y2="260" stroke="#000" strokeWidth="1.5" />
      
      {/* Front grille/bumper */}
      <Path
        d="M 100 305 L 110 330 L 190 330 L 200 305"
        stroke="#000"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Headlights */}
      <Ellipse cx="120" cy="315" rx="15" ry="10" stroke="#000" strokeWidth="2" fill="none" />
      <Ellipse cx="180" cy="315" rx="15" ry="10" stroke="#000" strokeWidth="2" fill="none" />
      
      {/* Front wheels */}
      <Circle cx="70" cy="270" r="25" stroke="#000" strokeWidth="3" fill="none" />
      <Circle cx="70" cy="270" r="15" stroke="#000" strokeWidth="1.5" fill="none" />
      
      <Circle cx="230" cy="270" r="25" stroke="#000" strokeWidth="3" fill="none" />
      <Circle cx="230" cy="270" r="15" stroke="#000" strokeWidth="1.5" fill="none" />
      
      {/* Side mirrors */}
      <Ellipse cx="55" cy="140" rx="12" ry="8" stroke="#000" strokeWidth="2" fill="none" />
      <Ellipse cx="245" cy="140" rx="12" ry="8" stroke="#000" strokeWidth="2" fill="none" />
      
      {/* License plate */}
      <Rect x="130" y="335" width="40" height="15" stroke="#000" strokeWidth="1.5" fill="none" />
    </G>
  );
}

// Old RearView function - no longer needed
function RearView_OLD() {
  return (
    <G>
      {/* Trunk top edge */}
      <Path
        d="M 80 80 L 220 80"
        stroke="#000"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Rear windshield */}
      <Path
        d="M 80 80 L 75 120 L 225 120 L 220 80 Z"
        stroke="#000"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Roof */}
      <Rect
        x="75"
        y="120"
        width="150"
        height="80"
        stroke="#000"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Rear fenders curved */}
      <Path
        d="M 90 230 Q 85 240, 80 250 L 80 290 Q 90 300, 100 305"
        stroke="#000"
        strokeWidth="2.5"
        fill="none"
      />
      <Path
        d="M 210 230 Q 215 240, 220 250 L 220 290 Q 210 300, 200 305"
        stroke="#000"
        strokeWidth="2.5"
        fill="none"
      />
      
      {/* Trunk */}
      <Path
        d="M 100 305 L 90 230 L 210 230 L 200 305 Z"
        stroke="#000"
        strokeWidth="2"
        fill="none"
      />
      <Line x1="100" y1="260" x2="200" y2="260" stroke="#000" strokeWidth="1.5" />
      
      {/* Rear bumper */}
      <Path
        d="M 100 305 L 110 330 L 190 330 L 200 305"
        stroke="#000"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Taillights */}
      <Rect x="105" y="310" width="20" height="15" stroke="#000" strokeWidth="2" fill="none" />
      <Rect x="175" y="310" width="20" height="15" stroke="#000" strokeWidth="2" fill="none" />
      
      {/* Rear wheels */}
      <Circle cx="70" cy="270" r="25" stroke="#000" strokeWidth="3" fill="none" />
      <Circle cx="70" cy="270" r="15" stroke="#000" strokeWidth="1.5" fill="none" />
      
      <Circle cx="230" cy="270" r="25" stroke="#000" strokeWidth="3" fill="none" />
      <Circle cx="230" cy="270" r="15" stroke="#000" strokeWidth="1.5" fill="none" />
      
      {/* Exhaust pipe */}
      <Circle cx="185" cy="335" r="5" stroke="#000" strokeWidth="2" fill="none" />
      
      {/* License plate */}
      <Rect x="130" y="335" width="40" height="15" stroke="#000" strokeWidth="1.5" fill="none" />
    </G>
  );
}

// Old LeftView function - no longer needed
function LeftView_OLD() {
  return (
    <G>
      {/* Car body outline - side profile */}
      <Path
        d="M 60 140 L 70 120 L 100 110 L 140 105 L 180 110 L 210 120 L 220 140 L 225 200 L 220 260 L 210 280 L 180 290 L 140 295 L 100 290 L 70 280 L 60 260 Z"
        stroke="#000"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Windows */}
      {/* Windshield */}
      <Path
        d="M 72 125 L 95 115 L 95 150 L 75 150 Z"
        stroke="#000"
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Front door window */}
      <Rect
        x="100"
        y="115"
        width="35"
        height="35"
        stroke="#000"
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Rear door window */}
      <Rect
        x="140"
        y="115"
        width="35"
        height="35"
        stroke="#000"
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Rear windshield */}
      <Path
        d="M 180 115 L 205 125 L 205 150 L 180 150 Z"
        stroke="#000"
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Door separations */}
      <Line x1="100" y1="150" x2="100" y2="270" stroke="#000" strokeWidth="2" />
      <Line x1="135" y1="150" x2="135" y2="270" stroke="#000" strokeWidth="2" />
      <Line x1="140" y1="150" x2="140" y2="270" stroke="#000" strokeWidth="2" />
      <Line x1="175" y1="150" x2="175" y2="270" stroke="#000" strokeWidth="2" />
      
      {/* Door handles */}
      <Line x1="115" y1="200" x2="125" y2="200" stroke="#000" strokeWidth="2" />
      <Line x1="155" y1="200" x2="165" y2="200" stroke="#000" strokeWidth="2" />
      
      {/* Side mirror */}
      <Ellipse cx="85" cy="145" rx="8" ry="12" stroke="#000" strokeWidth="2" fill="none" />
      <Line x1="90" y1="145" x2="95" y2="145" stroke="#000" strokeWidth="2" />
      
      {/* Front wheel */}
      <Circle cx="95" cy="280" r="28" stroke="#000" strokeWidth="3" fill="none" />
      <Circle cx="95" cy="280" r="18" stroke="#000" strokeWidth="1.5" fill="none" />
      
      {/* Rear wheel */}
      <Circle cx="185" cy="280" r="28" stroke="#000" strokeWidth="3" fill="none" />
      <Circle cx="185" cy="280" r="18" stroke="#000" strokeWidth="1.5" fill="none" />
      
      {/* Front bumper detail */}
      <Ellipse cx="65" cy="270" rx="8" ry="12" stroke="#000" strokeWidth="1.5" fill="none" />
      
      {/* Rear bumper detail */}
      <Ellipse cx="215" cy="270" rx="8" ry="12" stroke="#000" strokeWidth="1.5" fill="none" />
    </G>
  );
}

// Old RightView function - no longer needed  
function RightView_OLD() {
  return (
    <G>
      {/* Car body outline - side profile (mirrored) */}
      <Path
        d="M 240 140 L 230 120 L 200 110 L 160 105 L 120 110 L 90 120 L 80 140 L 75 200 L 80 260 L 90 280 L 120 290 L 160 295 L 200 290 L 230 280 L 240 260 Z"
        stroke="#000"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Windows (mirrored) */}
      {/* Windshield */}
      <Path
        d="M 228 125 L 205 115 L 205 150 L 225 150 Z"
        stroke="#000"
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Front door window */}
      <Rect
        x="165"
        y="115"
        width="35"
        height="35"
        stroke="#000"
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Rear door window */}
      <Rect
        x="125"
        y="115"
        width="35"
        height="35"
        stroke="#000"
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Rear windshield */}
      <Path
        d="M 120 115 L 95 125 L 95 150 L 120 150 Z"
        stroke="#000"
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Door separations */}
      <Line x1="200" y1="150" x2="200" y2="270" stroke="#000" strokeWidth="2" />
      <Line x1="165" y1="150" x2="165" y2="270" stroke="#000" strokeWidth="2" />
      <Line x1="160" y1="150" x2="160" y2="270" stroke="#000" strokeWidth="2" />
      <Line x1="125" y1="150" x2="125" y2="270" stroke="#000" strokeWidth="2" />
      
      {/* Door handles */}
      <Line x1="185" y1="200" x2="175" y2="200" stroke="#000" strokeWidth="2" />
      <Line x1="145" y1="200" x2="135" y2="200" stroke="#000" strokeWidth="2" />
      
      {/* Side mirror */}
      <Ellipse cx="215" cy="145" rx="8" ry="12" stroke="#000" strokeWidth="2" fill="none" />
      <Line x1="210" y1="145" x2="205" y2="145" stroke="#000" strokeWidth="2" />
      
      {/* Front wheel */}
      <Circle cx="205" cy="280" r="28" stroke="#000" strokeWidth="3" fill="none" />
      <Circle cx="205" cy="280" r="18" stroke="#000" strokeWidth="1.5" fill="none" />
      
      {/* Rear wheel */}
      <Circle cx="115" cy="280" r="28" stroke="#000" strokeWidth="3" fill="none" />
      <Circle cx="115" cy="280" r="18" stroke="#000" strokeWidth="1.5" fill="none" />
      
      {/* Front bumper detail */}
      <Ellipse cx="235" cy="270" rx="8" ry="12" stroke="#000" strokeWidth="1.5" fill="none" />
      
      {/* Rear bumper detail */}
      <Ellipse cx="85" cy="270" rx="8" ry="12" stroke="#000" strokeWidth="1.5" fill="none" />
    </G>
  );
}
