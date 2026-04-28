"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  Plus,
  Settings2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceIcon } from "@/components/shared/SourceIcon";
import { formatRelativeTime } from "@/lib/format";
import { getConnectorDefinition } from "@/lib/source-connectors";
import type { SourceRecord } from "@/types/sync";

function ModalShell({
  children,
  onClose,
  maxWidthClass,
}: {
  children: React.ReactNode;
  onClose: () => void;
  maxWidthClass: string;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={cn(
          "relative my-4 flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl sm:max-h-[calc(100vh-3rem)]",
          maxWidthClass,
        )}
      >
        {children}
      </motion.div>
    </div>,
    document.body,
  );
}

export function SyncSource() {
  const searchParams = useSearchParams();
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [selectedSource, setSelectedSource] = useState<SourceRecord | null>(null);
  const [configuringSource, setConfiguringSource] = useState<SourceRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [customSourceName, setCustomSourceName] = useState("");
  const [customSourceIdentifier, setCustomSourceIdentifier] = useState("");
  const [connectorValues, setConnectorValues] = useState<Record<string, string>>({});
  const [appOrigin, setAppOrigin] = useState("http://localhost:3000");
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const connectedCount = useMemo(
    () => sources.filter((source) => source.status === "connected").length,
    [sources],
  );

  const connectorDefinition = configuringSource
    ? getConnectorDefinition(configuringSource.platform)
    : null;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppOrigin(window.location.origin);
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || typeof document === "undefined") {
      return;
    }

    const hasOpenModal = Boolean(isAddModalOpen || configuringSource || selectedSource);
    const previousOverflow = document.body.style.overflow;

    if (hasOpenModal) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [configuringSource, isAddModalOpen, isMounted, selectedSource]);

  const loadSources = async () => {
    const response = await fetch("/api/sources", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Sources request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { sources: SourceRecord[] };
    setSources(payload.sources);
  };

  useEffect(() => {
    loadSources().catch((error) => {
      console.error(error);
      toast.error("Unable to load source connectors.");
    });
  }, []);

  useEffect(() => {
    const providers = [
      { key: "slack", label: "Slack" },
      { key: "gmail", label: "Gmail" },
      { key: "github", label: "GitHub" },
    ] as const;

    for (const provider of providers) {
      const providerState = searchParams.get(provider.key);
      const providerError = searchParams.get(`${provider.key}_error`);
      if (!providerState) {
        continue;
      }

      if (providerState === "connected") {
        toast.success(`${provider.label} connected.`, {
          description: "The installation completed and the first sync has been triggered.",
        });
        loadSources().catch((error) => console.error(error));
        return;
      }

      if (providerState === "connected_with_sync_warning") {
        toast.success(`${provider.label} connected.`, {
          description:
            "The install completed, but the first sync needs another try. Use Run Sync Now after the page loads.",
        });
        loadSources().catch((error) => console.error(error));
        return;
      }

      toast.error(`${provider.label} connection was not completed.`, {
        description: providerError
          ? `Reason: ${providerError.replace(/_/g, " ")}`
          : `Reason: ${providerState.replace(/_/g, " ")}`,
      });
      return;
    }
  }, [searchParams]);

  const slackRedirectUrl = `${appOrigin}/api/integrations/slack/callback`;
  const slackEventsUrl = `${appOrigin}/api/integrations/slack/events`;
  const slackScopes =
    "channels:history,channels:read,channels:join,groups:history,groups:read,im:history,im:read,mpim:history,mpim:read,team:read,users:read";
  const gmailOrigin = appOrigin;
  const gmailRedirectUrl = `${appOrigin}/api/integrations/gmail/callback`;
  const githubRedirectUrl = `${appOrigin}/api/integrations/github/callback`;
  const whatsappWebhookUrl = `${appOrigin}/api/integrations/whatsapp/webhook`;

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(label);
      toast.success(`${label} copied.`);
      window.setTimeout(() => {
        setCopiedValue((currentValue) => (currentValue === label ? null : currentValue));
      }, 1500);
    } catch (error) {
      console.error(error);
      toast.error(`Unable to copy ${label.toLowerCase()}.`);
    }
  };

  const openConfigureModal = (source: SourceRecord) => {
    const definition = getConnectorDefinition(source.platform);
    const initialValues = Object.fromEntries(definition.fields.map((field) => [field.key, ""]));
    setConnectorValues(initialValues);
    setConfiguringSource(source);
  };

  const persistSourceUpdate = async (
    source: SourceRecord,
    status: SourceRecord["status"],
    configuration?: Record<string, string>,
  ) => {
    const response = await fetch(`/api/sources/${source.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
        platform: source.platform,
        ...(configuration ? { configuration } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Source update failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { source: SourceRecord };
    setSources((currentSources) =>
      currentSources.map((currentSource) =>
        currentSource.id === payload.source.id ? payload.source : currentSource,
      ),
    );
    setSelectedSource((currentSource) =>
      currentSource?.id === payload.source.id ? payload.source : currentSource,
    );

    return payload.source;
  };

  const startOAuthFlow = async (platform: "slack" | "gmail" | "github") => {
    const response = await fetch(`/api/integrations/${platform}/auth`);
    const payload = (await response.json()) as { url?: string; error?: string };

    if (!response.ok || !payload.url) {
      throw new Error(payload.error ?? `${platform} auth failed with status ${response.status}`);
    }

    window.location.assign(payload.url);
  };

  const runIntegrationSync = async (platform: "slack" | "gmail" | "github" | "notion" | "whatsapp") => {
    const response = await fetch(`/api/integrations/${platform}/sync`, {
      method: "POST",
    });
    const payload = (await response.json()) as {
      result?: { syncedChannels?: number; syncedMessages?: number; syncedItems?: number };
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? `${platform} sync failed with status ${response.status}`);
    }

    return payload.result ?? {};
  };

  const disconnectIntegration = async (source: SourceRecord) => {
    if (source.platform === "slack") {
      const response = await fetch("/api/integrations/slack/install", { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`Slack disconnect failed with status ${response.status}`);
      }
      return;
    }

    if (
      source.platform === "gmail" ||
      source.platform === "github" ||
      source.platform === "notion" ||
      source.platform === "whatsapp"
    ) {
      const response = await fetch(`/api/integrations/${source.platform}/install`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`${source.name} disconnect failed with status ${response.status}`);
      }
      return;
    }

    const response = await fetch(`/api/sources/${source.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`${source.name} disconnect failed with status ${response.status}`);
    }
  };

  const handleConfiguredConnect = async () => {
    if (!configuringSource || !connectorDefinition) {
      return;
    }

    const missingField = connectorDefinition.fields.find(
      (field) => !connectorValues[field.key]?.trim(),
    );

    if (missingField) {
      toast.error(`Add ${missingField.label.toLowerCase()} first.`);
      return;
    }

    const configuration = Object.fromEntries(
      Object.entries(connectorValues).map(([key, value]) => [key, value.trim()]),
    );

    setConnectingId(configuringSource.id);

    try {
      await persistSourceUpdate(
        configuringSource,
        connectorDefinition.statusOnSave,
        configuration,
      );

      if (
        configuringSource.platform === "slack" ||
        configuringSource.platform === "gmail" ||
        configuringSource.platform === "github"
      ) {
        await startOAuthFlow(configuringSource.platform);
        return;
      }

      if (configuringSource.platform === "notion" || configuringSource.platform === "whatsapp") {
        const result = await runIntegrationSync(configuringSource.platform);
        await loadSources();
        setConfiguringSource(null);
        toast.success(`${configuringSource.name} connected.`, {
          description:
            configuringSource.platform === "notion"
              ? `${result.syncedItems ?? 0} Notion items were indexed.`
              : "The WhatsApp business line was validated and webhook ingestion is ready.",
        });
        return;
      }

      setConfiguringSource(null);
      toast.success(`${configuringSource.name} setup saved.`, {
        description: "The connector configuration was stored.",
      });
    } catch (error) {
      console.error(error);
      toast.error(`Unable to save ${configuringSource.name} setup.`, {
        description:
          configuringSource.platform === "slack" ||
          configuringSource.platform === "gmail" ||
          configuringSource.platform === "github"
            ? `Make sure the ${configuringSource.name} app values are correct, then try the OAuth flow again.`
            : "The backend could not finish that connector setup yet.",
      });
    } finally {
      setConnectingId(null);
    }
  };

  const handleSourceSync = async (
    source: SourceRecord,
    syncId = `${source.platform}-sync`,
  ) => {
    setConnectingId(syncId);

    try {
      if (
        source.platform !== "slack" &&
        source.platform !== "gmail" &&
        source.platform !== "github" &&
        source.platform !== "notion" &&
        source.platform !== "whatsapp"
      ) {
        throw new Error("This source does not have a sync flow yet.");
      }

      const payload = await runIntegrationSync(source.platform);
      await loadSources();
      toast.success(`${source.name} sync finished.`, {
        description:
          payload.syncedChannels !== undefined
            ? `${payload.syncedChannels} Slack conversations were refreshed.`
            : payload.syncedMessages !== undefined
              ? `${payload.syncedMessages} Gmail messages were indexed.`
              : payload.syncedItems !== undefined
                ? `${payload.syncedItems} records were indexed.`
                : "The source refreshed successfully.",
      });
    } catch (error) {
      console.error(error);
      toast.error(`Unable to sync ${source.name} right now.`);
    } finally {
      setConnectingId((currentValue) => (currentValue === syncId ? null : currentValue));
    }
  };

  const handleSlackDisconnect = async () => {
    setConnectingId("slack");

    try {
      const response = await fetch("/api/integrations/slack/install", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Slack disconnect failed with status ${response.status}`);
      }
      await loadSources();
      toast.success("Slack disconnected.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to disconnect Slack.");
    } finally {
      setConnectingId(null);
    }
  };

  const handleConnect = async (source: SourceRecord, status: "connected" | "disconnected") => {
    setConnectingId(source.id);

    try {
      if (status === "disconnected") {
        await disconnectIntegration(source);
        await loadSources();
        toast.success(`${source.name} disconnected.`, {
          description: "The connector was removed for this workspace.",
        });
        return;
      }

      const updatedSource = await persistSourceUpdate(source, status);
      toast.success(`${updatedSource.name} connected!`, {
        description: "Sync will begin indexing your data immediately.",
      });
    } catch (error) {
      console.error(error);
      toast.error("Unable to update that source.");
    } finally {
      setConnectingId(null);
    }
  };

  const handleCreateSource = async () => {
    if (!customSourceIdentifier.trim()) {
      toast.error("Add a source URL or identifier first.");
      return;
    }

    try {
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: customSourceIdentifier,
          name: customSourceName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Create source failed with status ${response.status}`);
      }

      const payload = (await response.json()) as { source: SourceRecord };
      setSources((currentSources) => [...currentSources, payload.source]);
      setCustomSourceIdentifier("");
      setCustomSourceName("");
      setIsAddModalOpen(false);
      toast.success("Source request saved.", {
        description: "The connector is now tracked in the backend as a pending source.",
      });
    } catch (error) {
      console.error(error);
      toast.error("Unable to create that source request.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <Link2 className="w-5 h-5 text-sync-blue" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary">
            Source Connector
          </h2>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sync-blue hover:bg-sync-blue/90 text-white rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(79,142,247,0.3)]"
        >
          <Plus className="w-4 h-4" />
          Add New Source
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-text-primary mb-2">Connect Your Workspace</h1>
            <p className="text-text-secondary">
              Sync works best when it can see everything. {connectedCount} connectors are active and
              ready to feed the memory layer.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sources.map((source, idx) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                key={source.id}
                className="bg-surface border border-border hover:border-sync-blue/30 rounded-2xl p-6 transition-all group flex flex-col h-full"
              >
                <div className="flex items-start justify-between mb-6">
                  <SourceIcon type={source.platform} size="lg" className="shadow-lg" />
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                      source.status === "connected"
                        ? "bg-status-resolved/10 text-status-resolved border-status-resolved/20"
                        : source.status === "pending"
                          ? "bg-status-pending/10 text-status-pending border-status-pending/20"
                          : "bg-elevated text-text-muted border-border",
                    )}
                  >
                    {source.status === "connected" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {source.status}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-text-primary mb-2">{source.name}</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-6 flex-1">
                  {source.description}
                </p>

                <div className="pt-6 border-t border-border flex items-center justify-between mt-auto gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">
                      Last Sync
                    </span>
                    <span className="text-xs text-text-primary font-mono flex items-center gap-1.5">
                      <RefreshCw
                        className={cn(
                          "w-3 h-3",
                          source.status === "connected" && "animate-[spin_3s_linear_infinite]",
                        )}
                      />
                      {formatRelativeTime(source.lastSyncAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSource(source)}
                      className="p-2 bg-elevated border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (source.status === "connected") {
                          setSelectedSource(source);
                          return;
                        }

                        openConfigureModal(source);
                      }}
                      disabled={connectingId === source.id || connectingId === "slack"}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                        source.status === "connected"
                          ? "bg-elevated border border-border text-text-primary hover:bg-surface"
                          : source.status === "pending"
                            ? "bg-status-pending/10 text-status-pending border border-status-pending/20 hover:bg-status-pending/15"
                            : "bg-sync-blue text-white hover:bg-sync-blue/90 shadow-[0_0_10px_rgba(79,142,247,0.2)]",
                      )}
                    >
                      {connectingId === source.id ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Saving...
                        </>
                      ) : source.status === "connected" ? (
                        "Manage"
                      ) : (
                        "Connect"
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMounted && isAddModalOpen && (
          <ModalShell onClose={() => setIsAddModalOpen(false)} maxWidthClass="max-w-lg">
            <div className="min-h-0 overflow-y-auto px-5 py-6 custom-scrollbar sm:px-8 sm:py-8">
              <h2 className="text-2xl font-bold mb-4">Add New Source</h2>
              <p className="text-text-secondary mb-8 text-sm">
                Enter the URL or API identifier for the service you want Sync to ingest next.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 block">
                    Source URL / Identifier
                  </label>
                  <input
                    type="text"
                    value={customSourceIdentifier}
                    onChange={(event) => setCustomSourceIdentifier(event.target.value)}
                    placeholder="https://..."
                    className="w-full bg-elevated border border-border rounded-xl px-4 py-3 outline-none focus:border-sync-blue/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 block">
                    Source Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customSourceName}
                    onChange={(event) => setCustomSourceName(event.target.value)}
                    placeholder="My Custom Source"
                    className="w-full bg-elevated border border-border rounded-xl px-4 py-3 outline-none focus:border-sync-blue/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:px-8">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-3 border border-border rounded-xl text-sm font-bold hover:bg-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSource}
                className="flex-1 py-3 bg-sync-blue text-white rounded-xl text-sm font-bold shadow-lg shadow-sync-blue/20"
              >
                Request Sync
              </button>
            </div>
          </ModalShell>
        )}

        {isMounted && configuringSource && connectorDefinition && (
          <ModalShell onClose={() => setConfiguringSource(null)} maxWidthClass="max-w-2xl">
            <div className="min-h-0 overflow-y-auto px-5 py-6 custom-scrollbar sm:px-8 sm:py-8">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="w-12 h-12 rounded-2xl bg-elevated border border-border flex items-center justify-center">
                  <SourceIcon type={configuringSource.platform} size="lg" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-text-primary">{connectorDefinition.title}</h2>
                  <p className="mt-2 text-sm text-text-secondary">{connectorDefinition.instructions}</p>
                </div>
                <div className="w-fit rounded-full border border-sync-blue/20 bg-sync-blue/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-sync-blue">
                  {configuringSource.platform}
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-border bg-elevated/50 p-4 text-sm text-text-secondary">
                <div className="mb-2 flex items-center gap-2 font-semibold text-text-primary">
                  <ShieldCheck className="w-4 h-4 text-sync-blue" />
                  Connector requirements
                </div>
                Sync stores these values in the backend so each platform can use its own setup
                requirements. For production, we should encrypt connector secrets before launch.
              </div>

              {configuringSource.platform === "slack" && (
                <div className="mb-6 rounded-2xl border border-sync-blue/20 bg-sync-blue/5 p-5 text-sm text-text-secondary">
                  <div className="mb-3 flex items-center gap-2 font-semibold text-text-primary">
                    <Link2 className="h-4 w-4 text-sync-blue" />
                    Slack setup links
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border bg-surface/70 p-3">
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                          Redirect URL
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(slackRedirectUrl, "Redirect URL")}
                          className="flex w-fit items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-text-primary hover:border-sync-blue/40 hover:text-sync-blue"
                        >
                          {copiedValue === "Redirect URL" ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          Copy
                        </button>
                      </div>
                      <p className="break-all font-mono text-xs text-text-primary">
                        {slackRedirectUrl}
                      </p>
                      <p className="mt-2 text-xs text-text-muted">
                        Add this exact URL in Slack App Settings -&gt; OAuth &amp; Permissions -&gt;
                        Redirect URLs.
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-surface/70 p-3">
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                          Events URL
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(slackEventsUrl, "Events URL")}
                          className="flex w-fit items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-text-primary hover:border-sync-blue/40 hover:text-sync-blue"
                        >
                          {copiedValue === "Events URL" ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          Copy
                        </button>
                      </div>
                      <p className="break-all font-mono text-xs text-text-primary">
                        {slackEventsUrl}
                      </p>
                      <p className="mt-2 text-xs text-text-muted">
                        Use this later in Slack Event Subscriptions. For local testing, Slack cannot
                        reach `localhost`, so event subscriptions need a public URL or deployed app.
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-surface/70 p-3">
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                          Bot Scopes
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(slackScopes, "Bot scopes")}
                          className="flex w-fit items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-text-primary hover:border-sync-blue/40 hover:text-sync-blue"
                        >
                          {copiedValue === "Bot scopes" ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          Copy
                        </button>
                      </div>
                      <p className="break-all font-mono text-xs text-text-primary">
                        {slackScopes}
                      </p>
                      <p className="mt-2 text-xs text-text-muted">
                        Add these in Slack OAuth &amp; Permissions so Sync can read channels,
                        auto-join public channels, read private channels where the app was invited,
                        read direct messages it has access to, small private group chats, team
                        info, and members. If you change scopes, disconnect and reconnect Slack so
                        the new token includes them.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {configuringSource.platform === "gmail" && (
                <div className="mb-6 rounded-2xl border border-sync-blue/20 bg-sync-blue/5 p-5 text-sm text-text-secondary">
                  <div className="mb-3 flex items-center gap-2 font-semibold text-text-primary">
                    <Link2 className="h-4 w-4 text-sync-blue" />
                    Google OAuth setup
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border bg-surface/70 p-3">
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                          Authorized JavaScript origin
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(gmailOrigin, "Gmail origin")}
                          className="flex w-fit items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-text-primary hover:border-sync-blue/40 hover:text-sync-blue"
                        >
                          {copiedValue === "Gmail origin" ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          Copy
                        </button>
                      </div>
                      <p className="break-all font-mono text-xs text-text-primary">{gmailOrigin}</p>
                    </div>

                    <div className="rounded-xl border border-border bg-surface/70 p-3">
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                          Authorized redirect URI
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(gmailRedirectUrl, "Gmail redirect URI")}
                          className="flex w-fit items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-text-primary hover:border-sync-blue/40 hover:text-sync-blue"
                        >
                          {copiedValue === "Gmail redirect URI" ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          Copy
                        </button>
                      </div>
                      <p className="break-all font-mono text-xs text-text-primary">
                        {gmailRedirectUrl}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {configuringSource.platform === "github" && (
                <div className="mb-6 rounded-2xl border border-sync-blue/20 bg-sync-blue/5 p-5 text-sm text-text-secondary">
                  <div className="mb-3 flex items-center gap-2 font-semibold text-text-primary">
                    <Link2 className="h-4 w-4 text-sync-blue" />
                    GitHub OAuth setup
                  </div>
                  <div className="rounded-xl border border-border bg-surface/70 p-3">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                        Authorization callback URL
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(githubRedirectUrl, "GitHub redirect URI")}
                        className="flex w-fit items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-text-primary hover:border-sync-blue/40 hover:text-sync-blue"
                      >
                        {copiedValue === "GitHub redirect URI" ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Copy
                      </button>
                    </div>
                    <p className="break-all font-mono text-xs text-text-primary">
                      {githubRedirectUrl}
                    </p>
                  </div>
                </div>
              )}

              {configuringSource.platform === "whatsapp" && (
                <div className="mb-6 rounded-2xl border border-sync-blue/20 bg-sync-blue/5 p-5 text-sm text-text-secondary">
                  <div className="mb-3 flex items-center gap-2 font-semibold text-text-primary">
                    <Link2 className="h-4 w-4 text-sync-blue" />
                    WhatsApp webhook setup
                  </div>
                  <div className="rounded-xl border border-border bg-surface/70 p-3">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                        Callback URL
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(whatsappWebhookUrl, "WhatsApp webhook URL")}
                        className="flex w-fit items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-text-primary hover:border-sync-blue/40 hover:text-sync-blue"
                      >
                        {copiedValue === "WhatsApp webhook URL" ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Copy
                      </button>
                    </div>
                    <p className="break-all font-mono text-xs text-text-primary">
                      {whatsappWebhookUrl}
                    </p>
                    <p className="mt-2 text-xs text-text-muted">
                      Use this in the Meta webhook configuration. For local testing, Meta also
                      needs a public URL instead of `localhost`.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {connectorDefinition.fields.map((field) => (
                  <div key={field.key}>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-text-muted">
                      {field.label}
                    </label>
                    <div className="relative">
                      {field.secret && (
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      )}
                      <input
                        type={field.secret ? "password" : "text"}
                        value={connectorValues[field.key] ?? ""}
                        onChange={(event) =>
                          setConnectorValues((currentValues) => ({
                            ...currentValues,
                            [field.key]: event.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                        className={cn(
                          "w-full rounded-xl border border-border bg-elevated px-4 py-3 outline-none focus:border-sync-blue/50",
                          field.secret && "pl-11",
                        )}
                      />
                    </div>
                    <p className="mt-2 text-xs text-text-muted">{field.help}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:px-8">
              <button
                onClick={() => setConfiguringSource(null)}
                className="flex-1 py-3 border border-border rounded-xl text-sm font-bold hover:bg-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfiguredConnect}
                disabled={connectingId === configuringSource.id}
                className="flex-1 py-3 bg-sync-blue text-white rounded-xl text-sm font-bold shadow-lg shadow-sync-blue/20 disabled:opacity-60"
              >
                {connectingId === configuringSource.id ? "Saving..." : connectorDefinition.confirmLabel}
              </button>
            </div>
          </ModalShell>
        )}

        {isMounted && selectedSource && (
          <ModalShell onClose={() => setSelectedSource(null)} maxWidthClass="max-w-lg">
            <div className="min-h-0 overflow-y-auto px-5 py-6 custom-scrollbar sm:px-8 sm:py-8">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                <SourceIcon type={selectedSource.platform} size="lg" />
                <div>
                  <h2 className="text-2xl font-bold">{selectedSource.name}</h2>
                  <p className="text-xs text-text-secondary">
                    Last sync {formatRelativeTime(selectedSource.lastSyncAt)}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between rounded-xl border border-border bg-elevated p-4">
                  <span className="text-sm">Auto-sync updates</span>
                  <div className="relative h-5 w-10 cursor-pointer rounded-full bg-sync-blue">
                    <div className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white" />
                  </div>
                </div>
                {selectedSource.platform === "slack" ? (
                  <div className="rounded-xl border border-border bg-elevated p-4">
                    <div className="text-sm font-semibold text-text-primary">
                      Private chats and DMs
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                      Sync can auto-join public channels after reinstalling with
                      `channels:join`. Private channels still need the app to be invited, and
                      direct messages are limited to conversations the app token is actually
                      allowed to access.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-elevated p-4 opacity-50">
                    <span className="text-sm">Sync private data</span>
                    <div className="relative h-5 w-10 rounded-full bg-border">
                      <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:px-8">
              {selectedSource.platform !== "custom" && selectedSource.status === "connected" && (
                <button
                  onClick={() => handleSourceSync(selectedSource)}
                  disabled={connectingId === `${selectedSource.platform}-sync`}
                  className="flex-1 rounded-xl bg-sync-blue py-3 text-sm font-bold text-white transition-colors hover:bg-sync-blue/90"
                >
                  {connectingId === `${selectedSource.platform}-sync` ? "Syncing..." : "Run Sync Now"}
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedSource(null);
                  openConfigureModal(selectedSource);
                }}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-bold transition-colors hover:bg-elevated"
              >
                Edit Setup
              </button>
              <button
                onClick={() => {
                  const disconnectPromise =
                    selectedSource.platform === "slack"
                      ? handleSlackDisconnect()
                      : handleConnect(selectedSource, "disconnected");

                  disconnectPromise.finally(() => {
                    setSelectedSource(null);
                  });
                }}
                className="flex-1 rounded-xl border border-status-conflict/20 bg-status-conflict/10 py-3 text-sm font-bold text-status-conflict transition-colors hover:bg-status-conflict/20"
              >
                Disconnect
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}
