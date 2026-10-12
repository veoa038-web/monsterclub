// Firebase Configuration (Compat Version for local file:// execution)

const firebaseConfig = {
    apiKey: "AIzaSyAap6CAYuiLQmTdC1DfrEhq1gk7sHOjnXQ",
    authDomain: "monster-club-f2379.firebaseapp.com",
    projectId: "monster-club-f2379",
    storageBucket: "monster-club-f2379.firebasestorage.app",
    messagingSenderId: "906743349104",
    appId: "1:906743349104:web:c0f4911a695aa34221d9b5",
    measurementId: "G-XFY6C9KKTL"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);

// Initialize Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Disable persistence to prevent multi-tab crashes on file:// protocol
// db.enablePersistence().catch((err) => {
//     console.warn("Firestore persistence failed:", err.code);
// });
