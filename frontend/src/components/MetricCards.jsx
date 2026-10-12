import React from 'react';
import { Users, Activity, Eye, MousePointerClick } from 'lucide-react';

export default function MetricCards({ stats, loading }) {
  const cards = [
    {
      title: 'Total Sessions',
      value: stats?.totalSessions ?? 0,
      icon: Users,
      color: 'blue',
      badge: 'Active Journeys'
    },
    {
      title: 'Total Events',
      value: stats?.totalEvents ?? 0,
      icon: Activity,
      color: 'indigo',
      badge: 'All Ingested'
    },
    {
      title: 'Page Views',
      value: stats?.totalPageViews ?? 0,
      icon: Eye,
      color: 'emerald',
      badge: 'Impressions'
    },
    {
      title: 'Recorded Clicks',
      value: stats?.totalClicks ?? 0,
      icon: MousePointerClick,
      color: 'amber',
      badge: 'Interactions'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg bg-${card.color}-50 text-${card.color}-600 icon-wrapper`}>
                <Icon size={18} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-slate-900">
                {loading ? (
                  <span className="animate-pulse text-slate-300">...</span>
                ) : (
                  Number(card.value).toLocaleString()
                )}
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {card.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
