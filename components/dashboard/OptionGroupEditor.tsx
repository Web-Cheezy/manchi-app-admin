'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Food,
  OptionGroup,
  OptionGroupInput,
  computeMenuDisplayPrice,
  formatNaira,
  parseFiniteNumber,
} from '@/types'
import { adminApi, AdminApiError } from '@/utils/adminApi'
import { Plus, Trash2, X, Loader2, GripVertical, Save } from 'lucide-react'
import { Input } from '@/components/admin/ui/Field'

type Props = {
  food: Food
  onClose: () => void
  onDisplayPriceUpdated?: (foodId: number, displayPrice: number) => void
}

const emptyGroupForm = (foodId: number, displayOrder: number): OptionGroupInput => ({
  food_id: foodId,
  name: '',
  min_selections: 0,
  max_selections: 1,
  is_required: false,
  display_order: displayOrder,
})

function cloneGroups(groups: OptionGroup[]): OptionGroup[] {
  return groups.map((group) => ({
    ...group,
    sides: (group.sides ?? []).map((side) => ({ ...side })),
  }))
}

export function OptionGroupEditor({ food, onClose, onDisplayPriceUpdated }: Props) {
  const [groups, setGroups] = useState<OptionGroup[]>([])
  const [menuPrice, setMenuPrice] = useState<number>(
    parseFiniteNumber(food.display_price) ?? parseFiniteNumber(food.price) ?? 0
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasPricingChanges, setHasPricingChanges] = useState(false)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [groupForm, setGroupForm] = useState<OptionGroupInput>(() =>
    emptyGroupForm(food.id, 0)
  )
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [sideForms, setSideForms] = useState<Record<number, { name: string; price: string }>>({})

  const savedSnapshotRef = useRef<OptionGroup[]>([])
  const onDisplayPriceUpdatedRef = useRef(onDisplayPriceUpdated)
  onDisplayPriceUpdatedRef.current = onDisplayPriceUpdated

  const applySavedSnapshot = (nextGroups: OptionGroup[]) => {
    const cloned = cloneGroups(nextGroups)
    savedSnapshotRef.current = cloneGroups(nextGroups)
    setGroups(cloned)
  }

  const reloadGroupsSilent = useCallback(async () => {
    const data = await adminApi.getOptionGroups(food.id)
    const sorted = [...(data.option_groups || [])].sort(
      (a, b) => a.display_order - b.display_order
    )
    applySavedSnapshot(sorted)
    setHasPricingChanges(false)
    return sorted
  }, [food.id])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      try {
        const data = await adminApi.getOptionGroups(food.id)
        if (cancelled) return
        const sorted = [...(data.option_groups || [])].sort(
          (a, b) => a.display_order - b.display_order
        )
        applySavedSnapshot(sorted)
        setMenuPrice(parseFiniteNumber(food.display_price) ?? parseFiniteNumber(food.price) ?? 0)
        setHasPricingChanges(false)
      } catch (err) {
        if (!cancelled) {
          console.error(err)
          alert(err instanceof AdminApiError ? err.message : 'Failed to load option groups')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [food.id, food.display_price, food.price])

  const resetGroupForm = () => {
    setGroupForm(emptyGroupForm(food.id, groups.length))
    setEditingGroupId(null)
    setShowGroupForm(false)
  }

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      alert('Group name is required')
      return
    }
    setSaving(true)
    try {
      if (editingGroupId) {
        await adminApi.updateOptionGroup(editingGroupId, groupForm)
      } else {
        await adminApi.createOptionGroup(groupForm)
      }
      resetGroupForm()
      await reloadGroupsSilent()
    } catch (err) {
      alert(err instanceof AdminApiError ? err.message : 'Failed to save group')
    } finally {
      setSaving(false)
    }
  }

  const handleEditGroup = (group: OptionGroup) => {
    setEditingGroupId(group.id)
    setGroupForm({
      food_id: food.id,
      name: group.name,
      min_selections: group.min_selections,
      max_selections: group.max_selections,
      is_required: group.is_required,
      display_order: group.display_order,
      default_side_id: group.default_side_id,
    })
    setShowGroupForm(true)
  }

  const handleDeleteGroup = async (id: number) => {
    if (!confirm('Delete this option group? Sides will be unlinked.')) return
    setSaving(true)
    try {
      await adminApi.deleteOptionGroup(id)
      await reloadGroupsSilent()
      const result = await adminApi.refreshDisplayPrice(food.id)
      const next = parseFiniteNumber(result.display_price)
      if (next !== null) {
        setMenuPrice(next)
        onDisplayPriceUpdatedRef.current?.(food.id, next)
      }
    } catch (err) {
      alert(err instanceof AdminApiError ? err.message : 'Failed to delete group')
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefaultSide = (groupId: number, sideId: number | null) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, default_side_id: sideId } : g))
    )
    setHasPricingChanges(true)
  }

  const handleSidePriceChange = (sideId: number, price: number) => {
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        sides: (group.sides ?? []).map((side) =>
          side.id === sideId ? { ...side, price } : side
        ),
      }))
    )
    setHasPricingChanges(true)
  }

  const handleUpdateMenuPrice = async () => {
    setSaving(true)
    try {
      const saved = savedSnapshotRef.current

      for (const group of groups) {
        const savedGroup = saved.find((g) => g.id === group.id)
        const savedDefault = savedGroup?.default_side_id ?? null
        const nextDefault = group.default_side_id ?? null
        if (Number(savedDefault) !== Number(nextDefault)) {
          await adminApi.setGroupDefaultSide(group.id, nextDefault)
        }
      }

      for (const group of groups) {
        const savedGroup = saved.find((g) => g.id === group.id)
        for (const side of group.sides ?? []) {
          const savedSide = savedGroup?.sides?.find((s) => s.id === side.id)
          const savedPrice = parseFiniteNumber(savedSide?.price)
          const nextPrice = parseFiniteNumber(side.price)
          if (savedPrice !== null && nextPrice !== null && savedPrice !== nextPrice) {
            await adminApi.updateSide({ id: side.id, price: nextPrice })
          }
        }
      }

      const result = await adminApi.refreshDisplayPrice(food.id)
      const fromServer = parseFiniteNumber(result.display_price)
      const fromGroups = computeMenuDisplayPrice(food.price, groups)
      const next = fromServer ?? fromGroups
      setMenuPrice(next)
      onDisplayPriceUpdatedRef.current?.(food.id, next)

      await reloadGroupsSilent()
    } catch (err) {
      alert(err instanceof AdminApiError ? err.message : 'Failed to update menu price')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSide = async (groupId: number) => {
    const form = sideForms[groupId] || { name: '', price: '' }
    if (!form.name.trim() || !form.price) {
      alert('Side name and price are required')
      return
    }
    setSaving(true)
    try {
      await adminApi.createSide({
        name: form.name.trim(),
        price: parseFloat(form.price),
        option_group_id: groupId,
      })
      setSideForms((prev) => ({ ...prev, [groupId]: { name: '', price: '' } }))
      await reloadGroupsSilent()
    } catch (err) {
      alert(err instanceof AdminApiError ? err.message : 'Failed to add side')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Customization &amp; menu pricing
            </p>
            <h2 className="text-xl font-bold text-brand-charcoal">{food.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-gray-500">
                Base: <strong className="text-brand-charcoal">{formatNaira(food.price)}</strong>
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">
                Menu price:{' '}
                <strong className="text-brand-red">{formatNaira(menuPrice)}</strong>
              </span>
              <button
                type="button"
                onClick={handleUpdateMenuPrice}
                disabled={saving || !hasPricingChanges}
                className="inline-flex items-center gap-1 rounded-lg border border-brand-red/30 bg-brand-red/5 px-2.5 py-1 text-xs font-semibold text-brand-red hover:bg-brand-red/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-3 w-3" />
                {saving ? 'Updating…' : 'Update'}
              </button>
              {hasPricingChanges && (
                <span className="text-xs font-medium text-amber-600">Unsaved pricing changes</span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Menu price = base + each group&apos;s included option. Pick one per group, then click Update.
              For optional add-ons, choose &quot;None&quot; so they stay separate from the menu price.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
            </div>
          ) : (
            <>
              {groups.length === 0 && !showGroupForm && (
                <p className="text-center text-sm text-gray-500 py-8">
                  No option groups yet. Add groups like Protein, Packaging, or Drinks.
                </p>
              )}

              {groups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-1 h-4 w-4 text-gray-300" />
                      <div>
                        <h3 className="font-bold text-brand-charcoal">{group.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Pick {group.min_selections}–{group.max_selections}
                          {group.is_required ? ' · Required' : ' · Optional'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditGroup(group)}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        disabled={saving}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {(group.sides || []).length > 0 && (
                    <div className="mb-3 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-800 mb-2">
                        Included in menu price
                      </p>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                          <input
                            type="radio"
                            name={`default-${group.id}`}
                            checked={group.default_side_id == null}
                            disabled={saving}
                            onChange={() => handleSetDefaultSide(group.id, null)}
                          />
                          None (not included in menu price)
                        </label>
                        {(group.sides || []).map((side) => (
                          <label
                            key={side.id}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={`default-${group.id}`}
                              checked={Number(group.default_side_id) === Number(side.id)}
                              disabled={saving}
                              onChange={() => handleSetDefaultSide(group.id, side.id)}
                            />
                            <span className="font-medium text-brand-charcoal">{side.name}</span>
                            <span className="text-gray-500">{formatNaira(side.price)}</span>
                            {side.is_pricing_default && (
                              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-800">
                                Default
                              </span>
                            )}
                            {typeof side.price_delta === 'number' && side.price_delta > 0 && (
                              <span className="text-xs text-gray-400">
                                (+{formatNaira(side.price_delta)} vs default)
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <ul className="mb-3 space-y-2">
                    {(group.sides || []).map((side) => (
                      <li
                        key={side.id}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm border border-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{side.name}</span>
                          {Number(group.default_side_id) === Number(side.id) && (
                            <span className="text-[10px] font-bold uppercase text-brand-red">
                              In menu price
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">₦</span>
                          <input
                            type="number"
                            value={side.price}
                            className="w-20 rounded border px-2 py-1 text-right text-sm"
                            onChange={(e) => {
                              const next = parseFloat(e.target.value)
                              if (!Number.isNaN(next)) {
                                handleSidePriceChange(side.id, next)
                              }
                            }}
                          />
                        </div>
                      </li>
                    ))}
                    {(group.sides || []).length === 0 && (
                      <li className="text-xs text-gray-400 italic px-1">No sides in this group</li>
                    )}
                  </ul>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Side name"
                      className="flex-1 rounded-lg border px-3 py-2 text-sm"
                      value={sideForms[group.id]?.name ?? ''}
                      onChange={(e) =>
                        setSideForms((prev) => ({
                          ...prev,
                          [group.id]: {
                            name: e.target.value,
                            price: prev[group.id]?.price ?? '',
                          },
                        }))
                      }
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      className="w-24 rounded-lg border px-3 py-2 text-sm"
                      value={sideForms[group.id]?.price ?? ''}
                      onChange={(e) =>
                        setSideForms((prev) => ({
                          ...prev,
                          [group.id]: {
                            name: prev[group.id]?.name ?? '',
                            price: e.target.value,
                          },
                        }))
                      }
                    />
                    <button
                      onClick={() => handleAddSide(group.id)}
                      disabled={saving}
                      className="flex items-center gap-1 rounded-lg bg-brand-red px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                </div>
              ))}

              {showGroupForm ? (
                <div className="rounded-xl border-2 border-brand-red/20 bg-white p-4 space-y-3">
                  <h3 className="font-bold text-sm">
                    {editingGroupId ? 'Edit group' : 'New option group'}
                  </h3>
                  <Input
                    placeholder="Group name (e.g. Protein)"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Min selections</label>
                      <Input
                        type="number"
                        min={0}
                        value={groupForm.min_selections}
                        onChange={(e) =>
                          setGroupForm({
                            ...groupForm,
                            min_selections: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Max selections</label>
                      <Input
                        type="number"
                        min={1}
                        value={groupForm.max_selections}
                        onChange={(e) =>
                          setGroupForm({
                            ...groupForm,
                            max_selections: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={groupForm.is_required}
                      onChange={(e) =>
                        setGroupForm({ ...groupForm, is_required: e.target.checked })
                      }
                    />
                    Required group
                  </label>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={resetGroupForm}
                      className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveGroup}
                      disabled={saving}
                      className="rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : editingGroupId ? 'Update group' : 'Create group'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setGroupForm(emptyGroupForm(food.id, groups.length))
                    setEditingGroupId(null)
                    setShowGroupForm(true)
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-4 text-sm font-bold text-gray-500 hover:border-brand-red/40 hover:text-brand-red"
                >
                  <Plus className="h-4 w-4" /> Add option group
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
