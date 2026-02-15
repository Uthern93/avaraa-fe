// Item Master Types
export type ItemVelocity = 'FAST' | 'SLOW';
export type ItemStatus = 'Active' | 'Discontinued' | 'Draft';

export interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
  dimensions: string;
  weight: string;
  velocity?: ItemVelocity;
  status?: ItemStatus;
  description?: string;
  quantity: number;
  batch: string;
  expiryDate?: string;
  manufacturingYear?: string;
  unitPrice?: number;
  reorderLevel?: number;
  supplier?: string;
  imageUrl?: string;
}

// Inbound Types
export type InboundItemStatus = 'PENDING' | 'VERIFIED' | 'STORED';
export type InboundOrderStatus = 'PENDING' | 'ARRIVED' | 'VERIFYING' | 'COMPLETED';

export interface InboundItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  receivedQty: number;
  status: InboundItemStatus;
  binLocation?: string;
  velocity?: ItemVelocity;
}

export interface InboundOrder {
  id: string;
  supplier: string;
  expectedDate: string;
  itemsCount: number;
  status: InboundOrderStatus;
  items: InboundItem[];
  notes?: string;
  receivedBy?: string;
}

// Pick & Pack Types
export type OrderStatus = 'PENDING' | 'PICKING' | 'PICKED' | 'PACKING' | 'PACKED';
export type OrderPriority = 'HIGH' | 'NORMAL' | 'LOW';

export interface OrderLineItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  rack?: string;
  bin?: string;
  pickedQty?: number;
  packedQty?: number;
}

export interface Order {
  id: string;
  customer: string;
  items: number;
  itemName?: string;
  lineItems?: OrderLineItem[];
  status: OrderStatus;
  priority: OrderPriority;
  dueDate: string;
  createdAt?: string;
  notes?: string;
}

// Dashboard Types
export interface WeeklyMovement {
  name: string;
  inbound: number;
  outbound: number;
}

export interface ExpiryItem {
  id: number;
  sku: string;
  name: string;
  expiry: string;
  quantity: number;
  status: 'Critical' | 'Warning' | 'OK';
}

export interface UrgentTask {
  id: string;
  type: 'Pick' | 'Putaway' | 'Verify' | 'Pack' | 'Dispatch';
  referenceId: string;
  time: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
}

export interface KPIData {
  totalInventory: number;
  inventoryChange: string;
  pendingInbound: number;
  trucksArriving: number;
  toDispatch: number;
  urgentOrders: number;
}

// Rack Configuration Types
export interface Rack {
  id: string;
  name: string;
  zone: string;
  color: string;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  description?: string;
  itemCount?: number;
}

// Supplier Types
export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
}

// -----------------------------------------------------------------------------
// ITEM MASTER DATA
// -----------------------------------------------------------------------------

