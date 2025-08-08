# Donation Page Implementation Guide

## Overview
This README outlines the implementation of a donation page for DashDice, enabling supporters to contribute towards a £50,000 funding goal with real-time progress tracking, donor recognition, and reward tiers.

## Core Features
- **Donation Goal Tracking**: Visual progress toward £50,000 target
- **Multiple Payment Methods**: Stripe integration for cards, PayPal, bank transfers
- **Donation Tiers**: Different reward levels for various contribution amounts
- **Donor Recognition**: Public thank you wall with optional anonymity
- **Progress Visualization**: Real-time funding thermometer and statistics
- **Social Sharing**: Easy sharing to help spread awareness
- **Transparency**: Clear breakdown of how funds will be used

## Database Schema

### Firestore Collections

#### Donations Collection
```typescript
// src/types/index.ts
interface Donation {
  id: string;
  donorId?: string; // User ID if logged in, undefined for anonymous
  donorName: string; // Display name (can be "Anonymous")
  donorEmail?: string; // For receipt and updates
  amount: number; // Amount in pence (GBP)
  currency: 'GBP' | 'USD' | 'EUR';
  convertedAmount: number; // Amount converted to GBP in pence
  exchangeRate?: number; // Exchange rate used for conversion
  paymentMethod: 'stripe' | 'paypal' | 'bank_transfer';
  paymentIntentId?: string; // Stripe payment intent ID
  paypalOrderId?: string; // PayPal order ID
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  isAnonymous: boolean;
  message?: string; // Optional message from donor
  tier: 'supporter' | 'contributor' | 'champion' | 'legend' | 'founder';
  rewards: string[]; // Array of reward IDs earned
  createdAt: Timestamp;
  completedAt?: Timestamp;
  receipt?: {
    receiptNumber: string;
    receiptUrl?: string;
    sentAt?: Timestamp;
  };
  metadata?: Record<string, any>;
}
```

#### Donation Campaign Collection
```typescript
interface DonationCampaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number; // £50,000 in pence
  currentAmount: number; // Current total in pence
  currency: 'GBP';
  startDate: Timestamp;
  endDate?: Timestamp;
  isActive: boolean;
  donorCount: number;
  averageDonation: number;
  lastUpdated: Timestamp;
  milestones: {
    amount: number; // Amount in pence
    title: string;
    description: string;
    isReached: boolean;
    reachedAt?: Timestamp;
  }[];
  stats: {
    totalDonations: number;
    successfulPayments: number;
    failedPayments: number;
    refundedAmount: number;
    topDonation: number;
  };
}
```

#### Donation Tiers Collection
```typescript
interface DonationTier {
  id: string;
  name: string;
  minAmount: number; // Minimum amount in pence
  maxAmount?: number; // Maximum amount in pence (optional)
  color: string; // Badge color
  icon: string; // Emoji or icon
  description: string;
  rewards: {
    id: string;
    type: 'digital' | 'physical' | 'experience';
    title: string;
    description: string;
    deliveryMethod?: string;
  }[];
  benefits: string[];
  isVisible: boolean;
  sortOrder: number;
}
```

#### Donor Recognition Collection
```typescript
interface DonorRecognition {
  id: string;
  donationId: string;
  donorName: string;
  amount: number; // Amount in pence
  tier: string;
  message?: string;
  isAnonymous: boolean;
  isFeatured: boolean;
  featuredUntil?: Timestamp;
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  isApproved: boolean;
}
```

## Implementation Architecture

### 1. Donation Service

