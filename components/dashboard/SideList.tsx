'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { Side } from '@/types'
import { Plus, Trash2, X, Check, Edit2 } from 'lucide-react'

export function SideList() {
  const [sides, setSides] = useState<Side[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    type: 'side',
    image_url: ''
  })

  useEffect(() => {
    fetchSides()
  }, [])

  const fetchSides = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sides')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) console.error('Error fetching sides:', error)
    else setSides(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.price) return

    const payload = {
      name: formData.name,
      price: parseFloat(formData.price),
      type: formData.type,
      image_url: formData.image_url
    }

    let error
    if (editingId) {
      const { error: updateError } = await supabase
        .from('sides')
        .update(payload)
        .eq('id', editingId)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('sides')
        .insert([payload])
      error = insertError
    }
    
    if (error) {
      alert('Error saving side')
    } else {
      setIsCreating(false)
      setEditingId(null)
      setFormData({ name: '', price: '', type: 'side', image_url: '' })
      fetchSides()
    }
  }

  const handleEdit = (side: Side) => {
    setEditingId(side.id)
    setFormData({
      name: side.name,
      price: side.price.toString(),
      type: side.type || 'side',
      image_url: side.image_url || ''
    })
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
    if (!confirm('Are you sure?')) return

    const { error } = await supabase
      .from('sides')
      .delete()
      .eq('id', id)
    
    if (error) {
      alert('Error deleting side')
    } else {
      fetchSides()
    }
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => {
            setIsCreating(true)
            setEditingId(null)
            setFormData({ name: '', price: '', type: 'side', image_url: '' })
          }}
          className="flex items-center gap-2 rounded-xl bg-brand-red px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-700 hover:shadow-lg transition-all"
        >
          <Plus className="h-5 w-5" />
          Add Side
        </button>
      </div>

      {isCreating && (
        <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              placeholder="Side Name"
              className="rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
            <input
              type="number"
              placeholder="Price"
              className="rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
            />
            <select
              className="rounded-xl border border-gray-200 p-3 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="side">Side</option>
              <option value="protein">Protein</option>
              <option value="drink">Drink</option>
              <option value="extra">Extra</option>
            </select>
            <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-brand-red/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-red hover:file:bg-brand-red/20 transition-colors"
                />
                {uploading && <span className="text-xs text-brand-red">Uploading...</span>}
            </div>
          </div>
          {formData.image_url && (
            <div className="mt-4">
                <img src={formData.image_url} alt="Preview" className="h-24 w-24 rounded-xl object-cover shadow-sm" />
            </div>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                setIsCreating(false)
                setEditingId(null)
                setFormData({ name: '', price: '', type: 'side', image_url: '' })
              }}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-green-700 hover:shadow-lg disabled:opacity-50 transition-all"
            >
              <Check className="h-4 w-4" /> {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/50 text-gray-500 font-bold uppercase tracking-wider text-xs border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Image</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center">Loading...</td></tr>
            ) : sides.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center">No sides found.</td></tr>
            ) : (
              sides.map((side) => (
                <tr key={side.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    {side.image_url ? (
                        <img src={side.image_url} alt={side.name} className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                        <div className="h-10 w-10 rounded-md bg-gray-100" />
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium">{side.name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                      {side.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">₦{Number(side.price).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleEdit(side)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(side.id)}
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
