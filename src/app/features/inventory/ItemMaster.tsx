// =============================================================================
// ITEM MASTER (INVENTORY) FEATURE MODULE
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Package, 
  Tag, 
  Edit,
  Trash2,
  Send,
  ShoppingCart,
  Minus,
  X,
  ArrowDownToLine,
  FileText,
  Warehouse,
  Layers,
  MapPin,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useAuthContext } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { PaginationControls } from '@/app/components/ui/pagination-controls';
import { apiClient } from '@/hooks/useApi';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ApiItemStock {
  id: number;
  item_id: number;
  warehouse_id: number;
  bin_id: number | null;
  batch_id: string;
  expiry_date: string | null;
  manufacturing_year: number | null;
  quantity: number;
  warehouse?: ApiWarehouse;
  rack?: { id: number; code: string };
  bin?: { id: number; code: string };
}

interface ApiItem {
  id: number;
  item_sku: string;
  item_name: string;
  category_id: number;
  weight: string;
  storage_type?: number | null;
  qty_per_pallet?: number | null;
  qty_per_carton?: number | null;
  dimension_width?: number | string | null;
  dimension_height?: number | string | null;
  dimension_depth?: number | string | null;
  dimension_unit?: string | null;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
  category?: ApiCategory;
  stocks?: ApiItemStock[];
}

interface DisplayRow {
  item: ApiItem;
  stock: ApiItemStock | null;
  isFirstOfGroup: boolean;
  groupSize: number;
}

interface CartItem {
  item: ApiItem;
  stock: ApiItemStock;
  quantity: number;
}

interface InboundCartItem {
  item: ApiItem;
  quantity: number;
  expiry_date: string;
  maintenance_date: string;
  rack_id: string;
  manufacturing_year: string;
}

interface ApiCategory {
  id: number;
  name: string;
}

interface ApiRack {
  id: number;
  code: string;
  label: string;
}

interface ApiWarehouse {
  id: number;
  name: string;
}

