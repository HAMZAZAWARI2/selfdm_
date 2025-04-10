// Updated ChatScreen.js with dual ephemeral encryption support and key presence validation
import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Image, AppState
} from "react-native";
import { useAuth } from "../Context/AuthContext";
import { db } from "../Config/firebase";
import {
  collection, query, orderBy, onSnapshot, addDoc,
  serverTimestamp, updateDoc, doc, writeBatch, getDocs
} from "firebase/firestore";
import { format, isToday, isYesterday } from "date-fns";
import {
  encryptForBoth,
  decryptWithEphemeralKey,
  hexToBuffer
} from '../Utils/encryption';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenCapture from 'expo-screen-capture';
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";

export default function ChatScreen({ route }) {
  const { user } = useAuth();
  const { contact } = route.params;
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isContactOnline, setIsContactOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const navigation = useNavigation();
  const chatId = [user.uid, contact.uid].sort().join("_");
  const deleteTimerRef = useRef(null);

  const getPrivateKey = async () => await AsyncStorage.getItem('privateKey');
  const getPublicKey = async () => await AsyncStorage.getItem('publicKey');

  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync();
    return () => ScreenCapture.allowScreenCaptureAsync();
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      const userStatusRef = doc(db, "users", user.uid);
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        await updateDoc(userStatusRef, {
          status: "offline",
          lastSeen: serverTimestamp(),
        });
      } else if (nextAppState === 'active') {
        await updateDoc(userStatusRef, {
          status: "online",
        });
      }
    };
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    isContactOnline ? clearDeleteTimer() : startDeleteTimer();
  }, [isContactOnline]);

  const startDeleteTimer = () => {
    if (deleteTimerRef.current) return;
    deleteTimerRef.current = setTimeout(() => deleteAllMessages(), 6000);
  };

  const clearDeleteTimer = () => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  };

  const deleteAllMessages = async () => {
    try {
      const messagesRef = collection(db, "chats", chatId, "messages");
      const snapshot = await getDocs(messagesRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      await addDoc(messagesRef, {
        text: "All messages have been deleted because user went offline.",
        senderId: "system",
        timestamp: serverTimestamp(),
        seen: false,
      });
    } catch (error) {
      console.error("Error deleting messages:", error);
    }
  };

  useEffect(() => {
    const contactRef = doc(db, "users", contact.uid);
    const unsubscribe = onSnapshot(contactRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsContactOnline(data?.status === "online");
        setLastSeen(data?.lastSeen);
      }
    });
    return () => unsubscribe();
  }, [contact.uid]);

  useEffect(() => {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      /* setIsLoading(true); */
      const myPrivateKey = await getPrivateKey();

      const decryptedMessages = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          let decryptedText = data.text;
      
          const isMine = data.senderId === user.uid;
          const isSystem = data.senderId === "system";
      
          if (!isSystem && data.ephemeralPublicKey) {
            try {
              if (
                isMine &&
                Array.isArray(data.selfCiphertext) &&
                Array.isArray(data.selfNonce)
              ) {
                decryptedText = decryptWithEphemeralKey(
                  data.selfCiphertext,
                  data.selfNonce,
                  data.ephemeralPublicKey,
                  myPrivateKey
                );
              } else if (
                Array.isArray(data.ciphertext) &&
                Array.isArray(data.nonce)
              ) {
                decryptedText = decryptWithEphemeralKey(
                  data.ciphertext,
                  data.nonce,
                  data.ephemeralPublicKey,
                  myPrivateKey
                );
              }
            } catch {
              decryptedText = "Error decrypting message";
            }
          }
      
          return {
            id: doc.id,
            ...data,
            text: decryptedText,
            timestamp: data.timestamp?.toDate(),
          };
        })
      );
      setMessages(decryptedMessages);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [chatId]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
  
    try {
      const myPublicKey = await getPublicKey();
      const receiverPublicKey = contact.publicKey;
  
      if (!myPublicKey || !receiverPublicKey) {
        console.warn("Missing public key: cannot send message");
        return;
      }
  
      const {
        ciphertext,
        nonce,
        ephemeralPublicKey,
        selfCiphertext,
        selfNonce
      } = encryptForBoth(message, receiverPublicKey, myPublicKey);
  
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: user.uid,
        receiverId: contact.uid,
        ciphertext,
        nonce,
        ephemeralPublicKey,
        selfCiphertext,
        selfNonce,
        timestamp: serverTimestamp(),
        seen: false,
      });
  
      setMessage("");
    } catch (error) {
      console.error("Error sending encrypted message:", error);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp || isNaN(new Date(timestamp))) return "";
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday " + format(date, "h:mm a");
    return format(date, "MMM d, yyyy h:mm a");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.profileHeader}>
          {contact.profilePic ? (
            <Image source={{ uri: contact.profilePic }} style={styles.profilePic} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitials}>{contact.fullName ? contact.fullName[0] : contact.email[0]}</Text>
            </View>
          )}
          <Text style={styles.headerText}>{contact.fullName || contact.email}</Text>
        </View>
        <View style={styles.statusContainer}>
          {isContactOnline ? (
            <>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>Online</Text>
            </>
          ) : (
            <>
              <View style={styles.offlineDot} />
              <Text style={styles.statusText}>
                {lastSeen ? `Last seen ${formatTimestamp(new Date(lastSeen))}` : "Offline"}
              </Text>
            </>
          )}
        </View>
      </View>
  
      
        <FlatList
          data={messages}
          renderItem={({ item }) => {
            const isMine = item.senderId === user.uid;
            const isSystem = item.senderId === "system";
            const bubbleStyle = isSystem
              ? styles.systemMessage
              : isMine
              ? styles.myMessage
              : styles.otherMessage;
  
            return (
              <View style={bubbleStyle}>
                <Text style={styles.messageText}>{item.text}</Text>
                {!isSystem && (
                  <View style={styles.timestampContainer}>
                    <Text style={styles.timestampText}>{formatTimestamp(item.timestamp)}</Text>
                  </View>
                )}
              </View>
            );
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
        />
      
  
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Type a message"
          value={message}
          onChangeText={setMessage}
          style={styles.input}
          editable={isContactOnline}
        />
        <TouchableOpacity
          onPress={handleSendMessage}
          style={[styles.sendButton, !isContactOnline && styles.disabledButton]}
          disabled={!isContactOnline}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#007bff",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingTop: 40,
  },
  backButton: {
    marginRight: 16,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  profileInitials: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  sstatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#008000",
    marginRight: 6,
  },
  offlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "gray",
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: "#666",
  },
  deletionWarning: {
    fontSize: 14,
    color: "red",
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#007bff",
  },
  messagesContainer: {
    flexGrow: 1,
    padding: 16,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#dcf8c6",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: "80%",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: "80%",
  },
  systemMessage: {
    alignSelf: "center",
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: "80%",
  },
  messageText: {
    fontSize: 16,
  },
  timestampContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
  },
  seenIndicator: {
    fontSize: 12,
    color: "blue",
    marginRight: 4,
  },
  timestampText: {
    fontSize: 12,
    color: "#666",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  sendButton: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "green",
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  disabledButton: {
    backgroundColor: "#ccc", // Gray out the button when disabled
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});
// Minor update by HAMZAZAWARI2 
// Another change by Aatif-Khan-Niazi 
