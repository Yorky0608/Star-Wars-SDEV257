import { StatusBar } from 'expo-status-bar';
import { useNetworkState } from 'expo-network';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const headerImages = {
  planets: require('./images/planets.jpg'),
  films: require('./images/films.jpg'),
  spaceships: require('./images/ships.jpg'),
};

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

function ScreenContent({ endpoint, getItemLabel, headerImageSource, screenName }) {
  const networkState = useNetworkState();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const listAnimation = useState(() => new Animated.Value(0))[0];
  const isOffline =
    networkState.isConnected === false || networkState.isInternetReachable === false;
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (!normalizedSearchTerm) {
      return true;
    }

    return item.label.toLowerCase().includes(normalizedSearchTerm);
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
        .map((item) => ({
          id: item.uid || item._id || item.properties?.url || item.url || String(Math.random()),
          label: getItemLabel(item),
        }))
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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardText}>{item.label}</Text>
    </View>
  );

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

function FilmsScreen() {
  return (
    <ScreenContent
      endpoint="https://www.swapi.tech/api/films"
      getItemLabel={(item) => item.title || item.properties?.title}
      headerImageSource={headerImages.films}
      screenName="Films"
    />
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
});
