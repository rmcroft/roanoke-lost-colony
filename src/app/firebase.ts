import { getAnalytics, isSupported } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB3Dbe9DICsm1jv6GrjcqfU7ozHzwdEnoU',
  authDomain: 'lost-colony-22bf9.firebaseapp.com',
  projectId: 'lost-colony-22bf9',
  storageBucket: 'lost-colony-22bf9.firebasestorage.app',
  messagingSenderId: '385430330510',
  appId: '1:385430330510:web:1a8d3a8aaa6d31fd1efddf',
  measurementId: 'G-TP4Y5L87X6'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);

// Analytics is unavailable in some native WebViews and privacy-restricted browsers.
void isSupported().then((supported) => {
  if (supported) {
    getAnalytics(firebaseApp);
  }
}).catch(() => {
  // Firebase services remain available when Analytics cannot initialize.
});
