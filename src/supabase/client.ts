import { createClient, type SupabaseClient as SupabaseJsClient } from '@supabase/supabase-js'
import type {
  SupabaseConfig,
  QueryOptions,
  InsertOptions,
  UpdateOptions,
  DeleteOptions,
  SupabaseResponse,
} from './types'

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<SupabaseConfig> = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '',
  supabaseServiceKey: import.meta.env.VITE_SUPABASE_SERVICE_KEY || '',
}

/**
 * 按照官方推荐方式创建的默认 Supabase 客户端
 */
export const supabaseClient = createClient(
  DEFAULT_CONFIG.supabaseUrl,
  DEFAULT_CONFIG.supabaseAnonKey
)

/**
 * 服务角色密钥客户端（如果配置了服务密钥）
 */
export const supabaseServiceClient = DEFAULT_CONFIG.supabaseServiceKey
  ? createClient(DEFAULT_CONFIG.supabaseUrl, DEFAULT_CONFIG.supabaseServiceKey)
  : undefined

/**
 * Supabase 客户端封装（保持向后兼容）
 */
export class SupabaseClient {
  private config: Required<SupabaseConfig>
  private client: SupabaseJsClient
  private serviceClient?: SupabaseJsClient

  constructor(config?: SupabaseConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.validateConfig()
    this.client = createClient(this.config.supabaseUrl, this.config.supabaseAnonKey)
    if (this.config.supabaseServiceKey) {
      this.serviceClient = createClient(
        this.config.supabaseUrl,
        this.config.supabaseServiceKey
      )
    }
  }

  /**
   * 验证配置
   */
  private validateConfig() {
    if (!this.config.supabaseUrl) {
      throw new Error('Supabase URL is required')
    }
    if (!this.config.supabaseAnonKey && !this.config.supabaseServiceKey) {
      throw new Error('Either Supabase Anon Key or Service Key is required')
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SupabaseConfig>) {
    this.config = { ...this.config, ...config }
    this.validateConfig()
    this.client = createClient(this.config.supabaseUrl, this.config.supabaseAnonKey)
    if (this.config.supabaseServiceKey) {
      this.serviceClient = createClient(
        this.config.supabaseUrl,
        this.config.supabaseServiceKey
      )
    }
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<Required<SupabaseConfig>> {
    return { ...this.config }
  }

  /**
   * 获取客户端实例（匿名密钥）
   */
  getClient(): SupabaseJsClient {
    return this.client
  }

  /**
   * 获取服务端客户端实例（服务角色密钥）
   */
  getServiceClient(): SupabaseJsClient | undefined {
    return this.serviceClient
  }

  /**
   * 查询数据库数据
   */
  async query<T = any>(
    options: QueryOptions,
    useServiceKey = false
  ): Promise<SupabaseResponse<T[]>> {
    const {
      table,
      filters,
      orderBy,
      orderDirection = 'asc',
      limit,
      offset,
    } = options

    const client = useServiceKey && this.serviceClient ? this.serviceClient : this.client

    let query = client.from(table).select('*')

    // 应用过滤条件
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    // 应用排序
    if (orderBy) {
      query = query.order(orderBy, { ascending: orderDirection === 'asc' })
    }

    // 应用限制和偏移
    if (limit) {
      query = query.limit(limit)
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 1000) - 1)
    }

    const { data, error } = await query

    if (error) {
      return {
        error: {
          message: error.message,
          code: error.code,
          details: error,
        },
      }
    }

    return { data: data as T[] }
  }

  /**
   * 插入数据到数据库
   */
  async insert<T = any>(
    options: InsertOptions,
    useServiceKey = false
  ): Promise<SupabaseResponse<T | T[]>> {
    const { table, data } = options

    const client = useServiceKey && this.serviceClient ? this.serviceClient : this.client

    const isArray = Array.isArray(data)
    const { data: result, error } = await client
      .from(table)
      .insert(data)
      .select()

    if (error) {
      return {
        error: {
          message: error.message,
          code: error.code,
          details: error,
        },
      }
    }

    return { data: (isArray ? result : result?.[0]) as T | T[] }
  }

  /**
   * 更新数据库数据
   */
  async update<T = any>(
    options: UpdateOptions,
    useServiceKey = false
  ): Promise<SupabaseResponse<T[]>> {
    const { table, filters, data } = options

    const client = useServiceKey && this.serviceClient ? this.serviceClient : this.client

    let query = client.from(table).update(data)

    // 应用过滤条件
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { data: result, error } = await query.select()

    if (error) {
      return {
        error: {
          message: error.message,
          code: error.code,
          details: error,
        },
      }
    }

    return { data: result as T[] }
  }

  /**
   * 删除数据库数据
   */
  async delete<T = any>(
    options: DeleteOptions,
    useServiceKey = false
  ): Promise<SupabaseResponse<T[]>> {
    const { table, filters } = options

    const client = useServiceKey && this.serviceClient ? this.serviceClient : this.client

    let query = client.from(table).delete()

    // 应用过滤条件
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { data: result, error } = await query.select()

    if (error) {
      return {
        error: {
          message: error.message,
          code: error.code,
          details: error,
        },
      }
    }

    return { data: result as T[] }
  }
}

/**
 * 创建 Supabase 客户端实例
 */
export function createSupabaseClient(
  config?: SupabaseConfig
): SupabaseClient {
  return new SupabaseClient(config)
}

/**
 * 默认导出的客户端实例（保持向后兼容）
 */
export const supabase = createSupabaseClient()
