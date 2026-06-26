import { CommonModule } from '@angular/common';
import { Component, computed, OnDestroy, signal } from '@angular/core';
import {
  IonApp,
  IonContent,
  IonHeader,
  IonIcon,
  IonProgressBar,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  checkmarkCircleOutline,
  compassOutline,
  mapOutline,
  peopleOutline,
  ribbonOutline,
  searchOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
  trailSignOutline,
  trophyOutline
} from 'ionicons/icons';
import {
  castTheoryVote,
  emptyTheoryVoteResults,
  observeTheoryVotes,
  TheoryKey,
  theoryVotingErrorMessage,
  TheoryVoteResults
} from './theory-voting';

type SectionId = 'home' | 'story' | 'people' | 'map' | 'clues' | 'theories' | 'junior' | 'quiz' | 'references';

interface NavItem {
  id: SectionId;
  label: string;
  icon: string;
}

interface Theory {
  key: TheoryKey;
  pickerLabel: string;
  title: string;
  summary: string;
  supports: string[];
  challenges: string[];
}

interface QuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  answer: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    IonApp,
    IonContent,
    IonHeader,
    IonIcon,
    IonProgressBar,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnDestroy {
  protected readonly activeSection = signal<SectionId>(this.readInitialSection());
  protected readonly selectedMapPlace = signal('Roanoke Island');
  protected readonly selectedTheory = signal<TheoryKey>('croatoan');
  protected readonly vote = signal<TheoryKey | null>(null);
  protected readonly voteResults = signal<TheoryVoteResults>(emptyTheoryVoteResults());
  protected readonly votePending = signal(false);
  protected readonly voteError = signal('');
  protected readonly completedActivities = signal<string[]>(this.readCompletedActivities());
  protected readonly viewedMapPlaces = signal<string[]>([]);
  protected readonly quizAnswers = signal<Record<string, string>>({});
  protected readonly quizPassed = signal(this.readQuizPassed());
  protected readonly quizSubmitted = signal(false);
  private stopObservingVotes?: () => void;

  protected readonly navItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: 'compass-outline' },
    { id: 'story', label: 'Story', icon: 'book-outline' },
    { id: 'people', label: 'People', icon: 'people-outline' },
    { id: 'map', label: 'Map', icon: 'map-outline' },
    { id: 'clues', label: 'Clues', icon: 'search-outline' },
    { id: 'junior', label: 'Junior', icon: 'ribbon-outline' },
    { id: 'references', label: 'Refs', icon: 'trail-sign-outline' }
  ];

  protected readonly quickActions: NavItem[] = [
    { id: 'story', label: 'The Story', icon: 'book-outline' },
    { id: 'people', label: 'The People', icon: 'people-outline' },
    { id: 'map', label: 'Explore', icon: 'compass-outline' },
    { id: 'clues', label: 'The Clues', icon: 'search-outline' },
    { id: 'theories', label: 'Theories', icon: 'sparkles-outline' },
    { id: 'junior', label: 'Jr Historian', icon: 'ribbon-outline' }
  ];

  protected readonly storyCards = [
    {
      title: 'Why England Wanted Colonies',
      year: '1580s',
      body: 'Spain was the strongest European power in the Americas, and England wanted a safer place to trade, repair ships, and challenge Spanish control. A North American colony could also become a base for privateering, which meant English ships could attack Spanish treasure ships.'
    },
    {
      title: 'Sir Walter Raleigh',
      year: '1584',
      body: 'Sir Walter Raleigh received permission from Queen Elizabeth I to sponsor English exploration. He had to stay in England, so he sent others across the Atlantic to scout, settle, and report back.'
    },
    {
      title: 'The First English Voyage',
      year: 'Apr-Jul 1584',
      body: 'Philip Amadas and Arthur Barlowe sailed from England in April and reached the Outer Banks in July. They found Roanoke Island, met Carolina Algonquian people, including Granganimeo, and returned to England with Manteo and Wanchese, whose visit helped build interest in the colony.'
    },
    {
      title: 'The Military Colony',
      year: 'Apr 1585-Jun 1586',
      body: 'The next expedition brought soldiers and sailors under Sir Richard Grenville and Ralph Lane. Storms damaged ships, food was lost, and the English depended more and more on nearby Native communities. Trust broke down after disease, food shortages, and violence. Lane’s men killed the Secotan leader Wingina, also called Pemisapan, and then left with Sir Francis Drake.'
    },
    {
      title: 'The Fifteen Men Left Behind',
      year: '1586',
      body: 'After Lane’s colony left, Grenville returned and found the fort empty. He left a small group of about fifteen soldiers to protect England’s claim. When John White arrived in 1587, the group was gone and only bones were found.'
    },
    {
      title: 'John White’s Colony',
      year: 'Jul 1587',
      body: 'Raleigh tried again with families instead of only soldiers. John White led 118 men, women, and children. Their intended home was near Chesapeake Bay, but the ship captain left them at Roanoke Island instead.'
    },
    {
      title: 'A Killing on the Beach',
      year: 'Jul 1587',
      body: 'Soon after the new colonists arrived, George Howe was attacked and killed while gathering food near the water. White’s group tried to strike back at the people they thought were responsible, but they attacked Croatoan people by mistake. That made trust even harder.'
    },
    {
      title: 'Virginia Dare',
      year: 'Aug 18, 1587',
      body: 'Virginia Dare was born on August 18, 1587, to Eleanor and Ananias Dare. Her birth showed that Roanoke was meant to be a living community with families, not just a military camp.'
    },
    {
      title: 'John White Leaves',
      year: 'Late Aug 1587',
      body: 'The colonists needed supplies and help, so White sailed back to England. Before he left, they agreed that if the group moved, they would carve the name of their destination into a tree or post.'
    },
    {
      title: 'Delayed by War',
      year: '1588-1590',
      body: 'White expected to return quickly, but the Spanish Armada crisis kept English ships close to home. He could not get back to Roanoke until 1590, three years after he left.'
    },
    {
      title: 'A Mystery Is Born',
      year: 'Aug 18, 1590',
      body: 'White found the settlement empty. The clues were CRO carved on a tree and CROATOAN carved on a palisade post. He found no distress cross and no clear signs of a fight, but bad weather stopped him from searching Croatoan Island.'
    },
    {
      title: 'A Map Clue Reappears',
      year: '2012',
      body: 'Researchers studied John White’s old map with special imaging and noticed a hidden mark near Albemarle Sound. It may point to a possible inland site, sometimes called Site X, but it is still evidence to study, not a final answer.'
    }
  ];

  protected readonly people = [
    {
      name: 'John White',
      role: 'Governor and artist',
      detail: 'Led the 1587 colony, returned to England for supplies, and came back in 1590 to find the settlement abandoned.'
    },
    {
      name: 'Virginia Dare',
      role: 'The colony child',
      detail: 'Born on August 18, 1587, to Eleanor and Ananias Dare. Her later fate is unknown.'
    },
    {
      name: 'Eleanor Dare',
      role: 'Colonist and mother',
      detail: 'John White’s daughter and Virginia Dare’s mother, one of the women and families in the 1587 settlement.'
    },
    {
      name: 'Ananias Dare',
      role: 'Colonist and father',
      detail: 'Eleanor Dare’s husband and Virginia Dare’s father. He was one of the assistants chosen to help govern the 1587 colony.'
    },
    {
      name: 'Manteo',
      role: 'Croatoan diplomat',
      detail: 'An important Indigenous ally and interpreter who traveled between the Outer Banks and England.'
    },
    {
      name: 'Wanchese',
      role: 'Roanoke leader',
      detail: 'Traveled to England with Manteo after the 1584 voyage, but later opposed the English as relationships grew worse.'
    },
    {
      name: 'Sir Walter Raleigh',
      role: 'Sponsor',
      detail: 'Received Queen Elizabeth I’s permission to sponsor English colonization, though he did not personally sail to Roanoke.'
    },
    {
      name: 'Ralph Lane',
      role: '1585 governor',
      detail: 'Led the first military colony at Roanoke. His colony struggled with food, supplies, and conflict before leaving in 1586.'
    },
    {
      name: 'Sir Richard Grenville',
      role: 'Expedition leader',
      detail: 'Commanded the 1585 voyage and later left about fifteen soldiers behind after Lane’s colony had departed.'
    },
    {
      name: 'Simon Fernandes',
      role: 'Ship captain',
      detail: 'Captained the 1587 voyage and refused to take White’s colonists farther north to their planned Chesapeake destination.'
    },
    {
      name: 'George Howe',
      role: 'Colonist',
      detail: 'Killed soon after the 1587 colonists arrived, an event that helped push English-Native relations toward more violence.'
    },
    {
      name: 'Thomas Harriot',
      role: 'Scientist and writer',
      detail: 'Studied the land, plants, and people during the earlier Roanoke voyages and later wrote about Virginia.'
    }
  ];

  protected readonly mapPlaces = [
    {
      name: 'England',
      x: 79,
      y: 29,
      caption: 'The voyages began here, shaped by Elizabethan ambition, Atlantic trade, and rivalry with Spain.'
    },
    {
      name: 'Chesapeake Bay',
      x: 18,
      y: 36,
      caption: 'The planned 1587 destination was farther north, near the Chesapeake, but the colonists were left at Roanoke.'
    },
    {
      name: 'Roanoke Island / Fort Raleigh',
      x: 27,
      y: 55,
      caption: 'The 1587 colonists lived on Roanoke Island. Today Fort Raleigh National Historic Site preserves the landscape tied to the English Roanoke ventures.'
    },
    {
      name: 'Croatoan / Hatteras Island',
      x: 29,
      y: 67,
      caption: 'The word CROATOAN pointed toward the Croatoan people and the island now known as Hatteras.'
    }
  ];

  protected readonly clues = [
    {
      title: 'The carving "CRO"',
      body: 'White reported seeing CRO carved into a tree, suggesting a destination or message begun in haste.'
    },
    {
      title: 'The carving "CROATOAN"',
      body: 'CROATOAN was carved on a palisade post, pointing toward the Croatoan people or island.'
    },
    {
      title: 'No distress cross',
      body: 'White had arranged for a cross to signal forced departure or danger. He reported finding no such mark.'
    },
    {
      title: 'Missing fortifications',
      body: 'The settlement looked carefully taken apart rather than destroyed, which supports the idea that people packed up and moved.'
    },
    {
      title: 'Artifacts found later',
      body: 'Later archaeological finds on Hatteras and near Albemarle Sound are debated as possible traces of English movement.'
    }
  ];

  protected readonly theories: Theory[] = [
    {
      key: 'croatoan',
      pickerLabel: 'Assimilation',
      title: 'Assimilation with Croatoans',
      summary: 'The colonists moved south and joined, traded with, or were absorbed by Croatoan communities.',
      supports: ['CROATOAN was left as a direct clue.', 'No distress cross was found.', 'Some later artifacts suggest English contact on Hatteras.'],
      challenges: ['Only a few pieces of evidence survive.', 'Artifacts can travel through trade or later contact.']
    },
    {
      key: 'chesapeake',
      pickerLabel: 'Chesapeake',
      title: 'Move to Chesapeake',
      summary: 'The group tried to reach the planned settlement area near Chesapeake Bay.',
      supports: ['Chesapeake was the intended destination.', 'John White’s map has encouraged modern searches inland.', 'A hidden mark studied in 2012 may point to an inland place near Albemarle Sound.'],
      challenges: ['White found a clue pointing to Croatoan instead.', 'No universally accepted settlement site has been proven.']
    },
    {
      key: 'starvation',
      pickerLabel: 'Disease',
      title: 'Disease and Starvation',
      summary: 'Short supplies, illness, drought, and isolation weakened the colony beyond recovery.',
      supports: ['Earlier Roanoke efforts struggled with supplies.', 'White was delayed for three years by war with Spain.'],
      challenges: ['The orderly clues imply relocation.', 'No mass grave or clear disaster scene was found at the site.']
    },
    {
      key: 'attack',
      pickerLabel: 'Attack',
      title: 'Attack by Other Tribes',
      summary: 'The colonists may have been attacked during regional conflict.',
      supports: ['The first settlement damaged relations with some neighboring communities.', 'Later English reports repeated massacre rumors.'],
      challenges: ['No distress cross was found.', 'The settlement appeared taken down rather than burned or wrecked.']
    },
    {
      key: 'spanish',
      pickerLabel: 'Spanish',
      title: 'Spanish Involvement',
      summary: 'Spain may have discovered or targeted the colony during imperial conflict.',
      supports: ['England and Spain were rivals, and the Armada delayed White.', 'Spanish officials monitored English colonial attempts.'],
      challenges: ['There is no clear record of a Spanish attack on the 1587 colony.', 'The CROATOAN clue points somewhere local.']
    }
  ];

  protected readonly activities = [
    { id: 'badge-story', label: 'Read the story timeline', badge: 'Story Seeker', section: 'story' as SectionId },
    { id: 'badge-map', label: 'Tap every map location', badge: 'Map Scout', section: 'map' as SectionId },
    { id: 'badge-clues', label: 'Review all five clues', badge: 'Clue Keeper', section: 'clues' as SectionId },
    { id: 'badge-vote', label: 'Vote for a theory', badge: 'Case Builder', section: 'theories' as SectionId }
  ];

  protected readonly quizQuestions: QuizQuestion[] = [
    {
      id: 'croatoan',
      prompt: 'What word did John White find carved on a palisade post?',
      choices: ['CROATOAN', 'VIRGINIA', 'RALEIGH'],
      answer: 'CROATOAN'
    },
    {
      id: 'distress',
      prompt: 'What sign did White not find, which suggested the colonists may not have left in danger?',
      choices: ['A distress cross', 'A ship anchor', 'A broken compass'],
      answer: 'A distress cross'
    },
    {
      id: 'hatteras',
      prompt: 'Croatoan is connected with which place today?',
      choices: ['Hatteras Island', 'England', 'Chesapeake Bay'],
      answer: 'Hatteras Island'
    }
  ];

  protected readonly references = [
    {
      title: 'National Park Service: The Lost Colony',
      url: 'https://www.nps.gov/fora/learn/historyculture/the-lost-colony.htm',
      note: 'Official Fort Raleigh overview, timeline, people, clues, and theories.'
    },
    {
      title: 'National Park Service: 1584 First English Voyage',
      url: 'https://www.nps.gov/fora/learn/historyculture/1584-the-first-english-voyage.htm',
      note: 'Used for England’s goals, Raleigh’s charter, the scouting voyage, and Manteo and Wanchese traveling to England.'
    },
    {
      title: 'National Park Service: 1585 Military Colony',
      url: 'https://www.nps.gov/fora/learn/historyculture/1585-the-military-colony.htm',
      note: 'Used for the 1585 expedition, supply problems, Ralph Lane’s colony, conflict, and the departure with Sir Francis Drake.'
    },
    {
      title: 'National Park Service: 1587 Lost Colony',
      url: 'https://www.nps.gov/fora/learn/historyculture/1587-the-lost-colony.htm',
      note: 'Used for John White’s family colony, the Chesapeake plan, Virginia Dare, the earlier garrison, George Howe’s killing, the mistaken Croatoan attack, and the agreement to carve a destination.'
    },
    {
      title: 'National Park Service: 1590 Voyage',
      url: 'https://www.nps.gov/fora/learn/historyculture/1590-voyage.htm',
      note: 'Used for White’s delayed return, the Spanish Armada context, CRO and CROATOAN, and the missing distress signs.'
    },
    {
      title: 'National Park Service: Fort Raleigh National Historic Site',
      url: 'https://www.nps.gov/fora/index.htm',
      note: 'Visitor-site context for Fort Raleigh and Roanoke Island.'
    },
    {
      title: 'Encyclopaedia Britannica: Lost Colony',
      url: 'https://www.britannica.com/place/Lost-Colony',
      note: 'Concise cross-check for Raleigh, John White, Virginia Dare, CRO/CROATOAN, and major theories.'
    },
    {
      title: 'NCpedia: Lost Colony',
      url: 'https://www.ncpedia.org/lost-colony',
      note: 'North Carolina historical background and educational framing.'
    },
    {
      title: 'First Colony Foundation: The Roanoke Colonies',
      url: 'https://www.firstcolonyfoundation.org/',
      note: 'Archaeology-focused research organization connected to Roanoke investigations.'
    },
    {
      title: 'The New Yorker: The Earliest American Heroine',
      url: 'https://www.newyorker.com/news/news-desk/the-earliest-american-heroine',
      note: 'Used for the modern 2012 John White map clue, British Museum imaging, and Site X context.'
    }
  ];

  protected readonly activeTheory = computed(() => {
    return this.theories.find((theory) => theory.key === this.selectedTheory()) ?? this.theories[0];
  });

  protected readonly totalVotes = computed(() =>
  Object.values(this.voteResults()).reduce(
    (total, count) => total + count,
    0
  )
);

  protected readonly currentPlace = computed(() => {
    return this.mapPlaces.find((place) => place.name === this.selectedMapPlace()) ?? this.mapPlaces[2];
  });

  protected readonly juniorProgress = computed(() => this.completedActivities().length / this.activities.length);
  protected readonly allActivitiesComplete = computed(() => this.completedActivities().length === this.activities.length);
  protected readonly quizScore = computed(() => {
    const answers = this.quizAnswers();
    return this.quizQuestions.filter((question) => answers[question.id] === question.answer).length;
  });

  constructor() {
    addIcons({
      bookOutline,
      checkmarkCircleOutline,
      compassOutline,
      mapOutline,
      peopleOutline,
      ribbonOutline,
      searchOutline,
      shieldCheckmarkOutline,
      sparklesOutline,
      trailSignOutline,
      trophyOutline
    });

    void this.initializeVoting();
  }

  ngOnDestroy(): void {
    this.stopObservingVotes?.();
  }

  protected setSection(section: SectionId): void {
    this.activeSection.set(section);
    if (section === 'story') {
      this.completeActivity('badge-story');
    }
    if (section === 'clues') {
      this.completeActivity('badge-clues');
    }
  }

  protected chooseMapPlace(name: string): void {
    this.selectedMapPlace.set(name);
    const viewed = this.viewedMapPlaces();
    const next = viewed.includes(name) ? viewed : [...viewed, name];
    this.viewedMapPlaces.set(next);
    if (next.length === this.mapPlaces.length) {
      this.completeActivity('badge-map');
    }
  }

  protected selectTheory(key: TheoryKey): void {
    this.selectedTheory.set(key);
  }

  protected async castVote(key: TheoryKey): Promise<void> {
    if (this.votePending()) {
      return;
    }

    this.votePending.set(true);
    this.voteError.set('');
    try {
      await castTheoryVote(key);
      this.completeActivity('badge-vote');
    } catch (error) {
      console.error('Unable to save theory vote', error);
      this.voteError.set(theoryVotingErrorMessage(error));
    } finally {
      this.votePending.set(false);
    }
  }

  protected voteCount(key: TheoryKey): number {
    return this.voteResults()[key];
  }

  protected votePercentage(key: TheoryKey): number {
    const total = this.totalVotes();
    return total ? Math.round((this.voteCount(key) / total) * 100) : 0;
  }

  protected completeActivity(id: string): void {
    const current = this.completedActivities();
    if (current.includes(id)) {
      return;
    }

    const next = [...current, id];
    this.completedActivities.set(next);
    localStorage.setItem('roanoke-junior-progress', JSON.stringify(next));
  }

  protected isComplete(id: string): boolean {
    return this.completedActivities().includes(id);
  }

  protected answerQuiz(questionId: string, choice: string): void {
    this.quizAnswers.set({
      ...this.quizAnswers(),
      [questionId]: choice
    });
    this.quizSubmitted.set(false);
  }

  protected isQuizChoiceSelected(questionId: string, choice: string): boolean {
    return this.quizAnswers()[questionId] === choice;
  }

  protected submitQuiz(): void {
    this.quizSubmitted.set(true);
    if (this.quizScore() === this.quizQuestions.length) {
      this.quizPassed.set(true);
      localStorage.setItem('roanoke-quiz-passed', 'true');
      this.setSection('junior');
    }
  }

  protected canSubmitQuiz(): boolean {
    return this.quizQuestions.every((question) => Boolean(this.quizAnswers()[question.id]));
  }

  private async initializeVoting(): Promise<void> {
    try {
      this.stopObservingVotes = await observeTheoryVotes(
        (vote) => this.vote.set(vote),
        (results) => this.voteResults.set(results),
        (error) => {
          console.error('Unable to load theory votes', error);
          this.voteError.set(theoryVotingErrorMessage(error));
        }
      );
    } catch (error) {
      console.error('Unable to initialize theory voting', error);
      this.voteError.set(theoryVotingErrorMessage(error));
    }
  }

  private readQuizPassed(): boolean {
    return localStorage.getItem('roanoke-quiz-passed') === 'true';
  }

  private readCompletedActivities(): string[] {
    try {
      const stored = localStorage.getItem('roanoke-junior-progress');
      return stored ? JSON.parse(stored) as string[] : [];
    } catch {
      return [];
    }
  }

  private readInitialSection(): SectionId {
    const previewSection = new URLSearchParams(window.location.search).get('preview');
    const validSections: SectionId[] = ['home', 'story', 'people', 'map', 'clues', 'theories', 'junior', 'quiz', 'references'];

    return validSections.includes(previewSection as SectionId) ? previewSection as SectionId : 'home';
  }
}
