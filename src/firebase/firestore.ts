import {
  addDoc, 
  collection, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  serverTimestamp, 
  setDoc, 
  updateDoc, 
  where 
} from 'firebase/firestore';
import { 
  ChatMode, 
  Group, 
  JoinRequest, 
  MessageType, 
  MessageVisibility, 
  UserProfile 
} from '../types';
import { auth, db } from './config';

/**
 * -------------------------------------------------------------
 * GROUP MANAGEMENT
 * -------------------------------------------------------------
 */
export const createGroup = async (name: string, photoUrl?: string, initialMemberIds: string[] = []) => {
  if (!auth.currentUser) throw new Error("Not authenticated");
  
  const currentUid = auth.currentUser.uid;
  const initialMembers = Array.from(new Set([currentUid, ...initialMemberIds]));

  const groupData: Record<string, any> = {
    name,
    adminId: currentUid,
    adminIds: [currentUid],
    chatMode: 'EVERYONE',
    allowedUsers: initialMembers,
    members: initialMembers,
    createdAt: serverTimestamp(),
  };

  if (photoUrl) {
    groupData.photoUrl = photoUrl;
  }

  const docRef = await addDoc(collection(db, 'groups'), groupData);
  return docRef.id;
};

export const updateGroupPhoto = async (groupId: string, photoUrl: string) => {
  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, { photoUrl });
};

export const updateGroup = async (groupId: string, data: any) => {
  const groupRef = doc(db, 'groups', groupId);
  const cleanData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) cleanData[key] = value;
  }
  await updateDoc(groupRef, cleanData);
};

export const updateGroupSettings = async (
  groupId: string, 
  updates: { chatMode?: ChatMode; allowedUsers?: string[]; photoUrl?: string; name?: string }
) => {
  const groupRef = doc(db, 'groups', groupId);
  const cleanUpdates: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) cleanUpdates[key] = value;
  }
  await updateDoc(groupRef, cleanUpdates);
};

export const deleteGroup = async (groupId: string) => {
  await deleteDoc(doc(db, 'groups', groupId));
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  const userRef = doc(db, 'users', userId);
  const cleanUpdates: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  }
  await setDoc(userRef, cleanUpdates, { merge: true });
};

export const addMembersToGroup = async (groupId: string, userIds: string[]) => {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) return;
  const data = groupSnap.data() as Group;
  const currentAllowed = data.allowedUsers || [];

  const updated = Array.from(new Set([...currentAllowed, ...userIds]));
  await updateDoc(groupRef, { allowedUsers: updated });

  // Dispatch notifications to the newly added users
  const groupName = data.name || 'Group';
  userIds.forEach(uid => {
    if (!currentAllowed.includes(uid)) {
      createNotification({
        userId: uid,
        title: 'Added to Channel 🎉',
        body: `You were added to "${groupName}" by an administrator`,
        type: 'system',
        groupId: groupId,
      });
    }
  });
};

export const removeMemberFromGroup = async (groupId: string, userId: string) => {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) return;
  const data = groupSnap.data() as Group;
  const currentAllowed = data.allowedUsers || [];

  const updated = currentAllowed.filter(id => id !== userId);
  await updateDoc(groupRef, { allowedUsers: updated });
};

export const toggleGroupMember = async (groupId: string, userId: string) => {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) return;
  const data = groupSnap.data() as Group;
  const currentAllowed = data.allowedUsers || [];

  const isMember = currentAllowed.includes(userId);
  const updated = isMember 
    ? currentAllowed.filter(id => id !== userId) 
    : [...currentAllowed, userId];

  await updateDoc(groupRef, { allowedUsers: updated });
};

export const promoteToGroupAdmin = async (groupId: string, userId: string) => {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) return;
  const data = groupSnap.data() as Group;
  const currentAdmins = data.adminIds || (data.adminId ? [data.adminId] : []);
  const currentAllowed = data.allowedUsers || [];

  const updatedAdmins = Array.from(new Set([...currentAdmins, userId]));
  const updatedAllowed = Array.from(new Set([...currentAllowed, userId]));

  await updateDoc(groupRef, { 
    adminIds: updatedAdmins,
    allowedUsers: updatedAllowed 
  });
};

