/**
 * Supabase 数据库操作功能封装
 *
 * 本模块提供两种使用方式：
 *
 * 1. 官方推荐方式（直接使用官方客户端）：
 * ```typescript
 * import { supabaseClient } from '@/supabase'
 *
 * // 直接使用官方客户端的所有功能
 * const { data, error } = await supabaseClient
 *   .from('users')
 *   .select('*')
 *   .eq('status', 'active')
 * ```
 *
 * 2. 封装方式（使用封装的方法）：
 * ```typescript
 * import { supabase } from '@/supabase'
 *
 * // 配置 Supabase（如果未使用环境变量）
 * supabase.updateConfig({
 *   supabaseUrl: 'https://your-project.supabase.co',
 *   supabaseAnonKey: 'your-anon-key',
 * })
 *
 * // 查询数据库
 * const queryResult = await supabase.query({
 *   table: 'users',
 *   filters: { name: 'John' },
 *   limit: 10,
 * })
 *
 * // 插入数据
 * const insertResult = await supabase.insert({
 *   table: 'users',
 *   data: { name: 'John', email: 'john@example.com' },
 * })
 *
 * // 更新数据
 * const updateResult = await supabase.update({
 *   table: 'users',
 *   filters: { id: 1 },
 *   data: { name: 'Jane' },
 * })
 *
 * // 删除数据
 * const deleteResult = await supabase.delete({
 *   table: 'users',
 *   filters: { id: 1 },
 * })
 * ```
 */

// 导出官方推荐方式的客户端（直接使用官方客户端）
export { supabaseClient, supabaseServiceClient } from './client'

// 导出类型定义
export * from './types'

// 导出封装类和方法（保持向后兼容）
export {
  SupabaseClient,
  createSupabaseClient,
  supabase,
} from './client'

// 导出错误单词同步功能
export type {
  SyncResult,
  ErrorWordsSyncConfig,
  SupabaseErrorWordRecord,
} from './errorWords'
export {
  ErrorWordsSyncClient,
  createErrorWordsSyncClient,
} from './errorWords'
