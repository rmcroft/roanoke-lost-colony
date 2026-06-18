import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import {
  IonApp,
  IonBadge,
  IonContent,
  IonHeader,
  IonIcon,
  IonProgressBar,
  IonSegment,
  IonSegmentButton,
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

type SectionId = 'home' | 'story' | 'people' | 'map' | 'clues' | 'theories' | 'junior' | 'quiz' | 'references';
type TheoryKey = 'croatoan' | 'chesapeake' | 'starvation' | 'attack' | 'spanish';

interface NavItem {
  id: SectionId;
  label: string;
  icon: string;
}

interface Theory {
  key: TheoryKey;
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
    IonBadge,
    IonContent,
    IonHeader,
    IonIcon,
    IonProgressBar,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  protected readonly activeSection = signal<SectionId>('home');
  protected readonly selectedMapPlace = signal('Roanoke Island');
  protected readonly selectedTheory = signal<TheoryKey>('croatoan');
  protected readonly vote = signal<TheoryKey | null>(this.readTheoryVote());
  protected readonly completedActivities = signal<string[]>(this.readCompletedActivities());
  protected readonly viewedMapPlaces = signal<string[]>([]);
  protected readonly quizAnswers = signal<Record<string, string>>({});
  protected readonly quizPassed = signal(this.readQuizPassed());
  protected readonly quizSubmitted = signal(false);

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
    { id: 'junior', label: 'Kid Mode', icon: 'ribbon-outline' }
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
      year: '1584',
      body: 'Philip Amadas and Arthur Barlowe reached the Outer Banks and found Roanoke Island. They met Carolina Algonquian people, including Granganimeo, and returned to England with Manteo and Wanchese, whose visit helped build interest in the colony.'
    },
    {
      title: 'The Military Colony',
      year: '1585-1586',
      body: 'The next expedition brought soldiers and sailors under Sir Richard Grenville and Ralph Lane. Storms damaged ships, food was lost, and the English depended more and more on nearby Native communities. Trust broke down, violence followed, and Lane left with Sir Francis Drake.'
    },
    {
      title: 'John White’s Colony',
      year: '1587',
      body: 'Raleigh tried again with families instead of only soldiers. John White led 118 men, women, and children. Their intended home was near Chesapeake Bay, but the ship captain left them at Roanoke Island instead.'
    },
    {
      title: 'Virginia Dare',
      year: '1587',
      body: 'Virginia Dare was born on August 18, 1587, to Eleanor and Ananias Dare. Her birth showed that Roanoke was meant to be a living community with families, not just a military camp.'
    },
    {
      title: 'John White Leaves',
      year: '1587',
      body: 'The colonists needed supplies and help, so White sailed back to England. Before he left, they agreed that if the group moved, they would carve the name of their destination into a tree or post.'
    },
    {
      title: 'Delayed by War',
      year: '1588-1590',
      body: 'White expected to return quickly, but the Spanish Armada crisis kept English ships close to home. He could not get back to Roanoke until 1590, three years after he left.'
    },
    {
      title: 'A Mystery Is Born',
      year: '1590',
      body: 'White found the settlement empty. The clues were CRO carved on a tree and CROATOAN carved on a palisade post. He found no distress cross and no clear signs of a fight, but bad weather stopped him from searching Croatoan Island.'
    }
  ];

  protected readonly people = [
    {
      name: 'John White',
      role: 'Governor and artist',
      detail: 'Led the 1587 colony, returned to England for supplies, and came back in 1590 to find the settlement abandoned.',
      badge: 'Witness'
    },
    {
      name: 'Virginia Dare',
      role: 'The colony child',
      detail: 'Born on August 18, 1587, to Eleanor and Ananias Dare. Her later fate is unknown.',
      badge: 'First'
    },
    {
      name: 'Eleanor Dare',
      role: 'Colonist and mother',
      detail: 'John White’s daughter and Virginia Dare’s mother, one of the women and families in the 1587 settlement.',
      badge: 'Family'
    },
    {
      name: 'Manteo',
      role: 'Croatoan diplomat',
      detail: 'An important Indigenous ally and interpreter who traveled between the Outer Banks and England.',
      badge: 'Bridge'
    }
  ];

  protected readonly mapPlaces = [
    {
      name: 'England',
      x: 18,
      y: 35,
      caption: 'The voyages began here, shaped by Elizabethan ambition, Atlantic trade, and rivalry with Spain.'
    },
    {
      name: 'Chesapeake Bay',
      x: 69,
      y: 42,
      caption: 'The planned 1587 destination was farther north, near the Chesapeake, but the colonists were left at Roanoke.'
    },
    {
      name: 'Fort Raleigh National Historic Site',
      x: 77,
      y: 55,
      caption: 'Today this NPS site preserves the landscape tied to the English Roanoke ventures.'
    },
    {
      name: 'Roanoke Island',
      x: 80,
      y: 61,
      caption: 'The 1587 colonists lived here before John White returned in 1590 to find the settlement empty.'
    },
    {
      name: 'Croatoan / Hatteras Island',
      x: 84,
      y: 70,
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
      title: 'Assimilation with Croatoans',
      summary: 'The colonists moved south and joined, traded with, or were absorbed by Croatoan communities.',
      supports: ['CROATOAN was left as a direct clue.', 'No distress cross was found.', 'Some later artifacts suggest English contact on Hatteras.'],
      challenges: ['The surviving evidence is fragmentary.', 'Artifacts can travel through trade or later contact.']
    },
    {
      key: 'chesapeake',
      title: 'Move to Chesapeake',
      summary: 'The group tried to reach the planned settlement area near Chesapeake Bay.',
      supports: ['Chesapeake was the intended destination.', 'John White’s map has encouraged modern searches inland.'],
      challenges: ['White found a clue pointing to Croatoan instead.', 'No universally accepted settlement site has been proven.']
    },
    {
      key: 'starvation',
      title: 'Disease and Starvation',
      summary: 'Short supplies, illness, drought, and isolation weakened the colony beyond recovery.',
      supports: ['Earlier Roanoke efforts struggled with supplies.', 'White was delayed for three years by war with Spain.'],
      challenges: ['The orderly clues imply relocation.', 'No mass grave or clear disaster scene was found at the site.']
    },
    {
      key: 'attack',
      title: 'Attack by Other Tribes',
      summary: 'The colonists may have been attacked during regional conflict.',
      supports: ['The first settlement damaged relations with some neighboring communities.', 'Later English reports repeated massacre rumors.'],
      challenges: ['No distress cross was found.', 'The settlement appeared taken down rather than burned or wrecked.']
    },
    {
      key: 'spanish',
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
      note: 'Used for John White’s family colony, the Chesapeake plan, Virginia Dare, and the agreement to carve a destination.'
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
    }
  ];

  protected readonly activeTheory = computed(() => {
    return this.theories.find((theory) => theory.key === this.selectedTheory()) ?? this.theories[0];
  });

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

  protected castVote(key: TheoryKey): void {
    this.vote.set(key);
    localStorage.setItem('roanoke-theory-vote', key);
    this.completeActivity('badge-vote');
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

  private readTheoryVote(): TheoryKey | null {
    const value = localStorage.getItem('roanoke-theory-vote') as TheoryKey | null;
    return value && ['croatoan', 'chesapeake', 'starvation', 'attack', 'spanish'].includes(value) ? value : null;
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
}