export const MOCK_ITEMS: Item[] = [
  { 
    id: '1', 
    sku: 'AUDIO-PA-SYS-01', 
    name: 'Professional PA System 2000W', 
    category: 'Audio', 
    dimensions: '120x60x60 cm', 
    weight: '45.0 kg', 
    velocity: 'SLOW', 
    status: 'Active', 
    quantity: 12, 
    batch: 'B-2023-A',
    unitPrice: 2499.99,
    reorderLevel: 5,
    supplier: 'AudioVisio Pro',
    description: 'High-quality professional PA system with 2000W output, perfect for stadiums and large venues.'
  },
  { 
    id: '2', 
    sku: 'LGT-SPOT-500', 
    name: 'LED Spotlight 500W', 
    category: 'Lighting', 
    dimensions: '30x30x40 cm', 
    weight: '5.5 kg', 
    velocity: 'FAST', 
    status: 'Active', 
    quantity: 45, 
    batch: 'B-2023-B',
    unitPrice: 349.99,
    reorderLevel: 20,
    supplier: 'LightTech Industries',
    description: 'Energy-efficient LED spotlight with adjustable beam angle and color temperature.'
  },
  { 
    id: '3', 
    sku: 'FLD-CONE-ORG', 
    name: 'Safety Field Cones (Orange)', 
    category: 'Field Equipment', 
    dimensions: '30x30x50 cm', 
    weight: '2.0 kg', 
    velocity: 'FAST', 
    status: 'Active', 
    quantity: 200, 
    batch: 'B-2023-C',
    unitPrice: 12.99,
    reorderLevel: 100,
    supplier: 'Stadium Supplies Co',
    description: 'Durable PVC safety cones for field demarcation and training exercises.'
  },
  { 
    id: '4', 
    sku: 'SEAT-FOLD-VIP', 
    name: 'VIP Folding Stadium Seat', 
    category: 'Furniture', 
    dimensions: '50x50x80 cm', 
    weight: '8.0 kg', 
    velocity: 'SLOW', 
    status: 'Active', 
    quantity: 500, 
    batch: 'B-2023-A',
    unitPrice: 189.99,
    reorderLevel: 50,
    supplier: 'ComfortSeat Corp',
    description: 'Premium folding stadium seat with cushioned padding and armrests.'
  },
  { 
    id: '5', 
    sku: 'SCORE-LED-LG', 
    name: 'Large LED Scoreboard Panel', 
    category: 'Electronics', 
    dimensions: '200x150x20 cm', 
    weight: '85.0 kg', 
    velocity: 'SLOW', 
    status: 'Draft', 
    quantity: 2, 
    batch: 'B-2023-D',
    unitPrice: 8999.99,
    reorderLevel: 1,
    supplier: 'DisplayTech Solutions',
    description: 'High-resolution LED scoreboard panel with wireless connectivity and weather resistance.'
  },
  { 
    id: '6', 
    sku: 'MAINT-GRASS-SEED', 
    name: 'Premium Grass Seed Mix', 
    category: 'Maintenance', 
    dimensions: '60x40x20 cm', 
    weight: '25.0 kg', 
    velocity: 'FAST', 
    status: 'Active', 
    quantity: 50, 
    batch: 'B-2023-E',
    expiryDate: '2024-06-15',
    unitPrice: 89.99,
    reorderLevel: 25,
    supplier: 'Turf Masters',
    description: 'Professional-grade grass seed mix optimized for sports fields.'
  },
  { 
    id: '7', 
    sku: 'SNACK-BOX-01', 
    name: 'Stadium Snack Box', 
    category: 'Concessions', 
    dimensions: '25x15x10 cm', 
    weight: '0.5 kg', 
    velocity: 'FAST', 
    status: 'Active', 
    quantity: 450, 
    batch: 'B-2024-A',
    expiryDate: '2024-02-14',
    unitPrice: 8.99,
    reorderLevel: 200,
    supplier: 'FoodService Inc',
    description: 'Pre-packaged snack box with assorted chips, candy, and crackers.'
  },
  { 
    id: '8', 
    sku: 'DRINK-ISO-02', 
    name: 'Isotonic Drink 500ml', 
    category: 'Concessions', 
    dimensions: '8x8x22 cm', 
    weight: '0.55 kg', 
    velocity: 'FAST', 
    status: 'Active', 
    quantity: 120, 
    batch: 'B-2024-B',
    expiryDate: '2024-02-17',
    unitPrice: 3.49,
    reorderLevel: 100,
    supplier: 'BevCo Distributors',
    description: 'Refreshing isotonic sports drink in citrus flavor.'
  },
  { 
    id: '9', 
    sku: 'NET-GOAL-PRO', 
    name: 'Professional Goal Net', 
    category: 'Field Equipment', 
    dimensions: '732x244x200 cm', 
    weight: '15.0 kg', 
    velocity: 'SLOW', 
    status: 'Active', 
    quantity: 8, 
    batch: 'B-2023-F',
    unitPrice: 459.99,
    reorderLevel: 4,
    supplier: 'SportNet Manufacturing',
    description: 'Full-size professional goal net with reinforced corners and UV protection.'
  },
  { 
    id: '10', 
    sku: 'BALL-FTBL-OFF', 
    name: 'Official Match Football', 
    category: 'Sports Equipment', 
    dimensions: '22x22x22 cm', 
    weight: '0.43 kg', 
    velocity: 'FAST', 
    status: 'Active', 
    quantity: 75, 
    batch: 'B-2023-G',
    unitPrice: 149.99,
    reorderLevel: 30,
    supplier: 'ProBall Sports',
    description: 'FIFA-approved official match football with premium leather construction.'
  },
  { 
    id: '11', 
    sku: 'TARP-FIELD-XL', 
    name: 'Field Cover Tarp XL', 
    category: 'Maintenance', 
    dimensions: '120x100x0.5 cm (folded)', 
    weight: '45.0 kg', 
    velocity: 'SLOW', 
    status: 'Active', 
    quantity: 6, 
    batch: 'B-2023-H',
    unitPrice: 1299.99,
    reorderLevel: 2,
    supplier: 'WeatherGuard Products',
    description: 'Extra-large waterproof field cover tarp for pitch protection.'
  },
  { 
    id: '12', 
    sku: 'MIC-WIRELESS-01', 
    name: 'Wireless Microphone Set', 
    category: 'Audio', 
    dimensions: '40x30x15 cm', 
    weight: '2.5 kg', 
    velocity: 'FAST', 
    status: 'Active', 
    quantity: 20, 
    batch: 'B-2023-I',
    unitPrice: 599.99,
    reorderLevel: 10,
    supplier: 'AudioVisio Pro',
    description: 'Professional wireless microphone set with receiver and carrying case.'
  },
  { 
    id: '13', 
    sku: 'BENCH-TEAM-10', 
    name: 'Team Bench (10-Seater)', 
    category: 'Furniture', 
    dimensions: '300x60x80 cm', 
    weight: '65.0 kg', 
    velocity: 'SLOW', 
    status: 'Active', 
    quantity: 12, 
    batch: 'B-2023-J',
    unitPrice: 799.99,
    reorderLevel: 4,
    supplier: 'ComfortSeat Corp',
    description: 'Sturdy aluminum team bench with weather-resistant coating.'
  },
  { 
    id: '14', 
    sku: 'WATER-COOLER-50L', 
    name: 'Sports Water Cooler 50L', 
    category: 'Sports Equipment', 
    dimensions: '50x50x70 cm', 
    weight: '8.0 kg', 
    velocity: 'FAST', 
    status: 'Active', 
    quantity: 25, 
    batch: 'B-2023-K',
    unitPrice: 129.99,
    reorderLevel: 10,
    supplier: 'HydroSport Supplies',
    description: 'Insulated water cooler with easy-pour spigot and carrying handles.'
  },
  { 
    id: '15', 
    sku: 'FLAG-CORNER-SET', 
    name: 'Corner Flag Set (4 pcs)', 
    category: 'Field Equipment', 
    dimensions: '160x30x10 cm', 
    weight: '2.0 kg', 
    velocity: 'FAST', 
    status: 'Active', 
    quantity: 40, 
    batch: 'B-2023-L',
    unitPrice: 49.99,
    reorderLevel: 20,
    supplier: 'Stadium Supplies Co',
    description: 'Set of 4 spring-loaded corner flags with ground stakes.'
  }
];

