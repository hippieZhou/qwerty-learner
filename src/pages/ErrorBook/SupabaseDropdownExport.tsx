import { createErrorWordsSyncClient } from '@/supabase'
import type { SyncResult } from '@/supabase'
import type { groupedWordRecords } from './type'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { FC } from 'react'
import { useState } from 'react'

type SupabaseDropdownExportProps = {
  renderRecords: groupedWordRecords[]
  onDataChange?: () => void // 数据变化时的回调，用于刷新错题本列表
}

/**
 * 获取或创建用户ID（可选）
 * 优先级：环境变量 VITE_SUPABASE_USER_ID > localStorage > 自动生成
 * 即使使用服务密钥，也会优先使用环境变量中的用户ID
 */
function getOrCreateUserId(): string | undefined {
  // 优先从环境变量获取（即使使用服务密钥也使用环境变量中的值）
  const envUserId = import.meta.env.VITE_SUPABASE_USER_ID
  if (envUserId && envUserId.trim()) {
    return envUserId.trim()
  }

  // 从 localStorage 获取
  const STORAGE_KEY = 'supabase_user_id'
  let userId = localStorage.getItem(STORAGE_KEY)
  
  if (!userId) {
    // 如果都没有，生成新的用户ID并保存到 localStorage
    userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(STORAGE_KEY, userId)
  }
  
  return userId || undefined
}

