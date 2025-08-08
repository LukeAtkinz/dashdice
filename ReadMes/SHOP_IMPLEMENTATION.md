# Shop System Implementation Guide

## Overview
Implementation of an in-app purchase shop for DashDice featuring background purchases and premium subscriptions.

## Core Features
- **Background Store**: Purchase custom backgrounds with real money
- **Premium Subscription**: Monthly/yearly subscriptions for extra perks
- **Virtual Currency**: Gem system for in-app purchases
- **Payment Processing**: Stripe integration for secure transactions
- **Inventory Management**: User-owned items and subscription status

## Database Schema

### Shop Items Collection
```typescript
interface ShopItem {
  id: string;
  type: 'background' | 'subscription' | 'gems';
  name: string;
  description: string;
  price: number; // USD cents
  currency: 'USD';
  category: string;
  imageUrl: string;
  isActive: boolean;
  metadata: {
    backgroundKey?: string; // For backgrounds
    subscriptionType?: 'monthly' | 'yearly'; // For subscriptions
    gemAmount?: number; // For gem packs
  };
}
```

### User Purchases Collection
```typescript
interface UserPurchase {
  id: string;
  userId: string;
  itemId: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  purchasedAt: Timestamp;
  metadata: Record<string, any>;
}
```

### User Subscriptions Collection
```typescript
interface UserSubscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  type: 'monthly' | 'yearly';
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd: boolean;
  createdAt: Timestamp;
}
```

## Services Implementation

### Shop Service
```typescript
// src/services/shopService.ts
export class ShopService {
  // Get all shop items
  static async getShopItems(category?: string): Promise<ShopItem[]> {
    let q = query(
      collection(db, 'shopItems'),
      where('isActive', '==', true),
      orderBy('price', 'asc')
    );

    if (category) {
      q = query(q, where('category', '==', category));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ShopItem[];
  }

  // Create payment intent for purchase
  static async createPaymentIntent(itemId: string): Promise<{ clientSecret: string; error?: string }> {
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return { clientSecret: '', error: 'Failed to create payment intent' };
    }
  }

  // Create subscription
  static async createSubscription(type: 'monthly' | 'yearly'): Promise<{ clientSecret: string; error?: string }> {
    try {
      const response = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return { clientSecret: '', error: 'Failed to create subscription' };
    }
  }

  // Get user's active subscription
  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const q = query(
      collection(db, 'userSubscriptions'),
      where('userId', '==', userId),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as UserSubscription;
  }
}
```

### Payment API Routes
```typescript
// pages/api/payments/create-intent.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { itemId } = req.body;
    
    // Get item details
    const itemDoc = await admin.firestore().collection('shopItems').doc(itemId).get();
    if (!itemDoc.exists) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = itemDoc.data() as ShopItem;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: item.price,
      currency: 'usd',
      metadata: { itemId, type: 'purchase' }
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: 'Payment creation failed' });
  }
}

// pages/api/payments/webhook.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleSubscriptionPayment(event.data.object);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: 'Webhook error' });
  }
}
```

## Frontend Components

### Shop Context
```typescript
// src/context/ShopContext.tsx
interface ShopContextType {
  items: ShopItem[];
  userSubscription: UserSubscription | null;
  isLoading: boolean;
  purchaseItem: (itemId: string) => Promise<boolean>;
  subscribe: (type: 'monthly' | 'yearly') => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadShopItems();
    if (user) {
      loadUserSubscription();
    }
  }, [user]);

  const loadShopItems = async () => {
    const shopItems = await ShopService.getShopItems();
    setItems(shopItems);
    setIsLoading(false);
  };

  const purchaseItem = async (itemId: string): Promise<boolean> => {
    // Implement Stripe payment flow
    return true;
  };

  // ... other methods
}
```