// -----------------------------------------------------------------------------
// INBOUND DATA
// -----------------------------------------------------------------------------

export const MOCK_INBOUND_ORDERS: InboundOrder[] = [
  { 
    id: 'GRN-2023-001', 
    supplier: 'AudioVisio Pro', 
    expectedDate: '2023-10-25', 
    itemsCount: 15, 
    status: 'PENDING',
    notes: 'Handle with care - fragile electronics',
    items: [
      { id: 'item-1', sku: 'AUDIO-PA-SYS-01', name: 'Professional PA System 2000W', quantity: 5, receivedQty: 0, status: 'PENDING', velocity: 'SLOW' },
      { id: 'item-2', sku: 'LGT-SPOT-500', name: 'LED Spotlight 500W', quantity: 10, receivedQty: 0, status: 'PENDING', velocity: 'FAST' }
    ]
  },
  { 
    id: 'GRN-2023-002', 
    supplier: 'Stadium Supplies Co', 
    expectedDate: '2023-10-25', 
    itemsCount: 120, 
    status: 'ARRIVED',
    items: [
      { id: 'item-3', sku: 'FLD-CONE-ORG', name: 'Safety Field Cones', quantity: 120, receivedQty: 0, status: 'PENDING', velocity: 'FAST' }
    ]
  },
  { 
    id: 'GRN-2023-003', 
    supplier: 'Turf Masters', 
    expectedDate: '2023-10-26', 
    itemsCount: 50, 
    status: 'PENDING',
    items: [
      { id: 'item-4', sku: 'MAINT-GRASS-SEED', name: 'Premium Grass Seed', quantity: 50, receivedQty: 0, status: 'PENDING', velocity: 'FAST' }
    ]
  },
  { 
    id: 'GRN-2023-004', 
    supplier: 'ComfortSeat Corp', 
    expectedDate: '2023-10-27', 
    itemsCount: 100, 
    status: 'PENDING',
    notes: 'Delivery requires forklift',
    items: [
      { id: 'item-5', sku: 'SEAT-FOLD-VIP', name: 'VIP Folding Stadium Seat', quantity: 100, receivedQty: 0, status: 'PENDING', velocity: 'SLOW' }
    ]
  },
  { 
    id: 'GRN-2023-005', 
    supplier: 'ProBall Sports', 
    expectedDate: '2023-10-28', 
    itemsCount: 50, 
    status: 'VERIFYING',
    receivedBy: 'John Smith',
    items: [
      { id: 'item-6', sku: 'BALL-FTBL-OFF', name: 'Official Match Football', quantity: 50, receivedQty: 48, status: 'VERIFIED', velocity: 'FAST' }
    ]
  },
  { 
    id: 'GRN-2023-006', 
    supplier: 'FoodService Inc', 
    expectedDate: '2023-10-24', 
    itemsCount: 500, 
    status: 'COMPLETED',
    receivedBy: 'Maria Garcia',
    items: [
      { id: 'item-7', sku: 'SNACK-BOX-01', name: 'Stadium Snack Box', quantity: 500, receivedQty: 500, status: 'STORED', velocity: 'FAST', binLocation: 'A-04' }
    ]
  },
  { 
    id: 'GRN-2023-007', 
    supplier: 'BevCo Distributors', 
    expectedDate: '2023-10-29', 
    itemsCount: 200, 
    status: 'PENDING',
    items: [
      { id: 'item-8', sku: 'DRINK-ISO-02', name: 'Isotonic Drink 500ml', quantity: 200, receivedQty: 0, status: 'PENDING', velocity: 'FAST' }
    ]
  },
  { 
    id: 'GRN-2023-008', 
    supplier: 'HydroSport Supplies', 
    expectedDate: '2023-10-30', 
    itemsCount: 15, 
    status: 'ARRIVED',
    items: [
      { id: 'item-9', sku: 'WATER-COOLER-50L', name: 'Sports Water Cooler 50L', quantity: 15, receivedQty: 0, status: 'PENDING', velocity: 'FAST' }
    ]
  }
];

