"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Presentation,
  Users,
  Zap,
  MessageSquare,
  Check,
  X,
  Crown,
  Rocket,
  Gift,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const plans = [
  {
    name: "무료",
    description: "가볍게 시작해 보세요",
    price: 0,
    unit: "원",
    period: "영구 무료",
    icon: Gift,
    highlight: false,
    cta: "무료로 시작하기",
    ctaHref: "/creator",
    ctaVariant: "outline" as const,
    features: [
      "최대 5개 슬라이드",
      "최대 50명 참여",
      "실시간 투표",
      "실시간 퀴즈",
      "워드클라우드",
      "실시간 댓글",
    ],
    limitations: ["슬라이드 5개 제한", "세션당 50명 참여 제한"],
  },
  {
    name: "프로 구독",
    description: "모든 기능을 제한 없이 사용하세요",
    price: 10000,
    unit: "원",
    period: "/월 (부가세 별도)",
    icon: Rocket,
    highlight: true,
    badge: "인기",
    cta: "구독 시작하기",
    ctaHref: "/creator",
    ctaVariant: "default" as const,
    features: [
      "무제한 슬라이드",
      "무제한 참여자",
      "실시간 투표",
      "실시간 퀴즈",
      "워드클라우드",
      "실시간 댓글",
      "맞춤형 테마",
      "데이터 내보내기",
      "우선 지원",
    ],
    limitations: [],
  },
  {
    name: "평생 사용권",
    description: "한 번 결제로 영구 이용",
    price: 150000,
    unit: "원",
    period: "1회 결제 · 평생 사용",
    icon: Crown,
    highlight: false,
    cta: "평생권 구매하기",
    ctaHref: "/creator",
    ctaVariant: "outline" as const,
    features: [
      "무제한 슬라이드",
      "무제한 참여자",
      "실시간 투표",
      "실시간 퀴즈",
      "워드클라우드",
      "실시간 댓글",
      "맞춤형 테마",
      "데이터 내보내기",
      "우선 지원",
      "향후 모든 업데이트 포함",
      "광고 없는 환경",
    ],
    limitations: [],
  },
];

const comparisonFeatures = [
  {
    category: "기본 기능",
    items: [
      {
        name: "슬라이드 개수",
        free: "5개",
        pro: "무제한",
        lifetime: "무제한",
      },
      {
        name: "참여자 수",
        free: "50명",
        pro: "무제한",
        lifetime: "무제한",
      },
      {
        name: "세션 생성",
        free: "무제한",
        pro: "무제한",
        lifetime: "무제한",
      },
    ],
  },
  {
    category: "상호작용",
    items: [
      {
        name: "실시간 투표",
        free: true,
        pro: true,
        lifetime: true,
      },
      {
        name: "실시간 퀴즈",
        free: true,
        pro: true,
        lifetime: true,
      },
      {
        name: "워드클라우드",
        free: true,
        pro: true,
        lifetime: true,
      },
      {
        name: "실시간 댓글",
        free: true,
        pro: true,
        lifetime: true,
      },
    ],
  },
  {
    category: "고급 기능",
    items: [
      {
        name: "맞춤형 테마",
        free: false,
        pro: true,
        lifetime: true,
      },
      {
        name: "데이터 내보내기",
        free: false,
        pro: true,
        lifetime: true,
      },
      {
        name: "우선 지원",
        free: false,
        pro: true,
        lifetime: true,
      },
      {
        name: "향후 업데이트",
        free: false,
        pro: true,
        lifetime: true,
      },
      {
        name: "광고 없는 환경",
        free: false,
        pro: true,
        lifetime: true,
      },
    ],
  },
];

