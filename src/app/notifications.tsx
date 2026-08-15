import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { db } from '@/src/firebase/config';
import { 
  deleteNotification, 
  markAllNotificationsAsRead, 
  markNotificationAsRead 
} from '@/src/firebase/firestore';
import { AppNotification } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { 
  ActivityIndicator, 
  FlatList, 
  Image, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as AppNotification[];

      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return timeB - timeA;
      });

      setNotifications(list);
      setLoading(false);
    }, (error) => {
      console.error("Notifications listener error:", error);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const handleNotificationPress = async (item: AppNotification) => {
    if (!item.isRead) {
      await markNotificationAsRead(item.id);
    }

    if (item.groupId) {
      router.push({ pathname: '/group/[id]', params: { id: item.groupId, type: 'group' } });
    } else if (item.chatId) {
      router.push({ pathname: '/group/[id]', params: { id: item.chatId, type: 'direct' } });
    }
  };

  const handleMarkAllRead = async () => {
    if (user?.uid) {
      await markAllNotificationsAsRead(user.uid);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'mention':
        return { name: 'at', color: '#007AFF', bg: 'rgba(0, 122, 255, 0.15)' };
      case 'join_request':
        return { name: 'person-add', color: '#C567F4', bg: 'rgba(197, 103, 244, 0.15)' };
      case 'system':
        return { name: 'sparkles', color: '#34C759', bg: 'rgba(52, 199, 89, 0.15)' };
      default:
        return { name: 'chatbubble-ellipses', color: '#007AFF', bg: 'rgba(0, 122, 255, 0.15)' };
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.appTitle, { color: colors.text }]}>Notifications</Text>

        {unreadCount > 0 ? (
          <TouchableOpacity 
            style={styles.markReadBtn}
            onPress={handleMarkAllRead}
            activeOpacity={0.7}
          >
            <Text style={[styles.markReadText, { color: colors.primary }]}>Read All</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* NOTIFICATIONS LIST */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? colors.surfaceHigh : '#EDEDF2' }]}>
                <Ionicons name="notifications-off-outline" size={40} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notifications</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                You're all caught up! When you get messages or mentions, they will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const iconConfig = getIconForType(item.type);
            return (
              <TouchableOpacity 
                style={[
                  styles.notificationCard, 
                  { 
                    backgroundColor: item.isRead 
                      ? (isDark ? colors.card : '#FFFFFF') 
                      : (isDark ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 122, 255, 0.05)'),
                    borderColor: item.isRead ? colors.border : colors.borderHighlight,
                  }
                ]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.75}
              >
                {/* Avatar or Icon Badge */}
                <View style={styles.avatarWrapper}>
                  {item.senderPhotoUrl ? (
                    <Image 
                      source={{ uri: item.senderPhotoUrl }} 
                      style={styles.senderAvatar} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
                      <Ionicons name={iconConfig.name as any} size={20} color={iconConfig.color} />
                    </View>
                  )}
                  {!item.isRead && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary, borderColor: isDark ? colors.card : '#FFFFFF' }]} />
                  )}
                </View>

                {/* Content */}
                <View style={styles.contentWrapper}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.itemTime, { color: colors.textSecondary }]}>
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                  <Text style={[styles.itemBody, { color: item.isRead ? colors.textSecondary : colors.text }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>

                {/* Delete button */}
                <TouchableOpacity 
                  style={styles.deleteBtn}
                  onPress={() => deleteNotification(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
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
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  markReadBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '600',
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
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginVertical: 4,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  senderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  itemTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
    gap: 12,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
