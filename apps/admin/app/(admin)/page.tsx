import { prisma } from "@script/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    approvedUsers,
    activeProviders,
    usageToday,
    usageWeek,
    usageAll,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { betaApproved: true } }),
    prisma.globalApiKey.count({ where: { isActive: true } }),
    prisma.apiUsageLog.aggregate({
      where: { createdAt: { gte: todayStart } },
      _sum: { costUsd: true },
      _count: true,
    }),
    prisma.apiUsageLog.aggregate({
      where: { createdAt: { gte: weekStart } },
      _sum: { costUsd: true },
      _count: true,
    }),
    prisma.apiUsageLog.aggregate({
      _sum: { costUsd: true },
      _count: true,
    }),
  ]);

  const cards = [
    { label: "Пользователей", value: totalUsers, sub: `${approvedUsers} одобрено` },
    { label: "Активных провайдеров", value: activeProviders, sub: "из 6" },
    { label: "Запросов сегодня", value: usageToday._count, sub: `$${(usageToday._sum.costUsd || 0).toFixed(2)}` },
    { label: "Запросов за неделю", value: usageWeek._count, sub: `$${(usageWeek._sum.costUsd || 0).toFixed(2)}` },
    { label: "Запросов всего", value: usageAll._count, sub: `$${(usageAll._sum.costUsd || 0).toFixed(2)}` },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Дашборд</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="admin-card">
            <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
            <p className="text-3xl font-bold">{card.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