```typescript
// src/services/donationService.ts
import { 
  collection, 
  doc, 
  addDoc,
  updateDoc, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';

export class DonationService {
  private static readonly CAMPAIGN_ID = 'main_campaign_2024';
  private static readonly TARGET_AMOUNT = 5000000; // £50,000 in pence

  // Create donation record
  static async createDonation(donationData: Partial<Donation>): Promise<string> {
    try {
      const donation: Partial<Donation> = {
        ...donationData,
        status: 'pending',
        createdAt: serverTimestamp(),
        tier: this.calculateTier(donationData.amount || 0),
        rewards: this.getRewardsForAmount(donationData.amount || 0)
      };

      const docRef = await addDoc(collection(db, 'donations'), donation);
      return docRef.id;
    } catch (error) {
      console.error('Error creating donation:', error);
      throw error;
    }
  }

  // Complete donation and update campaign stats
  static async completeDonation(
    donationId: string, 
    paymentIntentId: string
  ): Promise<boolean> {
    try {
      return await runTransaction(db, async (transaction) => {
        // Get donation
        const donationRef = doc(db, 'donations', donationId);
        const donationDoc = await transaction.get(donationRef);
        
        if (!donationDoc.exists()) {
          throw new Error('Donation not found');
        }

        const donation = donationDoc.data() as Donation;
        
        // Update donation status
        transaction.update(donationRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          paymentIntentId
        });

        // Update campaign stats
        const campaignRef = doc(db, 'donationCampaigns', this.CAMPAIGN_ID);
        const campaignDoc = await transaction.get(campaignRef);
        
        if (campaignDoc.exists()) {
          const campaign = campaignDoc.data() as DonationCampaign;
          const newTotal = campaign.currentAmount + donation.convertedAmount;
          const newDonorCount = campaign.donorCount + 1;
          const newAverage = Math.round(newTotal / newDonorCount);

          transaction.update(campaignRef, {
            currentAmount: newTotal,
            donorCount: newDonorCount,
            averageDonation: newAverage,
            lastUpdated: serverTimestamp(),
            'stats.totalDonations': campaign.stats.totalDonations + 1,
            'stats.successfulPayments': campaign.stats.successfulPayments + 1,
            'stats.topDonation': Math.max(campaign.stats.topDonation, donation.convertedAmount)
          });

          // Check and update milestones
          const updatedMilestones = campaign.milestones.map(milestone => {
            if (!milestone.isReached && newTotal >= milestone.amount) {
              return {
                ...milestone,
                isReached: true,
                reachedAt: new Date()
              };
            }
            return milestone;
          });

          if (JSON.stringify(updatedMilestones) !== JSON.stringify(campaign.milestones)) {
            transaction.update(campaignRef, { milestones: updatedMilestones });
          }
        }

        // Add to donor recognition if not anonymous
        if (!donation.isAnonymous) {
          const recognitionRef = doc(collection(db, 'donorRecognition'));
          transaction.set(recognitionRef, {
            donationId: donationId,
            donorName: donation.donorName,
            amount: donation.convertedAmount,
            tier: donation.tier,
            message: donation.message,
            isAnonymous: false,
            isFeatured: donation.convertedAmount >= 10000, // £100+ featured
            featuredUntil: donation.convertedAmount >= 10000 
              ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week
              : null,
            createdAt: serverTimestamp(),
            isApproved: true // Auto-approve for now
          });
        }

        return true;
      });
    } catch (error) {
      console.error('Error completing donation:', error);
      return false;
    }
  }

  // Get campaign progress
  static async getCampaignProgress(): Promise<DonationCampaign | null> {
    try {
      const campaignDoc = await getDoc(doc(db, 'donationCampaigns', this.CAMPAIGN_ID));
      
      if (!campaignDoc.exists()) {
        // Create initial campaign if it doesn't exist
        const initialCampaign: DonationCampaign = {
          id: this.CAMPAIGN_ID,
          title: 'Help Us Reach £50,000',
          description: 'Support DashDice development and help us build the ultimate gaming platform',
          targetAmount: this.TARGET_AMOUNT,
          currentAmount: 0,
          currency: 'GBP',
          startDate: serverTimestamp() as any,
          isActive: true,
          donorCount: 0,
          averageDonation: 0,
          lastUpdated: serverTimestamp() as any,
          milestones: [
            {
              amount: 1000000, // £10,000
              title: 'First Milestone',
              description: 'Enhanced mobile app features',
              isReached: false
            },
            {
              amount: 2500000, // £25,000
              title: 'Halfway There!',
              description: 'Advanced tournament system',
              isReached: false
            },
            {
              amount: 4000000, // £40,000
              title: 'Almost There!',
              description: 'Professional esports integration',
              isReached: false
            },
            {
              amount: 5000000, // £50,000
              title: 'Goal Reached!',
              description: 'Full platform launch with all features',
              isReached: false
            }
          ],
          stats: {
            totalDonations: 0,
            successfulPayments: 0,
            failedPayments: 0,
            refundedAmount: 0,
            topDonation: 0
          }
        };

        await updateDoc(doc(db, 'donationCampaigns', this.CAMPAIGN_ID), initialCampaign);
        return initialCampaign;
      }

      return { id: campaignDoc.id, ...campaignDoc.data() } as DonationCampaign;
    } catch (error) {
      console.error('Error getting campaign progress:', error);
      return null;
    }
  }

  // Get recent donors for recognition wall
  static async getRecentDonors(limitCount: number = 20): Promise<DonorRecognition[]> {
    try {
      const q = query(
        collection(db, 'donorRecognition'),
        where('isApproved', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DonorRecognition[];
    } catch (error) {
      console.error('Error getting recent donors:', error);
      return [];
    }
  }

  // Get featured donors
  static async getFeaturedDonors(): Promise<DonorRecognition[]> {
    try {
      const q = query(
        collection(db, 'donorRecognition'),
        where('isFeatured', '==', true),
        where('featuredUntil', '>', new Date()),
        orderBy('amount', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DonorRecognition[];
    } catch (error) {
      console.error('Error getting featured donors:', error);
      return [];
    }
  }

  // Calculate donation tier based on amount
  private static calculateTier(amount: number): string {
    if (amount >= 100000) return 'founder'; // £1,000+
    if (amount >= 50000) return 'legend';   // £500+
    if (amount >= 25000) return 'champion'; // £250+
    if (amount >= 10000) return 'contributor'; // £100+
    return 'supporter'; // Under £100
  }

  // Get rewards for donation amount
  private static getRewardsForAmount(amount: number): string[] {
    const rewards: string[] = [];
    
    if (amount >= 1000) rewards.push('thank_you_email'); // £10+
    if (amount >= 2500) rewards.push('discord_role'); // £25+
    if (amount >= 5000) rewards.push('beta_access'); // £50+
    if (amount >= 10000) rewards.push('name_in_credits'); // £100+
    if (amount >= 25000) rewards.push('exclusive_dice_skin'); // £250+
    if (amount >= 50000) rewards.push('vip_status'); // £500+
    if (amount >= 100000) rewards.push('founder_badge'); // £1,000+

    return rewards;
  }

  // Format amount for display
  static formatAmount(amountInPence: number, currency: string = 'GBP'): string {
    const amount = amountInPence / 100;
    
    switch (currency) {
      case 'GBP':
        return new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP'
        }).format(amount);
      case 'USD':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(amount);
      case 'EUR':
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR'
        }).format(amount);
      default:
        return `£${amount.toFixed(2)}`;
    }
  }

  // Calculate progress percentage
  static calculateProgress(currentAmount: number): number {
    return Math.min((currentAmount / this.TARGET_AMOUNT) * 100, 100);
  }
}
```

