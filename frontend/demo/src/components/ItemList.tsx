import { useState } from 'react'
import { useItems } from '../hooks/useItems'
import type { ItemCreate } from '../types/item'

export function ItemList() {
  const { items, loading, error, createItem, deleteItem } = useItems()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const data: ItemCreate = { name: name.trim() }
    if (description.trim()) data.description = description.trim()

    setSubmitting(true)
    try {
      await createItem(data)
      setName('')
      setDescription('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>Items</h1>

      <form onSubmit={handleCreate} style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 1, padding: '0.5rem' }}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ flex: 2, padding: '0.5rem' }}
          />
          <button type="submit" disabled={submitting || !name.trim()} style={{ padding: '0.5rem 1rem' }}>
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!loading && !error && items.length === 0 && <p>No items yet. Create one above!</p>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item) => (
          <li
            key={item.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              marginBottom: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          >
            <div>
              <strong>{item.name}</strong>
              {item.description && (
                <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9em' }}>
                  {item.description}
                </p>
              )}
            </div>
            <button
              onClick={() => deleteItem(item.id)}
              style={{ padding: '0.25rem 0.75rem', color: 'red', cursor: 'pointer' }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
