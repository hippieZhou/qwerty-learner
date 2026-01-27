import { db } from '@/utils/db'
import type { IWordRecord } from '@/utils/db/record'
import { supabaseClient, supabaseServiceClient } from './client'
import type { SupabaseClient as SupabaseJsClient } from '@supabase/supabase-js'

/**
 * 错误单词同步配置
 */
export interface ErrorWordsSyncConfig {
  /** 用户ID，用于区分不同用户的数据（可选，如果使用服务角色密钥且不需要区分用户，可以不提供） */
  userId?: string
  /** Supabase 表名，默认为 'error_words' */
  tableName?: string
  /** 是否使用服务角色密钥（可选） */
  useServiceKey?: boolean
}

/**
 * 上传到 Supabase 的错误单词记录格式
 */
export interface SupabaseErrorWordRecord {
  /** 用户ID（可选，使用 Direct Connect 时可以不提供） */
  user_id?: string
  word: string
  dict: string
  chapter: number | null
  time_stamp: number
  timing: string // JSON 字符串
  wrong_count: number
  mistakes: string // JSON 字符串
  updated_at?: string
  device_id?: string
}

/**
 * 同步结果
 */
export interface SyncResult {
  /** 上传的记录数 */
  uploaded: number
  /** 下载的记录数 */
  downloaded: number
  /** 合并的记录数 */
  merged: number
  /** 错误信息列表（可选） */
  errors?: string[]
}

/**
 * 错误单词同步客户端
 */
export class ErrorWordsSyncClient {
  private userId?: string
  private tableName: string
  private useServiceKey: boolean
  private client: SupabaseJsClient

  constructor(config: ErrorWordsSyncConfig) {
    this.userId = config.userId
    this.tableName = config.tableName || 'error_words'
    this.useServiceKey = config.useServiceKey || false
    
    // 如果配置了使用服务密钥，优先使用服务客户端（可以绕过 RLS）
    if (this.useServiceKey && supabaseServiceClient) {
      this.client = supabaseServiceClient
    } else if (this.useServiceKey && !supabaseServiceClient) {
      // 如果配置了使用服务密钥但服务客户端不存在，抛出错误
      throw new Error(
        'Service key is required but not configured. Please set VITE_SUPABASE_SERVICE_KEY in your .env file.'
      )
    } else {
      // 使用匿名密钥客户端（受 RLS 限制）
      this.client = supabaseClient
    }
  }

  /**
   * 更新用户ID
   */
  setUserId(userId?: string) {
    this.userId = userId
  }

  /**
   * 将本地错误单词记录转换为 Supabase 格式
   */
  private transformToSupabase(record: IWordRecord): SupabaseErrorWordRecord {
    const recordData: SupabaseErrorWordRecord = {
      word: record.word,
      dict: record.dict,
      chapter: record.chapter,
      time_stamp: record.timeStamp,
      timing: JSON.stringify(record.timing),
      wrong_count: record.wrongCount,
      mistakes: JSON.stringify(record.mistakes),
      updated_at: new Date().toISOString(),
    }
    // 如果提供了 userId，则添加 user_id 字段
    // 注意：如果数据库表要求 user_id 不为空，确保总是提供 userId
    if (this.userId) {
      recordData.user_id = this.userId
    } else {
      // 如果 userId 未设置，生成一个默认值（避免数据库 NOT NULL 约束错误）
      // 这通常不应该发生，因为 getOrCreateUserId() 应该总是返回一个值
      recordData.user_id = `default-${Date.now()}`
    }
    return recordData
  }

  /**
   * 将 Supabase 格式转换为本地错误单词记录
   */
  private transformFromSupabase(record: SupabaseErrorWordRecord): IWordRecord {
    return {
      word: record.word,
      dict: record.dict,
      chapter: record.chapter,
      timeStamp: record.time_stamp,
      timing: JSON.parse(record.timing),
      wrongCount: record.wrong_count,
      mistakes: JSON.parse(record.mistakes),
    }
  }

