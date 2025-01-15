import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../Config/firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { generateECCKeyPair, encryptPrivateKey, decryptPrivateKey } from '../Utils/encryption';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Alert } from 'react-native';
import { onSnapshot } from "firebase/firestore";

const AuthContext = createContext();

const signUpErrors = {
    'auth/email-already-in-use': 'The email address is already in use.',
    'auth/invalid-email': 'The email address is invalid.',
    'auth/weak-password': 'The password is too weak.',
};

const loginErrors = {
    'auth/invalid-email': 'The email address is invalid.',
    'auth/invalid-credential': 'The credentials are invalid.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Email has been sent. Kindly check your inbox or try again later.',
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [contacts, setContacts] = useState([]);
    const [userContacts, setUserContacts] = useState([]);

    const setUserStatus = async (status) => {
        if (user) {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                status: status,
                lastSeen: status === "offline" ? new Date().toISOString() : null,
            });
        }
    };

    useEffect(() => {
        if (user) {
            const handleAppStateChange = (nextAppState) => {
                if (nextAppState === "background") {
                    setUserStatus("offline");
                } else if (nextAppState === "active") {
                    setUserStatus("online");
                }
            };

            const subscription = AppState.addEventListener("change", handleAppStateChange);

            return () => {
                subscription.remove();
            };
        }
    }, [user]);

    const initializeKeysIfMissing = async (uid) => {
        const existingPrivateKey = await AsyncStorage.getItem('privateKey');
        const existingPublicKey = await AsyncStorage.getItem('publicKey');

        if (!existingPrivateKey || !existingPublicKey) {
            const { privateKey, publicKey } = generateECCKeyPair();

            await AsyncStorage.setItem('privateKey', privateKey);
            await AsyncStorage.setItem('publicKey', publicKey);

            const userRef = doc(db, "users", uid);
            await updateDoc(userRef, { publicKey });

            console.log("🔐 New ECC key pair generated and saved.");
        } else {
            console.log("✅ ECC key pair already present.");
        }
    };

    const signUp = async (email, password) => {
        try {
            const { publicKey, privateKey } = generateECCKeyPair();
            const encryptedPrivateKey = encryptPrivateKey(privateKey, password);

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            const userData = {
                uid: userCredential.user.uid,
                email,
                fullName: null,
                profilePic: null,
                publicKey: publicKey,
                encryptedPrivateKey,
                createdAt: new Date().toISOString(),
                status: 'online',
                lastSeen: null,
                contacts: [],
            };

            await setDoc(doc(db, "users", userCredential.user.uid), userData);
            await AsyncStorage.setItem('privateKey', privateKey);
            await AsyncStorage.setItem('publicKey', publicKey);

            Alert.alert('Success', 'Account created successfully!');
        } catch (error) {
            const errorMessage = signUpErrors[error.code] || error.message || 'An error occurred during sign-up.';
            Alert.alert('Error', errorMessage);
        }
    };

    const login = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            if (!userCredential.user.emailVerified) {
                await sendEmailVerification(userCredential.user);
                Alert.alert('Email Not Verified', 'A verification email has been sent. Please verify your email to proceed.');
                return;
            }

            const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();

                const userRef = doc(db, "users", userCredential.user.uid);
                await updateDoc(userRef, {
                    status: "online",
                    lastSeen: null,
                });

                setUser(userData);
                setContacts(userData.contacts);

                const decryptedPrivateKey = decryptPrivateKey(userData.encryptedPrivateKey, password);
                await AsyncStorage.setItem('privateKey', decryptedPrivateKey);
                await AsyncStorage.setItem('publicKey', userData.publicKey); // ✅ Store public key

                await initializeKeysIfMissing(userCredential.user.uid);
                await fetchUserContacts();

                Alert.alert('Success', 'Logged in successfully!');
            }
        } catch (error) {
            const errorMessage = loginErrors[error.code] || error.message || 'An error occurred during login.';
            Alert.alert('Error', errorMessage);
        }
    };

    const logout = async () => {
        try {
            if (user) {
                await setUserStatus("offline");
            }
            await signOut(auth);
            await AsyncStorage.removeItem('privateKey');
            await AsyncStorage.removeItem('publicKey');
            setUser(null);
            setContacts([]);
            setUserContacts([]);
            Alert.alert('Success', 'Logged out successfully!');
        } catch (error) {
            Alert.alert('Error', 'An error occurred during logout.');
        }
    };

    const updateContacts = async (email) => {
        try {
            if (!user) throw new Error("User not logged in.");
            if (email === user.email) throw new Error("You cannot add your own email to contacts.");
            if (contacts.includes(email)) throw new Error("This email is already in your contacts.");

            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) throw new Error("User with this email does not exist.");

            const contactUID = querySnapshot.docs[0].id;
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                contacts: arrayUnion(contactUID),
            });

            setContacts((prev) => [...prev, contactUID]);
            await fetchUserContacts();
            Alert.alert('Success', 'Contact added successfully!');
        } catch (error) {
            Alert.alert('Error', error.message || 'An error occurred while adding the contact.');
        }
    };

    const fetchUserContacts = async () => {
        try {
            if (user) {
                const userRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const contactUIDs = userData?.contacts || [];

                    const contactsWithDetails = await Promise.all(
                        contactUIDs.map(async (uid) => {
                            const contactRef = doc(db, "users", uid);
                            const contactDoc = await getDoc(contactRef);
                            if (contactDoc.exists() && contactDoc.id !== user.uid) {
                                const contactData = contactDoc.data();
                                return {
                                    uid: contactDoc.id,
                                    email: contactData.email,
                                    publicKey: contactData.publicKey,
                                    status: contactData.status,
                                    lastSeen: contactData.lastSeen,
                                    fullName: contactData.fullName,
                                    profilePic: contactData.profilePic,
                                };
                            } else {
                                return null;
                            }
                        })
                    );

                    const filtered = contactsWithDetails.filter(c => c !== null);
                    setUserContacts(filtered);
                    setContacts(contactUIDs);
                }
            }
        } catch (error) {
            console.error("Error fetching user contacts: ", error);
            Alert.alert('Error', 'Failed to fetch contacts. Please try again.');
        }
    };

    const liveListenContacts = () => {
        if (!user) return () => {};
        const contactsRef = collection(db, "users");
        const q = query(contactsRef);
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const updatedContacts = await Promise.all(
                snapshot.docs
                    .filter(doc => (user.contacts || []).includes(doc.id))
                    .map(async (docSnap) => {
                        const data = docSnap.data();
                        return {
                            uid: docSnap.id,
                            email: data.email,
                            publicKey: data.publicKey,
                            status: data.status,
                            lastSeen: data.lastSeen,
                            fullName: data.fullName,
                            profilePic: data.profilePic,
                        };
                    })
            );
            setUserContacts(updatedContacts);
        });
        return unsubscribe;
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                if (user && user.emailVerified) {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUser(userData);
                        setContacts(userData.contacts);
                        await initializeKeysIfMissing(user.uid);
                        await fetchUserContacts();
                    }
                } else {
                    setUser(null);
                    setUserContacts([]);
                    setContacts([]);
                }
            } catch (error) {
                console.error("Error during auth state change:", error);
                Alert.alert('Error', 'An error occurred while checking your authentication status.');
            } finally {
                setLoading(false);
            }
        });
        return unsubscribe;
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                signUp,
                login,
                logout,
                updateContacts,
                setUserStatus,
                contacts,
                userContacts,
                fetchUserContacts,
                liveListenContacts,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