### 2. Payment Processing Service

```typescript
// src/services/paymentService.ts
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export class PaymentService {
  // Create Stripe payment intent for donation
  static async createDonationPayment(
    amount: number,
    currency: string,
    donorEmail?: string,
    donorName?: string
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const response = await fetch('/api/donations/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          donorEmail,
          donorName
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const data = await response.json();
      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId
      };
    } catch (error) {
      console.error('Error creating donation payment:', error);
      throw error;
    }
  }

  // Process donation payment
  static async processDonationPayment(
    clientSecret: string,
    paymentMethod: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe not loaded');
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error processing donation payment:', error);
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  }

  // Create PayPal order for donation
  static async createPayPalDonation(
    amount: number,
    currency: string
  ): Promise<{ orderId: string }> {
    try {
      const response = await fetch('/api/donations/create-paypal-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create PayPal order');
      }

      const data = await response.json();
      return { orderId: data.orderId };
    } catch (error) {
      console.error('Error creating PayPal donation:', error);
      throw error;
    }
  }
}
```

## Frontend Components

### 1. Donation Page

```typescript
// src/app/donate/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { DonationService } from '@/services/donationService';
import { DonationForm } from '@/components/donations/DonationForm';
import { ProgressTracker } from '@/components/donations/ProgressTracker';
import { DonorWall } from '@/components/donations/DonorWall';
import { MilestoneProgress } from '@/components/donations/MilestoneProgress';
import { ImpactStatement } from '@/components/donations/ImpactStatement';
import { SocialShare } from '@/components/donations/SocialShare';

export default function DonatePage() {
  const [campaign, setCampaign] = useState<DonationCampaign | null>(null);
  const [recentDonors, setRecentDonors] = useState<DonorRecognition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCampaignData();
  }, []);

  const loadCampaignData = async () => {
    setIsLoading(true);
    try {
      const [campaignData, donors] = await Promise.all([
        DonationService.getCampaignProgress(),
        DonationService.getRecentDonors(50)
      ]);

      setCampaign(campaignData);
      setRecentDonors(donors);
    } catch (error) {
      console.error('Error loading campaign data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Campaign Not Found</h1>
          <p className="text-gray-400">Please try again later.</p>
        </div>
      </div>
    );
  }

  const progressPercentage = DonationService.calculateProgress(campaign.currentAmount);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-900 to-purple-900 py-20">
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Help Us Build the Future of Gaming
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto">
              Support DashDice's journey to become the ultimate gaming platform. 
              Every donation brings us closer to our £50,000 goal.
            </p>
            
            {/* Main Progress Tracker */}
            <ProgressTracker
              current={campaign.currentAmount}
              target={campaign.targetAmount}
              percentage={progressPercentage}
              donorCount={campaign.donorCount}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Donation Form and Info */}
          <div className="space-y-8">
            <DonationForm onSuccess={loadCampaignData} />
            <ImpactStatement />
            <SocialShare 
              campaign={campaign}
              progressPercentage={progressPercentage}
            />
          </div>

          {/* Right Column - Progress and Recognition */}
          <div className="space-y-8">
            <MilestoneProgress milestones={campaign.milestones} />
            <DonorWall donors={recentDonors} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 2. Progress Tracker Component

```typescript
// src/components/donations/ProgressTracker.tsx
'use client';

