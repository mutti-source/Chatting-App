import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { db } from '@/src/firebase/config';
import { getOrCreateDirectChat } from '@/src/firebase/firestore';
import SwipeableTabWrapper from '@/src/components/ui/SwipeableTabWrapper';
import { UserProfile } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  Image,
  SectionList, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ContactSection {
  title: string;
  data: UserProfile[];
}

export default function ContactsScreen() {
  const { user, userProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabMargin = insets.bottom > 0 ? insets.bottom + 6 : 14;
  const fabBottom = tabMargin + 64 + 16;
  const listBottomPadding = fabBottom + 70;

  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startingChatWith, setStartingChatWith] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => u.uid !== user.uid);
      setContacts(allUsers);
      setLoading(false);
    }, (error) => {
      console.error('Fetch contacts error:', error);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const handleStartChat = async (contact: UserProfile) => {
    if (startingChatWith) return;
    setStartingChatWith(contact.uid);
    try {
      const chatId = await getOrCreateDirectChat(contact.uid, contact.name);
      router.push({ pathname: "/group/[id]", params: { id: chatId, type: 'direct' } });
    } catch (error) {
      console.error("Start chat error:", error);
      Alert.alert("Error", "Could not start chat with this contact.");
    } finally {
      setStartingChatWith(null);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const queryLower = searchQuery.toLowerCase();
    return contacts.filter(c => 
      c.name.toLowerCase().includes(queryLower) || 
      c.email.toLowerCase().includes(queryLower)
    );
  }, [contacts, searchQuery]);

  const sections: ContactSection[] = useMemo(() => {
    const sorted = [...filteredContacts].sort((a, b) => a.name.localeCompare(b.name));
    const map = new Map<string, UserProfile[]>();

    sorted.forEach((item) => {
      const letter = (item.name[0] || '#').toUpperCase();
      const groupKey = /^[A-Z]$/.test(letter) ? letter : '#';
      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey)!.push(item);
    });

    return Array.from(map.entries()).map(([title, data]) => ({
      title,
      data,
    }));
  }, [filteredContacts]);

  return (
    <SwipeableTabWrapper currentTab="contacts">
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
                style={styles.avatarImage} 
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.userAvatarText, { color: colors.primary }]}>
                {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <Text style={[styles.appTitle, { color: colors.text }]}>Contacts</Text>

        <View style={styles.topTrailingRow}>
          <TouchableOpacity 
            style={styles.notifBtn}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.topTrailing}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* SEARCH AND QUICK ACTIONS */}
      <View style={styles.headerSearchArea}>
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
            placeholder="Search contacts..."
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

        {/* Bento Quick Actions Grid */}
        <View style={styles.bentoGrid}>
          <TouchableOpacity 
            style={[
              styles.bentoCard, 
              { 
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                borderColor: colors.border,
              }
            ]}
            onPress={() => router.push('/(tabs)/groups')}
            activeOpacity={0.75}
          >
            <View style={[styles.bentoIcon, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)' }]}>
              <Ionicons name="people" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.bentoTitle, { color: colors.text }]}>Browse Groups</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.bentoCard, 
              { 
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                borderColor: colors.border,
              }
            ]}
            onPress={() => Alert.alert("Contacts Directory", "All registered users are loaded automatically.")}
            activeOpacity={0.75}
          >
            <View style={[styles.bentoIcon, { backgroundColor: isDark ? 'rgba(197, 103, 244, 0.15)' : 'rgba(197, 103, 244, 0.1)' }]}>
              <Ionicons name="person-add" size={20} color="#C567F4" />
            </View>
            <Text style={[styles.bentoTitle, { color: colors.text }]}>Directory ({contacts.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTACTS LIST */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading contacts...</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: listBottomPadding }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'No contacts found matching search' : 'No other users registered yet'}
              </Text>
            </View>
          }
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionHeaderText, { color: colors.primary }]}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isStarting = startingChatWith === item.uid;
            return (
              <TouchableOpacity 
                style={[
                  styles.contactCard, 
                  { 
                    backgroundColor: isDark ? colors.card : '#FFFFFF',
                    borderColor: colors.border,
                  }
                ]}
                onPress={() => handleStartChat(item)}
                activeOpacity={0.7}
                disabled={isStarting}
              >
                <View style={[styles.contactAvatar, { backgroundColor: isDark ? '#2A2A2A' : '#E5E5EA' }]}>
                  {item.photoUrl ? (
                    <Image 
                      source={{ uri: item.photoUrl }} 
                      style={styles.avatarImage} 
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={[styles.contactInitials, { color: colors.primary }]}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                  <View style={[styles.onlineDot, { borderColor: isDark ? colors.card : '#FFFFFF' }]} />
                </View>

                <View style={styles.contactInfo}>
                  <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.contactEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.role === 'admin' ? 'Super Admin' : item.email}
                  </Text>
                </View>

                {isStarting ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* FAB - Quick Chat / Sync */}
      <TouchableOpacity 
        style={[
          styles.fab, 
          { 
            backgroundColor: colors.primary, 
            bottom: fabBottom,
            shadowColor: colors.primary,
          }
        ]} 
        onPress={() => {
          if (contacts.length > 0) {
            handleStartChat(contacts[0]);
          } else {
            Alert.alert("Contacts", "Waiting for other users to register.");
          }
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="sync" size={26} color="#FFFFFF" />
      </TouchableOpacity>

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
  avatarImage: {
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
  },
  topTrailing: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSearchArea: {
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
  bentoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  bentoCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  bentoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bentoTitle: {
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
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '700',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  contactAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  contactInitials: {
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
  contactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
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
});
