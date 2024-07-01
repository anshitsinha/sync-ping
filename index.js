const express = require('express');
const admin = require('firebase-admin');

// Initialize Express
const app = express();
const port = process.env.PORT || 3000;

// Initialize Firebase Admin SDK
console.log('Initializing Firebase Admin SDK...');
const serviceAccount = require('./firebaseServiceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://hush-df0a6-default-rtdb.asia-southeast1.firebasedatabase.app"
});
console.log('Firebase Admin SDK initialized.');

// Reference to your Firestore database
const db = admin.firestore();

// Function to fetch and log existing posts
const fetchExistingPosts = async () => {
  console.log('Fetching existing posts...');
  try {
    const snapshot = await db.collection('posts').get();
    if (snapshot.empty) {
      console.log('No posts found.');
    } else {
      snapshot.forEach(doc => {
        console.log('Existing post:', doc.id, '=>', doc.data());
      });
    }
  } catch (error) {
    console.error('Failed to fetch posts:', error);
  }
};

// Fetch and log existing posts on server start
fetchExistingPosts();

// Function to send notification to FCM tokens
const sendNotification = async (post) => {
  try {
    const tokensSnapshot = await db.collection('fcmTokens').get();
    if (tokensSnapshot.empty) {
      console.log('No FCM tokens found.');
      return;
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
    const message = {
      notification: {
        title: 'New Post Added',
        body: `A new post was added: ${post.caption}`
      },
      tokens: tokens
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log('Notification sent successfully:', response);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Function to listen for changes (new documents)
const listenForChanges = () => {
  console.log('Setting up database listener...');
  const ref = db.collection('posts');

  ref.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const newPost = change.doc.data();
        console.log('New post added:', change.doc.id, '=>', newPost);
        sendNotification(newPost);
      }
    });
  }, error => {
    console.error('The read failed:', error);
  });

  console.log('Database listener set up.');
};

// Start listening for changes
listenForChanges();

// Set up a simple route
app.get('/', (req, res) => {
  res.send('Express server is running');
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
