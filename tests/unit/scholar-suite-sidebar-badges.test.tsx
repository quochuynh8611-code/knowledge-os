import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataProvider } from '../../src/context/DataContext';
import { Sidebar } from '../../src/components/layout/Sidebar';
import { getScholarSuiteCounts } from '../../src/lib/scholarSuite/selectors';

describe('Phase C: ScholarSuite Dynamic Sidebar Badges', () => {
  it('renders dynamic data-driven badges for specialized deep tools', () => {
    render(
      <DataProvider>
        <Sidebar />
      </DataProvider>
    );

    const counts = getScholarSuiteCounts();
    expect(counts.totalCittas).toBeGreaterThanOrEqual(2);
    expect(counts.totalHexagrams).toBeGreaterThanOrEqual(2);

    // Verify dynamic badge values based on registry counts
    const cittaBadge = `${counts.totalCittas} Tâm`;
    const hexagramBadge = `${counts.totalHexagrams} Quẻ`;

    expect(screen.getByText(cittaBadge)).toBeInTheDocument();
    expect(screen.getByText(hexagramBadge)).toBeInTheDocument();

    // Verify lexicon has no badge (preserving UI parity)
    const lexiconButton = screen.getByText('Từ điển thuật ngữ').closest('button');
    expect(lexiconButton).toBeInTheDocument();
    expect(lexiconButton?.querySelector('.rounded-full')).toBeNull();
  });

  it('regression: specialized badges must not contain obsolete hardcoded strings if count differs', () => {
    render(
      <DataProvider>
        <Sidebar />
      </DataProvider>
    );

    const counts = getScholarSuiteCounts();
    // If counts are currently sample registry counts (e.g. 2), it shouldn't show hardcoded '89 Tâm' or '64 Quẻ'
    if (counts.totalCittas !== 89) {
      expect(screen.queryByText('89 Tâm')).toBeNull();
    }
    if (counts.totalHexagrams !== 64) {
      expect(screen.queryByText('64 Quẻ')).toBeNull();
    }
  });
});
