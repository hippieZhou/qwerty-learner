/**
 * 欧路词典生词本 API 类型定义
 */

/**
 * 支持的语言类型
 */
export type Language = 'en' | 'fr' | 'de' | 'es'

/**
 * 生词本信息
 */
export interface StudyListCategory {
  /** 生词本ID */
  id: string
  /** 语言 */
  language: Language
  /** 生词本名称 */
  name: string
}

/**
 * 单词信息
 */
export interface WordInfo {
  /** 单词 */
  word: string
  /** 音标 */
  phon?: string
  /** 释义 */
  exp?: string
  /** 添加时间 */
  add_time?: string
  /** 单词等级 */
  star?: number
  /** 单词所在语境 */
  context_line?: string
  /** 单词所在分组 */
  category_ids?: string[] | number[]
}

/**
 * API 响应基础结构
 */
export interface ApiResponse<T = any> {
  /** 数据 */
  data?: T
  /** 提示信息 */
  message?: string
}

/**
 * 获取生词本列表响应
 */
export type GetCategoriesResponse = ApiResponse<StudyListCategory[]>

/**
 * 创建生词本响应
 */
export type CreateCategoryResponse = ApiResponse<StudyListCategory>

/**
 * 获取单词列表响应
 */
export type GetWordsResponse = ApiResponse<WordInfo[]>

/**
 * 查询单个单词响应
 */
export type GetWordResponse = WordInfo

/**
 * 创建生词本请求参数
 */
export interface CreateCategoryParams {
  /** 语言 */
  language: Language
  /** 生词本名称 */
  name: string
}

/**
 * 重命名生词本请求参数
 */
export interface RenameCategoryParams {
  /** 生词本ID */
  id: string
  /** 语言 */
  language: Language
  /** 新的生词本名称 */
  name: string
}

/**
 * 删除生词本请求参数
 */
export interface DeleteCategoryParams {
  /** 生词本ID */
  id: string
  /** 语言 */
  language: Language
  /** 生词本名称 */
  name: string
}

/**
 * 获取单词列表请求参数
 */
export interface GetWordsParams {
  /** 生词本ID */
  category_id: string
  /** 语言 */
  language: Language
  /** 分页页数 */
  page?: number
  /** 分页单词数量 */
  page_size?: number
}

/**
 * 添加单词到生词本请求参数
 */
export interface AddWordsParams {
  /** 生词本ID（已废弃，建议使用 category_id） */
  id?: string
  /** 生词本ID */
  category_id: string
  /** 语言 */
  language: Language
  /** 单词数组 */
  words: string[]
}

/**
 * 删除生词本中的单词请求参数
 */
export interface DeleteWordsParams {
  /** 生词本ID（已废弃，建议使用 category_id） */
  id?: string
  /** 生词本ID */
  category_id: string | number
  /** 语言 */
  language: Language
  /** 单词数组 */
  words: string[]
}

/**
 * 添加单个单词请求参数
 */
export interface AddWordParams {
  /** 语言 */
  language: Language
  /** 单词 */
  word: string
  /** 等级 */
  star?: number
  /** 语境 */
  context_line?: string
  /** 分组列表 */
  category_ids?: number[]
}

/**
 * 查询单个单词请求参数
 */
export interface GetWordParams {
  /** 语言 */
  language: Language
  /** 单词 */
  word: string
}

/**
 * API 客户端配置
 */
export interface EudicApiConfig {
  /** API 基础地址 */
  baseURL?: string
  /** 授权令牌 */
  authorization?: string
  /** 用户代理 */
  userAgent?: string
}
