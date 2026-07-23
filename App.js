import { StatusBar } from 'expo-status-bar';
import { useNetworkState } from 'expo-network';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const FilmStack = createNativeStackNavigator();
const headerImages = {
  planets: require('./images/planets.jpg'),
  films: require('./images/films.jpg'),
  spaceships: require('./images/ships.jpg'),
};

function normalizeSearchValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function SwipeLeftItem({ onSwipeLeft, children }) {
  const translation = useRef(new Animated.Value(0)).current;

  const resetPosition = () => {
    Animated.spring(translation, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 8,
      speed: 18,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          return Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
        },
        onPanResponderMove: (_, gesture) => {
          if (gesture.dx < 0) {
            translation.setValue(Math.max(gesture.dx / 2.2, -72));
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -70 && Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
            Animated.timing(translation, {
              toValue: -72,
              duration: 110,
              useNativeDriver: true,
            }).start(() => {
              onSwipeLeft();
              resetPosition();
            });
            return;
          }

          resetPosition();
        },
        onPanResponderTerminate: resetPosition,
      }),
    [onSwipeLeft, translation]
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        transform: [{ translateX: translation }],
      }}
    >
      {children}
    </Animated.View>
  );
}

function LazyHeaderImage({ source }) {
  const [shouldLoadImage, setShouldLoadImage] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  useEffect(() => {
    setShouldLoadImage(true);
  }, []);

  return (
    <View style={styles.headerImageFrame}>
      {!shouldLoadImage || isImageLoading ? (
        <View style={styles.headerImagePlaceholder}>
          <ActivityIndicator color="#f3c742" />
          <Text style={styles.headerImagePlaceholderText}>Loading galactic display...</Text>
        </View>
      ) : null}
      {shouldLoadImage ? (
        <Image
          onLoadEnd={() => setIsImageLoading(false)}
          onLoadStart={() => setIsImageLoading(true)}
          resizeMode="cover"
          source={source}
          style={styles.headerImage}
        />
      ) : null}
    </View>
  );
}

