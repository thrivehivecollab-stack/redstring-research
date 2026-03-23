import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bookmark,
  Globe,
  FileText,
  Film,
  Rss,
  Plus,
  Search,
  Filter,
  Check,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';

const COLORS = {
  background: '#0F0D0B',
  surface: '#231F1C',
  card: '#F5ECD7',
  red: '#C41E3A',
  pin: '#D4A574',
  textLight: '#E8DCC8',
  muted: '#6B5B4F',
  border: '#3D332C',
  cardText: '#2C1810',
} as const;

type BookmarkCategory = 'Article' | 'Tweet' | 'Video' | 'PDF';
type FilterTab = 'All' | 'Articles' | 'Tweets' | 'Videos' | 'PDFs';

interface BookmarkItem {
  id: string;
  title: string;
  domain: string;
  dateImported: string;
  category: BookmarkCategory;
  platform: 'x' | 'browser' | 'pocket' | 'instapaper';
}

interface ImportSource {
  id: string;
  name: string;
  platform: 'x' | 'browser' | 'pocket' | 'instapaper';
  connected: boolean;
  bookmarkCount?: number;
}

const MOCK_BOOKMARKS: BookmarkItem[] = [
  {
    id: '1',
    title: 'Leaked NSA Documents Detail Domestic Surveillance Program',
    domain: 'nytimes.com',
    dateImported: 'Mar 2, 2026',
    category: 'Article',
    platform: 'browser',
  },
  {
    id: '2',
    title: 'Thread on CIA involvement in Operation Mockingbird',
    domain: 'twitter.com/@investigator',
    dateImported: 'Mar 1, 2026',
    category: 'Tweet',
    platform: 'x',
  },
  {
    id: '3',
    title: 'Shadow Government: Inside the Deep State',
    domain: 'youtube.com',
    dateImported: 'Feb 28, 2026',
    category: 'Video',
    platform: 'browser',
  },
  {
    id: '4',
    title: 'FOIA Release: 500 pages on JFK Assassination',
    domain: 'archives.gov',
    dateImported: 'Feb 27, 2026',
    category: 'PDF',
    platform: 'pocket',
  },
  {
    id: '5',
    title: 'How Social Media Platforms Censor Investigative Journalists',
    domain: 'substack.com',
    dateImported: 'Feb 26, 2026',
    category: 'Article',
    platform: 'instapaper',
  },
  {
    id: '6',
    title: 'Whistleblower testimony transcript - Senate Hearing 2024',
    domain: 'congress.gov',
    dateImported: 'Feb 25, 2026',
    category: 'PDF',
    platform: 'browser',
  },
];

const MOCK_INVESTIGATIONS = [
  'Operation Deep Throat',
  'Surveillance State Files',
  'JFK Declassified',
];

const INITIAL_SOURCES: ImportSource[] = [
  { id: 'x', name: 'X / Twitter Bookmarks', platform: 'x', connected: false },
  { id: 'browser', name: 'Browser Bookmarks', platform: 'browser', connected: true, bookmarkCount: 2847 },
  { id: 'pocket', name: 'Pocket', platform: 'pocket', connected: false },
];

const FILTER_TABS: FilterTab[] = ['All', 'Articles', 'Tweets', 'Videos', 'PDFs'];

function categoryMatches(category: BookmarkCategory, filter: FilterTab): boolean {
  if (filter === 'All') return true;
  if (filter === 'Articles' && category === 'Article') return true;
  if (filter === 'Tweets' && category === 'Tweet') return true;
  if (filter === 'Videos' && category === 'Video') return true;
  if (filter === 'PDFs' && category === 'PDF') return true;
  return false;
}

