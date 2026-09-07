import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationSettingsModal } from "../../src/components/research/NotificationSettingsModal";

describe("NotificationSettingsModal Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <NotificationSettingsModal isOpen={false} onClose={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders modal dialog when isOpen is true", () => {
    render(<NotificationSettingsModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByTestId("notification-settings-modal")).toBeInTheDocument();
    expect(
      screen.getByText("Cài Đặt Thông Báo Thông Minh")
    ).toBeInTheDocument();
    expect(screen.getByTestId("permission-status-badge")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-smart-notifications")).toBeInTheDocument();
  });

  it("allows toggling smart notifications and clicking snooze buttons", () => {
    render(<NotificationSettingsModal isOpen={true} onClose={() => {}} />);

    const checkbox = screen.getByTestId("toggle-smart-notifications");
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    // Click 1d snooze button
    const snooze1d = screen.getByTestId("snooze-1d-btn");
    fireEvent.click(snooze1d);

    expect(
      screen.getByTestId("notification-feedback-message")
    ).toHaveTextContent(/Đã tạm hoãn thông báo/i);
  });

  it("invokes onClose when clicking close or done button", () => {
    const handleClose = vi.fn();
    render(<NotificationSettingsModal isOpen={true} onClose={handleClose} />);

    fireEvent.click(screen.getByTestId("close-notification-modal-btn"));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("done-btn"));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
