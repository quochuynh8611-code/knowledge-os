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

  it('1. Typing in DashboardHome quick search input DOES NOT immediately switch activeTab to search', () => {
    render(
      <DataProvider>
        <TestHost />
      </DataProvider>
    );

    expect(screen.getByTestId('current-tab')).toHaveTextContent('dashboard');

    const searchInput = screen.getByPlaceholderText(/Tra cứu chủ đề, ghi chú, khái niệm học thuật/i);

    // Type a single character "N"
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'N' } });
    });

    // Tab must remain 'dashboard', NOT jump to 'search'
    expect(screen.getByTestId('current-tab')).toHaveTextContent('dashboard');
    expect(searchInput).toHaveValue('N');

    // Type more characters
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Nghiên cứu' } });
    });

    expect(screen.getByTestId('current-tab')).toHaveTextContent('dashboard');
    expect(searchInput).toHaveValue('Nghiên cứu');
  });

  it('2. Submitting search via Enter key in DashboardHome switches activeTab to search and updates query', () => {
    render(
      <DataProvider>
        <TestHost />
      </DataProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Tra cứu chủ đề, ghi chú, khái niệm học thuật/i);

    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Vi Diệu Pháp' } });
    });

    expect(screen.getByTestId('current-tab')).toHaveTextContent('dashboard');

    // Submit form (Enter key)
    act(() => {
      fireEvent.submit(searchInput.closest('form')!);
    });

    expect(screen.getByTestId('current-tab')).toHaveTextContent('search');
    expect(screen.getByTestId('current-search-query')).toHaveTextContent('Vi Diệu Pháp');
  });

  it('3. Submitting search via Search button in DashboardHome switches activeTab to search', () => {
    render(
      <DataProvider>
        <TestHost />
      </DataProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Tra cứu chủ đề, ghi chú, khái niệm học thuật/i);

    act(() => {
      fireEvent.change(searchInput, { target: { value: 'Kỳ Môn Độn Giáp' } });
    });

    const searchBtn = screen.getByRole('button', { name: /^Tìm$/i });

    act(() => {
      fireEvent.click(searchBtn);
    });

    expect(screen.getByTestId('current-tab')).toHaveTextContent('search');
    expect(screen.getByTestId('current-search-query')).toHaveTextContent('Kỳ Môn Độn Giáp');
  });

  it('4. Clicking popular keyword tag switches activeTab to search and sets tag query', () => {
    render(
      <DataProvider>
        <TestHost />
      </DataProvider>
    );

    const tagBtn = screen.getByRole('button', { name: /#Abhidharma/i });

    act(() => {
      fireEvent.click(tagBtn);
    });

    expect(screen.getByTestId('current-tab')).toHaveTextContent('search');
    expect(screen.getByTestId('current-search-query')).toHaveTextContent('Abhidharma');
  });

  it('5. Typing in Navbar search input DOES NOT immediately switch activeTab to search on change', () => {
    render(
      <DataProvider>
        <TestHost />
      </DataProvider>
    );

    expect(screen.getByTestId('current-tab')).toHaveTextContent('dashboard');

    const navbarInput = screen.getByPlaceholderText(/Tìm kiếm chủ đề, ghi chú, tài liệu, liên kết/i);

    act(() => {
      fireEvent.change(navbarInput, { target: { value: 'Thiền' } });
    });

    expect(screen.getByTestId('current-tab')).toHaveTextContent('dashboard');

    // Press Enter to submit
    act(() => {
      fireEvent.submit(navbarInput.closest('form')!);
    });

    expect(screen.getByTestId('current-tab')).toHaveTextContent('search');
    expect(screen.getByTestId('current-search-query')).toHaveTextContent('Thiền');
  });
});
