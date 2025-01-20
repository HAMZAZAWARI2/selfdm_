// src/navigation/AppNavigator.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import SignInScreen from "../Screens/SignInScreen";
import SignUpScreen from "../Screens/SignUpScreen";
import ChatScreen from "../Screens/ChatScreen";
import ProfileScreen from "../Screens/ProfileScreen";
import { useAuth } from "../Context/AuthContext";
import GetStartedScreen from '../Screens/GetStartedScreen';
import HomeScreen from "../Screens/HomeWithTabs";

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? "Home" : "GetStarted"}
      >
        {user ? (
          // Authenticated routes
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                title: "Profile",
                headerStyle: {
                  backgroundColor: "#12D1CA",
                },
                headerTintColor: "#333",
                headerTitleStyle: {
                  fontWeight: "bold",
                },
                headerTitleAlign: "center",
              }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // Unauthenticated routes
          <>
            <Stack.Screen
              name="GetStarted"
              component={GetStartedScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SignIn"
              component={SignInScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}