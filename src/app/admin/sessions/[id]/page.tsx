"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Copy,
  Presentation,
  Layers,
  Users,
  MessageSquare,
  Loader2,
  Check,
  Trash2,
  ChevronDown,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { cn } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface SessionData {
  id: string;
  title: string;
  share_code: string;
  created_at: string;
}

interface Slide {
  id: string;
  order: number;
  type: "slide" | "vote" | "quiz";
  title: string;
  options?: string;
  correct_answer?: number;
}

interface Participant {
  id: string;
  nickname: string;
  joined_at: string;
}

interface WordcloudItem {
  id: string;
  word: string;
  count: number;
}

interface Comment {
  id: string;
  nickname: string;
  text: string;
  likes: number;
  created_at: string;
}

interface VoteResult {
  slide_id: string;
  option_index: number;
  participant_id: string;
}

interface QuizResult {
  slide_id: string;
  answer_index: number;
  participant_id: string;
}

interface SlideResults {
  [slideId: string]: {
    votes: VoteResult[];
    quizAnswers: QuizResult[];
  };
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { t } = useLanguage();
  const { toast } = useToast();

  const [session, setSession] = useState<SessionData | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [wordcloud, setWordcloud] = useState<WordcloudItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [slideResults, setSlideResults] = useState<SlideResults>({});
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleteSlideId, setDeleteSlideId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedSlides, setExpandedSlides] = useState<Set<string>>(new Set());
  const [sessionDeleted, setSessionDeleted] = useState(false);

  const toggleSlideExpanded = (slideId: string) => {
    setExpandedSlides((prev) => {
      const next = new Set(prev);
      if (next.has(slideId)) {
        next.delete(slideId);
      } else {
        next.add(slideId);
      }
      return next;
    });
  };

  const fetchAllData = useCallback(async () => {
    try {
      // Fetch session info
      const sessionRes = await fetch(`/api/sessions/${sessionId}`);
      if (!sessionRes.ok) {
        setIsLoading(false);
        return;
      }
      const sessionData = await sessionRes.json();
      setSession(sessionData);

      // Fetch slides
      const slidesRes = await fetch(`/api/slides/${sessionId}`);
      let slidesData: Slide[] = [];
      if (slidesRes.ok) {
        slidesData = await slidesRes.json();
        slidesData.sort((a, b) => a.order - b.order);
        setSlides(slidesData);
      }

      // Fetch participants
      const participantsRes = await fetch(`/api/admin/sessions/${sessionId}/participants`);
      if (participantsRes.ok) {
        setParticipants(await participantsRes.json());
      }

      // Fetch wordcloud for first slide with type 'slide'
      const firstSlide = slidesData.find((s) => s.type === "slide");
      if (firstSlide) {
        const wordcloudRes = await fetch(`/api/wordcloud/${firstSlide.id}`);
        if (wordcloudRes.ok) {
          setWordcloud(await wordcloudRes.json());
        }

        // Fetch comments
        const commentsRes = await fetch(`/api/comments/list/${firstSlide.id}`);
        if (commentsRes.ok) {
          setComments(await commentsRes.json());
        }
      }

      // Fetch vote/quiz results for all vote and quiz slides
      const results: SlideResults = {};
      for (const slide of slidesData) {
        if (slide.type === "vote") {
          const votesRes = await fetch(`/api/votes/${slide.id}`);
          if (votesRes.ok) {
            const votes = await votesRes.json();
            results[slide.id] = { votes, quizAnswers: [] };
          }
        } else if (slide.type === "quiz") {
          const quizRes = await fetch(`/api/quiz/${slide.id}`);
          if (quizRes.ok) {
            const quizAnswers = await quizRes.json();
            results[slide.id] = { votes: [], quizAnswers };
          }
        }
      }
      setSlideResults(results);
    } catch (error) {
      console.error("Failed to fetch session data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Real-time subscription for session deletion (ERR-03)
  useEffect(() => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const channel = supabase
      .channel(`session-delete-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        () => {
          setSessionDeleted(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Handle session deleted notification
  useEffect(() => {
    if (sessionDeleted) {
      toast({
        variant: "destructive",
        title: t.admin.sessionDetail.sessionDeleted,
        description: t.admin.sessionDetail.sessionDeletedDesc,
      });
      // Redirect after showing the notification
      setTimeout(() => {
        router.push("/admin/sessions");
      }, 2000);
    }
  }, [sessionDeleted, toast, t, router]);

  const handleCopyPresenterLink = async () => {
    const url = `${window.location.origin}/session/${sessionId}/presenter`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteSlide = async () => {
    if (!deleteSlideId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/slides/${deleteSlideId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({ title: t.admin.success.deleted });
        setSlides((prev) => prev.filter((s) => s.id !== deleteSlideId));
        setDeleteSlideId(null);
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t.admin.errors.deleteFailed,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const aggregateVotes = (votes: VoteResult[]): Record<number, number> => {
    const result: Record<number, number> = {};
    votes.forEach((v) => {
      result[v.option_index] = (result[v.option_index] || 0) + 1;
    });
    return result;
  };

  const aggregateQuizAnswers = (answers: QuizResult[]): Record<number, number> => {
    const result: Record<number, number> = {};
    answers.forEach((a) => {
      result[a.answer_index] = (result[a.answer_index] || 0) + 1;
    });
    return result;
  };

  const getOptions = (slide: Slide): string[] => {
    if (!slide.options) return [];
    try {
      const parsed = JSON.parse(slide.options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        {t.admin.sessionDetail.notFound}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/sessions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.admin.sessionDetail.backToSessions}
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{session.title}</h1>
        <p className="text-muted-foreground">{session.share_code}</p>
      </div>

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Presentation className="h-4 w-4" />
            {t.admin.sessionDetail.sessionInfo}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">{t.admin.sessionDetail.shareCode}</p>
            <code className="text-lg font-mono font-bold">{session.share_code}</code>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t.admin.sessionDetail.createdAt}</p>
            <p className="font-medium">{formatDate(session.created_at)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t.admin.sessionDetail.presenterLink}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={handleCopyPresenterLink}
            >
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Slides with Results (DET-04, DET-07) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-4 w-4" />
            {t.admin.sessionDetail.slides} ({slides.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slides.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {t.admin.sessionDetail.noSlides}
            </p>
          ) : (
            <div className="space-y-2">
              {slides.map((slide) => {
                const options = getOptions(slide);
                const results = slideResults[slide.id];
                const hasResults =
                  slide.type === "vote" || slide.type === "quiz";
                const isExpanded = expandedSlides.has(slide.id);

                return (
                  <Collapsible
                    key={slide.id}
                    open={isExpanded}
                    onOpenChange={() => hasResults && toggleSlideExpanded(slide.id)}
                  >
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {hasResults && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        )}
                        <span className="text-muted-foreground w-6">
                          #{slide.order + 1}
                        </span>
                        <span className="font-medium truncate flex-1">
                          {slide.title}
                        </span>
                        <Badge variant="secondary">
                          {t.admin.sessionDetail.slideTypes[slide.type]}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteSlideId(slide.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {hasResults && results && (
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-1 border-x border-b rounded-b-lg bg-muted/30">
                          {slide.type === "vote" && results.votes.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <BarChart3 className="h-4 w-4" />
                                {t.admin.sessionDetail.voteResults} ({results.votes.length} {t.admin.sessionDetail.votes})
                              </div>
                              <div className="space-y-1">
                                {options.map((opt, idx) => {
                                  const counts = aggregateVotes(results.votes);
                                  const count = counts[idx] || 0;
                                  const total = results.votes.length;
                                  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

                                  return (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className="text-sm w-24 truncate">{opt}</span>
                                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-primary rounded-full transition-all"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium w-16 text-right">
                                        {count} ({percentage}%)
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {slide.type === "quiz" && results.quizAnswers.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <BarChart3 className="h-4 w-4" />
                                {t.admin.sessionDetail.quizResults} ({results.quizAnswers.length} {t.admin.sessionDetail.answers})
                              </div>
                              <div className="space-y-1">
                                {options.map((opt, idx) => {
                                  const counts = aggregateQuizAnswers(results.quizAnswers);
                                  const count = counts[idx] || 0;
                                  const total = results.quizAnswers.length;
                                  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                  const isCorrect = slide.correct_answer === idx;

                                  return (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className={cn(
                                        "text-sm w-24 truncate",
                                        isCorrect && "font-bold text-green-600"
                                      )}>
                                        {opt} {isCorrect && "✓"}
                                      </span>
                                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                                        <div
                                          className={cn(
                                            "h-full rounded-full transition-all",
                                            isCorrect ? "bg-green-500" : "bg-primary"
                                          )}
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium w-16 text-right">
                                        {count} ({percentage}%)
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {slide.type === "vote" && results.votes.length === 0 && (
                            <p className="text-sm text-muted-foreground py-2">
                              {t.admin.sessionDetail.noVotes}
                            </p>
                          )}
                          {slide.type === "quiz" && results.quizAnswers.length === 0 && (
                            <p className="text-sm text-muted-foreground py-2">
                              {t.admin.sessionDetail.noAnswers}
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Participants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t.admin.sessionDetail.participants} ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {t.admin.sessionDetail.noParticipants}
              </p>
            ) : (
              <div className="rounded-md border max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nickname</TableHead>
                      <TableHead>{t.admin.sessionDetail.joinedAt}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nickname}</TableCell>
                        <TableCell>{formatDate(p.joined_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wordcloud */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t.admin.sessionDetail.wordcloud}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wordcloud.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {t.admin.sessionDetail.noWordcloud}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {wordcloud.slice(0, 20).map((item) => (
                  <Badge key={item.id} variant="secondary" className="text-sm">
                    {item.word} <span className="ml-1 opacity-50">({item.count})</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t.admin.sessionDetail.comments} ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comments.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {t.admin.sessionDetail.noComments}
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-auto">
                {comments.slice(0, 10).map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.nickname}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Slide Confirmation Dialog */}
      <AlertDialog open={!!deleteSlideId} onOpenChange={(open) => !open && setDeleteSlideId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.sessionDetail.deleteSlide}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.sessionDetail.deleteSlideConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t.admin.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSlide}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t.admin.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
