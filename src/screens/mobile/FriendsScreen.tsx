import React, { useState, useMemo } from 'react';
import { useMobileFriends } from '../../context/MobileFriendsContext';
import { Friend, FriendRequest, GameInvitation } from '../../types/friends';

const { width: screenWidth } = Dimensions.get('window');

interface FriendsScreenProps {
  onNavigateBack?: () => void;
}

export const FriendsScreen: React.FC<FriendsScreenProps> = ({ onNavigateBack }) => {
  const [fontsLoaded] = useFonts({
    Audiowide_400Regular,
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_600SemiBold,
  });

  const {
    friends,
    pendingRequests,
    gameInvitations,
    userFriendCode,
    onlineFriendsCount,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    inviteToGame,
    acceptGameInvitation,
    declineGameInvitation,
    refreshFriends,
  } = useMobileFriendsContext();

  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'invitations' | 'add'>('friends');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [friendCode, setFriendCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#4ADE80';
      case 'away': return '#FBBF24';
      case 'busy': return '#F87171';
      default: return '#6B7280';
    }
  };

  const getStatusText = (friend: any) => {
    if (!friend.presence?.isOnline) return 'Offline';
    if (friend.presence.currentGame) return 'In Game';
    return friend.presence.status.charAt(0).toUpperCase() + friend.presence.status.slice(1);
  };

  const filteredFriends = useMemo(() => {
    let filtered = friends;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(friend => {
        const name = friend.nickname || friend.friendData.displayName || friend.friendData.email;
        return name.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Apply status filter
    if (statusFilter === 'online') {
      filtered = filtered.filter(friend => 
        friend.presence?.isOnline && friend.presence?.status !== 'offline'
      );
    } else if (statusFilter === 'offline') {
      filtered = filtered.filter(friend => 
        !friend.presence?.isOnline || friend.presence?.status === 'offline'
      );
    }

    // Sort by online status first, then by name
    return filtered.sort((a, b) => {
      const aOnline = a.presence?.isOnline && a.presence?.status !== 'offline';
      const bOnline = b.presence?.isOnline && b.presence?.status !== 'offline';
      
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      
      const nameA = a.nickname || a.friendData.displayName || a.friendData.email;
      const nameB = b.nickname || b.friendData.displayName || b.friendData.email;
      return nameA.localeCompare(nameB);
    });
  }, [friends, searchTerm, statusFilter]);

  const handleCopyFriendCode = async () => {
    try {
      await Clipboard.setString(userFriendCode);
      Alert.alert('Success', 'Friend code copied to clipboard!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy friend code');
    }
  };

  const handleSendFriendRequest = async () => {
    if (!friendCode.trim()) {
      Alert.alert('Error', 'Please enter a friend code');
      return;
    }
    
    setSendingRequest(true);
    try {
      await sendFriendRequest(friendCode.trim().toUpperCase());
      Alert.alert('Success', `Friend request sent to ${friendCode}`);
      setFriendCode('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept friend request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await declineFriendRequest(requestId);
      Alert.alert('Info', 'Friend request declined');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to decline friend request');
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await acceptGameInvitation(invitationId);
      Alert.alert('Success', 'Game invitation accepted! Starting game...');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      await declineGameInvitation(invitationId);
      Alert.alert('Info', 'Game invitation declined');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to decline invitation');
    }
  };

  const handleInviteToGame = async (friendId: string) => {
    try {
      await inviteToGame(friendId, 'quick');
      Alert.alert('Success', 'Game invitation sent!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send invitation');
    }
  };

  const handleRemoveFriend = (friendId: string) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await removeFriend(friendId);
            Alert.alert('Success', 'Friend removed');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to remove friend');
          }
        }},
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshFriends();
    } catch (error) {
      console.error('Failed to refresh friends:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const tabs = [
    { id: 'friends', label: 'Friends', count: friends.length },
    { id: 'requests', label: 'Requests', count: pendingRequests.length },
    { id: 'invitations', label: 'Invites', count: gameInvitations.length },
    { id: 'add', label: 'Add', count: 0 },
  ];

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.backButton}>
          <Text style={[styles.backButtonText, { fontFamily: 'Audiowide_400Regular' }]}>
            ← BACK
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { fontFamily: 'Audiowide_400Regular' }]}>
          FRIENDS
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { fontFamily: 'Audiowide_400Regular' }]}>
            {friends.length}
          </Text>
          <Text style={[styles.statLabel, { fontFamily: 'Montserrat_400Regular' }]}>
            Friends
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { fontFamily: 'Audiowide_400Regular', color: '#4ADE80' }]}>
            {onlineFriendsCount}
          </Text>
          <Text style={[styles.statLabel, { fontFamily: 'Montserrat_400Regular' }]}>
            Online
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id as any)}
              style={[
                styles.tab,
                activeTab === tab.id && styles.activeTab
              ]}
            >
              <Text style={[
                styles.tabText,
                { fontFamily: 'Audiowide_400Regular' },
                activeTab === tab.id && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={[styles.tabBadgeText, { fontFamily: 'Audiowide_400Regular' }]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD700"
          />
        }
      >
        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <View style={styles.friendsContainer}>
            {/* Search and Filter */}
            <View style={styles.filterContainer}>
              <TextInput
                style={[styles.searchInput, { fontFamily: 'Montserrat_400Regular' }]}
                placeholder="Search friends..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              <View style={styles.filterButtons}>
                {['all', 'online', 'offline'].map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => setStatusFilter(filter as any)}
                    style={[
                      styles.filterButton,
                      statusFilter === filter && styles.activeFilterButton
                    ]}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      { fontFamily: 'Montserrat_600SemiBold' },
                      statusFilter === filter && styles.activeFilterButtonText
                    ]}>
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Friends List */}
            {filteredFriends.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { fontFamily: 'Montserrat_400Regular' }]}>
                  {searchTerm ? 'No friends found' : 'No friends yet'}
                </Text>
                <Text style={[styles.emptyStateSubtext, { fontFamily: 'Montserrat_300Light' }]}>
                  {searchTerm ? 'Try a different search term' : 'Add friends to start playing together!'}
                </Text>
              </View>
            ) : (
              filteredFriends.map((friend) => (
                <View key={friend.id} style={styles.friendCard}>
                  <View style={styles.friendInfo}>
                    <View style={styles.friendHeader}>
                      <Text style={[styles.friendName, { fontFamily: 'Montserrat_600SemiBold' }]}>
                        {friend.nickname || friend.friendData.displayName}
                      </Text>
                      <View style={styles.statusContainer}>
                        <View style={[
                          styles.statusDot,
                          { backgroundColor: getStatusColor(friend.presence?.status || 'offline') }
                        ]} />
                        <Text style={[styles.statusText, { fontFamily: 'Montserrat_400Regular' }]}>
                          {getStatusText(friend)}
                        </Text>
                      </View>
                    </View>
                    {friend.presence?.currentGame && (
                      <Text style={[styles.gameStatus, { fontFamily: 'Montserrat_300Light' }]}>
                        Playing a game
                      </Text>
                    )}
                    {!friend.presence?.isOnline && friend.presence?.lastSeen && (
                      <Text style={[styles.lastSeen, { fontFamily: 'Montserrat_300Light' }]}>
                        Last seen {formatTimeAgo(friend.presence.lastSeen)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.friendActions}>
                    <TouchableOpacity
                      onPress={() => handleInviteToGame(friend.friendId)}
                      style={[
                        styles.actionButton, 
                        styles.inviteButton,
                        (!friend.presence?.isOnline || friend.presence?.currentGame) && styles.disabledButton
                      ]}
                      disabled={!friend.presence?.isOnline || !!friend.presence?.currentGame}
                    >
                      <Text style={[styles.actionButtonText, { fontFamily: 'Audiowide_400Regular' }]}>
                        INVITE
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveFriend(friend.friendId)}
                      style={[styles.actionButton, styles.removeButton]}
                    >
                      <Text style={[styles.actionButtonText, { fontFamily: 'Audiowide_400Regular' }]}>
                        REMOVE
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Friend Requests Tab */}
        {activeTab === 'requests' && (
          <View style={styles.requestsContainer}>
            {pendingRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { fontFamily: 'Montserrat_400Regular' }]}>
                  No pending requests
                </Text>
                <Text style={[styles.emptyStateSubtext, { fontFamily: 'Montserrat_300Light' }]}>
                  Friend requests will appear here
                </Text>
              </View>
            ) : (
              pendingRequests.map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestInfo}>
                    <Text style={[styles.requestName, { fontFamily: 'Montserrat_600SemiBold' }]}>
                      {request.fromUser.displayName}
                    </Text>
                    <Text style={[styles.requestCode, { fontFamily: 'Montserrat_400Regular' }]}>
                      {request.fromUser.friendCode}
                    </Text>
                    <Text style={[styles.requestTime, { fontFamily: 'Montserrat_300Light' }]}>
                      {formatTimeAgo(request.createdAt)}
                    </Text>
                    {request.message && (
                      <Text style={[styles.requestMessage, { fontFamily: 'Montserrat_300Light' }]}>
                        "{request.message}"
                      </Text>
                    )}
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      onPress={() => handleAcceptRequest(request.id)}
                      style={[styles.actionButton, styles.acceptButton]}
                    >
                      <Text style={[styles.actionButtonText, { fontFamily: 'Audiowide_400Regular' }]}>
                        ACCEPT
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeclineRequest(request.id)}
                      style={[styles.actionButton, styles.declineButton]}
                    >
                      <Text style={[styles.actionButtonText, { fontFamily: 'Audiowide_400Regular' }]}>
                        DECLINE
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Game Invitations Tab */}
        {activeTab === 'invitations' && (
          <View style={styles.invitationsContainer}>
            {gameInvitations.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { fontFamily: 'Montserrat_400Regular' }]}>
                  No game invitations
                </Text>
                <Text style={[styles.emptyStateSubtext, { fontFamily: 'Montserrat_300Light' }]}>
                  Game invitations will appear here
                </Text>
              </View>
            ) : (
              gameInvitations.map((invitation) => {
                const timeLeft = Math.ceil((invitation.expiresAt.getTime() - Date.now()) / 60000);
                const isExpired = timeLeft <= 0;
                
                return (
                  <View key={invitation.id} style={[styles.invitationCard, isExpired && styles.expiredCard]}>
                    <View style={styles.invitationInfo}>
                      <Text style={[styles.invitationName, { fontFamily: 'Montserrat_600SemiBold' }]}>
                        {invitation.fromUser.displayName}
                      </Text>
                      <Text style={[styles.invitationMode, { fontFamily: 'Montserrat_400Regular' }]}>
                        {invitation.gameMode.charAt(0).toUpperCase() + invitation.gameMode.slice(1)} game
                      </Text>
                      <Text style={[
                        styles.invitationTime, 
                        { fontFamily: 'Montserrat_300Light' },
                        isExpired && styles.expiredText
                      ]}>
                        {isExpired ? 'Expired' : `Expires in ${timeLeft} minutes`}
                      </Text>
                    </View>
                    {!isExpired && (
                      <View style={styles.invitationActions}>
                        <TouchableOpacity
                          onPress={() => handleAcceptInvitation(invitation.id)}
                          style={[styles.actionButton, styles.acceptButton]}
                        >
                          <Text style={[styles.actionButtonText, { fontFamily: 'Audiowide_400Regular' }]}>
                            ACCEPT
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeclineInvitation(invitation.id)}
                          style={[styles.actionButton, styles.declineButton]}
                        >
                          <Text style={[styles.actionButtonText, { fontFamily: 'Audiowide_400Regular' }]}>
                            DECLINE
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Add Friend Tab */}
        {activeTab === 'add' && (
          <View style={styles.addFriendContainer}>
            <View style={styles.addFriendSection}>
              <Text style={[styles.sectionTitle, { fontFamily: 'Audiowide_400Regular' }]}>
                YOUR FRIEND CODE
              </Text>
              <View style={styles.friendCodeDisplay}>
                <Text style={[styles.userFriendCode, { fontFamily: 'Audiowide_400Regular' }]}>
                  {userFriendCode}
                </Text>
                <TouchableOpacity onPress={handleCopyFriendCode} style={styles.copyButton}>
                  <Text style={[styles.copyButtonText, { fontFamily: 'Montserrat_600SemiBold' }]}>
                    COPY
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.sectionDescription, { fontFamily: 'Montserrat_300Light' }]}>
                Share this code with friends so they can add you
              </Text>
            </View>

            <View style={styles.addFriendSection}>
              <Text style={[styles.sectionTitle, { fontFamily: 'Audiowide_400Regular' }]}>
                ADD FRIEND
              </Text>
              <TextInput
                style={[styles.friendCodeInput, { fontFamily: 'Montserrat_400Regular' }]}
                placeholder="Enter friend code..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={friendCode}
                onChangeText={setFriendCode}
                autoCapitalize="characters"
                maxLength={8}
              />
              <TouchableOpacity
                onPress={handleSendFriendRequest}
                style={[
                  styles.sendRequestButton, 
                  (!friendCode.trim() || sendingRequest) && styles.disabledButton
                ]}
                disabled={!friendCode.trim() || sendingRequest}
              >
                <Text style={[styles.sendRequestButtonText, { fontFamily: 'Audiowide_400Regular' }]}>
                  {sendingRequest ? 'SENDING...' : 'SEND REQUEST'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.sectionDescription, { fontFamily: 'Montserrat_300Light' }]}>
                Enter your friend's 8-character code to send a friend request
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#111827',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#60A5FA',
    fontSize: 14,
  },
  title: {
    color: '#FFD700',
    fontSize: 20,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  tabsContainer: {
    backgroundColor: '#111827',
    paddingVertical: 16,
  },
  tabsScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 80,
  },
  activeTab: {
    backgroundColor: '#FFD700',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  activeTabText: {
    color: '#000',
  },
  tabBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  friendsContainer: {
    paddingTop: 20,
  },
  filterContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeFilterButton: {
    backgroundColor: '#FFD700',
  },
  filterButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  activeFilterButtonText: {
    color: '#000',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  friendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  friendName: {
    color: '#fff',
    fontSize: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  gameStatus: {
    color: '#60A5FA',
    fontSize: 12,
    fontStyle: 'italic',
  },
  lastSeen: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  friendActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  inviteButton: {
    backgroundColor: '#10B981',
  },
  removeButton: {
    backgroundColor: '#EF4444',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 10,
  },
  requestsContainer: {
    paddingTop: 20,
  },
  requestCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  requestInfo: {
    marginBottom: 12,
  },
  requestName: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  requestCode: {
    color: '#FFD700',
    fontSize: 14,
    marginBottom: 4,
  },
  requestTime: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginBottom: 8,
  },
  requestMessage: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  invitationsContainer: {
    paddingTop: 20,
  },
  invitationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  expiredCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.6,
  },
  invitationInfo: {
    marginBottom: 12,
  },
  invitationName: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  invitationMode: {
    color: '#60A5FA',
    fontSize: 14,
    marginBottom: 4,
  },
  invitationTime: {
    color: '#FBBF24',
    fontSize: 12,
  },
  expiredText: {
    color: '#EF4444',
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  addFriendContainer: {
    paddingTop: 20,
  },
  addFriendSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  friendCodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  userFriendCode: {
    flex: 1,
    color: '#FFD700',
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 2,
  },
  copyButton: {
    backgroundColor: '#60A5FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  sectionDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  friendCodeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 16,
  },
  sendRequestButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  sendRequestButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});