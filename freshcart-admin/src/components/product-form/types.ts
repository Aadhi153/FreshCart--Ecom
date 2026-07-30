export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  compareAtPrice: string;
  stockQuantity: string;
  lowStockThreshold: string;
  categoryId: string;
  unit: string;
  imageUrl: string;
  isVisible: boolean;
}

export const EMPTY_PRODUCT_FORM: ProductFormData = {
  name: '',
  description: '',
  price: '',
  compareAtPrice: '',
  stockQuantity: '',
  lowStockThreshold: '',
  categoryId: '',
  unit: '',
  imageUrl: '',
  isVisible: true,
};

export const UNIT_OPTIONS = ['kg', 'g', 'l', 'ml', 'pcs', 'pack', 'dozen', 'box'];
