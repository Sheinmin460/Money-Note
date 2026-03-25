import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { formatCurrency } from '../lib/format';

interface ProjectData {
    id: number;
    name: string;
    income: number;
    expense: number;
    profit: number;
}

interface ProjectBarChartProps {
    data: ProjectData[];
    dataKey: 'income' | 'expense' | 'profit';
    title: string;
    color: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 rounded-xl shadow-2xl border border-slate-100 ring-1 ring-black/5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-lg font-black text-slate-900">
                    {formatCurrency(payload[0].value)}
                </p>
            </div>
        );
    }
    return null;
};

const ProjectBarChart: React.FC<ProjectBarChartProps> = ({ data, dataKey, title, color }) => {
    return (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                    {title}
                </h3>
            </div>
            <div className="p-6 h-[350px]">
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-sm text-slate-400 italic">No project data available.</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                            barSize={40}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                                interval={0}
                                angle={-25}
                                textAnchor="end"
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                tickFormatter={(value) => `৳${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar
                                dataKey={dataKey}
                                radius={[6, 6, 0, 0]}
                                animationDuration={1500}
                                animationEasing="ease-in-out"
                            >
                                {data.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={color}
                                        fillOpacity={0.85}
                                        className="hover:fill-opacity-100 transition-all duration-300"
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default ProjectBarChart;
