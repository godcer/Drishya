import { useEffect, useState, useRef } from 'react';
import { Camera, Scan, Users, Globe, BrainCircuit } from 'lucide-react';

export default function Dashboard() {
    const [telemetry, setTelemetry] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // 1. Initialize WebSocket
    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8000/ws');
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
            console.log('Connected to Vision Stream');
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'telemetry') {
                setTelemetry(message.telemetry);
            }
        };

        ws.onclose = () => setIsConnected(false);

        return () => {
            ws.close();
        };
    }, []);

    // 2. Initialize Camera (Browser Native)
    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setIsStreaming(true);
                }
            } catch (err) {
                console.error("Camera Access Denied:", err);
                alert("Please allow camera access to use Drishya Vision.");
            }
        };

        startCamera();
    }, []);

    // 3. Stream Frames to Backend
    useEffect(() => {
        if (!isConnected || !isStreaming) return;

        const interval = setInterval(() => {
            if (videoRef.current && canvasRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');

                // Draw current video frame to canvas
                canvas.width = 640; // Downscale for performance
                canvas.height = 480;
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // Extract Frame as Base64
                    const frame = canvas.toDataURL('image/jpeg', 0.7); // 70% quality

                    // Send to Backend
                    wsRef.current.send(JSON.stringify({ type: 'frame', image: frame }));
                }
            }
        }, 100); // 10 FPS to Backend (Display is 60 FPS)

        return () => clearInterval(interval);
    }, [isConnected, isStreaming]);

    return (
        <div className="h-full p-6 overflow-y-auto space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Active Feeds', value: isStreaming ? 'ONLINE' : 'OFFLINE', icon: Camera, color: isStreaming ? 'text-green-500' : 'text-red-500' },
                    { label: 'Persons Tracking', value: telemetry?.detected_persons || '0', icon: Users, color: 'text-purple-400' },
                    { label: 'Global Search', value: 'Idle', icon: Globe, color: 'text-green-400' },
                    { label: 'AI Confidence', value: '98.2%', icon: BrainCircuit, color: 'text-pink-400' },
                ].map((stat) => (
                    <div key={stat.label} className="glass-panel p-4 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all">
                        <div>
                            <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
                            <p className="text-2xl font-bold mt-1 text-white font-mono">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                            <stat.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                {/* Live Feed Primary */}
                <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden relative group bg-black">
                    {/* Hidden Canvas for Processing */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Live Browser Video */}
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                    />

                    {!isStreaming && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center space-y-4">
                                <Scan className="w-16 h-16 text-white/20 mx-auto animate-pulse" />
                                <p className="text-gray-400 font-mono text-sm">Requesting Camera Access...</p>
                            </div>
                        </div>
                    )}

                    {/* HUD Overlays */}
                    <div className="absolute top-4 left-4 flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-mono border ${isStreaming ? 'bg-red-500/20 text-red-500 border-red-500/50 animate-pulse' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                            {isStreaming ? 'LIVE' : 'OFFLINE'}
                        </span>
                        <span className="px-2 py-1 rounded bg-black/40 text-gray-300 text-xs font-mono border border-white/10">BROWSER-CAM</span>
                    </div>
                </div>

                {/* Intelligence Panel */}
                <div className="glass-panel rounded-2xl p-4 flex flex-col">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Scan className="w-4 h-4 text-neon-blue" />
                        Live Analytics
                    </h3>

                    <div className="flex-1 space-y-3 overflow-hidden relative">
                        <div className="space-y-2 font-mono text-xs text-green-400">
                            <p>&gt; Browser Camera Initialized</p>
                            {telemetry && (
                                <>
                                    <p>&gt; Backend FPS: {Math.round(telemetry.fps)}</p>
                                    <p className="text-white">&gt; Status: Analyzing Stream</p>
                                    <p className="text-neon-blue">&gt; Attributes: {telemetry.attributes.join(', ')}</p>
                                </>
                            )}
                            {!isConnected && <p className="text-red-400">&gt; Backend Disconnected</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
