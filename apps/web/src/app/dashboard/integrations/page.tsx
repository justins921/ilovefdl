'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Store,
  ArrowRight,
  Link2,
  Unlink,
  RefreshCw,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Package,
  ArrowLeftRight,
  ShoppingBag,
  Check,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatDate } from '@/lib/utils';
import type {
  ConnectionStatus,
  ExternalProduct,
  ImportResult,
  SyncResult,
  Vendor,
} from '@ilovefdl/shared';
import { ExternalPlatform } from '@ilovefdl/shared';

type IntegrationPlatform =
  | typeof ExternalPlatform.SHOPIFY
  | typeof ExternalPlatform.SQUARE
  | typeof ExternalPlatform.ETSY;

// ─── Platform branding ─────────────────────────────────

const PLATFORM_META: Record<
  string,
  { label: string; color: string; bgColor: string; description: string }
> = {
  SHOPIFY: {
    label: 'Shopify',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    description:
      'Connect your Shopify store to import products and keep inventory in sync.',
  },
  SQUARE: {
    label: 'Square',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    description:
      'Link your Square catalog to import items and sync inventory counts.',
  },
  ETSY: {
    label: 'Etsy',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    description:
      'Connect your Etsy shop to bring listings into the FDL marketplace.',
  },
};

type ModalView = 'none' | 'connect' | 'import' | 'sync';

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [modalView, setModalView] = useState<ModalView>('none');
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Import state
  const [externalProducts, setExternalProducts] = useState<
    (ExternalProduct & { alreadyImported: boolean })[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fetchingProducts, setFetchingProducts] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncDirection, setSyncDirection] = useState<'pull' | 'push' | 'both'>(
    'both',
  );
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // ─── Data fetching ──────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const tokenStr = localStorage.getItem('ilovefdl_token');
      if (tokenStr) api.setToken(tokenStr);

      const vendorsRes = await api.getVendors({ limit: 100 });
      const myVendor = vendorsRes.data.find((v) => v.userId === user.id);

      if (myVendor) {
        setVendor(myVendor);
        const connRes = await api.getIntegrationConnections();
        setConnections(connRes.data);
      }
    } catch {
      setError('Failed to load integrations.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Connect flow ─────────────────────────────────────

  function openConnect(platform: string) {
    setActivePlatform(platform);
    setShopDomain('');
    setModalView('connect');
    setError(null);
    setSuccess(null);
  }

  async function handleConnect() {
    if (!activePlatform) return;
    setConnecting(true);
    setError(null);

    try {
      const res = await api.connectPlatform({
        platform: activePlatform as IntegrationPlatform,
        shopDomain: activePlatform === 'SHOPIFY' ? shopDomain : undefined,
      });

      if (res.data.authUrl) {
        // Redirect to OAuth provider
        window.location.href = res.data.authUrl;
        return;
      }

      if (res.data.connected) {
        setSuccess(`${PLATFORM_META[activePlatform]?.label} connected!`);
        setModalView('none');
        await fetchData();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setError(msg);
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect(platform: string) {
    setDisconnecting(platform);
    setError(null);

    try {
      await api.disconnectPlatform({
        platform: platform as IntegrationPlatform,
      });
      setSuccess(`${PLATFORM_META[platform]?.label} disconnected.`);
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Disconnect failed';
      setError(msg);
    } finally {
      setDisconnecting(null);
    }
  }

  // ─── Import flow ──────────────────────────────────────

  async function openImport(platform: string) {
    setActivePlatform(platform);
    setExternalProducts([]);
    setSelectedIds(new Set());
    setImportResult(null);
    setModalView('import');
    setError(null);
    setSuccess(null);
    setFetchingProducts(true);

    try {
      const res = await api.getExternalProducts(platform);
      setExternalProducts(res.data);
      // Pre-select products that aren't already imported
      setSelectedIds(
        new Set(res.data.filter((p) => !p.alreadyImported).map((p) => p.externalId)),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(msg);
    } finally {
      setFetchingProducts(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const importable = externalProducts.filter((p) => !p.alreadyImported);
    if (selectedIds.size === importable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(importable.map((p) => p.externalId)));
    }
  }

  async function handleImport() {
    if (!activePlatform || selectedIds.size === 0) return;
    setImporting(true);
    setImportResult(null);
    setError(null);

    try {
      const res = await api.importProducts({
        platform: activePlatform as IntegrationPlatform,
        externalProductIds: Array.from(selectedIds),
      });
      setImportResult(res.data);
      setSuccess(
        `Imported ${res.data.imported} product${res.data.imported !== 1 ? 's' : ''}, updated ${res.data.updated}.`,
      );
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setError(msg);
    } finally {
      setImporting(false);
    }
  }

  // ─── Sync flow ────────────────────────────────────────

  function openSync(platform: string) {
    setActivePlatform(platform);
    setSyncDirection('both');
    setSyncResult(null);
    setModalView('sync');
    setError(null);
    setSuccess(null);
  }

  async function handleSync() {
    if (!activePlatform) return;
    setSyncing(true);
    setSyncResult(null);
    setError(null);

    try {
      const res = await api.syncInventory({
        platform: activePlatform as IntegrationPlatform,
        direction: syncDirection,
      });
      setSyncResult(res.data);
      setSuccess(
        `Synced ${res.data.synced} item${res.data.synced !== 1 ? 's' : ''} (${syncDirection}).`,
      );
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setError(msg);
    } finally {
      setSyncing(false);
    }
  }

  // ─── Loading / no vendor states ────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="grid md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-64 bg-white rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center max-w-md">
          <Store className="w-16 h-16 text-primary/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-3">
            No Vendor Profile
          </h1>
          <p className="text-primary/60 mb-6">
            You need a vendor profile to manage integrations.
          </p>
          <Link href="/auth" className="btn-primary">
            Apply to Sell
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── Main Render ───────────────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-1">
                Integrations
              </h1>
              <p className="text-primary/60">
                Connect your existing stores to import products and sync
                inventory
              </p>
            </div>
            <Link href="/dashboard" className="btn-outline text-sm">
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banners */}
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
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{success}</span>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-400 hover:text-green-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Platform Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {connections.map((conn) => {
            const meta = PLATFORM_META[conn.platform];
            if (!meta) return null;

            return (
              <div
                key={conn.platform}
                className="bg-white rounded-xl border border-light overflow-hidden"
              >
                {/* Card Header */}
                <div className={`px-6 py-4 ${meta.bgColor} border-b border-light`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-bold ${meta.color}`}>
                      {meta.label}
                    </h3>
                    {conn.isConnected ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        Not Connected
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-6 py-5">
                  <p className="text-sm text-primary/60 mb-4">
                    {meta.description}
                  </p>

                  {conn.isConnected && (
                    <div className="space-y-2 mb-4">
                      {conn.shopDomain && (
                        <div className="flex items-center gap-2 text-xs text-primary/50">
                          <Link2 className="w-3 h-3" />
                          {conn.shopDomain}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-primary/50">
                        <Package className="w-3 h-3" />
                        {conn.productCount} imported product
                        {conn.productCount !== 1 ? 's' : ''}
                      </div>
                      {conn.lastSyncAt && (
                        <div className="flex items-center gap-2 text-xs text-primary/50">
                          <RefreshCw className="w-3 h-3" />
                          Last synced {formatDate(conn.lastSyncAt)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    {conn.isConnected ? (
                      <>
                        <button
                          onClick={() => openImport(conn.platform)}
                          className="w-full btn-primary text-sm justify-center"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Import Products
                        </button>
                        <button
                          onClick={() => openSync(conn.platform)}
                          className="w-full btn-outline text-sm justify-center"
                        >
                          <ArrowLeftRight className="w-4 h-4 mr-2" />
                          Sync Inventory
                        </button>
                        <button
                          onClick={() => handleDisconnect(conn.platform)}
                          disabled={disconnecting === conn.platform}
                          className="w-full flex items-center justify-center px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          {disconnecting === conn.platform ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Unlink className="w-4 h-4 mr-2" />
                          )}
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openConnect(conn.platform)}
                        className="w-full btn-primary text-sm justify-center"
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Connect {meta.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* How It Works */}
        <div className="mt-10 bg-white rounded-xl border border-light p-8">
          <h2 className="text-lg font-bold text-primary mb-4">
            How Inventory Sync Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center mb-3">
                <Link2 className="w-5 h-5 text-teal" />
              </div>
              <h3 className="font-semibold text-primary mb-1">
                1. Connect Your Store
              </h3>
              <p className="text-sm text-primary/60">
                Authorize access to your Shopify, Square, or Etsy account via
                secure OAuth.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center mb-3">
                <Download className="w-5 h-5 text-teal" />
              </div>
              <h3 className="font-semibold text-primary mb-1">
                2. Import Products
              </h3>
              <p className="text-sm text-primary/60">
                Choose which products to bring into the FDL marketplace.
                Existing products can be updated.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center mb-3">
                <ArrowLeftRight className="w-5 h-5 text-teal" />
              </div>
              <h3 className="font-semibold text-primary mb-1">
                3. Keep Inventory in Sync
              </h3>
              <p className="text-sm text-primary/60">
                Pull changes from your store, push updates back, or sync
                both ways to prevent overselling.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Connect Modal ──────────────────────────────────── */}
      {modalView === 'connect' && activePlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={() => setModalView('none')}
          />
          <div className="relative bg-white rounded-xl border border-light shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-light flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">
                Connect {PLATFORM_META[activePlatform]?.label}
              </h2>
              <button
                onClick={() => setModalView('none')}
                className="p-2 rounded-lg text-primary/50 hover:text-primary hover:bg-light transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-primary/60">
                {PLATFORM_META[activePlatform]?.description}
              </p>

              {activePlatform === 'SHOPIFY' && (
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    Shopify Store Domain
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                      placeholder="my-store"
                      className="input-field flex-1"
                    />
                    <span className="text-sm text-primary/40 whitespace-nowrap">
                      .myshopify.com
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setModalView('none')}
                  className="px-5 py-2.5 text-sm font-medium text-primary/60 hover:text-primary rounded-lg hover:bg-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={
                    connecting ||
                    (activePlatform === 'SHOPIFY' && !shopDomain.trim())
                  }
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Import Modal ──────────────────────────────────── */}
      {modalView === 'import' && activePlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={() => !importing && setModalView('none')}
          />
          <div className="relative bg-white rounded-xl border border-light shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-light flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-primary">
                Import from {PLATFORM_META[activePlatform]?.label}
              </h2>
              <button
                onClick={() => !importing && setModalView('none')}
                className="p-2 rounded-lg text-primary/50 hover:text-primary hover:bg-light transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {fetchingProducts ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary/30 mx-auto mb-3" />
                  <p className="text-sm text-primary/50">
                    Fetching products from{' '}
                    {PLATFORM_META[activePlatform]?.label}...
                  </p>
                </div>
              ) : importResult ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">
                        Import Complete
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-green-600 font-bold text-lg">
                          {importResult.imported}
                        </p>
                        <p className="text-green-700">New</p>
                      </div>
                      <div>
                        <p className="text-blue-600 font-bold text-lg">
                          {importResult.updated}
                        </p>
                        <p className="text-blue-700">Updated</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-bold text-lg">
                          {importResult.skipped}
                        </p>
                        <p className="text-gray-700">Skipped</p>
                      </div>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-semibold text-red-700">
                          Errors
                        </span>
                      </div>
                      <ul className="text-xs text-red-600 space-y-1">
                        {importResult.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : externalProducts.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingBag className="w-10 h-10 text-primary/20 mx-auto mb-3" />
                  <p className="text-sm text-primary/50">
                    No products found on{' '}
                    {PLATFORM_META[activePlatform]?.label}.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Select all */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={toggleSelectAll}
                      className="text-sm text-teal hover:underline"
                    >
                      {selectedIds.size ===
                      externalProducts.filter((p) => !p.alreadyImported).length
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                    <span className="text-xs text-primary/40">
                      {selectedIds.size} selected of{' '}
                      {externalProducts.length} products
                    </span>
                  </div>

                  {/* Product list */}
                  <div className="space-y-2">
                    {externalProducts.map((product) => (
                      <div
                        key={product.externalId}
                        className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                          product.alreadyImported
                            ? 'border-light bg-light/50 opacity-60'
                            : selectedIds.has(product.externalId)
                              ? 'border-teal/30 bg-teal/5'
                              : 'border-light hover:border-primary/20'
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() =>
                            !product.alreadyImported &&
                            toggleSelect(product.externalId)
                          }
                          disabled={product.alreadyImported}
                          className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            product.alreadyImported
                              ? 'border-primary/20 bg-primary/5'
                              : selectedIds.has(product.externalId)
                                ? 'border-teal bg-teal text-white'
                                : 'border-primary/30 hover:border-teal'
                          }`}
                        >
                          {(selectedIds.has(product.externalId) ||
                            product.alreadyImported) && (
                            <Check className="w-3 h-3" />
                          )}
                        </button>

                        {/* Image */}
                        {product.images[0] ? (
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

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-primary truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-primary/50">
                            ${product.price.toFixed(2)} &middot;{' '}
                            {product.inventory} in stock
                            {product.sku && ` · SKU: ${product.sku}`}
                          </p>
                        </div>

                        {/* Status */}
                        {product.alreadyImported && (
                          <span className="text-xs text-primary/40 whitespace-nowrap">
                            Already imported
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-light flex items-center justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => !importing && setModalView('none')}
                className="px-5 py-2.5 text-sm font-medium text-primary/60 hover:text-primary rounded-lg hover:bg-light transition-colors"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {!importResult && !fetchingProducts && externalProducts.length > 0 && (
                <button
                  onClick={handleImport}
                  disabled={importing || selectedIds.size === 0}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Import {selectedIds.size} Product
                      {selectedIds.size !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Sync Modal ────────────────────────────────────── */}
      {modalView === 'sync' && activePlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={() => !syncing && setModalView('none')}
          />
          <div className="relative bg-white rounded-xl border border-light shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-light flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">
                Sync Inventory — {PLATFORM_META[activePlatform]?.label}
              </h2>
              <button
                onClick={() => !syncing && setModalView('none')}
                className="p-2 rounded-lg text-primary/50 hover:text-primary hover:bg-light transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {syncResult ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-green-800">Sync Complete</p>
                    <p className="text-sm text-green-600 mt-1">
                      {syncResult.synced} item
                      {syncResult.synced !== 1 ? 's' : ''} synced
                    </p>
                  </div>
                  {syncResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-semibold text-red-700">
                          Errors
                        </span>
                      </div>
                      <ul className="text-xs text-red-600 space-y-1">
                        {syncResult.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-primary/60">
                    Choose how to sync inventory between your FDL marketplace
                    products and your{' '}
                    {PLATFORM_META[activePlatform]?.label} store.
                  </p>

                  <div className="space-y-2">
                    {(
                      [
                        {
                          value: 'both' as const,
                          label: 'Two-Way Sync',
                          desc: 'Pull latest from platform, then push local changes back',
                        },
                        {
                          value: 'pull' as const,
                          label: 'Pull Only',
                          desc: 'Update FDL inventory from your external store',
                        },
                        {
                          value: 'push' as const,
                          label: 'Push Only',
                          desc: 'Update your external store from FDL inventory',
                        },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSyncDirection(opt.value)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                          syncDirection === opt.value
                            ? 'border-teal bg-teal/5'
                            : 'border-light hover:border-primary/20'
                        }`}
                      >
                        <p className="text-sm font-medium text-primary">
                          {opt.label}
                        </p>
                        <p className="text-xs text-primary/50 mt-0.5">
                          {opt.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => !syncing && setModalView('none')}
                  className="px-5 py-2.5 text-sm font-medium text-primary/60 hover:text-primary rounded-lg hover:bg-light transition-colors"
                >
                  {syncResult ? 'Close' : 'Cancel'}
                </button>
                {!syncResult && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Start Sync
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
