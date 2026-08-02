import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import type { Category, Product } from '@freshcart/types';
import { ProductSchema } from '@freshcart/types';
import { getCategories } from '../../lib/api';
import { useCreateProduct } from '../../lib/queries/products';
import { useToast } from '../ToastProvider';
import BasicInfoCard from './BasicInfoCard';
import PricingCard from './PricingCard';
import InventoryCard from './InventoryCard';
import ImageUploadCard from './ImageUploadCard';
import OrganizationCard from './OrganizationCard';
import StatusCard from './StatusCard';

type SaveStatus = 'draft' | 'published';

export default function ProductFormPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState<SaveStatus | null>(null);
  const createProductMutation = useCreateProduct();

  useEffect(() => {
    getCategories().then(setCategories).catch(err => console.error('Error fetching categories:', err));
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<Product>({
    resolver: zodResolver(ProductSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      price: undefined,
      compare_at_price: undefined,
      stock_quantity: undefined,
      low_stock_threshold: undefined,
      category_id: undefined,
      unit: undefined,
      image_url: '',
      is_active: true,
      status: 'published',
    },
  });

  // "Publish requires a category" is admin-form business logic conditional on
  // which submit button was clicked -- not a rule ProductSchema itself should
  // carry, since category_id is legitimately optional for other consumers.
  const category = watch('category_id');
  const publishDisabled = !isValid || !category || saving !== null;

  async function onSubmit(data: Product, status: SaveStatus) {
    setSaving(status);
    try {
      const stockQuantity = data.stock_quantity ?? 0;
      const payload: Partial<Product> = {
        ...data,
        stock_quantity: stockQuantity,
        in_stock: stockQuantity > 0,
        status,
      };
      await createProductMutation.mutateAsync(payload);
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
              onClick={handleSubmit(data => onSubmit(data, 'draft'))}
            >
              {saving === 'draft' ? 'Saving…' : 'Save as Draft'}
            </button>
            <button
              type="button"
              className="btn-primary pf-btn-publish"
              disabled={publishDisabled}
              onClick={handleSubmit(data => onSubmit(data, 'published'))}
            >
              {saving === 'published' ? 'Publishing…' : 'Publish Product'}
            </button>
          </div>
        </div>
      </header>

      <div className="pf-body">
        <div className="pf-grid">
          <div className="pf-col pf-col-main">
            <BasicInfoCard register={register} errors={errors} />
            <PricingCard register={register} errors={errors} />
            <InventoryCard register={register} errors={errors} />
          </div>
          <div className="pf-col pf-col-side">
            <ImageUploadCard imageUrl={watch('image_url') || ''} onChange={url => setValue('image_url', url, { shouldValidate: true, shouldDirty: true })} />
            <OrganizationCard register={register} errors={errors} categories={categories} />
            <StatusCard isVisible={watch('is_active') ?? true} onChange={isVisible => setValue('is_active', isVisible, { shouldDirty: true })} />
          </div>
        </div>
      </div>
    </div>
  );
}
