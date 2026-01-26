/**
 * 欧路词典生词本 API 封装
 * 
 * 使用示例：
 * ```typescript
 * import { eudicApi } from '@/api'
 * 
 * // 设置授权令牌
 * eudicApi.setAuthorization('NIS xxxx')
 * 
 * // 获取所有生词本
 * const categories = await eudicApi.getCategories('en')
 * 
 * // 创建生词本
 * const newCategory = await eudicApi.createCategory({
 *   language: 'en',
 *   name: '我的生词本'
 * })
 * ```
 */

export * from './types'
export { EudicApiClient, createEudicApiClient, eudicApi } from './client'
