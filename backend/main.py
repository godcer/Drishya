from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import time
import json
import asyncio
import cv2
import base64
import numpy as np
from deepface import DeepFace

app = FastAPI(
    title="Drishya Core",
    description="Real-time OSINT & Vision Analysis Engine",
    version="0.1.0"
)

# CORS Configuration
origins = [
    "http://localhost:5173",  # Vite default
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "system": "Drishya Core",
        "status": "online",
        "timestamp": time.time()
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

def analyze_frame(frame):
    """Run DeepFace analysis in a separate thread."""
    try:
        # errors='ignore' prevents crash if no face found
        objs = DeepFace.analyze(frame, 
            actions=['age', 'gender', 'emotion'],
            enforce_detection=False,
            detector_backend='opencv'
        )
        return objs
    except Exception as e:
        print(f"DeepFace Error: {e}")
        return []

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    # Global State for Analysis (so we don't block the stream)
    latest_analysis = {
        "detected_persons": 0,
        "attributes": ["Waiting for face..."],
        "fps": 0
    }
    
    frame_count = 0
    start_time = time.time()

    try:
        while True:
            # Receive Frame from Client
            data = await websocket.receive_text()
            
            try:
                # Parse JSON
                message = json.loads(data)
                
                if message['type'] == 'frame':
                    frame_count += 1
                    
                    # 1. Performance: Calculate real FPS
                    if frame_count % 30 == 0:
                        elapsed = time.time() - start_time
                        if elapsed > 0:
                            latest_analysis['fps'] = 30 / elapsed
                        start_time = time.time()

                    # 2. AI Inference (Throttled: Run every 15 frames ~ 0.5s)
                    if frame_count % 15 == 0:
                        try:
                            # Decode Image for Analysis
                            image_data = message['image'].split(',')[1]
                            nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
                            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                            # Run DeepFace in a separate thread to avoid blocking
                            objs = await asyncio.to_thread(analyze_frame, frame)
                            
                            if len(objs) > 0:
                                res = objs[0]
                                dominant_emotion = res['dominant_emotion']
                                gender = res['dominant_gender']
                                age = res['age']
                                
                                latest_analysis['detected_persons'] = 1
                                latest_analysis['attributes'] = [
                                    f"Gender: {gender}",
                                    f"Age: {age}",
                                    f"Mood: {dominant_emotion}"
                                ]
                                print(f"Analyzed: {gender}, {age}, {dominant_emotion}")
                            else:
                                latest_analysis['detected_persons'] = 0
                                latest_analysis['attributes'] = ["No face detected"]
                                
                        except Exception as e:
                            print(f"Analysis Error: {e}")
                            # Keep old analysis on error to prevent flickering
                    
                    # 3. Send Response (Always send telemetry, even if we didn't re-analyze this exact frame)
                    response = {
                        "type": "telemetry",
                        "telemetry": {
                            "fps": latest_analysis['fps'],
                            "detected_persons": latest_analysis['detected_persons'],
                            "attributes": latest_analysis['attributes'],
                            "timestamp": time.time()
                        }
                    }
                    
                    await websocket.send_json(response)
                    
            except json.JSONDecodeError:
                pass
            
            # No sleep needed here, we respond as fast as we get frames
            
    except WebSocketDisconnect:
        print("Client disconnected")
        manager.disconnect(websocket)
    except Exception as e:
        print(f"Error: {e}")


