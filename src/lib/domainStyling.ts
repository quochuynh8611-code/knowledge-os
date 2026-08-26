import React from 'react';
import {
  BookOpen,
  Compass,
  Sparkles,
  Folder,
  Globe,
  Layers,
  Brain,
  Bookmark,
  Library,
} from 'lucide-react';
import { Category } from '../types';

export interface DomainStyleToken {
  icon: React.ElementType;
  iconBg: string;
  hoverBorder: string;
  progressBar: string;
  percentText: string;
  actionText: string;
  arrowHover: string;
  sidebarIconColor: string;
}

export interface DomainPaletteConfig {
  id: string;
  icon: React.ElementType;
  iconBg: string;
  hoverBorder: string;
  progressBar: string;
  percentText: string;
  actionText: string;
  arrowHover: string;
  sidebarIconColor: string;
}

export const DOMAIN_PALETTES: DomainPaletteConfig[] = [
  {
    id: 'amber',
    icon: Sparkles,
    iconBg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300',
    hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600',
    progressBar: 'bg-amber-600 dark:bg-amber-500',
    percentText: 'text-amber-800 dark:text-amber-300',
    actionText: 'text-amber-700 dark:text-amber-400',
    arrowHover: 'group-hover:text-amber-700 dark:group-hover:text-amber-400',
    sidebarIconColor: 'text-amber-700 dark:text-amber-400',
  },
  {
    id: 'indigo',
    icon: Compass,
    iconBg: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300',
    hoverBorder: 'hover:border-indigo-400 dark:hover:border-indigo-600',
    progressBar: 'bg-indigo-600 dark:bg-indigo-500',
    percentText: 'text-indigo-800 dark:text-indigo-300',
    actionText: 'text-indigo-700 dark:text-indigo-400',
    arrowHover: 'group-hover:text-indigo-700 dark:group-hover:text-indigo-400',
    sidebarIconColor: 'text-indigo-700 dark:text-indigo-400',
  },
  {
    id: 'emerald',
    icon: Layers,
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300',
    hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-600',
    progressBar: 'bg-emerald-600 dark:bg-emerald-500',
    percentText: 'text-emerald-800 dark:text-emerald-300',
    actionText: 'text-emerald-700 dark:text-emerald-400',
    arrowHover: 'group-hover:text-emerald-700 dark:group-hover:text-emerald-400',
    sidebarIconColor: 'text-emerald-700 dark:text-emerald-400',
  },
  {
    id: 'sky',
    icon: Globe,
    iconBg: 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300',
    hoverBorder: 'hover:border-sky-400 dark:hover:border-sky-600',
    progressBar: 'bg-sky-600 dark:bg-sky-500',
    percentText: 'text-sky-800 dark:text-sky-300',
    actionText: 'text-sky-700 dark:text-sky-400',
    arrowHover: 'group-hover:text-sky-700 dark:group-hover:text-sky-400',
    sidebarIconColor: 'text-sky-700 dark:text-sky-400',
  },
  {
    id: 'rose',
    icon: Bookmark,
    iconBg: 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300',
    hoverBorder: 'hover:border-rose-400 dark:hover:border-rose-600',
    progressBar: 'bg-rose-600 dark:bg-rose-500',
    percentText: 'text-rose-800 dark:text-rose-300',
    actionText: 'text-rose-700 dark:text-rose-400',
    arrowHover: 'group-hover:text-rose-700 dark:group-hover:text-rose-400',
    sidebarIconColor: 'text-rose-700 dark:text-rose-400',
  },
  {
    id: 'teal',
    icon: Library,
    iconBg: 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300',
    hoverBorder: 'hover:border-teal-400 dark:hover:border-teal-600',
    progressBar: 'bg-teal-600 dark:bg-teal-500',
    percentText: 'text-teal-800 dark:text-teal-300',
    actionText: 'text-teal-700 dark:text-teal-400',
    arrowHover: 'group-hover:text-teal-700 dark:group-hover:text-teal-400',
    sidebarIconColor: 'text-teal-700 dark:text-teal-400',
  },
  {
    id: 'purple',
    icon: Brain,
    iconBg: 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300',
    hoverBorder: 'hover:border-purple-400 dark:hover:border-purple-600',
    progressBar: 'bg-purple-600 dark:bg-purple-500',
    percentText: 'text-purple-800 dark:text-purple-300',
    actionText: 'text-purple-700 dark:text-purple-400',
    arrowHover: 'group-hover:text-purple-700 dark:group-hover:text-purple-400',
    sidebarIconColor: 'text-purple-700 dark:text-purple-400',
  },
  {
    id: 'stone',
    icon: BookOpen,
    iconBg: 'bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200',
    hoverBorder: 'hover:border-stone-400 dark:hover:border-stone-600',
    progressBar: 'bg-stone-600 dark:bg-stone-400',
    percentText: 'text-stone-800 dark:text-stone-300',
    actionText: 'text-stone-700 dark:text-stone-300',
    arrowHover: 'group-hover:text-stone-700 dark:group-hover:text-stone-300',
    sidebarIconColor: 'text-stone-700 dark:text-stone-300',
  },
];

/**
 * Deterministically hashes a string to a non-negative integer.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Resolves a balanced, neutral, deterministic presentation style for any Category.
 * No hardcoded domain favoritism — all domains receive rich, distinct palettes.
 */
export function getNeutralDomainStyle(category: Category): DomainStyleToken {
  if (!category) {
    return DOMAIN_PALETTES[0];
  }

  // 1. If category has a known color keyword or hex that maps to a palette
  if (category.color) {
    const matchedPalette = DOMAIN_PALETTES.find(
      (p) => p.id === category.color || category.color?.toLowerCase().includes(p.id)
    );
    if (matchedPalette) {
      return matchedPalette;
    }
  }

  // 2. Deterministic selection based on id or slug or name
  const seedKey = category.id || category.slug || category.name || 'default-domain';
  const index = hashString(seedKey) % DOMAIN_PALETTES.length;
  const palette = DOMAIN_PALETTES[index] || DOMAIN_PALETTES[0];

  return {
    icon: palette.icon,
    iconBg: palette.iconBg,
    hoverBorder: palette.hoverBorder,
    progressBar: palette.progressBar,
    percentText: palette.percentText,
    actionText: palette.actionText,
    arrowHover: palette.arrowHover,
    sidebarIconColor: palette.sidebarIconColor,
  };
}
