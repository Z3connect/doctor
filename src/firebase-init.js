// src/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDxSpzWbZPU4VU3h8GvcKHR8D0vK6-J9hA",
  authDomain: "doctor-74dad.firebaseapp.com",
  projectId: "doctor-74dad",
  storageBucket: "doctor-74dad.firebasestorage.app",
  messagingSenderId: "731968906571",
  appId: "1:731968906571:web:7c95abf4f9d52acc9434ce"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
