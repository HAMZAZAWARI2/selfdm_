import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Button,
  Alert,
} from "react-native";
import { useAuth } from "../Context/AuthContext";
import Modal from "react-native-modal";
import Icon from "react-native-vector-icons/FontAwesome";
import { db } from "../Config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { useFocusEffect, useRoute } from "@react-navigation/native";

export default function HomeScreen({ navigation, externalTrigger, clearTrigger }) {
  const { user, logout, updateContacts, userContacts, fetchUserContacts, liveListenContacts } = useAuth();
  const [isModalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState("");

  const route = useRoute();

  useEffect(() => {
    fetchUserContacts(); // Initially fetch contacts
    const unsubscribe = liveListenContacts(); // Start real-time listening
    return () => unsubscribe(); // Stop listening when screen unmounts
  }, []);

  useEffect(() => {
    if (route?.params?.externalTrigger || externalTrigger) {
      toggleModal();
      clearTrigger?.();
    }
  }, [route?.params?.externalTrigger, externalTrigger]);

  useFocusEffect(
    useCallback(() => {
      if (user && userContacts.length > 0) {
        userContacts.forEach((contact) => {
          deleteUserMessages(contact);
        });
      }
    }, [user, userContacts])
  );

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  const handleAddContact = async () => {
    if (email.trim() === "") {
      alert("Please enter a valid email.");
      return;
    }
    try {
      await updateContacts(email);
      setEmail("");
      toggleModal();
    } catch (error) {
      alert("Error adding contact:", error.message);
    }
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp || isNaN(new Date(timestamp))) return "Offline";
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const deleteUserMessages = async (contact) => {
    try {
      const chatId = [user.uid, contact.uid].sort().join("_");
      const messagesRef = collection(db, `chats/${chatId}/messages`);
      const q = query(messagesRef, where("senderId", "==", user.uid), where("seen", "==", true));
      const messagesSnapshot = await getDocs(q);

      if (!messagesSnapshot.empty) {
        const batch = writeBatch(db);
        messagesSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
    } catch (error) {
      console.error("Error deleting messages:", error);
      Alert.alert("Error", "An error occurred while deleting messages.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Chats</Text>
        <View style={styles.searchBox}>
          <Icon name="search" size={16} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search people and more..."
            value={email}
            onChangeText={setEmail}
            style={styles.searchInput}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contactsList}>
        {userContacts.length > 0 ? (
          userContacts.map((contact) => {
            const initials = contact.email
              .split(" ")
              .map((name) => name[0])
              .join("")
              .toUpperCase();

            const statusText =
              contact.status === "online"
                ? "Online"
                : `Last seen: ${formatLastSeen(contact.lastSeen)}`;
            const statusColor = contact.status === "online" ? "green" : "gray";

            return (
              <TouchableOpacity
                key={contact.uid}
                style={styles.contactItem}
                onPress={() => navigation.navigate("Chat", { contact })}
              >
                <View style={styles.avatar}>
                  {contact.profilePic ? (
                    <Image source={{ uri: contact.profilePic }} style={styles.profilePic} />
                  ) : (
                    <Text style={styles.avatarText}>{initials}</Text>
                  )}
                </View>

                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.fullName || contact.email}</Text>
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                    <Text style={styles.statusText}>{statusText}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text>No contacts yet.</Text>
        )}
      </ScrollView>

      <TouchableOpacity onPress={toggleModal} style={styles.floatingAddButton}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      <Modal
        isVisible={isModalVisible}
        onBackdropPress={toggleModal}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <TextInput
            placeholder="Enter Email"
            value={email}
            onChangeText={setEmail}
            style={styles.modalInput}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button title="Add Contact" onPress={handleAddContact} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topBar: {
    backgroundColor: "#34C759",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  topTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    backgroundColor: "#e3f7e9",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  contactsList: {
    padding: 16,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#a4e4c3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    overflow: "hidden",
  },
  profilePic: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "500",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: "#666",
  },
  floatingAddButton: {
    position: "absolute",
    right: 16,
    bottom: 72,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#34C759",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  addButtonText: {
    color: "white",
    fontSize: 30,
    fontWeight: "bold",
  },
  modalContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    width: "80%",
  },
  modalInput: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
});
// Update by HAMZAZAWARI2 on 2025-1-1 15:35:00 
// Update by HAMZAZAWARI2 on 2025-1-1 11:21:00 
// Update by HAMZAZAWARI2 on 2025-1-1 18:26:00 
// Update by HAMZAZAWARI2 on 2025-1-2 19:56:00 
// Update by HAMZAZAWARI2 on 2025-1-2 14:2:00 
// Update by HAMZAZAWARI2 on 2025-1-2 15:13:00 
// Update by HAMZAZAWARI2 on 2025-1-3 10:52:00 
// Update by HAMZAZAWARI2 on 2025-1-3 12:58:00 
// Update by HAMZAZAWARI2 on 2025-1-3 9:50:00 
// Update by HAMZAZAWARI2 on 2025-1-4 11:25:00 
// Update by HAMZAZAWARI2 on 2025-1-4 15:12:00 
// Update by HAMZAZAWARI2 on 2025-1-4 11:45:00 
// Update by HAMZAZAWARI2 on 2025-1-5 14:37:00 
// Update by HAMZAZAWARI2 on 2025-1-5 13:22:00 
// Update by HAMZAZAWARI2 on 2025-1-5 17:8:00 
// Update by HAMZAZAWARI2 on 2025-1-6 21:15:00 
// Update by HAMZAZAWARI2 on 2025-1-6 13:58:00 
// Update by HAMZAZAWARI2 on 2025-1-6 21:43:00 
// Update by HAMZAZAWARI2 on 2025-1-7 15:3:00 
// Update by HAMZAZAWARI2 on 2025-1-7 15:47:00 
// Update by HAMZAZAWARI2 on 2025-1-7 19:29:00 
// Update by HAMZAZAWARI2 on 2025-1-8 21:13:00 
// Update by HAMZAZAWARI2 on 2025-1-8 11:31:00 
// Update by HAMZAZAWARI2 on 2025-1-8 12:39:00 
// Update by HAMZAZAWARI2 on 2025-1-9 11:53:00 
// Update by HAMZAZAWARI2 on 2025-1-9 18:15:00 
// Update by HAMZAZAWARI2 on 2025-1-9 11:30:00 
// Update by HAMZAZAWARI2 on 2025-1-10 11:23:00 
// Update by HAMZAZAWARI2 on 2025-1-10 19:54:00 
// Update by HAMZAZAWARI2 on 2025-1-10 16:27:00 
// Update by HAMZAZAWARI2 on 2025-1-11 15:21:00 
// Update by HAMZAZAWARI2 on 2025-1-11 19:49:00 
// Update by HAMZAZAWARI2 on 2025-1-11 10:34:00 
// Update by HAMZAZAWARI2 on 2025-1-12 9:9:00 
// Update by HAMZAZAWARI2 on 2025-1-12 19:28:00 
// Update by HAMZAZAWARI2 on 2025-1-12 22:6:00 
// Update by HAMZAZAWARI2 on 2025-1-13 12:32:00 
// Update by HAMZAZAWARI2 on 2025-1-13 14:51:00 
// Update by HAMZAZAWARI2 on 2025-1-13 19:46:00 
// Update by HAMZAZAWARI2 on 2025-1-14 14:52:00 
// Update by HAMZAZAWARI2 on 2025-1-14 20:20:00 
// Update by HAMZAZAWARI2 on 2025-1-14 20:21:00 
// Update by HAMZAZAWARI2 on 2025-1-15 15:12:00 
// Update by HAMZAZAWARI2 on 2025-1-15 18:21:00 
// Update by HAMZAZAWARI2 on 2025-1-15 21:10:00 
// Update by HAMZAZAWARI2 on 2025-1-16 19:19:00 
// Update by HAMZAZAWARI2 on 2025-1-16 14:46:00 
// Update by HAMZAZAWARI2 on 2025-1-16 14:47:00 
// Update by HAMZAZAWARI2 on 2025-1-17 10:57:00 
// Update by HAMZAZAWARI2 on 2025-1-17 9:44:00 
// Update by HAMZAZAWARI2 on 2025-1-17 17:24:00 
// Update by HAMZAZAWARI2 on 2025-1-18 13:49:00 
// Update by HAMZAZAWARI2 on 2025-1-18 13:38:00 
// Update by HAMZAZAWARI2 on 2025-1-18 20:49:00 
// Update by HAMZAZAWARI2 on 2025-1-19 16:43:00 
// Update by HAMZAZAWARI2 on 2025-1-19 22:1:00 
// Update by HAMZAZAWARI2 on 2025-1-19 11:52:00 
// Update by HAMZAZAWARI2 on 2025-1-20 15:14:00 
// Update by HAMZAZAWARI2 on 2025-1-20 9:2:00 
// Update by HAMZAZAWARI2 on 2025-1-20 18:11:00 
// Update by HAMZAZAWARI2 on 2025-1-21 13:2:00 
// Update by HAMZAZAWARI2 on 2025-1-21 22:27:00 
// Update by HAMZAZAWARI2 on 2025-1-21 22:41:00 
// Update by HAMZAZAWARI2 on 2025-1-22 15:42:00 
// Update by HAMZAZAWARI2 on 2025-1-22 22:28:00 
// Update by HAMZAZAWARI2 on 2025-1-22 22:30:00 
// Update by HAMZAZAWARI2 on 2025-1-23 22:9:00 
// Update by HAMZAZAWARI2 on 2025-1-23 21:28:00 
// Update by HAMZAZAWARI2 on 2025-1-23 11:30:00 
// Update by HAMZAZAWARI2 on 2025-1-24 12:11:00 
// Update by HAMZAZAWARI2 on 2025-1-24 22:25:00 
// Update by HAMZAZAWARI2 on 2025-1-24 13:7:00 
// Update by HAMZAZAWARI2 on 2025-1-25 20:46:00 
// Update by HAMZAZAWARI2 on 2025-1-25 22:21:00 
// Update by HAMZAZAWARI2 on 2025-1-25 13:46:00 
// Update by HAMZAZAWARI2 on 2025-1-26 19:26:00 
// Update by HAMZAZAWARI2 on 2025-1-26 16:51:00 
// Update by HAMZAZAWARI2 on 2025-1-26 12:36:00 
// Update by HAMZAZAWARI2 on 2025-1-27 19:57:00 
// Update by HAMZAZAWARI2 on 2025-1-27 19:2:00 
// Update by HAMZAZAWARI2 on 2025-1-27 13:35:00 
// Update by HAMZAZAWARI2 on 2025-1-28 13:15:00 
// Update by HAMZAZAWARI2 on 2025-1-28 17:8:00 
// Update by HAMZAZAWARI2 on 2025-1-28 17:26:00 
// Update by HAMZAZAWARI2 on 2025-2-1 18:58:00 
// Update by HAMZAZAWARI2 on 2025-2-1 18:44:00 
// Update by HAMZAZAWARI2 on 2025-2-1 16:26:00 
// Update by HAMZAZAWARI2 on 2025-2-2 22:52:00 
// Update by HAMZAZAWARI2 on 2025-2-2 17:7:00 
// Feature branch change by HAMZAZAWARI2 
// Update by HAMZAZAWARI2 on 2025-2-2 19:50:00 
// Update by HAMZAZAWARI2 on 2025-2-3 9:56:00 
// Update by HAMZAZAWARI2 on 2025-2-3 14:20:00 
// Update by HAMZAZAWARI2 on 2025-2-3 9:52:00 
// Update by HAMZAZAWARI2 on 2025-2-4 17:33:00 
// Update by HAMZAZAWARI2 on 2025-2-4 15:26:00 
// Update by HAMZAZAWARI2 on 2025-2-4 15:16:00 
// Update by HAMZAZAWARI2 on 2025-2-5 9:46:00 
// Update by HAMZAZAWARI2 on 2025-2-5 14:23:00 
// Feature branch change by HAMZAZAWARI2 
// Update by HAMZAZAWARI2 on 2025-2-5 18:10:00 
// Update by HAMZAZAWARI2 on 2025-2-6 18:34:00 
// Update by HAMZAZAWARI2 on 2025-2-6 10:20:00 
// Update by HAMZAZAWARI2 on 2025-2-6 12:55:00 
// Update by HAMZAZAWARI2 on 2025-2-7 12:57:00 
// Update by HAMZAZAWARI2 on 2025-2-7 16:9:00 
// Update by HAMZAZAWARI2 on 2025-2-7 18:23:00 
// Update by HAMZAZAWARI2 on 2025-2-8 15:9:00 
// Update by HAMZAZAWARI2 on 2025-2-8 10:35:00 
// Update by HAMZAZAWARI2 on 2025-2-8 13:52:00 
// Update by HAMZAZAWARI2 on 2025-2-9 20:40:00 
// Update by HAMZAZAWARI2 on 2025-2-9 22:10:00 
// Update by HAMZAZAWARI2 on 2025-2-9 16:50:00 
// Update by HAMZAZAWARI2 on 2025-2-10 14:56:00 
// Update by HAMZAZAWARI2 on 2025-2-10 22:3:00 
// Update by HAMZAZAWARI2 on 2025-2-10 10:9:00 
// Update by HAMZAZAWARI2 on 2025-2-11 21:5:00 
// Update by HAMZAZAWARI2 on 2025-2-11 14:48:00 
// Update by HAMZAZAWARI2 on 2025-2-11 13:7:00 
// Update by HAMZAZAWARI2 on 2025-2-12 16:28:00 
// Update by HAMZAZAWARI2 on 2025-2-12 14:34:00 
// Update by HAMZAZAWARI2 on 2025-2-12 12:47:00 
// Update by HAMZAZAWARI2 on 2025-2-13 21:4:00 
// Update by HAMZAZAWARI2 on 2025-2-13 19:37:00 
// Update by HAMZAZAWARI2 on 2025-2-13 12:42:00 
// Update by HAMZAZAWARI2 on 2025-2-14 21:10:00 
// Update by HAMZAZAWARI2 on 2025-2-14 21:58:00 
// Update by HAMZAZAWARI2 on 2025-2-14 9:55:00 
// Update by HAMZAZAWARI2 on 2025-2-15 16:12:00 
// Update by HAMZAZAWARI2 on 2025-2-15 15:1:00 
// Update by HAMZAZAWARI2 on 2025-2-15 12:41:00 
// Update by HAMZAZAWARI2 on 2025-2-16 10:50:00 
// Update by HAMZAZAWARI2 on 2025-2-16 10:29:00 
// Update by HAMZAZAWARI2 on 2025-2-16 16:4:00 
// Update by HAMZAZAWARI2 on 2025-2-17 21:16:00 
// Update by HAMZAZAWARI2 on 2025-2-17 16:59:00 
// Update by HAMZAZAWARI2 on 2025-2-17 18:46:00 
// Update by HAMZAZAWARI2 on 2025-2-18 17:34:00 
// Update by HAMZAZAWARI2 on 2025-2-18 12:3:00 
// Update by HAMZAZAWARI2 on 2025-2-18 14:15:00 
// Update by HAMZAZAWARI2 on 2025-2-19 14:55:00 
// Update by HAMZAZAWARI2 on 2025-2-19 18:1:00 
// Update by HAMZAZAWARI2 on 2025-2-19 18:1:00 
// Update by HAMZAZAWARI2 on 2025-2-20 13:10:00 
// Update by HAMZAZAWARI2 on 2025-2-20 16:44:00 
// Update by HAMZAZAWARI2 on 2025-2-20 10:48:00 
// Update by HAMZAZAWARI2 on 2025-2-21 17:5:00 
// Update by HAMZAZAWARI2 on 2025-2-21 11:51:00 
// Update by HAMZAZAWARI2 on 2025-2-21 12:58:00 
// Update by HAMZAZAWARI2 on 2025-2-22 21:5:00 
// Update by HAMZAZAWARI2 on 2025-2-22 12:20:00 
// Update by HAMZAZAWARI2 on 2025-2-22 21:33:00 
// Update by HAMZAZAWARI2 on 2025-2-23 14:55:00 
// Update by HAMZAZAWARI2 on 2025-2-23 10:9:00 
// Update by HAMZAZAWARI2 on 2025-2-23 20:34:00 
// Update by HAMZAZAWARI2 on 2025-2-24 21:45:00 
// Update by HAMZAZAWARI2 on 2025-2-24 19:25:00 
// Update by HAMZAZAWARI2 on 2025-2-24 9:9:00 
// Update by HAMZAZAWARI2 on 2025-2-25 21:29:00 
// Update by HAMZAZAWARI2 on 2025-2-25 13:50:00 
// Update by HAMZAZAWARI2 on 2025-2-25 17:11:00 
// Update by HAMZAZAWARI2 on 2025-2-26 9:50:00 
// Update by HAMZAZAWARI2 on 2025-2-26 11:39:00 
// Update by HAMZAZAWARI2 on 2025-2-26 19:19:00 
// Update by HAMZAZAWARI2 on 2025-2-27 20:5:00 
// Update by HAMZAZAWARI2 on 2025-2-27 9:4:00 
// Update by HAMZAZAWARI2 on 2025-2-27 15:47:00 
// Update by HAMZAZAWARI2 on 2025-2-28 12:24:00 
// Update by HAMZAZAWARI2 on 2025-2-28 16:10:00 
// Update by HAMZAZAWARI2 on 2025-2-28 16:3:00 
// Update by HAMZAZAWARI2 on 2025-3-1 19:43:00 
// Update by HAMZAZAWARI2 on 2025-3-1 10:54:00 
// Update by HAMZAZAWARI2 on 2025-3-1 12:7:00 
// Update by HAMZAZAWARI2 on 2025-3-2 15:15:00 
// Update by HAMZAZAWARI2 on 2025-3-2 11:47:00 
// Update by HAMZAZAWARI2 on 2025-3-2 18:41:00 
// Update by HAMZAZAWARI2 on 2025-3-3 10:59:00 
// Update by HAMZAZAWARI2 on 2025-3-3 19:45:00 
// Update by HAMZAZAWARI2 on 2025-3-3 21:37:00 
// Update by HAMZAZAWARI2 on 2025-3-4 17:9:00 
// Update by HAMZAZAWARI2 on 2025-3-4 17:8:00 
// Update by HAMZAZAWARI2 on 2025-3-4 17:53:00 
// Update by HAMZAZAWARI2 on 2025-3-5 21:27:00 
// Update by HAMZAZAWARI2 on 2025-3-5 22:19:00 
// Update by HAMZAZAWARI2 on 2025-3-5 16:36:00 
// Update by HAMZAZAWARI2 on 2025-3-6 17:54:00 
// Update by HAMZAZAWARI2 on 2025-3-6 19:21:00 
// Update by HAMZAZAWARI2 on 2025-3-6 16:18:00 
// Update by HAMZAZAWARI2 on 2025-3-7 13:56:00 
// Update by HAMZAZAWARI2 on 2025-3-7 14:48:00 
// Update by HAMZAZAWARI2 on 2025-3-7 17:5:00 
// Update by HAMZAZAWARI2 on 2025-3-8 10:31:00 
// Update by HAMZAZAWARI2 on 2025-3-8 17:12:00 
// Update by HAMZAZAWARI2 on 2025-3-8 22:37:00 
// Update by HAMZAZAWARI2 on 2025-3-9 11:23:00 
// Update by HAMZAZAWARI2 on 2025-3-9 20:12:00 
// Update by HAMZAZAWARI2 on 2025-3-9 16:28:00 
// Update by HAMZAZAWARI2 on 2025-3-10 22:46:00 
// Update by HAMZAZAWARI2 on 2025-3-10 10:5:00 
// Update by HAMZAZAWARI2 on 2025-3-10 22:33:00 
// Update by HAMZAZAWARI2 on 2025-3-11 18:9:00 
// Update by HAMZAZAWARI2 on 2025-3-11 21:35:00 
// Update by HAMZAZAWARI2 on 2025-3-11 17:30:00 
// Update by HAMZAZAWARI2 on 2025-3-12 20:7:00 
// Update by HAMZAZAWARI2 on 2025-3-12 22:4:00 
// Update by HAMZAZAWARI2 on 2025-3-12 14:29:00 
// Update by HAMZAZAWARI2 on 2025-3-13 9:30:00 
// Update by HAMZAZAWARI2 on 2025-3-13 21:31:00 
// Update by HAMZAZAWARI2 on 2025-3-13 19:43:00 
// Update by HAMZAZAWARI2 on 2025-3-14 22:39:00 
// Update by HAMZAZAWARI2 on 2025-3-14 14:35:00 
// Update by HAMZAZAWARI2 on 2025-3-14 18:18:00 
// Update by HAMZAZAWARI2 on 2025-3-15 21:41:00 
// Update by HAMZAZAWARI2 on 2025-3-15 17:15:00 
// Update by HAMZAZAWARI2 on 2025-3-15 22:17:00 
// Update by HAMZAZAWARI2 on 2025-3-16 9:58:00 
// Update by HAMZAZAWARI2 on 2025-3-16 16:0:00 
// Update by HAMZAZAWARI2 on 2025-3-16 9:18:00 
// Feature branch change by HAMZAZAWARI2 
// Update by HAMZAZAWARI2 on 2025-3-17 9:13:00 
// Update by HAMZAZAWARI2 on 2025-3-17 22:11:00 
// Update by HAMZAZAWARI2 on 2025-3-17 11:52:00 
// Update by HAMZAZAWARI2 on 2025-3-18 21:45:00 
// Update by HAMZAZAWARI2 on 2025-3-18 21:3:00 
// Update by HAMZAZAWARI2 on 2025-3-18 12:19:00 
// Update by HAMZAZAWARI2 on 2025-3-19 14:12:00 
// Update by HAMZAZAWARI2 on 2025-3-19 9:42:00 
// Update by HAMZAZAWARI2 on 2025-3-19 20:22:00 
// Update by HAMZAZAWARI2 on 2025-3-20 20:7:00 
// Update by HAMZAZAWARI2 on 2025-3-20 15:55:00 
// Update by HAMZAZAWARI2 on 2025-3-20 11:16:00 
// Update by HAMZAZAWARI2 on 2025-3-21 9:13:00 
// Update by HAMZAZAWARI2 on 2025-3-21 9:14:00 
// Update by HAMZAZAWARI2 on 2025-3-21 14:42:00 
// Update by HAMZAZAWARI2 on 2025-3-22 16:31:00 
// Update by HAMZAZAWARI2 on 2025-3-22 17:55:00 
// Update by HAMZAZAWARI2 on 2025-3-22 15:50:00 
// Update by HAMZAZAWARI2 on 2025-3-23 15:39:00 
// Update by HAMZAZAWARI2 on 2025-3-23 18:22:00 
// Update by HAMZAZAWARI2 on 2025-3-23 14:6:00 
// Update by HAMZAZAWARI2 on 2025-3-24 20:36:00 
// Update by HAMZAZAWARI2 on 2025-3-24 14:47:00 
// Update by HAMZAZAWARI2 on 2025-3-24 12:14:00 
// Update by HAMZAZAWARI2 on 2025-3-25 20:29:00 
// Feature branch change by HAMZAZAWARI2 
// Update by HAMZAZAWARI2 on 2025-3-25 17:6:00 
// Update by HAMZAZAWARI2 on 2025-3-25 12:28:00 
// Update by HAMZAZAWARI2 on 2025-3-26 16:17:00 
// Update by HAMZAZAWARI2 on 2025-3-26 10:47:00 
// Update by HAMZAZAWARI2 on 2025-3-26 22:36:00 
// Feature branch change by HAMZAZAWARI2 
// Update by HAMZAZAWARI2 on 2025-3-27 19:41:00 
// Update by HAMZAZAWARI2 on 2025-3-27 20:6:00 
// Update by HAMZAZAWARI2 on 2025-3-27 20:53:00 
// Update by HAMZAZAWARI2 on 2025-3-28 11:18:00 
// Update by HAMZAZAWARI2 on 2025-3-28 15:26:00 
// Update by HAMZAZAWARI2 on 2025-3-28 13:54:00 
// Update by HAMZAZAWARI2 on 2025-4-1 13:30:00 
// Update by HAMZAZAWARI2 on 2025-4-1 14:9:00 
// Update by HAMZAZAWARI2 on 2025-4-1 22:25:00 
// Update by HAMZAZAWARI2 on 2025-4-2 11:25:00 
// Update by HAMZAZAWARI2 on 2025-4-2 9:10:00 
// Update by HAMZAZAWARI2 on 2025-4-2 9:29:00 
// Update by HAMZAZAWARI2 on 2025-4-3 22:24:00 
// Update by HAMZAZAWARI2 on 2025-4-3 17:12:00 
// Update by HAMZAZAWARI2 on 2025-4-3 10:57:00 
// Update by HAMZAZAWARI2 on 2025-4-4 16:2:00 
// Update by HAMZAZAWARI2 on 2025-4-4 21:11:00 
// Update by HAMZAZAWARI2 on 2025-4-4 16:15:00 
// Update by HAMZAZAWARI2 on 2025-4-5 18:26:00 
// Update by HAMZAZAWARI2 on 2025-4-5 16:25:00 
// Feature branch change by HAMZAZAWARI2 
// Update by HAMZAZAWARI2 on 2025-4-5 16:24:00 
// Update by HAMZAZAWARI2 on 2025-4-6 20:49:00 
// Update by HAMZAZAWARI2 on 2025-4-6 20:30:00 
// Update by HAMZAZAWARI2 on 2025-4-6 14:45:00 
// Update by HAMZAZAWARI2 on 2025-4-7 18:12:00 
// Update by HAMZAZAWARI2 on 2025-4-7 15:37:00 
// Update by HAMZAZAWARI2 on 2025-4-7 11:58:00 
// Update by HAMZAZAWARI2 on 2025-4-8 13:26:00 
// Update by HAMZAZAWARI2 on 2025-4-8 19:5:00 
// Update by HAMZAZAWARI2 on 2025-4-8 21:30:00 
// Update by HAMZAZAWARI2 on 2025-4-9 16:42:00 
// Update by HAMZAZAWARI2 on 2025-4-9 14:17:00 
// Update by HAMZAZAWARI2 on 2025-4-9 14:25:00 
// Update by HAMZAZAWARI2 on 2025-4-10 11:3:00 
// Update by HAMZAZAWARI2 on 2025-4-10 20:16:00 
// Feature branch change by HAMZAZAWARI2 
// Update by HAMZAZAWARI2 on 2025-4-10 20:36:00 
// Update by HAMZAZAWARI2 on 2025-4-11 10:6:00 
// Update by HAMZAZAWARI2 on 2025-4-11 15:58:00 
// Update by HAMZAZAWARI2 on 2025-4-11 20:14:00 
// Update by HAMZAZAWARI2 on 2025-4-12 18:29:00 
// Update by HAMZAZAWARI2 on 2025-4-12 9:36:00 
// Update by HAMZAZAWARI2 on 2025-4-12 11:2:00 
// Update by HAMZAZAWARI2 on 2025-4-13 17:8:00 
// Update by HAMZAZAWARI2 on 2025-4-13 15:19:00 
// Update by HAMZAZAWARI2 on 2025-4-13 18:28:00 
// Update by HAMZAZAWARI2 on 2025-4-14 16:44:00 
// Update by HAMZAZAWARI2 on 2025-4-14 12:8:00 
// Update by HAMZAZAWARI2 on 2025-4-14 14:20:00 
// Update by HAMZAZAWARI2 on 2025-4-15 19:3:00 
// Update by HAMZAZAWARI2 on 2025-4-15 21:0:00 
// Update by HAMZAZAWARI2 on 2025-4-15 19:2:00 
// Update by HAMZAZAWARI2 on 2025-4-16 15:59:00 
// Update by HAMZAZAWARI2 on 2025-4-16 11:27:00 
// Update by HAMZAZAWARI2 on 2025-4-16 20:25:00 
// Update by HAMZAZAWARI2 on 2025-4-17 10:54:00 
// Update by HAMZAZAWARI2 on 2025-4-17 11:27:00 
// Update by HAMZAZAWARI2 on 2025-4-17 22:32:00 
// Update by HAMZAZAWARI2 on 2025-4-18 14:34:00 
// Update by HAMZAZAWARI2 on 2025-4-18 19:34:00 
// Update by HAMZAZAWARI2 on 2025-4-18 19:17:00 
// Update by HAMZAZAWARI2 on 2025-4-19 12:29:00 
// Update by HAMZAZAWARI2 on 2025-4-19 12:40:00 
// Update by HAMZAZAWARI2 on 2025-4-19 21:2:00 
// Update by HAMZAZAWARI2 on 2025-4-20 17:14:00 
// Update by HAMZAZAWARI2 on 2025-4-20 13:14:00 
// Update by HAMZAZAWARI2 on 2025-4-20 13:49:00 
// Update by HAMZAZAWARI2 on 2025-4-21 16:35:00 
// Update by HAMZAZAWARI2 on 2025-4-21 9:50:00 
// Update by HAMZAZAWARI2 on 2025-4-21 16:54:00 
// Update by HAMZAZAWARI2 on 2025-4-22 9:40:00 
// Update by HAMZAZAWARI2 on 2025-4-22 14:24:00 
// Update by HAMZAZAWARI2 on 2025-4-22 18:36:00 
// Update by HAMZAZAWARI2 on 2025-4-23 10:7:00 
// Update by HAMZAZAWARI2 on 2025-4-23 12:6:00 
// Update by HAMZAZAWARI2 on 2025-4-23 15:23:00 
// Update by HAMZAZAWARI2 on 2025-4-24 22:9:00 
// Update by HAMZAZAWARI2 on 2025-4-24 15:48:00 
// Update by HAMZAZAWARI2 on 2025-4-24 22:28:00 
// Update by HAMZAZAWARI2 on 2025-4-25 19:32:00 
// Update by HAMZAZAWARI2 on 2025-4-25 13:35:00 
// Update by HAMZAZAWARI2 on 2025-4-25 14:14:00 
// Update by HAMZAZAWARI2 on 2025-4-26 19:21:00 
// Update by HAMZAZAWARI2 on 2025-4-26 21:4:00 
// Update by HAMZAZAWARI2 on 2025-4-26 9:29:00 
// Update by HAMZAZAWARI2 on 2025-4-27 9:15:00 
// Update by HAMZAZAWARI2 on 2025-4-27 12:6:00 
// Update by HAMZAZAWARI2 on 2025-4-27 16:36:00 
// Update by HAMZAZAWARI2 on 2025-4-28 11:56:00 
// Update by HAMZAZAWARI2 on 2025-4-28 20:8:00 
// Update by HAMZAZAWARI2 on 2025-4-28 14:8:00 
// Feature branch change by HAMZAZAWARI2 