import React from 'react';
import { DonationService } from '@/services/donationService';

interface ProgressTrackerProps {
  current: number;
  target: number;
  percentage: number;
  donorCount: number;
}

export function ProgressTracker({ current, target, percentage, donorCount }: ProgressTrackerProps) {
  const currentFormatted = DonationService.formatAmount(current);
  const targetFormatted = DonationService.formatAmount(target);
  const remaining = target - current;
  const remainingFormatted = DonationService.formatAmount(remaining);

  return (
    <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto">
      {/* Amount Display */}
      <div className="text-center mb-6">
        <div className="text-4xl md:text-5xl font-bold text-white mb-2">
          {currentFormatted}
        </div>
        <div className="text-lg text-gray-200">
          raised of {targetFormatted} goal
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-700 rounded-full h-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-1000 ease-out rounded-full relative"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          >
            <div className="absolute inset-0 bg-white bg-opacity-20 animate-pulse"></div>
          </div>
        </div>
        <div className="flex justify-between text-sm text-gray-300 mt-2">
          <span>0%</span>
          <span className="font-semibold">{percentage.toFixed(1)}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-black bg-opacity-30 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{donorCount}</div>
          <div className="text-sm text-gray-300">Supporters</div>
        </div>
        <div className="bg-black bg-opacity-30 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{remainingFormatted}</div>
          <div className="text-sm text-gray-300">To Go</div>
        </div>
      </div>

      {/* Urgency Message */}
      {percentage >= 80 && (
        <div className="mt-4 text-center text-yellow-300 font-medium">
          🔥 Almost there! Help us reach our goal!
        </div>
      )}
    </div>
  );
}
```

### 3. Donation Form Component

```typescript
// src/components/donations/DonationForm.tsx
'use client';