const SupabaseDropdownExport: FC<SupabaseDropdownExportProps> = ({ renderRecords, onDataChange }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  // 检查是否使用服务角色密钥（Direct Connect）
  const useServiceKey = !!import.meta.env.VITE_SUPABASE_SERVICE_KEY
  
  // 获取用户ID（优先从环境变量，否则自动生成）
  const userId = getOrCreateUserId()

  // 创建同步客户端
  const syncClient = createErrorWordsSyncClient({ 
    userId: userId,
    useServiceKey: useServiceKey 
  })

  // 上传本地错误单词到 Supabase
  const handleConfirmUpload = async () => {
    setIsLoading(true)
    setSyncResult(null)
    try {
      const result = await syncClient.uploadErrorWords()
      setSyncResult(result)
      
      const messageParts: string[] = []
      if (result.uploaded > 0) {
        messageParts.push(`新增 ${result.uploaded} 条记录`)
      }
      if (result.merged > 0) {
        messageParts.push(`更新 ${result.merged} 条记录`)
      }
      
      if (result.errors && result.errors.length > 0) {
        alert(`上传完成！${messageParts.join('，')}\n错误: ${result.errors.join('; ')}`)
      } else {
        if (messageParts.length > 0) {
          alert(`上传完成！${messageParts.join('，')}`)
        } else {
          alert('上传完成！')
        }
        setShowUploadDialog(false)
      }
    } catch (error: any) {
      console.error('Upload failed:', error)
      alert(`上传失败: ${error.message || '请检查网络连接和 Supabase 配置'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 从 Supabase 下载错误单词到本地（完全覆盖本地数据）
  const handleConfirmDownload = async () => {
    setIsLoading(true)
    setSyncResult(null)
    try {
      const result = await syncClient.downloadErrorWords()
      setSyncResult(result)
      
      if (result.errors && result.errors.length > 0) {
        alert(`下载完成！已覆盖本地数据，下载 ${result.downloaded} 条记录\n错误: ${result.errors.join('; ')}`)
      } else {
        alert(`下载完成！已覆盖本地数据，下载 ${result.downloaded} 条记录`)
        setShowDownloadDialog(false)
      }

      // 触发数据刷新
      if (onDataChange) {
        onDataChange()
      }
    } catch (error: any) {
      console.error('Download failed:', error)
      alert(`下载失败: ${error.message || '请检查网络连接和 Supabase 配置'}`)
    } finally {
      setIsLoading(false)
    }
  }


  // 当对话框关闭时重置状态
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setSyncResult(null)
    }
    setShowUploadDialog(open)
  }

  const handleDownloadDialogClose = (open: boolean) => {
    if (!open) {
      setSyncResult(null)
    }
    setShowDownloadDialog(open)
  }


  // 计算要上传的单词数量
  const uniqueWordsCount = Array.from(new Set(renderRecords.map((record) => record.word))).length

  return (
    <>
      <div className="z-10 mr-2">
        <DropdownMenu.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenu.Trigger asChild>
            <button className="my-btn-primary h-8 shadow transition hover:bg-indigo-600 disabled:opacity-50" disabled={isLoading}>
              {isLoading ? '处理中...' : 'Supabase 同步'}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content className="mt-1 rounded bg-indigo-500 text-white shadow-lg">
            <DropdownMenu.Item
              className="cursor-pointer rounded px-4 py-2 hover:bg-indigo-400 focus:bg-indigo-600 focus:outline-none"
              onClick={() => {
                setDropdownOpen(false)
                setShowUploadDialog(true)
              }}
              disabled={isLoading}
            >
              上传到云端
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="cursor-pointer rounded px-4 py-2 hover:bg-indigo-600 focus:bg-indigo-600 focus:outline-none"
              onClick={() => {
                setDropdownOpen(false)
                setShowDownloadDialog(true)
              }}
              disabled={isLoading}
            >
              从云端下载
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-indigo-400" />
            <DropdownMenu.Item
              className="cursor-pointer rounded px-4 py-2 hover:bg-indigo-400 focus:bg-indigo-600 focus:outline-none"
              onClick={() => {
                setDropdownOpen(false)
                window.open('https://supabase.com', '_blank', 'noopener,noreferrer')
              }}
            >
              打开 Supabase 网站
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      {/* 上传对话框 */}
      <Dialog open={showUploadDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>上传错误单词到 Supabase</DialogTitle>
            <DialogDescription>将错题本中的所有错误单词上传到 Supabase 云端</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {useServiceKey && (
              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                使用 Direct Connect（服务角色密钥）模式，无需用户ID
              </div>
            )}
            <div className="text-sm text-slate-500 dark:text-slate-400">
              将上传 {uniqueWordsCount} 个错误单词到云端
            </div>
            {syncResult && (
              <div className="rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-800">
                {syncResult.uploaded > 0 && (
                  <div>新增: {syncResult.uploaded} 条</div>
                )}
                {syncResult.merged > 0 && (
                  <div>更新: {syncResult.merged} 条</div>
                )}
                {syncResult.errors && syncResult.errors.length > 0 && (
                  <div className="mt-2 text-red-600 dark:text-red-400">
                    错误: {syncResult.errors.join('; ')}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowUploadDialog(false)}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium ring-offset-white transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 dark:focus-visible:ring-slate-300"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmUpload}
              disabled={isLoading}
              className="my-btn-primary h-10 px-4 py-2 disabled:opacity-50"
            >
              {isLoading ? '上传中...' : '确认上传'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 下载对话框 */}
      <Dialog open={showDownloadDialog} onOpenChange={handleDownloadDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>从 Supabase 下载错误单词</DialogTitle>
            <DialogDescription>将 Supabase 云端中的错误单词下载到本地错题本（将完全覆盖本地数据）</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {useServiceKey && (
              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                使用 Direct Connect（服务角色密钥）模式，无需用户ID
              </div>
            )}
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {useServiceKey 
                ? '将从云端下载所有错误单词并完全覆盖本地错题本'
                : '将从云端下载该用户的所有错误单词并完全覆盖本地错题本'}
            </div>
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
              ⚠️ 警告：此操作将删除本地所有错误单词记录，然后替换为云端数据
            </div>
            {syncResult && (
              <div className="rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-800">
                <div>下载: {syncResult.downloaded} 条</div>
                {syncResult.errors && syncResult.errors.length > 0 && (
                  <div className="mt-2 text-red-600 dark:text-red-400">
                    错误: {syncResult.errors.join('; ')}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowDownloadDialog(false)}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium ring-offset-white transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 dark:focus-visible:ring-slate-300"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmDownload}
              disabled={isLoading}
              className="my-btn-primary h-10 px-4 py-2 disabled:opacity-50"
            >
              {isLoading ? '下载中...' : '确认下载'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}

export default SupabaseDropdownExport