// -----------------------------------------------------------------------------
// PICK & PACK DATA
// -----------------------------------------------------------------------------

export const MOCK_ORDERS: Order[] = [
  { 
    id: 'ORD-8821', 
    customer: 'City Arena Management', 
    items: 12, 
    status: 'PENDING', 
    priority: 'HIGH', 
    dueDate: '2023-10-25',
    createdAt: '2023-10-23T09:30:00Z',
    notes: 'VIP event setup - expedite if possible',
    lineItems: [
      { id: '1', name: 'Professional PA System 2000W', sku: 'AUDIO-PA-SYS-01', quantity: 2, rack: 'A', bin: '04' }, 
      { id: '3', name: 'Safety Field Cones', sku: 'FLD-CONE-ORG', quantity: 10, rack: 'B', bin: '08' }
    ] 
  },
  { 
    id: 'ORD-8822', 
    customer: 'North High Stadium', 
    items: 5, 
    status: 'PICKING', 
    priority: 'NORMAL', 
    dueDate: '2023-10-26',
    createdAt: '2023-10-23T11:15:00Z',
    lineItems: [
      { id: '2', name: 'LED Spotlight 500W', sku: 'LGT-SPOT-500', quantity: 5, rack: 'A', bin: '02', pickedQty: 3 }
    ] 
  },
  { 
    id: 'ORD-8823', 
    customer: 'Concert Logistics Ltd', 
    items: 24, 
    status: 'PICKED', 
    priority: 'NORMAL', 
    dueDate: '2023-10-27',
    createdAt: '2023-10-22T14:00:00Z',
    lineItems: [
      { id: '4', name: 'VIP Folding Seat', sku: 'SEAT-FOLD-VIP', quantity: 24, rack: 'C', bin: '12', pickedQty: 24 }
    ] 
  },
  { 
    id: 'ORD-8824', 
    customer: 'Sports Complex Main', 
    items: 3, 
    status: 'PACKING', 
    priority: 'HIGH', 
    dueDate: '2023-10-25',
    createdAt: '2023-10-21T10:45:00Z',
    notes: 'Fragile items - use extra padding',
    lineItems: [
      { id: '5', name: 'Large LED Scoreboard', sku: 'SCORE-LED-LG', quantity: 3, rack: 'D', bin: '01', pickedQty: 3, packedQty: 1 }
    ] 
  },
  { 
    id: 'ORD-8825', 
    customer: 'Local Field Assoc.', 
    items: 8, 
    status: 'PACKED', 
    priority: 'NORMAL', 
    dueDate: '2023-10-24',
    createdAt: '2023-10-20T08:30:00Z',
    lineItems: [
      { id: '6', name: 'Premium Grass Seed', sku: 'MAINT-GRASS-SEED', quantity: 8, rack: 'B', bin: '05', pickedQty: 8, packedQty: 8 }
    ] 
  },
  { 
    id: 'ORD-8826', 
    customer: 'Central University Athletics', 
    items: 15, 
    status: 'PENDING', 
    priority: 'NORMAL', 
    dueDate: '2023-10-28',
    createdAt: '2023-10-24T13:20:00Z',
    lineItems: [
      { id: '7', name: 'Official Match Football', sku: 'BALL-FTBL-OFF', quantity: 10, rack: 'A', bin: '06' },
      { id: '8', name: 'Corner Flag Set (4 pcs)', sku: 'FLAG-CORNER-SET', quantity: 5, rack: 'B', bin: '03' }
    ] 
  },
  { 
    id: 'ORD-8827', 
    customer: 'Downtown Event Center', 
    items: 30, 
    status: 'PENDING', 
    priority: 'HIGH', 
    dueDate: '2023-10-26',
    createdAt: '2023-10-24T15:45:00Z',
    notes: 'Conference setup - needs wireless mics',
    lineItems: [
      { id: '9', name: 'Wireless Microphone Set', sku: 'MIC-WIRELESS-01', quantity: 10, rack: 'A', bin: '07' },
      { id: '10', name: 'VIP Folding Stadium Seat', sku: 'SEAT-FOLD-VIP', quantity: 20, rack: 'C', bin: '12' }
    ] 
  },
  { 
    id: 'ORD-8828', 
    customer: 'Youth Soccer League', 
    items: 45, 
    status: 'PICKING', 
    priority: 'NORMAL', 
    dueDate: '2023-10-29',
    createdAt: '2023-10-24T09:00:00Z',
    lineItems: [
      { id: '11', name: 'Safety Field Cones (Orange)', sku: 'FLD-CONE-ORG', quantity: 30, rack: 'B', bin: '08', pickedQty: 15 },
      { id: '12', name: 'Official Match Football', sku: 'BALL-FTBL-OFF', quantity: 10, rack: 'A', bin: '06', pickedQty: 10 },
      { id: '13', name: 'Corner Flag Set (4 pcs)', sku: 'FLAG-CORNER-SET', quantity: 5, rack: 'B', bin: '03' }
    ] 
  }
];