export const demoteGroupAdmin = async (groupId: string, userId: string) => {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) return;
  const data = groupSnap.data() as Group;
  const currentAdmins = data.adminIds || (data.adminId ? [data.adminId] : []);

  const updatedAdmins = currentAdmins.filter(id => id !== userId);
  await updateDoc(groupRef, { adminIds: updatedAdmins });
};

export const isUserGroupAdmin = (group: Group | null | undefined, userId: string | null | undefined): boolean => {
  if (!group || !userId) return false;
  if (group.adminId === userId) return true;
  if (group.adminIds && group.adminIds.includes(userId)) return true;
  return false;
};

/**
 * -------------------------------------------------------------
 * NOTIFICATIONS
 * -------------------------------------------------------------
 */
export const createNotification = async (params: {
  userId?: string;
  title?: string;
  body?: string;
  type?: 'message' | 'mention' | 'join_request' | 'system';
  senderId?: string;
  senderName?: string;
  senderPhotoUrl?: string | null;
  groupId?: string | null;
  chatId?: string | null;
}) => {
  if (!params || !params.userId) return;
  try {
    const cleanData: Record<string, any> = {
      userId: String(params.userId),
      title: String(params.title || 'Notification'),
      body: String(params.body || ''),
      type: params.type || 'message',
      isRead: false,
      createdAt: serverTimestamp(),
    };
    if (params.senderId) cleanData.senderId = String(params.senderId);
    if (params.senderName) cleanData.senderName = String(params.senderName);
    if (params.senderPhotoUrl) cleanData.senderPhotoUrl = String(params.senderPhotoUrl);
    if (params.groupId) cleanData.groupId = String(params.groupId);
    if (params.chatId) cleanData.chatId = String(params.chatId);

    await addDoc(collection(db, 'notifications'), cleanData);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const markNotificationAsRead = async (notificationId: string) => {
  const ref = doc(db, 'notifications', notificationId);
  await updateDoc(ref, { isRead: true });
};

export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const unreadDocs = snap.docs.filter(d => d.data().isRead === false);
    const promises = unreadDocs.map(d => updateDoc(doc(db, 'notifications', d.id), { isRead: true }));
    await Promise.all(promises);
  } catch (error) {
    console.error('Error marking all notifications read:', error);
  }
};

export const deleteNotification = async (notificationId: string) => {
  await deleteDoc(doc(db, 'notifications', notificationId));
};

/**
 * -------------------------------------------------------------
 * MESSAGING & MENTIONS
 * -------------------------------------------------------------
 */
