import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Presentation, Users, Zap, MessageSquare } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
              <Presentation className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">Real-Slide</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Button asChild variant="default" size="sm">
              <Link href="/creator">지금 시작하기</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/join">세션 참여하기</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-24 container flex flex-col items-center text-center space-y-8">
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent pb-2">
              실시간 대화형 <br /> 프레젠테이션의 미래
            </h1>
            <p className="text-xl text-muted-foreground max-w-[700px] mx-auto">
              청중과 소통하고, 실시간으로 피드백을 받으세요. <br />
              투표, 퀴즈, 워드클라우드까지 모든 상호작용이 실시간으로 이루어집니다.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="h-12 px-8 text-lg rounded-full">
              <Link href="/creator">지금 시작하기</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-lg rounded-full">
              <Link href="/join">세션 참여하기</Link>
            </Button>
          </div>

          <div className="pt-12 relative w-full max-w-5xl">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl rounded-[2rem] -z-10 opacity-50" />
            <div className="glass rounded-2xl border glass-shadow overflow-hidden p-2 aspect-[16/10] flex items-center justify-center text-muted-foreground font-medium italic">
              Dashboard Preview Snapshot
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-muted/30">
          <div className="container">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">강력한 상호작용 기능</h2>
              <p className="text-muted-foreground text-lg">발표의 질을 높여주는 핵심 기능들을 만나보세요.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "실시간 투표", desc: "청중의 의견을 즉석에서 확인하고 데이터로 시각화합니다.", icon: Zap },
                { title: "실시간 퀴즈", desc: "경쟁과 재미를 더하는 퀴즈로 참여도를 높이세요.", icon: Users },
                { title: "워드클라우드", desc: "모두의 생각을 하나의 이미지로 아름답게 표현합니다.", icon: Presentation },
                { title: "실시간 댓글", desc: "질문과 피드백을 끊김 없이 주고받으세요.", icon: MessageSquare }
              ].map((feature, i) => (
                <Card key={i} className="border-none shadow-none bg-background hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-primary">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
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
          <p className="text-sm text-muted-foreground">© 2026 Real-Slide. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
