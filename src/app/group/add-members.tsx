import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { db } from '@/src/firebase/config';
import { addMembersToGroup } from '@/src/firebase/firestore';
import { Group, UserProfile } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  Image, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AddMembersScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<Group | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  // 1. Fetch Group Data
  useEffect(() => {
    if (!groupId) return;
    const unsub = onSnapshot(doc(db, 'groups', groupId), (snap) => {
      if (snap.exists()) {
        setGroup({ id: snap.id, ...snap.data() } as Group);
      }
    });
    return unsub;
  }, [groupId]);

  // 2. Fetch All Users in System
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snap) => {
      const users = snap.docs
        .map(d => ({ ...(d.data() as UserProfile), uid: d.id }))
        .filter(u => u.uid !== user?.uid); // Don't show myself
      setAllUsers(users);
      setLoading(false);
    }, (error) => {
      console.error("Error loading users:", error);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const existingMemberIds = useMemo(() => {
    if (!group) return [];
    return Array.from(new Set([
      group.adminId,
      ...(group.adminIds || []),
      ...(group.allowedUsers || []),
    ]));
  }, [group]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return allUsers;
    const q = searchQuery.toLowerCase();
    return allUsers.filter(u => 
      u.name.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q))
    );
  }, [allUsers, searchQuery]);

  const selectedUsers = useMemo(() => {
    return allUsers.filter(u => selectedUserIds.includes(u.uid));
  }, [allUsers, selectedUserIds]);

  const toggleSelectUser = (userId: string) => {
    if (existingMemberIds.includes(userId)) return;
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (!groupId || selectedUserIds.length === 0) return;
    setAdding(true);
    try {
      await addMembersToGroup(groupId, selectedUserIds);
      Alert.alert("Success", `Added ${selectedUserIds.length} member(s) to ${group?.name || 'the channel'}!`);
      router.back();
    } catch (error) {
      console.error("Add members error:", error);
      Alert.alert("Error", "Could not add members to group.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* TOP APP BAR */}
      <View style={[
        styles.topAppBar, 
        { 
          paddingTop: Math.max(insets.top + 10, 50),
          borderBottomColor: colors.border,
        }
      ]}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.appTitle, { color: colors.text }]}>Add Members</Text>
          <Text style={[styles.appSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {group?.name || 'Channel'}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* SEARCH BAR (Microsoft Teams style) */}
      <View style={styles.searchSection}>
        <View style={[
          styles.searchBar, 
          { 
            backgroundColor: isDark ? colors.card : colors.inputBackground,
            borderColor: colors.borderHighlight,
          }
        ]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput 
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Type a name, email, or phone..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* SELECTED CHIPS BAR */}
        {selectedUsers.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            {selectedUsers.map((u) => (
              <TouchableOpacity 
                key={u.uid}
                style={[
                  styles.userChip, 
                  { 
                    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.12)',
                    borderColor: colors.primary,
                  }
                ]}
                onPress={() => toggleSelectUser(u.uid)}
                activeOpacity={0.7}
              >
                <View style={[styles.chipAvatar, { backgroundColor: isDark ? '#2A2A2A' : '#E5E5EA' }]}>
                  {u.photoUrl ? (
                    <Image source={{ uri: u.photoUrl }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>
                      {u.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>{u.name}</Text>
                <Ionicons name="close-circle" size={16} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* USER DIRECTORY LIST */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No matching users found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isAlreadyMember = existingMemberIds.includes(item.uid);
            const isSelected = selectedUserIds.includes(item.uid);

            return (
              <TouchableOpacity 
                style={[
                  styles.userCard, 
                  { 
                    backgroundColor: isDark ? colors.card : '#FFFFFF',
                    borderColor: isSelected ? colors.primary : colors.border,
                    opacity: isAlreadyMember ? 0.65 : 1,
                  }
                ]}
                onPress={() => toggleSelectUser(item.uid)}
                activeOpacity={isAlreadyMember ? 1 : 0.7}
                disabled={isAlreadyMember}
              >
                {/* Avatar */}
                <View style={[styles.userAvatar, { backgroundColor: isDark ? '#2A2A2A' : '#E5E5EA' }]}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                {/* Details */}
                <View style={styles.userInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.role === 'admin' && (
                      <View style={[styles.rolePill, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)' }]}>
                        <Text style={[styles.rolePillText, { color: colors.primary }]}>Admin</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>

                {/* Checkbox or Status Badge */}
                {isAlreadyMember ? (
                  <View style={[styles.inGroupBadge, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)' }]}>
                    <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                    <Text style={styles.inGroupBadgeText}>In Channel</Text>
                  </View>
                ) : (
                  <View style={[
                    styles.checkbox, 
                    { 
                      borderColor: isSelected ? colors.primary : colors.textSecondary,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                    }
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* FLOATING BOTTOM ADD BAR */}
      {selectedUserIds.length > 0 && (
        <View style={[
          styles.bottomBar, 
          { 
            backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.96)',
            borderTopColor: colors.borderHighlight,
            paddingBottom: Math.max(insets.bottom, 14),
          }
        ]}>
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={handleAddMembers}
            disabled={adding}
            activeOpacity={0.85}
          >
            {adding ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="person-add" size={18} color="#FFFFFF" />
                <Text style={styles.addBtnText}>
                  Add {selectedUserIds.length} Member{selectedUserIds.length > 1 ? 's' : ''} to Channel
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topAppBar: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  appSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 24,
    height: 46,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    maxWidth: 160,
  },
  chipAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 12,
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  inGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  inGroupBadgeText: {
    color: '#34C759',
    fontSize: 11,
    fontWeight: '700',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    gap: 8,
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
