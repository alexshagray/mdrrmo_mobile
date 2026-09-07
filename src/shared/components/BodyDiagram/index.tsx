import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image, Modal, Platform } from 'react-native';
import { Info, X, Activity } from 'lucide-react-native';

export interface Marker {
  x: number;
  y: number;
  id: string;
  label?: string;
}

interface BodyDiagramProps {
  markers: Marker[];
  onAddMarker: (marker: Marker) => void;
  onRemoveMarker: (id: string) => void;
}

const INJURY_TYPES = [
  'Abrasion', 'Amputation', 'Avulsion', 'Burns', 
  'Contusion', 'Fracture', 'Laceration', 'Punctured', 'Swelling'
];

export const BodyDiagram: React.FC<BodyDiagramProps> = ({ markers, onAddMarker, onRemoveMarker }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingMarker, setPendingMarker] = useState<{x: number, y: number} | null>(null);

  const handlePress = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    setPendingMarker({ x: locationX, y: locationY });
    setModalVisible(true);
  };

  const handleSelectInjury = (type: string) => {
    if (pendingMarker) {
      onAddMarker({
        x: pendingMarker.x,
        y: pendingMarker.y,
        id: Date.now().toString(),
        label: type
      });
    }
    setModalVisible(false);
    setPendingMarker(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBanner}>
        <Info size={20} color="#0369a1" />
        <Text style={styles.instructions}>Tap on the figure to mark injuries. Tap a marker to remove it.</Text>
      </View>
      
      <View style={styles.diagramWrapper}>
        <TouchableOpacity activeOpacity={1} onPress={handlePress} style={styles.diagramArea}>
          <Image 
            source={require('../../../../assets/images/bodydiagram-removebg-preview.png')} 
            style={{ width: '100%', height: '100%', resizeMode: 'contain' }} 
          />
          {markers.map((marker) => (
            <TouchableOpacity
              key={marker.id}
              style={[styles.markerContainer, { left: marker.x - 16, top: marker.y - 16 }]}
              onPress={() => onRemoveMarker(marker.id)}
            >
              <View style={styles.markerRipple} />
              <View style={styles.markerInner}>
                <Activity size={12} color="#fff" />
              </View>
              {marker.label && (
                <View style={styles.labelBubble}>
                  <Text style={styles.labelText}>{marker.label}</Text>
                  <View style={styles.labelPointer} />
                </View>
              )}
            </TouchableOpacity>
          ))}
          <View style={{ position: 'absolute', bottom: 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around' }} pointerEvents="none">
            <Text style={styles.sideLabel}>FRONT</Text>
            <Text style={styles.sideLabel}>BACK</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Injury Type</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.injuryGrid}>
              {INJURY_TYPES.map((item) => (
                <TouchableOpacity key={item} style={styles.injuryBadge} onPress={() => handleSelectInjury(item)}>
                  <Text style={styles.injuryBadgeText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  instructions: {
    fontSize: 14,
    color: '#0369a1',
    marginLeft: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  diagramWrapper: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    width: '100%',
    alignItems: 'center',
  },
  diagramArea: {
    width: 320,
    height: 550,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  markerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    width: 32,
    height: 32,
  },
  markerRipple: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(225, 29, 72, 0.25)',
  },
  markerInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e11d48',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  labelBubble: {
    position: 'absolute',
    top: -40,
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    alignItems: 'center',
    width: 110,
  },
  labelPointer: {
    position: 'absolute',
    bottom: -4,
    width: 10,
    height: 10,
    backgroundColor: '#1e293b',
    transform: [{ rotate: '45deg' }],
  },
  labelText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  sideLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  injuryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  injuryBadge: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    flexGrow: 1,
    alignItems: 'center',
  },
  injuryBadgeText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '700',
  },
});
