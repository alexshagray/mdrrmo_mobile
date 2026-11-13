import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  X,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react-native';

export interface PhotoSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromGallery: () => void;
  onRemovePhoto?: () => void;
  hasExistingPhoto?: boolean;
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
}

export function PhotoSelectModal({
  visible,
  onClose,
  onTakePhoto,
  onChooseFromGallery,
  onRemovePhoto,
  hasExistingPhoto = false,
  title = 'Change Profile Photo',
  subtitle = 'Select an option to update your profile photo',
  isLoading = false,
}: PhotoSelectModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsConfirmingRemove(false);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 26,
          bounciness: 5,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
      setIsConfirmingRemove(false);
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  const handleClose = () => {
    if (isLoading) return;
    setIsConfirmingRemove(false);
    onClose();
  };

  const handleTake = () => {
    if (isLoading) return;
    onClose();
    setTimeout(() => {
      onTakePhoto();
    }, 120);
  };

  const handleGallery = () => {
    if (isLoading) return;
    onClose();
    setTimeout(() => {
      onChooseFromGallery();
    }, 120);
  };

  const handleConfirmRemove = () => {
    if (isLoading || !onRemovePhoto) return;
    onClose();
    setTimeout(() => {
      onRemovePhoto();
    }, 120);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Close Button */}
              <TouchableOpacity
                onPress={handleClose}
                disabled={isLoading}
                activeOpacity={0.7}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
              >
                <X size={18} color="#94A3B8" strokeWidth={2.4} />
              </TouchableOpacity>

              {!isConfirmingRemove ? (
                /* Main Options Mode */
                <>
                  {/* Glowing Camera Icon Header */}
                  <View style={styles.outerIconRing}>
                    <View style={styles.innerIconBadge}>
                      <Camera size={26} color="#208AEF" strokeWidth={2.4} />
                    </View>
                  </View>

                  {/* Header Tag */}
                  <View style={styles.statusBadge}>
                    <Sparkles size={11} color="#208AEF" strokeWidth={2.4} style={{ marginRight: 5 }} />
                    <Text style={styles.statusText}>PROFILE AVATAR</Text>
                  </View>

                  {/* Title & Body */}
                  <Text style={styles.titleText}>{title}</Text>
                  <Text style={styles.subtitleText}>{subtitle}</Text>

                  {/* Option 1: Take Photo */}
                  <TouchableOpacity
                    onPress={handleTake}
                    disabled={isLoading}
                    activeOpacity={0.82}
                    style={styles.optionTile}
                  >
                    <View style={[styles.tileIconContainer, styles.tileIconBlue]}>
                      <Camera size={20} color="#208AEF" strokeWidth={2.3} />
                    </View>
                    <View style={styles.tileTextContainer}>
                      <Text style={styles.tileTitle}>Take Photo</Text>
                      <Text style={styles.tileSubtitle}>Use device camera to snap a new photo</Text>
                    </View>
                    <ChevronRight size={17} color="#94A3B8" strokeWidth={2.3} />
                  </TouchableOpacity>

                  {/* Option 2: Choose from Gallery */}
                  <TouchableOpacity
                    onPress={handleGallery}
                    disabled={isLoading}
                    activeOpacity={0.82}
                    style={styles.optionTile}
                  >
                    <View style={[styles.tileIconContainer, styles.tileIconIndigo]}>
                      <ImageIcon size={20} color="#4F46E5" strokeWidth={2.3} />
                    </View>
                    <View style={styles.tileTextContainer}>
                      <Text style={styles.tileTitle}>Choose from Gallery</Text>
                      <Text style={styles.tileSubtitle}>Select an image from your device photos</Text>
                    </View>
                    <ChevronRight size={17} color="#94A3B8" strokeWidth={2.3} />
                  </TouchableOpacity>

                  {/* Option 3: Remove Current Photo (Conditional) */}
                  {hasExistingPhoto && onRemovePhoto && (
                    <TouchableOpacity
                      onPress={() => setIsConfirmingRemove(true)}
                      disabled={isLoading}
                      activeOpacity={0.82}
                      style={[styles.optionTile, styles.optionTileRemove]}
                    >
                      <View style={[styles.tileIconContainer, styles.tileIconRed]}>
                        <Trash2 size={20} color="#EF4444" strokeWidth={2.3} />
                      </View>
                      <View style={styles.tileTextContainer}>
                        <Text style={styles.tileTitleRed}>Remove Current Photo</Text>
                        <Text style={styles.tileSubtitle}>Revert avatar to your default initials</Text>
                      </View>
                      <ChevronRight size={17} color="#FDA4AF" strokeWidth={2.3} />
                    </TouchableOpacity>
                  )}

                  {/* Cancel Button */}
                  <TouchableOpacity
                    onPress={handleClose}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* Remove Confirmation Mode */
                <>
                  <View style={[styles.outerIconRing, styles.outerIconRingRed]}>
                    <View style={[styles.innerIconBadge, styles.innerIconBadgeRed]}>
                      <AlertTriangle size={26} color="#DC2626" strokeWidth={2.4} />
                    </View>
                  </View>

                  <View style={[styles.statusBadge, styles.statusBadgeRed]}>
                    <View style={styles.statusDotRed} />
                    <Text style={styles.statusTextRed}>CONFIRM REMOVAL</Text>
                  </View>

                  <Text style={styles.titleText}>Remove Profile Photo?</Text>
                  <Text style={styles.subtitleText}>
                    Are you sure you want to remove your profile photo? Your account will show your initials instead.
                  </Text>

                  <View style={styles.confirmActionContainer}>
                    <TouchableOpacity
                      onPress={handleConfirmRemove}
                      disabled={isLoading}
                      activeOpacity={0.85}
                      style={styles.destructiveBtn}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Trash2 size={16} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 8 }} />
                          <Text style={styles.destructiveBtnText}>Yes, Remove Photo</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setIsConfirmingRemove(false)}
                      disabled={isLoading}
                      activeOpacity={0.8}
                      style={styles.cancelBtn}
                    >
                      <Text style={styles.cancelBtnText}>Keep Current Photo</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 10,
  },
  outerIconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  outerIconRingRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  innerIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 3,
  },
  innerIconBadgeRed: {
    shadowColor: '#DC2626',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 10,
  },
  statusBadgeRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusDotRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#208AEF',
    letterSpacing: 0.8,
  },
  statusTextRed: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
    marginBottom: 18,
  },
  optionTile: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  optionTileRemove: {
    backgroundColor: '#FFFBFB',
    borderColor: '#FEE2E2',
  },
  tileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  tileIconBlue: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  tileIconIndigo: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  tileIconRed: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  tileTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.1,
  },
  tileTitleRed: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: -0.1,
  },
  tileSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1.5,
  },
  cancelBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  confirmActionContainer: {
    width: '100%',
    marginTop: 4,
  },
  destructiveBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#DC2626',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  destructiveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
