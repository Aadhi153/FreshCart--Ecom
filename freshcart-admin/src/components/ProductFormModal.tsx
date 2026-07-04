import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { createProduct, updateProduct, createCategory, uploadProductImage } from '../lib/api';
import type { Product, Category } from '@freshcart/types';
import { UploadCloud, Trash2 } from 'lucide-react';
import { useToast } from './ToastProvider';

const NEW_CATEGORY_VALUE = '__new__';

interface ProductFormModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onCategoryCreated: (category: Category) => void;
}

export default function ProductFormModal({ isOpen, editingProduct, categories, onClose, onSaved, onCategoryCreated }: ProductFormModalProps) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    image_url: '',
    in_stock: true,
    variants: [] as { name: string; price_adjustment: number; stock_quantity: number; image_url: string }[],
  });

  useEffect(() => {
    if (!isOpen) return;
    setUploadError('');
    setNewCategoryName('');
    if (editingProduct) {
      setFormData({
        name: editingProduct.name,
        description: editingProduct.description || '',
        category_id: editingProduct.category_id || '',
        image_url: editingProduct.image_url || '',
        in_stock: editingProduct.in_stock,
        variants: (editingProduct.variants || []).map(v => ({
          name: v.name,
          price_adjustment: v.price_adjustment,
          stock_quantity: v.stock_quantity,
          image_url: v.image_url || '',
        })),
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category_id: '',
        image_url: '',
        in_stock: true,
        variants: [{ name: '', price_adjustment: 0, stock_quantity: 10, image_url: '' }],
      });
    }
  }, [isOpen, editingProduct]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure at least one variant is provided before saving
    if (!formData.variants || formData.variants.length === 0) {
      showToast('Please add at least one variant before saving the product.', 'error');
      return;
    }
    if (formData.category_id === NEW_CATEGORY_VALUE && !newCategoryName.trim()) {
      showToast('Please enter a name for the new category.', 'error');
      return;
    }
    try {
      let categoryId = formData.category_id;
      if (categoryId === NEW_CATEGORY_VALUE) {
        const newCategory = await createCategory(newCategoryName);
        onCategoryCreated(newCategory);
        categoryId = newCategory.id!;
      }

      // No product-level price/stock inputs — the base product price comes from its
      // first (default) variant, and stock_quantity is the total across all variants.
      const productData: Partial<Product> = {
        name: formData.name,
        description: formData.description,
        category_id: categoryId || null,
        price: formData.variants[0].price_adjustment,
        image_url: formData.image_url || undefined,
        in_stock: formData.in_stock,
        stock_quantity: formData.variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0),
        variants: formData.variants,
      };

      if (editingProduct) {
        // editingProduct always comes from a loaded (already-persisted) row, so it always has an id —
        // ProductSchema.id is optional only because the same schema also covers pre-insert payloads.
        await updateProduct(editingProduct.id!, productData);
      } else {
        await createProduct(productData);
      }
      await onSaved();
      showToast(editingProduct ? 'Product updated' : 'Product created', 'success');
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('Failed to save product. See console for details.', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingProduct ? 'Edit Product' : 'Add New Product'}>
      <form onSubmit={handleSave}>
        <div className="form-group">
          <label>Product Name *</label>
          <input required type="text" className="form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Organic Carrots" />
        </div>
        <div className="form-group">
          <label>Description</label>
          <input type="text" className="form-input" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Short product description" />
        </div>
        <div className="form-group">
          <label>Category *</label>
          <select
            required
            className="form-input"
            value={formData.category_id}
            onChange={e => {
              setFormData({ ...formData, category_id: e.target.value });
              if (e.target.value !== NEW_CATEGORY_VALUE) setNewCategoryName('');
            }}
          >
            <option value="" disabled>Select a category</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value={NEW_CATEGORY_VALUE}>+ Add new category…</option>
          </select>
          {formData.category_id === NEW_CATEGORY_VALUE && (
            <input
              required
              autoFocus
              type="text"
              className="form-input"
              style={{ marginTop: '0.5rem' }}
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              placeholder="New category name, e.g. Bakery"
            />
          )}
        </div>
        <div className="form-group">
          <label>Product Image</label>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {formData.image_url ? (
              <img src={formData.image_url} alt="Preview" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)', flexShrink: 0 }} />
            )}
            <input
              type="url"
              className="form-input"
              style={{ flex: 1 }}
              value={formData.image_url}
              onChange={e => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--layer-1)', color: 'var(--text-primary)', cursor: uploading ? 'wait' : 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <UploadCloud size={16} />
              {uploading ? 'Uploading...' : 'Upload'}
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                style={{ display: 'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  setUploading(true);
                  setUploadError('');
                  try {
                    const url = await uploadProductImage(file);
                    setFormData(prev => ({ ...prev, image_url: url }));
                  } catch (err) {
                    console.error('Error uploading image:', err);
                    setUploadError('Failed to upload image. See console for details.');
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
          </div>
          {uploadError && <p style={{ fontSize: '0.8rem', color: 'var(--danger)', margin: '0.4rem 0 0' }}>{uploadError}</p>}
        </div>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <input type="checkbox" id="inStock" checked={formData.in_stock} onChange={e => setFormData({ ...formData, in_stock: e.target.checked })} />
          <label htmlFor="inStock" style={{ margin: 0, cursor: 'pointer' }}>In Stock / Available</label>
        </div>

        {/* Variants Section */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0 }}>Product Variants (e.g. Sizes, Colors)</h4>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, variants: [...formData.variants, { name: '', price_adjustment: 0, stock_quantity: 0, image_url: '' }] })}
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer' }}
            >
              + Add Variant
            </button>
          </div>

          {formData.variants.map((v, index) => (
            <div key={index} style={{ padding: '0.6rem', marginBottom: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '0.75rem' }}>Name (e.g. 500g)</label>
                <input type="text" required className="form-input" style={{ padding: '0.4rem' }} value={v.name} onChange={e => {
                  const newVariants = [...formData.variants];
                  newVariants[index].name = e.target.value;
                  setFormData({ ...formData, variants: newVariants });
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem' }}>Price</label>
                <input type="number" required step="0.01" min="0" className="form-input" style={{ padding: '0.4rem' }} value={v.price_adjustment} onChange={e => {
                  const newVariants = [...formData.variants];
                  newVariants[index].price_adjustment = Number(e.target.value);
                  setFormData({ ...formData, variants: newVariants });
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem' }}>Stock</label>
                <input type="number" required className="form-input" style={{ padding: '0.4rem' }} value={v.stock_quantity} onChange={e => {
                  const newVariants = [...formData.variants];
                  newVariants[index].stock_quantity = Number(e.target.value);
                  setFormData({ ...formData, variants: newVariants });
                }} />
              </div>
              <button type="button" onClick={() => {
                const newVariants = formData.variants.filter((_, i) => i !== index);
                setFormData({ ...formData, variants: newVariants });
              }} style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                <Trash2 size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
              {v.image_url ? (
                <img src={v.image_url} alt="Variant preview" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)', flexShrink: 0 }} />
              )}
              <input
                type="url"
                className="form-input"
                style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                value={v.image_url}
                onChange={e => {
                  const newVariants = [...formData.variants];
                  newVariants[index].image_url = e.target.value;
                  setFormData({ ...formData, variants: newVariants });
                }}
                placeholder="Variant image URL (optional)"
              />
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--layer-1)', color: 'var(--text-primary)', cursor: uploadingVariantIndex === index ? 'wait' : 'pointer', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                <UploadCloud size={14} />
                {uploadingVariantIndex === index ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingVariantIndex !== null}
                  style={{ display: 'none' }}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setUploadingVariantIndex(index);
                    try {
                      const url = await uploadProductImage(file);
                      setFormData(prev => {
                        const newVariants = [...prev.variants];
                        newVariants[index] = { ...newVariants[index], image_url: url };
                        return { ...prev, variants: newVariants };
                      });
                    } catch (err) {
                      console.error('Error uploading variant image:', err);
                      showToast('Failed to upload variant image. See console for details.', 'error');
                    } finally {
                      setUploadingVariantIndex(null);
                    }
                  }}
                />
              </label>
            </div>
            </div>
          ))}
          {formData.variants.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--danger)', fontStyle: 'italic', marginTop: '0.5rem' }}>At least one variant is required to create a product.</p>}
        </div>

        <div className="modal-footer" style={{ marginTop: '2rem' }}>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={formData.variants.length === 0}>Save Product</button>
        </div>
      </form>
    </Modal>
  );
}
