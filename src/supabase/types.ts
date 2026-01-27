/**
 * Supabase 客户端配置
 */
export interface SupabaseConfig {
  /** Supabase 项目 URL */
  supabaseUrl?: string
  /** Supabase 匿名密钥 (anon key) */
  supabaseAnonKey?: string
  /** Supabase 服务角色密钥 (service role key)，用于服务端操作 */
  supabaseServiceKey?: string
}

/**
 * 数据库查询选项
 */
export interface QueryOptions {
  /** 表名 */
  table: string
  /** 查询条件 */
  filters?: Record<string, any>
  /** 排序字段 */
  orderBy?: string
  /** 排序方向 */
  orderDirection?: 'asc' | 'desc'
  /** 限制返回数量 */
  limit?: number
  /** 偏移量 */
  offset?: number
}

/**
 * 数据库插入选项
 */
export interface InsertOptions {
  /** 表名 */
  table: string
  /** 要插入的数据 */
  data: Record<string, any> | Record<string, any>[]
}

/**
 * 数据库更新选项
 */
export interface UpdateOptions {
  /** 表名 */
  table: string
  /** 更新条件 */
  filters: Record<string, any>
  /** 要更新的数据 */
  data: Record<string, any>
}

/**
 * 数据库删除选项
 */
export interface DeleteOptions {
  /** 表名 */
  table: string
  /** 删除条件 */
  filters: Record<string, any>
}

/**
 * API 响应基础结构
 */
export interface SupabaseResponse<T = any> {
  /** 数据 */
  data?: T
  /** 错误信息 */
  error?: {
    message: string
    code?: string
    details?: any
  }
}
