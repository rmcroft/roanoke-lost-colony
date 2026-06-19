import { signInAnonymously, User } from 'firebase/auth';
import {
  collection,
  doc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { firebaseAuth, firestore } from './firebase';

export type TheoryKey = 'croatoan' | 'chesapeake' | 'starvation' | 'attack' | 'spanish';
export type TheoryVoteResults = Record<TheoryKey, number>;

const theoryKeys: TheoryKey[] = ['croatoan', 'chesapeake', 'starvation', 'attack', 'spanish'];

export const emptyTheoryVoteResults = (): TheoryVoteResults => ({
  croatoan: 0,
  chesapeake: 0,
  starvation: 0,
  attack: 0,
  spanish: 0
});

let authentication: Promise<User> | undefined;

function currentUser(): Promise<User> {
  if (firebaseAuth.currentUser) {
    return Promise.resolve(firebaseAuth.currentUser);
  }

  authentication ??= signInAnonymously(firebaseAuth)
    .then(({ user }) => user)
    .catch((error: unknown) => {
      // Allow a later retry after a temporary outage or project configuration change.
      authentication = undefined;
      throw error;
    });
  return authentication;
}

export function theoryVotingErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';

  if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
    return 'Voting needs Anonymous sign-in enabled in Firebase Authentication.';
  }

  if (code === 'permission-denied' || code === 'firestore/permission-denied') {
    return 'Voting needs the project’s Firestore security rules deployed.';
  }

  return 'Voting is temporarily unavailable. Please try again.';
}

export async function observeTheoryVotes(
  onVote: (vote: TheoryKey | null) => void,
  onResults: (results: TheoryVoteResults) => void,
  onError: (error: Error) => void
): Promise<Unsubscribe> {
  const user = await currentUser();
  const unsubscribers = [
    onSnapshot(doc(firestore, 'theoryVotes', user.uid), (snapshot) => {
      const choice = snapshot.data()?.['choice'];
      onVote(theoryKeys.includes(choice) ? choice : null);
    }, onError),
    onSnapshot(collection(firestore, 'theoryVoteTallies'), (snapshot) => {
      const results = emptyTheoryVoteResults();
      snapshot.forEach((tally) => {
        if (theoryKeys.includes(tally.id as TheoryKey)) {
          results[tally.id as TheoryKey] = Math.max(0, Number(tally.data()['count']) || 0);
        }
      });
      onResults(results);
    }, onError)
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export async function castTheoryVote(choice: TheoryKey): Promise<void> {
  const user = await currentUser();
  const voteReference = doc(firestore, 'theoryVotes', user.uid);

  await runTransaction(firestore, async (transaction) => {
    const voteSnapshot = await transaction.get(voteReference);
    if (voteSnapshot.exists()) {
      return;
    }

    transaction.set(voteReference, {
      choice,
      updatedAt: serverTimestamp()
    });

    transaction.set(
      doc(firestore, 'theoryVoteTallies', choice),
      { count: increment(1) },
      { merge: true }
    );
  });
}