const faqs = [
  {
    q: "무료 플랜으로 얼마나 많은 슬라이드를 만들 수 있나요?",
    a: "무료 플랜에서는 하나의 세션에 최대 5개의 슬라이드를 만들 수 있습니다. 세션 생성 횟수는 제한이 없으며, 실시간 투표, 퀴즈, 워드클라우드 등 모든 상호작용 기능을 사용할 수 있습니다.",
  },
  {
    q: "참여자 수가 제한을 초과하면 어떻게 되나요?",
    a: "무료 플랜에서는 세션당 최대 50명까지만 참여할 수 있습니다. 이 인원을 초과하면 추가 참여자는 세션에 입장할 수 없습니다. 더 많은 인원이 필요하시다면 프로 구독 또는 평생 사용권으로 업그레이드해 주세요.",
  },
  {
    q: "월 구독을 언제든 취소할 수 있나요?",
    a: "네, 언제든지 구독을 취소하실 수 있습니다. 취소 시 다음 결제 주기부터 요금이 청구되지 않으며, 현재 구독 기간이 끝날 때까지 모든 기능을 계속 이용하실 수 있습니다.",
  },
  {
    q: "평생 사용권은 정말 한 번만 결제하면 되나요?",
    a: "네, 평생 사용권은 1회 결제로 영구적으로 모든 기능을 이용하실 수 있습니다. 향후 추가되는 모든 기능과 업데이트도 추가 비용 없이 제공됩니다.",
  },
  {
    q: "결제 수단은 어떤 것이 있나요?",
    a: "신용카드, 체크카드, 카카오페이, 네이버페이, 토스페이 등 다양한 결제 수단을 지원합니다. 모든 결제는 안전한 PG사를 통해 처리됩니다.",
  },
  {
    q: "환불 정책은 어떻게 되나요?",
    a: "구독 결제일로부터 7일 이내, 평생 사용권 구매일로부터 14일 이내에 전액 환불을 요청하실 수 있습니다. 자세한 내용은 이용약관을 참조해 주세요.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR");
}

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === "string") return <span>{value}</span>;
  return value ? (
    <Check className="h-5 w-5 text-primary mx-auto" />
  ) : (
    <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ Accordion                                                      */
/* ------------------------------------------------------------------ */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button
        className="w-full flex items-center justify-between py-5 text-left font-medium hover:text-primary transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="pr-4">{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
              <Presentation className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">Real-Slide</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                홈으로
              </Link>
            </Button>
            <Button asChild variant="default" size="sm">
              <Link href="/creator">지금 시작하기</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 container text-center">
          <div className="space-y-4 max-w-2xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              합리적인 가격으로 시작하세요
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              심플한 가격, 강력한 기능
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              숨겨진 비용 없이 투명한 가격으로 실시간 상호작용 프레젠테이션을
              만나보세요.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-24 container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlight
                    ? "border-primary shadow-xl shadow-primary/10 scale-[1.02] md:scale-105"
                    : "hover:shadow-lg transition-shadow"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="px-4 py-1 text-sm">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <div
                    className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                      plan.highlight
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <plan.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {plan.price === 0
                        ? "무료"
                        : `${formatPrice(plan.price)}${plan.unit}`}
                    </span>
                    {plan.price > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.period}
                      </p>
                    )}
                    {plan.price === 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.period}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 text-left text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                    {plan.limitations.map((l) => (
                      <li
                        key={l}
                        className="flex items-start gap-2 text-muted-foreground"
                      >
                        <X className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-4">
                  <Button
                    asChild
                    variant={plan.ctaVariant}
                    className="w-full"
                    size="lg"
                  >
                    <Link href={plan.ctaHref}>{plan.cta}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Trust */}
          <p className="text-center text-sm text-muted-foreground mt-10">
            모든 플랜에 SSL 암호화가 적용됩니다 &middot; 언제든 업그레이드 &
            다운그레이드 가능 &middot; 설치비 없음
          </p>
        </section>

        {/* Feature Comparison */}
        <section className="py-24 bg-muted/30">
          <div className="container">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                플랜 비교
              </h2>
              <p className="text-muted-foreground text-lg">
                비즈니스 요구에 맞는 플랜을 선택하세요
              </p>
            </div>

            <div className="max-w-4xl mx-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-4 font-semibold w-[40%]">
                      기능
                    </th>
                    <th className="text-center py-4 px-4 font-semibold w-[20%]">
                      무료
                    </th>
                    <th className="text-center py-4 px-4 font-semibold w-[20%]">
                      <span className="text-primary">프로 구독</span>
                    </th>
                    <th className="text-center py-4 px-4 font-semibold w-[20%]">
                      평생 사용권
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((group) => (
                    <React.Fragment key={group.category}>
                      <tr>
                        <td
                          colSpan={4}
                          className="pt-6 pb-2 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider"
                        >
                          {group.category}
                        </td>
                      </tr>
                      {group.items.map((item) => (
                        <tr
                          key={item.name}
                          className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3.5 px-4">{item.name}</td>
                          <td className="py-3.5 px-4 text-center">
                            <CellValue value={item.free} />
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <CellValue value={item.pro} />
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <CellValue value={item.lifetime} />
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 container">
          <div className="text-center space-y-4 mb-16">
            <div className="flex items-center justify-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                자주 묻는 질문
              </h2>
            </div>
            <p className="text-muted-foreground text-lg">
              가격과 플랜에 대해 궁금한 점을 확인하세요
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-muted/30">
          <div className="container text-center space-y-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              지금 바로 시작하세요
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              무료로 시작하고, 필요할 때 업그레이드하세요. 신용카드 없이 바로
              시작할 수 있습니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="h-12 px-8 text-lg rounded-full"
              >
                <Link href="/creator">무료로 시작하기</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-8 text-lg rounded-full"
              >
                <Link href="/">홈으로 돌아가기</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-background">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tight">Real-Slide</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; 2026 Real-Slide. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              개인정보처리방침
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              이용약관
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
