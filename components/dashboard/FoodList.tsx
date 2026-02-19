'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Food, Category, Side } from '@/types'
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react'

export function FoodList({ selectedCategoryId }: { selectedCategoryId?: number | null }) {
  const [foods, setFoods] = useState<Food[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [sides, setSides] = useState<Side[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    category_id: '',
    is_available: true
  })
  const [selectedSides, setSelectedSides] = useState<number[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [foodsRes, catsRes, sidesRes] = await Promise.all([
      supabase.from('foods').select('*, categories(name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*'),
      supabase.from('sides').select('*')
    ])
    
    if (foodsRes.error) console.error('Error fetching foods:', foodsRes.error)
    else setFoods(foodsRes.data || [])

    if (catsRes.error) console.error('Error fetching categories:', catsRes.error)
    else setCategories(catsRes.data || [])

    if (sidesRes.error) console.error('Error fetching sides:', sidesRes.error)
    else setSides(sidesRes.data || [])
    
    setLoading(false)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.category_id) {
        alert('Please fill required fields')
        return
    }

    const payload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        image_url: formData.image_url,
        category_id: parseInt(formData.category_id),
        is_available: formData.is_available
    }

    let foodId = editingId
    let error

    if (editingId) {
        const { error: updateError } = await supabase
          .from('foods')
          .update(payload)
          .eq('id', editingId)
        error = updateError
    } else {
        const { data, error: insertError } = await supabase
          .from('foods')
          .insert([payload])
          .select()
          .single()
        
        if (data) foodId = data.id
        error = insertError
    }
    
    if (error) {
      alert('Error saving food: ' + error.message)
      return
    }

    // Handle Sides
    if (foodId) {
        const { error: deleteError } = await supabase
            .from('food_sides')
            .delete()
            .eq('food_id', foodId)
        
        if (!deleteError && selectedSides.length > 0) {
            const sideInserts = selectedSides.map(sideId => ({
                food_id: foodId,
                side_id: sideId
            }))
            
            await supabase
                .from('food_sides')
                .insert(sideInserts)
        }
    }

    setIsCreating(false)
    setEditingId(null)
    setFormData({
        name: '',
        description: '',
        price: '',
        image_url: '',
        category_id: '',
        is_available: true
    })
    setSelectedSides([])
    fetchData()
  }

  const handleEdit = async (food: Food) => {
    setEditingId(food.id)
    setFormData({
        name: food.name,
        description: food.description || '',
        price: food.price.toString(),
        image_url: food.image_url || '',
        category_id: food.category_id.toString(),
        is_available: food.is_available
    })

    const { data: foodSides } = await supabase
        .from('food_sides')
        .select('side_id')
        .eq('food_id', food.id)
    
    if (foodSides) {
        setSelectedSides(foodSides.map(fs => fs.side_id))
    } else {
        setSelectedSides([])
    }

    setIsCreating(true)
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from('food-images').getPublicUrl(filePath)
      
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }))
    } catch (error) {
      alert('Error uploading image!')
      console.log(error)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this food?')) return

    const { error } = await supabase
      .from('foods')
      .delete()
      .eq('id', id)
    
    if (error) {
      alert('Error deleting food')
    } else {
      fetchData()
    }
  }

  const toggleAvailability = async (id: number, current: boolean) => {
      const { error } = await supabase
        .from('foods')
        .update({ is_available: !current })
        .eq('id', id)
    
      if (!error) fetchData()
  }

  const filteredFoods = selectedCategoryId
    ? foods.filter((food) => food.category_id === selectedCategoryId)
    : foods

  const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
            {selectedCategoryId && (
                <div className="flex items-center gap-2 rounded-full bg-brand-yellow/10 px-4 py-1.5 text-sm text-brand-charcoal border border-brand-yellow/20">
                    <span className="font-medium">Category: {selectedCategoryName}</span>
                </div>
            )}
        </div>
        <button
          onClick={() => {
            setIsCreating(true)
            setEditingId(null)
            setFormData({
                name: '',
                description: '',
                price: '',
                image_url: '',
                category_id: selectedCategoryId ? selectedCategoryId.toString() : '',
                is_available: true
            })
            setSelectedSides([])
          }}
          className="flex items-center gap-2 rounded-xl bg-brand-red px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-700 hover:shadow-lg transition-all"
        >
          <Plus className="h-5 w-5" />
          Add Food
        </button>
      </div>

      {isCreating && (
        <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <input
              type="text"
              placeholder="Food Name"
              className="rounded-md border p-2"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
             <select
              className="rounded-md border p-2"
              value={formData.category_id}
              onChange={(e) => setFormData({...formData, category_id: e.target.value})}
            >
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input
              type="number"
              placeholder="Price"
              className="rounded-md border p-2"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
            />
            <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploading && <span className="text-xs text-blue-500">Uploading...</span>}
            </div>
            <input
              type="text"
              placeholder="Description"
              className="rounded-md border p-2 md:col-span-2"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          
          <div className="mt-6 border-t pt-4">
            <h4 className="mb-3 text-sm font-medium text-gray-900">Select Sides & Add-ons</h4>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {['side', 'protein', 'drink', 'extra'].map(type => {
                    const typeSides = sides.filter(s => (s.type || 'side') === type)
                    if (typeSides.length === 0) return null
                    return (
                        <div key={type} className="space-y-2">
                            <h5 className="text-xs font-semibold uppercase text-gray-500">{type}s</h5>
                            <div className="space-y-1">
                                {typeSides.map(side => (
                                    <label key={side.id} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selectedSides.includes(side.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedSides(prev => [...prev, side.id])
                                                } else {
                                                    setSelectedSides(prev => prev.filter(id => id !== side.id))
                                                }
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>{side.name} (+₦{side.price})</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
          </div>

          {formData.image_url && (
            <div className="mt-2">
                <img src={formData.image_url} alt="Preview" className="h-20 w-20 rounded-md object-cover" />
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                setIsCreating(false)
                setEditingId(null)
              }}
              className="flex items-center gap-1 rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={uploading}
              className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/50 text-gray-500 font-bold uppercase tracking-wider text-xs border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Image</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Available</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center">Loading...</td></tr>
            ) : filteredFoods.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center">No foods found.</td></tr>
            ) : (
              filteredFoods.map((food) => (
                <tr key={food.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="h-10 w-10 rounded bg-gray-100 overflow-hidden">
                        {food.image_url && <img src={food.image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{food.name}</td>
                  <td className="px-6 py-4 text-gray-500">{food.categories?.name || '-'}</td>
                  <td className="px-6 py-4">₦{Number(food.price).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <button 
                        onClick={() => toggleAvailability(food.id, food.is_available)}
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                            food.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                    >
                        {food.is_available ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                         <button 
                            onClick={() => handleEdit(food)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                         <button 
                            onClick={() => handleDelete(food.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                     </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