interface ItemFormData {
  item_sku: string;
  item_name: string;
  category_id: string;
  weight: string;
  weight_unit: string;
  item_type: string;
  quantity_per_pallet: string;
  quantity_per_carton: string;
  dimension_width: string;
  dimension_height: string;
  dimension_depth: string;
  dimension_unit: string;
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function ItemMaster() {
  // Get role from auth context
  const { user } = useAuthContext();
  const currentRoleSlug = user?.role?.slug || 'staff';

  const [items, setItems] = useState<ApiItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Server-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 10,
    total: 0,
    from: null as number | null,
    to: null as number | null,
  });
  
  // API-fetched dropdown data
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [apiWarehouses, setApiWarehouses] = useState<ApiWarehouse[]>([]);
  const [warehouseRacks, setWarehouseRacks] = useState<ApiRack[]>([]);

  // Request Dispatch State (Outbound)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [requestDate, setRequestDate] = useState('');
  const [requestSearchTerm, setRequestSearchTerm] = useState('');

  // Inbound Application State
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);
  const [inboundList, setInboundList] = useState<InboundCartItem[]>([]);
  const [inboundSearchTerm, setInboundSearchTerm] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  // Shared Form State
  const [formData, setFormData] = useState<Partial<ItemFormData>>({});

  // Fetch items from API
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/items?search=${encodeURIComponent(debouncedSearch)}&page=${currentPage}&per_page=${perPage}`);
      const paginated = res.data?.data ?? res.data;
      setItems(paginated.data ?? []);
      setPaginationMeta({
        currentPage: paginated.current_page,
        lastPage: paginated.last_page,
        perPage: paginated.per_page,
        total: paginated.total,
        from: paginated.from,
        to: paginated.to,
      });
    } catch {
      toast.error('Failed to load items');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, debouncedSearch]);

  // Fetch when pagination or search changes
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Flatten items into display rows (one row per stock, or one row if no stocks)
  const displayRows = useMemo<DisplayRow[]>(() => {
    const rows: DisplayRow[] = [];
    for (const item of items) {
      const stocks = item.stocks ?? [];
      if (stocks.length === 0) {
        rows.push({ item, stock: null, isFirstOfGroup: true, groupSize: 1 });
      } else {
        stocks.forEach((stock, idx) => {
          rows.push({ item, stock, isFirstOfGroup: idx === 0, groupSize: stocks.length });
        });
      }
    }
    return rows;
  }, [items]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch categories and warehouses from API
  useEffect(() => {
    apiClient.get('/categories').then(res => {
      setApiCategories(res.data?.data ?? res.data ?? []);
    }).catch(() => toast.error('Failed to load categories'));

    apiClient.get('/warehouses').then(res => {
      setApiWarehouses(res.data?.data ?? res.data ?? []);
    }).catch(() => toast.error('Failed to load warehouses'));
  }, []);

  // Fetch racks when warehouse selection changes
  useEffect(() => {
    if (!selectedWarehouseId) {
      setWarehouseRacks([]);
      return;
    }
    apiClient.get(`/racks?warehouse_id=${selectedWarehouseId}`).then(res => {
      setWarehouseRacks(res.data?.data ?? res.data ?? []);
    }).catch(() => toast.error('Failed to load racks'));
    setInboundList(prev => prev.map(entry => ({ ...entry, rack_id: '' })));
  }, [selectedWarehouseId]);

  // Modal catalog filter (client-side on loaded items)
  const requestFilteredItems = items.filter(item => 
    (item.item_name.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
    item.item_sku.toLowerCase().includes(requestSearchTerm.toLowerCase()))
  );

  const inboundFilteredItems = items.filter(item => 
    (item.item_name.toLowerCase().includes(inboundSearchTerm.toLowerCase()) ||
    item.item_sku.toLowerCase().includes(inboundSearchTerm.toLowerCase()))
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- Regular Item Master Logic ---

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ weight_unit: 'kg', item_type: '', dimension_unit: 'cm' });
    setIsModalOpen(true);
  };

  const openEditModal = (item: ApiItem) => {
    setEditingId(item.id);
    const weightMatch = item.weight?.match(/^([\d.]+)\s*(kg|g)$/i);
    setFormData({
      item_sku: item.item_sku,
      item_name: item.item_name,
      category_id: item.category_id ? String(item.category_id) : '',
      weight: weightMatch ? weightMatch[1] : (item.weight || ''),
      weight_unit: weightMatch ? weightMatch[2].toLowerCase() : 'kg',
      item_type: item.storage_type ? String(item.storage_type) : '',
      quantity_per_pallet: item.qty_per_pallet ? String(item.qty_per_pallet) : '',
      quantity_per_carton: item.qty_per_carton ? String(item.qty_per_carton) : '',
      dimension_width: item.dimension_width ? String(item.dimension_width) : '',
      dimension_height: item.dimension_height ? String(item.dimension_height) : '',
      dimension_depth: item.dimension_depth ? String(item.dimension_depth) : '',
      dimension_unit: item.dimension_unit || 'cm',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.item_sku || !formData.item_name) {
      toast.error("Please fill in required fields (SKU, Name)");
      return;
    }

    const weight = formData.weight ? `${formData.weight}${formData.weight_unit || 'kg'}` : null;
    const storageType = formData.item_type ? Number(formData.item_type) : null;
    const payload: Record<string, any> = {
      item_sku: formData.item_sku,
      item_name: formData.item_name,
      category_id: formData.category_id ? Number(formData.category_id) : null,
      weight,
      storage_type: storageType,
      qty_per_pallet: storageType === 1 && formData.quantity_per_pallet ? Number(formData.quantity_per_pallet) : null,
      qty_per_carton: storageType === 2 && formData.quantity_per_carton ? Number(formData.quantity_per_carton) : null,
      dimension_width: storageType === 3 && formData.dimension_width ? Number(formData.dimension_width) : null,
      dimension_height: storageType === 3 && formData.dimension_height ? Number(formData.dimension_height) : null,
      dimension_depth: storageType === 3 && formData.dimension_depth ? Number(formData.dimension_depth) : null,
      dimension_unit: storageType === 3 ? (formData.dimension_unit || 'cm') : null,
    };

    setIsSaving(true);
    try {
      if (editingId) {
        await apiClient.post(`/items/${editingId}`, payload);
        toast.success('Item updated successfully');
      } else {
        await apiClient.post('/items', payload);
        toast.success('Item created successfully');
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to save item';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Dispatch (Outbound) Logic ---

  // Track which catalog items are expanded to show stock locations
  const [expandedItemIds, setExpandedItemIds] = useState<Set<number>>(new Set());

  const toggleExpandItem = (itemId: number) => {
    setExpandedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const openRequestModal = () => {
    setCart([]);
    setRequestSearchTerm('');
    setExpandedItemIds(new Set());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setRequestDate(tomorrow.toISOString().split('T')[0]);
    setIsRequestModalOpen(true);
  };

  const getItemTotalAvailable = (item: ApiItem) =>
    (item.stocks ?? []).reduce((sum, s) => sum + s.quantity, 0);

  // Get remaining available qty for a specific stock record (bin-scoped)
  const getStockRemaining = (stock: ApiItemStock) => {
    const inCart = cart.find(c => c.stock.id === stock.id);
    return stock.quantity - (inCart?.quantity ?? 0);
  };

  const addStockToCart = (item: ApiItem, stock: ApiItemStock) => {
    if (stock.quantity <= 0) return;
    setCart(prev => {
      const existing = prev.find(c => c.stock.id === stock.id);
      if (existing) {
        if (existing.quantity >= stock.quantity) {
          toast.error(`Only ${stock.quantity} available in this location`);
          return prev;
        }
        return prev.map(c => c.stock.id === stock.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, stock, quantity: 1 }];
    });
  };

  const removeFromCart = (stockId: number) => {
    setCart(prev => prev.filter(c => c.stock.id !== stockId));
  };

  const updateCartQuantity = (stockId: number, newQty: number) => {
    setCart(prev => {
      if (newQty <= 0) return prev.filter(c => c.stock.id !== stockId);
      const cartItem = prev.find(c => c.stock.id === stockId);
      if (cartItem) {
        if (newQty > cartItem.stock.quantity) {
          toast.error(`Only ${cartItem.stock.quantity} available in this location`);
          return prev.map(c => c.stock.id === stockId ? { ...c, quantity: cartItem.stock.quantity } : c);
        }
      }
      return prev.map(c => c.stock.id === stockId ? { ...c, quantity: newQty } : c);
    });
  };

  // Build a location label for display
  const stockLocationLabel = (stock: ApiItemStock) => {
    const parts: string[] = [];
    if (stock.warehouse?.name) parts.push(stock.warehouse.name);
    if (stock.rack?.code && stock.bin?.code) parts.push(`${stock.rack.code}-${stock.bin.code}`);
    else if (stock.rack?.code) parts.push(stock.rack.code);
    else if (stock.bin?.code) parts.push(stock.bin.code);
    if (stock.batch_id) parts.push(`Batch ${stock.batch_id}`);
    return parts.join(' / ') || 'Unknown location';
  };

  const handleRequestSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Please add items to your request");
      return;
    }
    if (!requestDate) {
      toast.error("Please select a required date");
      return;
    }

    const payload = {
      due_date: requestDate,
      items: cart.map(c => ({
        item_id: c.item.id,
        quantity: c.quantity,
        warehouse_id: c.stock.warehouse_id,
        batch_id: c.stock.batch_id,
        bin_id: c.stock.bin_id,
      })),
    };

    setIsSaving(true);
    try {
      const res = await apiClient.post('/dispatch-requests', payload);
      const orderNumber = res.data?.data?.order_number || 'N/A';
      toast.success(`Dispatch Request #${orderNumber} submitted!`);
      setIsRequestModalOpen(false);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to submit dispatch request';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Inbound Application Logic ---

  const openInboundModal = () => {
    setInboundList([]);
    setInboundSearchTerm('');
    setExpectedDate('');
    setSelectedWarehouseId('');
    setWarehouseRacks([]);
    setFormData({});
    setIsInboundModalOpen(true);
  };

  const addToInboundList = (item: ApiItem) => {
    setInboundList(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, quantity: 1, expiry_date: '', maintenance_date: '', rack_id: '', manufacturing_year: '' }];
    });
  };

  const updateInboundQuantity = (itemId: number, newQty: number) => {
     setInboundList(prev => {
      if (newQty <= 0) return prev.filter(c => c.item.id !== itemId);
      return prev.map(c => c.item.id === itemId ? { ...c, quantity: newQty } : c);
    });
  };

  const updateInboundItemField = (itemId: number, field: 'expiry_date' | 'maintenance_date' | 'rack_id' | 'manufacturing_year', value: string) => {
    setInboundList(prev =>
      prev.map(c => c.item.id === itemId ? { ...c, [field]: value } : c)
    );
  };

  const removeFromInboundList = (itemId: number) => {
    setInboundList(prev => prev.filter(c => c.item.id !== itemId));
  };

  const handleInboundApplicationSubmit = async () => {
    if (inboundList.length === 0) {
      toast.error("Please add items to your application");
      return;
    }
    if (!selectedWarehouseId) {
      toast.error("Please select a warehouse");
      return;
    }
    if (!expectedDate) {
      toast.error("Please select an expected date");
      return;
    }

    const payload = {
      warehouse_id: Number(selectedWarehouseId),
      expected_date: expectedDate,
      items: inboundList.map(entry => ({
        item_id: entry.item.id,
        quantity: entry.quantity,
        rack_id: entry.rack_id ? Number(entry.rack_id) : null,
        expiry_date: entry.expiry_date || null,
        maintenance_date: entry.maintenance_date || null,
        manufacturing_year: entry.manufacturing_year ? Number(entry.manufacturing_year) : null,
      })),
    };

    setIsSaving(true);
    try {
      const res = await apiClient.post('/inbound-applications', payload);
      const inboundNumber = res.data?.data?.inbound_number || 'N/A';
      toast.success(`Inbound Application #${inboundNumber} submitted!`);
      setIsInboundModalOpen(false);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to submit inbound application';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await apiClient.delete(`/items/${id}`);
        toast.success("Item deleted");
        fetchItems();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to delete item');
      }
    }
  };

  const canEdit = currentRoleSlug === 'admin' || currentRoleSlug === 'manager';
  const canRequest = currentRoleSlug === 'customer' || currentRoleSlug === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Item Master</h2>
          <p className="text-slate-500 text-sm">Define and manage stadium equipment, supplies, and assets.</p>
        </div>
        <div className="flex gap-2">
          {canRequest && (
            <>
              <Button 
                variant="outline"
                onClick={openRequestModal}
                className="text-slate-600"
              >
                <ShoppingCart size={18} className="mr-2" />
                Dispatch
              </Button>

              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={openInboundModal}
              >
                <ArrowDownToLine size={18} className="mr-2" />
                New Inbound Application
              </Button>
            </>
          )}
          
          {canEdit && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <button 
                  onClick={openAddModal}
                  className="flex items-center gap-2 px-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Add Item</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Item' : 'Add New Item'}</DialogTitle>
                  <DialogDescription>
                    {editingId ? 'Update details for the selected product.' : 'Define a new product in the catalog.'}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={(e) => e.preventDefault()} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="item_sku">SKU <span className="text-red-500">*</span></Label>
                      <Input 
                        id="item_sku" name="item_sku" 
                        placeholder="e.g. PROD-001" 
                        value={formData.item_sku || ''}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category_id">Category</Label>
                      <Select value={formData.category_id} onValueChange={(val) => handleSelectChange('category_id', val)}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {apiCategories.map(cat => (
                            <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item_name">Item Name <span className="text-red-500">*</span></Label>
                    <Input id="item_name" name="item_name" placeholder="Product Name" value={formData.item_name || ''} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="weight" name="weight" 
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 2.5"
                        value={formData.weight || ''}
                        onChange={handleInputChange}
                        className="flex-1"
                      />
                      <Select value={formData.weight_unit || 'kg'} onValueChange={(val) => handleSelectChange('weight_unit', val)}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.item_type || ''} onValueChange={(val) => handleSelectChange('item_type', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Pallet</SelectItem>
                        <SelectItem value="2">Carton</SelectItem>
                        <SelectItem value="3">Odd Size</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.item_type === '1' && (
                    <div className="space-y-2">
                      <Label htmlFor="quantity_per_pallet">Quantity per Pallet</Label>
                      <Input
                        id="quantity_per_pallet" name="quantity_per_pallet"
                        type="number" min="1" placeholder="e.g. 48"
                        value={formData.quantity_per_pallet || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}

                  {formData.item_type === '2' && (
                    <div className="space-y-2">
                      <Label htmlFor="quantity_per_carton">Quantity per Carton</Label>
                      <Input
                        id="quantity_per_carton" name="quantity_per_carton"
                        type="number" min="1" placeholder="e.g. 24"
                        value={formData.quantity_per_carton || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}

                  {formData.item_type === '3' && (
                    <div className="space-y-2">
                      <Label>Size Dimension (W &times; H &times; D)</Label>
                      <div className="flex gap-2">
                        <div className="grid grid-cols-3 gap-2 flex-1">
                          <Input
                            name="dimension_width" type="number" step="0.01" min="0"
                            placeholder="Width" value={formData.dimension_width || ''}
                            onChange={handleInputChange}
                          />
                          <Input
                            name="dimension_height" type="number" step="0.01" min="0"
                            placeholder="Height" value={formData.dimension_height || ''}
                            onChange={handleInputChange}
                          />
                          <Input
                            name="dimension_depth" type="number" step="0.01" min="0"
                            placeholder="Depth" value={formData.dimension_depth || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <Select value={formData.dimension_unit || 'cm'} onValueChange={(val) => handleSelectChange('dimension_unit', val)}>
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="m">m</SelectItem>
                            <SelectItem value="cm">cm</SelectItem>
                            <SelectItem value="mm">mm</SelectItem>
                            <SelectItem value="inch">inch</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <DialogFooter className="pt-4">
                    <DialogClose asChild><Button variant="outline" type="button">Cancel</Button></DialogClose>
                    <Button type="button" className="bg-blue-600 hover:bg-blue-700 ml-2" onClick={() => handleSave()} disabled={isSaving}>
                      {isSaving ? 'Saving...' : (editingId ? 'Update Item' : 'Save Item')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* Inbound Application Modal */}
          <Dialog open={isInboundModalOpen} onOpenChange={setIsInboundModalOpen}>
            <DialogContent className="sm:max-w-[1000px] h-[85vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="px-6 py-4 border-b border-slate-100 shrink-0 bg-emerald-50/50">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                     <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                       <ArrowDownToLine size={20} />
                     </div>
                     <div>
                       <DialogTitle className="text-emerald-950">New Inbound Application</DialogTitle>
                       <DialogDescription className="text-emerald-700/70">
                         Create a consolidated inbound order. Select existing items from the catalog.
                       </DialogDescription>
                     </div>
                  </div>
                  <div className="w-56 shrink-0">
                    <Label className="text-[10px] uppercase text-emerald-700/60 font-bold">Warehouse <span className="text-red-500">*</span></Label>
                    <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                      <SelectTrigger className="bg-white mt-1 h-9">
                        <Warehouse size={14} className="mr-1.5 text-emerald-600 shrink-0" />
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {apiWarehouses.map(wh => (
                          <SelectItem key={wh.id} value={String(wh.id)}>{wh.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Catalog */}
                <div className="w-1/2 flex flex-col border-r border-slate-100 bg-slate-50/50">
                   <div className="flex flex-col h-full">
                      <div className="p-4 border-b border-slate-200 bg-white space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <Input 
                            placeholder="Search catalog..." 
                            value={inboundSearchTerm}
                            onChange={(e) => setInboundSearchTerm(e.target.value)}
                            className="pl-9 bg-slate-50"
                          />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-2">
                         {inboundFilteredItems.map(item => (
                           <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-colors">
                              <div>
                                <p className="font-medium text-slate-800 text-sm">{item.item_name}</p>
                                <p className="text-xs text-slate-500">{item.item_sku}</p>
                              </div>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700" onClick={() => addToInboundList(item)}>
                                <Plus size={16} />
                              </Button>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Right Panel: Application List */}
                <div className="w-1/2 flex flex-col bg-white">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50/20">
                     <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                       <FileText size={18} className="text-emerald-600" /> Application Items
                     </h3>
                     <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                       {inboundList.length} Items
                     </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                     {inboundList.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                          <ArrowDownToLine size={40} className="mb-2 opacity-20" />
                          <p>List is empty</p>
                          <p className="text-xs">Select items from the catalog.</p>
                       </div>
                     ) : (
                       inboundList.map(entry => (
                         <div key={entry.item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-white rounded flex items-center justify-center border border-slate-200 text-slate-400 shrink-0">
                                 <Package size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="font-medium text-sm text-slate-800 truncate">{entry.item.item_name}</p>
                                 <p className="text-xs text-slate-500">{entry.item.item_sku}</p>
                              </div>
                              <div className="flex items-center gap-2 bg-white rounded-md border border-slate-200 px-1 py-0.5">
                                 <button onClick={() => updateInboundQuantity(entry.item.id, entry.quantity - 1)} className="p-1 hover:bg-slate-100 rounded"><Minus size={12} /></button>
                                 <span className="w-8 text-center text-sm font-bold">{entry.quantity}</span>
                                 <button onClick={() => updateInboundQuantity(entry.item.id, entry.quantity + 1)} className="p-1 hover:bg-slate-100 rounded"><Plus size={12} /></button>
                              </div>
                              <button onClick={() => removeFromInboundList(entry.item.id)} className="text-slate-400 hover:text-red-500">
                                 <X size={16} />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pl-13">
                              <div>
                                <Label className="text-[10px] uppercase text-slate-400 font-semibold">Rack</Label>
                                <Select value={entry.rack_id} onValueChange={(val) => updateInboundItemField(entry.item.id, 'rack_id', val)} disabled={!selectedWarehouseId}>
                                  <SelectTrigger className="h-8 text-xs bg-white">
                                    <SelectValue placeholder={selectedWarehouseId ? 'Select rack' : 'Select warehouse first'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {warehouseRacks.map(rack => (
                                      <SelectItem key={rack.id} value={String(rack.id)}>{rack.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-slate-400 font-semibold">Mfg Year</Label>
                                <Input
                                  type="number"
                                  placeholder="e.g. 2025"
                                  min="1900"
                                  max="2099"
                                  value={entry.manufacturing_year}
                                  onChange={(e) => updateInboundItemField(entry.item.id, 'manufacturing_year', e.target.value)}
                                  className="h-8 text-xs bg-white"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-slate-400 font-semibold">Expiry Date</Label>
                                <Input
                                  type="date"
                                  value={entry.expiry_date}
                                  onChange={(e) => updateInboundItemField(entry.item.id, 'expiry_date', e.target.value)}
                                  className="h-8 text-xs bg-white"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-slate-400 font-semibold">Maintenance Date</Label>
                                <Input
                                  type="date"
                                  value={entry.maintenance_date}
                                  onChange={(e) => updateInboundItemField(entry.item.id, 'maintenance_date', e.target.value)}
                                  className="h-8 text-xs bg-white"
                                />
                              </div>
                            </div>
                         </div>
                       ))
                     )}
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                          <Label className="text-xs uppercase text-slate-500 font-bold">Expected Date <span className="text-red-500">*</span></Label>
                          <Input
                            type="date"
                            value={expectedDate}
                            onChange={(e) => setExpectedDate(e.target.value)}
                            className="bg-white mt-1"
                          />
                       </div>
                       <div>
                          <Label className="text-xs uppercase text-slate-500 font-bold">Total Units</Label>
                          <div className="h-10 flex items-center px-3 bg-white border border-slate-200 rounded-md mt-1 font-bold text-slate-800">
                             {inboundList.reduce((acc, curr) => acc + curr.quantity, 0)}
                          </div>
                       </div>
                     </div>
                     <Button 
                       className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-lg shadow-emerald-200 shadow-lg"
                       onClick={handleInboundApplicationSubmit}
                       disabled={inboundList.length === 0 || isSaving}
                     >
                       {isSaving ? 'Submitting...' : 'Submit Application'}
                     </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Outbound Dispatch Request Modal */}
          <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
            <DialogContent className="sm:max-w-[900px] h-[80vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="px-6 py-4 border-b border-slate-100 shrink-0">
                <DialogTitle>New Dispatch Request</DialogTitle>
                <DialogDescription>
                  Select stock locations for dispatch. Click an item to choose the exact warehouse &amp; bin.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 flex overflow-hidden">
                {/* Left: Catalog with stock location expansion */}
                <div className="w-1/2 p-4 border-r border-slate-100 flex flex-col bg-slate-50/50">
                   <div className="relative mb-4 shrink-0">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                     <Input 
                       placeholder="Search catalog..." 
                       value={requestSearchTerm}
                       onChange={(e) => setRequestSearchTerm(e.target.value)}
                       className="pl-9 bg-white"
                     />
                   </div>
                   
                   <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                     {requestFilteredItems.filter(item => getItemTotalAvailable(item) > 0).map(item => {
                       const totalAvailable = getItemTotalAvailable(item);
                       const totalInCart = cart.filter(c => c.item.id === item.id).reduce((s, c) => s + c.quantity, 0);
                       const isExpanded = expandedItemIds.has(item.id);
                       const stocks = (item.stocks ?? []).filter(s => s.quantity > 0);
                       
                       return (
                         <div key={item.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                           {/* Item header — click to expand stock locations */}
                           <button
                             type="button"
                             onClick={() => toggleExpandItem(item.id)}
                             className="w-full p-3 flex justify-between items-center hover:bg-slate-50 transition-colors text-left"
                           >
                             <div className="min-w-0 flex-1">
                               <p className="font-medium text-slate-800 text-sm truncate">{item.item_name}</p>
                               <p className="text-xs text-slate-500">{item.item_sku}</p>
                             </div>
                             <div className="flex items-center gap-1.5 shrink-0 ml-2">
                               {totalInCart > 0 && (
                                 <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                                   {totalInCart} in cart
                                 </span>
                               )}
                               <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                 {totalAvailable} avail
                               </span>
                               {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                             </div>
                           </button>

                           {/* Expanded stock location rows */}
                           {isExpanded && (
                             <div className="border-t border-slate-100 bg-slate-50/50">
                               {stocks.length === 0 ? (
                                 <p className="text-xs text-slate-400 text-center py-3">No stock records</p>
                               ) : (
                                 stocks.map(stock => {
                                   const remaining = getStockRemaining(stock);
                                   const inCart = cart.find(c => c.stock.id === stock.id);
                                   const atMax = remaining <= 0;

                                   return (
                                     <div
                                       key={stock.id}
                                       className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0"
                                     >
                                       <div className="flex-1 min-w-0">
                                         <div className="flex items-center gap-1.5">
                                           <MapPin size={12} className="text-blue-500 shrink-0" />
                                           <span className="text-xs font-medium text-slate-700 truncate">
                                             {stockLocationLabel(stock)}
                                           </span>
                                         </div>
                                         <p className="text-[10px] text-slate-400 ml-[18px]">
                                           {stock.quantity} total &middot; {remaining} remaining
                                         </p>
                                       </div>
                                       {inCart ? (
                                         <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium shrink-0">
                                           {inCart.quantity} added
                                         </span>
                                       ) : null}
                                       <Button
                                         size="sm"
                                         variant="outline"
                                         className="h-7 text-[10px] px-2 shrink-0"
                                         onClick={(e) => { e.stopPropagation(); addStockToCart(item, stock); }}
                                         disabled={atMax}
                                       >
                                         {atMax ? 'Max' : (inCart ? '+1' : 'Add')}
                                       </Button>
                                     </div>
                                   );
                                 })
                               )}
                             </div>
                           )}
                         </div>
                       );
                     })}
                     {requestFilteredItems.filter(item => getItemTotalAvailable(item) > 0).length === 0 && (
                       <div className="text-center py-8 text-slate-400">
                         <p>No items in stock.</p>
                       </div>
                     )}
                   </div>
                </div>

                {/* Right: Cart (bin-scoped lines) */}
                <div className="w-1/2 p-4 flex flex-col bg-white">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <ShoppingCart size={18} />
                      Selected Items
                    </h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                      {cart.length} {cart.length === 1 ? 'line' : 'lines'}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                    {cart.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                        <Package size={48} className="mb-2 opacity-20" />
                        <p>Your request list is empty.</p>
                        <p className="text-xs">Expand an item on the left and pick a stock location.</p>
                      </div>
                    ) : (
                      cart.map((cartItem) => {
                        const atMax = cartItem.quantity >= cartItem.stock.quantity;
                        return (
                          <div key={cartItem.stock.id} className="flex flex-col gap-1 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-white rounded flex items-center justify-center border border-slate-200 text-slate-400 shrink-0">
                                <Package size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-slate-800 truncate">{cartItem.item.item_name}</p>
                                <p className="text-xs text-slate-500">{cartItem.item.item_sku}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button 
                                  onClick={() => updateCartQuantity(cartItem.stock.id, cartItem.quantity - 1)}
                                  className="h-6 w-6 flex items-center justify-center bg-white border border-slate-200 rounded hover:bg-slate-100"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-8 text-center text-sm font-medium">{cartItem.quantity}</span>
                                <button 
                                  onClick={() => updateCartQuantity(cartItem.stock.id, cartItem.quantity + 1)}
                                  className={`h-6 w-6 flex items-center justify-center bg-white border border-slate-200 rounded ${atMax ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'}`}
                                  disabled={atMax}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                              <button 
                                onClick={() => removeFromCart(cartItem.stock.id)}
                                className="text-slate-400 hover:text-red-500 ml-1"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            {/* Stock location badge */}
                            <div className="flex items-center gap-2 pl-[52px]">
                              <div className="flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                                <MapPin size={10} />
                                <span>{stockLocationLabel(cartItem.stock)}</span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {cartItem.quantity} / {cartItem.stock.quantity} available
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100 shrink-0">
                    <div className="space-y-2">
                      <Label htmlFor="req-date">Required Date</Label>
                      <Input 
                        id="req-date"
                        type="date"
                        value={requestDate}
                        onChange={(e) => setRequestDate(e.target.value)}
                        required
                      />
                    </div>
                    
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                      onClick={handleRequestSubmit}
                      disabled={cart.length === 0 || isSaving}
                    >
                      <Send size={16} className="mr-2" />
                      {isSaving ? 'Submitting...' : 'Submit Request Application'}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search items by SKU, Name, Category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
            <Filter size={18} />
            <span>Filter</span>
          </button>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
           <div>
             <p className="text-xs text-slate-500 font-bold uppercase">Total Items</p>
             <p className="text-2xl font-bold text-slate-800">{paginationMeta.total}</p>
           </div>
           <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
             <Tag size={20} />
           </div>
        </div>
      </div>

      {/* Item Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Weight</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Batch</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {displayRows.map((row, rowIdx) => (
                  <motion.tr 
                    key={`${row.item.id}-${row.stock?.id ?? 'no-stock'}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`hover:bg-slate-50/80 transition-colors ${!row.isFirstOfGroup ? 'border-t border-slate-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      {row.isFirstOfGroup ? (
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{row.item.item_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{row.item.item_sku}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="pl-[52px]">
                          <span className="text-xs text-slate-400">↳ same item</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {row.isFirstOfGroup ? (
                        <span className="text-sm text-slate-600">{row.item.weight || '-'}</span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      {row.isFirstOfGroup ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {row.item.category?.name || '-'}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      {row.stock ? (
                        <span className="text-xs font-mono bg-amber-50 px-1.5 py-0.5 rounded text-amber-700">{row.stock.batch_id}</span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {row.stock ? (
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                          <Layers size={14} className="text-blue-500" />
                          {row.stock.quantity}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No stock</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {row.isFirstOfGroup && (
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <>
                              <button 
                                onClick={() => openEditModal(row.item)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(row.item.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              
              {displayRows.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <Search size={32} className="mb-2 opacity-50" />
                      <p>No items found matching "{searchTerm}"</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {paginationMeta.total > 0 && (
          <PaginationControls
            currentPage={paginationMeta.currentPage}
            lastPage={paginationMeta.lastPage}
            perPage={paginationMeta.perPage}
            total={paginationMeta.total}
            from={paginationMeta.from}
            to={paginationMeta.to}
            onPageChange={setCurrentPage}
            onPerPageChange={(pp) => { setPerPage(pp); setCurrentPage(1); }}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}

export default ItemMaster;
