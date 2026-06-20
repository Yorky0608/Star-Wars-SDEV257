import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

function ScreenContent({ screenName }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{screenName}</Text>
      <TextInput editable={false} style={styles.input} value={screenName} />
      <StatusBar style="dark" />
    </View>
  );
}

function PlanetsScreen() {
  return <ScreenContent screenName="Planets" />;
}

function FilmsScreen() {
  return <ScreenContent screenName="Films" />;
}

function SpaceshipsScreen() {
  return <ScreenContent screenName="Spaceships" />;
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f4f7fb',
  },
  heading: {
    marginBottom: 16,
    fontSize: 28,
    fontWeight: '700',
    color: '#102a43',
  },
  input: {
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#bcccdc',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    color: '#243b53',
    fontSize: 18,
  },
});