function ScreenContent({
  endpoint,
  getItemLabel,
  getSearchTerms,
  headerImageSource,
  screenName,
  onItemSwipeLeft,
}) {
  const networkState = useNetworkState();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const listAnimation = useState(() => new Animated.Value(0))[0];
  const isOffline =
    networkState.isConnected === false || networkState.isInternetReachable === false;
  const normalizedSearchTerm = normalizeSearchValue(searchTerm);
  const searchTokens = normalizedSearchTerm ? normalizedSearchTerm.split(' ') : [];
  const filteredItems = items.filter((item) => {
    if (searchTokens.length === 0) {
      return true;
    }

    const searchableWords = item.searchText.split(' ');

    return searchTokens.every((token) => {
      if (token.length <= 2) {
        return searchableWords.includes(token);
      }

      return item.searchText.includes(token);
    });
  });

  const loadItems = async () => {
    if (isOffline) {
      setItems([]);
      setError('No internet connection. Reconnect to the network and try again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      const results = data.results || data.result || [];
      const normalizedItems = results
        .map((item, index) => {
          const label = getItemLabel(item);
          const extraSearchTerms = getSearchTerms ? getSearchTerms(item) : [];
          const searchableValues = [label, ...(Array.isArray(extraSearchTerms) ? extraSearchTerms : [])]
            .filter(Boolean)
            .map((value) => String(value));

          return {
            id: item.uid || item._id || item.properties?.url || item.url || `${endpoint}-${index}`,
            label,
            detailUrl: item.url || item.properties?.url || '',
            rawItem: item,
            searchText: normalizeSearchValue(searchableValues.join(' ')),
          };
        })
        .filter((item) => Boolean(item.label));

      setItems(normalizedItems);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [endpoint, isOffline]);

  useEffect(() => {
    if (loading || error || items.length === 0) {
      return;
    }

    listAnimation.setValue(0);

    Animated.timing(listAnimation, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [error, items.length, listAnimation, loading]);

  const handleSearchSubmit = () => {
    setSearchTerm((currentSearchTerm) => currentSearchTerm.trim());
  };

  const renderItem = ({ item }) => {
    const card = (
      <View style={styles.card}>
        <Text style={styles.cardText}>{item.label}</Text>
        {onItemSwipeLeft ? <Text style={styles.swipeHint}>Swipe left for details</Text> : null}
      </View>
    );

    if (!onItemSwipeLeft) {
      return card;
    }

    return <SwipeLeftItem onSwipeLeft={() => onItemSwipeLeft(item)}>{card}</SwipeLeftItem>;
  };

  const content = () => {
    if (loading) {
      return (
        <View style={styles.centeredState}>
          <ActivityIndicator color="#0b5fff" size="large" />
          <Text style={styles.stateText}>Loading {screenName}...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centeredState}>
          <Text style={styles.errorTitle}>{isOffline ? 'You are offline' : 'Unable to load data'}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={loadItems} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{isOffline ? 'Retry Connection' : 'Try Again'}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <Animated.View
        style={[
          styles.animatedList,
          {
            opacity: listAnimation,
            transform: [
              {
                translateY: listAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          },
        ]}
      >
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredItems}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>No matches found</Text>
              <Text style={styles.emptyStateText}>
                Try a different search for {screenName.toLowerCase()}.
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <LazyHeaderImage source={headerImageSource} />
      <Text style={styles.heading}>{screenName}</Text>
      <View style={styles.searchRow}>
        <TextInput
          onChangeText={setSearchTerm}
          onSubmitEditing={handleSearchSubmit}
          placeholder={`Search ${screenName}`}
          placeholderTextColor="#7b8794"
          returnKeyType="search"
          style={styles.searchInput}
          value={searchTerm}
        />
        <Pressable onPress={handleSearchSubmit} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>
      {content()}
      <StatusBar style="dark" />
    </View>
  );
}

function PlanetsScreen() {
  return (
    <ScreenContent
      endpoint="https://www.swapi.tech/api/planets"
      getItemLabel={(item) => item.name}
      headerImageSource={headerImages.planets}
      screenName="Planets"
    />
  );
}

function FilmsListScreen({ navigation }) {
  return (
    <ScreenContent
      endpoint="https://www.swapi.tech/api/films"
      getItemLabel={(item) => item.title || item.properties?.title}
      getSearchTerms={(item) => {
        const episodeId = item.episode_id || item.properties?.episode_id;
        const director = item.director || item.properties?.director;

        return [
          episodeId ? `episode ${episodeId}` : '',
          episodeId ? `ep ${episodeId}` : '',
          director,
        ];
      }}
      onItemSwipeLeft={(item) => navigation.navigate('Film Details', { filmItem: item })}
      headerImageSource={headerImages.films}
      screenName="Films"
    />
  );
}

function DetailField({ label, value }) {
  return (
    <View style={styles.detailFieldCard}>
      <Text style={styles.detailFieldLabel}>{label}</Text>
      <Text style={styles.detailFieldValue}>{value}</Text>
    </View>
  );
}

function FilmDetailsScreen({ route }) {
  const filmItem = route.params?.filmItem;
  const [filmDetail, setFilmDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFilmDetail = async () => {
    setLoading(true);
    setError('');

    try {
      const detailUrl = filmItem?.detailUrl || '';
      const fallbackUrl = filmItem?.rawItem?.uid
        ? `https://www.swapi.tech/api/films/${filmItem.rawItem.uid}`
        : '';
      const requestUrl = detailUrl || fallbackUrl;

      if (!requestUrl) {
        throw new Error('No film identifier found for this item.');
      }

      const response = await fetch(requestUrl);

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      const filmResult = data.result || data;
      setFilmDetail(filmResult);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load film details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilmDetail();
  }, []);

  const properties = filmDetail?.properties || {};
  const title = properties.title || filmItem?.label || 'Film Details';
  const openingCrawl = properties.opening_crawl || '';
  const detailEntries = Object.entries(properties).filter(
    ([key]) => !['title', 'opening_crawl'].includes(key)
  );

  const formatValue = (value) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return 'None listed';
      }

      return `${value.length} item(s)\n${value.join('\n')}`;
    }

    if (value === null || value === undefined || value === '') {
      return 'Not available';
    }

    return String(value);
  };

  if (loading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator color="#0b5fff" size="large" />
        <Text style={styles.stateText}>Loading film details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.errorTitle}>Unable to load film details</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={loadFilmDetail} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.detailContent} style={styles.detailContainer}>
      <View style={styles.detailHeroCard}>
        <Text style={styles.detailTitle}>{title}</Text>
        <Text style={styles.detailSubtitle}>Episode {properties.episode_id || 'Unknown'}</Text>
      </View>

      {openingCrawl ? (
        <View style={styles.openingCrawlCard}>
          <Text style={styles.sectionHeading}>Opening Crawl</Text>
          <Text style={styles.openingCrawlText}>{openingCrawl}</Text>
        </View>
      ) : null}

      <View style={styles.detailSection}>
        <Text style={styles.sectionHeading}>Film Data</Text>
        {detailEntries.map(([key, value]) => (
          <DetailField key={key} label={toTitleCase(key)} value={formatValue(value)} />
        ))}
      </View>
    </ScrollView>
  );
}

function FilmsScreen() {
  return (
    <FilmStack.Navigator>
      <FilmStack.Screen component={FilmsListScreen} name="Films List" options={{ title: 'Films' }} />
      <FilmStack.Screen component={FilmDetailsScreen} name="Film Details" options={{ title: 'Film Details' }} />
    </FilmStack.Navigator>
  );
}

function SpaceshipsScreen() {
  return (
    <ScreenContent
      endpoint="https://www.swapi.tech/api/starships"
      getItemLabel={(item) => item.name}
      headerImageSource={headerImages.spaceships}
      screenName="Spaceships"
    />
  );
}

function IosTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Tab.Screen component={PlanetsScreen} name="Planets" />
      <Tab.Screen component={FilmsScreen} name="Films" />
      <Tab.Screen component={SpaceshipsScreen} name="Spaceships" />
    </Tab.Navigator>
  );
}