export const sendMessage = async (
  groupId: string, 
  text: string | null,
  mediaUrl: string | null,
  chatMode: ChatMode, 
  isAdmin: boolean,
  mediaType: MessageType = 'text',
  senderPhotoUrl?: string | null,
  mentions?: string[]
) => {
  if (!auth.currentUser) throw new Error("Not authenticated");
  const currentUid = auth.currentUser.uid;

  // 1. Fetch Sender Name & Photo
  const userDoc = await getDoc(doc(db, 'users', currentUid));
  const userData = userDoc.exists() ? userDoc.data() : null;
  const senderName = userData?.name || 'User';
  const photoUrl = senderPhotoUrl || userData?.photoUrl || null;

  // 2. Determine Visibility
  const visibleTo: MessageVisibility = 'ALL';

  // 3. Save Message
  const messageData = {
    senderId: currentUid,
    senderName: senderName || 'Unknown',
    senderPhotoUrl: photoUrl || null,
    text: text || '',
    mentions: mentions || [],
    mediaUrl: mediaUrl || null,
    mediaType: mediaType || 'text',
    visibleTo: visibleTo,
    createdAt: serverTimestamp(),
    isDeleted: false
  };

  await addDoc(collection(db, 'groups', groupId, 'messages'), messageData);

  // 4. Dispatch Notifications & Mentions
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    const groupName = groupDoc.exists() ? groupDoc.data().name : 'Group';

    // Fetch all users to notify
    const usersSnap = await getDocs(collection(db, 'users'));
    const allUsers = usersSnap.docs.map(d => ({ ...(d.data() as UserProfile), uid: d.id }));

    const contentPreview = text || (mediaType === 'image' ? '📷 Image' : '🎙️ Audio note');

    // Parse text for @name or @all
    const textLower = (text || '').toLowerCase();
    const isMentionAll = textLower.includes('@all') || textLower.includes('@everyone');

    allUsers.forEach((recipient) => {
      if (recipient.uid === currentUid) return;

      const isUserMentioned = isMentionAll || 
        (mentions && mentions.includes(recipient.uid)) ||
        textLower.includes(`@${recipient.name.toLowerCase()}`);

      if (isUserMentioned) {
        createNotification({
          userId: recipient.uid,
          title: `Mention in ${groupName}`,
          body: `${senderName} mentioned you: "${contentPreview}"`,
          type: 'mention',
          senderId: currentUid,
          senderName,
          senderPhotoUrl: photoUrl || undefined,
          groupId,
        });
      } else {
        createNotification({
          userId: recipient.uid,
          title: groupName,
          body: `${senderName}: ${contentPreview}`,
          type: 'message',
          senderId: currentUid,
          senderName,
          senderPhotoUrl: photoUrl || undefined,
          groupId,
        });
      }
    });
  } catch (err) {
    console.error('Error dispatching group notifications:', err);
  }
};

export const softDeleteMessage = async (groupId: string, messageId: string) => {
  const messageRef = doc(db, 'groups', groupId, 'messages', messageId);
  await updateDoc(messageRef, { isDeleted: true });
};

export const setTypingStatus = async (groupId: string, isTyping: boolean) => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const userRef = doc(db, 'groups', groupId, 'typing', userId);

  if (isTyping) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const name = userDoc.exists() ? userDoc.data().name : 'Someone';
    
    await setDoc(userRef, {
      name,
      isTyping: true,
      timestamp: serverTimestamp()
    });
  } else {
    await deleteDoc(userRef);
  }
};

/**
 * -------------------------------------------------------------
 * DIRECT CHATS
 * -------------------------------------------------------------
 */
export const getOrCreateDirectChat = async (adminId: string, adminName: string) => {
  if (!auth.currentUser) throw new Error("Not authenticated");
  const myUid = auth.currentUser.uid;

  const q = query(
    collection(db, 'direct_chats'), 
    where('participants', 'array-contains', myUid)
  );
  
  const snapshot = await getDocs(q);
  const existingChat = snapshot.docs.find(doc => 
    doc.data().participants.includes(adminId)
  );

  if (existingChat) {
    return existingChat.id;
  }

  // Create new chat
  const myProfile = await getDoc(doc(db, 'users', myUid));
  const myName = myProfile.exists() ? myProfile.data().name : 'User';
  const myPhoto = myProfile.exists() ? myProfile.data().photoUrl : '';

  const adminProfile = await getDoc(doc(db, 'users', adminId));
  const adminPhoto = adminProfile.exists() ? adminProfile.data().photoUrl : '';

  const newChatRef = await addDoc(collection(db, 'direct_chats'), {
    participants: [myUid, adminId],
    participantNames: {
      [myUid]: myName,
      [adminId]: adminName
    },
    participantPhotos: {
      [myUid]: myPhoto || '',
      [adminId]: adminPhoto || '',
    },
    lastMessage: 'Message request',
    lastMessageTime: serverTimestamp(),
    createdAt: serverTimestamp(),
    status: 'PENDING',
    initiatedBy: myUid,
  });

  return newChatRef.id;
};

export const acceptDirectChat = async (chatId: string) => {
  await updateDoc(doc(db, 'direct_chats', chatId), {
    status: 'ACCEPTED'
  });
};

export const rejectDirectChat = async (chatId: string) => {
  await updateDoc(doc(db, 'direct_chats', chatId), {
    status: 'REJECTED'
  });
};