import React, { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { DonationService } from '@/services/donationService';
import { PaymentService } from '@/services/paymentService';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface DonationFormProps {
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500];

function DonationFormContent({ onSuccess }: DonationFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [amount, setAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [donorName, setDonorName] = useState<string>('');
  const [donorEmail, setDonorEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');

  const selectedAmount = customAmount ? parseFloat(customAmount) : amount;
  const amountInPence = Math.round(selectedAmount * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || selectedAmount < 1) return;

    setIsProcessing(true);

    try {
      if (paymentMethod === 'stripe') {
        await handleStripePayment();
      } else {
        await handlePayPalPayment();
      }
    } catch (error) {
      console.error('Payment error:', error);
      // Show error message
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripePayment = async () => {
    if (!stripe || !elements) return;

    // Create donation record
    const donationId = await DonationService.createDonation({
      donorName: isAnonymous ? 'Anonymous' : donorName,
      donorEmail: donorEmail,
      amount: amountInPence,
      currency: 'GBP',
      convertedAmount: amountInPence,
      paymentMethod: 'stripe',
      isAnonymous,
      message: message.trim() || undefined
    });

    // Create payment intent
    const { clientSecret } = await PaymentService.createDonationPayment(
      amountInPence,
      'GBP',
      donorEmail,
      isAnonymous ? undefined : donorName
    );

    // Confirm payment
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: isAnonymous ? undefined : donorName,
          email: donorEmail
        }
      }
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    // Complete donation
    await DonationService.completeDonation(donationId, result.paymentIntent.id);
    
    // Reset form and notify parent
    resetForm();
    onSuccess();
  };

  const handlePayPalPayment = async () => {
    // PayPal integration would go here
    console.log('PayPal payment not implemented yet');
  };

  const resetForm = () => {
    setAmount(25);
    setCustomAmount('');
    setDonorName('');
    setDonorEmail('');
    setMessage('');
    setIsAnonymous(false);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make a Donation</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amount Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Choose Amount (GBP)
          </label>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {PRESET_AMOUNTS.map((presetAmount) => (
              <button
                key={presetAmount}
                type="button"
                onClick={() => {
                  setAmount(presetAmount);
                  setCustomAmount('');
                }}
                className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                  amount === presetAmount && !customAmount
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                £{presetAmount}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">£</span>
            <input
              type="number"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              step="0.01"
            />
          </div>
        </div>

        {/* Donor Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your name"
              required={!isAnonymous}
              disabled={isAnonymous}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
              required
            />
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Message (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Leave a message of support..."
            rows={3}
            maxLength={200}
          />
        </div>

        {/* Anonymous Option */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="anonymous"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
          />
          <label htmlFor="anonymous" className="ml-2 text-sm text-gray-300">
            Donate anonymously
          </label>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Payment Method
          </label>
          <div className="flex space-x-4 mb-4">
            <button
              type="button"
              onClick={() => setPaymentMethod('stripe')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                paymentMethod === 'stripe'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              💳 Card
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('paypal')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                paymentMethod === 'paypal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              PayPal
            </button>
          </div>

          {paymentMethod === 'stripe' && (
            <div className="p-4 bg-gray-700 rounded-lg">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#ffffff',
                      '::placeholder': {
                        color: '#9ca3af',
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing || !selectedAmount || selectedAmount < 1}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            `Donate £${selectedAmount.toFixed(2)}`
          )}
        </button>
      </form>

      {/* Security Notice */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        🔒 Secure payment processing by Stripe. Your information is safe.
      </div>
    </div>
  );
}

export function DonationForm({ onSuccess }: DonationFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <DonationFormContent onSuccess={onSuccess} />
    </Elements>
  );
}
```

### 4. Donor Recognition Wall

```typescript
// src/components/donations/DonorWall.tsx
'use client';

import React from 'react';
import { DonationService } from '@/services/donationService';

interface DonorWallProps {
  donors: DonorRecognition[];
}

export function DonorWall({ donors }: DonorWallProps) {
  const getTierIcon = (tier: string): string => {
    switch (tier) {
      case 'founder': return '👑';
      case 'legend': return '⭐';
      case 'champion': return '🏆';
      case 'contributor': return '💎';
      case 'supporter': return '❤️';
      default: return '🎯';
    }
  };

  const getTierColor = (tier: string): string => {
    switch (tier) {
      case 'founder': return 'text-yellow-400';
      case 'legend': return 'text-purple-400';
      case 'champion': return 'text-blue-400';
      case 'contributor': return 'text-green-400';
      case 'supporter': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const featuredDonors = donors.filter(donor => donor.isFeatured);
  const recentDonors = donors.filter(donor => !donor.isFeatured);

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Thank You Wall</h2>
      
      {/* Featured Donors */}
      {featuredDonors.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <span className="mr-2">🌟</span>
            Featured Supporters
          </h3>
          <div className="space-y-4">
            {featuredDonors.map((donor) => (
              <div
                key={donor.id}
                className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-4 border border-blue-500"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{getTierIcon(donor.tier)}</span>
                    <span className="font-semibold text-white">{donor.donorName}</span>
                    <span className={`text-sm ${getTierColor(donor.tier)} capitalize`}>
                      {donor.tier}
                    </span>
                  </div>
                  <span className="text-green-400 font-bold">
                    {DonationService.formatAmount(donor.amount)}
                  </span>
                </div>
                {donor.message && (
                  <p className="text-gray-300 text-sm italic">"{donor.message}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Donors */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <span className="mr-2">❤️</span>
          Recent Supporters ({recentDonors.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {recentDonors.map((donor) => (
            <div
              key={donor.id}
              className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{getTierIcon(donor.tier)}</span>
                  <span className="text-white text-sm font-medium truncate">
                    {donor.donorName}
                  </span>
                </div>
                <span className="text-green-400 text-sm font-semibold">
                  {DonationService.formatAmount(donor.amount)}
                </span>
              </div>
              {donor.message && (
                <p className="text-gray-300 text-xs mt-1 truncate">
                  "{donor.message}"
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {recentDonors.length === 0 && featuredDonors.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎯</div>
          <p className="text-gray-400">Be the first to support our mission!</p>
        </div>
      )}
    </div>
  );
}
```

## API Routes

### Payment Intent Creation

```typescript
// src/app/api/donations/create-payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const { amount, currency, donorEmail, donorName } = await request.json();

    // Validate amount (minimum £1)
    if (amount < 100) {
      return NextResponse.json(
        { error: 'Minimum donation amount is £1' },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      metadata: {
        type: 'donation',
        donorEmail: donorEmail || '',
        donorName: donorName || 'Anonymous'
      },
      receipt_email: donorEmail || undefined,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
```

### Webhook Handler

```typescript
// src/app/api/donations/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { DonationService } from '@/services/donationService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      // Find and complete the donation
      if (paymentIntent.metadata.type === 'donation') {
        // Logic to find donation by payment intent ID and complete it
        console.log('Donation payment succeeded:', paymentIntent.id);
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      console.log('Donation payment failed:', failedPayment.id);
      break;

    default:
      console.log('Unhandled event type:', event.type);
  }

  return NextResponse.json({ received: true });
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. **Database Setup**
   - Create Firestore collections for donations and campaign
   - Set up donation tiers and rewards system
   - Implement basic donation service

2. **Payment Integration**
   - Stripe payment processing setup
   - Basic donation form with card payments
   - Webhook handling for payment confirmations

### Phase 2: UI Development (Week 2)
1. **Donation Page**
   - Progress tracker with visual thermometer
   - Donation form with amount selection
   - Basic donor recognition wall

2. **Payment Methods**
   - Multiple payment options (Stripe, PayPal)
   - Mobile-responsive donation flow
   - Payment confirmation and receipts

### Phase 3: Enhanced Features (Week 3)
1. **Advanced Recognition**
   - Featured donor highlights
   - Milestone celebrations
   - Social sharing integration

2. **Analytics & Reporting**
   - Real-time progress updates
   - Donation analytics dashboard
   - Impact statements and updates

### Phase 4: Launch & Optimization (Week 4)
1. **Testing & Security**
   - Payment processing testing
   - Security audit and compliance
   - Performance optimization

2. **Marketing Integration**
   - Social media sharing
   - Email campaigns for donors
   - Progress update notifications

This comprehensive donation system provides transparent progress tracking, multiple payment options, and meaningful donor recognition to help DashDice reach its £50,000 funding goal while building a supportive community around the project.
