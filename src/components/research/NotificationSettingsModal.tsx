import React, { useState, useEffect } from "react";
import {
  getNotificationConfig,
  saveNotificationConfig,
  requestNotificationPermission,
  snoozeAlert,
  sendTestNotification,
  getNotificationHistory,
  clearNotificationHistory,
  type SmartNotificationConfig,
  type NotificationLogEntry,
  type SnoozeDuration,
} from "../../lib/smartNotificationService";

export interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  className = "",
}) => {
  const [config, setConfig] = useState<SmartNotificationConfig>(getNotificationConfig());
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [history, setHistory] = useState<NotificationLogEntry[]>([]);
  const [testSentMessage, setTestSentMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(getNotificationConfig());
      setHistory(getNotificationHistory());
      if (typeof window !== "undefined" && "Notification" in window) {
        setPermission(Notification.permission);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleEnabled = () => {
    const updated = saveNotificationConfig({ enabled: !config.enabled });
    setConfig(updated);
  };

  const handleThresholdChange = (val: number) => {
    const updated = saveNotificationConfig({ targetRetentionThreshold: val });
    setConfig(updated);
  };

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === "granted") {
      setTestSentMessage("Quyền thông báo trình duyệt đã được cấp thành công!");
    }
  };

  const handleSnooze = (duration: SnoozeDuration) => {
    snoozeAlert("global", duration);
    setConfig(getNotificationConfig());
    setTestSentMessage(`Đã tạm hoãn thông báo trong ${duration}.`);
  };

  const handleClearSnooze = () => {
    const nextSnoozed = { ...config.snoozedUntil };
    delete nextSnoozed["global"];
    const updated = saveNotificationConfig({ snoozedUntil: nextSnoozed });
    setConfig(updated);
    setTestSentMessage("Đã hủy bỏ trạng thái tạm hoãn thông báo.");
  };

  const handleSendTest = async () => {
    setTestSentMessage("Đang gửi thông báo thử nghiệm...");
    const ok = await sendTestNotification();
    setHistory(getNotificationHistory());
    if (ok) {
      setTestSentMessage("Đã gửi thông báo thử nghiệm thành công!");
    } else {
      setTestSentMessage("Không thể hiển thị thông báo. Hãy kiểm tra lại quyền.");
    }
  };

  const isGlobalSnoozed =
    Boolean(config.snoozedUntil["global"]) &&
    new Date(config.snoozedUntil["global"]).getTime() > Date.now();

  return (
    <div
      data-testid="notification-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🔔</span>
            <h3
              id="notification-modal-title"
              className="text-base font-bold text-slate-900 dark:text-slate-100"
            >
              Cài Đặt Thông Báo Thông Minh
            </h3>
          </div>
          <button
            type="button"
            data-testid="close-notification-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Status Message Banner */}
        {testSentMessage && (
          <div
            data-testid="notification-feedback-message"
            className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-700 dark:text-indigo-300 rounded-lg flex items-center justify-between"
          >
            <span>{testSentMessage}</span>
            <button
              type="button"
              onClick={() => setTestSentMessage(null)}
              className="text-indigo-400 hover:text-indigo-600 text-xs ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
          {/* Permission Section */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Quyền thông báo trình duyệt:
              </span>
              <span
                data-testid="permission-status-badge"
                className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] ${
                  permission === "granted"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : permission === "denied"
                    ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                }`}
              >
                {permission === "granted"
                  ? "Đã cấp quyền"
                  : permission === "denied"
                  ? "Bị từ chối"
                  : "Chưa cấp quyền"}
              </span>
            </div>

            {permission !== "granted" && (
              <button
                type="button"
                data-testid="request-permission-btn"
                onClick={handleRequestPermission}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
              >
                Yêu cầu cấp quyền Browser Notification
              </button>
            )}
          </div>

          {/* Toggle Enable & Retention Threshold */}
          <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  Bật nhắc nhở trước khi quên
                </div>
                <div className="text-[11px] text-slate-400">
                  Tự động cảnh báo khi thẻ chạm ngưỡng suy giảm trong 24h
                </div>
              </div>
              <input
                type="checkbox"
                data-testid="toggle-smart-notifications"
                checked={config.enabled}
                onChange={handleToggleEnabled}
                className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
              />
            </div>

            {/* Threshold Slider */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex justify-between font-medium text-[11px]">
                <span>Ngưỡng cảnh báo suy giảm:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {Math.round(config.targetRetentionThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="0.9"
                step="0.05"
                value={config.targetRetentionThreshold}
                onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                className="w-full cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>60% (Ít nhắc hơn)</span>
                <span>80% (Khuyến nghị)</span>
                <span>90% (Khắt khe)</span>
              </div>
            </div>
          </div>

          {/* Rate Limiting Policies Info */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1.5">
              <span>🛡️</span> Chính sách chống làm phiền (Rate Limiting)
            </div>
            <ul className="list-disc list-inside text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pl-1">
              <li>Tối đa {config.maxNotificationsPer24h} thông báo trong 24 giờ liên tục.</li>
              <li>Khoảng cách tối thiểu {config.minHoursBetweenNotifications} giờ giữa hai lần thông báo.</li>
            </ul>
          </div>

          {/* Snooze Options */}
          <div className="space-y-2 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Tạm hoãn thông báo (Snooze):
              </span>
              {isGlobalSnoozed && (
                <button
                  type="button"
                  data-testid="cancel-snooze-btn"
                  onClick={handleClearSnooze}
                  className="text-[11px] text-red-600 hover:underline font-medium"
                >
                  Hủy tạm hoãn
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                data-testid="snooze-1h-btn"
                onClick={() => handleSnooze("1h")}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-center font-medium transition-colors"
              >
                1 giờ
              </button>
              <button
                type="button"
                data-testid="snooze-1d-btn"
                onClick={() => handleSnooze("1d")}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-center font-medium transition-colors"
              >
                1 ngày
              </button>
              <button
                type="button"
                data-testid="snooze-3d-btn"
                onClick={() => handleSnooze("3d")}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-center font-medium transition-colors"
              >
                3 ngày
              </button>
            </div>
          </div>

          {/* Test Action */}
          <div className="pt-1 flex items-center justify-between gap-3">
            <button
              type="button"
              data-testid="send-test-notification-btn"
              onClick={handleSendTest}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
            >
              Gửi thông báo thử nghiệm
            </button>

            {history.length > 0 && (
              <button
                type="button"
                data-testid="clear-history-btn"
                onClick={() => {
                  clearNotificationHistory();
                  setHistory([]);
                }}
                className="text-slate-400 hover:text-slate-600 text-[11px] underline"
              >
                Xóa lịch sử ({history.length})
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            data-testid="done-btn"
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
};
