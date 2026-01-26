import type { Word } from '@/typings'
import { dictionaries } from '@/resources/dictionary'
import { db } from './db'

export async function wordListFetcher(url: string): Promise<Word[]> {
  // Handle error book collection URL
  if (url.startsWith('error-book://')) {
    const wordNames = url.replace('error-book://', '').split(',').filter(Boolean)
    if (wordNames.length === 0) return []

    // Get error records to find which dictionaries contain these words
    const errorRecords = await db.wordRecords
      .where('wrongCount')
      .above(0)
      .toArray()

    // Group words by dictionary
    const wordsByDict = new Map<string, Set<string>>()
    errorRecords.forEach((record) => {
      if (wordNames.includes(record.word)) {
        if (!wordsByDict.has(record.dict)) {
          wordsByDict.set(record.dict, new Set())
        }
        wordsByDict.get(record.dict)!.add(record.word)
      }
    })

    // Fetch word lists from all relevant dictionaries
    const allWords: Word[] = []
    const processedWords = new Set<string>()

    for (const [dictId, wordSet] of wordsByDict.entries()) {
      // Find dictionary info
      const dict = dictionaries.find((d) => d.id === dictId)
      if (!dict) continue

      try {
        // Fetch word list from dictionary
        const URL_PREFIX: string = REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner' : ''
        const response = await fetch(URL_PREFIX + dict.url)
        const wordList: Word[] = await response.json()
        
        // Add words that are in error book
        wordList.forEach((word) => {
          if (wordSet.has(word.name) && !processedWords.has(word.name)) {
            allWords.push(word)
            processedWords.add(word.name)
          }
        })
      } catch (error) {
        console.error(`Failed to fetch words from dictionary ${dictId}:`, error)
      }
    }

    // Sort by word name to maintain consistency
    return allWords.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Original logic for regular URLs
  const URL_PREFIX: string = REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner' : ''
  const response = await fetch(URL_PREFIX + url)
  const words: Word[] = await response.json()
  return words
}
