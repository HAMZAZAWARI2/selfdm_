import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

export default function GetStartedScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Get Started</Text>
        <Text style={styles.subtitle}>Start with signing up or sign in.</Text>
      </View>

      {/* Center Image */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/icon2.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.buttonPrimary} onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.buttonText}>Sign up</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonSecondary} onPress={() => navigation.navigate('SignIn')}>
          <Text style={[styles.buttonText, { color: '#000' }]}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.08, // ~8% of screen height
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 9,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '80%',
    height: height * 0.3, // ~30% of screen height
  },
  footer: {
    alignItems: 'center',
    marginBottom: height * 0.05, // ~5% of screen height
  },
  buttonPrimary: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    borderRadius: 30,
    marginBottom: 12,
    width: '100%',
  },
  buttonSecondary: {
    backgroundColor: '#eee',
    paddingVertical: 14,
    borderRadius: 20,
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    color: '#fff',
  },
});
