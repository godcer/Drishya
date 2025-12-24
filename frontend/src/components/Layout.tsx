import React from 'react';
import { Activity, Camera, Database, LayoutDashboard, Search, Settings, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Layout({ children }: { children: React.ReactNode }) {
    const navItems = [
        { icon: LayoutDashboard, label: 'Command Center', active: true },
        { icon: Camera, label: 'Live Vision', active: false },
        { icon: Database, label: 'Intelligence', active: false },
        { icon: Search, label: 'Deep Search', active: false },
        { icon: ShieldAlert, label: 'Threats', active: false },
        { icon: Settings, label: 'System', active: false },
    ];

    return (
        <div className="flex h-screen bg-cosmic-900 text-white overflow-hidden bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center">
            <div className="absolute inset-0 bg-cosmic-900/90 backdrop-blur-sm" />

            {/* Sidebar */}
            <div className="relative z-10 w-20 lg:w-64 border-r border-white/10 bg-cosmic-800/50 backdrop-blur-md flex flex-col">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.5)] flex items-center justify-center">
                        <Activity className="w-5 h-5 text-black" />
                    </div>
                    <span className="text-xl font-bold tracking-wider hidden lg:block text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
                        DRISHYA
                    </span>
                </div>

                <nav className="flex-1 mt-6 px-3 space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.label}
                            className={cn(
                                "w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 group",
                                item.active
                                    ? "bg-white/10 border border-white/10 shadow-[0_0_20px_rgba(0,243,255,0.1)]"
                                    : "hover:bg-white/5 hover:translate-x-1"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 transition-colors",
                                item.active ? "text-neon-blue" : "text-gray-400 group-hover:text-white"
                            )} />
                            <span className={cn(
                                "hidden lg:block font-medium",
                                item.active ? "text-white" : "text-gray-400 group-hover:text-white"
                            )}>
                                {item.label}
                            </span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-green-400 hidden lg:block font-mono">SYSTEM ONLINE</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
                {children}
            </main>
        </div>
    );
}