// -----------------------------------------------------------------------------
// DASHBOARD DATA
// -----------------------------------------------------------------------------

export const MOCK_WEEKLY_MOVEMENT: WeeklyMovement[] = [
  { name: 'Mon', inbound: 40, outbound: 24 },
  { name: 'Tue', inbound: 30, outbound: 13 },
  { name: 'Wed', inbound: 20, outbound: 58 },
  { name: 'Thu', inbound: 27, outbound: 39 },
  { name: 'Fri', inbound: 18, outbound: 48 },
  { name: 'Sat', inbound: 23, outbound: 38 },
  { name: 'Sun', inbound: 34, outbound: 43 },
];

export const MOCK_EXPIRY_ITEMS: ExpiryItem[] = [
  { id: 1, sku: 'SNACK-BOX-01', name: 'Stadium Snack Box', expiry: '2 Days', quantity: 450, status: 'Critical' },
  { id: 2, sku: 'DRINK-ISO-02', name: 'Isotonic Drink 500ml', expiry: '5 Days', quantity: 120, status: 'Warning' },
  { id: 3, sku: 'MAINT-GRASS-SEED', name: 'Premium Grass Seed Mix', expiry: '30 Days', quantity: 50, status: 'OK' },
];

export const MOCK_URGENT_TASKS: UrgentTask[] = [
  { id: 'task-1', type: 'Pick', referenceId: '#DO-8821', time: '10 min ago', status: 'Pending', priority: 'High' },
  { id: 'task-2', type: 'Putaway', referenceId: '#GRN-1029', time: '25 min ago', status: 'In Progress', priority: 'Medium' },
  { id: 'task-3', type: 'Verify', referenceId: '#GRN-1030', time: '1 hr ago', status: 'Pending', priority: 'High' },
  { id: 'task-4', type: 'Pack', referenceId: '#DO-8819', time: '2 hr ago', status: 'In Progress', priority: 'Medium' },
  { id: 'task-5', type: 'Dispatch', referenceId: '#DO-8815', time: '3 hr ago', status: 'Pending', priority: 'Low' },
  { id: 'task-6', type: 'Pick', referenceId: '#DO-8826', time: '4 hr ago', status: 'Pending', priority: 'Medium' },
  { id: 'task-7', type: 'Verify', referenceId: '#GRN-2023-008', time: '5 hr ago', status: 'Pending', priority: 'Medium' },
];

