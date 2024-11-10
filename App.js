// App.js
import 'react-native-get-random-values';
import React from "react";
import { AuthProvider } from "./src/Context/AuthContext";
import AppNavigator from "./src/Navigation/AppNavigator";


export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}