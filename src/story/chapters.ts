/**
 * The story spine. Every page of the brief answers three questions; the home page is built as
 * chapters that each belong to one of them. Add chapters here first, then build them.
 *
 * 1 · What is GMC?   2 · What's happening now?   3 · How do I take part?
 */
export const QUESTIONS = {
  1: 'What is GMC?',
  2: "What's happening now?",
  3: 'How do I take part?',
} as const

export type QuestionId = keyof typeof QUESTIONS

export const CHAPTERS = [
  { id: 'arrival', question: 1, label: 'Arrival' },
  { id: 'what', question: 1, label: 'The city' },
  { id: 'happening', question: 2, label: 'Happening now' },
  { id: 'take-part', question: 3, label: 'Take part' },
] as const satisfies ReadonlyArray<{ id: string; question: QuestionId; label: string }>

export type ChapterId = (typeof CHAPTERS)[number]['id']
