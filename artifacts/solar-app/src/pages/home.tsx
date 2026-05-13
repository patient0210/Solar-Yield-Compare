import { useState } from "react";
import { format } from "date-fns";
import {
  useRunSimulation,
  useFindOptimalTilt,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardDescription,
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
  ReferenceLine,
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
            title: "Simulation Complete",
            description: "Successfully computed daily PV production.",
          });
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Simulation Failed",
            description: err.error || "An unknown error occurred.",
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
            title: "Optimal Tilt Found",
            description: `Set tilt to ${data.optimal_tilt} degrees for maximum yield.`,
          });
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Optimization Failed",
            description: err.error || "An unknown error occurred.",
          });
        },
      }
    );
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], {
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
      {/* Left Panel: Controls */}
      <div className="w-full md:w-[400px] border-r bg-card p-6 flex flex-col gap-6 overflow-y-auto z-10 shrink-0 shadow-xl md:shadow-none">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Sun className="w-6 h-6 text-primary" />
            Solar PV Simulator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Precision modeling for solar yield.
          </p>
        </div>

        <div className="space-y-5 flex-1">
          {/* Location Group */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="w-4 h-4" /> Location
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Orientation Group */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Compass className="w-4 h-4" /> Orientation
            </div>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Tilt Angle (0-90°)</Label>
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
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Azimuth (0-360°)</Label>
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
                />
                <p className="text-xs text-muted-foreground">
                  180° is South-facing
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* System Group */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Battery className="w-4 h-4" /> System Specs
            </div>
            <div className="space-y-2">
              <Label>Panel Capacity (Watts)</Label>
              <Input
                type="number"
                value={capacityW}
                onChange={(e) => setCapacityW(Number(e.target.value))}
                className="font-mono"
              />
            </div>
          </div>

          <Separator />

          {/* Time Group */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="w-4 h-4" /> Time
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="font-mono"
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
          >
            {runSim.isPending ? "Simulating..." : "Run Simulation"}
            {!runSim.isPending && <Activity className="w-4 h-4 ml-2" />}
          </Button>
          <Button
            variant="secondary"
            onClick={handleFindOptimal}
            disabled={findOptimal.isPending}
            className="w-full h-11 text-base font-medium"
          >
            {findOptimal.isPending ? "Optimizing..." : "Find Optimal Tilt"}
          </Button>
        </div>
      </div>

      {/* Right Panel: Results */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-muted/30">
        {!simResult && !optimalResult && !runSim.isPending && !findOptimal.isPending && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Activity className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-semibold">Ready for Simulation</h2>
            <p className="text-muted-foreground">
              Adjust parameters in the control panel and run the simulation to see detailed energy generation curves and system performance metrics.
            </p>
          </div>
        )}

        {(runSim.isPending || findOptimal.isPending) && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground animate-pulse">
              Computing solar models...
            </p>
          </div>
        )}

        {simResult && !runSim.isPending && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Daily Production Curve</h2>
              <p className="text-muted-foreground mt-1">AC Power output throughout the simulated day.</p>
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
                    <Zap className="w-4 h-4 text-primary" /> Total Energy
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
                    <Activity className="w-4 h-4 text-primary" /> Peak Power
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
                    <Clock className="w-4 h-4 text-primary" /> Peak Time
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
                    <Sun className="w-4 h-4 text-primary" /> Sunshine
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tracking-tight font-mono">
                    {simResult.sunshine_hours.toFixed(1)}
                    <span className="text-lg text-muted-foreground ml-1">hrs</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {optimalResult && !findOptimal.isPending && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Optimal Tilt Analysis</h2>
              <p className="text-muted-foreground mt-1">Comparing energy yield across different panel angles.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-sm border-0 bg-card border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-primary" /> Optimal Angle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-semibold tracking-tight font-mono">
                    {optimalResult.optimal_tilt}°
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Applied to panel tilt control automatically.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-0 bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> Max Energy Yield
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
                      domain={['auto', 'auto']}
                    />
                    <RechartsTooltip
                      formatter={(val: number) => [`${(val / 1000).toFixed(2)} kWh`, "Energy Yield"]}
                      labelFormatter={(val) => `Tilt: ${val}°`}
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