function CategoryBadge({ category }: { category: BookmarkCategory }) {
  const colorMap: Record<BookmarkCategory, string> = {
    Article: '#2563EB',
    Tweet: '#0EA5E9',
    Video: '#DC2626',
    PDF: '#D97706',
  };
  return (
    <View style={{ backgroundColor: colorMap[category] + '22', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: colorMap[category] + '55' }}>
      <Text style={{ color: colorMap[category], fontSize: 13, fontWeight: '700', letterSpacing: 0.7 }}>
        {category.toUpperCase()}
      </Text>
    </View>
  );
}

function PlatformIcon({ platform, size = 14 }: { platform: ImportSource['platform']; size?: number }) {
  if (platform === 'x') {
    return (
      <View style={{ width: size + 4, height: size + 4, borderRadius: 4, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFF', fontSize: size - 2, fontWeight: '900' }}>X</Text>
      </View>
    );
  }
  if (platform === 'browser') return <Globe size={size} color={COLORS.muted} strokeWidth={2} />;
  if (platform === 'pocket') return <Rss size={size} color="#EF4444" strokeWidth={2} />;
  if (platform === 'instapaper') return <FileText size={size} color={COLORS.muted} strokeWidth={2} />;
  return null;
}

function SourceIcon({ platform }: { platform: ImportSource['platform'] }) {
  if (platform === 'x') {
    return (
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>X</Text>
      </View>
    );
  }
  if (platform === 'browser') {
    return (
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E40AF22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2563EB44' }}>
        <Globe size={20} color="#3B82F6" strokeWidth={2} />
      </View>
    );
  }
  if (platform === 'pocket') {
    return (
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EF444422', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EF444444' }}>
        <Rss size={20} color="#EF4444" strokeWidth={2} />
      </View>
    );
  }
  return (
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
      <FileText size={20} color={COLORS.muted} strokeWidth={2} />
    </View>
  );
}

function parseBrowserBookmarks(html: string): Array<{url: string, title: string}> {
  const results: Array<{url: string, title: string}> = [];
  const regex = /<A\s+HREF="([^"]+)"[^>]*>([^<]+)<\/A>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].trim();
    if (url.startsWith('http')) {
      results.push({ url, title });
    }
  }
  return results;
}

