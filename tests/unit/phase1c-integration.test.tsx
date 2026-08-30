import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "../../src/App";

describe("Phase 1C Integration Test Suite (End-to-End UI & Hotkeys)", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("1. Render App thành công và kích hoạt Command Palette bằng phím tắt Ctrl+K", async () => {
    render(<App />);

    expect(
      screen.getAllByRole("heading", { level: 1 })[0],
    ).toHaveTextContent(/Nghiên Cứu/i);

    // Command Palette ban đầu không hiển thị
    expect(
      screen.queryByRole("dialog", { name: /command-palette-title/i }),
    ).not.toBeInTheDocument();

    // Nhấn Ctrl+K
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    // Command Palette mở lên
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Tìm lệnh, chủ đề nghiên cứu/i),
      ).toBeInTheDocument();
    });

    // Nhấn Escape để đóng Command Palette
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText(/Tìm lệnh, chủ đề nghiên cứu/i),
      ).not.toBeInTheDocument();
    });
  });

  it("2. Kích hoạt Shortcuts Modal khi nhấn phím ?", async () => {
    render(<App />);

    // Nhấn phím ?
    fireEvent.keyDown(window, { key: "?" });

    await waitFor(() => {
      expect(screen.getByText(/Phím Tắt Hệ Thống/i)).toBeInTheDocument();
    });

    // Đóng bằng phím Escape
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByText(/Phím Tắt Hệ Thống/i)).not.toBeInTheDocument();
    });
  });

  it("3. Chuyển đổi giao diện Dark/Light Mode qua ThemeToggle trên Navbar", async () => {
    render(<App />);

    // Tìm nút ThemeToggle
    const themeBtn = screen.getByLabelText(/Chuyển sang giao diện/i);
    expect(themeBtn).toBeInTheDocument();

    // Click đổi theme
    fireEvent.click(themeBtn);

    // Kiểm tra class dark trên document.documentElement
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Click đổi lại về Light
    fireEvent.click(screen.getByLabelText(/Chuyển sang giao diện Sáng/i));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("4. Điều hướng sang tab Tra Cứu (Search) và hiển thị SearchFilters", async () => {
    render(<App />);

    // Click vào search input trên Navbar và submit form tìm kiếm
    const searchInput = screen.getByPlaceholderText(/Tìm kiếm chủ đề, ghi chú/i);
    fireEvent.change(searchInput, { target: { value: "Abhidharma" } });
    fireEvent.submit(searchInput.closest("form")!);

    await waitFor(() => {
      expect(
        screen.getByText(/Công Cụ Tra Cứu Toàn Diện/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Bộ Lọc Chuyên Sâu/i)).toBeInTheDocument();
    });
  });
});
