import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

admin.initializeApp();

const theories = [
    'croatoan',
    'chesapeake',
    'starvation',
    'attack',
    'spanish'
];

export const updateTheoryTallies = onDocumentWritten(
    'theoryVotes/{userId}',
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();
        
        const db = admin.firestore();
        const batch = db.batch();
        
        const previousChoice = before?.choice;
        const newChoice = after?.choice;
        
        if (previousChoice === newChoice) {
            return;
        }
        
        if (previousChoice && theories.includes(previousChoice)) {
            batch.set(
                db.doc(`theoryVoteTallies/${previousChoice}`),
                {
                    count: admin.firestore.FieldValue.increment(-1)
                },
                { merge: true }
            );
        }
        
        if (newChoice && theories.includes(newChoice)) {
            batch.set(
                db.doc(`theoryVoteTallies/${newChoice}`),
                {
                    count: admin.firestore.FieldValue.increment(1)
                },
                { merge: true }
            );
        }
        
        await batch.commit();
    }
);