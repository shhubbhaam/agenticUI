// src/schemas/homeLayoutSchema.ts
// React Native side of the catalogue: maps contract component names to RN components.
// The contract itself (Zod, versioned, platform-neutral) lives in src/contracts/homeLayout.ts.
import type React from 'react';
import { HomeCard } from '../ui/organisms/home/HomeCard';
import { NextStepCard } from '../ui/molecules/home/NextStepCard';
import { PracticeCard } from '../ui/organisms/practice/PracticeCard';
import { RevisitSection } from '../ui/organisms/practice/RevisitSection';
import type { SlotComponent } from '../contracts/homeLayout';

export const TrustedCatalogue: Record<SlotComponent['component'], React.ComponentType<any>> = {
  HomeCard,
  NextStepCard,
  PracticeCard,
  RevisitSection,
};