export const sendDirectMessage = async (
  chatId: string, 
  text: string, 
  mediaUrl: string | null, 
  type: 'text' | 'image' | 'audio',
  senderPhotoUrl?: string | null
) => {
  if (!auth.currentUser) throw new Error("Not authenticated");
  const currentUid = auth.currentUser.uid;
  
  const userDoc = await getDoc(doc(db, 'users', currentUid));
  const userData = userDoc.exists() ? userDoc.data() : null;
  const senderName = userData?.name || 'User';
  const photoUrl = senderPhotoUrl || userData?.photoUrl || null;

  await addDoc(collection(db, 'direct_chats', chatId, 'messages'), {
    senderId: currentUid,
    senderName: senderName || 'Unknown',
    senderPhotoUrl: photoUrl || null,
    text: text || '',
    mediaUrl: mediaUrl || null,
    mediaType: type,
    createdAt: serverTimestamp(),
    isDeleted: false,
    visibleTo: 'ALL'
  });

  // Update last message in direct chat
  const contentPreview = type === 'text' ? text : `Sent a ${type}`;
  await setDoc(doc(db, 'direct_chats', chatId), {
    lastMessage: contentPreview,
    lastMessageTime: serverTimestamp()
  }, { merge: true });

  // Dispatch direct message notification to recipient
  try {
    const chatDoc = await getDoc(doc(db, 'direct_chats', chatId));
    if (chatDoc.exists()) {
      const participants: string[] = chatDoc.data().participants || [];
      const recipientId = participants.find(p => p !== currentUid);
      if (recipientId) {
        createNotification({
          userId: recipientId,
          title: senderName,
          body: contentPreview,
          type: 'message',
          senderId: currentUid,
          senderName,
          senderPhotoUrl: photoUrl || undefined,
          chatId,
        });
      }
    }
  } catch (err) {
    console.error('Error dispatching direct message notification:', err);
  }
};

/**
 * -------------------------------------------------------------
 * JOIN REQUESTS
 * -------------------------------------------------------------
 */
export const sendJoinRequest = async (groupId: string, groupName: string, adminId: string) => {
  if (!auth.currentUser) return;
  const currentUid = auth.currentUser.uid;
  
  const userDoc = await getDoc(doc(db, 'users', currentUid));
  const userData = userDoc.exists() ? userDoc.data() : null;
  const userName = userData?.name || 'User';
  const userPhoto = userData?.photoUrl || null;

  const reqData: Record<string, any> = {
    groupId,
    groupName,
    adminId,
    userId: currentUid,
    userName,
    status: 'pending',
    createdAt: serverTimestamp()
  };

  if (userPhoto) {
    reqData.userPhotoUrl = userPhoto;
  }

  await addDoc(collection(db, 'join_requests'), reqData);

  // Notify group admin
  createNotification({
    userId: adminId,
    title: 'New Join Request',
    body: `${userName} requested to join "${groupName}"`,
    type: 'join_request',
    senderId: currentUid,
    senderName: userName,
    senderPhotoUrl: userPhoto || undefined,
    groupId,
  });
};

export const approveJoinRequest = async (request: JoinRequest) => {
  const groupRef = doc(db, 'groups', request.groupId);
  const groupDoc = await getDoc(groupRef);
  
  if (groupDoc.exists()) {
    const currentAllowed = groupDoc.data().allowedUsers || [];
    if (!currentAllowed.includes(request.userId)) {
      await updateDoc(groupRef, {
        allowedUsers: [...currentAllowed, request.userId]
      });
    }
  }

  // Notify approved user
  createNotification({
    userId: request.userId,
    title: 'Request Approved! 🎉',
    body: `You have been approved to chat in "${request.groupName}"`,
    type: 'system',
    groupId: request.groupId,
  });

  await deleteDoc(doc(db, 'join_requests', request.id));
};

export const rejectJoinRequest = async (requestId: string) => {
  await deleteDoc(doc(db, 'join_requests', requestId));
};