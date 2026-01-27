# Supabase 使用指南

本模块提供了 Supabase 数据库操作的封装功能，包括基础数据库操作和错误单词同步功能。

## 环境变量配置

在项目根目录的 `.env` 文件中配置以下环境变量：

```env
# Supabase 项目 URL
VITE_SUPABASE_URL=https://your-project.supabase.co

# Supabase 匿名密钥（anon key）
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key-here

# Supabase 服务角色密钥（用于绕过 RLS 策略，推荐使用）
# 获取方式：Supabase Dashboard > Project Settings > API > service_role key
VITE_SUPABASE_SERVICE_KEY=your-service-role-key-here

# Supabase 用户ID（可选，如果不设置会自动生成）
# 优先级：环境变量 > localStorage > 自动生成
VITE_SUPABASE_USER_ID=your-user-id-here
```

## 基础数据库操作

### 方式一：使用官方客户端（推荐）

```typescript
import { supabaseClient, supabaseServiceClient } from '@/supabase'

// 使用匿名密钥客户端
const { data, error } = await supabaseClient
  .from('users')
  .select('*')
  .eq('status', 'active')

// 使用服务角色密钥客户端（绕过 RLS）
const { data, error } = await supabaseServiceClient
  .from('users')
  .select('*')
```

### 方式二：使用封装类（向后兼容）

```typescript
import { supabase } from '@/supabase'

// 查询数据
const queryResult = await supabase.query({
  table: 'users',
  filters: { name: 'John' },
  limit: 10,
})

// 插入数据
const insertResult = await supabase.insert({
  table: 'users',
  data: { name: 'John', email: 'john@example.com' },
})

// 更新数据
const updateResult = await supabase.update({
  table: 'users',
  filters: { id: 1 },
  data: { name: 'Jane' },
})

// 删除数据
const deleteResult = await supabase.delete({
  table: 'users',
  filters: { id: 1 },
})
```

## 错误单词同步功能

### 前置准备

#### 1. 创建 Supabase 表

在 Supabase SQL Editor 中运行以下 SQL：

```sql
-- 创建错误单词表
CREATE TABLE IF NOT EXISTS error_words (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL, -- 用户ID（必填，即使使用服务密钥也会自动生成）
  word TEXT NOT NULL,
  dict TEXT NOT NULL,
  chapter INTEGER,
  time_stamp BIGINT NOT NULL,
  timing TEXT NOT NULL, -- JSON 字符串
  wrong_count INTEGER NOT NULL DEFAULT 0,
  mistakes TEXT NOT NULL, -- JSON 字符串
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_id TEXT,
  UNIQUE(user_id, word, dict, chapter, time_stamp)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_error_words_user_id ON error_words(user_id);
CREATE INDEX IF NOT EXISTS idx_error_words_word ON error_words(word);
CREATE INDEX IF NOT EXISTS idx_error_words_dict ON error_words(dict);
CREATE INDEX IF NOT EXISTS idx_error_words_time_stamp ON error_words(time_stamp DESC);
```

#### 2. 解决 RLS 策略错误

如果遇到 `new row violates row-level security policy` 错误，有两种解决方案：

**方案一：使用服务角色密钥（推荐，最简单）**

在 `.env` 文件中添加服务角色密钥：

```env
VITE_SUPABASE_SERVICE_KEY=your-service-role-key-here
```

服务角色密钥可以绕过 RLS 策略，无需配置任何策略即可插入数据。

**获取服务角色密钥**：
1. 登录 Supabase Dashboard
2. 进入 Project Settings > API
3. 找到 "service_role" key（注意：这是 secret key）
4. 复制并添加到 `.env` 文件

**方案二：配置 RLS 策略（如果使用匿名密钥）**

如果使用匿名密钥，需要在 Supabase SQL Editor 中运行以下 SQL：

```sql
-- 启用 Row Level Security
ALTER TABLE error_words ENABLE ROW LEVEL SECURITY;

-- 允许所有插入（最简单的方式）
CREATE POLICY "Allow all inserts"
  ON error_words FOR INSERT
  WITH CHECK (true);

-- 允许所有查询
CREATE POLICY "Allow all selects"
  ON error_words FOR SELECT
  USING (true);

-- 允许所有更新
CREATE POLICY "Allow all updates"
  ON error_words FOR UPDATE
  USING (true);

-- 允许所有删除
CREATE POLICY "Allow all deletes"
  ON error_words FOR DELETE
  USING (true);
```

