import { eudicApi } from '@/api'
import type { Language, StudyListCategory, WordInfo } from '@/api'
import { db } from '@/utils/db'
import { WordRecord } from '@/utils/db/record'
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

type EudicDropdownProps = {
  renderRecords: groupedWordRecords[]
  onDataChange?: () => void // 数据变化时的回调，用于刷新错题本列表
}

const EudicDropdown: FC<EudicDropdownProps> = ({ renderRecords, onDataChange }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [language, setLanguage] = useState<Language>('en')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<StudyListCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  
  // 下载相关的状态
  const [downloadLanguage, setDownloadLanguage] = useState<Language>('en')
  const [downloadCategoryId, setDownloadCategoryId] = useState('')
  const [downloadCategories, setDownloadCategories] = useState<StudyListCategory[]>([])
  const [loadingDownloadCategories, setLoadingDownloadCategories] = useState(false)

  // 获取生词本列表
  const fetchCategories = async (lang: Language) => {
    setLoadingCategories(true)
    try {
      const response = await eudicApi.getCategories(lang)
      if (response.data && response.data.length > 0) {
        setCategories(response.data)
        // 默认选择第一个生词本
        setCategoryId(response.data[0].id)
      } else {
        setCategories([])
        setCategoryId('')
      }
    } catch (error: any) {
      console.error('Failed to fetch categories:', error)
      alert(`获取生词本列表失败: ${error.message || '请检查网络连接'}`)
      setCategories([])
      setCategoryId('')
    } finally {
      setLoadingCategories(false)
    }
  }

  // 当对话框打开时，获取生词本列表
  const handleUpload = () => {
    setDropdownOpen(false) // 关闭下拉菜单
    setShowUploadDialog(true)
    fetchCategories(language)
  }

  // 当对话框关闭时重置状态
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // 对话框关闭时重置所有相关状态
      setCategoryId('')
      setCategories([])
      setLoadingCategories(false)
      setIsLoading(false)
    }
    setShowUploadDialog(open)
  }

  // 当语言改变时，重新获取生词本列表
  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage)
    setCategoryId('') // 清空当前选择
    fetchCategories(newLanguage)
  }

  const handleConfirmUpload = async () => {
    if (!categoryId.trim()) {
      alert('请选择生词本')
      return
    }

    setIsLoading(true)
    try {
      // 从所有记录中提取唯一的单词列表
      const uniqueWords = Array.from(new Set(renderRecords.map((record) => record.word)))

      if (uniqueWords.length === 0) {
        alert('没有可上传的单词')
        setIsLoading(false)
        return
      }

      // 调用 API 上传单词
      const response = await eudicApi.addWords({
        category_id: categoryId,
        language: language,
        words: uniqueWords,
      })

      alert(response.message || `成功上传 ${uniqueWords.length} 个单词`)
      setShowUploadDialog(false)
    } catch (error: any) {
      console.error('Upload failed:', error)
      alert(`上传失败: ${error.message || '请检查生词本ID是否正确'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 获取下载生词本列表
  const fetchDownloadCategories = async (lang: Language) => {
    setLoadingDownloadCategories(true)
    try {
      const response = await eudicApi.getCategories(lang)
      if (response.data && response.data.length > 0) {
        setDownloadCategories(response.data)
        // 默认选择第一个生词本
        setDownloadCategoryId(response.data[0].id)
      } else {
        setDownloadCategories([])
        setDownloadCategoryId('')
      }
    } catch (error: any) {
      console.error('Failed to fetch categories:', error)
      alert(`获取生词本列表失败: ${error.message || '请检查网络连接'}`)
      setDownloadCategories([])
      setDownloadCategoryId('')
    } finally {
      setLoadingDownloadCategories(false)
    }
  }

  // 当下载对话框打开时，获取生词本列表
  const handleDownload = () => {
    setDropdownOpen(false) // 关闭下拉菜单
    setShowDownloadDialog(true)
    fetchDownloadCategories(downloadLanguage)
  }

  // 当下载对话框关闭时重置状态
  const handleDownloadDialogClose = (open: boolean) => {
    if (!open) {
      // 对话框关闭时重置所有相关状态
      setDownloadCategoryId('')
      setDownloadCategories([])
      setLoadingDownloadCategories(false)
      setIsLoading(false)
    }
    setShowDownloadDialog(open)
  }

  // 当下载语言改变时，重新获取生词本列表
  const handleDownloadLanguageChange = (newLanguage: Language) => {
    setDownloadLanguage(newLanguage)
    setDownloadCategoryId('')
    fetchDownloadCategories(newLanguage)
  }

  const handleConfirmDownload = async () => {
    if (!downloadCategoryId.trim()) {
      alert('请选择生词本')
      return
    }

    setIsLoading(true)
    try {
      let allWords: WordInfo[] = []
      let page = 1
      const pageSize = 100

      // 分页获取所有单词
      while (true) {
        const response = await eudicApi.getWords({
          category_id: downloadCategoryId,
          language: downloadLanguage,
          page: page,
          page_size: pageSize,
        })

        if (response.data && response.data.length > 0) {
          allWords = allWords.concat(response.data)
          // 如果返回的单词数少于 pageSize，说明已经是最后一页
          if (response.data.length < pageSize) {
            break
          }
          page++
        } else {
          break
        }
      }

      if (allWords.length === 0) {
        alert('该生词本中没有单词')
        setIsLoading(false)
        return
      }

      // 将单词转换为 WordRecord 并保存到数据库
      const dictId = `eudic-${downloadCategoryId}`
      let successCount = 0
      let skipCount = 0

      for (const wordInfo of allWords) {
        try {
          // 检查是否已存在相同的记录
          const existing = await db.wordRecords
            .where({ word: wordInfo.word, dict: dictId })
            .first()

          if (!existing) {
            // 创建 WordRecord，设置 wrongCount 为 1 以便在错题本中显示
            const wordRecord = new WordRecord(
              wordInfo.word,
              dictId,
              null, // chapter 为 null，因为是错题本
              [], // timing 为空数组
              1, // wrongCount 设置为 1
              {} // mistakes 为空对象
            )
            await db.wordRecords.add(wordRecord)
            successCount++
          } else {
            skipCount++
          }
        } catch (error) {
          console.error(`Failed to save word ${wordInfo.word}:`, error)
        }
      }

      alert(`下载完成！成功导入 ${successCount} 个单词${skipCount > 0 ? `，跳过 ${skipCount} 个已存在的单词` : ''}`)
      setShowDownloadDialog(false)

      // 触发数据刷新
      if (onDataChange) {
        onDataChange()
      }
    } catch (error: any) {
      console.error('Download failed:', error)
      alert(`下载失败: ${error.message || '请检查网络连接和生词本ID是否正确'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="z-10 mr-2">
        <DropdownMenu.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenu.Trigger asChild>
            <button className="my-btn-primary h-8 shadow transition hover:bg-indigo-600 disabled:opacity-50" disabled={isLoading || loadingCategories || loadingDownloadCategories}>
              {isLoading ? '处理中...' : '欧路词典'}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content className="mt-1 rounded bg-indigo-500 text-white shadow-lg">
            <DropdownMenu.Item
              className="cursor-pointer rounded px-4 py-2 hover:bg-indigo-400 focus:bg-indigo-600 focus:outline-none"
              onClick={handleUpload}
              disabled={isLoading}
            >
              上传
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="cursor-pointer rounded px-4 py-2 hover:bg-indigo-600 focus:bg-indigo-600 focus:outline-none"
              onClick={handleDownload}
              disabled={isLoading}
            >
              下载
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      <Dialog open={showUploadDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>上传单词到欧路词典</DialogTitle>
            <DialogDescription>将错题本中的所有单词上传到指定的欧路词典生词本</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="language" className="text-sm font-medium">
                语言
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                disabled={loadingCategories}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300"
              >
                <option value="en">英语 (en)</option>
                <option value="fr">法语 (fr)</option>
                <option value="de">德语 (de)</option>
                <option value="es">西班牙语 (es)</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="category" className="text-sm font-medium">
                生词本
              </label>
              {loadingCategories ? (
                <div className="flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  加载中...
                </div>
              ) : categories.length > 0 ? (
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  暂无生词本
                </div>
              )}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              将上传 {Array.from(new Set(renderRecords.map((record) => record.word))).length} 个单词到生词本
            </div>
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

      <Dialog open={showDownloadDialog} onOpenChange={handleDownloadDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>从欧路词典下载单词</DialogTitle>
            <DialogDescription>将指定生词本中的单词下载到错题本</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="download-language" className="text-sm font-medium">
                语言
              </label>
              <select
                id="download-language"
                value={downloadLanguage}
                onChange={(e) => handleDownloadLanguageChange(e.target.value as Language)}
                disabled={loadingDownloadCategories}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300"
              >
                <option value="en">英语 (en)</option>
                <option value="fr">法语 (fr)</option>
                <option value="de">德语 (de)</option>
                <option value="es">西班牙语 (es)</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="download-category" className="text-sm font-medium">
                生词本
              </label>
              {loadingDownloadCategories ? (
                <div className="flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  加载中...
                </div>
              ) : downloadCategories.length > 0 ? (
                <select
                  id="download-category"
                  value={downloadCategoryId}
                  onChange={(e) => setDownloadCategoryId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300"
                >
                  {downloadCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  暂无生词本
                </div>
              )}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              将从选定的生词本下载所有单词到错题本
            </div>
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

export default EudicDropdown
