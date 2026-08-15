import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { 
  demoteGroupAdmin, 
  promoteToGroupAdmin, 
  toggleGroupMember, 
  updateGroupSettings 
} from '@/src/firebase/firestore';
import { ChatMode, Group, UserProfile } from '@/src/types';
import { uploadToCloudinary } from '@/src/utils/cloudinary';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  Image, 
  Modal, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
} from 'react-native';

interface GroupSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  group: Group;
  editName: string;
  setEditName: (text: string) => void;
  onSaveName: () => void;
  onUpdateChatMode: (mode: ChatMode) => void;
  allUsers: UserProfile[];
  loadingUsers: boolean;
  onToggleUserAllowed: (userId: string) => void;
  onDeleteGroup: () => void;
}

export default function GroupSettingsModal({
  visible,
  onClose,
  group,
  editName,
  setEditName,
  onSaveName,
  onUpdateChatMode,
  allUsers,
  loadingUsers,
  onToggleUserAllowed,
  onDeleteGroup
}: GroupSettingsModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [uploadingGroupPhoto, setUploadingGroupPhoto] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'members'>('general');

  const groupAdmins = useMemo(() => {
    return Array.from(new Set([
      group.adminId, 
      ...(group.adminIds || [])
    ])).filter(Boolean);
  }, [group]);

  const isCurrentUserAdmin = user?.uid ? groupAdmins.includes(user.uid) : false;

  const handlePickGroupPhoto = async () => {
    if (uploadingGroupPhoto) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Allow gallery access in settings to upload a group picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      setUploadingGroupPhoto(true);
      const photoUrl = await uploadToCloudinary(result.assets[0].uri, 'image');
      await updateGroupSettings(group.id, { photoUrl });
      Alert.alert("Success", "Group picture updated!");
    } catch (error) {
      console.error("Group photo update error:", error);
      Alert.alert("Upload Failed", "Could not upload group picture.");
    } finally {
      setUploadingGroupPhoto(false);
    }
  };

  const handleToggleMember = async (targetUser: UserProfile) => {
    try {
      await toggleGroupMember(group.id, targetUser.uid);
    } catch (err) {
      Alert.alert("Error", "Could not update group membership.");
    }
  };

  const handleToggleAdmin = async (targetUser: UserProfile) => {
    const isTargetAdmin = groupAdmins.includes(targetUser.uid);
    if (isTargetAdmin) {
      if (group.adminId === targetUser.uid && groupAdmins.length <= 1) {
        Alert.alert("Cannot Remove Admin", "This group must have at least one administrator.");
        return;
      }
      Alert.alert(
        "Remove Group Admin",
        `Remove administrator authority from ${targetUser.name}?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Remove Admin", 
            style: "destructive", 
            onPress: async () => await demoteGroupAdmin(group.id, targetUser.uid) 
          }
        ]
      );
    } else {
      Alert.alert(
        "Make Group Admin",
        `Make ${targetUser.name} an administrator of "${group.name}"? They will be able to manage members and settings.`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Make Admin", 
            onPress: async () => await promoteToGroupAdmin(group.id, targetUser.uid) 
          }
        ]
      );
    }
  };

  const chatModes: { id: ChatMode; label: string; desc: string; icon: any }[] = [
    { 
      id: 'EVERYONE', 
      label: 'Everyone', 
      desc: 'Whoever is added in group will be able to send the message',
      icon: 'chatbubbles-outline'
    },
    { 
      id: 'ADMIN_ONLY', 
      label: 'Admin Broadcast', 
      desc: 'Only admins can send messages',
      icon: 'megaphone-outline'
    },
  ];

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return allUsers;
    const q = userSearchQuery.toLowerCase();
    return allUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [allUsers, userSearchQuery]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={[
          styles.modalContent, 
          { 
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderTopColor: colors.borderHighlight,
          }
        ]}>
          
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Group Settings</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {group.name} • {isCurrentUserAdmin ? 'Admin Controls' : 'Group Info'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close-circle" size={26} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Segmented Settings Tabs */}
          <View style={[styles.tabBar, { backgroundColor: isDark ? colors.surfaceLow : colors.inputBackground }]}>
            <TouchableOpacity 
              style={[
                styles.tabBtn, 
                activeSettingsTab === 'general' && [styles.tabBtnActive, { backgroundColor: isDark ? colors.surfaceHigh : '#FFFFFF' }]
              ]}
              onPress={() => setActiveSettingsTab('general')}
            >
              <Ionicons name="settings-outline" size={16} color={activeSettingsTab === 'general' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.tabText, { color: activeSettingsTab === 'general' ? colors.primary : colors.textSecondary }]}>
                General & Permissions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.tabBtn, 
                activeSettingsTab === 'members' && [styles.tabBtnActive, { backgroundColor: isDark ? colors.surfaceHigh : '#FFFFFF' }]
              ]}
              onPress={() => setActiveSettingsTab('members')}
            >
              <Ionicons name="people-outline" size={16} color={activeSettingsTab === 'members' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.tabText, { color: activeSettingsTab === 'members' ? colors.primary : colors.textSecondary }]}>
                Members ({allUsers.length})
              </Text>
            </TouchableOpacity>
          </View>

          {activeSettingsTab === 'general' ? (
            <View style={{ flex: 1 }}>
              {/* Group Picture & Avatar Row */}
              <View style={styles.avatarSection}>
                <TouchableOpacity 
                  style={styles.avatarWrapper}
                  onPress={handlePickGroupPhoto}
                  activeOpacity={0.8}
                  disabled={uploadingGroupPhoto || !isCurrentUserAdmin}
                >
                  <View style={[styles.groupAvatar, { backgroundColor: isDark ? colors.surfaceHigh : '#E5E5EA' }]}>
                    {uploadingGroupPhoto ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : group.photoUrl ? (
                      <Image source={{ uri: group.photoUrl }} style={styles.avatarImage} resizeMode="cover" />
                    ) : (
                      <Ionicons name="people" size={32} color={colors.primary} />
                    )}
                  </View>
                  {isCurrentUserAdmin && (
                    <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: isDark ? colors.card : '#FFFFFF' }]}>
                      <Ionicons name="camera" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.photoLabel, { color: colors.text }]}>Group Profile Picture</Text>
                  <Text style={[styles.photoSublabel, { color: colors.textSecondary }]}>
                    {isCurrentUserAdmin ? 'Tap photo to upload or change avatar' : 'Group avatar'}
                  </Text>
                </View>
              </View>

              {/* 1. Group Name */}
              <Text style={[styles.label, { color: colors.text }]}>Group Name</Text>
              <View style={styles.renameRow}>
                <TextInput
                  style={[
                    styles.renameInput, 
                    { 
                      color: colors.text, 
                      borderColor: colors.border, 
                      backgroundColor: isDark ? colors.surfaceLow : colors.inputBackground 
                    }
                  ]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter group name"
                  placeholderTextColor={colors.textSecondary}
                  editable={isCurrentUserAdmin}
                />
                {isCurrentUserAdmin && (
                  <TouchableOpacity 
                    onPress={onSaveName} 
                    style={[styles.saveNameBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* 2. Chat Mode Options */}
              <Text style={[styles.label, { color: colors.text }]}>Chat Mode</Text>
              <View style={styles.modeCardsContainer}>
                {chatModes.map((m) => {
                  const isSelected = group.chatMode === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.modeCard, 
                        { 
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected 
                            ? (isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)') 
                            : (isDark ? colors.surfaceLow : colors.inputBackground)
                        }
                      ]}
                      onPress={() => isCurrentUserAdmin && onUpdateChatMode(m.id)}
                      activeOpacity={0.7}
                      disabled={!isCurrentUserAdmin}
                    >
                      <View style={[
                        styles.modeIconCircle, 
                        { backgroundColor: isSelected ? colors.primary : (isDark ? colors.surfaceHigh : '#E5E5EA') }
                      ]}>
                        <Ionicons 
                          name={m.icon} 
                          size={18} 
                          color={isSelected ? '#FFFFFF' : colors.textSecondary} 
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ 
                            color: isSelected ? colors.primary : colors.text, 
                            fontSize: 15, 
                            fontWeight: '700' 
                          }}>
                            {m.label}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                          )}
                        </View>
                        <Text style={[styles.modeDesc, { color: colors.textSecondary }]}>
                          {m.desc}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Delete Button */}
              {isCurrentUserAdmin && (
                <TouchableOpacity 
                  onPress={onDeleteGroup} 
                  style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(255, 69, 58, 0.1)' : 'rgba(255, 59, 48, 0.08)', borderColor: colors.danger }]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={[styles.deleteText, { color: colors.danger }]}>Delete Group</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* MEMBERS & ADMIN MANAGEMENT TAB */
            <View style={{ flex: 1 }}>
              {/* Search User Input */}
              <View style={[styles.memberSearchBar, { backgroundColor: isDark ? colors.surfaceLow : colors.inputBackground, borderColor: colors.border }]}>
                <Ionicons name="search" size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.memberSearchInput, { color: colors.text }]}
                  placeholder="Search user by name or email..."
                  placeholderTextColor={colors.textSecondary}
                  value={userSearchQuery}
                  onChangeText={setUserSearchQuery}
                />
                {userSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setUserSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* WhatsApp-style Add Participants Action Row */}
              {isCurrentUserAdmin && (
                <TouchableOpacity 
                  style={[
                    styles.addParticipantsRow, 
                    { 
                      backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)',
                      borderColor: colors.primary,
                    }
                  ]}
                  onPress={() => {
                    onClose();
                    router.push({ pathname: '/group/add-members', params: { groupId: group.id } });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.addIconCircle, { backgroundColor: colors.primary }]}>
                    <Ionicons name="person-add" size={16} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.addParticipantsTitle, { color: colors.primary }]}>Add Participants</Text>
                    <Text style={[styles.addParticipantsSub, { color: colors.textSecondary }]}>
                      Search directory and invite new members
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}

              {loadingUsers ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
              ) : (
                <FlatList
                  data={filteredUsers}
                  keyExtractor={item => item.uid}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  ListEmptyComponent={
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                      <Text style={{ color: colors.textSecondary }}>No users found</Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const isMember = group.allowedUsers?.includes(item.uid) || group.adminId === item.uid;
                    const isUserAdmin = groupAdmins.includes(item.uid);

                    return (
                      <View style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                        {/* Member Avatar */}
                        <View style={[styles.memberAvatar, { backgroundColor: isDark ? colors.surfaceHigh : '#E5E5EA' }]}>
                          {item.photoUrl ? (
                            <Image source={{ uri: item.photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          ) : (
                            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                              {item.name.charAt(0).toUpperCase()}
                            </Text>
                          )}
                        </View>

                        {/* Name & Admin Badge */}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                            {isUserAdmin && (
                              <View style={[styles.adminBadge, { backgroundColor: isDark ? 'rgba(255, 179, 0, 0.2)' : 'rgba(255, 179, 0, 0.15)' }]}>
                                <Text style={[styles.adminBadgeText, { color: '#F59E0B' }]}>Group Admin 👑</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.memberEmail, { color: colors.textSecondary }]} numberOfLines={1}>{item.email}</Text>
                        </View>

                        {/* Actions (Admin Promotion & Add/Remove) */}
                        {isCurrentUserAdmin && (
                          <View style={styles.memberActionsRow}>
                            {/* Make / Remove Group Admin Button */}
                            {isMember && (
                              <TouchableOpacity 
                                style={[
                                  styles.makeAdminBtn, 
                                  { 
                                    backgroundColor: isUserAdmin 
                                      ? (isDark ? 'rgba(255, 179, 0, 0.18)' : 'rgba(255, 179, 0, 0.12)') 
                                      : (isDark ? colors.surfaceLow : '#EDEDF2'),
                                    borderColor: isUserAdmin ? '#F59E0B' : colors.border,
                                  }
                                ]}
                                onPress={() => handleToggleAdmin(item)}
                                activeOpacity={0.7}
                              >
                                <Ionicons 
                                  name={isUserAdmin ? "shield-checkmark" : "shield-outline"} 
                                  size={13} 
                                  color={isUserAdmin ? "#F59E0B" : colors.textSecondary} 
                                />
                                <Text style={[
                                  styles.makeAdminText, 
                                  { color: isUserAdmin ? '#F59E0B' : colors.textSecondary }
                                ]}>
                                  {isUserAdmin ? 'Admin' : 'Make Admin'}
                                </Text>
                              </TouchableOpacity>
                            )}

                            {/* Add / Remove from Group Button */}
                            <TouchableOpacity 
                              style={[
                                styles.memberToggleBtn, 
                                { 
                                  backgroundColor: isMember 
                                    ? (isDark ? 'rgba(255, 69, 58, 0.12)' : 'rgba(255, 59, 48, 0.08)') 
                                    : colors.primary,
                                  borderColor: isMember ? colors.danger : colors.primary,
                                }
                              ]}
                              onPress={() => handleToggleMember(item)}
                              activeOpacity={0.8}
                            >
                              <Text style={[
                                styles.memberToggleBtnText, 
                                { color: isMember ? colors.danger : '#FFFFFF' }
                              ]}>
                                {isMember ? 'Remove' : '+ Add'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  }}
                />
              )}
            </View>
          )}

          <View style={{ height: 16 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalContent: { 
    padding: 24, 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    height: '88%',
    borderTopWidth: 1,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 14,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 13,
    gap: 6,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  avatarWrapper: {
    position: 'relative',
  },
  groupAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  photoLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  photoSublabel: {
    fontSize: 12,
  },
  label: { 
    fontWeight: '700', 
    fontSize: 14,
    marginBottom: 8, 
    marginTop: 8,
  },
  renameRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 14,
    gap: 10,
  },
  renameInput: { 
    flex: 1, 
    borderWidth: 1, 
    borderRadius: 14, 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    fontSize: 15,
  },
  saveNameBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeCardsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  modeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  deleteBtn: { 
    marginTop: 8, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 13, 
    borderRadius: 16, 
    borderWidth: 1,
    gap: 8,
  },
  deleteText: { 
    fontWeight: '700', 
    fontSize: 15,
  },
  memberSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    gap: 8,
    marginBottom: 12,
  },
  memberSearchInput: {
    flex: 1,
    fontSize: 14,
  },
  addParticipantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
  },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addParticipantsTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  addParticipantsSub: {
    fontSize: 11,
    marginTop: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 11,
  },
  adminBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  memberActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  makeAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  makeAdminText: {
    fontSize: 11,
    fontWeight: '700',
  },
  memberToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  memberToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});