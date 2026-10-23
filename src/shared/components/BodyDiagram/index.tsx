import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Modal,
  Platform,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Info, X, Activity, Search, Plus, Check } from 'lucide-react-native';

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

const DEFAULT_INJURY_TYPES = [
  'Abrasion',
  'Amputation',
  'Avulsion',
  'Burns',
  'Contusion',
  'Fracture',
  'Laceration',
  'Punctured',
  'Swelling',
];

const INJURY_TYPES_STORAGE_KEY = '@mdrrmo_custom_injury_types';

export const BodyDiagram: React.FC<BodyDiagramProps> = ({ markers, onAddMarker, onRemoveMarker }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingMarker, setPendingMarker] = useState<{ x: number; y: number } | null>(null);

  // Injury types list (persisted in AsyncStorage across all patients)
  const [injuryTypes, setInjuryTypes] = useState<string[]>(DEFAULT_INJURY_TYPES);

  // Search input and debounce state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Add new injury type input state
  const [isAdding, setIsAdding] = useState(false);
  const [newInjuryName, setNewInjuryName] = useState('');

  // Load custom injury types on mount
  useEffect(() => {
    const loadTypes = async () => {
      try {
        const stored = await AsyncStorage.getItem(INJURY_TYPES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInjuryTypes(parsed);
          }
        }
      } catch (err) {
        console.warn('Error loading custom injury types:', err);
      }
    };
    loadTypes();
  }, []);

  // Save injury types helper
  const persistInjuryTypes = async (types: string[]) => {
    try {
      await AsyncStorage.setItem(INJURY_TYPES_STORAGE_KEY, JSON.stringify(types));
    } catch (err) {
      console.warn('Error saving custom injury types:', err);
    }
  };

  // Search debounce timer (250ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Filtered injury types based on debounced search query
  const filteredInjuryTypes = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return injuryTypes;
    return injuryTypes.filter((item) => item.toLowerCase().includes(q));
  }, [injuryTypes, debouncedQuery]);

  const handlePress = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    setPendingMarker({ x: locationX, y: locationY });
    setSearchQuery('');
    setDebouncedQuery('');
    setIsAdding(false);
    setNewInjuryName('');
    setModalVisible(true);
  };

  const handleSelectInjury = (type: string) => {
    if (pendingMarker) {
      onAddMarker({
        x: pendingMarker.x,
        y: pendingMarker.y,
        id: Date.now().toString(),
        label: type,
      });
    }
    setModalVisible(false);
    setPendingMarker(null);
  };

  const handleAddInjuryType = async (customName?: string) => {
    const nameToAdd = (customName || newInjuryName).trim();
    if (!nameToAdd) {
      Alert.alert('Invalid Name', 'Please enter an injury type name.');
      return;
    }

    // Capitalize first letter of each word
    const formatted = nameToAdd
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const exists = injuryTypes.some((t) => t.toLowerCase() === formatted.toLowerCase());
    if (exists) {
      Alert.alert('Already Exists', `"${formatted}" is already in the list.`);
      return;
    }

    const updated = [...injuryTypes, formatted];
    setInjuryTypes(updated);
    await persistInjuryTypes(updated);
    setNewInjuryName('');
    setIsAdding(false);
    setSearchQuery('');
  };

  const handleLongPressDelete = (itemToDelete: string) => {
    Alert.alert(
      'Delete Injury Type',
      `Are you sure you want to delete "${itemToDelete}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = injuryTypes.filter((t) => t !== itemToDelete);
            setInjuryTypes(updated);
            await persistInjuryTypes(updated);
          },
        },
      ]
    );
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
          <View
            style={{ position: 'absolute', bottom: 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around' }}
            pointerEvents="none"
          >
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              {/* Header with Title, Add (+) button, and Close (X) button */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Select Injury Type</Text>
                  <Text style={styles.modalSubtitle}>Hold to delete • Tap to select</Text>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    onPress={() => setIsAdding((prev) => !prev)}
                    style={[styles.actionButton, isAdding && styles.actionButtonActive]}
                    accessibilityLabel="Add new injury type"
                  >
                    <Plus size={18} color={isAdding ? '#fff' : '#0284c7'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.actionButton}
                    accessibilityLabel="Close"
                  >
                    <X size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Add New Injury Inline Input */}
              {isAdding && (
                <View style={styles.addInputRow}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Enter new injury type name..."
                    placeholderTextColor="#94a3b8"
                    value={newInjuryName}
                    onChangeText={setNewInjuryName}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => handleAddInjuryType()}
                  />
                  <TouchableOpacity
                    style={styles.addSaveButton}
                    onPress={() => handleAddInjuryType()}
                  >
                    <Check size={16} color="#fff" />
                    <Text style={styles.addSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Debounced Search Input */}
              <View style={styles.searchContainer}>
                <Search size={16} color="#94a3b8" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search injury types..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                    <X size={14} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Scrollable Injury Badges Grid */}
              <ScrollView
                style={styles.scrollGrid}
                contentContainerStyle={styles.injuryGrid}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {filteredInjuryTypes.length > 0 ? (
                  filteredInjuryTypes.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.injuryBadge}
                      onPress={() => handleSelectInjury(item)}
                      onLongPress={() => handleLongPressDelete(item)}
                      delayLongPress={450}
                    >
                      <Text style={styles.injuryBadgeText}>{item}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No matching injury types found.</Text>
                    {searchQuery.trim().length > 0 && (
                      <TouchableOpacity
                        style={styles.quickAddButton}
                        onPress={() => handleAddInjuryType(searchQuery)}
                      >
                        <Plus size={16} color="#0284c7" />
                        <Text style={styles.quickAddText}>
                          Add "{searchQuery.trim()}" as new type
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
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
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '80%',
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
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#0284c7',
  },
  addInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    padding: 4,
    paddingLeft: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  addInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  addSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addSaveText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    marginBottom: 14,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    height: '100%',
  },
  clearSearchButton: {
    padding: 6,
  },
  scrollGrid: {
    maxHeight: 290,
  },
  injuryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 10,
  },
  injuryBadge: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    flexGrow: 1,
    alignItems: 'center',
    minWidth: '45%',
  },
  injuryBadgeText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '700',
  },
  emptyContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    marginBottom: 12,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  quickAddText: {
    fontSize: 13,
    color: '#0369a1',
    fontWeight: '700',
  },
});
