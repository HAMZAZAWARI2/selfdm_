// src/screens/SignUpScreen.js
import React, { useState } from "react";
import { View, TextInput, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../Context/AuthContext";
import Icon from 'react-native-vector-icons/Ionicons';


export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signUp } = useAuth();
  const [confirmPassword, setConfirmPassword] = useState("");


  const handleSignUp = async () => {
  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  try {
    await signUp(email, password);
  } catch (error) {
    console.error(error);
  }
};


  return (
    <View style={styles.container}>
    <Text style={styles.title}>Register</Text>
    <Text style={styles.subtitle}>You and your friends always connected</Text>
  
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
  
    <View style={styles.inputContainer}>
      <Icon name="lock-closed-outline" size={20} color="#888" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholderTextColor="#888"
      />
    </View>
  
    <View style={styles.termsContainer}>
      <Text style={styles.termsText}>
        I agree with the <Text style={styles.link}>Terms and Condition</Text> and the <Text style={styles.link}>Privacy Policy</Text>
      </Text>
    </View>
  
    <TouchableOpacity style={styles.button} onPress={handleSignUp}>
      <Text style={styles.buttonText}>Sign up</Text>
    </TouchableOpacity>
  
    <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
      <Text style={styles.footerText}>
        Already have an account? <Text style={styles.link}>Login</Text>
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
    marginTop: -50,  // Move it up
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
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
    paddingVertical: 8,
  },
  termsContainer: {
    marginBottom: 20,
  },
  termsText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
  link: {
    color: "#007bff",
    textDecorationLine: "underline",
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
});
// Update %c to src/Screens/SignUpScreen.js by contributor
