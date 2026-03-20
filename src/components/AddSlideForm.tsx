"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Layout, BarChart2, HelpCircle, Loader2, Cloud, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddSlideFormProps {
  onAdd: (slide: any) => Promise<void>;
  isLoading: boolean;
  onCancel?: () => void;
}

export function AddSlideForm({ onAdd, isLoading, onCancel }: AddSlideFormProps) {
  const [slideType, setSlideType] = useState("slide");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [options, setOptions] = useState(["옵션 1", "옵션 2", "옵션 3"]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [wordcloudOnePerUser, setWordcloudOnePerUser] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const slideData: any = {
      type: slideType,
      title,
      content,
      options: slideType === "slide" ? null : options,
      correctAnswer: slideType === "quiz" ? correctAnswer : null,
    };

    // 일반 슬라이드에서 워드클라우드 설정 추가
    if (slideType === "slide") {
      slideData.metadata = {
        wordcloud_one_per_user: wordcloudOnePerUser,
      };
    }

    await onAdd(slideData);

    // Reset form
    setTitle("");
    setContent("");
    setOptions(["옵션 1", "옵션 2", "옵션 3"]);
    setCorrectAnswer(0);
    setWordcloudOnePerUser(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-border/50 pr-8">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">새 슬라이드</h2>
          <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest">Create New Slide</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-[9px] uppercase font-black text-muted-foreground/70 tracking-[0.2em] px-1">Slide Type</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "slide", label: "일반", icon: Layout, gradient: "from-blue-500/10 to-blue-600/5", border: "border-blue-500/20" },
              { value: "vote", label: "투표", icon: BarChart2, gradient: "from-purple-500/10 to-purple-600/5", border: "border-purple-500/20" },
              { value: "quiz", label: "퀴즈", icon: HelpCircle, gradient: "from-pink-500/10 to-pink-600/5", border: "border-pink-500/20" },
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setSlideType(type.value)}
                className={cn(
                  "group relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 transition-all duration-300 overflow-hidden",
                  slideType === type.value
                    ? `${type.border} ${type.gradient} shadow-lg scale-[1.02]`
                    : "border-muted/30 hover:border-muted/60 bg-muted/20 hover:bg-muted/30"
                )}
              >
                {slideType === type.value && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent animate-pulse" />
                )}
                <div className={cn(
                  "p-2 rounded-xl transition-all duration-300",
                  slideType === type.value
                    ? type.value === "slide" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                      : type.value === "vote" ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                      : "bg-pink-500 text-white shadow-lg shadow-pink-500/30"
                    : "bg-muted/50 text-muted-foreground group-hover:bg-muted"
                )}>
                  <type.icon className="h-4 w-4" />
                </div>
                <span className={cn(
                  "text-[10px] font-black leading-none tracking-wide transition-colors",
                  slideType === type.value ? "text-foreground" : "text-muted-foreground"
                )}>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] uppercase font-black text-muted-foreground/70 tracking-[0.2em] px-1">제목</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 실시간 투표를 부탁드립니다"
            className="h-10 text-sm font-medium border-muted/200 focus-visible:ring-primary/20 focus-visible:border-primary/30 shadow-sm shadow-black/5"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[9px] uppercase font-black text-muted-foreground/70 tracking-[0.2em] px-1">설명 <span className="text-muted-foreground/40 normal-case tracking-normal">(선택)</span></label>
          <Textarea
            value={content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
            placeholder="상세 내용을 입력하세요"
            rows={3}
            className="text-xs resize-none border-muted/200 focus-visible:ring-primary/20 focus-visible:border-primary/30 shadow-sm shadow-black/5"
          />
        </div>

        {/* Wordcloud 설정 (일반 슬라이드) */}
        {slideType === "slide" && (
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-black text-muted-foreground/70 tracking-[0.2em] px-1">
              <Cloud className="h-3 w-3 inline mr-1 text-blue-500" />
              워드클라우드 설정
            </label>
            <button
              type="button"
              onClick={() => setWordcloudOnePerUser(!wordcloudOnePerUser)}
              className={cn(
                "group w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden",
                wordcloudOnePerUser
                  ? "border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-transparent shadow-lg shadow-blue-500/5"
                  : "border-muted/30 hover:border-muted/50 bg-muted/10"
              )}
            >
              {wordcloudOnePerUser && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent" />
              )}
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                wordcloudOnePerUser ? "bg-blue-500 text-white shadow-lg" : "bg-muted/50 text-muted-foreground group-hover:bg-muted"
              )}>
                <UserCheck className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 relative z-10">
                <p className={cn(
                  "text-xs font-bold transition-colors",
                  wordcloudOnePerUser ? "text-foreground" : "text-muted-foreground"
                )}>계정 당 1회 답변 제한</p>
                <p className="text-[10px] text-muted-foreground/50">각 참여자가 하나의 단어만 보낼 수 있습니다</p>
              </div>
              <div className={cn(
                "w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0 relative shadow-inner",
                wordcloudOnePerUser ? "bg-blue-500" : "bg-muted"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300",
                  wordcloudOnePerUser ? "left-[22px]" : "left-0.5"
                )} />
              </div>
            </button>
          </div>
        )}

        {slideType !== "slide" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[9px] uppercase font-black text-muted-foreground/70 tracking-[0.2em">선택지</label>
              <Badge variant="secondary" className="h-5 text-[9px] px-2 font-bold bg-muted/50 border-muted/200">최소 2개</Badge>
            </div>
            <Textarea
              value={options.join("\n")}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOptions(e.target.value.split("\n"))}
              placeholder={"옵션 1\n옵션 2\n옵션 3"}
              rows={4}
              className="text-xs font-mono resize-none bg-muted/10 border-muted/200 focus-visible:ring-primary/20 focus-visible:border-primary/30 shadow-sm"
              required
            />
          </div>
        )}

        {slideType === "quiz" && (
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-black text-muted-foreground/70 tracking-[0.2em] px-1">정답 설정</label>
            <Select
              value={correctAnswer.toString()}
              onValueChange={(val) => setCorrectAnswer(parseInt(val))}
            >
              <SelectTrigger className="h-10 text-xs border-muted/200 shadow-sm shadow-black/5">
                <SelectValue placeholder="정답을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt, i) => (
                  <SelectItem key={i} value={i.toString()} className="text-xs">
                    {i + 1}번: {opt || `옵션 ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="pt-3">
          <Button
            type="submit"
            disabled={isLoading || !title}
            className="w-full h-11 text-xs font-black uppercase tracking-[0.2em] bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-xl shadow-primary/20 transition-all duration-300 active:scale-[0.98] rounded-xl"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                슬라이드 추가
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
