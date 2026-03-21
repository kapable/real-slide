"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  ArrowLeft,
  ExternalLink,
  Copy,
  Presentation,
  Layers,
  Users,
  MessageSquare,
  Loader2,
  Check,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";

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

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { t } = useLanguage();

  const [session, setSession] = useState<SessionData | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [wordcloud, setWordcloud] = useState<WordcloudItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
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
        if (slidesRes.ok) {
          const slidesData = await slidesRes.json();
          setSlides(slidesData.sort((a: Slide, b: Slide) => a.order - b.order));
        }

        // Fetch participants
        const participantsRes = await fetch(`/api/admin/sessions/${sessionId}/participants`);
        if (participantsRes.ok) {
          setParticipants(await participantsRes.json());
        }

        // Fetch wordcloud for first slide
        if (slides.length > 0) {
          const wordcloudRes = await fetch(`/api/wordcloud/${slides[0].id}`);
          if (wordcloudRes.ok) {
            setWordcloud(await wordcloudRes.json());
          }
        }

        // Fetch comments for first slide
        if (slides.length > 0) {
          const commentsRes = await fetch(`/api/comments/list/${slides[0].id}`);
          if (commentsRes.ok) {
            setComments(await commentsRes.json());
          }
        }
      } catch (error) {
        console.error("Failed to fetch session data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [sessionId, slides.length]);

  const handleCopyPresenterLink = async () => {
    const url = `${window.location.origin}/session/${sessionId}/presenter`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Slides */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-4 w-4" />
              {t.admin.sessionDetail.slides}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {slides.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {t.admin.sessionDetail.noSlides}
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t.admin.sessionDetail.slides}</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slides.map((slide) => (
                      <TableRow key={slide.id}>
                        <TableCell>{slide.order + 1}</TableCell>
                        <TableCell className="font-medium truncate max-w-[200px]">
                          {slide.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {t.admin.sessionDetail.slideTypes[slide.type]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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
    </div>
  );
}
