import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { signOut, updateProfile } from 'firebase/auth';
import React, { useState } from 'react';
import { 
  ActivityIndicator,
  Alert, 
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView, 
  StyleSheet, 
  Switch, 
  Text, 
  TextInput,
  TouchableOpacity, 
  View 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../firebase/config';
import { updateUserProfile } from '../../firebase/firestore';
import SwipeableTabWrapper from '@/src/components/ui/SwipeableTabWrapper';
import { uploadToCloudinary } from '../../utils/cloudinary';

export default function ProfileScreen() {
  const { user, userProfile } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Edit fields state
  const [editName, setEditName] = useState(userProfile?.name || '');
  const [editPhone, setEditPhone] = useState(userProfile?.phone || '');
  const [editBio, setEditBio] = useState(userProfile?.bio || '');
  const [editLinkedin, setEditLinkedin] = useState(userProfile?.linkedin || '');
  const [editGithub, setEditGithub] = useState(userProfile?.github || '');

  const openEditModal = () => {
    setEditName(userProfile?.name || '');
    setEditPhone(userProfile?.phone || '');
    setEditBio(userProfile?.bio || '');
    setEditLinkedin(userProfile?.linkedin || '');
    setEditGithub(userProfile?.github || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }

    setSavingProfile(true);
    try {
      if (user?.uid) {
        await updateUserProfile(user.uid, {
          name: editName.trim(),
          phone: editPhone.trim() || '',
          bio: editBio.trim() || '',
          linkedin: editLinkedin.trim() || '',
          github: editGithub.trim() || '',
        });
      }

      if (auth.currentUser && editName.trim() !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: editName.trim() });
      }

      setShowEditModal(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Profile update error:", error);
      Alert.alert("Update Failed", "Could not update profile information.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePickProfilePicture = async () => {
    if (uploadingPhoto) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Allow photo gallery access in settings to upload a profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      setUploadingPhoto(true);
      const localUri = result.assets[0].uri;

      // 1. Upload to Cloudinary
      const uploadedUrl = await uploadToCloudinary(localUri, 'image');

      // 2. Update Firestore User Document
      if (user?.uid) {
        await updateUserProfile(user.uid, { photoUrl: uploadedUrl });
      }

      // 3. Update Firebase Auth Profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: uploadedUrl });
      }

      Alert.alert("Success", "Profile picture updated successfully!");
    } catch (error) {
      console.error("Profile picture upload error:", error);
      Alert.alert("Upload Failed", "Could not upload profile picture.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleOpenLink = (url?: string) => {
    if (!url) return;
    const formatted = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(formatted).catch(() => Alert.alert("Error", "Could not open link."));
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => await signOut(auth) },
    ]);
  };

  const roleName = userProfile?.role === 'admin' ? 'Super Admin' : 'Active Member';
  const photoUrl = userProfile?.photoUrl || user?.photoURL;

  return (
    <SwipeableTabWrapper currentTab="profile">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* TOP APP BAR */}
      <View style={[
        styles.topAppBar, 
        { 
          paddingTop: Math.max(insets.top + 10, 50),
          borderBottomColor: colors.border,
        }
      ]}>
        <Text style={[styles.appTitle, { color: colors.primary }]}>Profile</Text>
      </View>

      <ScrollView 
        contentContainerStyle={{ 
          paddingHorizontal: 20, 
          paddingTop: 16, 
          paddingBottom: insets.bottom + 90,
          gap: 18 
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE HEADER CARD */}
        <View style={[
          styles.profileCard, 
          { 
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: colors.borderHighlight,
          }
        ]}>
          {/* Ambient Glow */}
          <View style={[styles.ambientGlow, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.06)' }]} />

          {/* Avatar with Camera Badge */}
          <TouchableOpacity 
            style={styles.avatarWrapper} 
            onPress={handlePickProfilePicture}
            activeOpacity={0.8}
            disabled={uploadingPhoto}
          >
            <View style={[
              styles.avatar, 
              { 
                backgroundColor: isDark ? colors.surfaceHigh : '#E5E5EA',
                borderColor: colors.primary,
                borderWidth: photoUrl ? 2 : 0,
              }
            ]}>
              {uploadingPhoto ? (
                <ActivityIndicator color={colors.primary} size="large" />
              ) : photoUrl ? (
                <Image 
                  source={{ uri: photoUrl }} 
                  style={styles.avatarImage} 
                  resizeMode="cover" 
                />
              ) : (
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              )}
            </View>

            <View style={[styles.avatarBadge, { backgroundColor: colors.primary, borderColor: isDark ? colors.card : '#FFFFFF' }]}>
              <Ionicons name="camera" size={13} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* User Details */}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{userProfile?.name || 'User'}</Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
            {userProfile?.bio ? (
              <Text style={[styles.userBio, { color: colors.textSecondary }]}>"{userProfile.bio}"</Text>
            ) : null}
            {userProfile?.phone ? (
              <Text style={[styles.userPhone, { color: colors.primary }]}>📞 {userProfile.phone}</Text>
            ) : null}
          </View>

          {/* Role Pill Badge */}
          <View style={[
            styles.roleBadge, 
            { 
              backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)',
              borderColor: isDark ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.2)',
            }
          ]}>
            <View style={[styles.roleDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.roleText, { color: colors.primary }]}>{roleName}</Text>
          </View>

          {/* Social Links Row */}
          <View style={styles.socialRow}>
            {userProfile?.linkedin ? (
              <TouchableOpacity 
                style={[styles.socialIconBtn, { backgroundColor: isDark ? colors.surfaceLow : '#EDEDF2' }]}
                onPress={() => handleOpenLink(userProfile.linkedin)}
              >
                <Ionicons name="logo-linkedin" size={18} color="#0077B5" />
              </TouchableOpacity>
            ) : null}

            {userProfile?.github ? (
              <TouchableOpacity 
                style={[styles.socialIconBtn, { backgroundColor: isDark ? colors.surfaceLow : '#EDEDF2' }]}
                onPress={() => handleOpenLink(userProfile.github)}
              >
                <Ionicons name="logo-github" size={18} color={colors.text} />
              </TouchableOpacity>
            ) : null}

            {userProfile?.phone ? (
              <TouchableOpacity 
                style={[styles.socialIconBtn, { backgroundColor: isDark ? colors.surfaceLow : '#EDEDF2' }]}
                onPress={() => Linking.openURL(`tel:${userProfile.phone}`)}
              >
                <Ionicons name="call" size={18} color="#34C759" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity 
            style={[styles.editProfileBtn, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)', borderColor: colors.primary }]}
            onPress={openEditModal}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={[styles.editProfileText, { color: colors.primary }]}>Edit Profile & Links</Text>
          </TouchableOpacity>
        </View>

        {/* SETTINGS SECTION */}
        <View style={[
          styles.settingsCard, 
          { 
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: colors.border,
          }
        ]}>
          {/* Change Photo Row */}
          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
            onPress={handlePickProfilePicture}
            disabled={uploadingPhoto}
          >
            <View style={styles.settingRowLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: isDark ? colors.surfaceHigh : '#EBEBF0' }]}>
                <Ionicons name="image-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Change Profile Picture</Text>
                <Text style={[styles.settingSublabel, { color: colors.textSecondary }]}>
                  Upload avatar visible in messages
                </Text>
              </View>
            </View>
            {uploadingPhoto ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            )}
          </TouchableOpacity>

          {/* Theme Toggle Row */}
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingRowLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: isDark ? colors.surfaceHigh : '#EBEBF0' }]}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[styles.settingSublabel, { color: colors.textSecondary }]}>
                  {isDark ? 'Electric Dark active' : 'Electric Light active'}
                </Text>
              </View>
            </View>
            <Switch 
              value={isDark} 
              onValueChange={toggleTheme} 
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={isDark ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          {/* Notifications Row */}
          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => Alert.alert("Push Notifications", "Notifications for messages and @mentions are active.")}
          >
            <View style={styles.settingRowLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: isDark ? colors.surfaceHigh : '#EBEBF0' }]}>
                <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Notifications</Text>
                <Text style={[styles.settingSublabel, { color: colors.textSecondary }]}>
                  Messages & @mentions push
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Security Row */}
          <TouchableOpacity 
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert("Security", "Account security and active sessions are up to date.")}
          >
            <View style={styles.settingRowLeft}>
              <View style={[styles.settingIconContainer, { backgroundColor: isDark ? colors.surfaceHigh : '#EBEBF0' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Security</Text>
                <Text style={[styles.settingSublabel, { color: colors.textSecondary }]}>
                  Account details & sessions
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity 
          style={[
            styles.logoutBtn, 
            { 
              backgroundColor: isDark ? 'rgba(255, 69, 58, 0.08)' : 'rgba(255, 59, 48, 0.06)',
              borderColor: isDark ? 'rgba(255, 69, 58, 0.25)' : 'rgba(255, 59, 48, 0.2)',
            }
          ]} 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[
              styles.editModalCard, 
              { 
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                borderColor: colors.borderHighlight,
              }
            ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.editModalHeading, { color: colors.text }]}>Edit Profile Details</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Full Name */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Full Name</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.surfaceLow : colors.inputBackground }
                ]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your full name"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Phone Number */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Phone Number</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.surfaceLow : colors.inputBackground }
                ]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />

              {/* LinkedIn URL */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>LinkedIn Profile URL</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.surfaceLow : colors.inputBackground }
                ]}
                value={editLinkedin}
                onChangeText={setEditLinkedin}
                placeholder="linkedin.com/in/yourprofile"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />

              {/* GitHub / Website URL */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>GitHub / Website URL</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.surfaceLow : colors.inputBackground }
                ]}
                value={editGithub}
                onChangeText={setEditGithub}
                placeholder="github.com/yourusername"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />

              {/* Bio / Status */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Bio / Status</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  styles.fieldInputMultiline,
                  { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? colors.surfaceLow : colors.inputBackground }
                ]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Tell others what you do or your current status..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity 
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>

      </View>
    </SwipeableTabWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topAppBar: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  profileCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '700',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '400',
  },
  userBio: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  userPhone: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  socialIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    marginTop: 14,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingsCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  settingIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSublabel: {
    fontSize: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    marginTop: 6,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  editModalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editModalHeading: {
    fontSize: 18,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  fieldInputMultiline: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});