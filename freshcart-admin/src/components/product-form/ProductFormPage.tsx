import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Category, Product } from '@freshcart/types';
import { createProduct, getCategories } from '../../lib/api';
import { useToast } from '../ToastProvider';
import BasicInfoCard from './BasicInfoCard';
import PricingCard from './PricingCard';
import InventoryCard from './InventoryCard';
import ImageUploadCard from './ImageUploadCard';
import OrganizationCard from './OrganizationCard';
import StatusCard from './StatusCard';
import { EMPTY_PRODUCT_FORM } from './types';
import type { ProductFormData } from './types';

type SaveStatus = 'draft' | 'published';

export default function ProductFormPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_PRODUCT_FORM);
  const [saving, setSaving] = useState<SaveStatus | null>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(err => console.error('Error fetching categories:', err));
  }, []);

  const patch = (fields: Partial<ProductFormData>) => setFormData(prev => ({ ...prev, ...fields }));

  const canPublish = useMemo(() => {
    return (
      formData.name.trim() !== '' &&
      formData.price.trim() !== '' &&
      Number(formData.price) >= 0 &&
      formData.stockQuantity.trim() !== '' &&
      Number(formData.stockQuantity) >= 0 &&
      formData.categoryId !== ''
    );
  }, [formData]);

  async function handleSave(status: SaveStatus) {
    if (!formData.name.trim()) {
      showToast('Product name is required.', 'error');
      return;
    }
    if (status === 'published' && !canPublish) return;

    setSaving(status);
    try {
      const stockQuantity = formData.stockQuantity === '' ? 0 : Number(formData.stockQuantity);
      const payload: Partial<Product> = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: formData.price === '' ? 0 : Number(formData.price),
        compare_at_price: formData.compareAtPrice === '' ? null : Number(formData.compareAtPrice),
        stock_quantity: stockQuantity,
        low_stock_threshold: formData.lowStockThreshold === '' ? null : Number(formData.lowStockThreshold),
        category_id: formData.categoryId || null,
        unit: formData.unit || null,
        image_url: formData.imageUrl || undefined,
        in_stock: stockQuantity > 0,
        is_active: formData.isVisible,
        status,
      };
      await createProduct(payload);
      showToast(status === 'draft' ? 'Product saved as draft' : 'Product published', 'success');
      navigate('/products');
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('Failed to save product. See console for details.', 'error');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="product-form-page">
      <header className="pf-header">
        <button type="button" className="pf-breadcrumb" onClick={() => navigate('/products')}>
          <ArrowLeft size={13} /> Back to Products
        </button>
        <div className="pf-titlebar">
          <h1 className="pf-title">Add New Product</h1>
          <div className="pf-header-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={saving !== null}
              onClick={() => handleSave('draft')}
            >
              {saving === 'draft' ? 'Saving…' : 'Save as Draft'}
            </button>
            <button
              type="button"
              className="btn-primary pf-btn-publish"
              disabled={!canPublish || saving !== null}
              onClick={() => handleSave('published')}
            >
              {saving === 'published' ? 'Publishing…' : 'Publish Product'}
            </button>
          </div>
        </div>
      </header>

      <div className="pf-body">
        <div className="pf-grid">
          <div className="pf-col pf-col-main">
            <BasicInfoCard formData={formData} onChange={patch} />
            <PricingCard formData={formData} onChange={patch} />
            <InventoryCard formData={formData} onChange={patch} />
          </div>
          <div className="pf-col pf-col-side">
            <ImageUploadCard imageUrl={formData.imageUrl} onChange={url => patch({ imageUrl: url })} />
            <OrganizationCard formData={formData} categories={categories} onChange={patch} />
            <StatusCard isVisible={formData.isVisible} onChange={isVisible => patch({ isVisible })} />
          </div>
        </div>
      </div>
    </div>
  );
}
