import { Target, TrendingUp, Calendar, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsCardsProps {
  activeGoals: number;
  avgProgress: number;
  sessionsThisMonth: number;
  completedTasks: number;
}

export const DashboardStatsCards = ({
  activeGoals,
  avgProgress,
  sessionsThisMonth,
  completedTasks,
}: StatsCardsProps) => {
  const stats = [
    {
      title: "Active Goals",
      value: activeGoals,
      icon: Target,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Avg Progress",
      value: `${avgProgress}%`,
      icon: TrendingUp,
      color: "from-yellow-500 to-yellow-600",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Sessions This Month",
      value: sessionsThisMonth,
      icon: Calendar,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Completed Tasks",
      value: completedTasks,
      icon: CheckCircle2,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={`p-6 ${stat.bgColor} border-none backdrop-blur-sm`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {stat.title}
              </p>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            </div>
            <div
              className={`p-3 rounded-lg bg-gradient-to-br ${stat.color}`}
            >
              <stat.icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
