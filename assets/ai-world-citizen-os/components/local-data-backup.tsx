"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { createLocalBackup, restoreLocalBackup } from "@/lib/local-backup";
import travelConfig from "@/travel.config.json";

export function LocalDataBackup() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingImport, setPendingImport] = useState<unknown>(null);

  function exportData() {
    try {
      const backup = createLocalBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `travel-backup-${travelConfig.tripId}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("已下载当前旅程的本地数据备份。请妥善保管文件。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导出失败，请检查浏览器存储权限。");
    }
  }

  async function importData(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("备份文件超过 5 MB，暂无法导入。");
      let data: unknown;
      try {
        data = JSON.parse(await file.text()) as unknown;
      } catch {
        throw new Error("文件不是有效的 JSON 备份。");
      }
      if (data === null || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("备份格式不受支持，或不属于当前旅程。");
      }
      setPendingImport(data);
      setMessage("请确认是否替换当前旅程的本地记录。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败，原数据未修改。");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function confirmImport() {
    setBusy(true);
    try {
      const result = restoreLocalBackup(pendingImport);
      setPendingImport(null);
      setMessage(`已恢复 ${result.itinerary} 条行程、${result.journals} 篇日记、${result.expenses} 笔费用。正在刷新页面。`);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败，原数据未修改。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 border-t border-border pt-5" aria-label="本地数据备份">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">本地数据备份</h2>
        <p className="mt-1 text-xs leading-5 text-text-secondary">仅包含当前旅程保存在此浏览器的数据，不包含云端记录。导入会替换本地记录。</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={exportData} disabled={busy} className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-small)] border border-border bg-white px-3 text-sm font-medium text-text-primary disabled:opacity-50">
          <Download className="h-4 w-4" aria-hidden="true" />导出备份
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-small)] border border-border bg-white px-3 text-sm font-medium text-text-primary disabled:opacity-50">
          <Upload className="h-4 w-4" aria-hidden="true" />导入备份
        </button>
      </div>
      <input ref={fileInput} type="file" accept="application/json,.json" style={{ display: "none" }} aria-label="选择旅行备份文件" onChange={(event) => void importData(event.target.files?.[0])} />
      {pendingImport !== null ? (
        <div className="space-y-2 text-xs text-text-primary" role="group" aria-label="确认导入备份">
          <p>导入将替换当前旅程的本地行程、日记、费用与完成状态。云端数据不会被修改。</p>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={confirmImport} className="min-h-11 rounded-[var(--radius-small)] border border-border bg-white px-3">确认导入</button>
            <button type="button" disabled={busy} onClick={() => { setPendingImport(null); setMessage("已取消导入。"); }} className="min-h-11 rounded-[var(--radius-small)] border border-border bg-white px-3">取消</button>
          </div>
        </div>
      ) : null}
      {message ? <p role="status" className="text-xs leading-5 text-text-secondary">{message}</p> : null}
    </section>
  );
}
