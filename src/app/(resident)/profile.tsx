import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import {
  User,
  FileText,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
  Shield,
  Edit3,
  Camera,
  Mail,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Settings,
} from 'lucide-react-native';
import { useAuth } from '@/shared/hooks';
import { Avatar, BrandBackground, PhotoSelectModal } from '@/shared/components';
import { getResidentProfileApi, uploadResidentPhotoApi, deleteResidentPhotoApi } from '@/shared/api/residents';
import { getMyReports, markReportsHistoryViewed, getUnviewedReportsCount } from '@/shared/api/incidents';
import { resolveImageUrl } from '@/shared/utils/imageUrl';

interface MenuItemProps {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  iconColor: string;
  iconBgColor: string;
  iconBorderColor: string;
  title: string;
  description: string;
  badgeCount?: number;
  onPress: () => void;
  showDivider?: boolean;
}

function ProfileMenuItem({
  icon: IconComponent,
  iconColor,
  iconBgColor,
  iconBorderColor,
  title,
  description,
  badgeCount,
  onPress,
  showDivider = false,
}: MenuItemProps) {
  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.menuItem}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View
          style={[
            styles.menuIconContainer,
            { backgroundColor: iconBgColor, borderColor: iconBorderColor },
          ]}
        >
          <IconComponent size={20} color={iconColor} strokeWidth={2.2} />
        </View>

        <View style={styles.menuTextContainer}>
          <View style={styles.menuTitleRow}>
            <Text style={styles.menuTitle}>{title}</Text>
            {typeof badgeCount === 'number' && badgeCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{badgeCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.menuDescription}>{description}</Text>
        </View>

        <ChevronRight size={19} color="#94A3B8" strokeWidth={2.2} />
      </TouchableOpacity>
      {showDivider && <View style={styles.itemDivider} />}
    </>
  );
}

