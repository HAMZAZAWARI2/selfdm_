import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/FontAwesome";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import HomeScreen from "./HomeScreen"; // your current working screen
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

export default function HomeWithTabs({ navigation }) {
  const [triggerAdd, setTriggerAdd] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === "Profile") iconName = "user";
            else if (route.name === "Chats") iconName = "comments";
            else if (route.name === "AddContact") iconName = "plus-circle";
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: "#34C759",
          tabBarInactiveTintColor: "gray",
        })}
      >
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
        <Tab.Screen name="Chats">
          {() => (
            <HomeScreen
              navigation={navigation}
              externalTrigger={triggerAdd}
              clearTrigger={() => setTriggerAdd(false)}
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="AddContact"
          component={Dummy}
          listeners={{
            tabPress: (e) => {
              e.preventDefault(); // prevent tab switch
              setTriggerAdd(true); // signal HomeScreen to open modal
            },
          }}
        />
      </Tab.Navigator>
    </>
  );
}

// Placeholders for now
const Dummy = () => <View />;
const DummyProfile = () => (
  <View style={styles.center}><Text>Profile</Text></View>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  }
});
