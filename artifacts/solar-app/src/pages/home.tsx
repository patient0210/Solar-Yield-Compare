import { useState } from "react";
import { format } from "date-fns";
import {
  useRunSimulation,
  useFindOptimalTilt,
} from "@workspace/api-client-react";
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
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Activity,
  Sun,
  MapPin,
  Compass,
  Battery,
  Calendar,
  Zap,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const { toast } = useToast();

  const [lat, setLat] = useState<number>(36.0);
  const [lng, setLng] = useState<number>(127.0);
  const [tilt, setTilt] = useState<number>(20);
  const [azimuth, setAzimuth] = useState<number>(180);
  const [capacityW, setCapacityW] = useState<number>(570);
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [timezone, setTimezone] = useState<string>("Asia/Seoul");

  const runSim = useRunSimulation();
  const findOptimal = useFindOptimalTilt();

  const [simResult, setSimResult] = useState<any>(null);
  const [optimalResult, setOptimalResult] = useState<any>(null);

  const handleRunSimulation = () => {
    setOptimalResult(null);
    runSim.mutate(
      {
        data: {
          latitude: lat,
          longitude: lng,
          tilt,
          azimuth,
          capacity_w: capacityW,
          date,
          timezone,
        },
      },
      {
        onSuccess: (data) => {
          setSimResult(data);
          toast({
            title: "시뮬레이션 완료",
            description: "일일 태양광 발전량 계산이 완료되었습니다.",
          });
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "시뮬레이션 실패",
            description: err.error || "알 수 없는 오류가 발생했습니다.",
          });
        },
      }
    );
  };

  const handleFindOptimal = () => {
    setSimResult(null);
    findOptimal.mutate(
      {
        data: {
          latitude: lat,
          longitude: lng,
          capacity_w: capacityW,
          date,
          timezone,
          azimuth,
        },
      },
      {
        onSuccess: (data) => {
          setOptimalResult(data);
          setTilt(data.optimal_tilt);
          toast({
            title: "최적 경사각 탐색 완료",
            description: `최대 발전량을 위해 경사각이 ${data.optimal_tilt}°로 설정되었습니다.`,
          });
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "최적화 실패",
            description: err.error || "알 수 없는 오류가 발생했습니다.",
          });
        },
      }
    );
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const lineChartData = simResult
    ? simResult.timestamps.map((ts: string, i: number) => ({
        time: formatTime(ts),
        power: simResult.ac_power_w[i],
      }))
    : [];

  return (
    <div className="min-h-screen w-full bg-background flex flex-col md:flex-row">
      {/* 왼쪽 패널: 입력 설정 */}
      <div className="w-full md:w-[400px] border-r bg-card p-6 flex flex-col gap-6 overflow-y-auto z-10 shrink-0 shadow-xl md:shadow-none">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Sun className="w-6 h-6 text-primary" />
            태양광 발전 시뮬레이터
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            정밀 물리 모델 기반 태양광 발전량 예측
          </p>
        </div>

        <div className="space-y-5 flex-1">
          {/* 위치 설정 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="w-4 h-4" /> 위치
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>위도</Label>
                <Input
                  type="number"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  className="font-mono"
                  data-testid="input-latitude"
                />
              </div>
              <div className="space-y-2">
                <Label>경도</Label>
                <Input
                  type="number"
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                  className="font-mono"
                  data-testid="input-longitude"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 방향 설정 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Compass className="w-4 h-4" /> 패널 방향
            </div>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>경사각 (0-90°)</Label>
                  <span className="font-mono text-sm text-primary">
                    {tilt}°
                  </span>
                </div>
                <Slider
                  min={0}
                  max={90}
                  step={1}
                  value={[tilt]}
                  onValueChange={(v) => setTilt(v[0])}
                  data-testid="slider-tilt"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>방위각 (0-360°)</Label>
                  <span className="font-mono text-sm text-primary">
                    {azimuth}°
                  </span>
                </div>
                <Slider
                  min={0}
                  max={360}
                  step={1}
                  value={[azimuth]}
                  onValueChange={(v) => setAzimuth(v[0])}
                  data-testid="slider-azimuth"
                />
                <p className="text-xs text-muted-foreground">
                  180°는 정남향입니다
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* 시스템 사양 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Battery className="w-4 h-4" /> 시스템 사양
            </div>
            <div className="space-y-2">
              <Label>패널 용량 (W)</Label>
              <Input
                type="number"
                value={capacityW}
                onChange={(e) => setCapacityW(Number(e.target.value))}
                className="font-mono"
                data-testid="input-capacity"
              />
            </div>
          </div>

          <Separator />

          {/* 시간 설정 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="w-4 h-4" /> 날짜 및 시간대
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>날짜</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="font-mono"
                  data-testid="input-date"
                />
              </div>
              <div className="space-y-2">
                <Label>시간대</Label>
                <Input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="font-mono"
                  data-testid="input-timezone"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-3 sticky bottom-0 bg-card pb-2">
          <Button
            onClick={handleRunSimulation}
            disabled={runSim.isPending}
            className="w-full h-11 text-base font-medium"
            data-testid="button-run-simulation"
          >
            {runSim.isPending ? "계산 중..." : "시뮬레이션 실행"}
            {!runSim.isPending && <Activity className="w-4 h-4 ml-2" />}
          </Button>
          <Button
            variant="secondary"
            onClick={handleFindOptimal}
            disabled={findOptimal.isPending}
            className="w-full h-11 text-base font-medium"
            data-testid="button-find-optimal"
          >
            {findOptimal.isPending ? "최적화 중..." : "최적 경사각 탐색"}
          </Button>
        </div>
      </div>

      {/* 오른쪽 패널: 결과 */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-muted/30">
        {!simResult && !optimalResult && !runSim.isPending && !findOptimal.isPending && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Activity className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-semibold">시뮬레이션 준비 완료</h2>
            <p className="text-muted-foreground">
              왼쪽 패널에서 설정을 조정한 후 시뮬레이션을 실행하면 일별 발전 곡선과 성능 지표를 확인할 수 있습니다.
            </p>
          </div>
        )}

        {(runSim.isPending || findOptimal.isPending) && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground animate-pulse">
              태양광 모델 계산 중...
            </p>
          </div>
        )}

        {simResult && !runSim.isPending && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">일일 발전 곡선</h2>
              <p className="text-muted-foreground mt-1">시뮬레이션 날짜의 시간대별 교류(AC) 출력</p>
            </div>

            <Card className="shadow-sm border-0 bg-card overflow-hidden">
              <div className="h-[400px] p-6 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      tickMargin={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      tickMargin={10}
                      axisLine={false}
                      tickLine={false}
                      unit=" W"
                    />
                    <RechartsTooltip
                      formatter={(val: number) => [`${val.toFixed(0)} W`, "출력"]}
                      labelFormatter={(label) => `시각: ${label}`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="power"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm border-0 bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> 일일 발전량
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tracking-tight font-mono">
                    {(simResult.total_energy_wh / 1000).toFixed(2)}
                    <span className="text-lg text-muted-foreground ml-1">kWh</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-0 bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> 최대 출력
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tracking-tight font-mono">
                    {simResult.peak_power_w.toFixed(0)}
                    <span className="text-lg text-muted-foreground ml-1">W</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-0 bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> 최대 출력 시각
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tracking-tight font-mono">
                    {formatTime(simResult.peak_time)}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-0 bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Sun className="w-4 h-4 text-primary" /> 일조 시간
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tracking-tight font-mono">
                    {simResult.sunshine_hours.toFixed(1)}
                    <span className="text-lg text-muted-foreground ml-1">시간</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {optimalResult && !findOptimal.isPending && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">최적 경사각 분석</h2>
              <p className="text-muted-foreground mt-1">경사각별 일일 발전량 비교 (0°~90°, 5° 간격)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-sm border-0 bg-card border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-primary" /> 최적 경사각
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-semibold tracking-tight font-mono">
                    {optimalResult.optimal_tilt}°
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    경사각 슬라이더에 자동으로 적용되었습니다.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-0 bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> 최대 발전량
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-semibold tracking-tight font-mono">
                    {(optimalResult.best_energy_wh / 1000).toFixed(2)}
                    <span className="text-lg text-muted-foreground ml-1">kWh</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm border-0 bg-card overflow-hidden">
              <div className="h-[400px] p-6 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={optimalResult.tilt_energies} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="tilt"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      tickMargin={10}
                      axisLine={false}
                      tickLine={false}
                      unit="°"
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      tickMargin={10}
                      axisLine={false}
                      tickLine={false}
                      domain={["auto", "auto"]}
                    />
                    <RechartsTooltip
                      formatter={(val: number) => [`${(val / 1000).toFixed(2)} kWh`, "발전량"]}
                      labelFormatter={(val) => `경사각: ${val}°`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="energy_wh" radius={[4, 4, 0, 0]}>
                      {optimalResult.tilt_energies.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.tilt === optimalResult.optimal_tilt ? "hsl(var(--primary))" : "hsl(var(--primary)/0.3)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
