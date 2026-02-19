'use client'

import { useState } from 'react'
import { CategoryList } from '@/components/dashboard/CategoryList'
import { FoodList } from '@/components/dashboard/FoodList'
import { SideList } from '@/components/dashboard/SideList'
import { clsx } from 'clsx'

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'foods' | 'sides'>('categories')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  const handleCategorySelect = (category: any) => {
    setSelectedCategoryId(category.id)
    setActiveTab('foods')
  }

  const handleTabChange = (tabId: 'categories' | 'foods' | 'sides') => {
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
            { id: 'sides', name: 'Sides' },
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
        {activeTab === 'sides' && <SideList />}
      </div>
    </div>
  )
}
