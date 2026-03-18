import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB4XU8BQBVI_0qBi8nhsTrvwarXtcg2ZVc",
  authDomain: "freshcart-a40a5.firebaseapp.com",
  projectId: "freshcart-a40a5",
  storageBucket: "freshcart-a40a5.firebasestorage.app",
  messagingSenderId: "794255245641",
  appId: "1:794255245641:web:406b05b962b453419bda98"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);