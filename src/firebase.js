
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDNZvA7EZEzEfz-pbbzAHh9Yek-dKICcC2g",
  authDomain: "sistemapolleria-6c202.firebaseapp.com",
  databaseURL: "https://sistemapolleria-6c202-default-rtdb.firebaseio.com",
  projectId: "sistemapolleria-6c202",
  storageBucket: "sistemapolleria-6c202.firebasestorage.app",
  messagingSenderId: "206291168598",
  appId: "1:206291168598:web:92ad76046ddc8c9efcfaf7"
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);
