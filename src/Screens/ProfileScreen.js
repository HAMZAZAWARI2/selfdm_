import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../Context/AuthContext";
import { db } from "../Config/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const [fullName, setFullName] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFullName(data.fullName || "");
          setProfilePic(data.profilePic || null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        Alert.alert("Error", "Failed to fetch profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      return Alert.alert("Permission required", "Enable media permissions to upload a picture.");
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.5,
      aspect: [1, 1],
      base64: true,
    });
    if (!result.canceled) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfilePic(base64);
    }
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      await updateDoc(doc(db, "users", user.uid), {
        fullName,
        profilePic,
      });
      Alert.alert("Success", "Profile updated.");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Could not update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.avatarBox} onPress={handleImagePicker}>
        {profilePic ? (
          <Image source={{ uri: profilePic }} style={styles.avatar} />
        ) : (
          <Text style={styles.uploadText}>Upload Profile Picture</Text>
        )}
      </TouchableOpacity>

      <TextInput
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
        placeholderTextColor="#888"
      />

      <TouchableOpacity onPress={updateProfile} style={styles.updateButton}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.updateButtonText}>Update Profile</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={logout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.bottomImageBox}>
      <Image
        source={require("../../assets/icons3.png")} // adjust the path if it's not under assets
        style={styles.bottomImage}
        resizeMode="cover"
      />
    </View>
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f9f9f9",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBox: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    elevation: 3,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 65,
  },
  uploadText: {
    color: "#34C759",
    fontWeight: "bold",
    textAlign: "center",
  },
  input: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderColor: "#ccc",
    borderWidth: 1,
    fontSize: 16,
  },
  updateButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#34C759",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  bottomImageBox: {
    width: "120%",
    height: 100,
    marginTop: 150,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  bottomImage: {
    width: "100%",
    height: "100%",
  },
});

export default ProfileScreen;
// Minor update by ARehman546 