**或者，如果你想禁用 RLS（不推荐用于生产环境）**：

```sql
ALTER TABLE error_words DISABLE ROW LEVEL SECURITY;
```

### 使用错误单词同步

#### 1. 创建同步客户端

```typescript
import { createErrorWordsSyncClient } from '@/supabase'

// 检查是否使用服务角色密钥
const useServiceKey = !!import.meta.env.VITE_SUPABASE_SERVICE_KEY

// 获取用户ID（优先从环境变量，否则自动生成）
const userId = import.meta.env.VITE_SUPABASE_USER_ID || 
  localStorage.getItem('supabase_user_id') ||
  `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// 创建同步客户端
const syncClient = createErrorWordsSyncClient({ 
  userId: userId,
  useServiceKey: useServiceKey 
})
```

#### 2. 上传错误单词到 Supabase

```typescript
const result = await syncClient.uploadErrorWords()

console.log(`上传完成！成功上传 ${result.uploaded} 条记录`)
if (result.errors && result.errors.length > 0) {
  console.error('错误:', result.errors.join('; '))
}
```

#### 3. 从 Supabase 下载错误单词到本地

```typescript
const result = await syncClient.downloadErrorWords()

console.log(`下载完成！下载 ${result.downloaded} 条新记录，合并 ${result.merged} 条记录`)
if (result.errors && result.errors.length > 0) {
  console.error('错误:', result.errors.join('; '))
}
```

#### 4. 删除单个错误单词

```typescript
const success = await syncClient.deleteErrorWord(
  'word',
  'dict',
  null, // chapter
  1234567890 // timeStamp
)
```

#### 5. 清空所有错误单词（谨慎使用）

```typescript
const success = await syncClient.clearErrorWords()
```

### 用户ID配置说明

用户ID的获取优先级：

1. **环境变量** `VITE_SUPABASE_USER_ID`（最高优先级）
2. **localStorage** 中的 `supabase_user_id`
3. **自动生成** 新的用户ID并保存到 localStorage

**重要提示**：
- 即使使用服务角色密钥（Direct Connect），也会优先使用环境变量中的用户ID
- 如果环境变量中设置了 `VITE_SUPABASE_USER_ID`，将始终使用该值
- 建议在 `.env` 文件中设置固定的用户ID，以便在不同设备间同步数据

### 同步结果类型

```typescript
interface SyncResult {
  /** 上传的记录数 */
  uploaded: number
  /** 下载的记录数 */
  downloaded: number
  /** 合并的记录数 */
  merged: number
  /** 错误信息列表（可选） */
  errors?: string[]
}
```

### 配置类型

```typescript
interface ErrorWordsSyncConfig {
  /** 用户ID，用于区分不同用户的数据（可选） */
  userId?: string
  /** Supabase 表名，默认为 'error_words' */
  tableName?: string
  /** 是否使用服务角色密钥（可选） */
  useServiceKey?: boolean
}
```

## 推荐配置

- **开发环境**：使用服务角色密钥（方案一）
- **生产环境（单用户）**：使用服务角色密钥或选项 A
- **生产环境（多用户）**：使用选项 B 或服务角色密钥

## 注意事项

1. **服务角色密钥安全**：服务角色密钥是敏感信息，请确保：
   - 不要将 `.env` 文件提交到 Git（应该已经在 `.gitignore` 中）
   - 不要在前端代码中硬编码密钥
   - 仅用于开发环境或受信任的环境

2. **用户ID管理**：建议在 `.env` 文件中设置固定的 `VITE_SUPABASE_USER_ID`，以便在不同设备间同步数据。

3. **数据同步策略**：下载时会根据 `wrongCount` 进行合并，如果云端记录的 `wrongCount` 更大，会更新本地记录。

## 验证配置

配置完成后，尝试上传错误单词，应该不再出现 RLS 策略错误。
