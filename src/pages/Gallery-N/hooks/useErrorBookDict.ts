import type { Dictionary } from '@/typings'
import { calcChapterCount } from '@/utils'
import { db } from '@/utils/db'
import useSWR from 'swr'

const ERROR_BOOK_DICT_ID = 'error-book-collection'

/**
 * Hook to get error book dictionary if there are error records
 */
export function useErrorBookDict() {
  const { data: errorBookDict, isLoading } = useSWR('error-book-dict', async () => {
    const records = await db.wordRecords.where('wrongCount').above(0).toArray()
    
    if (records.length === 0) {
      return null
    }

    // Get unique words from error records
    const uniqueWords = new Set<string>()
    records.forEach((record) => {
      uniqueWords.add(record.word)
    })

    return {
      id: ERROR_BOOK_DICT_ID,
      name: '错题合集',
      description: '我的错题本中的单词合集',
      category: '我的学习',
      tags: ['错题本', '复习'],
      url: `error-book://${Array.from(uniqueWords).join(',')}`, // Special URL format
      length: uniqueWords.size,
      language: 'en' as const,
      languageCategory: 'en' as const,
      chapterCount: calcChapterCount(uniqueWords.size),
    } as Dictionary
  })

  return { errorBookDict, isLoading, hasErrors: !!errorBookDict }
}

export { ERROR_BOOK_DICT_ID }