export const MOCK_KPI_DATA: KPIData = {
  totalInventory: 12450,
  inventoryChange: '+4.5% from last month',
  pendingInbound: 18,
  trucksArriving: 3,
  toDispatch: 45,
  urgentOrders: 12,
};

// -----------------------------------------------------------------------------
// WAREHOUSE CONFIGURATION DATA
// -----------------------------------------------------------------------------

export const RACKS: Rack[] = [
  { id: 'A', name: 'Rack A', zone: 'Fast Moving', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
  { id: 'B', name: 'Rack B', zone: 'Standard', color: 'bg-blue-100 border-blue-300 text-blue-800' },
  { id: 'C', name: 'Rack C', zone: 'Slow Moving', color: 'bg-amber-100 border-amber-300 text-amber-800' },
  { id: 'D', name: 'Rack D', zone: 'Bulk / Overflow', color: 'bg-slate-100 border-slate-300 text-slate-800' },
];

export const BINS_PER_RACK = 8;

// -----------------------------------------------------------------------------
// CATEGORY DATA
// -----------------------------------------------------------------------------

export const CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Audio', description: 'Sound systems, microphones, and audio equipment', itemCount: 2 },
  { id: 'cat-2', name: 'Lighting', description: 'Spotlights, LED panels, and lighting fixtures', itemCount: 1 },
  { id: 'cat-3', name: 'Field Equipment', description: 'Cones, goals, nets, and field markers', itemCount: 3 },
  { id: 'cat-4', name: 'Furniture', description: 'Seats, benches, and tables', itemCount: 2 },
  { id: 'cat-5', name: 'Electronics', description: 'Scoreboards, displays, and electronic equipment', itemCount: 1 },
  { id: 'cat-6', name: 'Maintenance', description: 'Grass seed, tarps, and maintenance supplies', itemCount: 2 },
  { id: 'cat-7', name: 'Concessions', description: 'Food, beverages, and concession supplies', itemCount: 2 },
  { id: 'cat-8', name: 'Sports Equipment', description: 'Balls, coolers, and sports gear', itemCount: 2 },
];

// -----------------------------------------------------------------------------
// SUPPLIER DATA
// -----------------------------------------------------------------------------

