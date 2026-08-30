import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { DashboardHome } from '../../src/components/dashboard/DashboardHome';
import { Navbar } from '../../src/components/layout/Navbar';

function TestHost() {
  const { activeTab, searchQuery } = useData();
  return (
    <div>
      <div data-testid="current-tab">{activeTab}</div>
      <div data-testid="current-search-query">{searchQuery}</div>
      <Navbar />
      <DashboardHome />
    </div>
  );
}

describe('UX Fix: Quick Search Navigation on Intentional Action Only', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('1. Typing in Navbar search input DOES NOT immediately switch activeTab to search on change', () => {
    render(
      <DataProvider>
        <TestHost />
      </DataProvider>
    );

    expect(screen.getByTestId('current-tab')).toHaveTextContent('dashboard');

    const navbarInput = screen.getByPlaceholderText(/Tìm kiếm chủ đề, ghi chú, tài liệu, liên kết/i);

    act(() => {
      fireEvent.change(navbarInput, { target: { value: 'N' } });
    });

    // Tab must remain 'dashboard', NOT jump to 'search'
    expect(screen.getByTestId('current-tab')).toHaveTextContent('dashboard');
    expect(navbarInput).toHaveValue('N');

    act(() => {
      fireEvent.change(navbarInput, { target: { value: 'Nghiên cứu' } });
    });

    expect(screen.getByTestId('current-tab')).toHaveTextContent('dashboard');
    expect(navbarInput).toHaveValue('Nghiên cứu');
  });

  it('2. Submitting search via Enter key in Navbar switches activeTab to search and updates query', () => {
    render(
      <DataProvider>
        <TestHost />
      </DataProvider>
    );

    const navbarInput = screen.getByPlaceholderText(/Tìm kiếm chủ đề, ghi chú, tài liệu, liên kết/i);

    act(() => {
      fireEvent.change(navbarInput, { target: { value: 'Vi Diệu Pháp' } });
    });

    expect(screen.getByTestId('current-tab')).toHaveTextContent('dashboard');

    // Submit form (Enter key)
    act(() => {
      fireEvent.submit(navbarInput.closest('form')!);
    });

    expect(screen.getByTestId('current-tab')).toHaveTextContent('search');
    expect(screen.getByTestId('current-search-query')).toHaveTextContent('Vi Diệu Pháp');
  });

  it('3. DashboardHome does not render duplicate heavy search form (Phase 13 cleanup)', () => {
    render(
      <DataProvider>
        <TestHost />
      </DataProvider>
    );

    // Verify there is only one search input on the page (the Navbar one)
    const inputs = screen.getAllByPlaceholderText(/Tìm kiếm/i);
    expect(inputs.length).toBe(1);
  });
});