function guessCategory(url: string): BookmarkCategory {
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) {
    return 'Video';
  }
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'Tweet';
  }
  if (url.endsWith('.pdf') || url.includes('/pdf/') || url.includes('?pdf=')) {
    return 'PDF';
  }
  return 'Article';
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(MOCK_BOOKMARKS);
  const [sources, setSources] = useState<ImportSource[]>(INITIAL_SOURCES);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [connectModalSource, setConnectModalSource] = useState<ImportSource | null>(null);
  const [addToInvestigationBookmark, setAddToInvestigationBookmark] = useState<BookmarkItem | null>(null);
  const [selectedInvestigation, setSelectedInvestigation] = useState<string>(MOCK_INVESTIGATIONS[0]);
  const [addMode, setAddMode] = useState<'note' | 'link'>('link');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [importFileModalVisible, setImportFileModalVisible] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const filteredBookmarks = bookmarks.filter((b) => {
    const matchesFilter = categoryMatches(b.category, activeFilter);
    const matchesSearch = searchQuery.trim() === '' || b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.domain.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDeleteBookmark = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    setDeleteConfirmId(null);
    showToast('Bookmark removed.');
  }, [showToast]);

  const handleAddToInvestigation = useCallback(() => {
    if (!addToInvestigationBookmark) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`Pinned to ${selectedInvestigation}!`);
    setAddToInvestigationBookmark(null);
  }, [addToInvestigationBookmark, selectedInvestigation, showToast]);

  const renderBookmark = useCallback(({ item }: { item: BookmarkItem }) => (
    <Pressable
      testID={`bookmark-item-${item.id}`}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setDeleteConfirmId(item.id);
      }}
      style={{ marginHorizontal: 16, marginBottom: 12 }}
    >
      {/* Pushpin */}
      <View style={{ position: 'absolute', top: -8, left: 20, zIndex: 10, alignItems: 'center' }}>
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.pin, borderWidth: 1.5, borderColor: '#A0784A' }} />
        <View style={{ width: 2, height: 10, backgroundColor: '#A0784A', marginTop: -1 }} />
      </View>
      <View style={{
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 18,
        paddingTop: 18,
        borderWidth: 1,
        borderColor: '#D4C5A9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 4,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ color: COLORS.cardText, fontSize: 16, fontWeight: '800', lineHeight: 20, marginBottom: 4 }} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <PlatformIcon platform={item.platform} size={20} />
              <Text style={{ color: COLORS.muted, fontSize: 13 }}>{item.domain}</Text>
              <Text style={{ color: '#C5B69A', fontSize: 13 }}>•</Text>
              <Text style={{ color: COLORS.muted, fontSize: 13 }}>{item.dateImported}</Text>
            </View>
          </View>
          <CategoryBadge category={item.category} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
          <Pressable
            testID={`add-to-investigation-${item.id}`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAddToInvestigationBookmark(item);
            }}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: pressed ? '#9B1530' : COLORS.red,
              borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Plus size={20} color="#FFF" strokeWidth={2.5} />
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>Add to Investigation</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  ), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(50).duration(400)} style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <Bookmark size={28} color={COLORS.red} strokeWidth={2} />
          <Text style={{ color: COLORS.red, fontSize: 22, fontWeight: '900', letterSpacing: 3 }}>BOOKMARKS</Text>
        </View>
        <Text style={{ color: COLORS.pin, fontSize: 12, fontWeight: '700', letterSpacing: 4.2, marginLeft: 32 }}>IMPORT</Text>
      </Animated.View>

      {/* Search bar */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: COLORS.surface, borderRadius: 12,
          borderWidth: 1, borderColor: COLORS.border,
          paddingHorizontal: 14, paddingVertical: 10,
        }}>
          <Search size={22} color={COLORS.muted} strokeWidth={2} />
          <TextInput
            testID="bookmark-search-input"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search bookmarks..."
            placeholderTextColor={COLORS.muted}
            style={{ flex: 1, color: COLORS.textLight, fontSize: 14 }}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={16} color={COLORS.muted} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
      </Animated.View>

      {/* Filter tabs */}
      <Animated.View entering={FadeInDown.delay(150).duration(400)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
        >
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab}
              testID={`filter-tab-${tab.toLowerCase()}`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFilter(tab);
              }}
              style={{
                backgroundColor: activeFilter === tab ? COLORS.red : COLORS.surface,
                borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9,
                borderWidth: 1, borderColor: activeFilter === tab ? COLORS.red : COLORS.border,
              }}
            >
              <Text style={{ color: activeFilter === tab ? '#FFF' : COLORS.muted, fontSize: 13, fontWeight: '600' }}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      <FlatList
        testID="bookmarks-list"
        data={filteredBookmarks}
        keyExtractor={(item) => item.id}
        renderItem={renderBookmark}
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            {/* Connect Sources section */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Filter size={22} color={COLORS.pin} strokeWidth={2} />
                <Text style={{ color: COLORS.pin, fontSize: 13, fontWeight: '700', letterSpacing: 1.7 }}>CONNECT SOURCES</Text>
              </View>
              <View style={{ gap: 8 }}>
                {sources.map((source) => (
                  <View key={source.id} style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: COLORS.surface, borderRadius: 12,
                    borderWidth: 1, borderColor: COLORS.border,
                    padding: 16, gap: 12,
                  }}>
                    <SourceIcon platform={source.platform} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.textLight, fontSize: 15, fontWeight: '600' }}>{source.name}</Text>
                      {source.connected && source.bookmarkCount != null ? (
                        <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>{source.bookmarkCount.toLocaleString()} bookmarks</Text>
                      ) : (
                        <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>Not connected</Text>
                      )}
                    </View>
                    {source.platform === 'browser' ? (
                      <Pressable
                        testID={`import-json-${source.id}`}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setImportFileModalVisible(true);
                        }}
                        style={({ pressed }) => ({
                          backgroundColor: pressed ? '#1A3A6B' : '#1E40AF22',
                          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                          borderWidth: 1, borderColor: '#2563EB55',
                        })}
                      >
                        <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '700' }}>Import JSON</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        testID={`connect-source-${source.id}`}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setConnectModalSource(source);
                        }}
                        style={({ pressed }) => ({
                          backgroundColor: pressed ? '#9B1530' : COLORS.red,
                          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                          opacity: pressed ? 0.85 : 1,
                        })}
                      >
                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Connect</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Bookmarks section header */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Bookmark size={22} color={COLORS.pin} strokeWidth={2} />
                <Text style={{ color: COLORS.pin, fontSize: 13, fontWeight: '700', letterSpacing: 1.7 }}>IMPORTED BOOKMARKS</Text>
              </View>
              <Text style={{ color: COLORS.muted, fontSize: 13 }}>{filteredBookmarks.length} items</Text>
            </View>
          </Animated.View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 }}>
            <Bookmark size={40} color={COLORS.muted} strokeWidth={1.5} />
            <Text style={{ color: COLORS.muted, fontSize: 15, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>No bookmarks found</Text>
            <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 6, textAlign: 'center' }}>Try a different filter or search term</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        windowSize={10}
        removeClippedSubviews={true}
      />

      {/* Import from File button (bottom) */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 16, paddingBottom: 30, paddingTop: 12,
        backgroundColor: COLORS.background,
        borderTopWidth: 1, borderTopColor: COLORS.border,
      }}>
        <Pressable
          testID="import-file-button"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setImportFileModalVisible(true);
          }}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
            backgroundColor: pressed ? '#9B1530' : COLORS.red,
            borderRadius: 14, padding: 16,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Plus size={26} color="#FFF" strokeWidth={2.5} />
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>Import from File</Text>
        </Pressable>
      </View>

      {/* Toast */}
      {toastMessage ? (
        <Animated.View
          entering={FadeInDown.duration(300)}
          exiting={FadeOut.duration(300)}
          style={{
            position: 'absolute', bottom: 110, left: 20, right: 20,
            backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
            borderWidth: 1, borderColor: COLORS.border,
            borderLeftWidth: 3, borderLeftColor: COLORS.pin,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
            flexDirection: 'row', alignItems: 'center', gap: 10,
          }}
        >
          <Check size={16} color={COLORS.pin} strokeWidth={2.5} />
          <Text style={{ color: COLORS.textLight, fontSize: 14, fontWeight: '600', flex: 1 }}>{toastMessage}</Text>
        </Animated.View>
      ) : null}

      {/* Connect Source Modal */}
      <Modal
        visible={connectModalSource !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConnectModalSource(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }}
          onPress={() => setConnectModalSource(null)}
        >
          <Pressable
            style={{
              backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 24, borderWidth: 1, borderColor: COLORS.border, borderBottomWidth: 0,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {connectModalSource != null ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <SourceIcon platform={connectModalSource.platform} />
                  <View>
                    <Text style={{ color: COLORS.textLight, fontSize: 18, fontWeight: '800' }}>
                      {connectModalSource.name}
                    </Text>
                    <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>Import Instructions</Text>
                  </View>
                </View>
                <View style={{ gap: 10, marginBottom: 24 }}>
                  {[
                    `Go to ${connectModalSource.name} on web`,
                    'Navigate to your bookmarks or saved items',
                    'Export your bookmarks as JSON or CSV',
                    "Tap 'Import File' below to add them",
                  ].map((step, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={{
                        width: 24, height: 24, borderRadius: 12,
                        backgroundColor: COLORS.red + '33', borderWidth: 1, borderColor: COLORS.red + '55',
                        alignItems: 'center', justifyContent: 'center', marginTop: 1,
                      }}>
                        <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '800' }}>{i + 1}</Text>
                      </View>
                      <Text style={{ color: COLORS.textLight, fontSize: 14, lineHeight: 22, flex: 1 }}>{step}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ gap: 10 }}>
                  <Pressable
                    testID="connect-modal-import-button"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setConnectModalSource(null);
                      setImportFileModalVisible(true);
                    }}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? '#9B1530' : COLORS.red,
                      borderRadius: 12, padding: 15, alignItems: 'center',
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Import File</Text>
                  </Pressable>
                  <Pressable
                    testID="connect-modal-dismiss-button"
                    onPress={() => setConnectModalSource(null)}
                    style={{ padding: 12, alignItems: 'center' }}
                  >
                    <Text style={{ color: COLORS.muted, fontSize: 14, fontWeight: '600' }}>Dismiss</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add to Investigation Modal */}
      <Modal
        visible={addToInvestigationBookmark !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAddToInvestigationBookmark(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }}
          onPress={() => setAddToInvestigationBookmark(null)}
        >
          <Pressable
            style={{
              backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 24, borderWidth: 1, borderColor: COLORS.border, borderBottomWidth: 0,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ color: COLORS.textLight, fontSize: 18, fontWeight: '800', marginBottom: 6 }}>
              Add to Investigation
            </Text>
            {addToInvestigationBookmark != null ? (
              <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 20, lineHeight: 18 }} numberOfLines={2}>
                {addToInvestigationBookmark.title}
              </Text>
            ) : null}

            {/* Add Mode Toggle */}
            <View style={{ flexDirection: 'row', gap: 0, marginBottom: 20, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
              {(['link', 'note'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  testID={`add-mode-${mode}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAddMode(mode);
                  }}
                  style={{
                    flex: 1, padding: 12, alignItems: 'center',
                    backgroundColor: addMode === mode ? COLORS.red : 'transparent',
                  }}
                >
                  <Text style={{ color: addMode === mode ? '#FFF' : COLORS.muted, fontSize: 14, fontWeight: '700' }}>
                    {mode === 'link' ? 'Add as Link' : 'Add as Note'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Investigation picker */}
            <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 }}>
              SELECT INVESTIGATION
            </Text>
            <View style={{ gap: 8, marginBottom: 24 }}>
              {MOCK_INVESTIGATIONS.map((inv) => (
                <Pressable
                  key={inv}
                  testID={`investigation-${inv.toLowerCase().replace(/\s+/g, '-')}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedInvestigation(inv);
                  }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: selectedInvestigation === inv ? COLORS.red + '22' : COLORS.background,
                    borderRadius: 10, padding: 14,
                    borderWidth: 1, borderColor: selectedInvestigation === inv ? COLORS.red + '66' : COLORS.border,
                  }}
                >
                  <Text style={{ color: selectedInvestigation === inv ? COLORS.textLight : COLORS.muted, fontSize: 14, fontWeight: '600' }}>
                    {inv}
                  </Text>
                  {selectedInvestigation === inv ? (
                    <Check size={16} color={COLORS.red} strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              ))}
            </View>

            <Pressable
              testID="confirm-add-to-investigation-button"
              onPress={handleAddToInvestigation}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#9B1530' : COLORS.red,
                borderRadius: 12, padding: 15, alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Confirm</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Import File Instructions Modal */}
      <Modal
        visible={importFileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImportFileModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }}
          onPress={() => setImportFileModalVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 24, borderWidth: 1, borderColor: COLORS.border, borderBottomWidth: 0,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.red + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.red + '55' }}>
                <FileText size={20} color={COLORS.red} strokeWidth={2} />
              </View>
              <View>
                <Text style={{ color: COLORS.textLight, fontSize: 18, fontWeight: '800' }}>Import Bookmarks</Text>
                <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>Supported formats: JSON, CSV, HTML</Text>
              </View>
            </View>
            <View style={{ gap: 10, marginBottom: 24 }}>
              {[
                'Export bookmarks from your browser or app',
                'Supported: Chrome, Firefox, Safari, Pocket',
                'Tap the button below to select your export file',
                'We\'ll parse and import all bookmarks automatically',
              ].map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: COLORS.pin + '33', borderWidth: 1, borderColor: COLORS.pin + '55',
                    alignItems: 'center', justifyContent: 'center', marginTop: 1,
                  }}>
                    <Text style={{ color: COLORS.pin, fontSize: 12, fontWeight: '800' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ color: COLORS.textLight, fontSize: 14, lineHeight: 22, flex: 1 }}>{step}</Text>
                </View>
              ))}
            </View>
            <View style={{ gap: 10 }}>
              <Pressable
                testID="select-file-button"
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  try {
                    const result = await DocumentPicker.getDocumentAsync({
                      type: ['text/html', 'application/octet-stream', '*/*'],
                      copyToCacheDirectory: true,
                    });
                    if (result.canceled) return;
                    const asset = result.assets[0];
                    const html = await fetch(asset.uri).then((r) => r.text());
                    const parsed = parseBrowserBookmarks(html);
                    if (parsed.length === 0) {
                      setImportFileModalVisible(false);
                      showToast('No bookmarks found in file. Make sure it\'s a browser bookmark HTML export.');
                      return;
                    }
                    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const newBookmarks: BookmarkItem[] = parsed.map((b) => ({
                      id: String(Date.now()) + Math.random().toString(36).slice(2),
                      title: b.title,
                      domain: extractDomain(b.url),
                      dateImported: today,
                      category: guessCategory(b.url),
                      platform: 'browser' as const,
                    }));
                    setBookmarks((prev) => [...newBookmarks, ...prev]);
                    setImportFileModalVisible(false);
                    showToast(`Imported ${parsed.length} bookmarks`);
                  } catch (err) {
                    setImportFileModalVisible(false);
                    showToast('Failed to read file. Please try again.');
                  }
                }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#9B1530' : COLORS.red,
                  borderRadius: 12, padding: 15, alignItems: 'center',
                  flexDirection: 'row', justifyContent: 'center', gap: 8,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Plus size={22} color="#FFF" strokeWidth={2.5} />
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Select File</Text>
              </Pressable>
              <Pressable
                testID="import-modal-dismiss-button"
                onPress={() => setImportFileModalVisible(false)}
                style={{ padding: 12, alignItems: 'center' }}
              >
                <Text style={{ color: COLORS.muted, fontSize: 14, fontWeight: '600' }}>Dismiss</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        visible={deleteConfirmId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmId(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}
          onPress={() => setDeleteConfirmId(null)}
        >
          <Pressable
            style={{
              backgroundColor: COLORS.surface, borderRadius: 20,
              padding: 24, borderWidth: 1, borderColor: COLORS.border, width: '100%',
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ color: COLORS.textLight, fontSize: 18, fontWeight: '800', marginBottom: 8 }}>Remove Bookmark?</Text>
            <Text style={{ color: COLORS.muted, fontSize: 14, lineHeight: 20, marginBottom: 24 }}>
              This bookmark will be removed from your list. This action cannot be undone.
            </Text>
            <View style={{ gap: 10 }}>
              <Pressable
                testID="confirm-delete-button"
                onPress={() => deleteConfirmId !== null && handleDeleteBookmark(deleteConfirmId)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#9B1530' : COLORS.red,
                  borderRadius: 12, padding: 14, alignItems: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>Remove</Text>
              </Pressable>
              <Pressable
                testID="cancel-delete-button"
                onPress={() => setDeleteConfirmId(null)}
                style={{ padding: 12, alignItems: 'center' }}
              >
                <Text style={{ color: COLORS.muted, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
