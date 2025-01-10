import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAeb80Glz_c3qhntJmUoZ24-xY67BkNVkg",
  authDomain: "sdmv2-da437.firebaseapp.com",
  projectId: "sdmv2-da437",
  storageBucket: "sdmv2-da437.firebasestorage.app",
  messagingSenderId: "290656836990",
  appId: "1:290656836990:web:5ae8d3ba338f6bb457672f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ✅ Removed setPersistence — not for React Native

export { auth, db };
