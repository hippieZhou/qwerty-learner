import type { Dictionary, DictionaryResource } from '@/typings/index'
import { calcChapterCount } from '@/utils'

const chinaExam: DictionaryResource[] = [
  {
    id: 'cet4',
    name: 'CET-4',
    description: '大学英语四级词库',
    category: '中国考试',
    tags: ['大学英语'],
    url: '/dicts/CET4_T.json',
    length: 2607,
    language: 'en',
    languageCategory: 'en',
  },
]
// 国际考试
const internationalExam: DictionaryResource[] = [
  {
    id: 'ieltsWang3',
    name: '雅思wang C3',
    description: '雅思听力特别名词语料库',
    category: '国际考试',
    tags: ['IELTS'],
    url: '/dicts/IELTS_WANG_3.json',
    length: 1135,
    language: 'en',
    languageCategory: 'en',
  },
  {
    id: 'ieltsWang4',
    name: '雅思wang C4',
    description: '雅思听力形容词副词语料库',
    category: '国际考试',
    tags: ['IELTS'],
    url: '/dicts/IELTS_WANG_4.json',
    length: 346,
    language: 'en',
    languageCategory: 'en',
  },
  {
    id: 'ieltsWang5',
    name: '雅思wang C5',
    description: '吞音连读混合训练语料库',
    category: '国际考试',
    tags: ['IELTS'],
    url: '/dicts/IELTS_WANG_5.json',
    length: 1569,
    language: 'en',
    languageCategory: 'en',
  },
  {
    id: 'ieltsWang11',
    name: '雅思wang C11',
    description: '综合测试',
    category: '国际考试',
    tags: ['IELTS'],
    url: '/dicts/IELTS_WANG_11.json',
    length: 1738,
    language: 'en',
    languageCategory: 'en',
  },
]

/**
 * Built-in dictionaries in an array.
 * Why arrays? Because it keeps the order across browsers.
 */
export const dictionaryResources: DictionaryResource[] = [
  ...chinaExam,
  ...internationalExam,

  // {
  //   id: 'zhtest',
  //   name: '中文测试',
  //   description: '中文测试词库',
  //   category: '测试',
  //   url: '/dicts/chinese_test.json',
  //   length: 27,
  //   language: 'zh',
  // },
  // {
  //   id: 'jptest',
  //   name: '日文测试',
  //   description: '日文测试词库',
  //   category: '测试',
  //   url: '/dicts/japanese_test.json',
  //   length: 20,
  //   language: 'ja',
  // },
]

export const dictionaries: Dictionary[] = dictionaryResources.map((resource) => ({
  ...resource,
  chapterCount: calcChapterCount(resource.length),
}))

/**
 * An object-map from dictionary IDs to dictionary themselves.
 */
export const idDictionaryMap: Record<string, Dictionary> = Object.fromEntries(dictionaries.map((dict) => [dict.id, dict]))