  /**
   * 上传本地所有错误单词到 Supabase
   * 如果远端存在相同的单词（基于 word），则更新；否则新增
   */
  async uploadErrorWords(): Promise<SyncResult> {
    const errors: string[] = []
    let uploaded = 0
    let updated = 0

    try {
      // 获取本地所有错误单词记录（wrongCount > 0）
      const localRecords = await db.wordRecords
        .where('wrongCount')
        .above(0)
        .toArray()

      if (localRecords.length === 0) {
        return { uploaded: 0, downloaded: 0, merged: 0 }
      }

      // 转换为 Supabase 格式
      const supabaseRecords = localRecords.map((record) =>
        this.transformToSupabase(record)
      )

      // 获取所有唯一的单词列表
      const uniqueWords = Array.from(new Set(supabaseRecords.map((r) => r.word)))

      // 查询远端可能存在的记录（只根据 word 判断）
      let query = this.client.from(this.tableName).select('word').in('word', uniqueWords)
      
      if (this.userId) {
        // 如果提供了 userId，只查询该用户的记录
        query = query.eq('user_id', this.userId)
      }

      const { data: existingRecords, error: queryError } = await query

      if (queryError) {
        errors.push(`Query existing records failed: ${queryError.message}`)
        // 如果查询失败，回退到直接插入（可能会因为唯一约束失败）
        return {
          uploaded: 0,
          downloaded: 0,
          merged: 0,
          errors,
        }
      }

      // 创建远端记录的唯一单词集合
      const existingWords = new Set<string>()
      if (existingRecords) {
        existingRecords.forEach((record: any) => {
          existingWords.add(record.word)
        })
      }

      // 分离需要更新和插入的记录
      const recordsToUpdate: SupabaseErrorWordRecord[] = []
      const recordsToInsert: SupabaseErrorWordRecord[] = []

      supabaseRecords.forEach((record) => {
        if (existingWords.has(record.word)) {
          recordsToUpdate.push(record)
        } else {
          recordsToInsert.push(record)
        }
      })

      // 批量插入新记录
      if (recordsToInsert.length > 0) {
        const batchSize = 100
        for (let i = 0; i < recordsToInsert.length; i += batchSize) {
          const batch = recordsToInsert.slice(i, i + batchSize)
          const { error: insertError } = await this.client
            .from(this.tableName)
            .insert(batch)
            .select()

          if (insertError) {
            errors.push(
              `Insert batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`
            )
          } else {
            uploaded += batch.length
          }
        }
      }

      // 批量更新已存在的记录（根据 word 匹配）
      if (recordsToUpdate.length > 0) {
        const batchSize = 100
        for (let i = 0; i < recordsToUpdate.length; i += batchSize) {
          const batch = recordsToUpdate.slice(i, i + batchSize)
          
          // 对每条记录单独更新（根据 word 匹配）
          for (const record of batch) {
            let updateQuery = this.client
              .from(this.tableName)
              .update({
                timing: record.timing,
                wrong_count: record.wrong_count,
                mistakes: record.mistakes,
                updated_at: record.updated_at,
                dict: record.dict,
                chapter: record.chapter,
                time_stamp: record.time_stamp,
              })
              .eq('word', record.word)
            
            // 如果提供了 userId，只更新该用户的记录
            if (record.user_id) {
              updateQuery = updateQuery.eq('user_id', record.user_id)
            }

            const { error: updateError } = await updateQuery

            if (updateError) {
              errors.push(
                `Update record ${record.word}: ${updateError.message}`
              )
            } else {
              updated++
            }
          }
        }
      }

      return {
        uploaded,
        downloaded: 0,
        merged: updated,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (error) {
      errors.push(
        `Upload failed: ${error instanceof Error ? error.message : String(error)}`
      )
      return {
        uploaded: 0,
        downloaded: 0,
        merged: 0,
        errors,
      }
    }
  }

  /**
   * 从 Supabase 下载错误单词到本地
   * 完全覆盖本地数据：先删除本地所有错误单词记录，然后插入云端数据
   */
  async downloadErrorWords(): Promise<SyncResult> {
    const errors: string[] = []
    let downloaded = 0

    try {
      // 构建查询
      let query = this.client.from(this.tableName).select('*')

      // 如果提供了 userId，添加过滤条件
      if (this.userId) {
        query = query.eq('user_id', this.userId)
      }

      // 按时间戳降序排列
      query = query.order('time_stamp', { ascending: false })

      const { data: supabaseRecords, error } = await query

      if (error) {
        errors.push(`Download failed: ${error.message}`)
        return {
          uploaded: 0,
          downloaded: 0,
          merged: 0,
          errors,
        }
      }

      // 先删除本地所有错误单词记录（完全覆盖）
      try {
        const localRecords = await db.wordRecords
          .where('wrongCount')
          .above(0)
          .toArray()
        
        // 批量删除本地记录
        const deletePromises = localRecords.map((record) =>
          db.wordRecords.delete((record as any).id as number)
        )
        await Promise.all(deletePromises)
      } catch (deleteError) {
        errors.push(
          `Failed to clear local records: ${
            deleteError instanceof Error ? deleteError.message : String(deleteError)
          }`
        )
        // 即使删除失败，也继续尝试插入云端数据
      }

      // 如果没有云端记录，直接返回
      if (!supabaseRecords || supabaseRecords.length === 0) {
        return { uploaded: 0, downloaded: 0, merged: 0 }
      }

      // 转换云端记录格式并批量插入
      const localRecords = supabaseRecords.map((record) =>
        this.transformFromSupabase(record as SupabaseErrorWordRecord)
      )

      // 批量插入（每次最多 100 条）
      const batchSize = 100
      for (let i = 0; i < localRecords.length; i += batchSize) {
        const batch = localRecords.slice(i, i + batchSize)
        try {
          await db.wordRecords.bulkAdd(batch)
          downloaded += batch.length
        } catch (addError) {
          // 如果批量插入失败，尝试逐个插入
          for (const record of batch) {
            try {
              await db.wordRecords.add(record)
              downloaded++
            } catch (singleAddError) {
              errors.push(
                `Failed to add record for word "${record.word}": ${
                  singleAddError instanceof Error ? singleAddError.message : String(singleAddError)
                }`
              )
            }
          }
        }
      }

      return {
        uploaded: 0,
        downloaded,
        merged: 0,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (error) {
      errors.push(
        `Download failed: ${error instanceof Error ? error.message : String(error)}`
      )
      return {
        uploaded: 0,
        downloaded: 0,
        merged: 0,
        errors,
      }
    }
  }

  /**
   * 删除单个错误单词
   */
  async deleteErrorWord(word: string, dict: string, chapter: number | null, timeStamp: number): Promise<boolean> {
    try {
      let query = this.client
        .from(this.tableName)
        .delete()
        .eq('word', word)
        .eq('dict', dict)
        .eq('time_stamp', timeStamp)

      if (chapter !== null) {
        query = query.eq('chapter', chapter)
      } else {
        query = query.is('chapter', null)
      }

      // 如果提供了 userId，添加过滤条件
      if (this.userId) {
        query = query.eq('user_id', this.userId)
      }

      const { error } = await query

      if (error) {
        console.error('Delete error word failed:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Delete error word failed:', error)
      return false
    }
  }

  /**
   * 清空所有错误单词（谨慎使用）
   */
  async clearErrorWords(): Promise<boolean> {
    try {
      let query = this.client.from(this.tableName).delete()

      // 如果提供了 userId，只删除该用户的数据
      if (this.userId) {
        query = query.eq('user_id', this.userId)
      }

      const { error } = await query

      if (error) {
        console.error('Clear error words failed:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Clear error words failed:', error)
      return false
    }
  }
}

/**
 * 创建错误单词同步客户端
 */
export function createErrorWordsSyncClient(
  config: ErrorWordsSyncConfig
): ErrorWordsSyncClient {
  return new ErrorWordsSyncClient(config)
}
