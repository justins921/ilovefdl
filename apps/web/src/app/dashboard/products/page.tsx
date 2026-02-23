'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Package,
  Store,
  ArrowRight,
  ImagePlus,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatPrice, slugify } from '@/lib/utils';
import type { Product, Vendor } from '@ilovefdl/shared';
import { ExternalPlatform } from '@ilovefdl/shared';

interface ProductFormData {
  name: string;
  price: string;
  compareAtPrice: string;
  description: string;
  categoryTags: string;
  inventory: string;
  images: string[];
  isActive: boolean;
}

const emptyForm: ProductFormData = {
  name: '',
  price: '',
  compareAtPrice: '',
  description: '',
  categoryTags: '',
  inventory: '0',
  images: [''],
  isActive: true,
};

export default function ProductsPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const tokenStr = localStorage.getItem('ilovefdl_token');
      if (tokenStr) {
        api.setToken(tokenStr);
      }

      const vendorsRes = await api.getVendors({ limit: 100 });
      const myVendor = vendorsRes.data.find((v) => v.userId === user.id);

      if (myVendor) {
        setVendor(myVendor);
        const productsRes = await api.getProducts({
          vendorId: myVendor.id,
          limit: 100,
        });
        setProducts(productsRes.data);
      }
    } catch {
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Modal Helpers ───────────────────────────────────────

  function openAddModal() {
    setEditingProduct(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      price: String(product.price),
      compareAtPrice: product.compareAtPrice
        ? String(product.compareAtPrice)
        : '',
      description: product.description || '',
      categoryTags: product.categoryTags.join(', '),
      inventory: String(product.inventory),
      images:
        product.images.length > 0 ? [...product.images] : [''],
      isActive: product.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
    setFormError(null);
  }

  // ─── Form Field Handlers ─────────────────────────────────

  function updateField(field: keyof ProductFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateImage(index: number, value: string) {
    setForm((prev) => {
      const images = [...prev.images];
      images[index] = value;
      return { ...prev, images };
    });
  }

  function addImageField() {
    setForm((prev) => ({ ...prev, images: [...prev.images, ''] }));
  }

  function removeImageField(index: number) {
    setForm((prev) => {
      const images = prev.images.filter((_, i) => i !== index);
      return { ...prev, images: images.length === 0 ? [''] : images };
    });
  }

  // ─── Submit Handler ──────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    if (!name) {
      setFormError('Product name is required.');
      return;
    }

    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      setFormError('Please enter a valid price.');
      return;
    }

    const slug = slugify(name);
    if (slug.length < 2) {
      setFormError('Product name is too short to generate a valid slug.');
      return;
    }

    const compareAtPrice = form.compareAtPrice
      ? parseFloat(form.compareAtPrice)
      : undefined;
    if (compareAtPrice !== undefined && (isNaN(compareAtPrice) || compareAtPrice < 0)) {
      setFormError('Please enter a valid compare-at price.');
      return;
    }

    const inventory = parseInt(form.inventory, 10);
    if (isNaN(inventory) || inventory < 0) {
      setFormError('Please enter a valid inventory count.');
      return;
    }

    const images = form.images
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    const categoryTags = form.categoryTags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const payload = {
      name,
      slug,
      price,
      description: form.description.trim() || undefined,
      compareAtPrice: compareAtPrice ?? null,
      images,
      categoryTags,
      inventory,
      isActive: form.isActive,
      externalPlatform: ExternalPlatform.NATIVE,
    };

    setSaving(true);

    try {
      if (editingProduct) {
        const res = await api.updateProduct(editingProduct.id, payload);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? res.data : p))
        );
      } else {
        const res = await api.createProduct(payload);
        setProducts((prev) => [res.data, ...prev]);
      }
      closeModal();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong.';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete (Deactivate) Handler ─────────────────────────

  async function handleDelete(productId: string) {
    try {
      const res = await api.updateProduct(productId, { isActive: false });
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? res.data : p))
      );
    } catch {
      setError('Failed to deactivate product.');
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Loading State ───────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="h-12 bg-white rounded w-1/4" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── No Vendor State ─────────────────────────────────────

  if (!vendor) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center max-w-md">
          <Store className="w-16 h-16 text-primary/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-3">
            No Vendor Profile
          </h1>
          <p className="text-primary/60 mb-6">
            You need a vendor profile to manage products. Apply to become a
            vendor on the I Love FDL marketplace.
          </p>
          <a href="/auth" className="btn-primary">
            Apply to Sell
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </div>
      </div>
    );
  }

  // ─── Main Render ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-1">
                My Products
              </h1>
              <p className="text-primary/60">
                Manage your product listings for {vendor.businessName}
              </p>
            </div>
            <button onClick={openAddModal} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Products Table */}
        {products.length > 0 ? (
          <div className="bg-white rounded-xl border border-light overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-light">
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Product
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Price
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Inventory
                    </th>
                    <th className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Status
                    </th>
                    <th className="text-right text-xs font-semibold text-primary/50 uppercase tracking-wider px-6 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-light/50 transition-colors"
                    >
                      {/* Product info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-light flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 text-primary/20" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-primary truncate">
                              {product.name}
                            </p>
                            {product.categoryTags.length > 0 && (
                              <p className="text-xs text-primary/50 truncate mt-0.5">
                                {product.categoryTags.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-sm font-medium text-primary">
                            {formatPrice(product.price)}
                          </span>
                          {product.compareAtPrice != null &&
                            product.compareAtPrice > product.price && (
                              <span className="text-xs text-primary/40 line-through ml-2">
                                {formatPrice(product.compareAtPrice)}
                              </span>
                            )}
                        </div>
                      </td>

                      {/* Inventory */}
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-medium ${
                            product.inventory === 0
                              ? 'text-red-500'
                              : product.inventory <= 5
                                ? 'text-yellow-600'
                                : 'text-primary'
                          }`}
                        >
                          {product.inventory}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {product.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal/10 text-teal">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 rounded-lg text-primary/50 hover:text-accent hover:bg-accent/10 transition-colors"
                            title="Edit product"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {deletingId === product.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="px-2 py-1 text-xs font-medium text-primary/50 bg-light rounded hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(product.id)}
                              className="p-2 rounded-lg text-primary/50 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Deactivate product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-xl border border-light p-16 text-center">
            <Package className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-primary mb-2">
              No products yet
            </h2>
            <p className="text-primary/60 mb-6 max-w-md mx-auto">
              Start building your catalog by adding your first product. Products
              will appear on your storefront and in the marketplace.
            </p>
            <button onClick={openAddModal} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Product
            </button>
          </div>
        )}
      </div>

      {/* ─── Modal ───────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-xl border border-light shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-light px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-lg font-bold text-primary">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-primary/50 hover:text-primary hover:bg-light transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Product Name <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Organic Honey Jar"
                  className="input-field"
                  required
                />
                {form.name.trim() && (
                  <p className="text-xs text-primary/40 mt-1">
                    Slug: {slugify(form.name.trim())}
                  </p>
                )}
              </div>

              {/* Price + Compare At Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    Price ($) <span className="text-accent">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => updateField('price', e.target.value)}
                    placeholder="0.00"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    Compare At Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.compareAtPrice}
                    onChange={(e) =>
                      updateField('compareAtPrice', e.target.value)
                    }
                    placeholder="Original price"
                    className="input-field"
                  />
                  <p className="text-xs text-primary/40 mt-1">
                    Optional. Shows as the original price when on sale.
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe your product..."
                  rows={4}
                  className="input-field resize-none"
                />
              </div>

              {/* Category Tags */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Category Tags
                </label>
                <input
                  type="text"
                  value={form.categoryTags}
                  onChange={(e) => updateField('categoryTags', e.target.value)}
                  placeholder="e.g. honey, organic, local"
                  className="input-field"
                />
                <p className="text-xs text-primary/40 mt-1">
                  Separate tags with commas.
                </p>
              </div>

              {/* Inventory */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Inventory
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.inventory}
                  onChange={(e) => updateField('inventory', e.target.value)}
                  placeholder="0"
                  className="input-field"
                />
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Images
                </label>
                <div className="space-y-2">
                  {form.images.map((url, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateImage(index, e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="input-field"
                      />
                      {form.images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeImageField(index)}
                          className="p-2 rounded-lg text-primary/40 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addImageField}
                  className="mt-2 inline-flex items-center text-sm text-teal hover:text-teal/80 transition-colors"
                >
                  <ImagePlus className="w-4 h-4 mr-1" />
                  Add another image
                </button>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateField('isActive', !form.isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.isActive ? 'bg-teal' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-primary">
                  {form.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-light">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-medium text-primary/60 hover:text-primary rounded-lg hover:bg-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingProduct ? (
                    'Update Product'
                  ) : (
                    'Create Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
