import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication, User as NativeUser } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
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
let nativeAuthentication: Promise<NativeUser> | undefined;

class VotingTimeoutError extends Error {
  readonly code = 'vote/network-timeout';

  constructor(message: string) {
    super(message);
    this.name = 'VotingTimeoutError';
  }
}

function withTimeout<T>(operation: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new VotingTimeoutError(message)),
      milliseconds
    );

    operation.then(
      (result) => {
        window.clearTimeout(timeout);
        resolve(result);
      },
      (error: unknown) => {
        window.clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function isNativeFirebase(): boolean {
  return Capacitor.isNativePlatform();
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function currentUser(): Promise<User> {
  if (firebaseAuth.currentUser) {
    return Promise.resolve(firebaseAuth.currentUser);
  }

  console.info('[Voting] Starting anonymous authentication');
  authentication ??= signInAnonymously(firebaseAuth)
  .then(({ user }) => user)
  .catch((error: unknown) => {
    console.error('[Voting] Anonymous auth failed REAL ERROR', error);
    authentication = undefined;
    throw error;
  });
  return withTimeout(
    authentication,
    20_000,
    'Firebase Authentication did not respond.'
  );
}

async function currentNativeUser(): Promise<NativeUser> {
  const { user } = await FirebaseAuthentication.getCurrentUser();
  if (user?.uid) {
    return user;
  }

  console.info('[Voting] Starting native anonymous authentication');
  nativeAuthentication ??= FirebaseAuthentication.signInAnonymously()
    .then((result) => {
      if (!result.user?.uid) {
        throw new Error('Native anonymous authentication did not return a user.');
      }
      return result.user;
    })
    .catch((error: unknown) => {
      console.error('[Voting] Native anonymous auth failed REAL ERROR', error);
      nativeAuthentication = undefined;
      throw error;
    });

  return withTimeout(
    nativeAuthentication,
    20_000,
    'Native Firebase Authentication did not respond.'
  );
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

  if (code === 'vote/network-timeout') {
    return 'The vote server did not respond. Check your connection and try again.';
  }

  return 'Voting is temporarily unavailable. Please try again.';
}

export async function observeTheoryVotes(
  onVote: (vote: TheoryKey | null) => void,
  onResults: (results: TheoryVoteResults) => void,
  onError: (error: Error) => void
): Promise<Unsubscribe> {
  if (isNativeFirebase()) {
    return observeNativeTheoryVotes(onVote, onResults, onError);
  }

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
  if (isNativeFirebase()) {
    return castNativeTheoryVote(choice);
  }

  const user = await currentUser();
  const voteReference = doc(firestore, 'theoryVotes', user.uid);

  await withTimeout(
    runTransaction(firestore, async (transaction) => {
      const voteSnapshot = await transaction.get(voteReference);
      const previousChoice = voteSnapshot.data()?.['choice'] as TheoryKey | undefined;

      if (previousChoice === choice) {
        return;
      }

      transaction.set(voteReference, {
        choice,
        updatedAt: serverTimestamp()
      });

      if (previousChoice && theoryKeys.includes(previousChoice)) {
        transaction.set(
          doc(firestore, 'theoryVoteTallies', previousChoice),
          { count: increment(-1) },
          { merge: true }
        );
      }

      transaction.set(
        doc(firestore, 'theoryVoteTallies', choice),
        { count: increment(1) },
        { merge: true }
      );
    }),
    20_000,
    'Cloud Firestore did not respond.'
  );
}

async function observeNativeTheoryVotes(
  onVote: (vote: TheoryKey | null) => void,
  onResults: (results: TheoryVoteResults) => void,
  onError: (error: Error) => void
): Promise<Unsubscribe> {
  const user = await currentNativeUser();
  const voteReference = `theoryVotes/${user.uid}`;

  const voteListenerId = await FirebaseFirestore.addDocumentSnapshotListener<{ choice?: TheoryKey }>(
    { reference: voteReference },
    (event, error) => {
      if (error) {
        onError(asError(error));
        return;
      }

      const choice = event?.snapshot.data?.choice;
      onVote(theoryKeys.includes(choice as TheoryKey) ? choice as TheoryKey : null);
    }
  );

  const tallyListenerId = await FirebaseFirestore.addCollectionSnapshotListener<{ count?: number }>(
    { reference: 'theoryVoteTallies' },
    (event, error) => {
      if (error) {
        onError(asError(error));
        return;
      }

      const results = emptyTheoryVoteResults();
      event?.snapshots.forEach((tally) => {
        if (theoryKeys.includes(tally.id as TheoryKey)) {
          results[tally.id as TheoryKey] = Math.max(0, Number(tally.data?.count) || 0);
        }
      });
      onResults(results);
    }
  );

  return () => {
    void FirebaseFirestore.removeSnapshotListener({ callbackId: voteListenerId });
    void FirebaseFirestore.removeSnapshotListener({ callbackId: tallyListenerId });
  };
}

async function castNativeTheoryVote(choice: TheoryKey): Promise<void> {
  const user = await currentNativeUser();
  const voteReference = `theoryVotes/${user.uid}`;

  await withTimeout(
    castNativeTheoryVoteWithRetries(voteReference, choice),
    20_000,
    'Native Cloud Firestore did not respond.'
  );
}

async function castNativeTheoryVoteWithRetries(
  voteReference: string,
  choice: TheoryKey
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await castNativeTheoryVoteOnce(voteReference, choice);
      return;
    } catch (error: unknown) {
      lastError = error;
      console.warn('[Voting] Native vote write attempt failed', error);
      await sleep(200 * (attempt + 1));
    }
  }

  throw lastError;
}

async function castNativeTheoryVoteOnce(
  voteReference: string,
  choice: TheoryKey
): Promise<void> {
  const voteSnapshot = await FirebaseFirestore.getDocument<{ choice?: TheoryKey }>({
    reference: voteReference
  });
  const previousChoice = voteSnapshot.snapshot.data?.choice;

  if (previousChoice === choice) {
    return;
  }

  const choiceTally = await nativeTallyCount(choice);
  const operations = [
    {
      type: 'set' as const,
      reference: voteReference,
      data: {
        choice,
        updatedAt: Date.now()
      }
    },
    {
      type: 'set' as const,
      reference: `theoryVoteTallies/${choice}`,
      data: {
        count: choiceTally + 1
      }
    }
  ];

  if (previousChoice && theoryKeys.includes(previousChoice)) {
    const previousTally = await nativeTallyCount(previousChoice);
    operations.push({
      type: 'set',
      reference: `theoryVoteTallies/${previousChoice}`,
      data: {
        count: Math.max(0, previousTally - 1)
      }
    });
  }

  await FirebaseFirestore.writeBatch({ operations });
}

async function nativeTallyCount(choice: TheoryKey): Promise<number> {
  const tallySnapshot = await FirebaseFirestore.getDocument<{ count?: number }>({
    reference: `theoryVoteTallies/${choice}`
  });

  return Math.max(0, Number(tallySnapshot.snapshot.data?.count) || 0);
}
