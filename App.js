import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

function ScreenContent({ endpoint, getItemLabel, screenName }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const loadItems = async () => {
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
  }, [endpoint]);

  const handleSearchSubmit = () => {
    const trimmedSearchTerm = searchTerm.trim();

    if (!trimmedSearchTerm) {
      return;
    }

    setSubmittedSearchTerm(trimmedSearchTerm);
    setIsModalVisible(true);
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
          <Text style={styles.errorText}>Error: {error}</Text>
          <Pressable onPress={loadItems} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
    );
  };

  return (
    <View style={styles.container}>
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
          <Text style={styles.searchButtonText}>Submit</Text>
        </Pressable>
      </View>
      {content()}
      <Modal
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
        transparent
        visible={isModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Submitted Search</Text>
            <Text style={styles.modalValue}>{submittedSearchTerm}</Text>
            <Pressable onPress={() => setIsModalVisible(false)} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <StatusBar style="dark" />
    </View>
  );
}

function PlanetsScreen() {
  return (
    <ScreenContent
      endpoint="https://www.swapi.tech/api/planets"
      getItemLabel={(item) => item.name}
      screenName="Planets"
    />
  );
}

function FilmsScreen() {
  return (
    <ScreenContent
      endpoint="https://www.swapi.tech/api/films"
      getItemLabel={(item) => item.title || item.properties?.title}
      screenName="Films"
    />
  );
}

function SpaceshipsScreen() {
  return (
    <ScreenContent
      endpoint="https://www.swapi.tech/api/starships"
      getItemLabel={(item) => item.name}
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 67, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    gap: 14,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#102a43',
  },
  modalValue: {
    fontSize: 18,
    color: '#243b53',
    textAlign: 'center',
  },
  modalButton: {
    minWidth: 96,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0b5fff',
  },
  modalButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
});
