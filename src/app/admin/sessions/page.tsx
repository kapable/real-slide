"use client";

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Trash2,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Presentation,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SortField = "created_at" | "participantCount";
type SortOrder = "asc" | "desc";

interface Session {
  id: string;
  title: string;
  share_code: string;
  created_at: string;
  participantCount: number;
  isActive: boolean;
}

interface SessionsResponse {
  sessions: Session[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function SessionsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(status !== "all" && { status }),
      });

      const res = await fetch(`/api/admin/sessions?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      let data: SessionsResponse = await res.json();

      // Client-side sorting
      data.sessions.sort((a, b) => {
        let comparison = 0;
        if (sortField === "participantCount") {
          comparison = a.participantCount - b.participantCount;
        } else {
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return sortOrder === "asc" ? comparison : -comparison;
      });

      setSessions(data.sessions);
      setTotalPages(data.totalPages);
    } catch (error) {
      setFetchError(true);
      toast({
        variant: "destructive",
        title: t.admin.errors.fetchFailed,
        description: t.admin.errors.serverError,
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, search, status, sortField, sortOrder, toast, t]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
      } else {
        setSortOrder("desc");
      }
      return field;
    });
  }, []);

  const handleDelete = useCallback(async (sessionId: string) => {
    if (!confirm(t.admin.sessions.deleteConfirm)) return;

    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({ variant: "success", title: t.admin.success.deleted });
        fetchSessions();
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t.admin.errors.deleteFailed,
      });
    }
  }, [t.admin.sessions.deleteConfirm, t.admin.success.deleted, t.admin.errors.deleteFailed, toast, fetchSessions]);

  const handleCopyLink = useCallback(async (shareCode: string, sessionId: string) => {
    try {
      const url = `${window.location.origin}/join/${shareCode}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(sessionId);
      toast({ title: t.admin.success.copied });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t.admin.errors.unknownError,
      });
    }
  }, [t.admin.success.copied, t.admin.errors.unknownError, toast]);

  const handleEditSession = useCallback((session: Session) => {
    setEditSession(session);
    setEditTitle(session.title);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editSession || !editTitle.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/sessions/${editSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      if (res.ok) {
        toast({ title: t.admin.success.saved });
        setEditSession(null);
        fetchSessions();
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t.admin.errors.saveFailed,
      });
    } finally {
      setIsSaving(false);
    }
  }, [editSession, editTitle, t.admin.success.saved, t.admin.errors.saveFailed, toast, fetchSessions]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  // Memoized sort icon component
  const SortIcon = useMemo(
    () =>
      memo(function SortIcon({ field }: { field: SortField }) {
        if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
        return sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
      }),
    [sortField, sortOrder]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.admin.sessions.title}</h1>
        <p className="text-muted-foreground">{t.admin.sessions.description}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.admin.sessions.search}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.admin.sessions.filter.all}</SelectItem>
                <SelectItem value="active">{t.admin.sessions.filter.active}</SelectItem>
                <SelectItem value="inactive">{t.admin.sessions.filter.inactive}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.admin.sessions.sessionList}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Presentation className="h-12 w-12 mb-4 opacity-20" />
              <p>{t.admin.sessions.noSessions}</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.admin.sessions.table.name}</TableHead>
                      <TableHead>{t.admin.sessions.table.code}</TableHead>
                      <TableHead>{t.admin.sessions.table.status}</TableHead>
                      <TableHead
                        className="text-center cursor-pointer select-none"
                        onClick={() => handleSort("participantCount")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {t.admin.sessions.table.participants}
                          <SortIcon field="participantCount" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("created_at")}
                      >
                        <div className="flex items-center gap-1">
                          {t.admin.sessions.table.created}
                          <SortIcon field="created_at" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">{t.admin.sessions.table.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.title}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {session.share_code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant={session.isActive ? "default" : "secondary"}>
                            {session.isActive
                              ? t.admin.sessions.status.active
                              : t.admin.sessions.status.inactive}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {session.participantCount}
                        </TableCell>
                        <TableCell>{formatDate(session.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/sessions/${session.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t.admin.sessions.actions.view}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditSession(session)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                {t.admin.sessions.actions.edit}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyLink(session.share_code, session.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                {copiedId === session.id
                                  ? t.admin.sessions.linkCopied
                                  : t.admin.sessions.actions.copyLink}
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/join/${session.share_code}`} target="_blank">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  {t.admin.sessions.actions.openParticipant}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(session.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t.admin.sessions.actions.delete}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    {t.admin.sessions.page} {page} {t.admin.sessions.of} {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {t.admin.sessions.prev}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      {t.admin.sessions.next}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Session Dialog */}
      <Dialog open={!!editSession} onOpenChange={(open) => !open && setEditSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.admin.sessions.actions.edit}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder={t.admin.sessions.table.name}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSession(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editTitle.trim() || isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
