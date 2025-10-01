'use client';

import { ScrollablePageWrapper } from '@/components/pages/ScrollablePageWrapper';
import { DonationPageComponent } from '@/components/pages/DonationPageComponent';

export default function DonationPage() {
  return (
    <ScrollablePageWrapper>
      <DonationPageComponent />
    </ScrollablePageWrapper>
  );
}