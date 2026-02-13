/**
 * LogViewer Component
 *
 * Modal dialog displaying combined frontend + backend logs
 * for debugging data loading, API errors, and configuration issues.
 */

import { logger, type LogEntry } from '../../utils/logger';
import { ApiClient } from '../../core/api/ApiClient';

export class LogViewer {
    private modal: HTMLElement | null = null;
    /** Combined logs cached while the modal is open */
    private allLogs: LogEntry[] = [];

    /**
     * Show the log viewer modal.
     * Fetches backend logs if an ApiClient is provided.
     */
    public async show(client?: ApiClient): Promise<void> {
        if (this.modal) {
            this.modal.remove();
        }

        // Merge frontend logs
        this.allLogs = logger.getLogHistory().map(l => ({
            ...l,
            // Tag frontend logs that don't already have a source
            data: l.data && (l.data as any).source
                ? l.data
                : { ...(l.data != null ? { detail: l.data } : {}), source: 'frontend' }
        }));

        // Fetch backend logs
        if (client) {
            try {
                const systemLogs = await client.getSystemLogs(500);
                if (Array.isArray(systemLogs)) {
                    for (const log of systemLogs) {
                        this.allLogs.push({
                            timestamp: log.timestamp,
                            level: log.level as any,
                            message: log.message,
                            data: { source: 'backend', logger: log.logger }
                        });
                    }
                }
            } catch (e) {
                this.allLogs.push({
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: 'Failed to fetch backend system logs',
                    data: { source: 'frontend', detail: e }
                });
            }
        }

        // Sort newest first
        this.allLogs.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        this.modal = document.createElement('div');
        this.modal.className = 'ts-modal-overlay show';
        this.modal.innerHTML = `
            <div class="ts-modal" style="max-width:900px; max-height:85vh; display:flex; flex-direction:column;">
                <div class="ts-modal-header">
                    <h3><i class="bi bi-terminal"></i> System Logs</h3>
                    <button class="ts-modal-close"><i class="bi bi-x"></i></button>
                </div>
                <div class="ts-modal-body" style="flex:1; overflow:hidden; display:flex; flex-direction:column; padding:0;">
                    <div style="display:flex; gap:8px; padding:12px; border-bottom:1px solid var(--c-border); flex-wrap:wrap; align-items:center;">
                        <select class="ts-select" id="ts-log-level-filter" style="width:120px;">
                            <option value="all">All Levels</option>
                            <option value="debug">Debug</option>
                            <option value="info">Info</option>
                            <option value="warn">Warn</option>
                            <option value="error">Error</option>
                        </select>
                        <select class="ts-select" id="ts-log-source-filter" style="width:130px;">
                            <option value="all">All Sources</option>
                            <option value="frontend">Frontend</option>
                            <option value="backend">Backend</option>
                        </select>
                        <button class="ts-btn-secondary" id="ts-log-copy">
                            <i class="bi bi-clipboard"></i> Copy
                        </button>
                        <button class="ts-btn-secondary" id="ts-log-download">
                            <i class="bi bi-download"></i> Download
                        </button>
                        <button class="ts-btn-secondary" id="ts-log-clear">
                            <i class="bi bi-trash"></i> Clear
                        </button>
                        <span style="flex:1;"></span>
                        <span id="ts-log-count" style="color:var(--c-text-muted); font-size:12px; align-self:center;">
                            ${this.allLogs.length} entries
                        </span>
                    </div>
                    <div id="ts-log-list" style="flex:1; overflow-y:auto; font-family:monospace; font-size:12px; padding:8px;">
                        ${this.renderLogs(this.allLogs)}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.bindEvents();
    }

    private getFilteredLogs(): LogEntry[] {
        if (!this.modal) return this.allLogs;

        const levelFilter = (this.modal.querySelector('#ts-log-level-filter') as HTMLSelectElement)?.value || 'all';
        const sourceFilter = (this.modal.querySelector('#ts-log-source-filter') as HTMLSelectElement)?.value || 'all';

        return this.allLogs.filter(log => {
            const levelOk = levelFilter === 'all' || log.level === levelFilter;
            const logSource = (log.data as any)?.source || 'frontend';
            const sourceOk = sourceFilter === 'all' || logSource === sourceFilter;
            return levelOk && sourceOk;
        });
    }

    private refreshLogList(): void {
        if (!this.modal) return;
        const logList = this.modal.querySelector('#ts-log-list');
        const countSpan = this.modal.querySelector('#ts-log-count');
        const filtered = this.getFilteredLogs();
        if (logList) logList.innerHTML = this.renderLogs(filtered);
        if (countSpan) countSpan.textContent = `${filtered.length} entries`;
    }

    private renderLogs(logs: LogEntry[]): string {
        if (logs.length === 0) {
            return '<div style="color:var(--c-text-muted); text-align:center; padding:24px;">No logs to display</div>';
        }

        return logs.map(log => {
            const levelColors: Record<string, string> = {
                debug: 'var(--c-text-muted)',
                info: 'var(--c-accent)',
                warn: '#f59e0b',
                error: '#ef4444'
            };
            const color = levelColors[log.level] || 'inherit';

            const logSource = (log.data as any)?.source || 'frontend';
            const isBackend = logSource === 'backend';
            const sourceBadge = isBackend
                ? '<span style="background:#5b21b6; color:white; padding:1px 5px; border-radius:3px; font-size:10px; margin-right:4px;">API</span>'
                : '<span style="background:#0f766e; color:white; padding:1px 5px; border-radius:3px; font-size:10px; margin-right:4px;">UI</span>';

            // Show logger name for backend, or detail for frontend
            const extra = isBackend
                ? ((log.data as any)?.logger ? ` [${(log.data as any).logger}]` : '')
                : ((log.data as any)?.detail ? ` ${JSON.stringify((log.data as any).detail)}` : '');

            return `
                <div style="padding:3px 8px; border-bottom:1px solid var(--c-border-light); display:flex; gap:6px; line-height:1.5;">
                    <span style="color:var(--c-text-muted); min-width:165px; flex-shrink:0;">${log.timestamp.replace('T', ' ').slice(0, 23)}</span>
                    <span style="color:${color}; font-weight:600; min-width:44px; text-transform:uppercase; flex-shrink:0;">${log.level}</span>
                    <span style="flex:1; word-break:break-word;">
                        ${sourceBadge}${this.escapeHtml(log.message)}${extra ? `<span style="color:var(--c-text-muted)">${this.escapeHtml(extra)}</span>` : ''}
                    </span>
                </div>
            `;
        }).join('');
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private bindEvents(): void {
        if (!this.modal) return;

        // Close
        this.modal.querySelector('.ts-modal-close')?.addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).classList.contains('ts-modal-overlay')) {
                this.hide();
            }
        });

        // Filters
        this.modal.querySelector('#ts-log-level-filter')?.addEventListener('change', () => this.refreshLogList());
        this.modal.querySelector('#ts-log-source-filter')?.addEventListener('change', () => this.refreshLogList());

        // Copy
        this.modal.querySelector('#ts-log-copy')?.addEventListener('click', () => {
            const filtered = this.getFilteredLogs();
            const text = filtered.map(l =>
                `[${l.timestamp}] [${l.level.toUpperCase()}] [${(l.data as any)?.source || 'frontend'}] ${l.message}`
            ).join('\n');
            navigator.clipboard.writeText(text).then(() => {
                const btn = this.modal?.querySelector('#ts-log-copy') as HTMLButtonElement;
                if (btn) {
                    const orig = btn.innerHTML;
                    btn.innerHTML = '<i class="bi bi-check"></i> Copied!';
                    setTimeout(() => { btn.innerHTML = orig; }, 2000);
                }
            });
        });

        // Download
        this.modal.querySelector('#ts-log-download')?.addEventListener('click', () => {
            const filtered = this.getFilteredLogs();
            const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `datatables-viewer-logs-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        // Clear
        this.modal.querySelector('#ts-log-clear')?.addEventListener('click', () => {
            logger.clearHistory();
            this.allLogs = [];
            this.refreshLogList();
        });
    }

    public hide(): void {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        this.allLogs = [];
    }
}