### Shop Display Component
```typescript
// src/components/shop/ShopDisplay.tsx
export default function ShopDisplay() {
  const { items, userSubscription, purchaseItem, subscribe } = useShop();
  const [selectedCategory, setSelectedCategory] = useState('backgrounds');

  const filteredItems = items.filter(item => 
    selectedCategory === 'backgrounds' ? item.type === 'background' :
    selectedCategory === 'subscription' ? item.type === 'subscription' :
    item.type === 'gems'
  );

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Shop</h2>
      
      {/* Category Tabs */}
      <div className="flex space-x-4 mb-6">
        {['backgrounds', 'subscription', 'gems'].map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg capitalize ${
              selectedCategory === category 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <ShopItemCard key={item.id} item={item} onPurchase={purchaseItem} />
        ))}
      </div>
    </div>
  );
}
```

### Shop Item Card
```typescript
// src/components/shop/ShopItemCard.tsx
interface ShopItemCardProps {
  item: ShopItem;
  onPurchase: (itemId: string) => Promise<boolean>;
}

export default function ShopItemCard({ item, onPurchase }: ShopItemCardProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async () => {
    setIsPurchasing(true);
    await onPurchase(item.id);
    setIsPurchasing(false);
  };

  const formatPrice = (price: number) => `$${(price / 100).toFixed(2)}`;

  return (
    <div className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors">
      <div className="aspect-video bg-gray-600 rounded-lg mb-3 overflow-hidden">
        <img 
          src={item.imageUrl} 
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      <h3 className="text-white font-medium mb-2">{item.name}</h3>
      <p className="text-gray-400 text-sm mb-4">{item.description}</p>
      
      <div className="flex justify-between items-center">
        <span className="text-green-400 font-bold">{formatPrice(item.price)}</span>
        <button
          onClick={handlePurchase}
          disabled={isPurchasing}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {isPurchasing ? 'Processing...' : 'Purchase'}
        </button>
      </div>
    </div>
  );
}
```

### Subscription Card
```typescript
// src/components/shop/SubscriptionCard.tsx
export default function SubscriptionCard() {
  const { userSubscription, subscribe, cancelSubscription } = useShop();

  const subscriptionPlans = [
    { type: 'monthly', price: 999, features: ['Premium backgrounds', 'Extra daily rewards', 'Priority support'] },
    { type: 'yearly', price: 9999, features: ['All monthly features', '2 months free', 'Exclusive content'] }
  ];

  return (
    <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-6">
      <h3 className="text-2xl font-bold text-white mb-4">DashDice Premium</h3>
      
      {userSubscription ? (
        <div className="text-white">
          <p>Active until: {userSubscription.currentPeriodEnd.toDate().toLocaleDateString()}</p>
          <button 
            onClick={cancelSubscription}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-4"
          >
            Cancel Subscription
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {subscriptionPlans.map(plan => (
            <div key={plan.type} className="bg-black/20 rounded-lg p-4">
              <h4 className="text-xl font-bold text-white mb-2 capitalize">{plan.type}</h4>
              <p className="text-3xl font-bold text-green-400 mb-4">
                ${(plan.price / 100).toFixed(2)}
                <span className="text-sm text-gray-300">/{plan.type === 'monthly' ? 'month' : 'year'}</span>
              </p>
              <ul className="text-gray-300 mb-4 space-y-2">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe(plan.type as 'monthly' | 'yearly')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
              >
                Subscribe
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Implementation Phases

### Phase 1: Core Setup (Week 1)
- Stripe integration and webhook setup
- Basic shop database schema
- Payment API routes

### Phase 2: Shop Interface (Week 2)
- Shop display components
- Background purchase flow
- Basic inventory management

### Phase 3: Subscription System (Week 3)
- Subscription creation and management
- Premium features implementation
- User subscription status tracking

### Phase 4: Polish & Security (Week 4)
- Payment security hardening
- Error handling and user feedback
- Purchase verification and anti-fraud

This concise implementation provides a complete shop system with background purchases and premium subscriptions while maintaining security and user experience standards.
