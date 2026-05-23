"use client";

import { useCallback, useEffect, useState } from "react";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import {
    Users,
    Package,
    DollarSign,
    Scale,
} from "lucide-react";
import toast from "react-hot-toast";
import { requestAdminGraphQL } from "@/lib/admin/graphql-client";
import { useAuthStore } from "@/lib/store/auth-store";

interface AgentStats {
    totalOrders: number;
    totalRevenue: number;
    totalWeight: number;
}

type DateFilter = "today" | "week" | "month" | "custom";

const initialStats: AgentStats = {
    totalOrders: 0,
    totalRevenue: 0,
    totalWeight: 0,
};

const STAFF_PERFORMANCE_QUERY = `
    query StaffPerformance($dateFilter: StaffDateFilter!, $startDate: String, $endDate: String) {
        staffPerformance(dateFilter: $dateFilter, startDate: $startDate, endDate: $endDate) {
            stats {
                sAgent {
                    totalOrders
                    totalRevenue
                    totalWeight
                }
                kAgent {
                    totalOrders
                    totalRevenue
                    totalWeight
                }
                direct {
                    totalOrders
                    totalRevenue
                    totalWeight
                }
                total {
                    totalOrders
                    totalRevenue
                    totalWeight
                }
            }
        }
    }
`;

type StaffDateFilterValue = "TODAY" | "WEEK" | "MONTH" | "CUSTOM";

type StaffPerformanceResponse = {
    staffPerformance: {
        stats: {
            sAgent: AgentStats;
            kAgent: AgentStats;
            direct: AgentStats;
            total: AgentStats;
        };
    };
};

export default function StaffPerformancePage() {
    const { hasReadPermission, loading: authLoading } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState("");
    const [dateFilter, setDateFilter] = useState<
        DateFilter
    >("week");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    const [stats, setStats] = useState({
        s_agent: { ...initialStats },
        k_agent: { ...initialStats },
        direct: { ...initialStats },
        total: { ...initialStats },
    });

    const fetchStats = useCallback(async () => {
        if (authLoading || !hasReadPermission()) return;

        try {
            setLoading(true);
            setProgress("Loading performance data...");

            if (dateFilter === "custom" && (!customStartDate || !customEndDate)) {
                setLoading(false);
                setProgress("");
                return;
            }

            const data = await requestAdminGraphQL<StaffPerformanceResponse>(
                STAFF_PERFORMANCE_QUERY,
                {
                    dateFilter: dateFilter.toUpperCase() as StaffDateFilterValue,
                    startDate: dateFilter === "custom" ? customStartDate : null,
                    endDate: dateFilter === "custom" ? customEndDate : null,
                }
            );

            setStats({
                s_agent: data.staffPerformance.stats.sAgent,
                k_agent: data.staffPerformance.stats.kAgent,
                direct: data.staffPerformance.stats.direct,
                total: data.staffPerformance.stats.total,
            });

        } catch (error) {
            console.error("Error fetching stats:", error);
            toast.error(
                error instanceof Error
                    ? `Failed to load staff performance data: ${error.message}`
                    : "Failed to load staff performance data"
            );
        } finally {
            setLoading(false);
            setProgress("");
        }
    }, [authLoading, customEndDate, customStartDate, dateFilter, hasReadPermission]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchStats();
    }, [fetchStats]);

    return (
        <AdminAuthGuard>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Staff Performance
                    </h1>
                    <p className="text-gray-600">
                        Track performance stats for S Agent, K Agent, and Direct orders.
                    </p>
                </div>

                {/* Filters */}
                <Card className="mb-8">
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full md:w-48">
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Time Range</label>
                            <Select
                                value={dateFilter}
                                onValueChange={(val) => setDateFilter(val as DateFilter)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="week">Last 7 Days</SelectItem>
                                    <SelectItem value="month">Last 30 Days</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {dateFilter === 'custom' && (
                            <>
                                <div className="w-full md:w-auto">
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">Start Date</label>
                                    <Input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="w-full md:w-auto">
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">End Date</label>
                                    <Input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        <Button onClick={fetchStats} disabled={loading} className="w-full md:w-auto">
                            {loading ? "Loading..." : "Refresh Stats"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Loading Progress */}
                {loading && progress && (
                    <div className="mb-6 bg-blue-50 text-blue-700 px-4 py-3 rounded-md flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                        {progress}
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* S Agent */}
                    <StatsCard
                        title="S Agent Reorders"
                        stats={stats.s_agent}
                        icon={<Users className="w-6 h-6 text-blue-600" />}
                        colorClass="border-blue-200 bg-blue-50"
                    />

                    {/* K Agent */}
                    <StatsCard
                        title="K Agent Reorders"
                        stats={stats.k_agent}
                        icon={<Users className="w-6 h-6 text-purple-600" />}
                        colorClass="border-purple-200 bg-purple-50"
                    />

                    {/* Direct */}
                    <StatsCard
                        title="Direct / Website"
                        stats={stats.direct}
                        icon={<Users className="w-6 h-6 text-green-600" />}
                        colorClass="border-green-200 bg-green-50"
                    />
                </div>

                {/* Grand Total */}
                <div className="mt-8">
                    <StatsCard
                        title="Grand Total (All Channels)"
                        stats={stats.total}
                        icon={<Users className="w-6 h-6 text-gray-800" />}
                        className="bg-white border-2 border-gray-200"
                    />
                </div>

            </div>
        </AdminAuthGuard>
    );
}

function StatsCard({
    title,
    stats,
    icon,
    colorClass = "bg-white",
    className = ""
}: {
    title: string;
    stats: AgentStats;
    icon: React.ReactNode;
    colorClass?: string;
    className?: string;
}) {
    return (
        <Card className={`${colorClass} ${className} shadow-sm`}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-800">{title}</CardTitle>
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-200/50 pb-2">
                        <span className="text-sm text-gray-600 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Revenue
                        </span>
                        <span className="text-xl font-bold text-gray-900">
                            {formatCurrency(stats.totalRevenue)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-200/50 pb-2">
                        <span className="text-sm text-gray-600 flex items-center gap-2">
                            <Package className="w-4 h-4" /> Orders
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                            {stats.totalOrders}
                        </span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                        <span className="text-sm text-gray-600 flex items-center gap-2">
                            <Scale className="w-4 h-4" /> Weight
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                            {stats.totalWeight} kg
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
