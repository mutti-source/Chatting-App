import ChatBubble from '@/src/components/ui/ChatBubble';
import ChatInput from '@/src/components/ui/ChatInput';
import GroupSettingsModal from '@/src/components/ui/GroupSettingsModal';
import TypingIndicator from '@/src/components/ui/TypingIndicator';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { db } from '@/src/firebase/config';
import {
  deleteGroup,
  getOrCreateDirectChat,
  sendDirectMessage,
  sendMessage,
  setTypingStatus,
  softDeleteMessage,
  updateGroup
} from '@/src/firebase/firestore';
import { ChatMode, Group, Message, UserProfile } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query
} from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const { id, type = 'group' } = useLocalSearchParams<{ id: string; type?: string }>();
  const { user, userProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [editName, setEditName] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id || type !== 'group') return;

    const unsub = onSnapshot(doc(db, 'groups', id), (docSnapshot) => {
      if (!docSnapshot.exists()) {
        Alert.alert("Group Deleted", "This group no longer exists.");
        router.replace('/(tabs)/groups');
        return;
      }
      const groupData = { id: docSnapshot.id, ...docSnapshot.data() } as Group;
      setGroup(groupData);
      setEditName(groupData.name);
    });

    return unsub;
  }, [id, type]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (userProfile?.role === 'admin') return true;
    if (group?.adminId === user.uid) return true;
    if (group?.adminIds && group.adminIds.includes(user.uid)) return true;
    return false;
  }, [group, user, userProfile]);

  useEffect(() => {
    setLoadingUsers(true);
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ ...(doc.data() as UserProfile), uid: doc.id }));
      setAllUsers(users);
      setLoadingUsers(false);
    }, (error) => {
      console.error("Failed to load users:", error);
      setLoadingUsers(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (type !== 'group' || !group || !user) return;
    
    if (!isAdmin && !group.allowedUsers.includes(user.uid)) {
      Alert.alert("Access Denied", "You must join this group first.");
      router.back();
    }
  }, [group, user, isAdmin, type]);

  useEffect(() => {
    if (!id || !user) return;
    if (type === 'group' && !group) return;

    let q;

    if (type === 'group') {
      q = query(collection(db, 'groups', id, 'messages'), orderBy('createdAt', 'asc'));
    } else {
      q = query(collection(db, 'direct_chats', id, 'messages'), orderBy('createdAt', 'asc'));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const rawMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));

      const filteredMsgs = rawMsgs
        .filter(m => !m.isDeleted)
        .filter(m => {
          if (type !== 'group') return true;
          if (m.visibleTo === 'ALL') return true;
          if (m.visibleTo === 'ADMIN_ONLY' && isAdmin) return true;
          if (m.senderId === user.uid) return true;
          return false;
        })
        .filter(m => !m.id.startsWith('temp-'));

      setMessages(filteredMsgs);
    });

    return unsub;
  }, [id, user, isAdmin, group?.id, type]);

  useEffect(() => {
    if (!id || !user) return;
    const collectionPath = type === 'group' ? 'groups' : 'direct_chats';
    const q = collection(db, collectionPath, id, 'typing');

    const unsub = onSnapshot(q, (snapshot) => {
      const names = snapshot.docs
        .filter(doc => doc.id !== user.uid)
        .map(doc => doc.data().name);
      setTypingUsers(names);
    });
    return unsub;
  }, [id, user, type]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(usersData.filter(u => u.uid !== user?.uid));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (showSettings) fetchUsers();
  }, [showSettings]);

  const canSend = useMemo(() => {
    if (!user) return false;
    if (type === 'direct') return true;

    if (!group) return false;
    if (isAdmin) return true;
    if (group.chatMode === 'EVERYONE') return true;
    if (group.chatMode === 'ADMIN_ONLY') return false;
    return true;
  }, [group, user, isAdmin, type]);

  const handleSend = useCallback(async (
    text: string | null, 
    mediaUrl: string | null, 
    mediaType: 'text' | 'image' | 'audio',
    mentions?: string[]
  ) => {
    if (!user) return;
    try {
      const tempId = 'temp-' + Date.now();
      const userPhoto = userProfile?.photoUrl || user?.photoURL || undefined;
      const tempMessage: Message = {
        id: tempId,
        senderId: user.uid,
        senderName: userProfile?.name || 'User',
        senderPhotoUrl: userPhoto,
        text: text || '',
        mentions: mentions || [],
        mediaUrl: mediaUrl || "",
        mediaType: mediaType,
        visibleTo: 'ALL',
        createdAt: new Date(),
        isDeleted: false
      };
      setMessages(prev => [...prev, tempMessage]);

      if (type === 'group') {
        if (!group) return;
        await sendMessage(group.id, text, mediaUrl, group.chatMode, isAdmin, mediaType, userPhoto, mentions);
      } else {
        await sendDirectMessage(id, text || '', mediaUrl, mediaType, userPhoto);
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error("SEND ERROR:", error);
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
      Alert.alert("Error", "Could not send message.");
    }
  }, [group, isAdmin, user, userProfile, type, id]);

  const handleTyping = useCallback((isTyping: boolean) => {
    if (canSend) {
      if (type === 'group' && group) {
        setTypingStatus(group.id, isTyping);
      }
    }
  }, [group, canSend, type]);

  const handleMessageLongPress = useCallback((message: Message) => {
    if (!user) return;
    const isMe = message.senderId === user.uid;
    const canDelete = (type === 'group' && isAdmin) || isMe;

    if (!canDelete) return;

    Alert.alert(
      "Options",
      (type === 'group' && isAdmin && !isMe) ? "Admin: Delete this user's message?" : "Delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: 'destructive',
          onPress: async () => {
            if (type === 'group' && group) {
              await softDeleteMessage(group.id, message.id);
            }
          }
        }
      ]
    );
  }, [group, user, isAdmin, type]);

  const handleSaveGroup = useCallback(async () => {
    if (!group || !editName.trim()) return;
    try {
      await updateGroup(group.id, { name: editName.trim() });
      Alert.alert("Success", "Group name updated");
    } catch (error) {
      Alert.alert("Error", "Failed to update group");
    }
  }, [group, editName]);

  const handleDeleteGroup = useCallback(() => {
    Alert.alert("Delete Group", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", 
        style: 'destructive', 
        onPress: async () => {
          if (!group) return;
          try {
            await deleteGroup(group.id);
            router.replace('/(tabs)/groups');
          } catch (error) {
            Alert.alert("Error", "Could not delete group");
          }
        }
      }
    ]);
  }, [group, router]);

  const toggleUserAllowed = useCallback(async (userId: string) => {
    if (!group) return;
    let newAllowed = [...group.allowedUsers];
    if (newAllowed.includes(userId)) {
      newAllowed = newAllowed.filter(uId => uId !== userId);
    } else {
      newAllowed.push(userId);
    }
    await updateGroup(group.id, { allowedUsers: newAllowed });
  }, [group]);

  const updateChatMode = useCallback(async (mode: ChatMode) => {
    if (!group) return;
    await updateGroup(group.id, { chatMode: mode });
  }, [group]);

  if (type === 'group' && !group) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const chatTitle = type === 'group' && group ? group.name : 'Direct Chat';
  const chatSubtitle = type === 'group' && group
    ? (group.chatMode === 'EVERYONE' ? 'Open Chat' : group.chatMode.replace(/_/g, ' '))
    : 'Direct Message';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* TOP APP BAR */}
      <View style={[
        styles.header, 
        { 
          paddingTop: Math.max(insets.top + 8, 44),
          backgroundColor: isDark ? colors.surfaceLow : colors.surfaceBright, 
          borderBottomColor: colors.border 
        }
      ]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.headerInfoTouchable}
            onPress={() => {
              if (type === 'group' && group) {
                setShowSettings(true);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.headerAvatar, { backgroundColor: isDark ? '#2A2A2A' : '#E5E5EA', overflow: 'hidden' }]}>
              {type === 'group' && group?.photoUrl ? (
                <Image source={{ uri: group.photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <Ionicons 
                  name={type === 'group' ? "people" : "person"} 
                  size={18} 
                  color={colors.primary} 
                />
              )}
              <View style={[styles.onlineDot, { borderColor: isDark ? colors.surfaceLow : '#FFFFFF' }]} />
            </View>

            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {chatTitle}
              </Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {type === 'group' ? `${chatSubtitle} • Tap for info` : chatSubtitle}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          {type === 'group' && !isAdmin && group && (
            <TouchableOpacity 
              style={[styles.headerActionBtn, { backgroundColor: isDark ? colors.card : colors.inputBackground }]}
              onPress={async () => {
                try {
                  const chatId = await getOrCreateDirectChat(group.adminId, 'Admin');
                  router.push({ pathname: "/group/[id]", params: { id: chatId, type: 'direct' } });
                } catch (e) {
                  Alert.alert("Error", "Could not start chat");
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}

          {type === 'group' && isAdmin && group && (
            <>
              <TouchableOpacity 
                style={[styles.headerActionBtn, { backgroundColor: isDark ? colors.card : colors.inputBackground }]}
                onPress={() => router.push({ pathname: '/group/add-members', params: { groupId: group.id } })}
                activeOpacity={0.7}
              >
                <Ionicons name="person-add-outline" size={18} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.headerActionBtn, { backgroundColor: isDark ? colors.card : colors.inputBackground }]}
                onPress={() => setShowSettings(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="options-outline" size={18} color={colors.text} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* CHAT MESSAGES CANVAS */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ChatBubble 
              message={item} 
              isAdmin={!!isAdmin} 
              onLongPress={handleMessageLongPress} 
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          initialNumToRender={20}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={10}
          windowSize={10}
          ListHeaderComponent={
            <View style={styles.dateHeaderRow}>
              <View style={[
                styles.datePill, 
                { 
                  backgroundColor: isDark ? colors.card : '#F3F3F8',
                  borderColor: colors.border,
                }
              ]}>
                <Text style={[styles.datePillText, { color: colors.textSecondary }]}>Today</Text>
              </View>
            </View>
          }
        />

        <TypingIndicator typingUsers={typingUsers} />

        <ChatInput
          onSend={handleSend}
          onTyping={handleTyping}
          placeholder={
            (type === 'group' && group?.chatMode === 'ADMIN_ONLY' && !isAdmin)
              ? "Only admins can send messages in this group"
              : "Type a message or @mention..."
          }
          disabled={!canSend}
          members={allUsers}
        />
      </KeyboardAvoidingView>

      {group && (
        <GroupSettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          group={group}
          editName={editName}
          setEditName={setEditName}
          onSaveName={handleSaveGroup}
          onUpdateChatMode={updateChatMode}
          allUsers={allUsers}
          loadingUsers={loadingUsers}
          onToggleUserAllowed={toggleUserAllowed}
          onDeleteGroup={handleDeleteGroup}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  header: { 
    paddingHorizontal: 14, 
    paddingBottom: 12, 
    borderBottomWidth: StyleSheet.hairlineWidth, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  headerInfoTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    borderWidth: 1.5,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 2,
  },
  headerTitle: { 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSub: { 
    fontSize: 12, 
    fontWeight: '400',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateHeaderRow: {
    alignItems: 'center',
    marginVertical: 14,
  },
  datePill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
});