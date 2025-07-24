'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export const FontDemo: React.FC = () => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="font-orbitron">🎯 Font & Background Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-orbitron text-lg font-semibold mb-2">Orbitron Font Examples:</h3>
          <div className="space-y-2">
            <p className="font-orbitron font-light text-sm">Light Weight (300)</p>
            <p className="font-orbitron font-normal text-base">Normal Weight (400)</p>
            <p className="font-orbitron font-medium text-lg">Medium Weight (500)</p>
            <p className="font-orbitron font-semibold text-xl">Semibold Weight (600)</p>
            <p className="font-orbitron font-bold text-2xl">Bold Weight (700)</p>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <p className="text-sm text-gray-600">
            ✅ <strong>6 Backgrounds</strong> automatically granted to new users<br/>
            ✅ <strong>Orbitron Font</strong> configured globally<br/>
            ✅ <strong>Background Selector</strong> available in inventory<br/>
            ✅ <strong>Real-time Sync</strong> with Firebase
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
