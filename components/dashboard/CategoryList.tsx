'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Category } from '@/types'
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react'

export function CategoryList({ onSelect }: { onSelect?: (category: Category) => void }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) console.error('Error fetching categories:', error)
    else setCategories(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!newCategoryName) return

    let error
    if (editingId) {
      const { error: updateError } = await supabase
        .from('categories')
        .update({ name: newCategoryName })
        .eq('id', editingId)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName }])
      error = insertError
    }
    
    if (error) {
      alert('Error saving category')
    } else {
      setIsCreating(false)
      setEditingId(null)
      setNewCategoryName('')
      fetchCategories()
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setNewCategoryName(category.name)
    setIsCreating(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure? This will delete the category and ALL linked foods!')) return

    // Delete associated foods first
    const { error: foodError } = await supabase
      .from('foods')
      .delete()
      .eq('category_id', id)

    if (foodError) {
      console.error('Error deleting foods:', foodError)
      alert('Error deleting associated foods')
      return
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    
    if (error) {
      alert('Error deleting category')
    } else {
      fetchCategories()
    }
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => {
            setIsCreating(true)
            setEditingId(null)
            setNewCategoryName('')
          }}
          className="flex items-center gap-2 rounded-xl bg-brand-red px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-700 hover:shadow-lg transition-all"
        >
          <Plus className="h-5 w-5" />
          Add Category
        </button>
      </div>

      {isCreating && (
        <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Category Name"
              className="rounded-xl border border-gray-200 p-3 w-full focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                setIsCreating(false)
                setEditingId(null)
                setNewCategoryName('')
              }}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-green-700 hover:shadow-lg transition-all"
            >
              <Check className="h-4 w-4" /> {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="text-gray-500">No categories found.</p>
        ) : (
          categories.map((category) => (
            <div 
              key={category.id} 
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
              onClick={() => onSelect?.(category)}
            >
              <div className="flex items-center justify-between p-5">
                <h3 className="font-bold text-lg text-brand-charcoal group-hover:text-brand-red transition-colors">{category.name}</h3>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(category)
                    }}
                    className="rounded-full p-2 text-gray-400 hover:bg-brand-yellow/10 hover:text-brand-yellow transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(category.id)
                    }}
                    className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
