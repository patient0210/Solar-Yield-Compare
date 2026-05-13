import { useState, useCallback } from "react";
import { format } from "date-fns";
import { runSimulation } from "@workspace/api-client-react";
import type { SimulationResult } from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Sun,
  MapPin,
  Compass,
  Battery,
  Calendar,
  Plus,
  X,
  GitCompare,
  Zap,
  Activity,
  Clock,
} from "lucide-react";
import PanelSideView from "@/components/panel-side-view";

const TILT_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

interface TiltResult {
  tilt: number;
  result: SimulationResult;
}

export default function Compare() {
  const { toast } = useToast();

  const [lat, setLat] = useState<number>(36.0);
  const [lng, setLng] = useState<number>(127.0);
  const [azimuth, setAzimuth] = useState<number>(180);
  const [capacityW, setCapacityW] = useState<number>(570);
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [timezone, setTimezone] = useState<string>("Asia/Seoul");

  const [tilts, setTilts] = useState<number[]>([10, 20, 30]);
  const [newTilt, setNewTilt] = useState<number>(40);

  const [results, setResults] = useState<TiltResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addTilt = () => {
    if (tilts.includes(newTilt)) {
      toast({ variant: "destructive", title: "중복 경사각", description: `${newTilt}°는 이미 목록에 있습니다.` });
      return;
    }
    if (tilts.length >= 6) {
      toast({ variant: "destructive", title: "최대 6개", description: "최대 6개의 경사각까지 비교할 수 있습니다." });
      return;
    }
    setTilts((prev) => [...prev, newTilt].sort((a, b) => a - b));
  };

  const removeTilt = (t: number) => {
    if (tilts.length <= 2) {
      toast({ variant: "destructive", title: "최소 2개", description: "비교를 위해 최소 2개의 경사각이 필요합니다." });
      return;
    }
    setTilts((prev) => prev.filter((v) => v !== t));
  };

  const handleCompare = useCallback(async () => {
    setIsLoading(true);
    setResults([]);
    try {
      const settled = await Promise.all(
        tilts.map((tilt) =>
          runSimulation({
            latitude: lat,
            longitude: lng,
            tilt,
            azimuth,
            capacity_w: capacityW,
            date,
            timezone,
          }).then((result) => ({ tilt, result }))
        )
      );
      setResults(settled);
      toast({
        title: "비교 완료",
        description: `${tilts.length}개 경사각 시뮬레이션이 완료되었습니다.`,
      });
    } catch {
      toast({ variant: "destructive", title: "시뮬레이션 실패", description: "서버 연결 또는 입력값을 확인해 주세요." });
    } finally {
      setIsLoading(false);
    }
  }, [lat, lng, azimuth, capacityW, date, timezone, tilts, toast]);

  const formatTime = (isoString: string) =>
    new Date(isoString).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

  const lineChartData = results.length > 0
    ? results[0].result.timestamps.map((ts, i) => {
        const point: Record<string, number | string> = { time: formatTime(ts) };
        results.forEach(({ tilt, result }) => {
          point[`tilt_${tilt}`] = result.ac_power_w[i];
        });
        return point;
      })
    : [];

  const bestTilt = results.length > 0
    ? results.reduce((best, cur) =>
        cur.result.total_energy_wh > best.result.total_energy_wh ? cur : best
      )
    : null;

  const resultByTilt = Object.fromEntries(results.map((r) => [r.tilt, r.result]));

  return (
    <div className="min-h-screen w-full bg-background flex flex-col md:flex-row">
      {/* 왼쪽 패널 */}
      <div className="w-full md:w-[400px] border-r bg-card p-6 flex flex-col gap-6 overflow-y-auto z-10 shrink-0 shadow-xl md:shadow-none">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Sun className="w-6 h-6 text-primary" />
            경사각 비교
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            여러 경사각의 발전량을 동시에 비교합니다.
          </p>
        </div>

        <div className="space-y-5 flex-1">
          {/* 위치 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="w-4 h-4" /> 위치
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>위도</Label>
                <Input type="number" value={lat} onChange={(e) => setLat(Number(e.target.value))} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>경도</Label>
                <Input type="number" value={lng} onChange={(e) => setLng(Number(e.target.value))} className="font-mono" />
              </div>
            </div>
          </div>

          <Separator />

          {/* 방향 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Compass className="w-4 h-4" /> 방위각
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>방위각 (0-360°)</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={360}
                    value={azimuth}
                    onChange={(e) => setAzimuth(Math.min(360, Math.max(0, Number(e.target.value))))}
                    className="w-20 h-7 text-right font-mono text-sm px-2 py-0"
                  />
                  <span className="text-sm text-muted-foreground">°</span>
                </div>
              </div>
              <Slider min={0} max={360} step={1} value={[azimuth]} onValueChange={(v) => setAzimuth(v[0])} />
              <p className="text-xs text-muted-foreground">180°는 정남향입니다</p>
            </div>
          </div>

          <Separator />

          {/* 시스템 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Battery className="w-4 h-4" /> 시스템 사양
            </div>
            <div className="space-y-2">
              <Label>패널 용량 (W)</Label>
              <Input type="number" value={capacityW} onChange={(e) => setCapacityW(Number(e.target.value))} className="font-mono" />
            </div>
          </div>

          <Separator />

          {/* 날짜 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="w-4 h-4" /> 날짜 및 시간대
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>날짜</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>시간대</Label>
                <Input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="font-mono" />
              </div>
            </div>
          </div>

          <Separator />

          {/* 경사각 목록 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GitCompare className="w-4 h-4" /> 비교할 경사각
            </div>

            <div className="flex flex-wrap gap-2">
              {tilts.map((t, i) => (
                <div
                  key={t}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono font-medium border"
                  style={{
                    borderColor: TILT_COLORS[i % TILT_COLORS.length],
                    color: TILT_COLORS[i % TILT_COLORS.length],
                    backgroundColor: `${TILT_COLORS[i % TILT_COLORS.length]}18`,
                  }}
                >
                  {t}°
                  <button onClick={() => removeTilt(t)} className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label>경사각 추가 (0-90°)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={90}
                    value={newTilt}
                    onChange={(e) => setNewTilt(Math.min(90, Math.max(0, Number(e.target.value))))}
                    className="font-mono"
                  />
                  <Button variant="outline" size="icon" onClick={addTilt} className="shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 sticky bottom-0 bg-card pb-2">
          <Button
            onClick={handleCompare}
            disabled={isLoading || tilts.length < 2}
            className="w-full h-11 text-base font-medium"
            data-testid="button-compare"
          >
            {isLoading ? "계산 중..." : `${tilts.length}개 경사각 비교 시작`}
            {!isLoading && <GitCompare className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>

      {/* 오른쪽 패널 */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-muted/30 space-y-8">

        {/* ─── 측면 구조 비교 (항상 표시) ─── */}
        <div>
          <h2 className="text-xl font-semibold tracking-tight">측면 구조 비교</h2>
          <p className="text-muted-foreground mt-1 mb-4">
            경사각별 패널 설치 형태를 측면에서 나타낸 구조도입니다.
          </p>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.min(tilts.length, 3)}, minmax(0, 1fr))` }}
          >
            {tilts.map((t, i) => {
              const simResult = resultByTilt[t];
              const isBest = bestTilt?.tilt === t;
              return (
                <Card
                  key={t}
                  className={`shadow-sm border-0 bg-card overflow-hidden transition-all ${isBest ? "ring-2" : ""}`}
                  style={isBest ? { ringColor: TILT_COLORS[i % TILT_COLORS.length] } : {}}
                >
                  <CardContent className="p-3">
                    <PanelSideView
                      tilt={t}
                      color={TILT_COLORS[i % TILT_COLORS.length]}
                      isBest={isBest}
                      energyWh={simResult?.total_energy_wh}
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: TILT_COLORS[i % TILT_COLORS.length] }}
                        />
                        <span
                          className="font-mono font-bold text-sm"
                          style={{ color: TILT_COLORS[i % TILT_COLORS.length] }}
                        >
                          {t}° 경사
                        </span>
                      </div>
                      {simResult && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {(simResult.total_energy_wh / 1000).toFixed(2)} kWh
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ─── 로딩 ─── */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground animate-pulse">
              {tilts.length}개 경사각 병렬 계산 중...
            </p>
          </div>
        )}

        {/* ─── 안내 (결과 없고 로딩 아닐 때) ─── */}
        {results.length === 0 && !isLoading && (
          <div className="flex flex-col items-center text-center py-8 space-y-2">
            <p className="text-sm text-muted-foreground">
              위 구조도를 확인한 후, 왼쪽 버튼을 눌러 발전량 시뮬레이션을 시작하세요.
            </p>
          </div>
        )}

        {/* ─── 시뮬레이션 결과 ─── */}
        {results.length > 0 && !isLoading && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 발전 곡선 차트 */}
            <div>
              <h2 className="text-xl font-semibold tracking-tight">경사각별 발전 곡선</h2>
              <p className="text-muted-foreground mt-1">시간대별 AC 출력 비교</p>
            </div>

            <Card className="shadow-sm border-0 bg-card overflow-hidden">
              <div className="h-[380px] p-6 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickMargin={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickMargin={10}
                      axisLine={false}
                      tickLine={false}
                      unit=" W"
                    />
                    <RechartsTooltip
                      formatter={(val: number, name: string) => {
                        const deg = name.replace("tilt_", "");
                        return [`${val.toFixed(0)} W`, `경사각 ${deg}°`];
                      }}
                      labelFormatter={(label) => `시각: ${label}`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                      itemStyle={{ fontWeight: 500 }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}
                    />
                    <Legend
                      formatter={(value) => `경사각 ${value.replace("tilt_", "")}°`}
                      wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }}
                    />
                    {results.map(({ tilt }, i) => (
                      <Line
                        key={tilt}
                        type="monotone"
                        dataKey={`tilt_${tilt}`}
                        stroke={TILT_COLORS[i % TILT_COLORS.length]}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 성능 지표 비교 테이블 */}
            <div>
              <h2 className="text-xl font-semibold tracking-tight">성능 지표 비교</h2>
              <p className="text-muted-foreground mt-1 mb-4">경사각별 주요 발전 지표 요약 (발전량 높은 순)</p>

              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-5 gap-3 px-4 py-2 rounded-lg bg-muted/60">
                  <div className="text-xs font-semibold text-muted-foreground">경사각</div>
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3" /> 일일 발전량
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Activity className="w-3 h-3" /> 최대 출력
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 최대 출력 시각
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Sun className="w-3 h-3" /> 일조 시간
                  </div>
                </div>

                {results
                  .slice()
                  .sort((a, b) => b.result.total_energy_wh - a.result.total_energy_wh)
                  .map(({ tilt, result }) => {
                    const colorIdx = tilts.indexOf(tilt);
                    const isBest = bestTilt?.tilt === tilt;
                    return (
                      <Card
                        key={tilt}
                        className={`shadow-sm border-0 bg-card ${isBest ? "ring-2 ring-primary/40" : ""}`}
                      >
                        <CardContent className="p-4">
                          <div className="grid grid-cols-5 gap-3 items-center">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: TILT_COLORS[colorIdx % TILT_COLORS.length] }}
                              />
                              <span className="font-mono font-semibold text-base">{tilt}°</span>
                              {isBest && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground leading-none">
                                  최적
                                </span>
                              )}
                            </div>
                            <div className="font-mono font-semibold">
                              {(result.total_energy_wh / 1000).toFixed(3)}
                              <span className="text-sm text-muted-foreground ml-1">kWh</span>
                            </div>
                            <div className="font-mono font-semibold">
                              {result.peak_power_w.toFixed(0)}
                              <span className="text-sm text-muted-foreground ml-1">W</span>
                            </div>
                            <div className="font-mono">{formatTime(result.peak_time)}</div>
                            <div className="font-mono">
                              {result.sunshine_hours.toFixed(1)}
                              <span className="text-sm text-muted-foreground ml-1">시간</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>

            {/* 발전량 차이 요약 */}
            {results.length >= 2 && (() => {
              const sorted = results.slice().sort((a, b) => b.result.total_energy_wh - a.result.total_energy_wh);
              const best = sorted[0];
              const worst = sorted[sorted.length - 1];
              const diffWh = best.result.total_energy_wh - worst.result.total_energy_wh;
              const diffPct = (diffWh / worst.result.total_energy_wh) * 100;
              return (
                <Card className="shadow-sm border-0 bg-primary/5 border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      최고 vs 최저 발전량 차이
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground">
                      <span className="font-mono font-semibold">{best.tilt}°</span> 경사각이{" "}
                      <span className="font-mono font-semibold">{worst.tilt}°</span> 대비{" "}
                      <span className="font-mono font-semibold text-primary">
                        +{(diffWh / 1000).toFixed(3)} kWh
                      </span>{" "}
                      (<span className="font-mono text-primary">+{diffPct.toFixed(1)}%</span>) 더 많이 생산합니다.
                    </p>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
