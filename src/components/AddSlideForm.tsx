"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Layout, BarChart2, HelpCircle, X, Loader2 } from "lucide-react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await onAdd({
      type: slideType,
      title,
      content,
      options: slideType === "slide" ? null : options,
      correctAnswer: slideType === "quiz" ? correctAnswer : null,
    });

    // Reset form
    setTitle("");
    setContent("");
    setOptions(["옵션 1", "옵션 2", "옵션 3"]);
    setCorrectAnswer(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">새 슬라이드</h2>
          <p className="text-xs text-muted-foreground italic">청중과 공유할 새로운 콘텐츠를 추가하세요.</p>
        </div>
        {onCancel && (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest px-1">타입</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "slide", label: "일반", icon: Layout },
              { value: "vote", label: "투표", icon: BarChart2 },
              { value: "quiz", label: "퀴즈", icon: HelpCircle },
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setSlideType(type.value)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                  slideType === type.value 
                    ? "border-primary bg-primary/5 text-primary" 
                    : "border-muted hover:border-primary/50 hover:bg-accent text-muted-foreground"
                )}
              >
                <type.icon className="h-5 w-5" />
                <span className="text-xs font-bold leading-none">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest px-1">제목</label>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="예: 실시간 투표를 부탁드립니다" 
            className="h-10 text-sm font-medium focus-visible:ring-primary/30"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest px-1">설명 (선택)</label>
          <Textarea 
            value={content} 
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)} 
            placeholder="상세 내용을 입력하세요" 
            rows={3}
            className="text-xs resize-none focus-visible:ring-primary/30"
          />
        </div>

        {slideType !== "slide" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest">선택지 (각 줄로 구분)</label>
              <Badge variant="secondary" className="h-4 text-[9px] px-1 font-bold">MIN 2</Badge>
            </div>
            <Textarea 
              value={options.join("\n")} 
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOptions(e.target.value.split("\n"))} 
              placeholder="옵션 1&#10;옵션 2&#10;옵션 3" 
              rows={4}
              className="text-xs font-mono resize-none bg-muted/30 focus-visible:ring-primary/30"
              required
            />
          </div>
        )}

        {slideType === "quiz" && (
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-widest px-1">정답 설정</label>
            <Select 
              value={correctAnswer.toString()} 
              onValueChange={(val) => setCorrectAnswer(parseInt(val))}
            >
              <SelectTrigger className="h-10 text-xs">
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

        <div className="pt-2">
          <Button 
            type="submit" 
            disabled={isLoading || !title} 
            className="w-full h-11 text-xs font-bold uppercase tracking-widest shadow-xl shadow-primary/10 transition-all active:scale-[0.98]"
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