export default function ResidentProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();

  const [profileData, setProfileData] = useState<any>(null);
  const [reportCount, setReportCount] = useState<number>(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const [res, repRes] = await Promise.allSettled([
        getResidentProfileApi(),
        getMyReports(),
      ]);

      if (res.status === 'fulfilled') {
        setProfileData(res.value);
      }
      if (repRes.status === 'fulfilled') {
        const list = repRes.value?.data || repRes.value?.incidents || (Array.isArray(repRes.value) ? repRes.value : []);
        const unviewed = await getUnviewedReportsCount(list);
        setReportCount(unviewed);
      }
    } catch (e) {
      console.error('Failed to load resident profile data:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const currentUser = profileData?.user || user;
  const isVerified = currentUser?.verification_status === 'Verified' || (currentUser?.is_verified === true && currentUser?.verification_status !== 'Pending');
  const fullName = currentUser
    ? `${currentUser.first_name || ''} ${currentUser.middle_name ? currentUser.middle_name + ' ' : ''}${currentUser.last_name || ''}`.trim() || 'Resident Citizen'
    : 'Resident Citizen';
  const email = currentUser?.email || 'resident@example.com';
  const phone = currentUser?.phone_number || currentUser?.phone || 'No phone registered';
  const photoUrl = resolveImageUrl(currentUser?.profile_photo_url);

  // Photo Upload & Delete Actions
  const handleUploadPhoto = async (uri: string) => {
    try {
      setIsUploadingPhoto(true);
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      const formData = new FormData();
      formData.append('photo', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: type,
      } as any);

      await uploadResidentPhotoApi(formData);
      await refreshUser?.();
      await loadProfile();
      Toast.show({
        type: 'success',
        text1: 'Photo Updated',
        text2: 'Your profile photo has been updated successfully.',
      });
    } catch (err: any) {
      console.error('Photo upload error:', err);
      Alert.alert('Upload Failed', err?.response?.data?.message || 'Could not update profile photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take a profile photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        await handleUploadPhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Camera error:', e);
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required to choose a profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        await handleUploadPhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Gallery picker error:', e);
    }
  };

  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const handleRemovePhoto = async () => {
    try {
      setIsUploadingPhoto(true);
      await deleteResidentPhotoApi();
      await refreshUser?.();
      await loadProfile();
      Toast.show({
        type: 'success',
        text1: 'Photo Removed',
        text2: 'Your profile photo has been removed.',
      });
    } catch (e: any) {
      Alert.alert('Error', 'Failed to remove profile photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoAction = () => {
    setShowPhotoModal(true);
  };

  const handleOpenReportsHistory = async () => {
    setReportCount(0);
    await markReportsHistoryViewed();
    router.navigate('/(resident)/my-reports');
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      router.replace('/login');
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Signature Blue Curve */}
      <BrandBackground variant="profile" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Top Header Row with Shield, Title, Subtitle, and Settings Button */}
        <View style={styles.headerBar}>
          <View style={styles.headerTitleGroup}>
            <View style={styles.headerIconBox}>
              <Shield size={18} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Resident Profile</Text>
              <Text style={styles.headerSubtitle}>OPOL RESQ • CITIZEN PORTAL</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(resident)/account-security')}
            activeOpacity={0.7}
            style={styles.headerSettingsBtn}
            accessibilityRole="button"
            accessibilityLabel="Account Settings & Security"
          >
            <Settings size={20} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Resident Profile Card */}
          <View style={styles.profileCard}>
            {/* Avatar & Camera Trigger */}
            <View style={styles.avatarWrapper}>
              <TouchableOpacity
                onPress={handlePhotoAction}
                activeOpacity={0.85}
                style={styles.avatarButton}
              >
                {photoUrl ? (
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Avatar
                    name={fullName}
                    size="xl"
                    className="bg-[#1E88E5] text-white font-bold"
                  />
                )}

                {isUploadingPhoto && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePhotoAction}
                style={styles.cameraBadge}
                activeOpacity={0.8}
                accessibilityLabel="Change profile photo"
              >
                <Camera size={15} color="#FFFFFF" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            {/* Resident Full Name */}
            <Text style={styles.residentName}>{fullName}</Text>

            {/* Verification Status Badge */}
            {isVerified ? (
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={13} color="#1E88E5" strokeWidth={2.4} style={{ marginRight: 6 }} />
                <Text style={styles.verifiedBadgeText}>VERIFIED RESIDENT</Text>
              </View>
            ) : (
              <View style={styles.pendingBadge}>
                <ShieldAlert size={13} color="#D97706" strokeWidth={2.4} style={{ marginRight: 6 }} />
                <Text style={styles.pendingBadgeText}>PENDING VERIFICATION</Text>
              </View>
            )}

            {/* Divider */}
            <View style={styles.cardDivider} />

            {/* Contact Details (Email & Phone) */}
            <View style={styles.contactContainer}>
              <View style={styles.contactRow}>
                <View style={styles.contactIconContainer}>
                  <Mail size={15} color="#64748B" strokeWidth={2} />
                </View>
                <Text style={styles.contactText}>{email}</Text>
              </View>

              <View style={styles.contactRow}>
                <View style={styles.contactIconContainer}>
                  <Smartphone size={15} color="#64748B" strokeWidth={2} />
                </View>
                <Text style={styles.contactText}>{phone}</Text>
              </View>
            </View>

            {/* Profile Completion Notification for Pending Residents */}
            {!isVerified && (
              <View style={styles.pendingBannerCard}>
                <View style={styles.pendingBannerHeader}>
                  <AlertCircle size={15} color="#D97706" strokeWidth={2.2} style={{ marginRight: 6 }} />
                  <Text style={styles.pendingBannerTitle}>Verification Required</Text>
                </View>
                <Text style={styles.pendingBannerText}>
                  Complete your personal information to unlock the accident reporting feature.
                </Text>
              </View>
            )}

            {/* Edit Personal Details Button */}
            <TouchableOpacity
              onPress={() => router.push('/(resident)/personal-info')}
              style={styles.editDetailsButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Edit Personal Details"
            >
              <Edit3 size={15} color="#334155" strokeWidth={2.2} style={{ marginRight: 7 }} />
              <Text style={styles.editDetailsText}>Edit Personal Details</Text>
            </TouchableOpacity>
          </View>

          {/* Section 1: Identity & Profile */}
          <Text style={styles.sectionHeading}>Personal Profile</Text>
          <View style={styles.unifiedCard}>
            <ProfileMenuItem
              icon={User}
              iconColor="#1E88E5"
              iconBgColor="#EFF6FF"
              iconBorderColor="#DBEAFE"
              title="Personal Information"
              description="Name, birthdate, gender, and home address"
              onPress={() => router.navigate('/(resident)/personal-info')}
              showDivider={false}
            />
          </View>

          {/* Section 2: Activity & History */}
          <Text style={styles.sectionHeading}>Activity & History</Text>
          <View style={styles.unifiedCard}>
            <ProfileMenuItem
              icon={FileText}
              iconColor="#D97706"
              iconBgColor="#FFFBEB"
              iconBorderColor="#FEF3C7"
              title="Emergency Request History"
              description="Submitted requests, dispatch timeline & status"
              badgeCount={reportCount}
              onPress={handleOpenReportsHistory}
              showDivider={false}
            />
          </View>

          {/* Section 3: Security & Support */}
          <Text style={styles.sectionHeading}>Security & Support</Text>
          <View style={styles.unifiedCard}>
            <ProfileMenuItem
              icon={Lock}
              iconColor="#475569"
              iconBgColor="#F1F5F9"
              iconBorderColor="#E2E8F0"
              title="Account & Security"
              description="Change password & account credentials"
              onPress={() => router.navigate('/(resident)/account-security')}
              showDivider={true}
            />
            <ProfileMenuItem
              icon={HelpCircle}
              iconColor="#0891B2"
              iconBgColor="#ECFEFF"
              iconBorderColor="#CFFAFE"
              title="Help & Support"
              description="Emergency response workflow, FAQs & office info"
              onPress={() => router.navigate('/(resident)/help-support')}
              showDivider={false}
            />
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.signOutButton}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Sign Out of Account"
          >
            <LogOut size={17} color="#DC2626" strokeWidth={2.2} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Log Out Confirmation Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showLogoutModal}
          onRequestClose={() => !isLoggingOut && setShowLogoutModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => !isLoggingOut && setShowLogoutModal(false)}
            style={styles.modalOverlay}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalCard}
            >
              {/* Icon Badge */}
              <View style={styles.modalIconBadge}>
                <View style={styles.modalIconInner}>
                  <LogOut size={24} color="#DC2626" strokeWidth={2.4} />
                </View>
              </View>

              {/* Title & Message */}
              <Text style={styles.modalTitle}>Log Out</Text>
              <Text style={styles.modalDescription}>
                Are you sure you want to log out?
              </Text>

              {/* Action Buttons */}
              <View style={styles.modalButtonGroup}>
                <TouchableOpacity
                  onPress={handleLogoutConfirm}
                  disabled={isLoggingOut}
                  activeOpacity={0.85}
                  style={styles.modalConfirmBtn}
                >
                  {isLoggingOut ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <LogOut size={16} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 8 }} />
                      <Text style={styles.modalConfirmText}>Yes, Log Out</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowLogoutModal(false)}
                  disabled={isLoggingOut}
                  activeOpacity={0.7}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Custom High-End Profile Photo Selection Modal */}
        <PhotoSelectModal
          visible={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          onTakePhoto={takePhoto}
          onChooseFromGallery={pickFromGallery}
          onRemovePhoto={handleRemovePhoto}
          hasExistingPhoto={Boolean(photoUrl)}
          isLoading={isUploadingPhoto}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FC',
  },
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  headerSettingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 130, // Ample clearance so bottom floating bar never covers content
  },

  // Main Resident Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    marginBottom: 22,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F1F5F9',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  residentName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 20,
    marginBottom: 14,
  },
  verifiedBadgeText: {
    color: '#1E88E5',
    fontWeight: '800',
    fontSize: 11.5,
    letterSpacing: 0.8,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 20,
    marginBottom: 14,
  },
  pendingBadgeText: {
    color: '#D97706',
    fontWeight: '800',
    fontSize: 11.5,
    letterSpacing: 0.8,
  },
  pendingBannerCard: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  pendingBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  pendingBannerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#B45309',
  },
  pendingBannerText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
    fontWeight: '500',
  },
  cardDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 14,
  },
  contactContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
    maxWidth: '92%',
  },
  contactIconContainer: {
    marginRight: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    fontSize: 14.5,
    fontWeight: '500',
    color: '#526174',
    textAlign: 'center',
    flexShrink: 1,
  },
  editDetailsButton: {
    width: '100%',
    height: 46,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editDetailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },

  // Section Typography
  sectionHeading: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 9,
    marginLeft: 4,
  },

  // Unified Group Cards
  unifiedCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 70,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  menuDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#526174',
    lineHeight: 20,
    marginTop: 2,
  },
  badgeContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 7.5,
    paddingVertical: 1.5,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 74,
  },

  // Sign Out Button
  signOutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  signOutText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 14.5,
    marginLeft: 8,
    letterSpacing: 0.3,
  },

  // Log Out Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalIconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  modalButtonGroup: {
    width: '100%',
  },
  modalConfirmBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#DC2626',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  modalCancelBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCancelText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14,
  },
});
