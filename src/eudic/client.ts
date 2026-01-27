import type {
  ApiResponse,
  EudicApiConfig,
  GetCategoriesResponse,
  CreateCategoryResponse,
  GetWordsResponse,
  GetWordResponse,
  CreateCategoryParams,
  RenameCategoryParams,
  DeleteCategoryParams,
  GetWordsParams,
  AddWordsParams,
  DeleteWordsParams,
  AddWordParams,
  GetWordParams,
} from './types'

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<EudicApiConfig> = {
  baseURL: 'https://api.frdic.com/api/open/v1',
  authorization: import.meta.env.VITE_EUDIC_API_AUTHORIZATION || '',
  userAgent: 'Mozilla/5.0',
}

/**
 * 欧路词典 API 客户端
 */
export class EudicApiClient {
  private config: Required<EudicApiConfig>

  constructor(config?: EudicApiConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<EudicApiConfig>) {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取授权令牌
   */
  getAuthorization(): string {
    return this.config.authorization
  }

  /**
   * 设置授权令牌
   */
  setAuthorization(authorization: string) {
    this.config.authorization = authorization
  }

  /**
   * 构建请求头
   */
  private getHeaders(contentType?: string): HeadersInit {
    const headers: HeadersInit = {
      'User-Agent': this.config.userAgent,
    }

    if (this.config.authorization) {
      headers['Authorization'] = this.config.authorization
    }

    if (contentType) {
      headers['Content-Type'] = contentType
    }

    return headers
  }

  /**
   * 发送请求
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`
    const headers = this.getHeaders(
      options.body && typeof options.body === 'string'
        ? 'application/json'
        : undefined
    )

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    })

    // 204 No Content 响应没有 body
    if (response.status === 204) {
      return {} as T
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}. ${errorText}`
      )
    }

    const text = await response.text()
    if (!text) {
      return {} as T
    }

    try {
      return JSON.parse(text) as T
    } catch (e) {
      throw new Error(`Failed to parse response as JSON: ${text}`)
    }
  }

  /**
   * 1.1 获取所有生词本
   */
  async getCategories(language: string): Promise<GetCategoriesResponse> {
    const params = new URLSearchParams({ language })
    return this.request<GetCategoriesResponse>(
      `/studylist/category?${params.toString()}`,
      {
        method: 'GET',
      }
    )
  }

  /**
   * 1.2 添加一个新的生词本
   */
  async createCategory(
    params: CreateCategoryParams
  ): Promise<CreateCategoryResponse> {
    return this.request<CreateCategoryResponse>('/studylist/category', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  /**
   * 1.3 重命名一个生词本
   */
  async renameCategory(
    params: RenameCategoryParams
  ): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>('/studylist/category', {
      method: 'PATCH',
      body: JSON.stringify(params),
    })
  }

  /**
   * 1.4 删除一个生词本
   */
  async deleteCategory(params: DeleteCategoryParams): Promise<void> {
    return this.request<void>('/studylist/category', {
      method: 'DELETE',
      body: JSON.stringify(params),
    })
  }

  /**
   * 1.5 获取生词本中的单词
   */
  async getWords(params: GetWordsParams): Promise<GetWordsResponse> {
    const queryParams = new URLSearchParams({
      category_id: params.category_id,
      language: params.language,
    })

    if (params.page !== undefined) {
      queryParams.append('page', params.page.toString())
    }
    if (params.page_size !== undefined) {
      queryParams.append('page_size', params.page_size.toString())
    }

    return this.request<GetWordsResponse>(
      `/studylist/words?${queryParams.toString()}`,
      {
        method: 'GET',
      }
    )
  }

  /**
   * 1.6 添加单词到生词本
   */
  async addWords(params: AddWordsParams): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>('/studylist/words', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  /**
   * 1.7 删除生词本中的单词
   */
  async deleteWords(params: DeleteWordsParams): Promise<void> {
    return this.request<void>('/studylist/words', {
      method: 'DELETE',
      body: JSON.stringify(params),
    })
  }

  /**
   * 1.8 新增生词本中的一个单词
   */
  async addWord(params: AddWordParams): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>('/studylist/word', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  /**
   * 1.9 查询生词本中的一个单词
   */
  async getWord(params: GetWordParams): Promise<GetWordResponse> {
    const queryParams = new URLSearchParams({
      language: params.language,
      word: params.word,
    })

    return this.request<GetWordResponse>(
      `/studylist/word?${queryParams.toString()}`,
      {
        method: 'GET',
      }
    )
  }
}

/**
 * 创建默认的 API 客户端实例
 */
export function createEudicApiClient(
  config?: EudicApiConfig
): EudicApiClient {
  return new EudicApiClient(config)
}

/**
 * 默认导出的客户端实例（需要配置授权信息）
 */
export const eudicApi = createEudicApiClient()