export const SUPPLIERS: Supplier[] = [
  { id: 'sup-1', name: 'AudioVisio Pro', contact: 'James Wilson', email: 'sales@audiovisiopro.com', phone: '+1-555-0101', address: '123 Sound Street, Audio City, AC 12345' },
  { id: 'sup-2', name: 'Stadium Supplies Co', contact: 'Sarah Johnson', email: 'orders@stadiumsupplies.com', phone: '+1-555-0102', address: '456 Sports Ave, Stadium Town, ST 23456' },
  { id: 'sup-3', name: 'Turf Masters', contact: 'Michael Green', email: 'info@turfmasters.com', phone: '+1-555-0103', address: '789 Grass Lane, Greenville, GV 34567' },
  { id: 'sup-4', name: 'ComfortSeat Corp', contact: 'Emily Davis', email: 'support@comfortseat.com', phone: '+1-555-0104', address: '321 Comfort Blvd, Seating City, SC 45678' },
  { id: 'sup-5', name: 'DisplayTech Solutions', contact: 'Robert Chen', email: 'sales@displaytech.com', phone: '+1-555-0105', address: '654 Screen Road, Display Town, DT 56789' },
  { id: 'sup-6', name: 'FoodService Inc', contact: 'Lisa Martinez', email: 'orders@foodservice.com', phone: '+1-555-0106', address: '987 Food Plaza, Cuisine City, CC 67890' },
  { id: 'sup-7', name: 'BevCo Distributors', contact: 'David Brown', email: 'distribution@bevco.com', phone: '+1-555-0107', address: '147 Beverage Street, Drink Town, DT 78901' },
  { id: 'sup-8', name: 'ProBall Sports', contact: 'Amanda White', email: 'wholesale@proball.com', phone: '+1-555-0108', address: '258 Sports Blvd, Athletic City, AC 89012' },
  { id: 'sup-9', name: 'LightTech Industries', contact: 'Kevin Lee', email: 'sales@lighttech.com', phone: '+1-555-0109', address: '369 Bright Ave, Lighting Town, LT 90123' },
  { id: 'sup-10', name: 'HydroSport Supplies', contact: 'Jennifer Taylor', email: 'info@hydrosport.com', phone: '+1-555-0110', address: '741 Water Way, Hydration City, HC 01234' },
];

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get items that are expiring soon (within specified days)
 */
export function getExpiringItems(items: Item[], withinDays: number = 30): Item[] {
  const today = new Date();
  const futureDate = new Date(today.getTime() + withinDays * 24 * 60 * 60 * 1000);
  
  return items.filter(item => {
    if (!item.expiryDate) return false;
    const expiryDate = new Date(item.expiryDate);
    return expiryDate <= futureDate && expiryDate >= today;
  });
}

/**
 * Get items below reorder level
 */
export function getLowStockItems(items: Item[]): Item[] {
  return items.filter(item => {
    if (!item.reorderLevel) return false;
    return item.quantity <= item.reorderLevel;
  });
}

/**
 * Get items by category
 */
export function getItemsByCategory(items: Item[], category: string): Item[] {
  return items.filter(item => item.category.toLowerCase() === category.toLowerCase());
}

/**
 * Get items by velocity
 */
export function getItemsByVelocity(items: Item[], velocity: ItemVelocity): Item[] {
  return items.filter(item => item.velocity === velocity);
}

/**
 * Get orders by status
 */
export function getOrdersByStatus(orders: Order[], status: OrderStatus): Order[] {
  return orders.filter(order => order.status === status);
}

/**
 * Get orders by priority
 */
export function getOrdersByPriority(orders: Order[], priority: OrderPriority): Order[] {
  return orders.filter(order => order.priority === priority);
}

/**
 * Get inbound orders by status
 */
export function getInboundOrdersByStatus(orders: InboundOrder[], status: InboundOrderStatus): InboundOrder[] {
  return orders.filter(order => order.status === status);
}

/**
 * Calculate total inventory value
 */
export function calculateInventoryValue(items: Item[]): number {
  return items.reduce((total, item) => {
    const price = item.unitPrice || 0;
    return total + (price * item.quantity);
  }, 0);
}

/**
 * Get supplier by name
 */
export function getSupplierByName(name: string): Supplier | undefined {
  return SUPPLIERS.find(supplier => supplier.name.toLowerCase() === name.toLowerCase());
}

/**
 * Generate a new order ID
 */
export function generateOrderId(): string {
  const number = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${number}`;
}

/**
 * Generate a new GRN (Goods Receipt Note) ID
 */
export function generateGRNId(): string {
  const year = new Date().getFullYear();
  const number = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `GRN-${year}-${number}`;
}

/**
 * Generate a new item ID
 */
export function generateItemId(): string {
  return Math.random().toString(36).substr(2, 9);
}
