'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { CategoryList } from '@/components/dashboard/CategoryList'
import { FoodList } from '@/components/dashboard/FoodList'
import { clsx } from 'clsx'
import { Category, Profile } from '@/types'

export default function MenuPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'categories' | 'foods'>('categories')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        const role = (profile as Pick<Profile, 'role'> | null)?.role
        if (!role || (role !== 'super_admin' && role !== 'admin')) {
          router.replace('/dashboard')
        }
      }
      setLoading(false)
    }
    checkRole()
  }, [router])

  if (loading) return <div>Loading...</div>

  const handleCategorySelect = (category: Category) => {
    setSelectedCategoryId(category.id)
    setActiveTab('foods')
  }

  const handleTabChange = (tabId: 'categories' | 'foods') => {
    setActiveTab(tabId)
    if (tabId === 'categories') {
      setSelectedCategoryId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Menu Management</h2>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: 'categories', name: 'Categories' },
            { id: 'foods', name: 'Foods' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={clsx(
                activeTab === tab.id
                  ? 'border-brand-red text-brand-red'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-brand-charcoal',
                'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-bold transition-colors'
              )}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'categories' && <CategoryList onSelect={handleCategorySelect} />}
        {activeTab === 'foods' && <FoodList selectedCategoryId={selectedCategoryId} />}
      </div>
    </div>
  )
}
