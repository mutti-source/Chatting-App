import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { db } from '@/src/firebase/config';
import { 
  acceptDirectChat,
  approveJoinRequest, 
  createGroup, 
  rejectDirectChat,
  rejectJoinRequest, 
  sendJoinRequest 
} from '@/src/firebase/firestore';
import { DirectChat, Group, JoinRequest } from '@/src/types';
import SwipeableTabWrapper from '@/src/components/ui/SwipeableTabWrapper';
import { uploadToCloudinary } from '@/src/utils/cloudinary';
import { registerForPushNotificationsAsync } from '@/src/utils/notifications';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  Image,
  Modal, 
  Platform,
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GroupsScreen() {
  const { user, userProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabMargin = insets.bottom > 0 ? insets.bottom + 6 : 14;
  const fabBottom = tabMargin + 64 + 16;
  const listBottomPadding = fabBottom + 70;

  const [activeTab, setActiveTab] = useState<'messages' | 'groups' | 'requests'>('messages');
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [directChats, setDirectChats] = useState<DirectChat[]>([]);
  const [myRequests, setMyRequests] = useState<JoinRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<JoinRequest[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Search & Create State
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupPhoto, setNewGroupPhoto] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Register push notifications
  useEffect(() => {
    if (user?.uid) {
      registerForPushNotificationsAsync(user.uid);
    }
  }, [user]);

  // Listen to unread notifications count
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid),
      where('isRead', '==', false)
    );
    return onSnapshot(q, (snap) => {
      setUnreadNotifications(snap.size);
    });
  }, [user]);

  // 1. FETCH GROUPS
  useEffect(() => {
    const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
    });
  }, []);

  // 2. FETCH DIRECT MESSAGES
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'direct_chats'), where('participants', 'array-contains', user.uid));
    return onSnapshot(q, (snapshot) => {
      setDirectChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DirectChat)));
    });
  }, [user]);

  // 3. FETCH JOIN REQUESTS
  useEffect(() => {
    if (!user) return;
    
    const qSent = query(collection(db, 'join_requests'), where('userId', '==', user.uid));
    const unsubSent = onSnapshot(qSent, (snap) => {
      setMyRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as JoinRequest)));
    });

    const qAdmin = query(collection(db, 'join_requests'), where('adminId', '==', user.uid));
    const unsubAdmin = onSnapshot(qAdmin, (snap) => {
      setIncomingRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as JoinRequest)));
    });

    return () => {
      unsubSent();
      unsubAdmin();
    };
  }, [user]);

  const handlePickGroupAvatar = async () => {
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

      if (!result.canceled && result.assets[0]?.uri) {
        setNewGroupPhoto(result.assets[0].uri);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      let photoUrl: string | undefined = undefined;
      if (newGroupPhoto) {
        photoUrl = await uploadToCloudinary(newGroupPhoto, 'image');
      }
      await createGroup(newGroupName.trim(), photoUrl);
      setNewGroupName('');
      setNewGroupPhoto(null);
      setShowCreateModal(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not create group");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRequest = async (targetGroup: Group) => {
    try {
      await sendJoinRequest(targetGroup.id, targetGroup.name, targetGroup.adminId);
      Alert.alert("Request Sent", `Your request to join "${targetGroup.name}" has been sent.`);
    } catch (e) {
      Alert.alert("Error", "Could not send join request.");
    }
  };

  const getChatName = (chat: DirectChat) => {
    if (!user) return 'Chat';
    const otherUid = chat.participants.find(id => id !== user.uid);
    return otherUid ? chat.participantNames[otherUid] || 'Chat' : 'Chat';
  };

  const getChatPhoto = (chat: DirectChat) => {
    if (!user || !chat.participantPhotos) return undefined;
    const otherUid = chat.participants.find(id => id !== user.uid);
    return otherUid ? chat.participantPhotos[otherUid] : undefined;
  };

  // --- RENDERERS ---
  const renderGroupItem = ({ item }: { item: Group }) => {
    const isAdmin = item.adminId === user?.uid || (item.adminIds && item.adminIds.includes(user?.uid || '')) || userProfile?.role === 'admin';
    const isAllowed = item.allowedUsers?.includes(user?.uid || '');
    const canEnter = isAdmin || isAllowed || item.chatMode === 'EVERYONE';
    const pendingReq = myRequests.find(r => r.groupId === item.id);

    return (
      <TouchableOpacity 
        style={[
          styles.chatCard, 
          { 
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: colors.border,
          }
        ]} 
        onPress={() => {
          if (canEnter) {
            router.push({ pathname: "/group/[id]", params: { id: item.id, type: 'group' } });
          } else if (pendingReq) {
            Alert.alert("Pending Request", "Your request to join is awaiting approval.");
          } else {
            handleJoinRequest(item);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={[
          styles.avatar, 
          { 
            backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)',
            overflow: 'hidden'
          }
        ]}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.groupCardPhoto} resizeMode="cover" />
          ) : (
            <Ionicons name="people" size={22} color={colors.primary} />
          )}
        </View>
        
        <View style={styles.cardCenter}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {isAdmin && (
              <View style={[styles.adminPill, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)' }]}>
                <Text style={[styles.adminPillText, { color: colors.primary }]}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.chatMode === 'EVERYONE' ? 'Open Chat • Anyone can message' : 'Restricted Group'}
          </Text>
        </View>

        {!canEnter && (
          <View style={styles.badgeWrapper}>
            {pendingReq ? (
              <View style={[styles.badgePending, { backgroundColor: isDark ? '#352405' : '#FEF3C7', borderColor: colors.warning }]}>
                <Text style={[styles.badgePendingText, { color: colors.warning }]}>Pending</Text>
              </View>
            ) : (
              <View style={[styles.badgeJoin, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeJoinText}>Join</Text>
                <Ionicons name="arrow-forward" size={11} color="#fff" style={{ marginLeft: 3 }} />
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDirectChatItem = ({ item }: { item: DirectChat }) => {
    const chatName = getChatName(item);
    const chatPhoto = getChatPhoto(item);
    return (
      <TouchableOpacity 
        style={[
          styles.chatCard, 
          { 
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: colors.border,
          }
        ]} 
        onPress={() => router.push({ pathname: "/group/[id]", params: { id: item.id, type: 'direct' } })}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: isDark ? '#2A2A2A' : '#E5E5EA', overflow: 'hidden' }]}>
          {chatPhoto ? (
            <Image source={{ uri: chatPhoto }} style={styles.groupCardPhoto} resizeMode="cover" />
          ) : (
            <Text style={[styles.avatarInitials, { color: colors.primary }]}>
              {chatName.charAt(0).toUpperCase()}
            </Text>
          )}
          <View style={[styles.onlineDot, { borderColor: isDark ? colors.card : '#FFFFFF' }]} />
        </View>
        
        <View style={styles.cardCenter}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {chatName}
            </Text>
            <Text style={[styles.timestampText, { color: colors.primary }]}>Recent</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.lastMessage || 'Tap to send a message'}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ opacity: 0.6 }} />
      </TouchableOpacity>
    );
  };

  const renderRequestItem = ({ item }: { item: JoinRequest }) => (
    <View style={[
      styles.requestCard, 
      { 
        backgroundColor: isDark ? colors.card : '#FFFFFF',
        borderColor: colors.borderHighlight,
      }
    ]}>
      {/* Decorative Blur Effect */}
      <View style={[styles.requestDecorGlow, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 122, 255, 0.05)' }]} />

      <View style={styles.requestHeader}>
        <View style={[styles.requestAvatar, { backgroundColor: isDark ? '#2A2A2A' : '#E5E5EA', overflow: 'hidden' }]}>
          {item.userPhotoUrl ? (
            <Image source={{ uri: item.userPhotoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Ionicons name="person" size={24} color={colors.primary} />
          )}
        </View>
        <View style={styles.requestHeaderText}>
          <Text style={[styles.requestUserName, { color: colors.text }]}>{item.userName}</Text>
          <Text style={[styles.requestUserSubtitle, { color: colors.textSecondary }]}>
            Wants to join <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.groupName}</Text>
          </Text>
        </View>
      </View>

      <View style={[styles.requestBioContainer, { backgroundColor: isDark ? colors.surfaceLow : '#F3F3F8' }]}>
        <Text style={[styles.requestBioText, { color: colors.textSecondary }]}>
          "Requesting permission to join this chat group."
        </Text>
      </View>

      <View style={styles.requestActionRow}>
        <TouchableOpacity 
          style={[styles.rejectBtn, { borderColor: colors.danger, backgroundColor: isDark ? 'rgba(255, 69, 58, 0.1)' : 'rgba(255, 59, 48, 0.08)' }]}
          onPress={() => rejectJoinRequest(item.id)}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={18} color={colors.danger} />
          <Text style={[styles.rejectBtnText, { color: colors.danger }]}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.approveBtn, { backgroundColor: colors.primary }]}
          onPress={() => approveJoinRequest(item)}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={styles.approveBtnText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMessageRequestItem = ({ item }: { item: DirectChat }) => {
    const chatName = getChatName(item);
    const photoUrl = getChatPhoto(item);

    return (
      <View style={[
        styles.requestCard, 
        { 
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderColor: colors.borderHighlight,
        }
      ]}>
        <View style={[styles.requestDecorGlow, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 122, 255, 0.05)' }]} />

        <TouchableOpacity 
          style={styles.requestHeader}
          onPress={() => router.push({ pathname: "/group/[id]", params: { id: item.id, type: 'direct' } })}
          activeOpacity={0.7}
        >
          <View style={[styles.requestAvatar, { backgroundColor: isDark ? '#2A2A2A' : '#E5E5EA', overflow: 'hidden' }]}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Ionicons name="person" size={24} color={colors.primary} />
            )}
          </View>
          <View style={styles.requestHeaderText}>
            <Text style={[styles.requestUserName, { color: colors.text }]}>{chatName}</Text>
            <Text style={[styles.requestUserSubtitle, { color: colors.textSecondary }]}>
              Sent you a direct <Text style={{ color: colors.primary, fontWeight: '700' }}>Message Request</Text>
            </Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.requestBioContainer, { backgroundColor: isDark ? colors.surfaceLow : '#F3F3F8' }]}>
          <Text style={[styles.requestBioText, { color: colors.textSecondary }]} numberOfLines={2}>
            "{item.lastMessage || 'Sent you a direct message request'}"
          </Text>
        </View>

        <View style={styles.requestActionRow}>
          <TouchableOpacity 
            style={[styles.rejectBtn, { borderColor: colors.danger, backgroundColor: isDark ? 'rgba(255, 69, 58, 0.1)' : 'rgba(255, 59, 48, 0.08)' }]}
            onPress={() => rejectDirectChat(item.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={18} color={colors.danger} />
            <Text style={[styles.rejectBtnText, { color: colors.danger }]}>Decline</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.approveBtn, { backgroundColor: colors.primary }]}
            onPress={() => acceptDirectChat(item.id)}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.approveBtnText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const isUserMemberOfGroup = (g: Group) => {
    if (!user) return false;
    if (userProfile?.role === 'admin') return true;
    if (g.adminId === user.uid) return true;
    if (g.adminIds && g.adminIds.includes(user.uid)) return true;
    if (g.members && g.members.includes(user.uid)) return true;
    if (g.allowedUsers && g.allowedUsers.includes(user.uid)) return true;
    return false;
  };

  const pendingMessageRequests = directChats.filter(
    c => c.status === 'PENDING' && c.initiatedBy && c.initiatedBy !== user?.uid
  );

  const acceptedDirectChats = directChats.filter(
    c => c.status === 'ACCEPTED' || !c.status || c.initiatedBy === user?.uid
  );

  const filteredGroups = groups
    .filter(g => isUserMemberOfGroup(g))
    .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredDirectChats = acceptedDirectChats.filter(c => getChatName(c).toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredMessageRequests = pendingMessageRequests.filter(c => getChatName(c).toLowerCase().includes(searchQuery.toLowerCase()));

  const totalRequestsCount = incomingRequests.length + pendingMessageRequests.length;

  return (
    <SwipeableTabWrapper currentTab="groups">
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
          style={styles.topLeading} 
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.7}
        >
          <View style={[styles.userAvatar, { backgroundColor: isDark ? '#2A2A2A' : '#EDEDF2' }]}>
            {userProfile?.photoUrl ? (
              <Image 
                source={{ uri: userProfile.photoUrl }} 
                style={styles.userAvatarImage} 
                resizeMode="cover" 
              />
            ) : (
              <Text style={[styles.userAvatarText, { color: colors.primary }]}>
                {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <Text style={[styles.appTitle, { color: colors.text }]}>Messages</Text>

        <View style={styles.topTrailingRow}>
          {/* Notifications Bell */}
          <TouchableOpacity 
            style={styles.notifBtn}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadNotifications > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: colors.primary, borderColor: isDark ? colors.card : '#FFFFFF' }]}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.topTrailing}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* SEARCH AND SEGMENTED TABS */}
      <View style={styles.searchTabsWrapper}>
        {/* Search Bar */}
        <View style={[
          styles.searchBar, 
          { 
            backgroundColor: isDark ? colors.card : colors.inputBackground,
            borderColor: colors.border,
          }
        ]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput 
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search messages & groups..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Segmented Pill Tabs */}
        <View style={[
          styles.segmentedContainer, 
          { 
            backgroundColor: isDark ? colors.card : colors.inputBackground,
            borderColor: colors.border,
          }
        ]}>
          <TouchableOpacity 
            style={[
              styles.segmentBtn, 
              activeTab === 'messages' && [styles.segmentBtnActive, { backgroundColor: isDark ? colors.surfaceHigh : '#FFFFFF' }]
            ]}
            onPress={() => setActiveTab('messages')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.segmentText, 
              { color: activeTab === 'messages' ? colors.primary : colors.textSecondary },
              activeTab === 'messages' && { fontWeight: '700' }
            ]}>
              Direct
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.segmentBtn, 
              activeTab === 'groups' && [styles.segmentBtnActive, { backgroundColor: isDark ? colors.surfaceHigh : '#FFFFFF' }]
            ]}
            onPress={() => setActiveTab('groups')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.segmentText, 
              { color: activeTab === 'groups' ? colors.primary : colors.textSecondary },
              activeTab === 'groups' && { fontWeight: '700' }
            ]}>
              Groups
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.segmentBtn, 
              activeTab === 'requests' && [styles.segmentBtnActive, { backgroundColor: isDark ? colors.surfaceHigh : '#FFFFFF' }]
            ]}
            onPress={() => setActiveTab('requests')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.segmentText, 
              { color: activeTab === 'requests' ? colors.primary : colors.textSecondary },
              activeTab === 'requests' && { fontWeight: '700' }
            ]}>
              Requests
            </Text>
            {totalRequestsCount > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.tabBadgeText}>{totalRequestsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT LISTS */}
      {activeTab === 'messages' && (
        <FlatList
          data={filteredDirectChats}
          keyExtractor={item => item.id}
          renderItem={renderDirectChatItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: listBottomPadding }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No direct messages yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Browse Contacts to start a private chat</Text>
            </View>
          }
        />
      )}

      {activeTab === 'groups' && (
        <FlatList
          data={filteredGroups}
          keyExtractor={item => item.id}
          renderItem={renderGroupItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: listBottomPadding }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No groups found</Text>
            </View>
          }
        />
      )}

      {activeTab === 'requests' && (
        <FlatList
          data={[
            ...filteredMessageRequests.map(r => ({ type: 'message' as const, data: r, id: `msg-${r.id}` })),
            ...incomingRequests.map(r => ({ type: 'group' as const, data: r, id: `grp-${r.id}` }))
          ]}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            if (item.type === 'message') {
              return renderMessageRequestItem({ item: item.data });
            }
            return renderRequestItem({ item: item.data });
          }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: listBottomPadding }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No pending requests</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>New message requests and join invitations will appear here</Text>
            </View>
          }
        />
      )}

      {/* FLOATING ACTION BUTTON (FAB) */}
      {userProfile?.role === 'admin' && activeTab === 'groups' && (
        <TouchableOpacity 
          style={[
            styles.fab, 
            { 
              backgroundColor: colors.primary, 
              bottom: fabBottom,
              shadowColor: colors.primary,
            }
          ]} 
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* CREATE GROUP MODAL */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalCard, 
            { 
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              borderColor: colors.borderHighlight,
            }
          ]}>
            <Text style={[styles.modalHeading, { color: colors.text }]}>Create New Group</Text>
            <Text style={[styles.modalSubheading, { color: colors.textSecondary }]}>
              Set a name and optional profile picture.
            </Text>

            {/* Optional Group Avatar Picker */}
            <TouchableOpacity 
              style={styles.modalAvatarPicker}
              onPress={handlePickGroupAvatar}
              activeOpacity={0.8}
            >
              <View style={[styles.modalAvatarBox, { backgroundColor: isDark ? colors.surfaceLow : '#EDEDF2' }]}>
                {newGroupPhoto ? (
                  <Image source={{ uri: newGroupPhoto }} style={styles.modalAvatarImg} resizeMode="cover" />
                ) : (
                  <Ionicons name="camera-outline" size={24} color={colors.primary} />
                )}
              </View>
              <Text style={[styles.modalAvatarText, { color: colors.primary }]}>
                {newGroupPhoto ? 'Change Photo' : 'Add Group Photo'}
              </Text>
            </TouchableOpacity>

            <TextInput 
              style={[
                styles.modalInput, 
                { 
                  color: colors.text, 
                  borderColor: colors.border, 
                  backgroundColor: isDark ? colors.surfaceLow : colors.inputBackground 
                }
              ]}
              placeholder="e.g. Design Sync, Dev Team"
              placeholderTextColor={colors.textSecondary}
              value={newGroupName}
              onChangeText={setNewGroupName}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity 
                onPress={() => {
                  setShowCreateModal(false);
                  setNewGroupPhoto(null);
                  setNewGroupName('');
                }} 
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleCreateGroup} 
                style={[styles.modalCreateBtn, { backgroundColor: colors.primary }]}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalCreateBtnText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topLeading: {
    width: 40,
    alignItems: 'flex-start',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  topTrailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  topTrailing: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchTabsWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 24,
    height: 44,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: 3,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 19,
    gap: 6,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginVertical: 4,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  groupCardPhoto: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
  },
  cardCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },
  cardSubtitle: {
    fontSize: 13,
  },
  timestampText: {
    fontSize: 11,
    fontWeight: '600',
  },
  adminPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminPillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  badgeWrapper: {
    alignItems: 'flex-end',
  },
  badgeJoin: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  badgeJoinText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  badgePending: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgePendingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  requestCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginVertical: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  requestDecorGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestHeaderText: {
    flex: 1,
  },
  requestUserName: {
    fontSize: 16,
    fontWeight: '700',
  },
  requestUserSubtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  requestBioContainer: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  requestBioText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  requestActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  rejectBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 99,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  modalHeading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubheading: {
    fontSize: 13,
    marginBottom: 16,
  },
  modalAvatarPicker: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  modalAvatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalAvatarImg: {
    width: '100%',
    height: '100%',
  },
  modalAvatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCreateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCreateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});