# 欧路词典生词本 API 使用指南

〉https://my.eudic.net/OpenAPI/doc_api_study

## 环境配置

在使用 API 之前，需要配置授权令牌。有两种方式：

### 方式一：使用环境变量（推荐）

1. 在项目根目录创建 `.env` 文件（如果不存在）
2. 添加以下配置：

```env
VITE_EUDIC_API_AUTHORIZATION=NIS your_authorization_token_here
```

3. 重启开发服务器使配置生效

**注意**：`.env` 文件已添加到 `.gitignore`，不会被提交到版本控制。可以参考 `.env.example` 文件。

### 方式二：代码中设置

如果不想使用环境变量，也可以在代码中动态设置：

```typescript
import { eudicApi } from '@/eudic'

eudicApi.setAuthorization('NIS xxxx')
```

## 快速开始

### 1. 导入 API 客户端

```typescript
import { eudicApi } from '@/eudic'
// 或者
import { EudicApiClient, createEudicApiClient } from '@/eudic'
```

### 2. 配置授权信息

在使用 API 之前，需要设置授权令牌：

```typescript
// 使用默认实例
eudicApi.setAuthorization('NIS xxxx')

// 或者创建新实例时配置
const client = createEudicApiClient({
  authorization: 'NIS xxxx',
  baseURL: 'https://api.frdic.com/api/open/v1', // 可选，默认值
  userAgent: 'Mozilla/5.0', // 可选，默认值
})
```

## API 使用示例

### 生词本管理

#### 1. 获取所有生词本

```typescript
const response = await eudicApi.getCategories('en')
console.log(response.data) // StudyListCategory[]
```

#### 2. 创建生词本

```typescript
const response = await eudicApi.createCategory({
  language: 'en',
  name: '我的生词本'
})
console.log(response.data) // StudyListCategory
```

#### 3. 重命名生词本

```typescript
const response = await eudicApi.renameCategory({
  id: '132314173819830125',
  language: 'en',
  name: '新的名称'
})
console.log(response.message) // "分类重命名成功"
```

#### 4. 删除生词本

```typescript
await eudicApi.deleteCategory({
  id: '132314173819830125',
  language: 'en',
  name: '新的名称1'
})
// 成功时返回 204 No Content
```

### 单词管理

#### 5. 获取生词本中的单词

```typescript
const response = await eudicApi.getWords({
  category_id: '0',
  language: 'en',
  page: 1,
  page_size: 100
})
console.log(response.data) // WordInfo[]
```

#### 6. 批量添加单词到生词本

```typescript
const response = await eudicApi.addWords({
  category_id: '0',
  language: 'en',
  words: ['english', 'french']
})
console.log(response.message) // "单词导入成功,导入数量 : 2"
```

#### 7. 删除生词本中的单词

```typescript
await eudicApi.deleteWords({
  category_id: '0',
  language: 'en',
  words: ['english', 'french']
})
// 成功时返回 204 No Content
```

#### 8. 添加单个单词（带详细信息）

```typescript
const response = await eudicApi.addWord({
  language: 'en',
  word: 'hello',
  star: 2,
  context_line: 'hello, how are you?',
  category_ids: [0]
})
console.log(response.message) // "单词添加成功"
```

#### 9. 查询单个单词

```typescript
const word = await eudicApi.getWord({
  language: 'en',
  word: 'hello'
})
console.log(word) // WordInfo
```

## 错误处理

所有 API 方法在请求失败时会抛出错误：

```typescript
try {
  const categories = await eudicApi.getCategories('en')
} catch (error) {
  console.error('获取生词本失败:', error.message)
}
```

## 类型定义

所有类型定义都可以从 `@/eudic` 导入：

```typescript
import type {
  Language,
  StudyListCategory,
  WordInfo,
  CreateCategoryParams,
  GetWordsParams,
  // ... 更多类型
} from '@/eudic'
```

## 支持的语言

目前支持以下语言：
- `en` - 英语
- `fr` - 法语
- `de` - 德语
- `es` - 西班牙语
