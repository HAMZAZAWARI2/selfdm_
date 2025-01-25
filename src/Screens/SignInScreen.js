// src/screens/SignInScreen.js
import React, { useState } from "react";
import { View, TextInput, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../Context/AuthContext";
import Icon from 'react-native-vector-icons/Ionicons';


export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      await login(email, password);
    } catch (error) {
      console.error(error);
    }
  };


  return (
    <View style={styles.container}>
    <Text style={styles.title}>Sign In</Text>
    <Text style={styles.subtitle}>Remember to sit up & stretch once in a while. Your friends await at chat.</Text>

    <View style={styles.inputContainer}>
  <Icon name="mail-outline" size={20} color="#888" style={styles.icon} />
  <TextInput
    style={styles.input}
    placeholder="Email"
    value={email}
    onChangeText={setEmail}
    autoCapitalize="none"
    keyboardType="email-address"
    placeholderTextColor="#888"
  />
</View>

<View style={styles.inputContainer}>
  <Icon name="lock-closed-outline" size={20} color="#888" style={styles.icon} />
  <TextInput
    style={styles.input}
    placeholder="Password"
    value={password}
    onChangeText={setPassword}
    secureTextEntry
    autoCapitalize="none"
    placeholderTextColor="#888"
  />
</View>

  <TouchableOpacity style={styles.button} onPress={handleLogin}>
    <Text style={styles.buttonText}>Sign in</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
    <Text style={styles.footerText}>
      Don’t have an account? <Text style={styles.link}>Sign up here</Text>
    </Text>
  </TouchableOpacity>
</View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 30,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 25,
    paddingVertical: 4,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 6,
  },
  forgotPassword: {
    color: "#007bff",
    textAlign: "right",
    marginBottom: 25,
    fontSize: 14,
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  footerText: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
  },
  link: {
    color: "#007bff",
    textDecorationLine: "underline",
  },
});
