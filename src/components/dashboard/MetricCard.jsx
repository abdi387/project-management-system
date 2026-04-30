// src/components/dashboard/MetricCard.jsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MetricCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
  onClick
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'bg-blue-100 text-blue-600',
      trend: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'bg-green-100 text-green-600',
      trend: 'text-green-600'
    },
    yellow: {
      bg: 'bg-yellow-50',
      icon: 'bg-yellow-100 text-yellow-600',
      trend: 'text-yellow-600'
    },
    red: {
      bg: 'bg-red-50',
      icon: 'bg-red-100 text-red-600',
      trend: 'text-red-600'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'bg-purple-100 text-purple-600',
      trend: 'text-purple-600'
    },
    teal: {
      bg: 'bg-teal-50',
      icon: 'bg-teal-100 text-teal-600',
      trend: 'text-teal-600'
    },
    gray: {
      bg: 'bg-gray-50',
      icon: 'bg-gray-100 text-gray-600',
      trend: 'text-gray-600'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl shadow-sm p-6 border border-gray-100 transition-all duration-300
        ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''}
      `}
      style={{ fontFamily: 'Times New Roman, serif' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>

          {(trend || trendValue) && (
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon className={`w-4 h-4 ${
                trend === 'up' ? 'text-green-500' :
                trend === 'down' ? 'text-red-500' : 'text-gray-400'
              }`} />
              <span className={`text-sm font-medium ${
                trend === 'up' ? 'text-green-600' :
                trend === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {trendValue}
              </span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={`p-3 rounded-lg ${colors.icon}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