function AndroidDrawer() {
  return (
    <Drawer.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Drawer.Screen component={PlanetsScreen} name="Planets" />
      <Drawer.Screen component={FilmsScreen} name="Films" />
      <Drawer.Screen component={SpaceshipsScreen} name="Spaceships" />
    </Drawer.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      {Platform.OS === 'android' ? <AndroidDrawer /> : <IosTabs />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    backgroundColor: '#f4f7fb',
  },
  headerImageFrame: {
    height: 152,
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  headerImagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0f172a',
    zIndex: 1,
  },
  headerImagePlaceholderText: {
    color: '#d9e2ec',
    fontSize: 14,
    fontWeight: '600',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  heading: {
    marginBottom: 12,
    fontSize: 26,
    fontWeight: '700',
    color: '#102a43',
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#bcccdc',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    color: '#102a43',
    fontSize: 16,
  },
  searchButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#0b5fff',
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  animatedList: {
    flex: 1,
  },
  card: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bcccdc',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  cardText: {
    color: '#243b53',
    fontSize: 18,
  },
  swipeHint: {
    marginTop: 6,
    color: '#486581',
    fontSize: 12,
  },
  emptyStateCard: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#d9e2ec',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    gap: 8,
  },
  emptyStateTitle: {
    color: '#102a43',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyStateText: {
    color: '#486581',
    fontSize: 15,
    textAlign: 'center',
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stateText: {
    color: '#486581',
    fontSize: 16,
  },
  errorText: {
    color: '#9b1c1c',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    color: '#7f1d1d',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#0b5fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  detailContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
  },
  detailHeroCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#0b5fff',
  },
  detailTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  detailSubtitle: {
    color: '#dbe8ff',
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  openingCrawlCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d9e2ec',
    backgroundColor: '#ffffff',
  },
  openingCrawlText: {
    marginTop: 8,
    color: '#334e68',
    lineHeight: 22,
    fontSize: 15,
  },
  detailSection: {
    gap: 10,
  },
  sectionHeading: {
    color: '#102a43',
    fontSize: 18,
    fontWeight: '700',
  },
  detailFieldCard: {
    borderWidth: 1,
    borderColor: '#d9e2ec',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  detailFieldLabel: {
    color: '#486581',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailFieldValue: {
    color: '#102a43',
    fontSize: 15,
    lineHeight: 21,
  },
});
